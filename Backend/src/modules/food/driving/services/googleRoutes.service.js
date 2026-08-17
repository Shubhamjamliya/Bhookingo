import * as turf from '@turf/turf';
import { config } from '../../../../config/env.js';
import { logger } from '../../../../utils/logger.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { decodePolyline, fetchDirections as fetchLegacyDirections } from '../../orders/utils/googleMaps.js';
import { getStoredDrivingSettingsConfig } from './drivingSettings.shared.js';

const GOOGLE_ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const MAX_ROUTE_SAMPLE_POINTS = 40;

const toFinite = (value) => {
    const numericValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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

async function countRestaurantsAlongRoute(decodedCoordinates, corridorRadiusKm) {
    if (!Array.isArray(decodedCoordinates) || decodedCoordinates.length < 2) {
        return 0;
    }

    const bounds = computeBoundingBoxFromCoordinates(decodedCoordinates);
    if (!bounds) {
        return 0;
    }

    const effectiveCorridorRadiusKm = corridorRadiusKm;
    const paddingDeg = effectiveCorridorRadiusKm / 111;
    const candidates = await FoodRestaurant.find({
        status: 'approved',
        isAcceptingOrders: true,
        restaurantType: 'highway',
        'location.latitude': { $gte: bounds.minLat - paddingDeg, $lte: bounds.maxLat + paddingDeg },
        'location.longitude': { $gte: bounds.minLng - paddingDeg, $lte: bounds.maxLng + paddingDeg }
    })
        .select('location')
        .lean();

    if (!candidates.length) {
        return 0;
    }

    const routeLine = turf.lineString(decodedCoordinates.map((coordinate) => [coordinate.lng, coordinate.lat]));
    let count = 0;

    for (const restaurant of candidates) {
        const lat = toFinite(restaurant?.location?.latitude) ?? toFinite(restaurant?.location?.coordinates?.[1]);
        const lng = toFinite(restaurant?.location?.longitude) ?? toFinite(restaurant?.location?.coordinates?.[0]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const projectedPoint = turf.nearestPointOnLine(routeLine, turf.point([lng, lat]), { units: 'kilometers' });
        const distanceKm = projectedPoint?.properties?.dist;
        if (Number.isFinite(distanceKm) && distanceKm <= effectiveCorridorRadiusKm) {
            count += 1;
        }
    }

    return count;
}

async function fetchRoutesFromGoogleRoutesApi(origin, destination, { includeAlternatives = false } = {}) {
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
        computeAlternativeRoutes: includeAlternatives,
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

        const routes = Array.isArray(responseBody?.routes) ? responseBody.routes : [];
        return routes
            .map((route) => {
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
            })
            .filter((route) => Array.isArray(route.decodedCoordinates) && route.decodedCoordinates.length >= 2);
    } catch (error) {
        logger.warn(`Google Routes API fetch failed: ${error.message}`);
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

async function fetchRoutesFromDirectionsApi(origin, destination, { includeAlternatives = false } = {}) {
    const apiKey = config.googleMapsApiKey;
    if (!apiKey) {
        return [];
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        const originStr = `${origin.lat},${origin.lng}`;
        const destStr = `${destination.lat},${destination.lng}`;
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&alternatives=${includeAlternatives ? 'true' : 'false'}&key=${apiKey}`;

        const headers = {
            Referer: config.baseUrl || 'https://bhookingo.in/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Bhookingo/1.0'
        };

        const response = await fetch(url, { signal: controller.signal, headers });
        clearTimeout(timeout);
        const data = await response.json();

        if (data.status !== 'OK' || !Array.isArray(data.routes)) {
            return [];
        }

        return data.routes
            .map((route) => {
                const encodedPolyline = route?.overview_polyline?.points || '';
                const decodedCoordinates = encodedPolyline ? decodePolyline(encodedPolyline) : [];
                const leg = route?.legs?.[0];
                const distanceMeters = toFinite(leg?.distance?.value);
                const durationSeconds = toFinite(leg?.duration?.value);

                return normalizeRouteResponse({
                    polyline: encodedPolyline,
                    decodedCoordinates,
                    distanceMeters,
                    distanceText: leg?.distance?.text || '',
                    durationSeconds,
                    durationText: leg?.duration?.text || '',
                    bounds: route?.bounds || null,
                    provider: 'google_directions_api'
                });
            })
            .filter((route) => Array.isArray(route.decodedCoordinates) && route.decodedCoordinates.length >= 2);
    } catch (error) {
        logger.warn(`Google Directions alternatives fetch failed: ${error.message}`);
        return [];
    }
}

function mergeUniqueRoutes(primaryRoutes = [], fallbackRoutes = []) {
    const merged = [];
    const seen = new Set();

    for (const route of [...primaryRoutes, ...fallbackRoutes]) {
        const key = route?.polyline || `${route?.distanceText || ''}:${route?.durationText || ''}:${route?.decodedCoordinates?.length || 0}`;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        merged.push(route);
    }

    return merged;
}

function decorateRouteOptions(routeOptions, { includeRestaurantCounts = true } = {}) {
    if (!Array.isArray(routeOptions) || routeOptions.length === 0) {
        return { recommendedRouteId: null, routes: [] };
    }

    const durationValues = routeOptions.map((route) => Number(route.route.durationSeconds) || Infinity);
    const distanceValues = routeOptions.map((route) => Number(route.route.distanceMeters) || Infinity);
    const restaurantValues = routeOptions.map((route) => Number(route.restaurantCount) || 0);

    const fastestDuration = Math.min(...durationValues);
    const shortestDistance = Math.min(...distanceValues);
    const maxRestaurants = Math.max(...restaurantValues);

    const decoratedRoutes = routeOptions.map((route, index) => {
        const durationSeconds = Number(route.route.durationSeconds) || Infinity;
        const distanceMeters = Number(route.route.distanceMeters) || Infinity;
        const restaurantCount = Number(route.restaurantCount) || 0;

        const badges = [];
        if (durationSeconds === fastestDuration) badges.push('Fastest');
        if (includeRestaurantCounts && restaurantCount === maxRestaurants && restaurantCount > 0) badges.push('Best for Food Stops');

        const routeName = `Route ${index + 1}`;
        const summary = route.route.distanceText || routeName;

        return {
            ...route,
            name: routeName,
            summary,
            badges
        };
    });

    // Preserve Google's route ordering. The first route returned by Google should stay the default route.
    const recommendedRouteId = decoratedRoutes[0]?.routeId || null;
    const finalRoutes = decoratedRoutes.map((route) => ({
        ...route,
        badges: route.routeId === recommendedRouteId
            ? ['Recommended', ...route.badges.filter((badge) => badge !== 'Recommended')]
            : route.badges
    }));

    return { recommendedRouteId, routes: finalRoutes };
}

export async function getGoogleRouteHighwayOptions({
    origin,
    destination,
    corridorRadiusKm,
    includeAlternatives = true,
    includeRestaurantCounts = true
}) {
    const normalizedOrigin = normalizeLatLng(origin);
    const normalizedDestination = normalizeLatLng(destination);

    if (!normalizedOrigin || !normalizedDestination) {
        return null;
    }

    const settings = await getStoredDrivingSettingsConfig();
    const effectiveCorridorRadiusKm = clamp(
        Number(corridorRadiusKm) || settings.googleRouteSearchRadiusKm,
        1,
        25
    );

    const primaryRoutes = await fetchRoutesFromGoogleRoutesApi(normalizedOrigin, normalizedDestination, {
        includeAlternatives
    });
    const directionsRoutes = includeAlternatives
        ? await fetchRoutesFromDirectionsApi(normalizedOrigin, normalizedDestination, { includeAlternatives: true })
        : [];

    const fallbackRoute = (!primaryRoutes || !primaryRoutes.length) && !directionsRoutes.length
        ? await fetchLegacyDirections(normalizedOrigin, normalizedDestination)
        : null;

    let normalizedRoutes = mergeUniqueRoutes(
        Array.isArray(primaryRoutes) ? primaryRoutes : [],
        Array.isArray(directionsRoutes) ? directionsRoutes : []
    );

    if (!normalizedRoutes.length && fallbackRoute && Array.isArray(fallbackRoute.decodedCoordinates) && fallbackRoute.decodedCoordinates.length >= 2) {
        normalizedRoutes = [normalizeRouteResponse({
            polyline: fallbackRoute.polyline || '',
            decodedCoordinates: fallbackRoute.decodedCoordinates || [],
            distanceText: fallbackRoute.distanceText || '',
            durationText: fallbackRoute.durationText || '',
            bounds: fallbackRoute.bounds || null,
            provider: fallbackRoute.polyline ? 'google_directions_api' : 'interpolated_route_fallback'
        })];
    }

    if (!normalizedRoutes.length) {
        return null;
    }

    const rawRoutes = await Promise.all(normalizedRoutes.map(async (normalizedRoute, index) => {
        const restaurantCount = includeRestaurantCounts
            ? await countRestaurantsAlongRoute(normalizedRoute.decodedCoordinates, effectiveCorridorRadiusKm)
            : 0;

        return {
            routeId: `google_route_${index + 1}`,
            restaurantCount,
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
                distanceKm: Number.isFinite(normalizedRoute.distanceMeters) ? Number((normalizedRoute.distanceMeters / 1000).toFixed(1)) : null,
                distanceText: normalizedRoute.distanceText,
                durationSeconds: normalizedRoute.durationSeconds,
                durationMinutes: Number.isFinite(normalizedRoute.durationSeconds) ? Math.max(1, Math.round(normalizedRoute.durationSeconds / 60)) : null,
                durationText: normalizedRoute.durationText
            }
        };
    }));

    const decorated = decorateRouteOptions(rawRoutes, { includeRestaurantCounts });
    const payload = {
        source: normalizedRoutes[0]?.provider || 'google_routes_api',
        recommendedRouteId: decorated.recommendedRouteId,
        routes: decorated.routes
    };
    return payload;
}

export async function getGoogleRouteHighway({
    origin,
    destination,
    corridorRadiusKm
}) {
    const routeOptions = await getGoogleRouteHighwayOptions({
        origin,
        destination,
        corridorRadiusKm,
        includeAlternatives: true,
        includeRestaurantCounts: true
    });

    if (!routeOptions?.routes?.length) {
        return null;
    }

    const recommendedRoute = routeOptions.routes.find((route) => route.routeId === routeOptions.recommendedRouteId)
        || routeOptions.routes[0];

    return {
        source: routeOptions.source,
        recommendedRouteId: routeOptions.recommendedRouteId,
        routes: routeOptions.routes,
        highway: recommendedRoute.highway,
        route: recommendedRoute.route,
        routeId: recommendedRoute.routeId,
        restaurantCount: recommendedRoute.restaurantCount,
        badges: recommendedRoute.badges,
        name: recommendedRoute.name,
        summary: recommendedRoute.summary
    };
}


