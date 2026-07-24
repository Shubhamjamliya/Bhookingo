import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Loader2, Navigation, AlertTriangle, List, Map, ShieldAlert, CheckCircle, Clock, ChevronRight, ArrowLeft, Share2, Heart, Wifi, Star, Car, ShieldCheck } from "lucide-react";
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
import JourneyPlanner from "./components/JourneyPlanner";
import { FACILITIES_CONFIG } from "../../../utils/facilitiesConfig";

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
  const displayTotal = allImages.length || 1;
  const displayCurrent = allImages.length ? currentIndex + 1 : 1;

  return (
    <div className="relative h-52 w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
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
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? "w-3 bg-white" : "w-1.5 bg-white/50"
                }`}
            />
          ))}
        </div>
      )}

      {/* Dynamic Slide Indicator Badge */}
      <div className="absolute bottom-3 right-4 z-10 bg-black/60 text-white text-[9px] font-black px-2 py-0.5 rounded-full select-none">
        {displayCurrent}/{displayTotal}
      </div>
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

  // Unified Journey State (Restored from sessionStorage)
  const [journey, setJourney] = useState(() => {
    try {
      const stored = sessionStorage.getItem("bh_active_journey");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Sync active journey to sessionStorage
  useEffect(() => {
    if (journey) {
      sessionStorage.setItem("bh_active_journey", JSON.stringify(journey));
    } else {
      sessionStorage.removeItem("bh_active_journey");
    }
  }, [journey]);

  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const touchStartY = useRef(0);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;
    if (diff > 50) {
      setIsDrawerExpanded(true);
    } else if (diff < -50) {
      setIsDrawerExpanded(false);
    }
  };

  const toggleDrawer = () => {
    setIsDrawerExpanded(!isDrawerExpanded);
  };

  // Cleanup journey planner cache when exiting Driving Mode (only if no active trip exists)
  useEffect(() => {
    return () => {
      const newPath = window.location.pathname;
      const isStillInDrivingOrRestaurant =
        newPath.includes("/driving") ||
        newPath.includes("/restaurants") ||
        newPath.includes("/checkout");

      if (!isStillInDrivingOrRestaurant && !sessionStorage.getItem("bh_active_journey")) {
        sessionStorage.removeItem("bh_origin_input");
        sessionStorage.removeItem("bh_origin_coords");
        sessionStorage.removeItem("bh_destination_input");
        sessionStorage.removeItem("bh_destination_coords");
        sessionStorage.removeItem("bh_selected_highway");
      }
    };
  }, []);

  // Restaurant Query States
  const [resultData, setResultData] = useState(null);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const hasFetchedInitial = useRef(false);

  // Unified State Machine
  // "CHECKING_LOCATION" | "CHECKING_HIGHWAY" | "LOADING_RESTAURANTS" | "AVAILABLE" | "OUTSIDE_HIGHWAY" | "NO_RESTAURANTS" | "AUTH_ERROR" | "ERROR" | "location_denied" | "PERMISSION_REQUIRED" | "disabled"
  const [status, setStatus] = useState("CHECKING_LOCATION");
  const [errorMessage, setErrorMessage] = useState(null);

  const handleRouteCalculated = useCallback(({ routePolyline, estimatedDistance, estimatedDuration, routeBounds }) => {
    setJourney(prev => {
      if (!prev) return null;
      return {
        ...prev,
        routePolyline,
        estimatedDistance,
        estimatedDuration,
        routeBounds
      };
    });
  }, []);

  // Exit driving mode — clears journey and returns to start page
  const handleExitDriving = useCallback(() => {
    sessionStorage.removeItem("bh_active_journey");
    sessionStorage.removeItem("bh_origin_input");
    sessionStorage.removeItem("bh_origin_coords");
    sessionStorage.removeItem("bh_destination_input");
    sessionStorage.removeItem("bh_destination_coords");
    sessionStorage.removeItem("bh_selected_highway");
    setJourney(null);
    navigate("/food/user/driving", { replace: true });
  }, [navigate]);

  // Intercept browser back button — go to driving start instead of history
  useEffect(() => {
    const onPopState = () => handleExitDriving();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [handleExitDriving]);

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

  // Watch GPS Location
  useEffect(() => {
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
  }, [settingsError, loadingSettings, settings]);

  // Restaurants Query Logic with AbortController and 20s loading timeout
  const fetchRestaurantsAhead = useCallback(async (isInitial = false, activeJourney = null) => {
    const currentJourney = activeJourney || journey;
    const loc = locationRef.current;

    // Use journey origin if specified (e.g. planned route / Dev Mode mock origin), else use live GPS location
    const startLat = currentJourney?.origin?.lat ?? loc?.latitude;
    const startLng = currentJourney?.origin?.lng ?? loc?.longitude;

    if (startLat === undefined || startLng === undefined || startLat === null || startLng === null) {
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
      hasFetchedInitial.current = true;
      if (currentJourney) {
        setStatus("AVAILABLE"); // Progressive loading: keep page interactive
      } else {
        setStatus("CHECKING_HIGHWAY");
      }
      setLoadingRestaurants(true);
    } else {
      if (!currentJourney) {
        setStatus("LOADING_RESTAURANTS");
      }
    }

    // Start 20-second timeout guard
    timeoutIdRef.current = setTimeout(() => {
      controller.abort();
      setLoadingRestaurants(false);
      setStatus("ERROR");
      console.warn("[DrivingMode] Restaurant ahead query timed out (20s reached)");
    }, 20000);

    try {
      const queryParams = {
        lat: startLat,
        lng: startLng,
        heading: currentJourney ? null : headingRef.current,
        speed: currentJourney ? null : speedRef.current
      };

      if (currentJourney?.destination) {
        queryParams.destLat = currentJourney.destination.lat;
        queryParams.destLng = currentJourney.destination.lng;
      }

      if (currentJourney?.selectedHighway?._id) {
        queryParams.highwayId = currentJourney.selectedHighway._id;
      }

      const res = await userAPI.getRestaurantsAhead(queryParams, {
        signal: controller.signal
      });

      // Clear the timeout upon receiving the response
      clearTimeout(timeoutIdRef.current);

      if (res?.data?.success) {
        const data = res.data.data;
        setResultData(data);
        if (data.status === "OUT_OF_HIGHWAY" && !currentJourney) {
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
      const isCanceled =
        err?.name === "AbortError" ||
        err?.name === "CanceledError" ||
        err?.code === "ERR_CANCELED" ||
        (err?.message && String(err.message).toLowerCase().includes("canceled"));

      if (isCanceled) {
        return; // aborted or superseded request, ignore state transition
      }

      console.error("[DrivingMode] query request failure:", err);
      const isAuthError = err.response?.status === 401 || err.response?.status === 403 || err.response?.data?.message?.includes("token");
      setStatus(isAuthError ? "AUTH_ERROR" : "ERROR");
    } finally {
      if (isInitial) setLoadingRestaurants(false);
    }
  }, [journey]);

  // Trigger initial query when location or planned journey is first detected
  useEffect(() => {
    if ((currentLocation || journey?.origin) && !hasFetchedInitial.current && settings?.enabled) {
      hasFetchedInitial.current = true;
      fetchRestaurantsAhead(true, journey);
    }
  }, [currentLocation, settings, fetchRestaurantsAhead, journey]);

  // Periodic polling interval
  useEffect(() => {
    if (!currentLocation || !settings?.refreshInterval || status !== "AVAILABLE") return;

    const intervalId = setInterval(() => {
      fetchRestaurantsAhead(false);
    }, settings.refreshInterval * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [currentLocation?.latitude, currentLocation?.longitude, settings?.refreshInterval, fetchRestaurantsAhead, status]);

  // Handle Retry button
  const handleRetry = async () => {
    setSettingsError(null);
    setLocationError(null);
    setResultData(null);
    setErrorMessage(null);
    setJourney(null);
    hasFetchedInitial.current = false;

    const loadedSettings = await fetchSettings(true);
    if (!loadedSettings || loadedSettings.enabled === false) return;

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
  const filteredRestaurants = React.useMemo(() => {
    if (!resultData?.restaurants) return [];

    let list = [...resultData.restaurants];

    // Render all visible restaurants returned by backend (up to 100 km)

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
  }, [resultData?.restaurants, activeFacilityFilter, sortBy]);



  // Render Loader UI for intermediate loading states, wrapped with BottomNavigation
  if ((status === "CHECKING_LOCATION" || status === "CHECKING_HIGHWAY" || status === "LOADING_RESTAURANTS") && journey) {
    let loadingLabel = "Finding your location...";
    if (status === "CHECKING_HIGHWAY") loadingLabel = "Pinpointing highway route...";
    if (status === "LOADING_RESTAURANTS") loadingLabel = "Searching restaurants ahead...";

    return (
      <div className="flex flex-col h-screen justify-between bg-gray-50 dark:bg-[#0a0a0a] relative">
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
  if (status === "PERMISSION_REQUIRED" || status === "location_denied") {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex flex-col justify-between relative">
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

  // If no active trip exists, show the Journey Planner immediately.
  if (!journey) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex flex-col justify-between relative">
        <div className="flex-1 overflow-y-auto pb-4 animate-fade-in">
          <JourneyPlanner
            currentLocation={currentLocation}
            onJourneyPlanSelected={(plan) => {
              const initialJourney = {
                origin: plan.origin,
                destination: plan.destination,
                selectedHighway: plan.highway,
                routePolyline: [],
                estimatedDistance: "",
                estimatedDuration: "",
                routeBounds: null,
                createdAt: new Date().toISOString(),
                mode: "PLANNED"
              };
              setJourney(initialJourney);
              // Trigger reload of restaurants for this plan immediately
              fetchRestaurantsAhead(true, initialJourney);
            }}
            onGoHome={() => {
              setJourney(null);
              sessionStorage.removeItem("bh_active_journey");
              navigate("/food/user/takeaway");
            }}
          />
        </div>
        <div className="pb-[env(safe-area-inset-bottom)] bg-white dark:bg-[#1a1a1a]">
          <BottomNavigation />
        </div>
      </div>
    );
  }

  if (status !== "AVAILABLE") {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex flex-col justify-between relative">
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
    <div className="relative w-full h-screen bg-gray-50 dark:bg-[#0a0a0a] overflow-hidden flex flex-col justify-between">

      {/* View Toggle Bar (Floating Header) */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between gap-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md">
          <DrivingSummaryCard
            highwayRef={resultData?.highway?.ref || journey?.selectedHighway?.ref}
            distanceAhead={nextStop?.distanceKm ?? null}
            nextStopEta={nextStop?.etaMinutes ?? null}
            restaurantCount={filteredRestaurants.length}
            onExit={handleExitDriving}
          />
        </div>
      </div>

      {/* Main Map or List Container */}
      <div className="flex-1 w-full relative">
        {viewMode === "map" ? (
          <DrivingMap
            userLocation={currentLocation || (journey ? { latitude: journey.origin.lat, longitude: journey.origin.lng } : null)}
            destinationLocation={journey?.destination}
            journey={journey}
            onRouteCalculated={handleRouteCalculated}
            heading={heading}
            highway={resultData?.highway}
            restaurants={filteredRestaurants}
            onRestaurantClick={setSelectedRestaurant}
            recenterBottomOffset={isDrawerExpanded ? "hidden" : "bottom-[230px]"}
          />
        ) : (
          <div className="w-full h-full overflow-y-auto px-4 pb-20 space-y-4 pt-40 bg-gray-50/50 dark:bg-[#0a0a0a] pb-[calc(100px+env(safe-area-inset-bottom))]">
            {/* Top Search distance filter & sorting */}
            <div className="flex items-center justify-between gap-4 pb-2">
              {/* Range Filters */}
              <div className="flex gap-1.5 overflow-x-auto">
                {[5, 10, 20, 50].map((d) => (
                  <button
                    key={d}
                    onClick={() => setActiveDistanceLimit(d)}
                    className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${activeDistanceLimit === d
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

      {/* Floating Bottom Toggle Control */}
      <div className={`absolute z-20 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom)] left-4 right-4 transition-all duration-300 ${viewMode !== "map"
        ? "bottom-[138px] opacity-100 scale-100"
        : (isDrawerExpanded ? "bottom-[calc(100vh-140px)] opacity-0 scale-0 pointer-events-none" : "bottom-[230px] opacity-100 scale-100")
        }`}>
        <Button
          onClick={() => setViewMode(viewMode === "map" ? "list" : "map")}
          className="pointer-events-auto flex items-center gap-2 px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold shadow-xl border border-white/10 shrink-0"
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

      {/* Edge-to-Edge Bottom Filters / Drawer Panel */}
      {viewMode === "map" ? (
        <div
          style={{ height: isDrawerExpanded ? "calc(100vh - 160px)" : "220px" }}
          className="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto w-full max-w-md mx-auto bg-white dark:bg-[#111111] border-t dark:border-neutral-800/80 rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] flex flex-col transition-all duration-300 overflow-hidden"
        >
          {/* Drag Handle Top Bar */}
          <div
            onClick={toggleDrawer}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="w-full cursor-pointer bg-white dark:bg-[#111111] py-1 shrink-0 flex flex-col items-center select-none"
          >
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-neutral-800 rounded-full my-1" />
          </div>

          {/* Category Filters (Fixed Header) */}
          <DrivingFilters
            activeFilter={activeFacilityFilter}
            onFilterChange={setActiveFacilityFilter}
          />

          {/* Restaurants List Container */}
          <div className={`flex-1 px-4 ${isDrawerExpanded ? "overflow-y-auto pb-28 filters-scroll-hide" : "pb-4 overflow-hidden"}`}>
            {/* Header Row */}
            <div className="flex items-center justify-between py-3 border-b dark:border-neutral-900/60 mb-3 bg-white dark:bg-[#111111] sticky top-0 z-10">
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                Restaurants Ahead ({activeDistanceLimit} km)
              </h3>

              {/* Sort Select */}
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

            {/* List of Cards */}
            <div className="space-y-3">
              {filteredRestaurants.length > 0 ? (
                (isDrawerExpanded ? filteredRestaurants : filteredRestaurants.slice(0, 1)).map((res) => (
                  <DrivingRestaurantCard
                    key={res._id}
                    restaurant={res}
                    onClick={() => setSelectedRestaurant(res)}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-xs text-gray-400 font-bold uppercase tracking-wider">
                  No restaurants found ahead
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-[60px] left-0 right-0 z-20 pointer-events-auto w-full pb-[env(safe-area-inset-bottom)]">
          <DrivingFilters
            activeFilter={activeFacilityFilter}
            onFilterChange={setActiveFacilityFilter}
          />
        </div>
      )}

      {/* Detail Modal Component */}
      {selectedRestaurant && (
        <Dialog open={!!selectedRestaurant} onOpenChange={() => setSelectedRestaurant(null)}>
          <DialogContent className="max-w-md w-[calc(100vw-32px)] p-0 overflow-hidden bg-white dark:bg-[#111111] rounded-2xl border-none shadow-2xl">

            {/* Cover photo / Carousel with absolute overlays */}
            <div className="relative h-52 bg-neutral-100 dark:bg-neutral-900">
              <RestaurantImageCarousel restaurant={selectedRestaurant} />

              {/* Back Arrow button */}
              <button
                onClick={() => setSelectedRestaurant(null)}
                className="absolute top-4 left-4 z-20 w-9 h-9 bg-white/90 dark:bg-neutral-900/90 hover:bg-white dark:hover:bg-neutral-900 text-gray-800 dark:text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all border-none focus:outline-none cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Share & Favorite buttons */}
              <div className="absolute top-4 right-4 z-20 flex gap-2">
                <button className="w-9 h-9 bg-white/90 dark:bg-neutral-900/90 hover:bg-white dark:hover:bg-neutral-900 text-gray-800 dark:text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all border-none focus:outline-none cursor-pointer">
                  <Share2 className="w-4.5 h-4.5" />
                </button>
                <button className="w-9 h-9 bg-white/90 dark:bg-neutral-900/90 hover:bg-white dark:hover:bg-neutral-900 text-gray-800 dark:text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all border-none focus:outline-none cursor-pointer">
                  <Heart className="w-4.5 h-4.5 text-red-500 fill-current" />
                </button>
              </div>
            </div>

            {/* Content Details Area */}
            <div className="p-5 space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto filters-scroll-hide">

              {/* Title & Status Row */}
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight flex items-center gap-1.5">
                    {selectedRestaurant.restaurantName}
                    <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 fill-current" />
                  </h3>
                  <p className="text-xs font-bold text-gray-400 dark:text-neutral-500 mt-1">
                    {selectedRestaurant.highwayRef}, {selectedRestaurant.distanceKm} km Ahead
                  </p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border border-green-200 text-green-700 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900/40">
                    Open
                  </span>
                  <span className="text-xs font-black text-orange-600 flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-orange-500 fill-current" />
                    {selectedRestaurant.etaMinutes} min
                  </span>
                </div>
              </div>

              {/* Rating & Tag Info Chips */}
              <div className="flex items-center flex-wrap gap-2 text-[10px] font-bold text-gray-500 dark:text-neutral-400">
                {selectedRestaurant.rating && selectedRestaurant.rating > 0 ? (
                  <>
                    <div className="flex items-center gap-0.5 bg-green-700 text-white px-1.5 py-0.5 rounded shrink-0">
                      <span>{selectedRestaurant.rating.toFixed(1)}</span>
                      <Star className="w-2.5 h-2.5 fill-current text-white" />
                    </div>
                    {selectedRestaurant.totalRatings && (
                      <span className="text-gray-400 dark:text-neutral-500">({selectedRestaurant.totalRatings} Ratings)</span>
                    )}
                    <span className="text-gray-300 dark:text-neutral-800">•</span>
                  </>
                ) : null}
                <span className="truncate max-w-[120px]">{selectedRestaurant.cuisines?.length ? selectedRestaurant.cuisines.join(", ") : "North Indian, Punjabi"}</span>
                <span className="text-gray-300 dark:text-neutral-800">•</span>
                <span>₹₹</span>
                {selectedRestaurant.facilities?.familyFriendly && (
                  <>
                    <span className="text-gray-300 dark:text-neutral-800">•</span>
                    <span className="text-orange-600 dark:text-orange-400 font-extrabold">Family Friendly</span>
                  </>
                )}
              </div>

              {/* Facilities Grid (Render only active dynamic cards) */}
              {(selectedRestaurant.facilities?.parking ||
                selectedRestaurant.facilities?.washroom ||
                selectedRestaurant.facilities?.evCharging ||
                selectedRestaurant.facilities?.wifi) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {/* Parking Card */}
                    {selectedRestaurant.facilities?.parking && (
                      <div className="flex flex-col items-center justify-between p-2 rounded-xl border border-gray-100 dark:border-neutral-900/60 bg-gray-50/30 dark:bg-[#151515] text-center min-w-[72px] flex-1 min-h-[64px]">
                        <span className="text-base">🅿️</span>
                        <span className="text-[9px] font-bold text-gray-700 dark:text-neutral-300 mt-1">Parking</span>
                      </div>
                    )}

                    {/* Washroom Card */}
                    {selectedRestaurant.facilities?.washroom && (
                      <div className="flex flex-col items-center justify-between p-2 rounded-xl border border-gray-100 dark:border-neutral-900/60 bg-gray-50/30 dark:bg-[#151515] text-center min-w-[72px] flex-1 min-h-[64px]">
                        <span className="text-base">🚻</span>
                        <span className="text-[9px] font-bold text-gray-700 dark:text-neutral-300 mt-1">Washroom</span>
                      </div>
                    )}

                    {/* EV Charging Card */}
                    {selectedRestaurant.facilities?.evCharging && (
                      <div className="flex flex-col items-center justify-between p-2 rounded-xl border border-gray-100 dark:border-neutral-900/60 bg-gray-50/30 dark:bg-[#151515] text-center min-w-[72px] flex-1 min-h-[64px]">
                        <span className="text-base">⚡</span>
                        <span className="text-[9px] font-bold text-gray-700 dark:text-neutral-300 mt-1">EV Charging</span>
                      </div>
                    )}

                    {/* Wi-Fi Card */}
                    {selectedRestaurant.facilities?.wifi && (
                      <div className="flex flex-col items-center justify-between p-2 rounded-xl border border-gray-100 dark:border-neutral-900/60 bg-gray-50/30 dark:bg-[#151515] text-center min-w-[72px] flex-1 min-h-[64px]">
                        <span className="text-base">📶</span>
                        <span className="text-[9px] font-bold text-gray-700 dark:text-neutral-300 mt-1">Wi-Fi</span>
                      </div>
                    )}
                  </div>
                )}

              {/* Facilities Ratings Section */}
              {(() => {
                const renderStars = (rating) => {
                  const rounded = Math.round(rating || 0);
                  return (
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${s <= rounded
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300 dark:text-neutral-700 fill-none stroke-[1.5]"
                            }`}
                        />
                      ))}
                    </div>
                  );
                };

                const overallFacilityRatingObj = selectedRestaurant.facilityRatings?.overall;
                const overallFacilityAvg = overallFacilityRatingObj?.average || 0;
                const overallFacilityCount = overallFacilityRatingObj?.count || 0;

                const restaurantFacilities = selectedRestaurant.facilities || {};
                const activeFacilities = FACILITIES_CONFIG.filter(f => restaurantFacilities[f.key] === true);

                if (activeFacilities.length === 0) return null;

                return (
                  <div className="bg-gray-50/20 dark:bg-neutral-900/10 p-3 rounded-2xl border border-gray-100 dark:border-neutral-900 space-y-3">
                    {/* Overall Facilities Header Summary */}
                    <div className="flex justify-between items-center pb-2 border-b border-gray-150 dark:border-neutral-900/60">
                      <span className="text-xs font-black text-gray-900 dark:text-white">Facilities Ratings</span>
                      {overallFacilityCount > 0 ? (
                        <div className="flex items-center gap-2">
                          {renderStars(overallFacilityAvg)}
                          <span className="text-xs font-black text-gray-800 dark:text-neutral-200">{overallFacilityAvg.toFixed(1)}</span>
                          <span className="text-[9px] font-bold text-gray-400 dark:text-neutral-500">Based on {overallFacilityCount} rating{overallFacilityCount > 1 ? 's' : ''}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400">No ratings yet</span>
                      )}
                    </div>

                    {/* Individual Facility Ratings */}
                    <div className="space-y-2">
                      {activeFacilities.map((fac) => {
                        const stats = selectedRestaurant.facilityRatings?.[fac.key] || {};
                        const avg = stats.average || 0;
                        const count = stats.count || 0;

                        return (
                          <div key={fac.key} className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-gray-700 dark:text-neutral-300">{fac.emoji} {fac.label}</span>
                            <div className="flex items-center gap-2">
                              {renderStars(avg)}
                              {count > 0 ? (
                                <>
                                  <span className="text-gray-900 dark:text-white font-extrabold">{avg.toFixed(1)}</span>
                                  <span className="text-[9px] text-gray-400 font-medium">({count})</span>
                                </>
                              ) : (
                                <span className="text-gray-450 dark:text-neutral-500 font-medium">No ratings yet</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Offers Section */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-gray-900 dark:text-white">Offers for You</span>
                  <button className="text-xs font-black text-orange-600 bg-transparent border-none p-0 focus:outline-none">View All</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Offer 1 */}
                  <div className="p-3 rounded-xl border border-orange-100 dark:border-neutral-900 bg-orange-50/20 dark:bg-neutral-950/20 flex flex-col justify-between min-h-[96px]">
                    <div>
                      <h5 className="text-xs font-black text-orange-600">10% OFF</h5>
                      <p className="text-[10px] font-extrabold text-gray-800 dark:text-neutral-300 mt-0.5">Up to ₹100</p>
                      <p className="text-[8px] font-bold text-gray-400 mt-1">On Pre-order • Valid today</p>
                    </div>
                    <button className="w-full mt-2 py-1 text-[9px] font-extrabold text-orange-600 hover:text-white hover:bg-orange-500 border border-orange-500 rounded bg-white dark:bg-neutral-900 transition-all cursor-pointer">
                      Apply
                    </button>
                  </div>
                  {/* Offer 2 */}
                  <div className="p-3 rounded-xl border border-orange-100 dark:border-neutral-900 bg-orange-50/20 dark:bg-neutral-950/20 flex flex-col justify-between min-h-[96px]">
                    <div>
                      <h5 className="text-xs font-black text-orange-600">20% OFF</h5>
                      <p className="text-[10px] font-extrabold text-gray-800 dark:text-neutral-300 mt-0.5">Up to ₹200</p>
                      <p className="text-[8px] font-bold text-gray-400 mt-1">On Table Booking • Valid today</p>
                    </div>
                    <button className="w-full mt-2 py-1 text-[9px] font-extrabold text-orange-600 hover:text-white hover:bg-orange-500 border border-orange-500 rounded bg-white dark:bg-neutral-900 transition-all cursor-pointer">
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons (View Menu & Book Table split) */}
              <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-neutral-900/60">
                <Button
                  variant="outline"
                  onClick={() => handlePreorder(selectedRestaurant)}
                  className="w-1/2 h-11 border-orange-500 hover:bg-orange-50 text-orange-600 dark:text-orange-400 font-extrabold text-sm rounded-xl transition-all"
                >
                  View Menu
                </Button>
                <Button
                  onClick={() => handlePreorder(selectedRestaurant)}
                  className="w-1/2 h-11 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm shadow-md rounded-xl transition-all"
                >
                  Book a Table
                </Button>
              </div>

              {/* Primary Pre-order Food bar button */}
              <div
                onClick={() => handlePreorder(selectedRestaurant)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white p-3.5 rounded-2xl flex items-center justify-between shadow-lg shadow-orange-600/15 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Compass className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div className="text-left leading-none">
                    <span className="text-xs font-black text-white block">Pre-order Food</span>
                    <span className="text-[8px] text-white/80 block mt-1">Order now & pick up/serve on arrival</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white" />
              </div>

            </div>

          </DialogContent>
        </Dialog>
      )}

      {/* Bottom Navigation Bar */}
      <BottomNavigation />

    </div>
  );
}
