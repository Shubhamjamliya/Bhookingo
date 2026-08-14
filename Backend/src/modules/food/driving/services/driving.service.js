import * as turf from '@turf/turf';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { ValidationError } from '../../../../core/auth/errors.js';
import { getGoogleRouteHighway, getGoogleRouteHighwayOptions } from './googleRoutes.service.js';
import { getStoredDrivingSettingsConfig, saveDrivingSettingsConfig } from './drivingSettings.shared.js';
import { decodePolyline } from '../../orders/utils/googleMaps.js';

const DEBUG_ROUTE_RESTAURANT_IDS = new Set([
    '6a7edae9123461a7ef2300af',
    '6a7ec6864ff406632d2b9f3d'
]);

/**
 * Retrieve Driving Mode settings.
 * Returns settings stored in FoodSystemConfig or default settings.
 */
export async function getDrivingSettings() {
    return getStoredDrivingSettingsConfig();
}

/**
 * Update Driving Mode settings.
 */
export async function updateDrivingSettings(settings, adminId = null) {
    return saveDrivingSettingsConfig(settings, adminId);
}

/**
 * Find restaurants ahead of user on their current highway route.
 */
export async function getRestaurantsAhead({ lat, lng, heading, highwayId, speed, destLat, destLng, routePolyline }) {
    const settings = await getDrivingSettings();

    if (!settings.enabled) {
        throw new ValidationError('Driving Mode is temporarily unavailable.');
    }

    const userSpeed = speed && Number(speed) > 10 ? Number(speed) : 80; // default 80 km/h

    // 1. New Google Routes-based logic when start and destination are provided
    if (destLat !== null && destLat !== undefined && destLng !== null && destLng !== undefined) {
        let googleRoute = null;

        if (routePolyline) {
            const decodedCoordinates = decodePolyline(routePolyline);
            googleRoute = {
                highway: {
                    id: 'custom_google_route',
                    name: 'Google Maps Route',
                    ref: 'Google Maps Route',
                    polyline: routePolyline,
                    coordinates: decodedCoordinates,
                    boundingBox: null
                },
                route: {
                    distanceMeters: null,
                    distanceKm: null,
                    distanceText: '',
                    durationSeconds: null,
                    durationMinutes: null,
                    durationText: ''
                }
            };
        } else {
            googleRoute = await getGoogleRouteHighway({
                origin: { lat, lng },
                destination: { lat: destLat, lng: destLng }
            });
        }

        if (!googleRoute) {
            return {
                status: 'IN_SERVICE',
                highway: {
                    id: 'custom_google_route',
                    name: 'Google Maps Route',
                    ref: 'Google Maps Route',
                    coordinates: [],
                    boundingBox: null
                },
                userTravel: {
                    distanceToHighway: 0,
                    isForward: true,
                    estimatedSpeed: userSpeed
                },
                settings,
                restaurants: []
            };
        }

        const decodedCoordinates = googleRoute.highway.coordinates || [];
        if (decodedCoordinates.length < 2) {
            return {
                status: 'IN_SERVICE',
                highway: {
                    id: 'custom_google_route',
                    name: 'Google Maps Route',
                    ref: 'Google Maps Route',
                    coordinates: [],
                    boundingBox: null
                },
                userTravel: {
                    distanceToHighway: 0,
                    isForward: true,
                    estimatedSpeed: userSpeed
                },
                settings,
                restaurants: []
            };
        }

        const lineCoords = decodedCoordinates.map((coordinate) => [coordinate.lng, coordinate.lat]);
        const line = turf.lineString(lineCoords);
        const effectiveRoadCorridorKm = Number(settings.googleRouteSearchRadiusKm) || 0;
        let minLat = Infinity;
        let maxLat = -Infinity;
        let minLng = Infinity;
        let maxLng = -Infinity;
        for (const coordinate of decodedCoordinates) {
            if (!Number.isFinite(coordinate?.lat) || !Number.isFinite(coordinate?.lng)) continue;
            minLat = Math.min(minLat, coordinate.lat);
            maxLat = Math.max(maxLat, coordinate.lat);
            minLng = Math.min(minLng, coordinate.lng);
            maxLng = Math.max(maxLng, coordinate.lng);
        }
        const paddingDeg = effectiveRoadCorridorKm / 111;

        const userPoint = turf.point([lng, lat]);

        const candidateFilter = {
            status: 'approved',
            isAcceptingOrders: true,
            isHighwayRestaurant: true,
            'location.latitude': { $gte: minLat - paddingDeg, $lte: maxLat + paddingDeg },
            'location.longitude': { $gte: minLng - paddingDeg, $lte: maxLng + paddingDeg }
        };

        const U_proj = turf.nearestPointOnLine(line, userPoint, { units: 'kilometers' });
        const dist_U = U_proj.properties.location;
        const maxDiscoveryDistance = Number(settings.googleRouteForwardRangeKm) || 0;

        const candidates = await FoodRestaurant.find(candidateFilter)
            .select({
                name: 1,
                restaurantName: 1,
                restaurantSlug: 1,
                profileImage: 1,
                profileImageUrl: 1,
                coverImages: 1,
                menuImages: 1,
                cuisines: 1,
                facilities: 1,
                pureVegRestaurant: 1,
                rating: 1,
                status: 1,
                isAcceptingOrders: 1,
                isHighwayRestaurant: 1,
                highwayName: 1,
                highwayRef: 1,
                roadName: 1,
                location: 1,
                city: 1,
                address: 1,
                offer: 1,
            })
            .lean();
        const aheadRestaurants = [];

        for (const restaurant of candidates) {
            const loc = restaurant.location;
            const restaurantId = restaurant?._id ? String(restaurant._id) : null;
            const rlat = typeof loc?.latitude === 'number'
                ? loc.latitude
                : (Array.isArray(loc?.coordinates) ? loc.coordinates[1] : null);
            const rlng = typeof loc?.longitude === 'number'
                ? loc.longitude
                : (Array.isArray(loc?.coordinates) ? loc.coordinates[0] : null);

            if (!Number.isFinite(rlat) || !Number.isFinite(rlng)) continue;
            if (restaurant.isHighwayRestaurant !== true) continue;

            const rPoint = turf.point([rlng, rlat]);
            const R_proj = turf.nearestPointOnLine(line, rPoint, { units: 'kilometers' });
            const dist_R = R_proj.properties.location;
            const distToRouteKm = R_proj.properties.dist;
            const distanceAheadKm = dist_R - dist_U;
            const isRestaurantAhead = distanceAheadKm >= (-settings.googleRouteBackwardBufferKm);
            const shouldIncludeRestaurant = settings.showAllRouteRestaurants === true
                ? isRestaurantAhead
                : (isRestaurantAhead && distanceAheadKm <= maxDiscoveryDistance);

            if (restaurantId && DEBUG_ROUTE_RESTAURANT_IDS.has(restaurantId)) {
                console.log('[DrivingMode][DebugRestaurant]', {
                    restaurantId,
                    restaurantName: restaurant.restaurantName || restaurant.name || null,
                    highwayRef: restaurant.highwayRef || restaurant.highwayName || null,
                    restaurantLat: rlat,
                    restaurantLng: rlng,
                    userLat: lat,
                    userLng: lng,
                    distToRouteKm: Number.isFinite(distToRouteKm) ? Number(distToRouteKm.toFixed(3)) : null,
                    effectiveRoadCorridorKm,
                    distanceAheadKm: Number.isFinite(distanceAheadKm) ? Number(distanceAheadKm.toFixed(3)) : null,
                    backwardBufferKm: settings.googleRouteBackwardBufferKm,
                    maxDiscoveryDistance,
                    showAllRouteRestaurants: settings.showAllRouteRestaurants === true,
                    isRestaurantAhead,
                    shouldIncludeRestaurant
                });
            }

            if (!Number.isFinite(distToRouteKm) || distToRouteKm > effectiveRoadCorridorKm) {
                console.log('[DrivingMode] Restaurant excluded by route corridor', {
                    restaurantId,
                    restaurantName: restaurant.restaurantName || restaurant.name || null,
                    highwayRef: restaurant.highwayRef || restaurant.highwayName || null,
                    restaurantLat: rlat,
                    restaurantLng: rlng,
                    distToRouteKm: Number.isFinite(distToRouteKm) ? Number(distToRouteKm.toFixed(3)) : null,
                    effectiveRoadCorridorKm
                });
                continue;
            }
            if (!shouldIncludeRestaurant) {
                console.log('[DrivingMode] Restaurant excluded by ahead/range rule', {
                    restaurantId,
                    restaurantName: restaurant.restaurantName || restaurant.name || null,
                    highwayRef: restaurant.highwayRef || restaurant.highwayName || null,
                    distanceAheadKm: Number.isFinite(distanceAheadKm) ? Number(distanceAheadKm.toFixed(3)) : null,
                    backwardBufferKm: settings.googleRouteBackwardBufferKm,
                    maxDiscoveryDistance,
                    showAllRouteRestaurants: settings.showAllRouteRestaurants === true,
                    isRestaurantAhead
                });
                continue;
            }

            console.log('[DrivingMode] Restaurant included on route', {
                restaurantId,
                restaurantName: restaurant.restaurantName || restaurant.name || null,
                highwayRef: restaurant.highwayRef || restaurant.highwayName || null,
                distanceAheadKm: Number.isFinite(distanceAheadKm) ? Number(distanceAheadKm.toFixed(3)) : null,
                distToRouteKm: Number.isFinite(distToRouteKm) ? Number(distToRouteKm.toFixed(3)) : null,
                maxDiscoveryDistance
            });

            const etaHours = distanceAheadKm / userSpeed;
            const etaMinutes = Math.max(1, Math.round(etaHours * 60));

            aheadRestaurants.push({
                ...restaurant,
                roadName: loc?.roadName || restaurant.roadName || '',
                distanceKm: Number(Math.max(0, distanceAheadKm).toFixed(1)),
                etaMinutes,
                isBookable: distanceAheadKm <= 50,
                highwayRef: restaurant.highwayRef || restaurant.highwayName || 'NH',
                routeOffsetKm: Number(distToRouteKm.toFixed(2))
            });
        }

        aheadRestaurants.sort((a, b) => {
            if ((a.distanceKm ?? Infinity) !== (b.distanceKm ?? Infinity)) {
                return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
            }
            return (a.routeOffsetKm ?? Infinity) - (b.routeOffsetKm ?? Infinity);
        });

        return {
            status: 'IN_SERVICE',
            highway: {
                id: 'custom_google_route',
                name: 'Google Maps Route',
                ref: 'Google Maps Route',
                coordinates: decodedCoordinates,
                boundingBox: googleRoute.highway.boundingBox,
                polyline: googleRoute.highway.polyline || ''
            },
            userTravel: {
                distanceToHighway: 0,
                isForward: true,
                estimatedSpeed: userSpeed
            },
            settings,
            route: googleRoute.route,
            restaurants: aheadRestaurants
        };
    }

    return {
        status: 'OUT_OF_HIGHWAY',
        message: 'Driving Mode works best when a destination route is selected in Google Maps.',
        settings,
        restaurants: [],
        userTravel: {
            distanceToHighway: null,
            estimatedSpeed: userSpeed
        }
    };
}

/**
 * Validate that user is within the allowed driving range of the restaurant during order checkout.
 */
export async function validateOrderDrivingRange(restaurant, userLocation) {
    const uLat = userLocation?.latitude;
    const uLng = userLocation?.longitude;
    if (uLat === undefined || uLat === null || uLng === undefined || uLng === null) {
        throw new ValidationError('User GPS location is required to verify highway driving range.');
    }

    const settings = await getDrivingSettings();
    const rLng = restaurant.location?.coordinates?.[0];
    const rLat = restaurant.location?.coordinates?.[1];
    if (rLng === undefined || rLat === undefined) return;
    const distanceKm = turf.distance(
        turf.point([uLng, uLat]),
        turf.point([rLng, rLat]),
        { units: 'kilometers' }
    );
    const allowedDistanceKm = Number(settings.googleRouteForwardRangeKm) || 0;
    if (distanceKm > allowedDistanceKm) {
        throw new ValidationError(`Restaurant is outside your driving range. Allowed: ${allowedDistanceKm} KM, Actual: ${distanceKm.toFixed(1)} KM.`);
    }
}

export async function getGoogleRouteHighwayPreview({
    startLat,
    startLng,
    endLat,
    endLng,
    corridorRadiusKm,
    includeAlternatives = true,
    includeRestaurantCounts = false
}) {
    const routeOptions = await getGoogleRouteHighwayOptions({
        origin: { lat: startLat, lng: startLng },
        destination: { lat: endLat, lng: endLng },
        corridorRadiusKm,
        includeAlternatives,
        includeRestaurantCounts
    });
    if (!routeOptions?.routes?.length) {
        throw new ValidationError('Unable to fetch route from Google Maps API');
    }
    return routeOptions;
}

