import { config } from '../../../../config/env.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Decodes Google Maps encoded polyline into lat/lng points.
 */
export function decodePolyline(encoded) {
    const points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return points;
}

/**
 * Fetches an encoded polyline from Google Directions API.
 * This should be called ONLY ONCE per order assignment to save costs.
 * @param {Object} origin - { lat, lng }
 * @param {Object} destination - { lat, lng }
 * @returns {Promise<string>} - Encoded polyline points
 */
export async function fetchPolyline(origin, destination) {
    const apiKey = config.googleMapsApiKey;
    if (!apiKey) {
        logger.warn('Google Maps API key missing. Polyline fetch skipped.');
        return '';
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const originStr = `${origin.lat},${origin.lng}`;
        const destStr = `${destination.lat},${destination.lng}`;
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&key=${apiKey}`;

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        const data = await res.json();

        if (data.status === 'OK' && data.routes?.length > 0) {
            return data.routes[0].overview_polyline?.points || '';
        } else {
            logger.warn(`Google Directions API returned status: ${data.status}. Message: ${data.error_message || 'No routes found'}`);
        }
    } catch (err) {
        logger.error(`Error fetching polyline from Google: ${err.message}`);
    }

    return '';
}

/**
 * Fetches full directions including path, distance and duration.
 */
export async function fetchDirections(origin, destination) {
    const apiKey = config.googleMapsApiKey;
    if (!apiKey) {
        logger.warn('Google Maps API key missing. Directions fetch skipped.');
        return null;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const originStr = `${origin.lat},${origin.lng}`;
        const destStr = `${destination.lat},${destination.lng}`;
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&key=${apiKey}`;

        const headers = {
            'Referer': config.baseUrl || 'https://bhookingo.in/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Bhookingo/1.0'
        };

        const res = await fetch(url, { signal: controller.signal, headers });
        clearTimeout(timeout);
        const data = await res.json();

        if (data.status === 'OK' && data.routes?.length > 0) {
            const route = data.routes[0];
            const polyline = route.overview_polyline?.points || '';
            const leg = route.legs?.[0];
            const distanceText = leg?.distance?.text || '';
            const durationText = leg?.duration?.text || '';
            const decodedCoordinates = polyline ? decodePolyline(polyline) : [];
            return {
                polyline,
                decodedCoordinates,
                distanceText,
                durationText,
                bounds: route.bounds || null
            };
        } else {
            logger.warn(`Google Directions API returned status: ${data.status}. Message: ${data.error_message || 'No routes found'}`);
        }
    } catch (err) {
        logger.error(`Error fetching directions from Google: ${err.message}`);
    }

    // Fallback: Generate an interpolated polyline between origin and destination
    // so Driving Mode discovery never fails even if Google API is referer-restricted
    const steps = 50;
    const fallbackDecoded = [];
    for (let i = 0; i <= steps; i++) {
        const ratio = i / steps;
        fallbackDecoded.push({
            lat: Number((origin.lat + (destination.lat - origin.lat) * ratio).toFixed(6)),
            lng: Number((origin.lng + (destination.lng - origin.lng) * ratio).toFixed(6))
        });
    }

    return {
        polyline: '',
        decodedCoordinates: fallbackDecoded,
        distanceText: 'Estimated Route',
        durationText: 'Direct Travel',
        bounds: null
    };
}
