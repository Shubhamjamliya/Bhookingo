import mongoose from 'mongoose';
import * as turf from '@turf/turf';
import { FoodHighway } from '../models/highway.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { ValidationError } from '../../../../core/auth/errors.js';
import {
    parseHighwayGeoJSON,
    computeBoundingBoxFromSegments,
    computeTotalDistanceMeters,
    pickLongestSegment,
    countNodes,
    mergeConnectedSegments
} from '../utils/geojsonHighwayParser.js';
import {
    saveHighwayGeometry,
    readHighwayGeometry,
    deleteHighwayGeometry
} from '../utils/highwayGeometryStorage.js';
import { getStoredDrivingSettingsConfig, saveDrivingSettingsConfig } from '../../driving/services/drivingSettings.shared.js';
import { detectHighwayUsingGoogleMaps } from '../../location/services/location.service.js';


const cloneCoordinate = (coord) => ({ lat: Number(coord?.lat), lng: Number(coord?.lng) });
const cloneSegment = (segment = []) => segment.map(cloneCoordinate);

const NEAREST_HIGHWAY_CACHE_TTL_MS = 5 * 60 * 1000;
const NEAREST_HIGHWAY_CACHE_MAX_ENTRIES = 1000;
const nearestHighwayCache = new Map();

const segmentIntersectsSearchArea = (coordinates, lat, lng, paddingMeters) => {
    if (!Array.isArray(coordinates) || coordinates.length < 2) return false;

    const latitudePadding = paddingMeters / 111_000;
    const longitudeScale = Math.max(Math.cos((lat * Math.PI) / 180), 0.1);
    const longitudePadding = paddingMeters / (111_000 * longitudeScale);
    const searchMinLat = lat - latitudePadding;
    const searchMaxLat = lat + latitudePadding;
    const searchMinLng = lng - longitudePadding;
    const searchMaxLng = lng + longitudePadding;

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const coordinate of coordinates) {
        const coordinateLat = Number(coordinate?.lat ?? coordinate?.latitude);
        const coordinateLng = Number(coordinate?.lng ?? coordinate?.longitude);
        if (!Number.isFinite(coordinateLat) || !Number.isFinite(coordinateLng)) continue;

        minLat = Math.min(minLat, coordinateLat);
        maxLat = Math.max(maxLat, coordinateLat);
        minLng = Math.min(minLng, coordinateLng);
        maxLng = Math.max(maxLng, coordinateLng);
    }

    return Number.isFinite(minLat)
        && maxLat >= searchMinLat
        && minLat <= searchMaxLat
        && maxLng >= searchMinLng
        && minLng <= searchMaxLng;
};

const cacheNearestHighwayLookup = (key, lookup) => {
    if (nearestHighwayCache.size >= NEAREST_HIGHWAY_CACHE_MAX_ENTRIES) {
        const oldestKey = nearestHighwayCache.keys().next().value;
        if (oldestKey !== undefined) nearestHighwayCache.delete(oldestKey);
    }

    const promise = Promise.resolve().then(lookup);
    nearestHighwayCache.set(key, {
        expiresAt: Date.now() + NEAREST_HIGHWAY_CACHE_TTL_MS,
        promise
    });

    promise.catch(() => nearestHighwayCache.delete(key));
    return promise;
};

const normalizeGeometryPayload = (geometry = {}) => {
    const coordinates = Array.isArray(geometry.coordinates)
        ? geometry.coordinates.map(cloneCoordinate).filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng))
        : [];
    const segments = Array.isArray(geometry.segments)
        ? geometry.segments
            .map((segment) => cloneSegment(segment).filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng)))
            .filter((segment) => segment.length >= 2)
        : [];

    const fallbackSegments = segments.length > 0
        ? segments
        : (coordinates.length >= 2 ? [coordinates] : []);
    const fallbackCoordinates = coordinates.length >= 2
        ? coordinates
        : (fallbackSegments[0] || []);

    return {
        coordinates: fallbackCoordinates,
        segments: fallbackSegments
    };
};

const persistHighwayGeometryIfNeeded = async (highway) => {
    if (!highway?._id) return highway;
    if (highway.geometryPath) return highway;

    const geometry = normalizeGeometryPayload({
        coordinates: highway.coordinates,
        segments: highway.segments
    });

    if (!geometry.coordinates.length && !geometry.segments.length) {
        return highway;
    }

    const geometryPath = await saveHighwayGeometry({
        docId: highway._id,
        ref: highway.ref,
        name: highway.name,
        coordinates: geometry.coordinates,
        segments: geometry.segments
    });

    await FoodHighway.updateOne(
        { _id: highway._id },
        {
            $set: { geometryPath },
            $unset: { coordinates: '', segments: '' }
        }
    );

    return {
        ...highway,
        geometryPath,
        coordinates: geometry.coordinates,
        segments: geometry.segments
    };
};

export const hydrateHighwayGeometry = async (highway, options = {}) => {
    if (!highway) return highway;

    const { mergeSegments: shouldMergeSegments = false } = options;
    let workingHighway = highway;
    const hasInlineGeometry =
        (Array.isArray(workingHighway.coordinates) && workingHighway.coordinates.length >= 2) ||
        (Array.isArray(workingHighway.segments) && workingHighway.segments.length > 0);

    if (!workingHighway.geometryPath && !hasInlineGeometry && workingHighway._id) {
        const legacyDoc = await FoodHighway.findById(workingHighway._id)
            .select('name ref geometryPath coordinates segments')
            .lean();
        if (legacyDoc) {
            workingHighway = { ...workingHighway, ...legacyDoc };
        }
    }

    workingHighway = await persistHighwayGeometryIfNeeded(workingHighway);

    const geometry = workingHighway.geometryPath
        ? normalizeGeometryPayload(await readHighwayGeometry(workingHighway.geometryPath))
        : normalizeGeometryPayload({
            coordinates: workingHighway.coordinates,
            segments: workingHighway.segments
        });

    const hydrated = {
        ...workingHighway,
        coordinates: geometry.coordinates,
        segments: geometry.segments
    };

    if (shouldMergeSegments && Array.isArray(hydrated.segments) && hydrated.segments.length > 1) {
        hydrated.segments = mergeConnectedSegments(hydrated.segments);
        hydrated.coordinates = pickLongestSegment(hydrated.segments);
    }

    return hydrated;
};

const getHighwaySegments = async (highway) => {
    const hydrated = await hydrateHighwayGeometry(highway);
    if (Array.isArray(hydrated?.segments) && hydrated.segments.length > 0) {
        return hydrated.segments;
    }
    if (Array.isArray(hydrated?.coordinates) && hydrated.coordinates.length >= 2) {
        return [hydrated.coordinates];
    }
    return [];
};

export async function getHighwayThresholdMeters() {
    const settings = await getStoredDrivingSettingsConfig();
    return settings.highwayEntryRadiusMeters;
}

export async function setHighwayThresholdMeters(meters, adminId = null) {
    const updated = await saveDrivingSettingsConfig({
        highwayEntryRadiusMeters: Number(meters)
    }, adminId, { partial: true });
    return updated.highwayEntryRadiusMeters;
}

export async function importHighwaysFromGeoJSON(geojson) {
    const highwayMap = parseHighwayGeoJSON(geojson);

    if (!highwayMap.size) {
        throw new ValidationError(
            'No National Highway features found in GeoJSON. Expected LineString features with Name like "NH 44".'
        );
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const [ref, data] of highwayMap.entries()) {
        const { name, segments } = data;
        if (!segments.length) {
            skipped++;
            continue;
        }

        const rawSegmentCount = data.rawSegmentCount ?? segments.length;
        const boundingBox = computeBoundingBoxFromSegments(segments);
        const totalDistance = computeTotalDistanceMeters(segments);
        const coordinates = pickLongestSegment(segments);
        const nodeCount = countNodes(segments);
        const segmentCount = segments.length;

        try {
            const existing = await FoodHighway.findOne({ ref }).select('_id geometryPath').lean();
            const docId = existing?._id || new mongoose.Types.ObjectId();
            const geometryPath = await saveHighwayGeometry({
                docId,
                ref,
                name,
                coordinates,
                segments
            });

            const payload = {
                _id: docId,
                name,
                ref,
                geometryPath,
                boundingBox,
                totalDistance,
                nodeCount,
                segmentCount,
                rawSegmentCount,
                isActive: true,
                source: 'geojson',
                importedAt: new Date()
            };

            if (existing) {
                await FoodHighway.updateOne(
                    { _id: docId },
                    {
                        $set: payload,
                        $unset: { coordinates: '', segments: '' }
                    }
                );
                updated++;
            } else {
                await FoodHighway.create(payload);
                inserted++;
            }
        } catch (err) {
            console.error(`[HighwayService] Failed to upsert highway ${ref}:`, err.message);
            skipped++;
        }
    }

    // Highway geometry changed, so previously resolved location cells may be stale.
    nearestHighwayCache.clear();

    return {
        inserted,
        updated,
        skipped,
        total: inserted + updated,
        uniqueRefs: highwayMap.size
    };
}

export const findNearestHighwayUnchecked = async (lat, lng, searchPaddingMeters = 7000) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const latitudePadding = searchPaddingMeters / 111_000;
    const longitudeScale = Math.max(Math.cos((lat * Math.PI) / 180), 0.1);
    const longitudePadding = searchPaddingMeters / (111_000 * longitudeScale);

    const candidates = await FoodHighway.find({
        isActive: true,
        'boundingBox.minLat': { $lte: lat + latitudePadding },
        'boundingBox.maxLat': { $gte: lat - latitudePadding },
        'boundingBox.minLng': { $lte: lng + longitudePadding },
        'boundingBox.maxLng': { $gte: lng - longitudePadding }
    })
        .select('name ref geometryPath boundingBox')
        .lean();

    if (!candidates.length) return null;

    const restaurantPoint = turf.point([lng, lat]);
    let nearest = null;
    let nearestDistance = Infinity;

    for (const candidate of candidates) {
        let hydratedHighway;
        let segmentList;
        try {
            hydratedHighway = await hydrateHighwayGeometry(candidate);
            segmentList = await getHighwaySegments(hydratedHighway);
        } catch (error) {
            console.error('[HighwayService] Failed to hydrate highway geometry during detect', {
                highwayId: candidate?._id ? String(candidate._id) : null,
                highwayRef: candidate?.ref || null,
                highwayName: candidate?.name || null,
                geometryPath: candidate?.geometryPath || null,
                error: error?.message || String(error)
            });
            continue;
        }

        for (const coords of segmentList) {
            if (!coords || coords.length < 2) continue;
            if (!segmentIntersectsSearchArea(coords, lat, lng, searchPaddingMeters)) continue;

            const lineCoords = coords
                .map((c) => [Number(c?.lng ?? c?.longitude), Number(c?.lat ?? c?.latitude)])
                .filter((pair) => Number.isFinite(pair[0]) && Number.isFinite(pair[1]));
            if (lineCoords.length < 2) continue;

            const line = turf.lineString(lineCoords);

            let nearestPt;
            try {
                nearestPt = turf.nearestPointOnLine(line, restaurantPoint, { units: 'meters' });
            } catch {
                continue;
            }

            const distMeters = nearestPt?.properties?.dist;
            if (!Number.isFinite(distMeters)) continue;

            if (distMeters < nearestDistance) {
                nearestDistance = distMeters;
                // The callers only need highway metadata. Avoid retaining or returning
                // hundreds of thousands of hydrated coordinate objects.
                nearest = candidate;
            }
        }
    }

    if (!nearest) return null;
    return { highway: nearest, distanceMeters: nearestDistance };
};

export async function findNearestHighway(lat, lng, thresholdMeters) {
    const threshold = thresholdMeters || await getHighwayThresholdMeters();
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(threshold)) return null;

    const cacheKey = `${lat.toFixed(4)}:${lng.toFixed(4)}:${Math.round(threshold)}`;
    const cached = nearestHighwayCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.promise;
    if (cached) nearestHighwayCache.delete(cacheKey);

    return cacheNearestHighwayLookup(cacheKey, async () => {
        const result = await findNearestHighwayUnchecked(lat, lng, threshold + 5000);
        if (!result || result.distanceMeters > threshold) return null;
        return result;
    });
}

export async function assignHighwayToRestaurant(restaurantId, thresholdOverride = null) {
    try {
        const restaurant = await FoodRestaurant.findById(restaurantId)
            .select('location highwayId isHighwayRestaurant')
            .lean();
        if (!restaurant) return;

        const loc = restaurant.location;
        const lat = typeof loc?.latitude === 'number' ? loc.latitude
            : (Array.isArray(loc?.coordinates) ? loc.coordinates[1] : null);
        const lng = typeof loc?.longitude === 'number' ? loc.longitude
            : (Array.isArray(loc?.coordinates) ? loc.coordinates[0] : null);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const result = await detectHighwayUsingGoogleMaps(lat, lng);

        const update = result?.status === 'IN_SERVICE'
            ? {
                restaurantType: 'highway',
                highwayId: null,
                highwayName: result.highwayName || null,
                highwayRef: result.highwayRef || null,
                isHighwayRestaurant: true
            }
            : {
                restaurantType: 'normal',
                highwayId: null,
                highwayName: null,
                highwayRef: null,
                isHighwayRestaurant: false
            };

        await FoodRestaurant.updateOne({ _id: restaurantId }, { $set: update });
    } catch (err) {
        console.error(`[HighwayService] assignHighwayToRestaurant(${restaurantId}) failed:`, err.message);
    }
}

export async function detectHighwayAtPoint(lat, lng) {
    const threshold = await getHighwayThresholdMeters();
    const nearest = await findNearestHighwayUnchecked(lat, lng, threshold + 5000);

    if (!nearest) {
        return {
            status: 'OUT_OF_SERVICE',
            thresholdMeters: threshold,
            highwayId: null,
            highwayName: null,
            highwayRef: null,
            distanceMeters: null
        };
    }

    const distanceMeters = Math.round(nearest.distanceMeters);
    const withinThreshold = nearest.distanceMeters <= threshold;

    if (withinThreshold) {
        return {
            status: 'IN_SERVICE',
            thresholdMeters: threshold,
            highwayId: nearest.highway._id,
            highwayName: nearest.highway.name,
            highwayRef: nearest.highway.ref,
            distanceMeters
        };
    }

    return {
        status: 'OUT_OF_SERVICE',
        thresholdMeters: threshold,
        highwayId: nearest.highway._id,
        highwayName: nearest.highway.name,
        highwayRef: nearest.highway.ref,
        distanceMeters
    };
}

export async function listHighways(query = {}) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 200, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true' || query.isActive === true;
    if (query.ref) filter.ref = { $regex: String(query.ref), $options: 'i' };

    const listProjection = 'name ref isActive importedAt source boundingBox totalDistance nodeCount segmentCount geometryPath';

    const [highways, total] = await Promise.all([
        FoodHighway.find(filter)
            .select(listProjection)
            .sort({ ref: 1 })
            .allowDiskUse(true)
            .skip(skip)
            .limit(limit)
            .lean(),
        FoodHighway.countDocuments(filter)
    ]);

    return { highways, total, page, limit };
}

export async function getHighwayById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid highway ID');
    }
    const hw = await FoodHighway.findById(id).lean();
    if (!hw) throw new ValidationError('Highway not found');

    return hydrateHighwayGeometry(hw, { mergeSegments: true });
}

export async function toggleHighwayStatus(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid highway ID');
    }
    const hw = await FoodHighway.findById(id).select('isActive').lean();
    if (!hw) throw new ValidationError('Highway not found');
    await FoodHighway.updateOne({ _id: id }, { $set: { isActive: !hw.isActive } });
    return { isActive: !hw.isActive };
}

export async function deleteHighway(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid highway ID');
    }
    const existing = await FoodHighway.findById(id).select('geometryPath').lean();
    const result = await FoodHighway.findByIdAndDelete(id);
    if (!result) throw new ValidationError('Highway not found');
    await deleteHighwayGeometry(existing?.geometryPath).catch(() => { });
    return { deleted: true };
}

export async function createHighway({ name, ref, coordinates, segments }) {
    const segmentList = Array.isArray(segments) && segments.length
        ? segments
        : coordinates?.length >= 2
            ? [coordinates]
            : null;

    if (!name || !segmentList?.length) {
        throw new ValidationError('Name and at least one line segment with 2+ points are required');
    }

    const boundingBox = computeBoundingBoxFromSegments(segmentList);
    const totalDistance = computeTotalDistanceMeters(segmentList);
    const primaryCoords = pickLongestSegment(segmentList);
    const docId = new mongoose.Types.ObjectId();
    const safeRef = ref || `MANUAL-${Date.now()}`;
    const geometryPath = await saveHighwayGeometry({
        docId,
        ref: safeRef,
        name,
        coordinates: primaryCoords,
        segments: segmentList
    });

    await FoodHighway.create({
        _id: docId,
        name,
        ref: safeRef,
        geometryPath,
        boundingBox,
        totalDistance,
        nodeCount: countNodes(segmentList),
        segmentCount: segmentList.length,
        isActive: true,
        source: 'manual',
        importedAt: new Date()
    });

    return getHighwayById(docId);
}

export async function updateHighway(id, { name, ref, coordinates, segments }) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid highway ID');
    }

    const segmentList = Array.isArray(segments) && segments.length
        ? segments
        : coordinates?.length >= 2
            ? [coordinates]
            : null;

    if (!segmentList?.length) {
        throw new ValidationError('At least one line segment with 2+ points is required');
    }

    const boundingBox = computeBoundingBoxFromSegments(segmentList);
    const totalDistance = computeTotalDistanceMeters(segmentList);
    const primaryCoords = pickLongestSegment(segmentList);
    const existing = await FoodHighway.findById(id).select('_id geometryPath').lean();
    if (!existing) throw new ValidationError('Highway not found');

    const geometryPath = await saveHighwayGeometry({
        docId: existing._id,
        ref,
        name,
        coordinates: primaryCoords,
        segments: segmentList
    });

    await FoodHighway.findByIdAndUpdate(
        id,
        {
            $set: {
                name,
                ref,
                geometryPath,
                boundingBox,
                totalDistance,
                nodeCount: countNodes(segmentList),
                segmentCount: segmentList.length,
                source: 'manual_edit'
            },
            $unset: {
                coordinates: '',
                segments: ''
            }
        },
        { new: true }
    );

    return getHighwayById(id);
}
