import { getDrivingSettings, updateDrivingSettings, getRestaurantsAhead, getConnectingHighways } from '../services/driving.service.js';
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
                highwayEntryRadiusMeters: settings.highwayEntryRadiusMeters
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
            speed
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
