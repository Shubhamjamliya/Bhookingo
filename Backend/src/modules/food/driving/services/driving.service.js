import mongoose from 'mongoose';
import * as turf from '@turf/turf';
import { FoodSystemConfig } from '../../admin/models/systemConfig.model.js';
import { FoodHighway } from '../../admin/models/highway.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { findNearestHighwayUnchecked } from '../../admin/services/highway.service.js';
import { ValidationError } from '../../../../core/auth/errors.js';
import { fetchDirections } from '../../orders/utils/googleMaps.js';

// Constants
const DRIVING_SETTINGS_KEY = 'driving_mode_settings';
export const HIGHWAY_CONNECTIVITY_SEARCH_RADIUS_KM = 50;

const DEFAULT_SETTINGS = {
    enabled: true,
    locationRefreshIntervalMinutes: 5,
    restaurantSearchRadiusKm: 50,
    highwayEntryRadiusMeters: 2000
};

/**
 * Retrieve Driving Mode settings.
 * Returns settings stored in FoodSystemConfig or default settings.
 */
export async function getDrivingSettings() {
    try {
        const config = await FoodSystemConfig.findOne({ key: DRIVING_SETTINGS_KEY }).lean();
        if (!config || !config.value) {
            return { ...DEFAULT_SETTINGS };
        }
        return {
            enabled: config.value.enabled !== false,
            locationRefreshIntervalMinutes: Number(config.value.locationRefreshIntervalMinutes) || DEFAULT_SETTINGS.locationRefreshIntervalMinutes,
            restaurantSearchRadiusKm: Number(config.value.restaurantSearchRadiusKm) || DEFAULT_SETTINGS.restaurantSearchRadiusKm,
            highwayEntryRadiusMeters: Number(config.value.highwayEntryRadiusMeters) || DEFAULT_SETTINGS.highwayEntryRadiusMeters
        };
    } catch (err) {
        console.error('[DrivingService] Failed to fetch settings:', err.message);
        return { ...DEFAULT_SETTINGS };
    }
}

/**
 * Update Driving Mode settings.
 */
export async function updateDrivingSettings(settings, adminId = null) {
    const enabled = settings.enabled !== false;
    const locationRefreshIntervalMinutes = Number(settings.locationRefreshIntervalMinutes);
    const restaurantSearchRadiusKm = Number(settings.restaurantSearchRadiusKm);
    const highwayEntryRadiusMeters = Number(settings.highwayEntryRadiusMeters);

    if (!Number.isFinite(locationRefreshIntervalMinutes) || locationRefreshIntervalMinutes <= 0) {
        throw new ValidationError('Refresh interval must be a positive number');
    }
    if (!Number.isFinite(restaurantSearchRadiusKm) || restaurantSearchRadiusKm <= 0) {
        throw new ValidationError('Restaurant search range must be a positive number in KM');
    }
    if (!Number.isFinite(highwayEntryRadiusMeters) || highwayEntryRadiusMeters <= 0) {
        throw new ValidationError('Highway entry radius must be a positive number in meters');
    }

    const payload = {
        enabled,
        locationRefreshIntervalMinutes,
        restaurantSearchRadiusKm,
        highwayEntryRadiusMeters
    };

    await FoodSystemConfig.findOneAndUpdate(
        { key: DRIVING_SETTINGS_KEY },
        {
            $set: {
                key: DRIVING_SETTINGS_KEY,
                value: payload,
                description: 'Driving mode validation, search radius and map refresh configuration',
                updatedBy: adminId
                    ? { role: 'ADMIN', adminId: new mongoose.Types.ObjectId(adminId), at: new Date() }
                    : undefined
            }
        },
        { upsert: true, new: true }
    );

    return payload;
}

/**
 * Find restaurants ahead of user on their current highway route.
 */
export async function getRestaurantsAhead({ lat, lng, heading, highwayId, rangeKm, speed, destLat, destLng }) {
    const settings = await getDrivingSettings();

    if (!settings.enabled) {
        throw new ValidationError('Driving Mode is temporarily unavailable.');
    }

    const userSpeed = speed && Number(speed) > 10 ? Number(speed) : 80; // default 80 km/h

    // 1. New Google Maps Directions-based logic when start and destination are provided
    if (destLat !== null && destLat !== undefined && destLng !== null && destLng !== undefined) {
        const directions = await fetchDirections({ lat, lng }, { lat: destLat, lng: destLng });
        if (!directions) {
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

        const { polyline, decodedCoordinates, distanceText, durationText, bounds } = directions;
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

        const lineCoords = decodedCoordinates.map(c => [c.lng, c.lat]);
        const line = turf.lineString(lineCoords);

        // Project user onto the Google route
        const userPoint = turf.point([lng, lat]);
        const U_proj = turf.nearestPointOnLine(line, userPoint, { units: 'kilometers' });
        const dist_U = U_proj.properties.location; // distance from start of route in km

        // Fetch all candidate restaurants (approved and accepting orders)
        const candidates = await FoodRestaurant.find({
            status: 'approved',
            isAcceptingOrders: true
        }).lean();

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
            const dist_to_route_km = R_proj.properties.dist; // distance from restaurant to route in km

            // Proximity threshold: is the restaurant within 5 km of the Google route?
            if (dist_to_route_km > 5) continue;

            const distanceKm = dist_R - dist_U; // distance ahead along the route

            // Direction check: must be ahead of user (distanceKm >= 0) and within 100 km discovery radius
            const isRestaurantAhead = distanceKm >= 0;

            if (isRestaurantAhead && distanceKm <= 100) {
                const etaHours = distanceKm / userSpeed;
                const etaMinutes = Math.max(1, Math.round(etaHours * 60));

                let highwayRef = 'NH';
                if (restaurant.highwayId) {
                    const hw = await FoodHighway.findById(restaurant.highwayId).select("ref").lean();
                    if (hw?.ref) highwayRef = hw.ref;
                }

                aheadRestaurants.push({
                    ...restaurant,
                    distanceKm: Number(distanceKm.toFixed(1)),
                    etaMinutes,
                    highwayRef
                });
            }
        }

        // Sort by distance ahead (closest first)
        aheadRestaurants.sort((a, b) => a.distanceKm - b.distanceKm);

        return {
            status: 'IN_SERVICE',
            highway: {
                id: 'custom_google_route',
                name: 'Google Maps Route',
                ref: 'Google Maps Route',
                coordinates: decodedCoordinates,
                boundingBox: bounds
            },
            userTravel: {
                distanceToHighway: 0,
                isForward: true,
                estimatedSpeed: userSpeed
            },
            settings,
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
        highway = await FoodHighway.findById(highwayId).lean();
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
    const highway = await FoodHighway.findById(restaurant.highwayId).lean();
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
    const startHighways = await FoodHighway.find(startQuery).lean();

    // 2. Find candidate highways near end location
    const endQuery = {
        isActive: true,
        'boundingBox.minLat': { $lte: endLat + paddingDeg },
        'boundingBox.maxLat': { $gte: endLat - paddingDeg },
        'boundingBox.minLng': { $lte: endLng + paddingDeg },
        'boundingBox.maxLng': { $gte: endLng - paddingDeg }
    };
    const endHighways = await FoodHighway.find(endQuery).lean();

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
    for (const hw of dbHighways) {
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

