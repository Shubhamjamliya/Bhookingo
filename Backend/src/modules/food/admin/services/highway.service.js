import mongoose from 'mongoose';
import * as turf from '@turf/turf';
import { FoodHighway } from '../models/highway.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { FoodSystemConfig } from '../models/systemConfig.model.js';
import { ValidationError } from '../../../../core/auth/errors.js';
import {
    parseHighwayGeoJSON,
    computeBoundingBoxFromSegments,
    computeTotalDistanceMeters,
    pickLongestSegment,
    countNodes,
    mergeConnectedSegments
} from '../utils/geojsonHighwayParser.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_THRESHOLD_METERS = 1000;
const HIGHWAY_THRESHOLD_CONFIG_KEY = 'highway_threshold_meters';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Return all line segments for a highway document. */
const getHighwaySegments = (highway) => {
    if (Array.isArray(highway.coordinates) && highway.coordinates.length >= 2) {
        return [highway.coordinates];
    }
    if (Array.isArray(highway.segments) && highway.segments.length > 0) {
        return highway.segments;
    }
    return [];
};

// ─── Threshold Config ────────────────────────────────────────────────────────

export async function getHighwayThresholdMeters() {
    try {
        const config = await FoodSystemConfig.findOne({ key: HIGHWAY_THRESHOLD_CONFIG_KEY }).lean();
        const val = Number(config?.value);
        return Number.isFinite(val) && val > 0 ? val : DEFAULT_THRESHOLD_METERS;
    } catch {
        return DEFAULT_THRESHOLD_METERS;
    }
}

export async function setHighwayThresholdMeters(meters, adminId = null) {
    const val = Number(meters);
    if (!Number.isFinite(val) || val <= 0) {
        throw new ValidationError('Threshold must be a positive number in meters');
    }
    await FoodSystemConfig.findOneAndUpdate(
        { key: HIGHWAY_THRESHOLD_CONFIG_KEY },
        {
            $set: {
                key: HIGHWAY_THRESHOLD_CONFIG_KEY,
                value: val,
                description: 'Distance threshold (meters) for restaurant-to-highway proximity assignment',
                updatedBy: adminId
                    ? { role: 'ADMIN', adminId: new mongoose.Types.ObjectId(adminId), at: new Date() }
                    : undefined
            }
        },
        { upsert: true, new: true }
    );
    return val;
}

// ─── GeoJSON Bulk Import ─────────────────────────────────────────────────────

/**
 * Import National Highways from a static GeoJSON FeatureCollection.
 * Groups LineString segments by NH ref and upserts one document per highway.
 *
 * @param {object} geojson - Parsed GeoJSON object
 * @returns {{ inserted, updated, skipped, total, uniqueRefs }}
 */
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
            const existing = await FoodHighway.findOne({ ref });
            const payload = {
                name,
                ref,
                segments,
                coordinates,
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
                await FoodHighway.updateOne({ ref }, { $set: payload });
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

    return {
        inserted,
        updated,
        skipped,
        total: inserted + updated,
        uniqueRefs: highwayMap.size
    };
}

// ─── Nearest Highway Detection ───────────────────────────────────────────────

/**
 * Find geographically nearest active highway segment (ignores service threshold).
 * @returns {{ highway, distanceMeters } | null}
 */
export const findNearestHighwayUnchecked = async (lat, lng, searchPaddingMeters = DEFAULT_THRESHOLD_METERS + 5000) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const paddingDeg = searchPaddingMeters / 111_000;

    const candidates = await FoodHighway.aggregate([
        {
            $match: {
                isActive: true,
                'boundingBox.minLat': { $lte: lat + paddingDeg },
                'boundingBox.maxLat': { $gte: lat - paddingDeg },
                'boundingBox.minLng': { $lte: lng + paddingDeg },
                'boundingBox.maxLng': { $gte: lng - paddingDeg }
            }
        },
        {
            $project: {
                name: 1,
                ref: 1,
                coordinates: {
                    $filter: {
                        input: '$coordinates',
                        as: 'c',
                        cond: {
                            $and: [
                                { $lte: ['$$c.lat', lat + paddingDeg] },
                                { $gte: ['$$c.lat', lat - paddingDeg] },
                                { $lte: ['$$c.lng', lng + paddingDeg] },
                                { $gte: ['$$c.lng', lng - paddingDeg] }
                            ]
                        }
                    }
                }
            }
        }
    ]);

    if (!candidates.length) return null;

    const restaurantPoint = turf.point([lng, lat]);
    let nearest = null;
    let nearestDistance = Infinity;

    for (const highway of candidates) {
        const segmentList = getHighwaySegments(highway);

        for (const coords of segmentList) {
            if (!coords || coords.length < 2) continue;

            const lineCoords = coords
                .map((c) => (Array.isArray(c) ? [Number(c[0]), Number(c[1])] : [Number(c?.lng ?? c?.longitude), Number(c?.lat ?? c?.latitude)]))
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
                nearest = highway;
            }
        }
    }

    if (!nearest) return null;
    return { highway: nearest, distanceMeters: nearestDistance };
};

export async function findNearestHighway(lat, lng, thresholdMeters) {
    const threshold = thresholdMeters || DEFAULT_THRESHOLD_METERS;
    const result = await findNearestHighwayUnchecked(lat, lng, threshold + 5000);
    if (!result || result.distanceMeters > threshold) return null;
    return result;
}

// ─── Restaurant Assignment ───────────────────────────────────────────────────

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

        const threshold = thresholdOverride ?? await getHighwayThresholdMeters();
        const result = await findNearestHighway(lat, lng, threshold);

        const update = result
            ? {
                highwayId: result.highway._id,
                highwayName: result.highway.name,
                highwayRef: result.highway.ref,
                isHighwayRestaurant: true
            }
            : {
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
        highwayId: null,
        highwayName: nearest.highway.name,
        highwayRef: nearest.highway.ref,
        distanceMeters
    };
}

// ─── Bulk / Admin ────────────────────────────────────────────────────────────

export async function listHighways(query = {}) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 200, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true' || query.isActive === true;
    if (query.ref) filter.ref = { $regex: String(query.ref), $options: 'i' };

    const [highways, total] = await Promise.all([
        FoodHighway.find(filter)
            .select('name ref isActive importedAt source boundingBox totalDistance nodeCount segmentCount')
            .sort({ ref: 1 })
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

    // Stitch fragments for map display (idempotent if already merged at import)
    if (Array.isArray(hw.segments) && hw.segments.length > 1) {
        hw.segments = mergeConnectedSegments(hw.segments);
    }

    return hw;
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
    const result = await FoodHighway.findByIdAndDelete(id);
    if (!result) throw new ValidationError('Highway not found');
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

    const highway = await FoodHighway.create({
        name,
        ref: ref || `MANUAL-${Date.now()}`,
        segments: segmentList,
        coordinates: primaryCoords,
        boundingBox,
        totalDistance,
        nodeCount: countNodes(segmentList),
        segmentCount: segmentList.length,
        isActive: true,
        source: 'manual',
        importedAt: new Date()
    });
    return highway;
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

    const hw = await FoodHighway.findByIdAndUpdate(
        id,
        {
            $set: {
                name,
                ref,
                segments: segmentList,
                coordinates: primaryCoords,
                boundingBox,
                totalDistance,
                nodeCount: countNodes(segmentList),
                segmentCount: segmentList.length,
                source: 'manual_edit'
            }
        },
        { new: true }
    );
    if (!hw) throw new ValidationError('Highway not found');
    return hw;
}
