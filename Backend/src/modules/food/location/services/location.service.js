import axios from 'axios';
import { logger } from '../../../../utils/logger.js';
import { config } from '../../../../config/env.js';

// In-memory resolution cache (1h TTL)
const resolutionCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function resolveGoogleMapsLink(link) {
  if (!link || typeof link !== 'string') {
    return { success: false, error: 'Please provide a valid Google Maps link.' };
  }

  // Extract raw URL if user pasted mobile share text containing URL
  const urlMatch = link.match(/(https?:\/\/[^\s]+)/i);
  const rawUrl = urlMatch ? urlMatch[1] : link.trim();
  logger.info('[LocationService] Resolving Google Maps link:', { rawInput: link, extractedUrl: rawUrl });

  const cached = resolutionCache.get(rawUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    logger.info('[LocationService] Returning cached resolution for link:', rawUrl);
    return cached.data;
  }

  try {
    const history = await expandUrlHistory(rawUrl);
    logger.info('[LocationService] Expanded URL history:', history);

    const apiKey = config.googleMapsApiKey;
    let lat = null;
    let lng = null;
    let placeIdFound = null;

    const sourcesToSearch = [
      ...history.map(u => {
        try { return decodeURIComponent(u); } catch { return u; }
      }),
      ...history
    ];

    // Strategy 1: Check for explicit Place ID or CID parameters in URLs
    for (const src of sourcesToSearch) {
      if (!src) continue;
      const placeIdMatch = src.match(/[?&](?:place_id|ftid|cid)=([^&]+)/i);
      if (placeIdMatch && placeIdMatch[1]) {
        placeIdFound = placeIdMatch[1];
        logger.info('[LocationService] Detected Place ID from URL:', placeIdFound);
        break;
      }
    }

    if (placeIdFound && apiKey) {
      try {
        const placeRes = await axios.get(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeIdFound)}&key=${apiKey}`,
          { timeout: 5000 }
        );
        if (placeRes.data?.status === 'OK' && placeRes.data?.result?.geometry?.location) {
          lat = placeRes.data.result.geometry.location.lat;
          lng = placeRes.data.result.geometry.location.lng;
          logger.info('[LocationService] Coordinates resolved via Google Places API (Place ID):', { lat, lng });
        }
      } catch (pErr) {
        logger.warn('[LocationService] Google Places API lookup failed:', pErr.message);
      }
    }

    // Strategy 2: Extract explicit @lat,lng coordinates from URL path
    if (lat === null || lng === null) {
      for (const src of sourcesToSearch) {
        if (!src) continue;
        const match = src.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) {
          const parsedLat = parseFloat(match[1]);
          const parsedLng = parseFloat(match[2]);
          if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
            lat = parsedLat;
            lng = parsedLng;
            logger.info('[LocationService] Coordinates resolved via @lat,lng in URL:', { lat, lng });
            break;
          }
        }
      }
    }

    // Strategy 3: Extract !3d<lat>!4d<lng> or !4d<lng>!3d<lat> from Google Maps URL parameters
    if (lat === null || lng === null) {
      for (const src of sourcesToSearch) {
        if (!src) continue;
        const match3d4d = src.match(/!3d(-?\d+(?:\.\d+)?).*?!4d(-?\d+(?:\.\d+)?)/);
        if (match3d4d) {
          lat = parseFloat(match3d4d[1]);
          lng = parseFloat(match3d4d[2]);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            logger.info('[LocationService] Coordinates resolved via !3d!4d in URL:', { lat, lng });
            break;
          }
        }
        const match4d3d = src.match(/!4d(-?\d+(?:\.\d+)?).*?!3d(-?\d+(?:\.\d+)?)/);
        if (match4d3d) {
          lat = parseFloat(match4d3d[2]);
          lng = parseFloat(match4d3d[1]);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            logger.info('[LocationService] Coordinates resolved via !4d!3d in URL:', { lat, lng });
            break;
          }
        }
      }
    }

    // Strategy 4: Extract ?q=lat,lng or ?ll=lat,lng or ?query=lat,lng from URL
    if (lat === null || lng === null) {
      for (const src of sourcesToSearch) {
        if (!src) continue;
        const matchQuery = src.match(/[?&](?:q|query|ll|center|destination|daddr|origin|near)=(-?\d+(?:\.\d+)?)(?:,|%2C|\s+)(-?\d+(?:\.\d+)?)/i);
        if (matchQuery) {
          const parsedLat = parseFloat(matchQuery[1]);
          const parsedLng = parseFloat(matchQuery[2]);
          if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
            lat = parsedLat;
            lng = parsedLng;
            logger.info('[LocationService] Coordinates resolved via ?q=lat,lng in URL:', { lat, lng });
            break;
          }
        }
      }
    }

    // Strategy 5: Geocode place name from URL path using Google Geocoding API
    if ((lat === null || lng === null) && apiKey) {
      for (const urlStr of sourcesToSearch) {
        if (!urlStr) continue;
        const placeMatch = urlStr.match(/\/(?:place|search)\/([^\/?#]+)/i);
        if (placeMatch && placeMatch[1]) {
          let rawName = placeMatch[1].split('@')[0].replace(/\+/g, ' ');
          try { rawName = decodeURIComponent(rawName); } catch {}
          rawName = rawName.trim();

          if (rawName && rawName.length > 1 && !rawName.match(/^-?\d+\.\d+$/)) {
            logger.info('[LocationService] Resolving place query via Google Geocoding API:', rawName);
            try {
              const geoRes = await axios.get(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(rawName)}&key=${apiKey}`,
                { timeout: 5000 }
              );
              if (geoRes.data?.status === 'OK' && geoRes.data?.results?.length > 0) {
                const first = geoRes.data.results[0];
                lat = first.geometry.location.lat;
                lng = first.geometry.location.lng;
                placeIdFound = first.place_id || placeIdFound;
                logger.info('[LocationService] Coordinates resolved via Google Geocoding API (Place query):', { lat, lng, placeName: rawName });
                break;
              }
            } catch (gErr) {
              logger.warn('[LocationService] Google Geocoding API lookup failed for place query:', gErr.message);
            }
          }
        }
      }
    }

    if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      logger.warn('[LocationService] Could not resolve valid coordinates from link:', { rawUrl, history });
      return {
        success: false,
        error: "This Google Maps link could not be resolved. Please check the link or enter the address manually."
      };
    }

    // Official Reverse Geocoding via Google Geocoding API
    let formattedAddress = null;
    let city = null;
    let state = null;
    let country = 'India';
    let pincode = null;
    let area = null;

    if (apiKey) {
      try {
        const googleGeoRes = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`,
          { timeout: 5000 }
        );
        if (googleGeoRes.data?.status === 'OK' && googleGeoRes.data?.results?.length > 0) {
          const first = googleGeoRes.data.results[0];
          formattedAddress = first.formatted_address;
          placeIdFound = placeIdFound || first.place_id || null;

          const comp = first.address_components || [];
          const getComp = (types) => comp.find(c => types.some(t => c.types.includes(t)))?.long_name || '';

          city = getComp(['locality', 'administrative_area_level_2']);
          state = getComp(['administrative_area_level_1']);
          country = getComp(['country']) || 'India';
          pincode = getComp(['postal_code']);
          area = getComp(['sublocality_level_1', 'sublocality', 'neighborhood']);
        }
      } catch (gErr) {
        logger.warn('[LocationService] Google Reverse Geocode error:', gErr.message);
      }
    }

    // Fallback Nominatim Reverse Geocoding if Google API fails or is unconfigured
    if (!formattedAddress) {
      try {
        const geoRes = await axios.get(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'BhookingoApp/1.0 (contact@bhookingo.com)',
              Accept: 'application/json'
            },
            timeout: 5000
          }
        );
        if (geoRes.data) {
          formattedAddress = geoRes.data.display_name || null;
          const a = geoRes.data.address || {};
          city = a.city || a.town || a.village || a.county || a.state_district || null;
          state = a.state || null;
          country = a.country || 'India';
          pincode = a.postcode || null;
          area = a.suburb || a.neighbourhood || a.sublocality || null;
        }
      } catch (geoErr) {
        logger.warn('[LocationService] Nominatim reverse geocode failed:', geoErr.message);
      }
    }

    const result = {
      success: true,
      lat,
      lng,
      latitude: lat,
      longitude: lng,
      formattedAddress: formattedAddress || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      city: city || 'Selected Location',
      state: state || '',
      country: country || 'India',
      pincode: pincode || '',
      area: area || '',
      placeId: placeIdFound || null
    };

    logger.info('[LocationService] Final resolved location:', result);
    resolutionCache.set(rawUrl, { timestamp: Date.now(), data: result });
    return result;
  } catch (err) {
    logger.error('[LocationService] Error resolving maps link:', err);
    return {
      success: false,
      error: "This Google Maps link could not be resolved. Please check the link or enter the address manually."
    };
  }
}

async function expandUrlHistory(initialUrl) {
  const history = [initialUrl];
  const visited = new Set([initialUrl]);

  let currentUrl = initialUrl;
  try {
    const parsed = new URL(initialUrl);
    ['g_st', 'g_ep', 'g_abs', 'utm_source', 'utm_medium', 'utm_campaign'].forEach(param => {
      parsed.searchParams.delete(param);
    });
    currentUrl = parsed.toString();
    if (!visited.has(currentUrl)) {
      visited.add(currentUrl);
      history.push(currentUrl);
    }
  } catch (e) {}

  try {
    const res = await axios.get(currentUrl, {
      maxRedirects: 10,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    const finalUrl = res.request?.res?.responseUrl || res.config?.url;
    if (finalUrl && !visited.has(finalUrl)) {
      visited.add(finalUrl);
      history.push(finalUrl);
    }

    if (typeof res.data === 'string') {
      const matches = res.data.matchAll(/(https?:\/\/(?:www\.)?google\.[a-z.]+\/maps\/[^\s"'<>]+)/gi);
      for (const m of matches) {
        if (m[1] && !visited.has(m[1])) {
          visited.add(m[1]);
          history.push(m[1]);
        }
      }
    }
  } catch (err) {
    const finalUrl = err.response?.request?.res?.responseUrl || err.config?.url;
    if (finalUrl && !visited.has(finalUrl)) {
      visited.add(finalUrl);
      history.push(finalUrl);
    }
    const redirectUrl = err.response?.headers?.location;
    if (redirectUrl && !visited.has(redirectUrl)) {
      visited.add(redirectUrl);
      history.push(redirectUrl);
    }
  }

  return history;
}
