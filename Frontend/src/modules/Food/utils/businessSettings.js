/**
 * Business Settings Utility
 * Handles loading and updating business settings (favicon, title, logo)
 */

import apiClient from "@food/api/axios";
import { API_ENDPOINTS } from "@food/api/config";
import { publicGetOnce } from "@food/api";

const SETTINGS_KEY = 'bhookingo_business_settings';

const getCurrentBrandSurface = () => {
  if (typeof window === "undefined") return "default";

  const pathname = String(window.location?.pathname || "").toLowerCase();

  if (pathname.startsWith("/food/restaurant") || pathname.startsWith("/restaurant")) {
    return "restaurant";
  }

  if (pathname.startsWith("/food/delivery") || pathname.startsWith("/delivery")) {
    return "delivery";
  }

  if (
    pathname.startsWith("/food/user") ||
    pathname.startsWith("/user") ||
    pathname.startsWith("/food/user/auth")
  ) {
    return "user";
  }

  return "default";
};

const getLogoForCurrentSurface = (settings) => {
  if (!settings) return null;

  const surface = getCurrentBrandSurface();

  if (surface === "restaurant") {
    return settings.restaurantLogo?.url || settings.logo?.url || settings.favicon?.url || null;
  }

  if (surface === "delivery") {
    return settings.deliveryLogo?.url || settings.logo?.url || settings.favicon?.url || null;
  }

  if (surface === "user") {
    return settings.userLogo?.url || settings.logo?.url || settings.favicon?.url || null;
  }

  return settings.logo?.url || settings.favicon?.url || null;
};

// Initialize from localStorage immediately so it's available for components on mount
let cachedSettings = (() => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
})();

// Apply cached settings immediately on module load if they exist
if (cachedSettings) {
  setTimeout(() => {
    updateFavicon(getLogoForCurrentSurface(cachedSettings));
    updateTitle(cachedSettings.companyName);
  }, 0);
}

let inFlightSettingsPromise = null;

/**
 * Load business settings from backend (public endpoint - no auth required)
 */
export const loadBusinessSettings = async () => {
  try {
    // If we have no cached settings, we MUST fetch
    // If we have cached settings, we still try to fetch in background to ensure they are fresh
    const endpoint = API_ENDPOINTS.ADMIN.BUSINESS_SETTINGS_PUBLIC;
    if (!endpoint || (typeof endpoint === "string" && !endpoint.trim())) {
      return cachedSettings;
    }

    if (inFlightSettingsPromise) {
      return await inFlightSettingsPromise;
    }

    inFlightSettingsPromise = (async () => {
      // Use public endpoint that doesn't require authentication
      // Use noCache to ensure we get fresh data from server this time
      const response = await publicGetOnce(endpoint, { noCache: true });
      const settings = response?.data?.data || response?.data;

      if (settings) {
        cachedSettings = settings;
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {}
        
        updateFavicon(getLogoForCurrentSurface(settings));
        updateTitle(settings.companyName);
        return settings;
      }
      return cachedSettings;
    })();

    return await inFlightSettingsPromise;
  } catch (error) {
    // Return cached if failed
    return cachedSettings;
  } finally {
    inFlightSettingsPromise = null;
  }
};

/**
 * Update favicon in document
 */
export const updateFavicon = (url) => {
  if (!url || typeof document === 'undefined') return;

  // Remove existing favicons
  const existingFavicons = document.querySelectorAll("link[rel*='icon']");
  existingFavicons.forEach(el => el.remove());

  // Add new favicon
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/png";
  link.href = url;
  // Prevent third-party cookie warning (Cloudinary)
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
};

/**
 * Update page title
 */
export const updateTitle = (companyName) => {
  if (typeof document !== 'undefined') {
    document.title = (companyName && companyName !== "Foodelo") ? companyName : "Bhookingo";
  }
};

/**
 * Set cached settings manually (useful after update)
 */
export const setCachedSettings = (settings) => {
  if (settings) {
    cachedSettings = settings;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {}
    
    updateFavicon(getLogoForCurrentSurface(settings));
    updateTitle(settings.companyName);
  }
};

/**
 * Clear cached settings (call after updating settings)
 */
export const clearCache = () => {
  cachedSettings = null;
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch (e) {}
};

/**
 * Get cached settings
 */
export const getCachedSettings = () => {
  return cachedSettings;
};

/**
 * Get company name from business settings with fallback
 * @returns {string} Company name or default "Bhookingo"
 */
export const getCompanyName = () => {
  const settings = getCachedSettings();
  const name = settings?.companyName || "Bhookingo";
  return name === "Foodelo" ? "Bhookingo" : name;
};

/**
 * Get company name asynchronously (loads if not cached)
 * @returns {Promise<string>} Company name or default "Bhookingo"
 */
export const getCompanyNameAsync = async () => {
  try {
    const settings = await loadBusinessSettings();
    return settings?.companyName || "Bhookingo";
  } catch (error) {
    return "Bhookingo";
  }
};
