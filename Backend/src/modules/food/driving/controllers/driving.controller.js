import { getDrivingSettings, updateDrivingSettings, getRestaurantsAhead, getConnectingHighways, getGoogleRouteHighwayPreview } from '../services/driving.service.js';
import { ValidationError } from '../../../../core/auth/errors.js';

const toFinite = (v) => {
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
};

/**
 * GET /food/driving-mode/settings (Public / User endpoint)
 */
export const getPublicDrivingModeSettingsController = async (req, res, next) => {
    try {
        const settings = await getDrivingSettings();
        return res.status(200).json({
            success: true,
            data: {
                refreshInterval: settings.locationRefreshIntervalMinutes,
                rangeKm: settings.restaurantSearchRadiusKm,
                enabled: settings.enabled,
                highwayEntryRadiusMeters: settings.highwayEntryRadiusMeters,
                restaurantSearchRadiusKm: settings.restaurantSearchRadiusKm,
                googleRouteSearchRadiusKm: settings.googleRouteSearchRadiusKm,
                googleRouteForwardRangeKm: settings.googleRouteForwardRangeKm,
                googleRouteBackwardBufferKm: settings.googleRouteBackwardBufferKm,
                storedHighwayMatchRadiusKm: settings.storedHighwayMatchRadiusKm,
                showAllRouteRestaurants: settings.showAllRouteRestaurants === true
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /food/driving-mode/restaurants (User endpoint)
 */
export const getRestaurantsAheadController = async (req, res, next) => {
    try {
        const lat = toFinite(req.query.lat);
        const lng = toFinite(req.query.lng);
        const heading = req.query.heading !== undefined ? toFinite(req.query.heading) : null;
        const speed = req.query.speed !== undefined ? toFinite(req.query.speed) : null;
        const highwayId = req.query.highwayId || null;
        const rangeKm = req.query.rangeKm !== undefined ? toFinite(req.query.rangeKm) : null;
        const destLat = req.query.destLat !== undefined ? toFinite(req.query.destLat) : null;
        const destLng = req.query.destLng !== undefined ? toFinite(req.query.destLng) : null;
        const routePolyline = typeof req.query.routePolyline === 'string' && req.query.routePolyline.trim()
            ? req.query.routePolyline.trim()
            : null;

        if (lat === null || lng === null) {
            return res.status(400).json({
                success: false,
                message: 'lat and lng parameters are required'
            });
        }

        const result = await getRestaurantsAhead({
            lat,
            lng,
            heading,
            highwayId,
            rangeKm,
            speed,
            destLat,
            destLng,
            routePolyline
        });

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /food/admin/driving-mode/settings (Admin-only fetch settings)
 */
export const getDrivingModeSettingsController = async (req, res, next) => {
    try {
        const settings = await getDrivingSettings();
        return res.status(200).json({
            success: true,
            data: settings
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /food/admin/driving-mode/settings (Admin-only update settings)
 */
export const updateDrivingModeSettingsController = async (req, res, next) => {
    try {
        const adminId = req.user?._id;
        const updated = await updateDrivingSettings(req.body, adminId);
        return res.status(200).json({
            success: true,
            message: 'Driving mode settings updated successfully',
            data: updated
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /food/driving-mode/connecting-highways
 */
export const getConnectingHighwaysController = async (req, res, next) => {
    try {
        const startLat = toFinite(req.query.startLat);
        const startLng = toFinite(req.query.startLng);
        const endLat = toFinite(req.query.endLat);
        const endLng = toFinite(req.query.endLng);

        if (startLat === null || startLng === null || endLat === null || endLng === null) {
            return res.status(400).json({
                success: false,
                message: 'startLat, startLng, endLat, and endLng are required'
            });
        }

        const searchRadiusKm = toFinite(req.query.searchRadiusKm);

        const highways = await getConnectingHighways({
            startLat,
            startLng,
            endLat,
            endLng,
            searchRadiusKm: searchRadiusKm !== null ? searchRadiusKm : undefined
        });

        return res.status(200).json({
            success: true,
            data: highways
        });
    } catch (error) {
        next(error);
    }
};


/**
 * GET /food/driving-mode/google-route-highway
 */
export const getGoogleRouteHighwayController = async (req, res, next) => {
    try {
        const startLat = toFinite(req.query.startLat);
        const startLng = toFinite(req.query.startLng);
        const endLat = toFinite(req.query.endLat);
        const endLng = toFinite(req.query.endLng);
        const corridorRadiusKm = req.query.corridorRadiusKm !== undefined
            ? toFinite(req.query.corridorRadiusKm)
            : null;
        const includeAlternatives = req.query.includeAlternatives === 'true' || req.query.includeAlternatives === '1';
        const includeRestaurantCounts = !(req.query.includeRestaurantCounts === 'false' || req.query.includeRestaurantCounts === '0');

        if (startLat === null || startLng === null || endLat === null || endLng === null) {
            return res.status(400).json({
                success: false,
                message: 'startLat, startLng, endLat, and endLng are required'
            });
        }

        const route = await getGoogleRouteHighwayPreview({
            startLat,
            startLng,
            endLat,
            endLng,
            corridorRadiusKm: corridorRadiusKm !== null ? corridorRadiusKm : undefined,
            includeAlternatives,
            includeRestaurantCounts
        });

        return res.status(200).json({
            success: true,
            data: route
        });
    } catch (error) {
        next(error);
    }
};
