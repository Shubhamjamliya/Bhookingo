import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  MapPin, 
  Navigation, 
  Loader2, 
  ArrowRight, 
  Route, 
  Home, 
  Compass, 
  Edit2, 
  RotateCcw, 
  Bell, 
  Target,
  ArrowUpDown
} from "lucide-react";
import { Button } from "@food/components/ui/button";
import { toast } from "sonner";
import { userAPI } from "@food/api";
import { BHOOKINGO_LOGO as bhookingoLogo } from "@/constants/branding";
import { getCachedSettings, loadBusinessSettings } from "@food/utils/businessSettings";
import BhookingoWordmark from "@/shared/components/BhookingoWordmark";

const GEOCODE_SEARCH_CACHE_KEY = "bh_geocode_search_cache";
const REVERSE_GEOCODE_CACHE_KEY = "bh_reverse_geocode_cache";
const DRIVING_ROUTE_OPTIONS_CACHE_KEY = "bh_driving_route_options_cache";

const readSessionJson = (key, fallback = {}) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const writeSessionJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const normalizeLocationQuery = (value = "") => String(value).trim().replace(/\s+/g, " ").toLowerCase();

const buildLatLngKey = (lat, lng) => `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;

export default function JourneyPlanner({ 
  currentLocation, 
  onJourneyPlanSelected, 
  onGoHome 
}) {
  const [logoUrl, setLogoUrl] = useState(() => {
    const cached = getCachedSettings();
    return cached?.userLogo?.url || cached?.logo?.url || bhookingoLogo;
  });
  const [companyName, setCompanyName] = useState(() => {
    const cached = getCachedSettings();
    return cached?.companyName || "Bhookingo";
  });

  useEffect(() => {
    const applySettings = (settings) => {
      if (!settings) return;
      setLogoUrl(settings.userLogo?.url || settings.logo?.url || bhookingoLogo);
      if (settings.companyName) {
        setCompanyName(settings.companyName);
      }
    };

    const cached = getCachedSettings();
    if (cached) {
      applySettings(cached);
    }

    loadBusinessSettings().then(applySettings).catch(() => {});

    const handleSettingsUpdate = () => {
      applySettings(getCachedSettings());
    };

    window.addEventListener("businessSettingsUpdated", handleSettingsUpdate);
    return () => window.removeEventListener("businessSettingsUpdated", handleSettingsUpdate);
  }, []);

  // Session storage loads
  const [originInput, setOriginInput] = useState(() => {
    return localStorage.getItem("bh_origin_input") || "";
  });
  const [originCoords, setOriginCoords] = useState(() => {
    try {
      const stored = localStorage.getItem("bh_origin_coords");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [destinationInput, setDestinationInput] = useState(() => {
    return localStorage.getItem("bh_destination_input") || "";
  });
  const [destinationCoords, setDestinationCoords] = useState(() => {
    try {
      const stored = localStorage.getItem("bh_destination_coords");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [selectedHighway, setSelectedHighway] = useState(() => {
    try {
      const stored = localStorage.getItem("bh_selected_highway");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [activeInput, setActiveInput] = useState(null); // "origin" | "destination"
  const [preventAutoDetect, setPreventAutoDetect] = useState(() => {
    return !!localStorage.getItem("bh_origin_coords") || !!localStorage.getItem("bh_origin_input");
  });
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [searchingDestination, setSearchingDestination] = useState(false);
  const [highlightedOriginIndex, setHighlightedOriginIndex] = useState(0);
  const [highlightedDestinationIndex, setHighlightedDestinationIndex] = useState(0);

  const plannerCardRef = useRef(null);
  const blurTimeoutRef = useRef(null);
  const originSearchAbortRef = useRef(null);
  const destinationSearchAbortRef = useRef(null);
  const reverseGeocodeAbortRef = useRef(null);

  const [loadingHighways, setLoadingHighways] = useState(false);
  const [availableHighways, setAvailableHighways] = useState([]);
  const [showHighwaySelection, setShowHighwaySelection] = useState(false);

  const clearActiveDropdown = useCallback(() => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setActiveInput(null);
    setHighlightedOriginIndex(0);
    setHighlightedDestinationIndex(0);
  }, []);

  const scheduleDropdownClose = useCallback(() => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = window.setTimeout(() => {
      setActiveInput(null);
    }, 140);
  }, []);

  const cancelScheduledDropdownClose = useCallback(() => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }, []);

  const resetRouteSelection = useCallback(() => {
    setSelectedHighway(null);
    setAvailableHighways([]);
    setShowHighwaySelection(false);
    localStorage.removeItem("bh_selected_highway");
  }, []);

  const searchPlaces = useCallback(async (query, signal) => {
    const normalizedQuery = normalizeLocationQuery(query);
    if (!normalizedQuery) return [];

    const cache = readSessionJson(GEOCODE_SEARCH_CACHE_KEY, {});
    if (Array.isArray(cache[normalizedQuery]) && cache[normalizedQuery].length > 0) {
      return cache[normalizedQuery];
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      signal,
      headers: {
        Accept: "application/json"
      }
    });
    const json = await res.json();
    const mapped = (Array.isArray(json) ? json : []).map((r) => ({
      id: r.place_id || r.osm_id,
      display: r.display_name || "",
      lat: Number(r.lat),
      lng: Number(r.lon)
    })).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));

    cache[normalizedQuery] = mapped;
    writeSessionJson(GEOCODE_SEARCH_CACHE_KEY, cache);
    return mapped;
  }, []);

  const reverseGeocodeLocation = useCallback(async (lat, lng, signal) => {
    const cacheKey = buildLatLngKey(lat, lng);
    const cache = readSessionJson(REVERSE_GEOCODE_CACHE_KEY, {});
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }

    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, { signal });
    const json = await res.json();
    const address = json.address || {};
    const cityName = address.city || address.town || address.village || address.municipality || address.county || json.display_name?.split(",")[0] || "Detected City";
    cache[cacheKey] = cityName;
    writeSessionJson(REVERSE_GEOCODE_CACHE_KEY, cache);
    return cityName;
  }, []);

  const shouldShowOriginSuggestions = activeInput === "origin" && (originSuggestions.length > 0 || searchingOrigin);
  const shouldShowDestinationSuggestions = activeInput === "destination" && (destinationSuggestions.length > 0 || searchingDestination);

  const resolveLocationInput = useCallback(async (inputValue, fallbackCoords = null) => {
    const normalizedQuery = normalizeLocationQuery(inputValue);
    if (!normalizedQuery) {
      return fallbackCoords;
    }

    const results = await searchPlaces(inputValue);
    const firstMatch = Array.isArray(results) ? results[0] : null;
    if (firstMatch) {
      return { lat: firstMatch.lat, lng: firstMatch.lng, label: firstMatch.display.split(",")[0] };
    }

    return fallbackCoords;
  }, [searchPlaces]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!plannerCardRef.current?.contains(event.target)) {
        clearActiveDropdown();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [clearActiveDropdown]);

  // Sync to Session Storage
  useEffect(() => {
    localStorage.setItem("bh_origin_input", originInput);
  }, [originInput]);

  useEffect(() => {
    if (originCoords) {
      localStorage.setItem("bh_origin_coords", JSON.stringify(originCoords));
    } else {
      localStorage.removeItem("bh_origin_coords");
    }
  }, [originCoords]);

  useEffect(() => {
    localStorage.setItem("bh_destination_input", destinationInput);
  }, [destinationInput]);

  useEffect(() => {
    if (destinationCoords) {
      localStorage.setItem("bh_destination_coords", JSON.stringify(destinationCoords));
    } else {
      localStorage.removeItem("bh_destination_coords");
    }
  }, [destinationCoords]);

  useEffect(() => {
    if (selectedHighway) {
      localStorage.setItem("bh_selected_highway", JSON.stringify(selectedHighway));
    } else {
      localStorage.removeItem("bh_selected_highway");
    }
  }, [selectedHighway]);

  // Pre-fill current location if GPS coordinates exist and no inputs are present
  useEffect(() => {
    if (!currentLocation || originCoords || originInput || localStorage.getItem("bh_origin_coords") || localStorage.getItem("bh_origin_input") || preventAutoDetect) {
      return;
    }

    const lat = currentLocation.latitude;
    const lng = currentLocation.longitude;
    setOriginCoords({ lat, lng });
    setOriginInput("Current Location");

    reverseGeocodeAbortRef.current?.abort();
    const controller = new AbortController();
    reverseGeocodeAbortRef.current = controller;

    reverseGeocodeLocation(lat, lng, controller.signal)
      .then((label) => {
        if (label) setOriginInput(label);
      })
      .catch(() => {
        setOriginInput("Current Location");
      });
  }, [currentLocation, originCoords, originInput, preventAutoDetect, reverseGeocodeLocation]);

  // Origin suggestion search
  useEffect(() => {
    if (activeInput !== "origin") return undefined;
    const q = String(originInput || "").trim();
    if (q.length < 3) {
      setOriginSuggestions([]);
      setSearchingOrigin(false);
      originSearchAbortRef.current?.abort();
      return undefined;
    }

    const t = setTimeout(async () => {
      try {
        originSearchAbortRef.current?.abort();
        const controller = new AbortController();
        originSearchAbortRef.current = controller;
        setSearchingOrigin(true);
        const mapped = await searchPlaces(q, controller.signal);
        setOriginSuggestions(mapped);
      } catch (e) {
        if (e?.name !== "AbortError") {
          setOriginSuggestions([]);
        }
      } finally {
        setSearchingOrigin(false);
      }
    }, 180);

    return () => clearTimeout(t);
  }, [originInput, activeInput, searchPlaces]);

  useEffect(() => {
    setHighlightedOriginIndex(0);
  }, [originSuggestions]);

  // Destination suggestion search
  useEffect(() => {
    if (activeInput !== "destination") return undefined;
    const q = String(destinationInput || "").trim();
    if (q.length < 3) {
      setDestinationSuggestions([]);
      setSearchingDestination(false);
      destinationSearchAbortRef.current?.abort();
      return undefined;
    }

    const t = setTimeout(async () => {
      try {
        destinationSearchAbortRef.current?.abort();
        const controller = new AbortController();
        destinationSearchAbortRef.current = controller;
        setSearchingDestination(true);
        const mapped = await searchPlaces(q, controller.signal);
        setDestinationSuggestions(mapped);
      } catch (e) {
        if (e?.name !== "AbortError") {
          setDestinationSuggestions([]);
        }
      } finally {
        setSearchingDestination(false);
      }
    }, 180);

    return () => clearTimeout(t);
  }, [destinationInput, activeInput, searchPlaces]);

  useEffect(() => {
    setHighlightedDestinationIndex(0);
  }, [destinationSuggestions]);

  const handleUseCurrentGPS = () => {
    setPreventAutoDetect(false);
    if (currentLocation) {
      const lat = currentLocation.latitude;
      const lng = currentLocation.longitude;
      setOriginCoords({ lat, lng });
      setOriginInput("Current Location");
      setOriginSuggestions([]);
      cancelScheduledDropdownClose();
      resetRouteSelection();

      reverseGeocodeAbortRef.current?.abort();
      const controller = new AbortController();
      reverseGeocodeAbortRef.current = controller;

      reverseGeocodeLocation(lat, lng, controller.signal)
        .then((label) => {
          if (label) setOriginInput(label);
        })
        .catch(() => {
          setOriginInput("Current Location");
        });
    } else {
      toast.error("GPS location not available. Please allow location access.");
    }
  };

  const handleSelectOrigin = (s) => {
    setOriginCoords({ lat: s.lat, lng: s.lng });
    setOriginInput(s.display.split(",")[0]);
    cancelScheduledDropdownClose();
    setOriginSuggestions([]);
    setActiveInput(null);
    setHighlightedOriginIndex(0);
    setPreventAutoDetect(true);
    resetRouteSelection();
  };

  const handleSelectDestination = (s) => {
    setDestinationCoords({ lat: s.lat, lng: s.lng });
    setDestinationInput(s.display.split(",")[0]);
    cancelScheduledDropdownClose();
    setDestinationSuggestions([]);
    setActiveInput(null);
    setHighlightedDestinationIndex(0);
    resetRouteSelection();
  };

  const handleSwap = () => {
    const tempInput = originInput;
    const tempCoords = originCoords;
    setOriginInput(destinationInput);
    setOriginCoords(destinationCoords);
    setDestinationInput(tempInput);
    setDestinationCoords(tempCoords);
    resetRouteSelection();
  };

  const mapGoogleRouteOption = (route, index) => ({
    _id: route.routeId,
    routeId: route.routeId,
    routeIndex: index + 1,
    name: route.name || `Route ${index + 1}`,
    ref: route.summary || route.name || `Route ${index + 1}`,
    approxDistanceKm: route.route?.distanceKm ?? null,
    approxTravelTimeMinutes: route.route?.durationMinutes ?? null,
    distanceText: route.route?.distanceText || "",
    durationText: route.route?.durationText || "",
    restaurantCount: route.restaurantCount || 0,
    badges: Array.isArray(route.badges) ? route.badges : [],
    polyline: route.highway?.polyline || "",
    coordinates: Array.isArray(route.highway?.coordinates) ? route.highway.coordinates : [],
    boundingBox: route.highway?.boundingBox || null,
    viaRoute: route.summary || route.name || `Route ${index + 1}`
  });

  const handleContinue = async () => {
    const destinationText = String(destinationInput || "").trim();
    const gpsLat = Number(currentLocation?.latitude);
    const gpsLng = Number(currentLocation?.longitude);
    const hasCurrentGps = Number.isFinite(gpsLat) && Number.isFinite(gpsLng);

    if (!hasCurrentGps) {
      toast.error("Please allow location access so we can use your current location as the trip start.");
      return;
    }
    if (!destinationText) {
      toast.error("Please enter a valid destination.");
      return;
    }

    try {
      setLoadingHighways(true);

      const resolvedOrigin = { lat: gpsLat, lng: gpsLng };
      let resolvedDestination = destinationCoords;

      setOriginCoords(resolvedOrigin);
      setOriginInput("Current Location");

      if (!resolvedDestination) {
        const destinationMatch = await resolveLocationInput(destinationText, destinationCoords);
        if (!destinationMatch?.lat || !destinationMatch?.lng) {
          toast.error("Please choose a valid destination.");
          return;
        }
        resolvedDestination = { lat: destinationMatch.lat, lng: destinationMatch.lng };
        setDestinationCoords(resolvedDestination);
        if (destinationMatch.label) setDestinationInput(destinationMatch.label);
      }

      const nextRouteCacheKey = [resolvedOrigin.lat, resolvedOrigin.lng, resolvedDestination.lat, resolvedDestination.lng].map((value) => Number(value).toFixed(4)).join(":");
      const routeCache = readSessionJson(DRIVING_ROUTE_OPTIONS_CACHE_KEY, {});
      const cachedRouteEntry = routeCache[nextRouteCacheKey];
      if (Array.isArray(cachedRouteEntry?.availableRoutes) && cachedRouteEntry.availableRoutes.length > 0) {
        setAvailableHighways(cachedRouteEntry.availableRoutes);
        setSelectedHighway(cachedRouteEntry.selectedHighway || cachedRouteEntry.availableRoutes[0]);
        setShowHighwaySelection(false);
        onJourneyPlanSelected({
          origin: resolvedOrigin,
          destination: resolvedDestination,
          highway: cachedRouteEntry.selectedHighway || cachedRouteEntry.availableRoutes[0],
          availableRoutes: cachedRouteEntry.availableRoutes
        });
        return;
      }

      const res = await userAPI.getGoogleRouteHighway({
        startLat: resolvedOrigin.lat,
        startLng: resolvedOrigin.lng,
        endLat: resolvedDestination.lat,
        endLng: resolvedDestination.lng,
        includeAlternatives: true,
        includeRestaurantCounts: false
      });

      const routes = Array.isArray(res?.data?.data?.routes) ? res.data.data.routes : [];
      if (!routes.length) {
        toast.error("We could not find a driving route for this trip.");
        return;
      }

      const mappedRoutes = routes.map(mapGoogleRouteOption);
      const recommendedRouteId = res?.data?.data?.recommendedRouteId;
      const recommendedRoute = mappedRoutes.find((route) => route.routeId === recommendedRouteId) || mappedRoutes[0];

      routeCache[nextRouteCacheKey] = {
        availableRoutes: mappedRoutes,
        selectedHighway: recommendedRoute,
        savedAt: Date.now()
      };
      writeSessionJson(DRIVING_ROUTE_OPTIONS_CACHE_KEY, routeCache);

      setAvailableHighways(mappedRoutes);
      setSelectedHighway(recommendedRoute);
      setShowHighwaySelection(false);
      onJourneyPlanSelected({
        origin: resolvedOrigin,
        destination: resolvedDestination,
        highway: recommendedRoute,
        availableRoutes: mappedRoutes
      });
    } catch (error) {
      console.error("[JourneyPlanner] Failed to fetch route options:", error);
      toast.error("Unable to fetch route options right now.");
    } finally {
      setLoadingHighways(false);
    }
  };

  const handleSelectHighwayFromOverlay = (hw) => {
    setSelectedHighway(hw);
    setShowHighwaySelection(false);
  };

  const handleStartRoadTrip = () => {
    const gpsLat = Number(currentLocation?.latitude);
    const gpsLng = Number(currentLocation?.longitude);
    if (!Number.isFinite(gpsLat) || !Number.isFinite(gpsLng)) {
      toast.error("Current location is required to start live tracking.");
      return;
    }
    if (!destinationCoords || !selectedHighway) return;
    const resolvedOrigin = { lat: gpsLat, lng: gpsLng };
    setOriginCoords(resolvedOrigin);
    setOriginInput("Current Location");
    onJourneyPlanSelected({
      origin: resolvedOrigin,
      destination: destinationCoords,
      highway: selectedHighway,
      availableRoutes: availableHighways.length ? availableHighways : [selectedHighway]
    });
  };

  const handleEditRoute = () => {
    setSelectedHighway(null);
  };

  const canStartJourney = Boolean(String(originInput || "").trim() && String(destinationInput || "").trim() && !loadingHighways);

  const handleOriginFocus = useCallback(() => {
    cancelScheduledDropdownClose();
    setActiveInput("origin");
    setPreventAutoDetect(true);
  }, [cancelScheduledDropdownClose]);

  const handleDestinationFocus = useCallback(() => {
    cancelScheduledDropdownClose();
    setActiveInput("destination");
  }, [cancelScheduledDropdownClose]);

  const handleOriginKeyDown = useCallback((e) => {
    if (e.key === "ArrowDown" && originSuggestions.length > 0) {
      e.preventDefault();
      setHighlightedOriginIndex((prev) => Math.min(prev + 1, originSuggestions.length - 1));
      return;
    }
    if (e.key === "ArrowUp" && originSuggestions.length > 0) {
      e.preventDefault();
      setHighlightedOriginIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      clearActiveDropdown();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeInput === "origin" && originSuggestions[highlightedOriginIndex]) {
        handleSelectOrigin(originSuggestions[highlightedOriginIndex]);
        return;
      }
      handleContinue();
    }
  }, [originSuggestions, highlightedOriginIndex, activeInput, handleContinue, clearActiveDropdown]);

  const handleDestinationKeyDown = useCallback((e) => {
    if (e.key === "ArrowDown" && destinationSuggestions.length > 0) {
      e.preventDefault();
      setHighlightedDestinationIndex((prev) => Math.min(prev + 1, destinationSuggestions.length - 1));
      return;
    }
    if (e.key === "ArrowUp" && destinationSuggestions.length > 0) {
      e.preventDefault();
      setHighlightedDestinationIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      clearActiveDropdown();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeInput === "destination" && destinationSuggestions[highlightedDestinationIndex]) {
        handleSelectDestination(destinationSuggestions[highlightedDestinationIndex]);
        return;
      }
      handleContinue();
    }
  }, [destinationSuggestions, highlightedDestinationIndex, activeInput, handleContinue, clearActiveDropdown]);

  const handleReset = () => {
    setOriginInput("");
    setOriginCoords(null);
    setDestinationInput("");
    setDestinationCoords(null);
    setSelectedHighway(null);
    setAvailableHighways([]);
    setShowHighwaySelection(false);
    localStorage.removeItem("bh_origin_input");
    localStorage.removeItem("bh_origin_coords");
    localStorage.removeItem("bh_destination_input");
    localStorage.removeItem("bh_destination_coords");
    localStorage.removeItem("bh_selected_highway");
  };

  const handleGoHomeAndClear = () => {
    handleReset();
    onGoHome();
  };

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
      originSearchAbortRef.current?.abort();
      destinationSearchAbortRef.current?.abort();
      reverseGeocodeAbortRef.current?.abort();
    };
  }, []);

  const formatDuration = (mins) => {
    if (!mins) return "—";
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hrs > 0) {
      return `${hrs} hr ${remainingMins} min`;
    }
    return `${remainingMins} min`;
  };

  return (
    <div 
      className="w-full min-h-screen bg-white dark:bg-[#121212] flex flex-col justify-between items-center px-4 py-3 sm:py-5 relative overflow-x-hidden"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Poppins Font Import & Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-in {
          animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.25s ease-out forwards;
        }
      `}</style>

      {/* Top Header Bar (Matching Image) */}
      <div className="w-full max-w-md flex items-center justify-between py-2 px-1 mb-1 animate-slide-in">
        <div className="mx-auto pr-6">
          <BhookingoWordmark
            logoSrc={logoUrl || bhookingoLogo}
            companyName={companyName || "Bhookingo"}
            accentClassName="text-[#E0332F]"
            textClassName="font-extrabold text-2xl tracking-tight text-gray-900 dark:text-white leading-none"
            logoClassName="w-8 h-8 object-contain rounded-lg"
            gapClassName="gap-2"
          />
        </div>
        
        <button 
          title="Notifications"
          className="absolute right-4 p-2 text-gray-700 dark:text-neutral-300 hover:text-orange-600 transition-colors"
        >
          <Bell className="w-6 h-6 stroke-[1.8]" />
        </button>
      </div>

      {/* Hero Section Container (Matching Image Layout Exactly) */}
      <div className="w-full max-w-md relative my-auto animate-slide-in flex flex-col justify-between">
        
        {/* Upper Hero Grid: Left Content + Right Outline Illustration */}
        <div className="relative w-full min-h-[220px] pt-2 pb-4 px-1">
          
          {/* Right Side Illustration (Exact Match of Reference Drawing in Orange) */}
          <div className="absolute right-[-10px] top-[-10px] w-[220px] h-[230px] pointer-events-none select-none">
            <svg viewBox="0 0 220 230" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              {/* Skyline outline buildings */}
              <g stroke="#fdba74" strokeWidth="1" strokeDasharray="3 3" opacity="0.6">
                <rect x="140" y="30" width="12" height="35" rx="1" />
                <rect x="154" y="20" width="16" height="45" rx="1" />
                <rect x="172" y="35" width="14" height="30" rx="1" />
                <rect x="188" y="25" width="18" height="40" rx="1" />
              </g>

              {/* Cloud Outlines */}
              <path d="M120 15 Q125 10 132 12 Q138 8 145 13 Q150 15 145 20 Z" stroke="#fdba74" strokeWidth="1.2" fill="none" opacity="0.7" />
              <path d="M180 8 Q184 4 190 6 Q195 2 200 7 Q205 9 200 13 Z" stroke="#fdba74" strokeWidth="1.2" fill="none" opacity="0.7" />

              {/* Highway Road Outline curving down to left */}
              <path 
                d="M210 55 C160 65 140 100 160 135 C175 160 140 190 40 205" 
                stroke="#fdba74" 
                strokeWidth="1.8" 
                fill="none" 
              />
              <path 
                d="M210 72 C170 82 152 110 172 140 C185 162 145 198 40 215" 
                stroke="#fdba74" 
                strokeWidth="1.8" 
                fill="none" 
              />
              {/* Road center dashed line */}
              <path 
                d="M210 63.5 C165 73.5 146 105 166 137.5 C180 161 142.5 194 40 210" 
                stroke="#f97316" 
                strokeWidth="1.2" 
                strokeDasharray="4 5" 
                fill="none" 
              />

              {/* Minimal trees along road */}
              <g stroke="#f97316" strokeWidth="1.2" fill="none">
                {/* Tree 1 */}
                <circle cx="130" cy="115" r="7" />
                <path d="M130 122 L130 128" />
                {/* Tree 2 */}
                <circle cx="178" cy="110" r="6" />
                <path d="M178 116 L178 121" />
                {/* Tree 3 */}
                <circle cx="192" cy="150" r="7" />
                <path d="M192 157 L192 163" />
              </g>

              {/* Car Outline driving along the road */}
              <g transform="translate(150, 125) rotate(-25) scale(0.85)">
                <rect x="0" y="4" width="30" height="13" rx="4" stroke="#ea580c" strokeWidth="1.5" fill="white" />
                <path d="M6 4 L10 0 L20 0 L24 4 Z" stroke="#ea580c" strokeWidth="1.5" fill="white" />
                <circle cx="7" cy="17" r="3" fill="#ea580c" />
                <circle cx="23" cy="17" r="3" fill="#ea580c" />
              </g>

              {/* Location Pins (Orange Pins matching reference image) */}
              <g transform="translate(170, 25)">
                <path d="M9 0C4.03 0 0 4.03 0 9C0 15.75 9 24 9 24C9 24 18 15.75 18 9C18 4.03 13.97 0 9 0Z" fill="#ea580c" />
                <circle cx="9" cy="9" r="3.5" fill="white" />
              </g>
              <g transform="translate(195, 140)">
                <path d="M9 0C4.03 0 0 4.03 0 9C0 15.75 9 24 9 24C9 24 18 15.75 18 9C18 4.03 13.97 0 9 0Z" fill="#ea580c" />
                <circle cx="9" cy="9" r="3.5" fill="white" />
              </g>
            </svg>
          </div>

          {/* Left Text & Title Area */}
          <div className="relative z-10 max-w-[240px]">
            {/* Steering Wheel Icon Box + "Drive Mode" Header */}
            <div className="flex items-center gap-3 mb-1">
              <div className="w-13 h-13 rounded-2xl bg-orange-600 flex items-center justify-center shadow-md text-white shrink-0 p-2.5">
                {/* Steering Wheel SVG (Exact Match to Reference Icon) */}
                <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 15v6" />
                  <path d="M9.5 9.5L4 7" />
                  <path d="M14.5 9.5L20 7" />
                </svg>
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
                  <span className="text-orange-600">Drive</span> Mode
                </h1>
                <p className="text-[11px] font-medium text-gray-600 dark:text-neutral-400 mt-0.5">
                  Food, your way on the highway
                </p>
              </div>
            </div>

            {/* Subtext Paragraphs */}
            <div className="mt-4 space-y-2 text-xs font-normal text-gray-700 dark:text-neutral-300 leading-snug pr-2">
              <p>
                Find the best restaurants and food partners on your route.
              </p>
              <p className="text-[11px] text-gray-600 dark:text-neutral-400">
                Order, Pre-order, Dine-in or Takeaway – we've got you covered!
              </p>
            </div>

          </div>

        </div>
        {/* Route Card Component (Matching Reference Card Exactly) */}
        {selectedHighway ? (
          /* Summary Mode / Review Journey Card */
          <div className="bg-white dark:bg-[#181818] border border-gray-100 dark:border-neutral-800 rounded-3xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)] space-y-4 relative overflow-hidden animate-slide-in mt-3">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600">
                  <Compass className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase text-gray-800 dark:text-gray-200 tracking-wider">
                  Your Journey Route
                </span>
              </div>
              
              <div className="flex gap-2">
                {availableHighways.length > 1 && (
                  <button
                    onClick={() => setShowHighwaySelection(true)}
                    className="text-[10px] font-bold text-orange-600 hover:text-orange-700 transition-colors uppercase tracking-wider bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 rounded-xl"
                  >
                    Change Route
                  </button>
                )}
                <button 
                  onClick={handleEditRoute} 
                  className="text-[10px] font-bold text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-white transition-colors uppercase tracking-wider bg-gray-100 dark:bg-neutral-800 px-2.5 py-1 rounded-xl flex items-center gap-1"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                  Edit
                </button>
              </div>
            </div>

            {/* Visual Route Timeline */}
            <div className="flex items-center gap-4 py-1">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Navigation className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] text-gray-400 dark:text-neutral-500 font-medium leading-none mb-0.5">From</span>
                    <span className="font-bold text-sm text-gray-900 dark:text-white truncate block">{originInput}</span>
                  </div>
                </div>

                {/* Vertical dotted road line */}
                <div className="h-5 w-7 flex justify-center shrink-0">
                  <div className="w-0.5 h-full border-l-2 border-dashed border-orange-500 dark:border-orange-800" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <MapPin className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] text-gray-400 dark:text-neutral-500 font-medium leading-none mb-0.5">To</span>
                    <span className="font-bold text-sm text-gray-900 dark:text-white truncate block">{destinationInput}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Connected Highway badge */}
            <div className="flex items-center gap-3 p-3 bg-orange-50/60 dark:bg-neutral-900/80 rounded-2xl border border-orange-100 dark:border-neutral-800">
              <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-xs uppercase tracking-wider shrink-0 shadow-sm">
                NH
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] text-gray-400 dark:text-neutral-500 uppercase font-bold tracking-wider leading-none mb-0.5">Active Route</span>
                <span className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate block">
                  {selectedHighway.ref || selectedHighway.name}
                </span>
              </div>
            </div>

            {/* Grid Stats Chips */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2.5 bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800">
                <span className="block text-[9px] text-gray-400 dark:text-neutral-500 uppercase font-medium tracking-wider mb-0.5">Distance</span>
                <span className="text-xs font-bold text-gray-900 dark:text-white">{selectedHighway.approxDistanceKm} km</span>
              </div>
              <div className="p-2.5 bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800">
                <span className="block text-[9px] text-gray-400 dark:text-neutral-500 uppercase font-medium tracking-wider mb-0.5">Time</span>
                <span className="text-xs font-bold text-gray-900 dark:text-white">{formatDuration(selectedHighway.approxTravelTimeMinutes)}</span>
              </div>
              <div className="p-2.5 bg-gray-50 dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800">
                <span className="block text-[9px] text-gray-400 dark:text-neutral-500 uppercase font-medium tracking-wider mb-0.5">Stops</span>
                <span className="text-xs font-bold text-orange-600">{selectedHighway.restaurantCount || 0} Stops</span>
              </div>
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleStartRoadTrip}
              className="w-full h-14 bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 transition-all text-base tracking-wide cursor-pointer border-none"
            >
              Start Journey
              <ArrowRight className="w-5 h-5" />
            </Button>

          </div>
        ) : (
          /* Input Mode Card (Exact Match to Reference Image Card) */
          <div ref={plannerCardRef} className="bg-white dark:bg-[#181818] border border-gray-100 dark:border-neutral-800 rounded-3xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)] relative animate-slide-in mt-2 space-y-4">
            
            {/* Input Fields Wrapper */}
            <div className="relative space-y-3">
              
              {/* FROM Input Box */}
              <div className="relative bg-white dark:bg-neutral-900 border border-gray-200/90 dark:border-neutral-800 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
                
                {/* Red/Orange Navigation Icon Circle */}
                <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <Navigation className="w-5 h-5 fill-current transform rotate-45" />
                </div>

                {/* Input Text & Label */}
                <div className="flex-1 min-w-0">
                  <label className="block text-xs text-gray-500 dark:text-neutral-400 font-medium leading-none mb-1">
                    From
                  </label>
                  <input
                    type="text"
                    value={originInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOriginInput(val);
                      setOriginCoords(null);
                      setPreventAutoDetect(true);
                      resetRouteSelection();
                    }}
                    onFocus={handleOriginFocus}
                    onBlur={scheduleDropdownClose}
                    placeholder="Current Location"
                    onKeyDown={handleOriginKeyDown}
                    className="w-full bg-transparent border-none p-0 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 placeholder:font-normal"
                  />
                </div>

                {/* GPS Icon Button */}
                <button
                  onClick={handleUseCurrentGPS}
                  title="Use current location"
                  className="p-1.5 text-gray-700 dark:text-neutral-300 hover:text-orange-600 transition-colors shrink-0"
                >
                  <Target className="w-5 h-5 stroke-[1.8]" />
                </button>

                {/* Origin Suggestions Popover */}
                {shouldShowOriginSuggestions && (
                  <div
                    className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden divide-y divide-gray-100 dark:divide-neutral-800 z-50 animate-fade-in"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {searchingOrigin && originSuggestions.length === 0 && (
                      <div className="p-3 flex items-center justify-center gap-2 text-xs text-gray-500">
                        <Loader2 className="animate-spin h-4 w-4 text-orange-600" />
                        Searching cities...
                      </div>
                    )}
                    {originSuggestions.map((s, index) => (
                      <button
                        key={s.id}
                        onClick={() => handleSelectOrigin(s)}
                        onMouseEnter={() => setHighlightedOriginIndex(index)}
                        className={`w-full px-4 py-3 flex items-start gap-3 transition-colors text-left ${highlightedOriginIndex === index ? "bg-orange-50 dark:bg-neutral-800" : "hover:bg-orange-50 dark:hover:bg-neutral-800"}`}
                      >
                        <MapPin className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {s.display.split(",")[0]}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {s.display.split(",").slice(1).join(",").trim()}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}



              </div>

              {/* Dashed Line & Ring Connector (Between From and To Circles) */}
              <div className="relative h-6 my-[-6px] flex items-center z-10 pointer-events-none pl-7">
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-0.5 h-2.5 border-l-2 border-dashed border-orange-500 opacity-70" />
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-orange-600 bg-white dark:bg-[#181818] shrink-0" />
                  <div className="w-0.5 h-2.5 border-l-2 border-dashed border-orange-500 opacity-70" />
                </div>
              </div>

              {/* TO Input Box */}
              <div className="relative bg-white dark:bg-neutral-900 border border-gray-200/90 dark:border-neutral-800 rounded-2xl p-3 flex items-center justify-between gap-3 transition-all focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500">
                
                {/* Red/Orange Map Pin Icon Circle */}
                <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <MapPin className="w-5 h-5 fill-current" />
                </div>

                {/* Input Text & Label */}
                <div className="flex-1 min-w-0">
                  <label className="block text-xs text-gray-500 dark:text-neutral-400 font-medium leading-none mb-1">
                    To
                  </label>
                  <input
                    type="text"
                    value={destinationInput}
                    onChange={(e) => {
                      setDestinationInput(e.target.value);
                      setDestinationCoords(null);
                      resetRouteSelection();
                    }}
                    onFocus={handleDestinationFocus}
                    onBlur={scheduleDropdownClose}
                    placeholder="Where are you headed?"
                    onKeyDown={handleDestinationKeyDown}
                    className="w-full bg-transparent border-none p-0 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none placeholder:text-gray-400 placeholder:font-normal"
                  />
                </div>

                {/* Swap Icon Button */}
                <button
                  onClick={handleSwap}
                  title="Swap From and To"
                  className="p-1.5 text-gray-700 dark:text-neutral-300 hover:text-orange-600 transition-colors shrink-0"
                >
                  <ArrowUpDown className="w-5 h-5 stroke-[1.8]" />
                </button>

                {/* Destination Suggestions Popover */}
                {shouldShowDestinationSuggestions && (
                  <div
                    className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden divide-y divide-gray-100 dark:divide-neutral-800 z-50 animate-fade-in"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {searchingDestination && destinationSuggestions.length === 0 && (
                      <div className="p-3 flex items-center justify-center gap-2 text-xs text-gray-500">
                        <Loader2 className="animate-spin h-4 w-4 text-orange-600" />
                        Searching cities...
                      </div>
                    )}
                    {destinationSuggestions.map((s, index) => (
                      <button
                        key={s.id}
                        onClick={() => handleSelectDestination(s)}
                        onMouseEnter={() => setHighlightedDestinationIndex(index)}
                        className={`w-full px-4 py-3 flex items-start gap-3 transition-colors text-left ${highlightedDestinationIndex === index ? "bg-orange-50 dark:bg-neutral-800" : "hover:bg-orange-50 dark:hover:bg-neutral-800"}`}
                      >
                        <MapPin className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {s.display.split(",")[0]}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {s.display.split(",").slice(1).join(",").trim()}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}



              </div>

            </div>

            {/* Primary Action CTA Button ("Start Journey" with Arrow) */}
            <div className="pt-2">
              <Button
                onClick={handleContinue}
                disabled={!canStartJourney}
                className="w-full h-14 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-200 dark:disabled:bg-neutral-800 disabled:opacity-50 active:scale-[0.99] text-white font-bold text-base rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 transition-all cursor-pointer border-none"
              >
                {loadingHighways ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Finding route instantly...
                  </>
                ) : (
                  <>
                    Start Journey
                    <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                  </>
                )}
              </Button>
            </div>

          </div>
        )}

        {/* Go Home Secondary Action & Reset */}
        <div className="mt-3 flex items-center justify-between px-2">
          <button
            onClick={handleGoHomeAndClear}
            className="text-xs font-semibold text-gray-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors flex items-center gap-1.5 py-1"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>

          {(originCoords || destinationCoords || originInput || destinationInput) && (
            <button 
              onClick={handleReset} 
              className="text-xs font-semibold text-gray-500 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors flex items-center gap-1 py-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Inputs
            </button>
          )}
        </div>

      </div>

      {/* Bottom Wave Decorative Background (Matching Reference Footer) */}
      <div className="w-full max-w-md h-12 relative opacity-40 pointer-events-none select-none mt-auto">
        <svg viewBox="0 0 400 40" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 20 Q100 40 200 20 T400 20 L400 40 L0 40 Z" fill="#fdba74" />
        </svg>
      </div>

      {/* Bottom Sheet Modal Overlay for Highway Selection */}
      {showHighwaySelection && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end justify-center animate-fade-in" 
          onClick={() => {
            if (selectedHighway) {
              setShowHighwaySelection(false);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-t-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl border-t border-gray-100 dark:border-neutral-800 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handlebar */}
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-full mx-auto mb-2" />
            
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Choose Route Option</h3>
              <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1 leading-normal">
                After choosing source and destination, select the route you want to follow. We are showing the route summary here.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {availableHighways.map((hw, index) => (
                <button
                  key={hw._id}
                  onClick={() => handleSelectHighwayFromOverlay(hw)}
                  className="w-full p-4 border border-gray-200 dark:border-neutral-800 rounded-2xl hover:border-orange-500 dark:hover:border-orange-500 flex flex-col text-left transition-all bg-gray-50 dark:bg-[#181818] hover:bg-orange-50/20 relative overflow-hidden group shadow-sm"
                >
                  {hw.badges?.[0] && (
                    <span className="absolute top-0 right-0 bg-orange-600 text-white text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-bl-lg tracking-wider">
                      {hw.badges[0]}
                    </span>
                  )}
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Route className="w-4 h-4 text-orange-600 shrink-0" />
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      {hw.name}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-orange-100 bg-white/70 px-3 py-2 text-xs dark:border-neutral-800 dark:bg-neutral-900/70">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Via Route</div>
                    <div className="mt-1 font-semibold text-gray-900 dark:text-white">{hw.viaRoute || hw.ref || hw.name}</div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 border-t border-gray-200/60 dark:border-neutral-800/80 pt-2 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    <div>
                      <span className="block text-[8px] text-gray-400 uppercase font-bold">Distance</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{hw.approxDistanceKm} km</span>
                    </div>
                    <div className="border-x border-gray-200/60 dark:border-neutral-800 px-1 text-center">
                      <span className="block text-[8px] text-gray-400 uppercase font-bold">Time</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{formatDuration(hw.approxTravelTimeMinutes)}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[8px] text-gray-400 uppercase font-bold">Restaurants</span>
                      <span className="font-bold text-orange-600">{hw.restaurantCount || 0} stops</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => {
                if (selectedHighway) {
                  setShowHighwaySelection(false);
                }
              }}
              disabled={!selectedHighway}
              className="w-full h-12 border-gray-200 dark:border-neutral-800 text-gray-700 dark:text-neutral-300 font-bold rounded-2xl mt-2 disabled:opacity-50"
            >
              {selectedHighway ? 'Close' : 'Select a Route First'}
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}

