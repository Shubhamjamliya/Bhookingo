import { FoodHighway } from '../../admin/models/highway.model.js';
import { detectHighwayUsingGoogleMaps } from '../../location/services/location.service.js';

const toFinite = (v) => {
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
};

export const detectHighwayPublicController = async (req, res, next) => {
    try {
        const lat = toFinite(req.query.lat);
        const lng = toFinite(req.query.lng);
        if (lat === null || lng === null) {
            return res.status(400).json({ success: false, message: 'lat and lng are required' });
        }

        const result = await detectHighwayUsingGoogleMaps(lat, lng);
        console.log(`[Restaurant Onboarding] detectHighway API requested for lat: ${lat}, lng: ${lng}`);
        console.log(`[Restaurant Onboarding] Result: Nearest highway ${result.highwayRef}, Distance: ${result.distanceMeters}m, Threshold: ${result.thresholdMeters}m, Status: ${result.status}`);

        return res.status(200).json({
            success: true,
            message: result.status === 'IN_SERVICE' ? 'Highway detected' : 'Out of service area',
            data: {
                status: result.status,
                thresholdMeters: result.thresholdMeters,
                highwayId: result.highwayId,
                highwayName: result.highwayName,
                highwayRef: result.highwayRef,
                distanceMeters: result.distanceMeters,
                zoneId: result.highwayId,
                zone: null
            }
        });
    } catch (error) {
        next(error);
    }
};

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

export const listHighwaysNearbyPublicController = async (req, res, next) => {
    try {
        const minLat = toFinite(req.query.minLat);
        const maxLat = toFinite(req.query.maxLat);
        const minLng = toFinite(req.query.minLng);
        const maxLng = toFinite(req.query.maxLng);
        const highways = [];
        const points = [];
        if (minLat !== null && maxLat !== null && minLng !== null && maxLng !== null) {
            points.push(
                { lat: minLat, lng: minLng },
                { lat: minLat, lng: maxLng },
                { lat: maxLat, lng: minLng },
                { lat: maxLat, lng: maxLng },
                { lat: Number(((minLat + maxLat) / 2).toFixed(6)), lng: Number(((minLng + maxLng) / 2).toFixed(6)) }
            );
        }

        const seenRefs = new Set();
        for (const point of points) {
            const detected = await detectHighwayUsingGoogleMaps(point.lat, point.lng);
            if (detected?.status === 'IN_SERVICE' && detected.highwayRef && !seenRefs.has(detected.highwayRef)) {
                seenRefs.add(detected.highwayRef);
                highways.push({
                    _id: detected.highwayRef,
                    name: detected.highwayName || detected.highwayRef,
                    ref: detected.highwayRef,
                    isActive: true,
                    source: 'google_maps'
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Nearby highways fetched',
            data: { highways }
        });
    } catch (error) {
        next(error);
    }
};
