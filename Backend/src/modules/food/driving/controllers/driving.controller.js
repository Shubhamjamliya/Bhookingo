import { getDrivingSettings, updateDrivingSettings, getRestaurantsAhead, getGoogleRouteHighwayPreview } from '../services/driving.service.js';
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
                enabled: settings.enabled,
                highwayEntryRadiusMeters: settings.highwayEntryRadiusMeters,
                googleRouteSearchRadiusKm: settings.googleRouteSearchRadiusKm,
                googleRouteForwardRangeKm: settings.googleRouteForwardRangeKm,
                googleRouteBackwardBufferKm: settings.googleRouteBackwardBufferKm,
                showAllRouteRestaurants: settings.showAllRouteRestaurants === true
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET/POST /food/driving-mode/restaurants (User endpoint)
 */
export const getRestaurantsAheadController = async (req, res, next) => {
    try {
        const source = req.method === 'POST' ? (req.body || {}) : (req.query || {});
        const lat = toFinite(source.lat);
        const lng = toFinite(source.lng);
        const heading = source.heading !== undefined ? toFinite(source.heading) : null;
        const speed = source.speed !== undefined ? toFinite(source.speed) : null;
        const highwayId = source.highwayId || null;
        const destLat = source.destLat !== undefined ? toFinite(source.destLat) : null;
        const destLng = source.destLng !== undefined ? toFinite(source.destLng) : null;
        const routePolyline = typeof source.routePolyline === 'string' && source.routePolyline.trim()
            ? source.routePolyline.trim()
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
