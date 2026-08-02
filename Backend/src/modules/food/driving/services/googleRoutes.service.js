import * as turf from '@turf/turf';
import { config } from '../../../../config/env.js';
import { logger } from '../../../../utils/logger.js';
import { FoodHighway } from '../../admin/models/highway.model.js';
import { hydrateHighwayGeometry } from '../../admin/services/highway.service.js';
import { decodePolyline, fetchDirections as fetchLegacyDirections } from '../../orders/utils/googleMaps.js';
import { getStoredDrivingSettingsConfig } from './drivingSettings.shared.js';

const GOOGLE_ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const DEFAULT_ROUTE_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_ROUTE_SAMPLE_POINTS = 40;
const routeCache = new Map();

const toFinite = (value) => {
    const numericValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const buildRouteCacheKey = (origin, destination, options = {}) => {
    const parts = [
        origin.lat,
        origin.lng,
        destination.lat,
        destination.lng
    ].map((value) => Number(value).toFixed(5));
    parts.push(options.includeStoredHighways ? 'withStoredHighways' : 'routeOnly');
    parts.push(Number(options.corridorRadiusKm || 0).toFixed(2));
    return parts.join(':');
};

const getCachedRoute = (cacheKey) => {
    const cached = routeCache.get(cacheKey);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
        routeCache.delete(cacheKey);
        return null;
    }

    return cached.value;
};

const setCachedRoute = (cacheKey, value) => {
    routeCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + DEFAULT_ROUTE_CACHE_TTL_MS
    });
};

const computeBoundingBoxFromCoordinates = (coordinates = []) => {
    if (!Array.isArray(coordinates) || coordinates.length === 0) return null;

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const coordinate of coordinates) {
        const lat = toFinite(coordinate?.lat);
        const lng = toFinite(coordinate?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
    }

    if (!Number.isFinite(minLat) || !Number.isFinite(minLng)) {
        return null;
    }

    return { minLat, maxLat, minLng, maxLng };
};

const formatDistanceText = (distanceMeters) => {
    if (!Number.isFinite(distanceMeters)) return '';
    if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
    return `${(distanceMeters / 1000).toFixed(distanceMeters >= 10000 ? 0 : 1)} km`;
};

const formatDurationText = (durationSeconds) => {
    if (!Number.isFinite(durationSeconds)) return '';

    const totalMinutes = Math.max(1, Math.round(durationSeconds / 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (!hours) return `${totalMinutes} min`;
    if (!minutes) return `${hours} hr`;
    return `${hours} hr ${minutes} min`;
};

const parseDurationSeconds = (durationValue) => {
    if (typeof durationValue === 'number' && Number.isFinite(durationValue)) {
        return durationValue;
    }
    if (typeof durationValue !== 'string') return null;

    const match = durationValue.match(/^(\d+(?:\.\d+)?)s$/);
    if (!match) return null;

    const seconds = Number(match[1]);
    return Number.isFinite(seconds) ? seconds : null;
};

const normalizeLatLng = (point = {}) => {
    const lat = toFinite(point?.lat ?? point?.latitude);
    const lng = toFinite(point?.lng ?? point?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
};

const normalizeRouteResponse = ({
    polyline = '',
    decodedCoordinates = [],
    distanceMeters = null,
    distanceText = '',
    durationSeconds = null,
    durationText = '',
    bounds = null,
    provider = 'google_routes_api'
}) => ({
    provider,
    polyline,
    decodedCoordinates,
    distanceMeters: Number.isFinite(distanceMeters) ? distanceMeters : null,
    distanceText: distanceText || formatDistanceText(distanceMeters),
    durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
    durationText: durationText || formatDurationText(durationSeconds),
    bounds: bounds || computeBoundingBoxFromCoordinates(decodedCoordinates)
});

const getSampledRoutePoints = (coordinates = []) => {
    if (coordinates.length <= MAX_ROUTE_SAMPLE_POINTS) return coordinates;

    const sampled = [];
    const step = Math.max(1, Math.floor(coordinates.length / MAX_ROUTE_SAMPLE_POINTS));
    for (let index = 0; index < coordinates.length; index += step) {
        sampled.push(coordinates[index]);
    }

    const lastCoordinate = coordinates[coordinates.length - 1];
    const sampledLast = sampled[sampled.length - 1];
    if (
        lastCoordinate &&
        sampledLast &&
        (lastCoordinate.lat !== sampledLast.lat || lastCoordinate.lng !== sampledLast.lng)
    ) {
        sampled.push(lastCoordinate);
    }

    return sampled;
};

async function matchStoredHighwaysAlongRoute(decodedCoordinates, corridorRadiusKm) {
    if (!Array.isArray(decodedCoordinates) || decodedCoordinates.length < 2) {
        return [];
    }

    const bounds = computeBoundingBoxFromCoordinates(decodedCoordinates);
    if (!bounds) {
        return [];
    }

    const paddingDeg = corridorRadiusKm / 111;
    const candidateHighways = await FoodHighway.find({
        isActive: true,
        'boundingBox.minLat': { $lte: bounds.maxLat + paddingDeg },
        'boundingBox.maxLat': { $gte: bounds.minLat - paddingDeg },
        'boundingBox.minLng': { $lte: bounds.maxLng + paddingDeg },
        'boundingBox.maxLng': { $gte: bounds.minLng - paddingDeg }
    })
        .select('name ref geometryPath boundingBox totalDistance nodeCount segmentCount')
        .lean();

    if (!candidateHighways.length) {
        return [];
    }

    const routeLine = turf.lineString(decodedCoordinates.map((coordinate) => [coordinate.lng, coordinate.lat]));
    const sampledRoutePoints = getSampledRoutePoints(decodedCoordinates);
    const matchingHighways = [];

    for (const candidate of candidateHighways) {
        const hydratedHighway = await hydrateHighwayGeometry(candidate, { mergeSegments: true });
        const highwayCoordinates = Array.isArray(hydratedHighway?.coordinates) ? hydratedHighway.coordinates : [];
        if (highwayCoordinates.length < 2) continue;

        const highwayLine = turf.lineString(highwayCoordinates.map((coordinate) => [coordinate.lng, coordinate.lat]));
        let minDistanceKm = Infinity;
        let closePointCount = 0;

        for (const routePoint of sampledRoutePoints) {
            const projectedPoint = turf.nearestPointOnLine(
                highwayLine,
                turf.point([routePoint.lng, routePoint.lat]),
                { units: 'kilometers' }
            );
            const distanceKm = projectedPoint?.properties?.dist;
            if (!Number.isFinite(distanceKm)) continue;

            minDistanceKm = Math.min(minDistanceKm, distanceKm);
            if (distanceKm <= corridorRadiusKm) {
                closePointCount += 1;
            }
        }

        // Also check the inverse direction so short highway overlaps are not missed.
        const startHighwayPoint = highwayCoordinates[0];
        const endHighwayPoint = highwayCoordinates[highwayCoordinates.length - 1];
        const edgePoints = [startHighwayPoint, endHighwayPoint].filter(Boolean);
        for (const highwayPoint of edgePoints) {
            const projectedPoint = turf.nearestPointOnLine(
                routeLine,
                turf.point([highwayPoint.lng, highwayPoint.lat]),
                { units: 'kilometers' }
            );
            const distanceKm = projectedPoint?.properties?.dist;
            if (!Number.isFinite(distanceKm)) continue;
            minDistanceKm = Math.min(minDistanceKm, distanceKm);
            if (distanceKm <= corridorRadiusKm) {
                closePointCount += 1;
            }
        }

        if (closePointCount > 0 && minDistanceKm <= corridorRadiusKm) {
            matchingHighways.push({
                _id: hydratedHighway._id,
                name: hydratedHighway.name,
                ref: hydratedHighway.ref,
                minDistanceKm: Number(minDistanceKm.toFixed(2)),
                totalDistance: hydratedHighway.totalDistance,
                nodeCount: hydratedHighway.nodeCount,
                segmentCount: hydratedHighway.segmentCount
            });
        }
    }

    matchingHighways.sort((a, b) => a.minDistanceKm - b.minDistanceKm);
    return matchingHighways;
}

async function fetchRouteFromGoogleRoutesApi(origin, destination) {
    const apiKey = config.googleMapsApiKey;
    if (!apiKey) {
        logger.warn('Google Maps API key missing. Google Routes API fetch skipped.');
        return null;
    }

    const requestBody = {
        origin: {
            location: {
                latLng: {
                    latitude: origin.lat,
                    longitude: origin.lng
                }
            }
        },
        destination: {
            location: {
                latLng: {
                    latitude: destination.lat,
                    longitude: destination.lng
                }
            }
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: false,
        languageCode: 'en-IN',
        units: 'METRIC',
        polylineEncoding: 'ENCODED_POLYLINE'
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
        const response = await fetch(GOOGLE_ROUTES_API_URL, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': [
                    'routes.duration',
                    'routes.distanceMeters',
                    'routes.polyline.encodedPolyline',
                    'routes.viewport'
                ].join(',')
            },
            body: JSON.stringify(requestBody)
        });

        const responseBody = await response.json();

        if (!response.ok) {
            const errorMessage = responseBody?.error?.message || `HTTP ${response.status}`;
            logger.warn(`Google Routes API request failed: ${errorMessage}`);
            return null;
        }

        const route = responseBody?.routes?.[0];
        const encodedPolyline = route?.polyline?.encodedPolyline || '';
        const decodedCoordinates = encodedPolyline ? decodePolyline(encodedPolyline) : [];
        const distanceMeters = toFinite(route?.distanceMeters);
        const durationSeconds = parseDurationSeconds(route?.duration);

        return normalizeRouteResponse({
            polyline: encodedPolyline,
            decodedCoordinates,
            distanceMeters,
            durationSeconds,
            bounds: route?.viewport
                ? {
                    minLat: toFinite(route.viewport?.low?.latitude),
                    maxLat: toFinite(route.viewport?.high?.latitude),
                    minLng: toFinite(route.viewport?.low?.longitude),
                    maxLng: toFinite(route.viewport?.high?.longitude)
                }
                : null,
            provider: 'google_routes_api'
        });
    } catch (error) {
        logger.warn(`Google Routes API fetch failed: ${error.message}`);
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

export async function getGoogleRouteHighway({
    origin,
    destination,
    includeStoredHighways = true,
    corridorRadiusKm
}) {
    const normalizedOrigin = normalizeLatLng(origin);
    const normalizedDestination = normalizeLatLng(destination);

    if (!normalizedOrigin || !normalizedDestination) {
        return null;
    }

    const settings = await getStoredDrivingSettingsConfig();
    const effectiveCorridorRadiusKm = clamp(
        Number(corridorRadiusKm) || settings.storedHighwayMatchRadiusKm,
        1,
        25
    );

    const cacheKey = buildRouteCacheKey(normalizedOrigin, normalizedDestination, {
        includeStoredHighways,
        corridorRadiusKm: effectiveCorridorRadiusKm
    });
    const cachedRoute = getCachedRoute(cacheKey);
    if (cachedRoute) {
        return cachedRoute;
    }

    const primaryRoute = await fetchRouteFromGoogleRoutesApi(normalizedOrigin, normalizedDestination);
    const fallbackRoute = primaryRoute || await fetchLegacyDirections(normalizedOrigin, normalizedDestination);

    if (!fallbackRoute || !Array.isArray(fallbackRoute.decodedCoordinates) || fallbackRoute.decodedCoordinates.length < 2) {
        return null;
    }

    const normalizedRoute = primaryRoute
        ? primaryRoute
        : normalizeRouteResponse({
            polyline: fallbackRoute.polyline || '',
            decodedCoordinates: fallbackRoute.decodedCoordinates || [],
            distanceText: fallbackRoute.distanceText || '',
            durationText: fallbackRoute.durationText || '',
            bounds: fallbackRoute.bounds || null,
            provider: fallbackRoute.polyline ? 'google_directions_api' : 'interpolated_route_fallback'
        });

    const storedHighways = includeStoredHighways
        ? await matchStoredHighwaysAlongRoute(
            normalizedRoute.decodedCoordinates,
            effectiveCorridorRadiusKm
        )
        : [];

    const payload = {
        source: normalizedRoute.provider,
        highway: {
            id: 'custom_google_route',
            name: 'Google Maps Route',
            ref: 'Google Maps Route',
            polyline: normalizedRoute.polyline,
            coordinates: normalizedRoute.decodedCoordinates,
            boundingBox: normalizedRoute.bounds || computeBoundingBoxFromCoordinates(normalizedRoute.decodedCoordinates)
        },
        route: {
            distanceMeters: normalizedRoute.distanceMeters,
            distanceText: normalizedRoute.distanceText,
            durationSeconds: normalizedRoute.durationSeconds,
            durationText: normalizedRoute.durationText
        },
        storedHighways
    };

    setCachedRoute(cacheKey, payload);
    return payload;
}
