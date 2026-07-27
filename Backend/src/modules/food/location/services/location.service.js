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
  logger.info('[LocationService] [STEP 1] Resolving Google Maps link:', { rawInput: link, extractedUrl: rawUrl });

  const cached = resolutionCache.get(rawUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    logger.info('[LocationService] Returning cached resolution for link:', rawUrl);
    return cached.data;
  }

  try {
    const history = await expandUrlHistory(rawUrl);
    logger.info('[LocationService] [STEP 2] Complete expanded URL history:', history);

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
      const placeIdMatch = src.match(/[?&](?:place_id|ftid|cid)=([^&]+)/i) || src.match(/!1s(ChIJ[a-zA-Z0-9_-]+)/i);
      if (placeIdMatch && placeIdMatch[1]) {
        placeIdFound = placeIdMatch[1];
        logger.info('[LocationService] [STRATEGY 1] Detected Place ID from URL:', placeIdFound);
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
          logger.info('[LocationService] [STRATEGY 1 SUCCESS] Coordinates resolved via Google Places API (Place ID):', { lat, lng });
        }
      } catch (pErr) {
        logger.warn('[LocationService] Google Places API lookup failed:', pErr.message);
      }
    }

    // Strategy 2: Check for Hex CID (0x...:0x...) in data=!1s0x... or URL query params
    if ((lat === null || lng === null) && apiKey) {
      for (const src of sourcesToSearch) {
        if (!src) continue;
        const hexCidMatch = src.match(/(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/i);
        if (hexCidMatch && hexCidMatch[1]) {
          const cidHex = hexCidMatch[1];
          logger.info('[LocationService] [STRATEGY 2] Detected Hex CID from URL:', cidHex);
          try {
            const cidRes = await axios.get(
              `https://maps.googleapis.com/maps/api/geocode/json?cid=${encodeURIComponent(cidHex)}&key=${apiKey}`,
              { timeout: 5000 }
            );
            if (cidRes.data?.status === 'OK' && cidRes.data?.results?.length > 0) {
              const first = cidRes.data.results[0];
              lat = first.geometry.location.lat;
              lng = first.geometry.location.lng;
              placeIdFound = placeIdFound || first.place_id || null;
              logger.info('[LocationService] [STRATEGY 2 SUCCESS] Coordinates resolved via Google Geocoding API (CID):', { lat, lng, cidHex });
              break;
            }
          } catch (cErr) {
            logger.warn('[LocationService] CID geocode failed:', cErr.message);
          }
        }
      }
    }

    // Strategy 3: Extract explicit @lat,lng coordinates from URL path
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
            logger.info('[LocationService] [STRATEGY 3 SUCCESS] Coordinates resolved via @lat,lng in URL:', { lat, lng });
            break;
          }
        }
      }
    }

    // Strategy 4: Extract !3d<lat>!4d<lng> or !4d<lng>!3d<lat> from Google Maps URL parameters
    if (lat === null || lng === null) {
      for (const src of sourcesToSearch) {
        if (!src) continue;
        const match3d4d = src.match(/!3d(-?\d+(?:\.\d+)?).*?!4d(-?\d+(?:\.\d+)?)/);
        if (match3d4d) {
          lat = parseFloat(match3d4d[1]);
          lng = parseFloat(match3d4d[2]);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            logger.info('[LocationService] [STRATEGY 4 SUCCESS] Coordinates resolved via !3d!4d in URL:', { lat, lng });
            break;
          }
        }
        const match4d3d = src.match(/!4d(-?\d+(?:\.\d+)?).*?!3d(-?\d+(?:\.\d+)?)/);
        if (match4d3d) {
          lat = parseFloat(match4d3d[2]);
          lng = parseFloat(match4d3d[1]);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            logger.info('[LocationService] [STRATEGY 4 SUCCESS] Coordinates resolved via !4d!3d in URL:', { lat, lng });
            break;
          }
        }
      }
    }

    // Strategy 5: Extract ?q=lat,lng or ?ll=lat,lng or ?query=lat,lng from URL
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
            logger.info('[LocationService] [STRATEGY 5 SUCCESS] Coordinates resolved via ?q=lat,lng in URL:', { lat, lng });
            break;
          }
        }
      }
    }

    // Strategy 6: Geocode place name from URL path using Google Geocoding API or Nominatim Search
    if (lat === null || lng === null) {
      for (const urlStr of sourcesToSearch) {
        if (!urlStr) continue;
        const placeMatch = urlStr.match(/\/(?:place|search)\/([^\/?#]+)/i);
        if (placeMatch && placeMatch[1]) {
          let rawName = placeMatch[1].split('@')[0].replace(/\+/g, ' ');
          try { rawName = decodeURIComponent(rawName); } catch {}
          rawName = rawName.trim();

          if (rawName && rawName.length > 2 && !rawName.match(/^[a-zA-Z0-9]{10,25}$/) && !rawName.match(/^-?\d+\.\d+/)) {
            console.log('==================================================');
            console.log('[STRATEGY 6 EXTRACTED PLACE QUERY]:', rawName);
            console.log('==================================================');

            // 6A. Try Google Geocoding API if key available
            if (apiKey) {
              try {
                const geoRes = await axios.get(
                  `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(rawName)}&key=${apiKey}`,
                  { timeout: 5000 }
                );
                console.log('[STRATEGY 6 GOOGLE GEOCODE RESPONSE]:', { status: geoRes.data?.status, resultsCount: geoRes.data?.results?.length, error_message: geoRes.data?.error_message });
                if (geoRes.data?.status === 'OK' && geoRes.data?.results?.length > 0) {
                  const first = geoRes.data.results[0];
                  lat = first.geometry.location.lat;
                  lng = first.geometry.location.lng;
                  placeIdFound = first.place_id || placeIdFound;
                  logger.info('[LocationService] [STRATEGY 6 SUCCESS] Coordinates resolved via Google Geocoding API:', { lat, lng, placeName: rawName });
                  break;
                }
              } catch (gErr) {
                logger.warn('[LocationService] Google Geocoding API lookup failed for place query:', gErr.message);
              }
            }

            // 6B. Fallback: Try Nominatim Search API
            if (lat === null || lng === null) {
              try {
                const nomRes = await axios.get(
                  `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(rawName)}&format=json&limit=1`,
                  {
                    headers: {
                      'User-Agent': 'BhookingoApp/1.0 (contact@bhookingo.com)',
                      Accept: 'application/json'
                    },
                    timeout: 5000
                  }
                );
                console.log('[STRATEGY 6 NOMINATIM RESPONSE]:', nomRes.data);
                if (Array.isArray(nomRes.data) && nomRes.data.length > 0) {
                  const firstNom = nomRes.data[0];
                  const parsedLat = parseFloat(firstNom.lat);
                  const parsedLng = parseFloat(firstNom.lon);
                  if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
                    lat = parsedLat;
                    lng = parsedLng;
                    logger.info('[LocationService] [STRATEGY 6 SUCCESS] Coordinates resolved via Nominatim Search:', { lat, lng, placeName: rawName });
                    break;
                  }
                }
              } catch (nomErr) {
                logger.warn('[LocationService] Nominatim Search API failed for place query:', nomErr.message);
              }
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

function extractRedirectFromHtml(html, baseUrl) {
  if (!html || typeof html !== 'string') return null;

  // 1. Meta refresh tag
  const metaRefresh = html.match(/<meta[^>]*http-equiv=["']?refresh["']?[^>]*content=["']?[^"'>]*url=([^"'>\s]+)/i);
  if (metaRefresh && metaRefresh[1]) {
    try {
      const target = metaRefresh[1].replace(/^['"]|['"]$/g, '');
      return new URL(target, baseUrl).toString();
    } catch (e) {}
  }

  // 2. OpenGraph / Twitter meta tag
  const ogUrl = html.match(/<meta[^>]*(?:property|name)=["'](?:og:url|twitter:url)["'][^>]*content=["']([^"']+)["']/i);
  if (ogUrl && ogUrl[1] && ogUrl[1].includes('google.')) {
    try {
      return new URL(ogUrl[1], baseUrl).toString();
    } catch (e) {}
  }

  // 3. Canonical link tag
  const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  if (canonical && canonical[1] && canonical[1].includes('google.')) {
    try {
      return new URL(canonical[1], baseUrl).toString();
    } catch (e) {}
  }

  // 4. JS location redirect
  const jsLoc = html.match(/(?:window\.)?location(?:\.href|\.replace)?\s*=\s*['"](https?:\/\/[^'"]+)['"]/i);
  if (jsLoc && jsLoc[1] && jsLoc[1].includes('google.')) {
    try {
      return new URL(jsLoc[1], baseUrl).toString();
    } catch (e) {}
  }

  // 5. Embedded Google Maps link tag
  const aHref = html.match(/href=["'](https?:\/\/(?:www\.)?google\.[a-z.]+\/maps\/[^\s"'<>]+)["']/i);
  if (aHref && aHref[1]) {
    try {
      return new URL(aHref[1], baseUrl).toString();
    } catch (e) {}
  }

  return null;
}

async function expandUrlHistory(initialUrl) {
  let currentUrl = initialUrl;
  const history = [currentUrl];
  const visited = new Set([initialUrl]);

  for (let i = 0; i < 10; i++) {
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
        if (!visited.has(urlToFetch)) {
          visited.add(urlToFetch);
          history.push(urlToFetch);
        }
      }
    } catch (e) {}

    try {
      // Step A: Request without desktop user-agent to force 301/302 Location header from shortlinks
      const res = await axios.get(urlToFetch, {
        maxRedirects: 0,
        timeout: 8000,
        validateStatus: (status) => status >= 200 && status < 400,
        headers: {
          'User-Agent': 'curl/7.88.1',
          'Accept': '*/*'
        }
      });

      let nextUrl = res.headers?.location;
      if (!nextUrl && typeof res.data === 'string') {
        nextUrl = extractRedirectFromHtml(res.data, urlToFetch);
      }

      logger.info(`[LocationService] [REDIRECT HOP ${i + 1}] Status: ${res.status}, Location: ${res.headers?.location || 'none'}, Extracted: ${nextUrl || 'none'}`);

      if (nextUrl) {
        const resolvedNextUrl = new URL(nextUrl, currentUrl).toString();
        if (!visited.has(resolvedNextUrl)) {
          visited.add(resolvedNextUrl);
          history.push(resolvedNextUrl);
          currentUrl = resolvedNextUrl;
        } else {
          break;
        }
      } else {
        break;
      }
    } catch (err) {
      let redirectUrl = err.response?.headers?.location;
      if (!redirectUrl && typeof err.response?.data === 'string') {
        redirectUrl = extractRedirectFromHtml(err.response.data, urlToFetch);
      }

      logger.info(`[LocationService] [REDIRECT HOP ${i + 1} ERROR] Status: ${err.response?.status || 'network_error'}, Location: ${redirectUrl || 'none'}`);

      if (redirectUrl) {
        try {
          const nextUrl = new URL(redirectUrl, currentUrl).toString();
          if (!visited.has(nextUrl)) {
            visited.add(nextUrl);
            history.push(nextUrl);
            currentUrl = nextUrl;
          } else {
            break;
          }
        } catch (e) {
          break;
        }
      } else {
        break;
      }
    }
  }

  return history;
}
