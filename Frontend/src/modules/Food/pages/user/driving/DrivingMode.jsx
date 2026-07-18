import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Loader2, Navigation, AlertTriangle, List, Map, ShieldAlert, CheckCircle, Clock, Play, Square, Settings, Search, X, MapPin, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { userAPI } from "@food/api";
import { useProfile } from "@food/context/ProfileContext";
import { Button } from "@food/components/ui/button";
import { Dialog, DialogContent } from "@food/components/ui/dialog";
import DrivingMap from "./components/DrivingMap";
import DrivingRestaurantCard from "./components/DrivingRestaurantCard";
import DrivingSummaryCard from "./components/DrivingSummaryCard";
import DrivingFilters from "./components/DrivingFilters";
import DrivingModeFallback from "./components/DrivingModeFallback";
import DrivingLocationPermission from "./components/DrivingLocationPermission";
import BottomNavigation from "@food/components/user/BottomNavigation";
import { extractImages } from "@food/utils/common";

// Food/menu images carousel component for the details card
function RestaurantImageCarousel({ restaurant }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const allImages = React.useMemo(() => {
    if (!restaurant) return [];
    const candidates = [
      ...(restaurant.menuImages || []),
      ...(restaurant.coverImages || []),
      restaurant.profileImage,
      restaurant.profileImageUrl,
      restaurant.image,
      restaurant.imageUrl,
      restaurant.coverImage,
      restaurant.onboarding?.step2?.profileImageUrl,
      ...(restaurant.onboarding?.step2?.menuImageUrls || [])
    ].filter(Boolean);
    return extractImages(candidates);
  }, [restaurant]);

  useEffect(() => {
    if (allImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % allImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [allImages]);

  const activeImage = allImages[currentIndex] || "https://picsum.photos/seed/dhaba/600/400";

  return (
    <div className="relative h-48 w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
      <style>{`
        @keyframes carouselFadeIn {
          from { opacity: 0.5; }
          to { opacity: 1; }
        }
      `}</style>
      <img
        key={currentIndex}
        src={activeImage}
        alt={restaurant.restaurantName}
        className="w-full h-full object-cover transition-opacity duration-500"
        style={{
          animation: "carouselFadeIn 0.6s ease-in-out"
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
      
      {allImages.length > 1 && (
        <div className="absolute top-4 right-4 flex gap-1 z-20 bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm">
          {allImages.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex ? "w-3 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DrivingMode() {
  const navigate = useNavigate();
  const { setOrderType } = useProfile();

  // Settings & Configuration States
  const [settings, setSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [settingsError, setSettingsError] = useState(null);

  // Geolocation States
  const [currentLocation, setCurrentLocation] = useState(null);
  const [heading, setHeading] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Restaurant Query States
  const [resultData, setResultData] = useState(null);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const hasFetchedInitial = useRef(false);

  // Unified State Machine
  // "CHECKING_LOCATION" | "CHECKING_HIGHWAY" | "LOADING_RESTAURANTS" | "AVAILABLE" | "OUTSIDE_HIGHWAY" | "NO_RESTAURANTS" | "AUTH_ERROR" | "ERROR" | "location_denied" | "PERMISSION_REQUIRED" | "disabled"
  const [status, setStatus] = useState("CHECKING_LOCATION");
  const [errorMessage, setErrorMessage] = useState(null);

  // View States
  const [viewMode, setViewMode] = useState("map"); // "map" | "list"
  const [activeFacilityFilter, setActiveFacilityFilter] = useState("all");
  const [activeDistanceLimit, setActiveDistanceLimit] = useState(50); // in KM
  const [sortBy, setSortBy] = useState("distance"); // "distance" | "eta" | "rating"
  
  // Details Modal State
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  // Geolocation refs to avoid interval closures
  const locationRef = useRef(null);
  const headingRef = useRef(null);
  const speedRef = useRef(null);
  const geoWatchIdRef = useRef(null);

  // Abort handling & query timeout references
  const abortControllerRef = useRef(null);
  const timeoutIdRef = useRef(null);

  // -------------------------------------------------------------
  // TEMP DEVELOPMENT ONLY - SIMULATION MODE CONFIGURATION
  // -------------------------------------------------------------
  const [simulationActive, setSimulationActive] = useState(() => {
    return sessionStorage.getItem("drivingSimulation") === "true";
  });
  const [simLat, setSimLat] = useState("22.7176"); // Default NH-48 / Indore coordinates
  const [simLng, setSimLng] = useState("75.8720");
  const [simHeading, setSimHeading] = useState("90");
  const [simSpeed, setSimSpeed] = useState("60");
  const [showSimControls, setShowSimControls] = useState(false);
  const [simLocationName, setSimLocationName] = useState("NH-48 Highway, Indore, Madhya Pradesh");
  
  const [addressAutocompleteValue, setAddressAutocompleteValue] = useState("");
  const [keywordAddressSuggestions, setKeywordAddressSuggestions] = useState([]);
  const [isKeywordSearching, setIsKeywordSearching] = useState(false);

  useEffect(() => {
    const q = String(addressAutocompleteValue || "").trim();
    if (q.length < 3) {
      setKeywordAddressSuggestions([]);
      setIsKeywordSearching(false);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setIsKeywordSearching(true);
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        const json = await res.json();
        const mapped = (Array.isArray(json) ? json : []).map(r => ({
          id: r.place_id || r.osm_id,
          display: r.display_name || "",
          lat: Number(r.lat),
          lng: Number(r.lon),
        })).filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lng));
        setKeywordAddressSuggestions(mapped);
      } catch (e) {
        setKeywordAddressSuggestions([]);
      } finally {
        setIsKeywordSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [addressAutocompleteValue]);

  const handleSelectSuggestion = (s) => {
    setSimLat(s.lat.toString());
    setSimLng(s.lng.toString());
    setSimLocationName(s.display);
    setAddressAutocompleteValue("");
    setKeywordAddressSuggestions([]);
  };

  const handleStartSimulation = () => {
    if (!simLat || !simLng) {
      toast.error("Please select a simulation location first.");
      return;
    }

    const latVal = parseFloat(simLat);
    const lngVal = parseFloat(simLng);
    const hVal = parseFloat(simHeading) || 90;
    const sVal = parseFloat(simSpeed) || 60;

    setCurrentLocation({ latitude: latVal, longitude: lngVal });
    setHeading(hVal);
    setSpeed(sVal);

    locationRef.current = { latitude: latVal, longitude: lngVal };
    headingRef.current = hVal;
    speedRef.current = sVal;

    setSimulationActive(true);
    sessionStorage.setItem("drivingSimulation", "true");

    hasFetchedInitial.current = true;
    fetchRestaurantsAhead(true);
  };

  const handleStopSimulation = () => {
    setSimulationActive(false);
    sessionStorage.removeItem("drivingSimulation");
    setCurrentLocation(null);
    setHeading(null);
    setSpeed(null);
    setResultData(null);
    hasFetchedInitial.current = false;
  };
  // -------------------------------------------------------------

  useEffect(() => {
    locationRef.current = currentLocation;
    headingRef.current = heading;
    speedRef.current = speed;
  }, [currentLocation, heading, speed]);

  // Clean up abort controller and timeout on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, []);

  // React-side Safety Timeout for Location Acquisition
  useEffect(() => {
    if (status !== "CHECKING_LOCATION") {
      return;
    }

    const timer = setTimeout(() => {
      if (status === "CHECKING_LOCATION") {
        console.warn("[DrivingMode] Geolocation acquisition timed out on React side (15s)");
        setErrorMessage("Unable to get your location. Please check GPS permission and try again.");
        setStatus("ERROR");
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [status]);

  // Fetch settings from API
  const fetchSettings = async (isRetry = false) => {
    try {
      if (isRetry) {
        setLoadingSettings(true);
        setStatus("CHECKING_LOCATION");
      }
      const res = await userAPI.getDrivingModeSettings();
      if (res?.data?.success) {
        const s = res.data.data;
        setSettings(s);
        if (s.rangeKm) setActiveDistanceLimit(s.rangeKm);
        if (s.enabled === false) {
          setSettingsError("disabled");
          setStatus("disabled");
        } else {
          setSettingsError(null);
        }
        return s;
      }
    } catch (err) {
      console.error("[DrivingMode] fetchSettings error:", err);
      const isAuthError = err.response?.status === 401 || err.response?.status === 403 || err.response?.data?.message?.includes("token");
      setSettingsError(isAuthError ? "AUTH_ERROR" : "ERROR");
      setStatus(isAuthError ? "AUTH_ERROR" : "ERROR");
    } finally {
      setLoadingSettings(false);
    }
    return null;
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Watch GPS Location (ignores when Simulation Mode is active)
  useEffect(() => {
    if (simulationActive) {
      // In simulation mode, load coords directly
      const latVal = parseFloat(simLat) || 22.7176;
      const lngVal = parseFloat(simLng) || 75.8720;
      setCurrentLocation({ latitude: latVal, longitude: lngVal });
      setHeading(parseFloat(simHeading) || 90);
      setSpeed(parseFloat(simSpeed) || 60);
      setLocationError(null);
      return;
    }

    if (settingsError || loadingSettings || settings?.enabled === false) return;

    if (!navigator.geolocation) {
      setLocationError("location_denied");
      setStatus("location_denied");
      return;
    }

    const startWatching = () => {
      setStatus("CHECKING_LOCATION");
      if (geoWatchIdRef.current) navigator.geolocation.clearWatch(geoWatchIdRef.current);
      geoWatchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, heading: h, speed: s } = position.coords;
          setCurrentLocation({ latitude, longitude });
          setHeading(h);
          setSpeed(s);
          setLocationError(null);
        },
        (err) => {
          console.error("[DrivingMode] watchPosition error:", err);
          setLocationError("location_denied");
          setStatus("location_denied");
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    };

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state === "granted") {
          startWatching();
        } else if (result.state === "denied") {
          setStatus("location_denied");
        } else {
          setStatus("PERMISSION_REQUIRED");
        }
        
        result.onchange = () => {
          if (result.state === "granted") {
            startWatching();
          } else if (result.state === "denied") {
            setStatus("location_denied");
            if (geoWatchIdRef.current) {
              navigator.geolocation.clearWatch(geoWatchIdRef.current);
              geoWatchIdRef.current = null;
            }
          }
        };
      }).catch((e) => {
        setStatus("PERMISSION_REQUIRED"); // Safari fallback
      });
    } else {
      setStatus("PERMISSION_REQUIRED"); // Safari fallback
    }

    return () => {
      if (geoWatchIdRef.current) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
        geoWatchIdRef.current = null;
      }
    };
  }, [settingsError, loadingSettings, settings, simulationActive]);

  // Restaurants Query Logic with AbortController and 20s loading timeout
  const fetchRestaurantsAhead = useCallback(async (isInitial = false) => {
    const loc = locationRef.current;
    if (!loc) {
      setStatus("CHECKING_LOCATION");
      return;
    }

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (isInitial) {
      setStatus("CHECKING_HIGHWAY");
      setLoadingRestaurants(true);
    } else {
      setStatus("LOADING_RESTAURANTS");
    }

    // Start 20-second timeout guard
    timeoutIdRef.current = setTimeout(() => {
      controller.abort();
      setLoadingRestaurants(false);
      setStatus("ERROR");
      console.warn("[DrivingMode] Restaurant ahead query timed out (20s reached)");
    }, 20000);

    try {
      const res = await userAPI.getRestaurantsAhead({
        lat: loc.latitude,
        lng: loc.longitude,
        heading: headingRef.current,
        speed: speedRef.current
      }, {
        signal: controller.signal
      });

      // Clear the timeout upon receiving the response
      clearTimeout(timeoutIdRef.current);

      if (res?.data?.success) {
        const data = res.data.data;
        setResultData(data);
        if (data.status === "OUT_OF_HIGHWAY") {
          setStatus("OUTSIDE_HIGHWAY");
        } else if (!data.restaurants || data.restaurants.length === 0) {
          setStatus("NO_RESTAURANTS");
        } else {
          setStatus("AVAILABLE");
        }
      } else {
        const msg = res?.data?.message || "";
        if (msg.includes("Authentication token") || msg.includes("Auth") || msg.includes("token")) {
          setStatus("AUTH_ERROR");
        } else {
          setStatus("ERROR");
        }
      }
    } catch (err) {
      clearTimeout(timeoutIdRef.current);
      if (err.name === "AbortError") {
        return; // aborted, ignore state transition
      }

      console.error("[DrivingMode] query request failure:", err);
      const isAuthError = err.response?.status === 401 || err.response?.status === 403 || err.response?.data?.message?.includes("token");
      setStatus(isAuthError ? "AUTH_ERROR" : "ERROR");
    } finally {
      if (isInitial) setLoadingRestaurants(false);
    }
  }, []);

  // Trigger initial query when location is first detected
  useEffect(() => {
    if (currentLocation && !hasFetchedInitial.current && settings?.enabled) {
      hasFetchedInitial.current = true;
      fetchRestaurantsAhead(true);
    }
  }, [currentLocation, settings, fetchRestaurantsAhead]);

  // Periodic polling interval
  useEffect(() => {
    if (!currentLocation || !settings?.refreshInterval || status !== "AVAILABLE") return;

    const intervalId = setInterval(() => {
      fetchRestaurantsAhead(false);
    }, settings.refreshInterval * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [currentLocation, settings?.refreshInterval, fetchRestaurantsAhead, status]);

  // Handle Retry button
  const handleRetry = async () => {
    setSettingsError(null);
    setLocationError(null);
    setResultData(null);
    setErrorMessage(null);
    hasFetchedInitial.current = false;
    
    const loadedSettings = await fetchSettings(true);
    if (!loadedSettings || loadedSettings.enabled === false) return;

    if (simulationActive) {
      handleStartSimulation();
      return;
    }

    handleEnableLocation();
  };

  const handleEnableLocation = () => {
    setStatus("CHECKING_LOCATION");
    setErrorMessage(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, heading: h, speed: s } = position.coords;
          setCurrentLocation({ latitude, longitude });
          setHeading(h);
          setSpeed(s);
          setLocationError(null);
          locationRef.current = { latitude, longitude };
          headingRef.current = h;
          speedRef.current = s;
          hasFetchedInitial.current = true;
          fetchRestaurantsAhead(true);
        },
        (err) => {
          console.error(err);
          if (err.code === 3) {
            setErrorMessage("Unable to get your location. Please check GPS and try again.");
            setStatus("ERROR");
          } else {
            setLocationError("location_denied");
            setStatus("location_denied");
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
  };

  // Redirect to preorder menu
  const handlePreorder = (restaurant) => {
    if (setOrderType) setOrderType("takeaway");
    setSelectedRestaurant(null);
    navigate(`/user/restaurants/${restaurant.restaurantSlug || restaurant._id}`);
  };

  // Filter & Sort Logic
  const filteredRestaurants = (() => {
    if (!resultData?.restaurants) return [];

    let list = [...resultData.restaurants];

    // 1. Distance filter (List view only)
    if (viewMode === "list") {
      list = list.filter((r) => r.distanceKm <= activeDistanceLimit);
    }

    // 2. Facilities tags filter
    if (activeFacilityFilter !== "all") {
      if (activeFacilityFilter === "veg") {
        list = list.filter((r) => r.pureVegRestaurant === true);
      } else {
        list = list.filter((r) => r.facilities?.[activeFacilityFilter] === true);
      }
    }

    // 3. Sorting
    list.sort((a, b) => {
      if (sortBy === "eta") return a.etaMinutes - b.etaMinutes;
      if (sortBy === "rating") return b.rating - a.rating;
      return a.distanceKm - b.distanceKm; // default distance
    });

    return list;
  })();

  // -------------------------------------------------------------
  // RENDER SIMULATION PANEL HELPER (Dev Toggle)
  // -------------------------------------------------------------
  const renderSimPanel = () => {
    return (
      <div className="fixed top-4 right-4 z-[999] pointer-events-auto">
        <button
          onClick={() => setShowSimControls(!showSimControls)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-black uppercase bg-neutral-900 text-white shadow-xl border border-white/20 hover:bg-neutral-800 transition-all"
        >
          <Settings className="w-3.5 h-3.5 text-orange-500 animate-spin-slow" />
          <span>Dev Sim {simulationActive ? "ON" : "OFF"}</span>
        </button>

        {showSimControls && (
          <div className="absolute right-0 top-11 w-80 bg-white dark:bg-[#1a1a1a] border dark:border-neutral-800 p-4 rounded-2xl shadow-2xl text-left space-y-4">
            <h4 className="text-xs font-black uppercase text-gray-700 dark:text-neutral-300 border-b pb-1">
              Simulation Controls
            </h4>
            
            {/* Search Input */}
            <div className="relative group">
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Search Simulation Location</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Search className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={addressAutocompleteValue}
                  onChange={(e) => setAddressAutocompleteValue(e.target.value)}
                  placeholder="Search highway/location"
                  className="pl-8 pr-8 h-9 w-full bg-gray-50 border dark:bg-[#121212] dark:border-neutral-800 dark:text-white rounded-lg text-xs font-medium focus:ring-1 focus:ring-orange-500 focus:outline-none transition-all"
                />
                {addressAutocompleteValue && (
                  <button 
                    onClick={() => setAddressAutocompleteValue("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-800 text-gray-400 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Search Suggestions List */}
            {keywordAddressSuggestions.length > 0 && (
              <div className="absolute left-4 right-4 mt-1 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl shadow-xl overflow-hidden divide-y divide-gray-100 dark:divide-neutral-800 z-50">
                {keywordAddressSuggestions.map((s) => {
                  const title = s.display.split(",")[0] || s.display;
                  const subtitle = s.display.split(",").slice(1).join(",").trim() || s.display;
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full px-3 py-2.5 flex items-start gap-2.5 hover:bg-orange-50 dark:hover:bg-neutral-800 transition-colors text-left"
                    >
                      <MapPin className="h-3.5 w-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{title}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {isKeywordSearching && (
              <div className="absolute left-4 right-4 mt-1 p-2 flex items-center justify-center gap-2 text-[10px] text-gray-500 bg-gray-50 dark:bg-neutral-900/50 rounded-lg border dark:border-neutral-800 z-50">
                <Loader2 className="animate-spin h-3.5 w-3.5 text-orange-500" />
                Searching...
              </div>
            )}

            <div className="bg-gray-50 dark:bg-neutral-900/50 p-2.5 rounded-xl border dark:border-neutral-800 space-y-2">
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-400">Selected Location</label>
                <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 mt-0.5 leading-tight">{simLocationName}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-gray-400">Latitude</label>
                  <input
                    type="text"
                    value={simLat}
                    disabled
                    readOnly
                    className="w-full h-7 px-2 mt-1 rounded bg-gray-100 dark:bg-[#1a1a1a] border-transparent text-gray-500 dark:text-gray-400 text-xs cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase font-bold text-gray-400">Longitude</label>
                  <input
                    type="text"
                    value={simLng}
                    disabled
                    readOnly
                    className="w-full h-7 px-2 mt-1 rounded bg-gray-100 dark:bg-[#1a1a1a] border-transparent text-gray-500 dark:text-gray-400 text-xs cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-400">Heading (degrees)</label>
                <input
                  type="text"
                  value={simHeading}
                  onChange={(e) => setSimHeading(e.target.value)}
                  className="w-full h-8 px-2 mt-1 rounded bg-gray-50 border dark:bg-[#121212] dark:border-neutral-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-400">Speed (km/h)</label>
                <input
                  type="text"
                  value={simSpeed}
                  onChange={(e) => setSimSpeed(e.target.value)}
                  className="w-full h-8 px-2 mt-1 rounded bg-gray-50 border dark:bg-[#121212] dark:border-neutral-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleStartSimulation}
                className="flex-1 h-9 bg-orange-600 hover:bg-orange-700 text-white font-bold text-[10px] rounded-lg"
              >
                <Play className="w-3 h-3 fill-current mr-1" />
                Simulate
              </Button>
              {simulationActive && (
                <Button
                  onClick={handleStopSimulation}
                  variant="destructive"
                  className="h-9 px-2 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg"
                >
                  <Square className="w-3 h-3 fill-current" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
  // -------------------------------------------------------------

  // Render Loader UI for intermediate loading states, wrapped with BottomNavigation
  if (status === "CHECKING_LOCATION" || status === "CHECKING_HIGHWAY" || status === "LOADING_RESTAURANTS") {
    let loadingLabel = "Finding your location...";
    if (status === "CHECKING_HIGHWAY") loadingLabel = "Pinpointing highway route...";
    if (status === "LOADING_RESTAURANTS") loadingLabel = "Searching restaurants ahead...";

    return (
      <div className="flex flex-col h-screen justify-between bg-gray-50 dark:bg-[#0a0a0a] relative">
        {renderSimPanel()}
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" />
          <p className="text-sm font-bold uppercase tracking-wider text-gray-500">{loadingLabel}</p>
        </div>
        <div className="pb-[env(safe-area-inset-bottom)] bg-white dark:bg-[#1a1a1a]">
          <BottomNavigation />
        </div>
      </div>
    );
  }

  // Render Fallbacks for non-available states, wrapped with BottomNavigation
  if (status !== "AVAILABLE") {
    if (status === "PERMISSION_REQUIRED" || status === "location_denied") {
      return (
        <div className="min-h-screen bg-white dark:bg-[#121212] flex flex-col justify-between relative">
          {renderSimPanel()}
          <div className="flex-1 overflow-y-auto pb-4">
            <DrivingLocationPermission 
              denied={status === "location_denied"}
              onEnableLocation={handleEnableLocation}
              onRetry={handleEnableLocation}
            />
          </div>
          <div className="pb-[env(safe-area-inset-bottom)] bg-white dark:bg-[#1a1a1a]">
            <BottomNavigation />
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex flex-col justify-between relative">
        {renderSimPanel()}
        <div className="flex-1 overflow-y-auto pb-4">
          <DrivingModeFallback
            status={status}
            distanceMeters={resultData?.userTravel?.distanceToHighway}
            requiredDistanceMeters={settings?.highwayEntryRadiusMeters}
            onRetry={handleRetry}
            onEnableLocation={handleEnableLocation}
            errorMessage={errorMessage}
          />
        </div>
        <div className="pb-[env(safe-area-inset-bottom)] bg-white dark:bg-[#1a1a1a]">
          <BottomNavigation />
        </div>
      </div>
    );
  }

  const nextStop = filteredRestaurants[0] || null;
  const rangeLimit = settings?.restaurantSearchRadiusKm || 50;

  return (
    <div className="relative w-full h-[calc(100vh-70px)] bg-gray-50 dark:bg-[#0a0a0a] overflow-hidden flex flex-col justify-between pb-[calc(90px+env(safe-area-inset-bottom))]">
      
      {/* Dev Sim controls trigger */}
      {renderSimPanel()}

      {/* Dev simulation indicator badge overlay */}
      {simulationActive && (
        <div className="absolute top-24 left-4 z-[21] pointer-events-auto">
          <div className="bg-orange-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg border border-orange-400 flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white"></span>
            <span>SIMULATION MODE (NH-48)</span>
          </div>
        </div>
      )}

      {/* View Toggle Bar (Floating Header) */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between gap-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md">
          <DrivingSummaryCard
            highwayRef={resultData?.highway?.ref}
            distanceAhead={nextStop?.distanceKm ?? null}
            nextStopEta={nextStop?.etaMinutes ?? null}
            restaurantCount={filteredRestaurants.length}
          />
        </div>
      </div>

      {/* Main Map or List Container */}
      <div className="flex-1 w-full relative pt-36">
        {viewMode === "map" ? (
          <DrivingMap
            userLocation={currentLocation}
            heading={heading}
            highway={resultData?.highway}
            restaurants={filteredRestaurants}
            onRestaurantClick={setSelectedRestaurant}
          />
        ) : (
          <div className="w-full h-full overflow-y-auto px-4 pb-20 space-y-4 pt-4 bg-gray-50/50 dark:bg-[#0a0a0a] pb-[calc(100px+env(safe-area-inset-bottom))]">
            {/* Top Search distance filter & sorting */}
            <div className="flex items-center justify-between gap-4 pb-2">
              {/* Range Filters */}
              <div className="flex gap-1.5 overflow-x-auto">
                {[5, 10, 20, 50].map((d) => (
                  <button
                    key={d}
                    onClick={() => setActiveDistanceLimit(d)}
                    className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${
                      activeDistanceLimit === d
                        ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 dark:bg-neutral-900 dark:text-neutral-400"
                    }`}
                  >
                    {d} km
                  </button>
                ))}
              </div>

              {/* Sorting Select */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs font-bold border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 dark:text-white px-2 py-1 rounded-lg focus:outline-none"
              >
                <option value="distance">Distance</option>
                <option value="eta">ETA</option>
                <option value="rating">Rating</option>
              </select>
            </div>

            {/* List Cards */}
            <div className="space-y-3">
              {filteredRestaurants.map((res) => (
                <DrivingRestaurantCard
                  key={res._id}
                  restaurant={res}
                  onClick={() => setSelectedRestaurant(res)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Filter and Toggle Controls */}
      <div className="absolute bottom-[100px] left-4 right-4 z-20 flex flex-col gap-3 pointer-events-none pb-[env(safe-area-inset-bottom)]">
        
        {/* Toggle Mode Button */}
        <div className="flex justify-center pointer-events-auto">
          <Button
            onClick={() => setViewMode(viewMode === "map" ? "list" : "map")}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold shadow-xl border border-white/10 shrink-0"
          >
            {viewMode === "map" ? (
              <>
                <List className="w-4 h-4 text-orange-500" />
                Show List View
              </>
            ) : (
              <>
                <Map className="w-4 h-4 text-orange-500" />
                Show Map View
              </>
            )}
          </Button>
        </div>

        {/* Horizontal filters */}
        <div className="pointer-events-auto w-full max-w-md mx-auto rounded-full overflow-hidden shadow-lg border border-gray-100 dark:border-neutral-800">
          <DrivingFilters
            activeFilter={activeFacilityFilter}
            onFilterChange={setActiveFacilityFilter}
          />
        </div>

      </div>

      {/* Detail Modal Component */}
      {selectedRestaurant && (
        <Dialog open={!!selectedRestaurant} onOpenChange={() => setSelectedRestaurant(null)}>
          <DialogContent className="max-w-md w-[calc(100vw-32px)] p-0 overflow-hidden bg-white dark:bg-[#1a1a1a] rounded-2xl border-none">
            
            {/* Cover photo / Carousel */}
            <div className="relative h-48 bg-neutral-100 dark:bg-neutral-900">
              <RestaurantImageCarousel restaurant={selectedRestaurant} />
              <div className="absolute bottom-4 left-4 right-4 z-10 flex items-end justify-between">
                <h3 className="text-xl font-black text-white leading-none">
                  {selectedRestaurant.restaurantName}
                </h3>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-green-600 text-white">
                  Open Now
                </span>
              </div>
            </div>

            {/* Content info */}
            <div className="p-4 space-y-4">
              
              {/* Distance / Highway description */}
              <div className="flex justify-between items-center bg-gray-50 dark:bg-neutral-900/60 p-3 rounded-xl border dark:border-neutral-800">
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-gray-400">Position</span>
                  <p className="text-xs font-black text-gray-800 dark:text-neutral-300">
                    {selectedRestaurant.highwayRef}, {selectedRestaurant.distanceKm} km Ahead
                  </p>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-gray-400">ETA</span>
                  <p className="text-xs font-black text-orange-600">
                    {selectedRestaurant.etaMinutes} min away
                  </p>
                </div>
              </div>

              {/* Highway Facilities details */}
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Highway Facilities</span>
                <div className="grid grid-cols-2 gap-2 mt-1.5 text-xs text-gray-700 dark:text-neutral-300">
                  <div className={`flex items-center gap-1.5 p-2 rounded-lg border ${selectedRestaurant.facilities?.parking ? 'bg-green-50/50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Parking</span>
                  </div>
                  <div className={`flex items-center gap-1.5 p-2 rounded-lg border ${selectedRestaurant.facilities?.washroom ? 'bg-green-50/50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Washroom</span>
                  </div>
                  <div className={`flex items-center gap-1.5 p-2 rounded-lg border ${selectedRestaurant.facilities?.evCharging ? 'bg-green-50/50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>EV Charging</span>
                  </div>
                  <div className={`flex items-center gap-1.5 p-2 rounded-lg border ${selectedRestaurant.facilities?.familyFriendly ? 'bg-green-50/50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Family Dining</span>
                  </div>
                </div>
              </div>

              {/* Offer section snippet */}
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Offers for You</span>
                <div className="p-3 border border-orange-100 bg-orange-50/30 rounded-xl mt-1 text-xs text-orange-950 font-medium">
                  {selectedRestaurant.offer || "10% OFF on all highway pre-orders today!"}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 dark:border-neutral-800">
                {selectedRestaurant.distanceKm > rangeLimit ? (
                  <div className="text-center p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold border border-red-200/50">
                    Restaurant is outside your driving range ({rangeLimit} KM).
                  </div>
                ) : (
                  <Button
                    onClick={() => handlePreorder(selectedRestaurant)}
                    className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md rounded-xl"
                  >
                    Pre-order Food
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => handlePreorder(selectedRestaurant)}
                  className="w-full h-11 border-gray-200 dark:border-neutral-800 text-gray-700 dark:text-neutral-300 font-bold text-sm rounded-xl"
                >
                  View Menu
                </Button>
              </div>

            </div>

          </DialogContent>
        </Dialog>
      )}

      {/* Floating Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] pb-[env(safe-area-inset-bottom)] bg-white dark:bg-[#1a1a1a] shadow-[0_-2px_10px_rgba(0,0,0,0.05)] border-t dark:border-neutral-800/80">
        <BottomNavigation />
      </div>

    </div>
  );
}
