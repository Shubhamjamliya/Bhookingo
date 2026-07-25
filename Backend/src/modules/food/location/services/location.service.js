import axios from 'axios';
import { logger } from '../../../../utils/logger.js';

// Simple in-memory resolution cache (24h TTL)
const resolutionCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function resolveGoogleMapsLink(link) {
  if (!link || typeof link !== 'string') {
    return { success: false, error: 'Invalid Google Maps link' };
  }

  const trimmedLink = link.trim();
  const cached = resolutionCache.get(trimmedLink);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    let targetUrl = trimmedLink;

    // Follow redirect if short URL
    if (
      trimmedLink.includes('maps.app.goo.gl') ||
      trimmedLink.includes('goo.gl/maps') ||
      trimmedLink.includes('bit.ly') ||
      trimmedLink.includes('t.co')
    ) {
      try {
        const redirectRes = await axios.get(trimmedLink, {
          maxRedirects: 5,
          timeout: 8000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        targetUrl = redirectRes.request?.res?.responseUrl || redirectRes.config?.url || trimmedLink;
      } catch (redirectErr) {
        if (redirectErr.response?.headers?.location) {
          targetUrl = redirectErr.response.headers.location;
        } else if (redirectErr.config?.url) {
          targetUrl = redirectErr.config.url;
        }
      }
    }

    // Attempt regex extraction for coordinates
    let lat = null;
    let lng = null;

    // Pattern 1: @lat,lng
    const atMatch = targetUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      lat = parseFloat(atMatch[1]);
      lng = parseFloat(atMatch[2]);
    }

    // Pattern 2: ?q=lat,lng or &q=lat,lng
    if (lat === null || lng === null) {
      const qMatch = targetUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qMatch) {
        lat = parseFloat(qMatch[1]);
        lng = parseFloat(qMatch[2]);
      }
    }

    // Pattern 3: ll=lat,lng or center=lat,lng or destination=lat,lng
    if (lat === null || lng === null) {
      const paramMatch = targetUrl.match(/[?&](?:ll|center|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (paramMatch) {
        lat = parseFloat(paramMatch[1]);
        lng = parseFloat(paramMatch[2]);
      }
    }

    // Pattern 4: /place/.../lat,lng
    if (lat === null || lng === null) {
      const placeMatch = targetUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (placeMatch) {
        lat = parseFloat(placeMatch[1]);
        lng = parseFloat(placeMatch[2]);
      }
    }

    if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return {
        success: false,
        error: "We couldn't read coordinates from this link. Please check it and try again, or enter the address manually."
      };
    }

    // Best-effort reverse geocode for formattedAddress
    let formattedAddress = null;
    try {
      const geoRes = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'BhookingoApp/1.0 (contact@bhookingo.com)',
            Accept: 'application/json'
          },
          timeout: 4000
        }
      );
      if (geoRes.data) {
        formattedAddress = geoRes.data.display_name || null;
      }
    } catch (geoErr) {
      logger.warn('[LocationService] Reverse geocode best-effort failed, proceeding with coordinates:', geoErr.message);
      formattedAddress = null;
    }

    const result = {
      success: true,
      lat,
      lng,
      formattedAddress
    };

    resolutionCache.set(trimmedLink, { timestamp: Date.now(), data: result });
    return result;
  } catch (err) {
    logger.error('[LocationService] Error resolving maps link:', err);
    return {
      success: false,
      error: "We couldn't read this link. Please check it and try again, or enter the address manually."
    };
  }
}
