import { detectHighwayAtPoint } from '../../admin/services/highway.service.js';
import { FoodHighway } from '../../admin/models/highway.model.js';

const toFinite = (v) => {
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
};

/**
 * GET /food/landing/highways/detect?lat=..&lng=..
 * Detect the nearest highway to a given point (replaces /zones/detect).
 */
export const detectHighwayPublicController = async (req, res, next) => {
    try {
        const lat = toFinite(req.query.lat);
        const lng = toFinite(req.query.lng);
        if (lat === null || lng === null) {
            return res.status(400).json({ success: false, message: 'lat and lng are required' });
        }

        const result = await detectHighwayAtPoint(lat, lng);

        return res.status(200).json({
            success: true,
            message: result.status === 'IN_SERVICE' ? 'Highway detected' : 'Out of service area',
            data: {
                status: result.status,
                highwayId: result.highwayId,
                highwayName: result.highwayName,
                highwayRef: result.highwayRef,
                distanceMeters: result.distanceMeters,
                // Legacy zone alias (kept for backward compat)
                zoneId: result.highwayId,
                zone: null
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /food/landing/highways/public
 * List all active highways (for onboarding/selects, replaces /zones/public).
 * Returns only metadata (no full coordinate arrays for size efficiency).
 */
export const listHighwaysPublicController = async (req, res, next) => {
    try {
        const highways = await FoodHighway.find({ isActive: true })
            .select('name ref isActive totalDistance nodeCount segmentCount')
            .sort({ ref: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Highways fetched successfully',
            data: { highways }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /food/landing/highways/nearby
 * List active highways with coordinate arrays for Google Maps rendering.
 * Can be filtered by a bounding box: ?minLat=&maxLat=&minLng=&maxLng=
 */
export const listHighwaysNearbyPublicController = async (req, res, next) => {
    try {
        const filter = { isActive: true };

        const minLat = toFinite(req.query.minLat);
        const maxLat = toFinite(req.query.maxLat);
        const minLng = toFinite(req.query.minLng);
        const maxLng = toFinite(req.query.maxLng);

        if (minLat !== null && maxLat !== null && minLng !== null && maxLng !== null) {
            filter['boundingBox.minLat'] = { $lte: maxLat };
            filter['boundingBox.maxLat'] = { $gte: minLat };
            filter['boundingBox.minLng'] = { $lte: maxLng };
            filter['boundingBox.maxLng'] = { $gte: minLng };
        }

        const highways = await FoodHighway.find(filter)
            .select('name ref coordinates segments isActive')
            .sort({ ref: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            message: 'Nearby highways fetched',
            data: { highways }
        });
    } catch (error) {
        next(error);
    }
};
