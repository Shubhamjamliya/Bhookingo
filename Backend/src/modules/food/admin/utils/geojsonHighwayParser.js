/**
 * Parse MoRTH / GatiShakti National Highway GeoJSON into grouped highway records.
 * Supports FeatureCollection with LineString features (e.g. INDIA_NATIONAL_HIGHWAY.geojson).
 */
import * as turf from '@turf/turf';

/**
 * Normalize highway name/ref to "NH-44" format.
 * @param {string} raw
 * @returns {string|null}
 */
export const normalizeNHRef = (raw) => {
    if (!raw) return null;
    const match = String(raw).match(/NH[\s-]?(\d+[A-Z]?)/i);
    if (!match) return null;
    return `NH-${match[1].toUpperCase()}`;
};

/**
 * Convert GeoJSON [lng, lat] positions to { lat, lng }.
 * @param {number[][]} positions
 * @returns {{ lat: number, lng: number }[]}
 */
export const positionsToCoords = (positions) => {
    if (!Array.isArray(positions)) return [];
    return positions
        .map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng) }))
        .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));
};

/**
 * Compute axis-aligned bounding box across all segments.
 * @param {{ lat: number, lng: number }[][]} segments
 */
export const computeBoundingBoxFromSegments = (segments) => {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const coords of segments) {
        for (const c of coords) {
            if (c.lat < minLat) minLat = c.lat;
            if (c.lat > maxLat) maxLat = c.lat;
            if (c.lng < minLng) minLng = c.lng;
            if (c.lng > maxLng) maxLng = c.lng;
        }
    }

    if (!Number.isFinite(minLat)) return null;
    return { minLat, maxLat, minLng, maxLng };
};

/**
 * Sum geodesic length of all segments in meters.
 * @param {{ lat: number, lng: number }[][]} segments
 */
export const computeTotalDistanceMeters = (segments) => {
    let total = 0;
    for (const coords of segments) {
        if (!coords || coords.length < 2) continue;
        const line = turf.lineString(coords.map((c) => [c.lng, c.lat]));
        total += turf.length(line, { units: 'meters' });
    }
    return Math.round(total);
};

/**
 * Pick the longest segment for legacy single-polyline display.
 * @param {{ lat: number, lng: number }[][]} segments
 */
export const pickLongestSegment = (segments) => {
    if (!segments?.length) return [];
    return segments.reduce((best, seg) => (seg.length > best.length ? seg : best), segments[0]);
};

const endpointDistanceMeters = (a, b) =>
    turf.distance(turf.point([a.lng, a.lat]), turf.point([b.lng, b.lat]), { units: 'meters' });

/**
 * Merge LineString fragments whose endpoints are within tolerance.
 * MoRTH GeoJSON stores each highway as hundreds of small segments — without
 * merging, the map shows many broken polylines even for one continuous road.
 *
 * @param {{ lat: number, lng: number }[][]} segments
 * @param {number} toleranceMeters - max gap between endpoints to treat as connected
 * @returns {{ lat: number, lng: number }[][]}
 */
export const mergeConnectedSegments = (segments, toleranceMeters = 100) => {
    const pool = (segments || [])
        .filter((seg) => Array.isArray(seg) && seg.length >= 2)
        .map((seg) => seg.map((c) => ({ lat: c.lat, lng: c.lng })));

    if (pool.length <= 1) return pool;

    const merged = [];

    while (pool.length > 0) {
        let chain = pool.shift();
        let extended = true;

        while (extended) {
            extended = false;
            for (let i = pool.length - 1; i >= 0; i--) {
                const seg = pool[i];
                const chainStart = chain[0];
                const chainEnd = chain[chain.length - 1];
                const segStart = seg[0];
                const segEnd = seg[seg.length - 1];

                const tryAttach = (appendCoords) => {
                    chain = appendCoords;
                    pool.splice(i, 1);
                    extended = true;
                };

                if (endpointDistanceMeters(chainEnd, segStart) <= toleranceMeters) {
                    tryAttach([...chain, ...seg.slice(1)]);
                } else if (endpointDistanceMeters(chainStart, segEnd) <= toleranceMeters) {
                    tryAttach([...seg.slice(0, -1), ...chain]);
                } else if (endpointDistanceMeters(chainEnd, segEnd) <= toleranceMeters) {
                    const reversed = [...seg].reverse();
                    tryAttach([...chain, ...reversed.slice(1)]);
                } else if (endpointDistanceMeters(chainStart, segStart) <= toleranceMeters) {
                    const reversed = [...seg].reverse();
                    tryAttach([...reversed.slice(0, -1), ...chain]);
                }
            }
        }

        merged.push(chain);
    }

    return merged.sort((a, b) => b.length - a.length);
};

/**
 * Extract NH ref from feature properties (MoRTH / datta07 schema).
 * @param {object} properties
 */
const extractRefFromProperties = (properties = {}) => {
    const candidates = [
        properties.Name,
        properties.name,
        properties.NH,
        properties.nh,
        properties.REF,
        properties.ref,
        properties.Highway,
        properties.highway
    ];
    for (const c of candidates) {
        const ref = normalizeNHRef(c);
        if (ref) return ref;
    }
    return null;
};

/**
 * Parse a GeoJSON object into grouped highways keyed by ref.
 * @param {object} geojson
 * @returns {Map<string, { ref: string, name: string, segments: { lat: number, lng: number }[][] }>}
 */
export const parseHighwayGeoJSON = (geojson) => {
    const features = geojson?.type === 'FeatureCollection'
        ? geojson.features
        : geojson?.type === 'Feature'
            ? [geojson]
            : [];

    const highwayMap = new Map();

    for (const feature of features) {
        const geom = feature?.geometry;
        if (!geom || geom.type !== 'LineString') continue;

        const ref = extractRefFromProperties(feature.properties);
        if (!ref) continue;

        const coords = positionsToCoords(geom.coordinates);
        if (coords.length < 2) continue;

        if (!highwayMap.has(ref)) {
            const nhNumber = ref.replace(/^NH-/, '');
            highwayMap.set(ref, {
                ref,
                name: `National Highway ${nhNumber}`,
                segments: []
            });
        }
        highwayMap.get(ref).segments.push(coords);
    }

    // Stitch digitized fragments into continuous chains where endpoints meet
    for (const entry of highwayMap.values()) {
        entry.rawSegmentCount = entry.segments.length;
        entry.segments = mergeConnectedSegments(entry.segments);
    }

    return highwayMap;
};

/**
 * Count total coordinate nodes across segments.
 * @param {{ lat: number, lng: number }[][]} segments
 */
export const countNodes = (segments) =>
    (segments || []).reduce((sum, seg) => sum + (seg?.length || 0), 0);
