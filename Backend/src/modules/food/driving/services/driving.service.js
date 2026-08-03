import mongoose from 'mongoose';
import * as turf from '@turf/turf';
import { FoodHighway } from '../../admin/models/highway.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { findNearestHighwayUnchecked, getHighwayById, hydrateHighwayGeometry } from '../../admin/services/highway.service.js';
import { ValidationError } from '../../../../core/auth/errors.js';
import { getGoogleRouteHighway, getGoogleRouteHighwayOptions, matchStoredHighwaysAlongRoute } from './googleRoutes.service.js';
import { getStoredDrivingSettingsConfig, saveDrivingSettingsConfig } from './drivingSettings.shared.js';
import { decodePolyline } from '../../orders/utils/googleMaps.js';

// Constants
export const HIGHWAY_CONNECTIVITY_SEARCH_RADIUS_KM = 50;

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
export async function getRestaurantsAhead({ lat, lng, heading, highwayId, rangeKm, speed, destLat, destLng, routePolyline }) {
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
                destination: { lat: destLat, lng: destLng },
                includeStoredHighways: false
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
        const effectiveRoadCorridorKm = settings.googleRouteSearchRadiusKm;
        const effectiveStoredHighwayMatchRadiusKm = Math.max(
            effectiveRoadCorridorKm,
            Number(settings.storedHighwayMatchRadiusKm) || effectiveRoadCorridorKm
        );

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

        const [matchedStoredHighways, userPoint] = await Promise.all([
            matchStoredHighwaysAlongRoute(decodedCoordinates, effectiveStoredHighwayMatchRadiusKm),
            Promise.resolve(turf.point([lng, lat]))
        ]);
        const matchedHighwayIds = matchedStoredHighways
            .map((highway) => String(highway?._id || '').trim())
            .filter(Boolean);
        const matchedHighwayIdSet = new Set(matchedHighwayIds);

        const candidateFilter = {
            status: 'approved',
            isAcceptingOrders: true,
            isHighwayRestaurant: true,
            highwayId: { $ne: null },
            'location.latitude': { $gte: minLat - paddingDeg, $lte: maxLat + paddingDeg },
            'location.longitude': { $gte: minLng - paddingDeg, $lte: maxLng + paddingDeg }
        };

        if (matchedHighwayIds.length > 0) {
            candidateFilter.highwayId = {
                $in: matchedHighwayIds.map((id) => new mongoose.Types.ObjectId(id))
            };
        }

        const U_proj = turf.nearestPointOnLine(line, userPoint, { units: 'kilometers' });
        const dist_U = U_proj.properties.location;
        const maxDiscoveryDistance = rangeKm ? Number(rangeKm) : settings.googleRouteForwardRangeKm;

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
                highwayId: 1,
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
            const rlat = typeof loc?.latitude === 'number'
                ? loc.latitude
                : (Array.isArray(loc?.coordinates) ? loc.coordinates[1] : null);
            const rlng = typeof loc?.longitude === 'number'
                ? loc.longitude
                : (Array.isArray(loc?.coordinates) ? loc.coordinates[0] : null);

            if (!Number.isFinite(rlat) || !Number.isFinite(rlng)) continue;
            if (restaurant.isHighwayRestaurant !== true || !restaurant.highwayId) continue;

            const rPoint = turf.point([rlng, rlat]);
            const R_proj = turf.nearestPointOnLine(line, rPoint, { units: 'kilometers' });
            const dist_R = R_proj.properties.location;
            const distToRouteKm = R_proj.properties.dist;
            if (!Number.isFinite(distToRouteKm) || distToRouteKm > effectiveRoadCorridorKm) continue;

            const distanceAheadKm = dist_R - dist_U;
            const isRestaurantAhead = distanceAheadKm >= (-settings.googleRouteBackwardBufferKm);
            const shouldIncludeRestaurant = settings.showAllRouteRestaurants === true
                ? isRestaurantAhead
                : (isRestaurantAhead && distanceAheadKm <= maxDiscoveryDistance);
            if (!shouldIncludeRestaurant) continue;

            const etaHours = distanceAheadKm / userSpeed;
            const etaMinutes = Math.max(1, Math.round(etaHours * 60));
            const sameStoredHighway = matchedHighwayIdSet.has(String(restaurant.highwayId));

            aheadRestaurants.push({
                ...restaurant,
                roadName: loc?.roadName || restaurant.roadName || '',
                distanceKm: Number(Math.max(0, distanceAheadKm).toFixed(1)),
                etaMinutes,
                isBookable: distanceAheadKm <= 50,
                highwayRef: restaurant.highwayRef || restaurant.highwayName || 'NH',
                routeOffsetKm: Number(distToRouteKm.toFixed(2)),
                sameStoredHighway
            });
        }

        aheadRestaurants.sort((a, b) => {
            if (Number(Boolean(b.sameStoredHighway)) !== Number(Boolean(a.sameStoredHighway))) {
                return Number(Boolean(b.sameStoredHighway)) - Number(Boolean(a.sameStoredHighway));
            }
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
                polyline: googleRoute.highway.polyline || '',
                matchedStoredHighways
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

    // 2. Fallback to old database highway-based logic
    let highway = null;
    let distanceToHighway = null;

    if (!highwayId) {
        // Automatically detect nearest highway using existing unchecked detection
        const nearestResult = await findNearestHighwayUnchecked(lat, lng, Math.max(10000, settings.highwayEntryRadiusMeters + 5000));
        if (!nearestResult || nearestResult.distanceMeters > settings.highwayEntryRadiusMeters) {
            return {
                status: 'OUT_OF_HIGHWAY',
                message: 'Driving Mode is available only when you are near a National Highway. Move closer to a highway to start discovering restaurants ahead.',
                settings,
                restaurants: [],
                userTravel: {
                    distanceToHighway: nearestResult ? nearestResult.distanceMeters : null
                }
            };
        }
        highway = nearestResult.highway;
        distanceToHighway = nearestResult.distanceMeters;
    } else {
        if (!mongoose.Types.ObjectId.isValid(highwayId)) {
            throw new ValidationError('Invalid highway ID');
        }
        highway = await getHighwayById(highwayId);
        if (!highway) {
            throw new ValidationError('Highway not found');
        }
    }

    const polylineCoords = highway.coordinates;
    if (!Array.isArray(polylineCoords) || polylineCoords.length < 2) {
        return {
            status: 'IN_SERVICE',
            highway: {
                id: highway._id,
                name: highway.name,
                ref: highway.ref
            },
            settings,
            restaurants: []
        };
    }

    const lineCoords = polylineCoords.map(c => [c.lng, c.lat]);
    const line = turf.lineString(lineCoords);

    // Project user onto highway
    const userPoint = turf.point([lng, lat]);
    const U_proj = turf.nearestPointOnLine(line, userPoint, { units: 'kilometers' });
    const dist_U = U_proj.properties.location; // distance from start in km
    const index_U = U_proj.properties.index;

    // Check user direction (bearing) along highway line
    let isForward = true;
    if (heading !== undefined && heading !== null && heading !== '') {
        const hVal = Number(heading);
        if (Number.isFinite(hVal)) {
            let p1 = lineCoords[index_U];
            let p2 = lineCoords[index_U + 1];
            if (!p2) {
                p1 = lineCoords[index_U - 1] || p1;
                p2 = lineCoords[index_U];
            }
            const bearing_seg = turf.bearing(turf.point(p1), turf.point(p2));
            const diff = (hVal - bearing_seg + 360) % 360;
            isForward = diff < 90 || diff > 270;
        }
    }

    // Fetch candidate restaurants on this highway that are approved and accept orders
    const candidates = await FoodRestaurant.find({
        highwayId: highway._id,
        status: 'approved',
        isAcceptingOrders: true
    }).lean();

    const maxRange = rangeKm ? Number(rangeKm) : settings.restaurantSearchRadiusKm;
    const aheadRestaurants = [];

    for (const restaurant of candidates) {
        const loc = restaurant.location;
        const rlat = typeof loc?.latitude === 'number' ? loc.latitude
            : (Array.isArray(loc?.coordinates) ? loc.coordinates[1] : null);
        const rlng = typeof loc?.longitude === 'number' ? loc.longitude
            : (Array.isArray(loc?.coordinates) ? loc.coordinates[0] : null);

        if (!Number.isFinite(rlat) || !Number.isFinite(rlng)) continue;

        const rPoint = turf.point([rlng, rlat]);
        const R_proj = turf.nearestPointOnLine(line, rPoint, { units: 'kilometers' });
        const dist_R = R_proj.properties.location;

        const distanceKm = Math.abs(dist_R - dist_U);

        // Direction check
        const isRestaurantAhead = isForward ? (dist_R >= dist_U) : (dist_R <= dist_U);

        if (isRestaurantAhead && distanceKm <= maxRange) {
            const etaHours = distanceKm / userSpeed;
            const etaMinutes = Math.max(1, Math.round(etaHours * 60));

            aheadRestaurants.push({
                ...restaurant,
                distanceKm: Number(distanceKm.toFixed(1)),
                etaMinutes
            });
        }
    }

    // Sort by distance ahead (closest first)
    aheadRestaurants.sort((a, b) => a.distanceKm - b.distanceKm);

    return {
        status: 'IN_SERVICE',
        highway: {
            id: highway._id,
            name: highway.name,
            ref: highway.ref,
            coordinates: polylineCoords,
            boundingBox: highway.boundingBox
        },
        userTravel: {
            distanceToHighway,
            isForward,
            estimatedSpeed: userSpeed
        },
        settings,
        restaurants: aheadRestaurants
    };
}

/**
 * Validate that user is within the allowed driving range of the restaurant during order checkout.
 */
export async function validateOrderDrivingRange(restaurant, userLocation) {
    if (!restaurant.isHighwayRestaurant || !restaurant.highwayId) return;

    const uLat = userLocation?.latitude;
    const uLng = userLocation?.longitude;
    if (uLat === undefined || uLat === null || uLng === undefined || uLng === null) {
        throw new ValidationError('User GPS location is required to verify highway driving range.');
    }

    const settings = await getDrivingSettings();
    const highway = await getHighwayById(restaurant.highwayId);
    if (!highway || !Array.isArray(highway.coordinates) || highway.coordinates.length < 2) {
        return; // if highway geometry is missing, fall back to allow
    }

    const lineCoords = highway.coordinates.map(c => [c.lng, c.lat]);
    const line = turf.lineString(lineCoords);

    const userPt = turf.point([uLng, uLat]);
    const rLng = restaurant.location?.coordinates?.[0];
    const rLat = restaurant.location?.coordinates?.[1];
    if (rLng === undefined || rLat === undefined) return;

    const rPt = turf.point([rLng, rLat]);

    const U_proj = turf.nearestPointOnLine(line, userPt, { units: 'kilometers' });
    const R_proj = turf.nearestPointOnLine(line, rPt, { units: 'kilometers' });

    const dist_U = U_proj.properties.location;
    const dist_R = R_proj.properties.location;

    const distanceKm = Math.abs(dist_R - dist_U);
    if (distanceKm > settings.restaurantSearchRadiusKm) {
        throw new ValidationError(`Restaurant is outside your driving range. Allowed: ${settings.restaurantSearchRadiusKm} KM, Actual: ${distanceKm.toFixed(1)} KM.`);
    }
}

export async function getConnectingHighways({ startLat, startLng, endLat, endLng, searchRadiusKm }) {
    const radiusKm = Number(searchRadiusKm) || HIGHWAY_CONNECTIVITY_SEARCH_RADIUS_KM;
    const thresholdMeters = radiusKm * 1000;
    const paddingDeg = thresholdMeters / 111000;

    console.log(`[ConnectingHighways] Origin: [${startLat}, ${startLng}], Destination: [${endLat}, ${endLng}], Search Radius: ${radiusKm} km`);

    // 1. Find candidate highways near start location
    const startQuery = {
        isActive: true,
        'boundingBox.minLat': { $lte: startLat + paddingDeg },
        'boundingBox.maxLat': { $gte: startLat - paddingDeg },
        'boundingBox.minLng': { $lte: startLng + paddingDeg },
        'boundingBox.maxLng': { $gte: startLng - paddingDeg }
    };
    const startHighways = await FoodHighway.find(startQuery).select('name ref geometryPath boundingBox').lean();

    // 2. Find candidate highways near end location
    const endQuery = {
        isActive: true,
        'boundingBox.minLat': { $lte: endLat + paddingDeg },
        'boundingBox.maxLat': { $gte: endLat - paddingDeg },
        'boundingBox.minLng': { $lte: endLng + paddingDeg },
        'boundingBox.maxLng': { $gte: endLng - paddingDeg }
    };
    const endHighways = await FoodHighway.find(endQuery).select('name ref geometryPath boundingBox').lean();

    // 3. Find common highways (intersection)
    const endHwRefs = new Set(endHighways.map(h => h.ref).filter(Boolean));
    const endHwIds = new Set(endHighways.map(h => h._id.toString()));

    const dbHighways = startHighways.filter(h => {
        if (h.ref && endHwRefs.has(h.ref)) return true;
        return endHwIds.has(h._id.toString());
    });

    console.log(`[ConnectingHighways] Candidates surviving DB intersection query: ${dbHighways.length}`);

    const startPt = turf.point([startLng, startLat]);
    const endPt = turf.point([endLng, endLat]);
    const matching = [];

    // 4. Proximity validation using Turf + details calculation
    for (const candidate of dbHighways) {
        const hw = await hydrateHighwayGeometry(candidate, { mergeSegments: true });
        let line;
        if (Array.isArray(hw.segments) && hw.segments.length > 0) {
            const lines = hw.segments.map(seg => seg.map(c => [c.lng, c.lat]));
            line = turf.multiLineString(lines);
        } else if (Array.isArray(hw.coordinates) && hw.coordinates.length >= 2) {
            const lineCoords = hw.coordinates.map(c => [c.lng, c.lat]);
            line = turf.lineString(lineCoords);
        } else {
            console.log(`[ConnectingHighways] Highway ${hw.ref || hw.name} rejected: No valid coordinates or segments`);
            continue;
        }

        let startProj, endProj;
        try {
            startProj = turf.nearestPointOnLine(line, startPt, { units: 'kilometers' });
            endProj = turf.nearestPointOnLine(line, endPt, { units: 'kilometers' });
        } catch (e) {
            console.log(`[ConnectingHighways] Highway ${hw.ref || hw.name} rejected: Turf projection error: ${e.message}`);
            continue;
        }

        const startDist = startProj.properties.dist * 1000; // convert km to meters
        const endDist = endProj.properties.dist * 1000;     // convert km to meters

        console.log(`[ConnectingHighways] Candidate ${hw.ref || hw.name} - Dist to start: ${startDist.toFixed(1)}m, Dist to end: ${endDist.toFixed(1)}m`);

        if (startDist <= thresholdMeters && endDist <= thresholdMeters) {
            // Projected distances along the line in km (since units is kilometers)
            const startLocKm = startProj.properties.location;
            const endLocKm = endProj.properties.location;
            const approxDistanceKm = Number(Math.abs(endLocKm - startLocKm).toFixed(1));
            // Average highway speed = 80 km/h
            const approxTravelTimeMinutes = Math.max(1, Math.round((approxDistanceKm / 80) * 60));

            // Count approved active restaurants on this highway
            const restaurantCount = await FoodRestaurant.countDocuments({
                highwayId: hw._id,
                status: 'approved',
                isAcceptingOrders: true
            });

            matching.push({
                _id: hw._id,
                name: hw.name,
                ref: hw.ref,
                restaurantCount,
                approxDistanceKm,
                approxTravelTimeMinutes
            });
        } else {
            const reasons = [];
            if (startDist > thresholdMeters) reasons.push(`start too far (${startDist.toFixed(1)}m > ${thresholdMeters}m)`);
            if (endDist > thresholdMeters) reasons.push(`end too far (${endDist.toFixed(1)}m > ${thresholdMeters}m)`);
            console.log(`[ConnectingHighways] Highway ${hw.ref || hw.name} rejected: ${reasons.join(' AND ')}`);
        }
    }

    // Sort by:
    // 1. Recommended (high restaurant count first)
    // 2. Shortest distance
    matching.sort((a, b) => {
        if (b.restaurantCount !== a.restaurantCount) {
            return b.restaurantCount - a.restaurantCount;
        }
        return a.approxDistanceKm - b.approxDistanceKm;
    });

    console.log(`[ConnectingHighways] Final returned matching highways:`, matching.map(h => h.ref || h.name));
    return matching;
}

export async function getGoogleRouteHighwayPreview({
    startLat,
    startLng,
    endLat,
    endLng,
    corridorRadiusKm,
    includeAlternatives = true,
    includeRestaurantCounts = false,
    includeStoredHighways = false
}) {
    const routeOptions = await getGoogleRouteHighwayOptions({
        origin: { lat: startLat, lng: startLng },
        destination: { lat: endLat, lng: endLng },
        includeStoredHighways,
        corridorRadiusKm,
        includeAlternatives,
        includeRestaurantCounts
    });
    if (!routeOptions?.routes?.length) {
        throw new ValidationError('Unable to fetch route from Google Maps API');
    }
    return routeOptions;
}

