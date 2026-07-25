import { API_BASE_URL } from "@food/api/config";

// Derive the fallback backend origin from API_BASE_URL
const defaultBackendOrigin = (API_BASE_URL || "").replace(/\/api\/v1\/?$/i, "").replace(/\/api\/?$/i, "");

/**
 * Common utility functions for the Food module
 */

/**
 * Normalizes an image URL to handle relative paths and backend origins
 */
export const normalizeImageUrl = (imageUrl, backendOrigin = "") => {
  if (typeof imageUrl !== "string") return "";
  const trimmed = imageUrl.trim();
  if (
    !trimmed ||
    /^data:/i.test(trimmed) ||
    /^blob:/i.test(trimmed) ||
    /^\/(src|assets|@fs|@id|node_modules)\//i.test(trimmed)
  ) {
    return trimmed;
  }

  const appProtocol = typeof window !== "undefined" ? window.location?.protocol : "";
  const appHost = typeof window !== "undefined" ? window.location?.hostname : "";

  let normalized = trimmed
    .replace(/\\/g, "/")
    .replace(/^(https?):\/(?!\/)/i, "$1://")
    .replace(/^(https?:\/\/)(https?:\/\/)/i, "$1");

  if (/^\/\//.test(normalized)) normalized = `${appProtocol || "https:"}${normalized}`;

  if (/^(https?:)?\/\//i.test(normalized)) {
    try {
      const parsed = new URL(normalized, window.location.origin);
      if (appHost && !/^(localhost|127\.0\.0\.1)$/i.test(appHost) && /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname)) {
        const originToUse = backendOrigin || defaultBackendOrigin || window.location.origin;
        const backendUrl = new URL(originToUse);
        parsed.protocol = backendUrl.protocol;
        parsed.hostname = backendUrl.hostname;
        parsed.port = backendUrl.port;
      }
      if (appProtocol === "https:" && parsed.protocol === "http:") parsed.protocol = "https:";
      const finalUrl = parsed.toString();
      const hasSigned = /[?&](X-Amz-|Signature=|Expires=|AWSAccessKeyId=|GoogleAccessId=|token=|sig=|se=|sp=|sv=)/i.test(finalUrl);
      return hasSigned ? finalUrl : encodeURI(finalUrl);
    } catch {
      return normalized;
    }
  }

  const originToUse = backendOrigin || defaultBackendOrigin;
  const absolutePath = normalized.startsWith("/")
    ? `${originToUse}${normalized}`
    : `${originToUse}/${normalized.replace(/^\.?\/*/, "")}`;
  return absolutePath;
};

/**
 * Extracts a list of image URLs from a source (string, array of strings, or object with image properties)
 */
export const extractImages = (source, backendOrigin = "") => {
  if (!source) return [];
  const normalize = (val) => {
    if (!val) return "";
    if (typeof val === "string") return normalizeImageUrl(val, backendOrigin);
    if (typeof val === "object") {
      const src = val.url || val.secure_url || val.imageUrl || val.image || val.src || "";
      return typeof src === "string" ? normalizeImageUrl(src, backendOrigin) : "";
    }
    return "";
  };

  const candidates = Array.isArray(source) ? source.map(normalize) : [normalize(source)];
  return candidates.filter(Boolean);
};

/**
 * Calculates distance between two coordinates in kilometers using Haversine formula
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Formats distance for display
 */
export const formatDistance = (distanceInKm) => {
  if (distanceInKm === null || distanceInKm === undefined) return "1.2 km";
  if (distanceInKm >= 1) {
    return `${distanceInKm.toFixed(1)} km`;
  } else {
    return `${Math.round(distanceInKm * 1000)} m`;
  }
};

/**
 * Slugifies a string for use in URLs or as identifiers
 */
export const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const BOOKING_RADIUS_KM = 50;

/**
 * Robust helper to extract/parse restaurant distance in KM.
 * Standardizes distance handling across backend-provided numeric fields, formatted strings ("841 m", "1.2 km"), and coordinates.
 */
export const getRestaurantDistanceKm = (restaurant, userLocation) => {
  if (!restaurant) return null;

  const locationObj = restaurant.locationObject || restaurant.location || restaurant;
  const restaurantLat = Number(
    locationObj?.latitude ??
    (Array.isArray(locationObj?.coordinates) ? locationObj.coordinates[1] : null)
  );
  const restaurantLng = Number(
    locationObj?.longitude ??
    (Array.isArray(locationObj?.coordinates) ? locationObj.coordinates[0] : null)
  );
  const userLat = Number(userLocation?.latitude);
  const userLng = Number(userLocation?.longitude);

  const hasCoords =
    Number.isFinite(userLat) &&
    Number.isFinite(userLng) &&
    Number.isFinite(restaurantLat) &&
    Number.isFinite(restaurantLng);

  if (hasCoords && (userLocation?.isReceiverLocation || userLocation?.forceCalculate)) {
    return calculateDistance(userLat, userLng, restaurantLat, restaurantLng);
  }

  // 1. Check explicit numerical distance fields in KM returned by backend
  const explicitKm = restaurant.distanceInKm ?? restaurant.distanceKm;
  if (typeof explicitKm === "number" && Number.isFinite(explicitKm)) {
    return explicitKm;
  }

  // 2. Parse formatted string distance from backend (e.g. "841 m", "1.2 km")
  const rawDist = restaurant.distance;
  if (typeof rawDist === "number" && Number.isFinite(rawDist)) {
    return rawDist;
  }
  if (typeof rawDist === "string" && rawDist.trim()) {
    const trimmed = rawDist.trim().toLowerCase();
    if (trimmed.endsWith("m") && !trimmed.endsWith("km")) {
      const meters = parseFloat(trimmed);
      return Number.isFinite(meters) ? meters / 1000 : null;
    } else if (trimmed.endsWith("km")) {
      const km = parseFloat(trimmed);
      return Number.isFinite(km) ? km : null;
    }
    const val = parseFloat(trimmed);
    return Number.isFinite(val) ? val : null;
  }

  // 3. Fallback: calculate using Haversine formula if coordinates exist
  if (hasCoords) {
    return calculateDistance(userLat, userLng, restaurantLat, restaurantLng);
  }

  return null;
};

/**
 * Checks if a restaurant is within the booking radius
 * @param {object} restaurant The restaurant object
 * @param {object} userLocation The user's coordinates (latitude, longitude)
 * @returns {object} { bookable: boolean, distanceKm: number | null, message: string }
 */
export const checkRestaurantBookingEligibility = (restaurant, userLocation) => {
  if (!restaurant) {
    return { bookable: false, distanceKm: null, message: "Restaurant details not available." };
  }

  const distanceKm = getRestaurantDistanceKm(restaurant, userLocation);

  if (distanceKm !== null && distanceKm > BOOKING_RADIUS_KM) {
    return {
      bookable: false,
      distanceKm,
      message: `You are currently ${distanceKm.toFixed(1)} KM away from this restaurant. Ordering is available within ${BOOKING_RADIUS_KM} KM. You can continue exploring restaurants and menus, but you'll need to be closer before placing an order.`
    };
  }

  return { bookable: true, distanceKm, message: "" };
};

