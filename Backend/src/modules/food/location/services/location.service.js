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
    const { history, htmlBody } = await expandUrlAndGetHistory(rawUrl);
    logger.info('[LocationService] Expanded URL history:', history);

    const sourcesToSearch = [
      ...history.map(u => decodeURIComponent(u)),
      ...history,
      htmlBody
    ];

    let lat = null;
    let lng = null;

    // Pattern 1: @lat,lng (e.g. @22.7196,75.8577 or @22.7196,75.8577,17z)
    for (const src of sourcesToSearch) {
      if (!src) continue;
      const match = src.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (match) {
        lat = parseFloat(match[1]);
        lng = parseFloat(match[2]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) break;
      }
    }

    // Pattern 2: ?q=lat,lng or query=lat,lng or ll=lat,lng or center=lat,lng or destination=lat,lng or daddr=lat,lng
    if (lat === null || lng === null) {
      for (const src of sourcesToSearch) {
        if (!src) continue;
        const match = src.match(/[?&](?:q|query|ll|center|destination|daddr|origin|near)=(-?\d+(?:\.\d+)?)(?:,|%2C|\s+)(-?\d+(?:\.\d+)?)/i);
        if (match) {
          lat = parseFloat(match[1]);
          lng = parseFloat(match[2]);
          if (Number.isFinite(lat) && Number.isFinite(lng)) break;
        }
      }
    }

    // Pattern 3: !3d<lat>!4d<lng> or !4d<lng>!3d<lat>
    if (lat === null || lng === null) {
      for (const src of sourcesToSearch) {
        if (!src) continue;
        const match3d4d = src.match(/!3d(-?\d+(?:\.\d+)?).*?!4d(-?\d+(?:\.\d+)?)/);
        if (match3d4d) {
          lat = parseFloat(match3d4d[1]);
          lng = parseFloat(match3d4d[2]);
          if (Number.isFinite(lat) && Number.isFinite(lng)) break;
        }
        const match4d3d = src.match(/!4d(-?\d+(?:\.\d+)?).*?!3d(-?\d+(?:\.\d+)?)/);
        if (match4d3d) {
          lat = parseFloat(match4d3d[2]);
          lng = parseFloat(match4d3d[1]);
          if (Number.isFinite(lat) && Number.isFinite(lng)) break;
        }
      }
    }

    // Pattern 4: /place/.../lat,lng or /search/lat,lng or /dir/.../lat,lng
    if (lat === null || lng === null) {
      for (const src of sourcesToSearch) {
        if (!src) continue;
        const matchPlace = src.match(/\/(?:place|search|dir)\/[^\/]*?\/?(-?\d+\.\d+),(?:%20|\+)?(-?\d+\.\d+)/i);
        if (matchPlace) {
          lat = parseFloat(matchPlace[1]);
          lng = parseFloat(matchPlace[2]);
          if (Number.isFinite(lat) && Number.isFinite(lng)) break;
        }
      }
    }

    // Pattern 5: staticmap center parameter inside HTML
    if (lat === null || lng === null) {
      for (const src of sourcesToSearch) {
        if (!src) continue;
        const matchStatic = src.match(/center=(-?\d+\.\d+)(?:%2C|,)(-?\d+\.\d+)/i);
        if (matchStatic) {
          lat = parseFloat(matchStatic[1]);
          lng = parseFloat(matchStatic[2]);
          if (Number.isFinite(lat) && Number.isFinite(lng)) break;
        }
      }
    }

    // Pattern 6: APP_INITIALIZATION_STATE in Google Maps HTML
    if (lat === null || lng === null) {
      if (htmlBody) {
        const matchAppInit = htmlBody.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
        if (matchAppInit) {
          lat = parseFloat(matchAppInit[1]);
          lng = parseFloat(matchAppInit[2]);
        }
      }
    }

    // Fallback Pattern 7: Geocode place name from URL if coordinates couldn't be extracted directly
    if (lat === null || lng === null) {
      for (const urlStr of history) {
        const placeMatch = urlStr.match(/\/(?:place|search)\/([^\/@?]+)/i);
        if (placeMatch && placeMatch[1]) {
          const placeQuery = decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim();
          if (placeQuery && placeQuery.length > 2) {
            logger.info('[LocationService] Attempting geocode for place query from URL:', placeQuery);
            const geocoded = await geocodePlaceQuery(placeQuery);
            if (geocoded) {
              lat = geocoded.lat;
              lng = geocoded.lng;
              break;
            }
          }
        }
      }
    }

    if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      logger.warn('[LocationService] Failed to extract coordinates from Google Maps link:', { rawUrl, history });
      return {
        success: false,
        error: "This Google Maps link could not be resolved. Please check the link or enter the address manually."
      };
    }

    logger.info('[LocationService] Successfully extracted coordinates:', { lat, lng });

    // Reverse Geocode to get normalized address details
    let formattedAddress = null;
    let city = null;
    let state = null;
    let country = 'India';
    let pincode = null;
    let area = null;
    let placeId = null;

    const apiKey = config.googleMapsApiKey;
    if (apiKey) {
      try {
        const googleGeoRes = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`,
          { timeout: 5000 }
        );
        if (googleGeoRes.data?.status === 'OK' && googleGeoRes.data?.results?.length > 0) {
          const first = googleGeoRes.data.results[0];
          formattedAddress = first.formatted_address;
          placeId = first.place_id || null;

          const comp = first.address_components || [];
          const getComp = (types) => comp.find(c => types.some(t => c.types.includes(t)))?.long_name || '';

          city = getComp(['locality', 'administrative_area_level_2']);
          state = getComp(['administrative_area_level_1']);
          country = getComp(['country']) || 'India';
          pincode = getComp(['postal_code']);
          area = getComp(['sublocality_level_1', 'sublocality', 'neighborhood']);
        }
      } catch (gErr) {
        logger.warn('[LocationService] Google Reverse Geocode error, trying Nominatim fallback:', gErr.message);
      }
    }

    // Fallback reverse geocoding if Google API returned no result or wasn't configured
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
      placeId: placeId || null
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

async function expandUrlAndGetHistory(initialUrl) {
  let currentUrl = initialUrl;
  const history = [currentUrl];
  let htmlBody = '';

  for (let i = 0; i < 10; i++) {
    // Strip mobile tracking parameters like g_st, g_ep, g_abs
    let urlToFetch = currentUrl;
    try {
      const parsed = new URL(currentUrl);
      let changed = false;
      ['g_st', 'g_ep', 'g_abs', 'utm_source', 'utm_medium', 'utm_campaign'].forEach(param => {
        if (parsed.searchParams.has(param)) {
          parsed.searchParams.delete(param);
          changed = true;
        }
      });
      if (changed) {
        urlToFetch = parsed.toString();
        history.push(urlToFetch);
      }
    } catch (e) {}

    try {
      const res = await axios.get(urlToFetch, {
        maxRedirects: 0,
        timeout: 8000,
        validateStatus: (status) => status >= 200 && status < 400,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (typeof res.data === 'string') {
        htmlBody += '\n' + res.data;
      }

      const redirectUrl = res.headers?.location;
      if (redirectUrl) {
        const nextUrl = new URL(redirectUrl, currentUrl).toString();
        history.push(nextUrl);
        currentUrl = nextUrl;
      } else {
        break;
      }
    } catch (err) {
      if (typeof err.response?.data === 'string') {
        htmlBody += '\n' + err.response.data;
      }
      const redirectUrl = err.response?.headers?.location;
      if (redirectUrl) {
        try {
          const nextUrl = new URL(redirectUrl, currentUrl).toString();
          history.push(nextUrl);
          currentUrl = nextUrl;
        } catch (e) {
          break;
        }
      } else {
        break;
      }
    }
  }

  return { history, htmlBody };
}

async function geocodePlaceQuery(query) {
  const apiKey = config.googleMapsApiKey;
  if (apiKey) {
    try {
      const res = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`,
        { timeout: 5000 }
      );
      if (res.data?.status === 'OK' && res.data?.results?.length > 0) {
        const loc = res.data.results[0].geometry.location;
        return { lat: loc.lat, lng: loc.lng };
      }
    } catch (e) {
      logger.warn('[LocationService] Google geocodePlaceQuery error:', e.message);
    }
  }

  try {
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      {
        headers: {
          'User-Agent': 'BhookingoApp/1.0 (contact@bhookingo.com)',
          Accept: 'application/json'
        },
        timeout: 5000
      }
    );
    if (res.data && res.data.length > 0) {
      return {
        lat: parseFloat(res.data[0].lat),
        lng: parseFloat(res.data[0].lon)
      };
    }
  } catch (e) {
    logger.warn('[LocationService] Nominatim geocodePlaceQuery error:', e.message);
  }

  return null;
}
