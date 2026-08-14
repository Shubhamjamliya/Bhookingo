import React, { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, useNavigate } from "react-router-dom";
import { Compass, Loader2, Navigation, AlertTriangle, List, Map, ShieldAlert, CheckCircle, Clock, ChevronRight, ChevronDown, ChevronUp, ArrowLeft, Share2, Heart, Wifi, Star, Car, ShieldCheck, BellRing, MapPin } from "lucide-react";
import { toast } from "sonner";
import { userAPI, restaurantAPI, orderAPI } from "@food/api";
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
import { DrivingModeSkeleton } from "@food/components/ui/loading-skeletons";
import { getFacilityAvailability, getFacilityRatingEntry, getOverallFacilityRatingEntry } from "@food/utils/facilityHelpers";

const readSessionJson = (key, fallback = null) => {
  try {
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const DRIVING_JOURNEY_KEY = "bh_active_journey";
const DRIVING_RESULT_KEY = "bh_driving_result_data";
const DRIVING_STATUS_KEY = "bh_driving_status";
const DRIVING_ROUTE_RESULTS_KEY = "bh_driving_route_results";
const GEOLOCATION_TIMEOUT_MS = 30000;
const RESTAURANT_QUERY_TIMEOUT_MS = 35000;
const GEOLOCATION_MAX_AGE_MS = 15000;
const NEXT_STOP_ALERT_DISTANCE_KM = 2.5;
const NEXT_STOP_ALERT_COOLDOWN_MS = 90000;
const PASSED_RESTAURANT_BUFFER_KM = 0.8;
const ROUTE_SNAP_MAX_DISTANCE_KM = 3;
const DRIVING_REFRESH_INTERVAL_MINUTES = 5;

const buildRouteCacheKey = (journeyLike) => {
  if (!journeyLike) return "";
  const origin = journeyLike.origin || {};
  const destination = journeyLike.destination || {};
  const routeId = journeyLike.selectedRouteId || journeyLike.selectedHighway?.routeId || journeyLike.selectedHighway?._id || "route";
  return [routeId, origin.lat ?? "", origin.lng ?? "", destination.lat ?? "", destination.lng ?? ""].join(":");
};

const clearDrivingCache = () => {
  sessionStorage.removeItem(DRIVING_JOURNEY_KEY);
  sessionStorage.removeItem(DRIVING_RESULT_KEY);
  sessionStorage.removeItem(DRIVING_STATUS_KEY);
  sessionStorage.removeItem(DRIVING_ROUTE_RESULTS_KEY);
};

const getRestaurantLatLng = (restaurant) => {
  const loc = restaurant?.location || {};
  const lat = Number(loc?.latitude ?? loc?.lat ?? (Array.isArray(loc?.coordinates) ? loc.coordinates[1] : null));
  const lng = Number(loc?.longitude ?? loc?.lng ?? (Array.isArray(loc?.coordinates) ? loc.coordinates[0] : null));
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const getDistanceBetweenKm = (from, to) => {
  if (!from || !to) return null;
  const lat1 = Number(from.lat ?? from.latitude);
  const lng1 = Number(from.lng ?? from.longitude);
  const lat2 = Number(to.lat ?? to.latitude);
  const lng2 = Number(to.lng ?? to.longitude);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;

  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const normalizeLatLng = (point) => {
  if (!point) return null;

  if (Array.isArray(point) && point.length >= 2) {
    const lng = Number(point[0]);
    const lat = Number(point[1]);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }

  const lat = Number(point.lat ?? point.latitude);
  const lng = Number(point.lng ?? point.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const getJourneyActivePath = (journeyLike) => {
  if (!journeyLike) return [];

  const selectedRouteKey = journeyLike.selectedRouteId || journeyLike.selectedHighway?._id || journeyLike.selectedHighway?.routeId;
  const cachedPath = selectedRouteKey ? journeyLike.routeGeometryCache?.[selectedRouteKey]?.activePath : null;
  if (Array.isArray(cachedPath) && cachedPath.length > 1) {
    return cachedPath.map(normalizeLatLng).filter(Boolean);
  }

  const selectedCoordinates = journeyLike.selectedHighway?.coordinates;
  if (Array.isArray(selectedCoordinates) && selectedCoordinates.length > 1) {
    return selectedCoordinates.map(normalizeLatLng).filter(Boolean);
  }

  const routePolyline = journeyLike.routePolyline;
  if (Array.isArray(routePolyline) && routePolyline.length > 1) {
    return routePolyline.map(normalizeLatLng).filter(Boolean);
  }

  return [];
};

const buildRoutePathMetrics = (path = []) => {
  if (!Array.isArray(path) || path.length < 2) return null;

  const normalizedPath = path.map(normalizeLatLng).filter(Boolean);
  if (normalizedPath.length < 2) return null;

  const cumulativeKm = [0];
  for (let index = 1; index < normalizedPath.length; index += 1) {
    const stepKm = getDistanceBetweenKm(normalizedPath[index - 1], normalizedPath[index]) ?? 0;
    cumulativeKm[index] = cumulativeKm[index - 1] + stepKm;
  }

  return {
    path: normalizedPath,
    cumulativeKm,
    totalKm: cumulativeKm[cumulativeKm.length - 1] || 0
  };
};

const getRouteProgressSnapshot = (routeMetrics, point) => {
  const normalizedPoint = normalizeLatLng(point);
  if (!routeMetrics?.path || routeMetrics.path.length < 2 || !normalizedPoint) return null;

  const lngScale = Math.max(0.000001, Math.cos((normalizedPoint.lat * Math.PI) / 180));
  const px = normalizedPoint.lng * lngScale;
  const py = normalizedPoint.lat;
  let best = null;

  for (let index = 0; index < routeMetrics.path.length - 1; index += 1) {
    const start = routeMetrics.path[index];
    const end = routeMetrics.path[index + 1];
    const ax = start.lng * lngScale;
    const ay = start.lat;
    const bx = end.lng * lngScale;
    const by = end.lat;
    const abx = bx - ax;
    const aby = by - ay;
    const segmentLengthSq = (abx * abx) + (aby * aby);
    const rawT = segmentLengthSq <= 0 ? 0 : (((px - ax) * abx) + ((py - ay) * aby)) / segmentLengthSq;
    const t = Math.max(0, Math.min(1, rawT));
    const snappedPoint = {
      lat: ay + (aby * t),
      lng: (ax + (abx * t)) / lngScale
    };
    const lateralDistanceKm = getDistanceBetweenKm(normalizedPoint, snappedPoint);
    const segmentDistanceKm = getDistanceBetweenKm(start, end) ?? 0;
    const distanceAlongKm = (routeMetrics.cumulativeKm[index] ?? 0) + (segmentDistanceKm * t);

    if (!best || lateralDistanceKm < best.lateralDistanceKm) {
      best = {
        snappedPoint,
        lateralDistanceKm,
        distanceAlongKm,
        segmentIndex: index
      };
    }
  }

  return best;
};

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
  const [liveTravelPosition, setLiveTravelPosition] = useState(null);
  const [isNextStopAlertOpen, setIsNextStopAlertOpen] = useState(false);
  const [heading, setHeading] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [orderedRestaurantIds, setOrderedRestaurantIds] = useState(new Set());

  useEffect(() => {
    let isMounted = true;
    const fetchActiveOrders = async () => {
      try {
        const res = await orderAPI.getOrders({ limit: 50, page: 1 });
        let orders = [];
        if (res?.data?.success && res?.data?.data?.orders) {
          orders = res.data.data.orders;
        } else if (res?.data?.orders) {
          orders = res.data.orders;
        } else if (res?.data?.data?.data && Array.isArray(res.data.data.data)) {
          orders = res.data.data.data;
        }
        
        const activeIds = new Set();
        orders.forEach(order => {
          const status = (order.status || order.orderStatus || "").toLowerCase();
          if (!["delivered", "cancelled", "completed", "failed", "canceled"].includes(status)) {
            const rId = order.restaurant?._id || order.restaurantId?._id || order.restaurantId || order.restaurant;
            if (rId) activeIds.add(String(rId));
          }
        });
        if (isMounted) setOrderedRestaurantIds(activeIds);
      } catch (err) {
        // ignore
      }
    };
    fetchActiveOrders();
    return () => { isMounted = false; };
  }, []);

  const restoredJourney = readSessionJson(DRIVING_JOURNEY_KEY, null);
  const restoredResultData = readSessionJson(DRIVING_RESULT_KEY, null);
  const restoredStatus = typeof window !== "undefined" ? sessionStorage.getItem(DRIVING_STATUS_KEY) : null;

  // Unified Journey State (Restored from sessionStorage)
  const [journey, setJourney] = useState(() => {
    try {
      return restoredJourney;
    } catch {
      return null;
    }
  });

  // Sync active journey to sessionStorage
  useEffect(() => {
    if (journey) {
      sessionStorage.setItem(DRIVING_JOURNEY_KEY, JSON.stringify(journey));
    } else {
      sessionStorage.removeItem(DRIVING_JOURNEY_KEY);
    }
  }, [journey]);



  // Cleanup journey planner cache when exiting Driving Mode (only if no active trip exists)
  useEffect(() => {
    return () => {
      const newPath = window.location.pathname;
      const isStillInDrivingOrRestaurant =
        newPath.includes("/driving") ||
        newPath.includes("/restaurants") ||
        newPath.includes("/checkout");

      if (!isStillInDrivingOrRestaurant && !sessionStorage.getItem(DRIVING_JOURNEY_KEY)) {
        // intentionally keeping origin/destination in localStorage so it remains filled
      }
    };
  }, []);

  // Restaurant Query States
  const [resultData, setResultData] = useState(() => restoredResultData);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const hasFetchedInitial = useRef(Boolean(restoredJourney && restoredResultData));

  // Unified State Machine
  // "CHECKING_LOCATION" | "CHECKING_HIGHWAY" | "LOADING_RESTAURANTS" | "AVAILABLE" | "OUTSIDE_HIGHWAY" | "NO_RESTAURANTS" | "AUTH_ERROR" | "ERROR" | "location_denied" | "PERMISSION_REQUIRED" | "disabled"
  const [status, setStatus] = useState(() => (restoredJourney && restoredResultData ? (restoredStatus || "AVAILABLE") : "CHECKING_LOCATION"));
  const [errorMessage, setErrorMessage] = useState(null);

  const handleRouteCalculated = useCallback(({ routePolyline, estimatedDistance, estimatedDuration, routeBounds, routeGeometryCacheEntry }) => {
    setJourney(prev => {
      if (!prev) return null;
      const nextRouteGeometryCache = { ...(prev.routeGeometryCache || {}) };

      if (routeGeometryCacheEntry?.routeId && Array.isArray(routeGeometryCacheEntry.activePath) && routeGeometryCacheEntry.activePath.length >= 2) {
        nextRouteGeometryCache[routeGeometryCacheEntry.routeId] = {
          ...(nextRouteGeometryCache[routeGeometryCacheEntry.routeId] || {}),
          activePath: routeGeometryCacheEntry.activePath
        };
      }

      if (routeGeometryCacheEntry?.allRoutes && typeof routeGeometryCacheEntry.allRoutes === "object") {
        Object.entries(routeGeometryCacheEntry.allRoutes).forEach(([routeId, routeCache]) => {
          if (!routeId || !Array.isArray(routeCache?.activePath) || routeCache.activePath.length < 2) return;
          nextRouteGeometryCache[routeId] = {
            ...(nextRouteGeometryCache[routeId] || {}),
            activePath: routeCache.activePath
          };
        });
      }

      return {
        ...prev,
        routePolyline,
        estimatedDistance,
        estimatedDuration,
        routeBounds,
        routeGeometryCache: nextRouteGeometryCache
      };
    });
  }, []);

  useEffect(() => {
    if (resultData) {
      sessionStorage.setItem(DRIVING_RESULT_KEY, JSON.stringify(resultData));
    } else {
      sessionStorage.removeItem(DRIVING_RESULT_KEY);
    }
  }, [resultData]);

  useEffect(() => {
    if (status) {
      sessionStorage.setItem(DRIVING_STATUS_KEY, status);
    }
  }, [status]);

  // Exit driving mode — clears journey and returns to start page
  const handleExitDriving = useCallback(() => {
    sessionStorage.removeItem(DRIVING_JOURNEY_KEY);
    clearDrivingCache();
    // Intentionally keeping form inputs in localStorage
    setJourney(null);
    navigate("/food/user/driving", { replace: true });
  }, [navigate]);

  // Intercept browser back button — go to driving start instead of history
  useEffect(() => {
    const onPopState = () => handleExitDriving();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [handleExitDriving]);

  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const suppressHandleClickRef = useRef(false);
  const toggleDrawer = useCallback(() => {
    if (suppressHandleClickRef.current) {
      suppressHandleClickRef.current = false;
      return;
    }
    setIsDrawerExpanded((prev) => !prev);
  }, []);

  const scrollContainerRef = useRef(null);
  const touchStartYRef = useRef(0);
  const touchMoveYRef = useRef(0);
  const isDraggingRef = useRef(false);

  const handleTouchStart = (e) => {
    touchStartYRef.current = e.touches ? e.touches[0].clientY : e.clientY;
    touchMoveYRef.current = touchStartYRef.current;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current) return;
    touchMoveYRef.current = e.touches ? e.touches[0].clientY : e.clientY;
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    
    const deltaY = touchMoveYRef.current - touchStartYRef.current;
    if (Math.abs(deltaY) > 10) {
      suppressHandleClickRef.current = true;
    }
    
    // Check if the scroll container is scrolled down. If it is, and the user is swiping down, we shouldn't collapse the drawer.
    const isScrolledDown = scrollContainerRef.current && scrollContainerRef.current.scrollTop > 0;
    
    if (deltaY < -18) {
      setIsDrawerExpanded(true);
    } else if (deltaY > 18) {
      // Only collapse if we are at the top of the scroll container
      if (!isScrolledDown) {
        setIsDrawerExpanded(false);
      }
    }
    window.setTimeout(() => {
      suppressHandleClickRef.current = false;
    }, 120);
  };

  // View States
  const [viewMode, setViewMode] = useState("map"); // "map" | "list"
  const [activeFacilityFilter, setActiveFacilityFilter] = useState("all");
  const [activeDistanceLimit, setActiveDistanceLimit] = useState(null); // null means show all returned route restaurants
  const [sortBy, setSortBy] = useState("distance"); // "distance" | "eta" | "rating"

  // Details Modal State
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const lastSelectedRestaurantRef = useRef(null);
  if (selectedRestaurant) lastSelectedRestaurantRef.current = selectedRestaurant;
  const displayRestaurant = selectedRestaurant || lastSelectedRestaurantRef.current;
  const [restaurantOffers, setRestaurantOffers] = useState([]);
  const [isRoutePickerOpen, setIsRoutePickerOpen] = useState(false);

  const profileContext = useProfile?.() || {};
  const { isFavorite, addFavorite, removeFavorite } = profileContext;
  const distanceFilterOptions = React.useMemo(() => {
    if (!settings) return [];

    const options = [];
    if (settings.showAllRouteRestaurants === true) {
      options.push(null);
    }

    const numericOptions = [Number(settings.googleRouteForwardRangeKm)]
      .filter((value) => Number.isFinite(value) && value > 0)
      .filter((value, index, array) => array.indexOf(value) === index)
      .sort((a, b) => a - b);

    options.push(...numericOptions);
    return options;
  }, [settings]);

  useEffect(() => {
    if (!distanceFilterOptions.length) return;
    if (activeDistanceLimit === null && distanceFilterOptions.includes(null)) return;
    if (activeDistanceLimit !== null && distanceFilterOptions.includes(activeDistanceLimit)) return;
    setActiveDistanceLimit(distanceFilterOptions[0] ?? null);
  }, [distanceFilterOptions, activeDistanceLimit]);

  useEffect(() => {
    if (!selectedRestaurant) {
      setRestaurantOffers([]);
      return;
    }
    let isMounted = true;
    const fetchOffers = async () => {
      try {
        const getOffersFn = restaurantAPI?.getPublicOffers || userAPI?.getPublicOffers;
        if (!getOffersFn) {
          if (isMounted) setRestaurantOffers([]);
          return;
        }
        const response = await getOffersFn();
        const data = response?.data?.data;
        const allOffers = data?.allOffers || (Array.isArray(data) ? data : []);
        const resId = String(selectedRestaurant._id || selectedRestaurant.id || '');

        const validOffers = allOffers.filter(offer => {
          if (offer.status && offer.status !== 'active') return false;
          if (offer.endDate && new Date(offer.endDate) < new Date()) return false;
          if (offer.restaurantScope === 'selected') {
            const offerResId = String(offer.restaurantId?._id || offer.restaurantId || '');
            if (offerResId !== resId) return false;
          }
          return true;
        });

        if (isMounted) setRestaurantOffers(validOffers);
      } catch (e) {
        if (isMounted) setRestaurantOffers([]);
      }
    };
    fetchOffers();
    return () => { isMounted = false; };
  }, [selectedRestaurant]);

  const handleShare = async () => {
    if (!selectedRestaurant) return;
    const shareData = {
      title: selectedRestaurant.restaurantName || "Bhookingo",
      text: `Check out ${selectedRestaurant.restaurantName} on Bhookingo!`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Restaurant link copied to clipboard");
      } catch (err) {
        toast.error("Failed to copy link");
      }
    }
  };

  const restaurantFavoriteSlug = selectedRestaurant?.restaurantSlug || selectedRestaurant?._id || selectedRestaurant?.id;
  const isFavourited = isFavorite && restaurantFavoriteSlug ? isFavorite(restaurantFavoriteSlug) : false;

  const handleToggleFavorite = () => {
    if (!selectedRestaurant || !restaurantFavoriteSlug) return;
    if (isFavourited) {
      if (removeFavorite) removeFavorite(restaurantFavoriteSlug);
      toast.success("Removed from favorites");
    } else {
      if (addFavorite) {
        addFavorite({
          id: selectedRestaurant._id || selectedRestaurant.id,
          slug: restaurantFavoriteSlug,
          restaurantName: selectedRestaurant.restaurantName,
          name: selectedRestaurant.restaurantName,
          profileImage: selectedRestaurant.profileImage || selectedRestaurant.image,
          image: selectedRestaurant.profileImage || selectedRestaurant.image,
          rating: selectedRestaurant.rating,
          cuisines: selectedRestaurant.cuisines
        });
      }
      toast.success("Added to favorites");
    }
  };

  // Geolocation refs to avoid interval closures
  const locationRef = useRef(null);
  const headingRef = useRef(null);
  const speedRef = useRef(null);
  const geoWatchIdRef = useRef(null);
  const statusRef = useRef(restoredStatus || "CHECKING_LOCATION");
  const resultDataRef = useRef(restoredResultData || null);

  // Abort handling & query timeout references
  const abortControllerRef = useRef(null);
  const timeoutIdRef = useRef(null);
  const lastNextStopAlertRef = useRef({
    restaurantId: null,
    announcedAt: 0
  });

  const playNextStopAlert = useCallback((restaurantName, distanceKm, isOrdered = false) => {
    const safeName = restaurantName || "restaurant";
    const safeDistance = Number.isFinite(distanceKm)
      ? distanceKm.toFixed(distanceKm >= 10 ? 0 : 1)
      : null;
      
    const spokenMessage = isOrdered
      ? (safeDistance ? `Order pickup alert. ${safeName} is ${safeDistance} kilometers ahead.` : `Order pickup alert. ${safeName} is ahead on your route.`)
      : (safeDistance ? `Nearby restaurant alert. ${safeName} is ${safeDistance} kilometers ahead.` : `Nearby restaurant alert. ${safeName} is ahead on your route.`);

    setIsNextStopAlertOpen(true);
    
    // Fallback visible toast in case the custom UI is missed or hidden
    toast(isOrdered ? `Order Pickup: ${safeName}` : `Next Stop: ${safeName}`, {
      description: safeDistance ? `is ${safeDistance} km ahead on your route` : 'is ahead on your route',
      duration: 10000,
    });

    // Auto-close the custom UI alert after 10 seconds
    setTimeout(() => {
      setIsNextStopAlertOpen(false);
    }, 10000);

    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(spokenMessage);
        utterance.rate = 1;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // Ignore speech synthesis issues.
    }
  }, []);

  useEffect(() => {
    locationRef.current = currentLocation;
    headingRef.current = heading;
    speedRef.current = speed;
    statusRef.current = status;
    resultDataRef.current = resultData;
  }, [currentLocation, heading, speed, status, resultData]);

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
    if (status !== "CHECKING_LOCATION" || journey?.origin) {
      return;
    }

    const timer = setTimeout(() => {
      if (statusRef.current === "CHECKING_LOCATION" && !locationRef.current) {
        console.warn(`[DrivingMode] Geolocation acquisition timed out on React side (${GEOLOCATION_TIMEOUT_MS / 1000}s)`);
        setErrorMessage("Getting live GPS is taking longer than expected. Please keep location on and try again.");
        setStatus("ERROR");
      }
    }, GEOLOCATION_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [journey?.origin, status]);

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
    if (settingsError || loadingSettings || settings?.enabled === false || journey?.origin) return;

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
        { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: GEOLOCATION_MAX_AGE_MS }
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
  }, [settingsError, loadingSettings, settings, journey?.origin]);

  // Restaurants Query Logic with AbortController and 20s loading timeout
  const fetchRestaurantsAhead = useCallback(async (isInitial = false, activeJourney = null) => {
    const currentJourney = activeJourney || journey;
    const loc = locationRef.current;

    // Use journey origin if specified (e.g. planned route / Dev Mode mock origin), else use live GPS location
    const useLiveRefreshLocation = !isInitial && Number.isFinite(loc?.latitude) && Number.isFinite(loc?.longitude);
    const startLat = useLiveRefreshLocation ? loc.latitude : (currentJourney?.origin?.lat ?? loc?.latitude);
    const startLng = useLiveRefreshLocation ? loc.longitude : (currentJourney?.origin?.lng ?? loc?.longitude);

    if (startLat === undefined || startLng === undefined || startLat === null || startLng === null) {
      setStatus("CHECKING_LOCATION");
      return;
    }

    const routeCacheKey = buildRouteCacheKey(currentJourney);
    const shouldUseCachedRouteResult = Boolean(currentJourney && routeCacheKey && (isInitial || activeJourney));
    if (shouldUseCachedRouteResult) {
      const cachedRouteResults = readSessionJson(DRIVING_ROUTE_RESULTS_KEY, {});
      const cachedEntry = cachedRouteResults?.[routeCacheKey];
      if (cachedEntry?.data) {
        setResultData(cachedEntry.data);
        setStatus(cachedEntry.status || (cachedEntry.data?.restaurants?.length ? "AVAILABLE" : "NO_RESTAURANTS"));
        setLoadingRestaurants(false);
        hasFetchedInitial.current = true;
        return;
      }
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

    timeoutIdRef.current = setTimeout(() => {
      controller.abort();
      setLoadingRestaurants(false);

      const cachedRouteResults = routeCacheKey ? readSessionJson(DRIVING_ROUTE_RESULTS_KEY, {}) : null;
      const cachedEntry = routeCacheKey ? cachedRouteResults?.[routeCacheKey] : null;
      if (cachedEntry?.data) {
        setResultData(cachedEntry.data);
        setStatus(cachedEntry.status || (cachedEntry.data?.restaurants?.length ? "AVAILABLE" : "NO_RESTAURANTS"));
        setErrorMessage("Showing cached route restaurants while live sync is slow.");
      } else if (resultDataRef.current?.restaurants?.length) {
        setStatus("AVAILABLE");
        setErrorMessage("Showing previous route restaurants while live refresh is slow.");
      } else {
        setStatus("ERROR");
        setErrorMessage("Fetching restaurants is taking longer than expected. Please try again.");
      }

      console.warn(`[DrivingMode] Restaurant ahead query timed out (${RESTAURANT_QUERY_TIMEOUT_MS / 1000}s reached)`);
    }, RESTAURANT_QUERY_TIMEOUT_MS);

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

      if (currentJourney?.selectedHighway?.polyline) {
        queryParams.routePolyline = currentJourney.selectedHighway.polyline;
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
        if (routeCacheKey) {
          const cachedRouteResults = readSessionJson(DRIVING_ROUTE_RESULTS_KEY, {});
          cachedRouteResults[routeCacheKey] = {
            data,
            status: data.status === "OUT_OF_HIGHWAY" && !currentJourney
              ? "OUTSIDE_HIGHWAY"
              : ((!data.restaurants || data.restaurants.length === 0) ? "NO_RESTAURANTS" : "AVAILABLE")
          };
          sessionStorage.setItem(DRIVING_ROUTE_RESULTS_KEY, JSON.stringify(cachedRouteResults));
        }

        if (Array.isArray(data?.restaurants) && currentJourney?.destination) {
          console.groupCollapsed(`[DrivingMode] Route restaurants (${data.restaurants.length})`);
          console.table(
            data.restaurants.map((restaurant, index) => ({
              index: index + 1,
              name: restaurant.name || restaurant.restaurantName || "-",
              highway: restaurant.highwayRef || restaurant.highwayName || "-",
              distanceKm: restaurant.distanceKm,
              etaMinutes: restaurant.etaMinutes,
              routeOffsetKm: restaurant.routeOffsetKm,
              rating: restaurant.rating,
              acceptingOrders: restaurant.isAcceptingOrders,
              approved: restaurant.status === "approved",
              city: restaurant.city || restaurant.address?.city || "-"
            }))
          );
          console.log("[DrivingMode] Route restaurants payload:", data.restaurants);
          console.groupEnd();
        }
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
    if (!currentLocation || status !== "AVAILABLE") return;

    const intervalId = setInterval(() => {
      fetchRestaurantsAhead(false);
    }, DRIVING_REFRESH_INTERVAL_MINUTES * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [currentLocation?.latitude, currentLocation?.longitude, fetchRestaurantsAhead, status]);

  // Handle Retry button
  const handleRetry = async () => {
    setSettingsError(null);
    setLocationError(null);
    setResultData(null);
    setErrorMessage(null);
    clearDrivingCache();
    setJourney(null);
    hasFetchedInitial.current = false;

    const loadedSettings = await fetchSettings(true);
    if (!loadedSettings || loadedSettings.enabled === false) return;

    handleEnableLocation();
  };

  const handleBackToPlanner = useCallback(() => {
    clearDrivingCache();
    setResultData(null);
    setSelectedRestaurant(null);
    setStatus("AVAILABLE");
    hasFetchedInitial.current = false;
    setJourney(null);
  }, []);

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
        { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: GEOLOCATION_MAX_AGE_MS }
      );
    }
  };

  // Redirect to preorder menu
  const handlePreorder = (restaurant) => {
    if (setOrderType) setOrderType("takeaway");
    setSelectedRestaurant(null);
    navigate(`/user/restaurants/${restaurant.restaurantSlug || restaurant._id}`);
  };

  const handleLiveTravelPositionChange = useCallback((nextPosition) => {
    setLiveTravelPosition((prev) => {
      if (!nextPosition) {
        return prev ? null : prev;
      }

      if (
        prev &&
        Math.abs((prev.lat ?? prev.latitude ?? 0) - nextPosition.lat) <= 0.0000004 &&
        Math.abs((prev.lng ?? prev.longitude ?? 0) - nextPosition.lng) <= 0.0000004
      ) {
        return prev;
      }

      return nextPosition;
    });
  }, []);

  const handleSelectRouteOption = useCallback((routeOption) => {
    if (!routeOption || !journey) return;

    const updatedJourney = {
      ...journey,
      selectedHighway: routeOption,
      selectedRouteId: routeOption.routeId || routeOption._id || null,
      routePolyline: Array.isArray(routeOption.coordinates) ? routeOption.coordinates : [],
      estimatedDistance: routeOption.distanceText || journey.estimatedDistance || "",
      estimatedDuration: routeOption.durationText || journey.estimatedDuration || "",
      routeBounds: routeOption.boundingBox || journey.routeBounds || null
    };

    setJourney(updatedJourney);
    setSelectedRestaurant(null);
    setIsRoutePickerOpen(false);
    fetchRestaurantsAhead(false, updatedJourney);
  }, [fetchRestaurantsAhead, journey]);

  // Filter & Sort Logic
  const filteredRestaurants = React.useMemo(() => {
    if (!resultData?.restaurants) return [];

    let list = [...resultData.restaurants];

    if (Number.isFinite(activeDistanceLimit) && activeDistanceLimit > 0) {
      list = list.filter((restaurant) => {
        const distanceKm = Number(restaurant?.distanceKm);
        return Number.isFinite(distanceKm) && distanceKm <= activeDistanceLimit;
      });
    }

    if (activeFacilityFilter !== "all") {
      if (activeFacilityFilter === "veg") {
        list = list.filter((r) => r.pureVegRestaurant === true);
      } else {
        list = list.filter((r) => r.facilities?.[activeFacilityFilter] === true);
      }
    }

    list.sort((a, b) => {
      if (sortBy === "eta") return a.etaMinutes - b.etaMinutes;
      if (sortBy === "rating") return b.rating - a.rating;
      return a.distanceKm - b.distanceKm; // default distance
    });

    return list;
  }, [resultData?.restaurants, activeDistanceLimit, activeFacilityFilter, sortBy]);

  useEffect(() => {
    if (!Array.isArray(resultData?.restaurants)) return;
    console.groupCollapsed(`[DrivingMode][Browser] API restaurants (${resultData.restaurants.length})`);
    console.table(
      resultData.restaurants.map((restaurant, index) => ({
        index: index + 1,
        id: restaurant?._id || restaurant?.id || "-",
        name: restaurant?.restaurantName || restaurant?.name || "-",
        highwayRef: restaurant?.highwayRef || restaurant?.highwayName || "-",
        distanceKm: restaurant?.distanceKm,
        etaMinutes: restaurant?.etaMinutes,
        routeOffsetKm: restaurant?.routeOffsetKm,
        city: restaurant?.city || "-",
        isHighwayRestaurant: restaurant?.isHighwayRestaurant,
      }))
    );
    console.groupEnd();
  }, [resultData?.restaurants]);

  useEffect(() => {
    console.groupCollapsed(`[DrivingMode][Browser] Filtered restaurants (${filteredRestaurants.length})`);
    console.log("filters", {
      activeDistanceLimit,
      activeFacilityFilter,
      sortBy,
    });
    console.table(
      filteredRestaurants.map((restaurant, index) => ({
        index: index + 1,
        id: restaurant?._id || restaurant?.id || "-",
        name: restaurant?.restaurantName || restaurant?.name || "-",
        highwayRef: restaurant?.highwayRef || restaurant?.highwayName || "-",
        distanceKm: restaurant?.distanceKm,
        etaMinutes: restaurant?.etaMinutes,
        routeOffsetKm: restaurant?.routeOffsetKm,
        city: restaurant?.city || "-",
      }))
    );
    console.groupEnd();
  }, [filteredRestaurants, activeDistanceLimit, activeFacilityFilter, sortBy]);

  const effectiveTravelPosition = React.useMemo(() => liveTravelPosition || (journey?.origin ? { lat: journey.origin.lat, lng: journey.origin.lng } : currentLocation), [liveTravelPosition, journey?.origin?.lat, journey?.origin?.lng, currentLocation]);
  const activeRouteMetrics = React.useMemo(() => buildRoutePathMetrics(getJourneyActivePath(journey)), [journey]);
  const nextStop = React.useMemo(() => {
    if (!filteredRestaurants.length) return null;
    if (!activeRouteMetrics || !effectiveTravelPosition) return filteredRestaurants[0] || null;

    const userProgress = getRouteProgressSnapshot(activeRouteMetrics, effectiveTravelPosition);
    if (!userProgress) return null;

    const rankedStops = filteredRestaurants
      .map((restaurant) => {
        const restaurantLocation = getRestaurantLatLng(restaurant);
        const routeProgress = getRouteProgressSnapshot(activeRouteMetrics, restaurantLocation);
        const liveDistanceKm = getDistanceBetweenKm(effectiveTravelPosition, restaurantLocation);
        return {
          restaurant,
          routeProgress,
          liveDistanceKm: Number.isFinite(liveDistanceKm) ? liveDistanceKm : Number.POSITIVE_INFINITY
        };
      })
      .filter(({ routeProgress }) => routeProgress && routeProgress.lateralDistanceKm <= ROUTE_SNAP_MAX_DISTANCE_KM)
      .sort((a, b) => {
        const progressDeltaA = a.routeProgress.distanceAlongKm - userProgress.distanceAlongKm;
        const progressDeltaB = b.routeProgress.distanceAlongKm - userProgress.distanceAlongKm;
        const aIsAhead = progressDeltaA >= -PASSED_RESTAURANT_BUFFER_KM;
        const bIsAhead = progressDeltaB >= -PASSED_RESTAURANT_BUFFER_KM;

        if (aIsAhead !== bIsAhead) return aIsAhead ? -1 : 1;
        if (aIsAhead && bIsAhead) return progressDeltaA - progressDeltaB;
        return a.liveDistanceKm - b.liveDistanceKm;
      });

    const firstAheadStop = rankedStops.find(({ routeProgress, liveDistanceKm }) => (routeProgress.distanceAlongKm - userProgress.distanceAlongKm) >= -PASSED_RESTAURANT_BUFFER_KM || liveDistanceKm < 1.2);
    if (firstAheadStop) return firstAheadStop.restaurant;

    return rankedStops[0]?.restaurant || null;
  }, [filteredRestaurants, activeRouteMetrics, effectiveTravelPosition]);

  useEffect(() => {
    console.log("[DrivingMode][Browser] Next stop", nextStop
      ? {
          id: nextStop?._id || nextStop?.id || "-",
          name: nextStop?.restaurantName || nextStop?.name || "-",
          highwayRef: nextStop?.highwayRef || nextStop?.highwayName || "-",
          distanceKm: nextStop?.distanceKm,
          etaMinutes: nextStop?.etaMinutes,
          routeOffsetKm: nextStop?.routeOffsetKm,
        }
      : null);
  }, [nextStop]);
  const nextStopId = nextStop?._id || nextStop?.id || nextStop?.restaurantSlug || null;
  const nextStopLiveDistanceKm = getDistanceBetweenKm(effectiveTravelPosition, getRestaurantLatLng(nextStop));
  const nextStopLiveEtaMinutes = React.useMemo(() => {
    if (!nextStop) return null;
    if (Number.isFinite(nextStopLiveDistanceKm)) {
      const speedKmh = Number.isFinite(speed) && speed > 0 ? speed * 3.6 : null;
      if (speedKmh && speedKmh > 3) {
        return Math.max(0, Math.round((nextStopLiveDistanceKm / speedKmh) * 60));
      }
      const baseDistanceKm = Number(nextStop?.distanceKm);
      const baseEtaMinutes = Number(nextStop?.etaMinutes);
      if (Number.isFinite(baseDistanceKm) && baseDistanceKm > 0 && Number.isFinite(baseEtaMinutes) && baseEtaMinutes >= 0) {
        return Math.max(0, Math.round((nextStopLiveDistanceKm / baseDistanceKm) * baseEtaMinutes));
      }
    }
    return Number.isFinite(Number(nextStop?.etaMinutes)) ? Number(nextStop.etaMinutes) : null;
  }, [nextStop, nextStopLiveDistanceKm, speed]);
  const visibleRouteOptions = React.useMemo(() => (Array.isArray(journey?.availableRoutes)
    ? journey.availableRoutes.filter((routeOption, index, routes) => {
      const routeKey = routeOption?.routeId || routeOption?._id;
      const hasGeometry = Boolean(routeOption?.polyline) || (Array.isArray(routeOption?.coordinates) && routeOption.coordinates.length > 1);
      const looksLikeMapRoute = typeof routeKey === "string" && routeKey.startsWith("google_route_");
      if (!routeKey || !hasGeometry || !looksLikeMapRoute) return false;

      return routes.findIndex((candidate) => (candidate?.routeId || candidate?._id) === routeKey) === index;
    })
    : []), [journey?.availableRoutes]);
  const hasMultipleRoutes = visibleRouteOptions.length > 1;
  useEffect(() => {
    if (!journey || status !== "AVAILABLE") return undefined;
    const intervalId = window.setInterval(() => {
      fetchRestaurantsAhead(false, journey);
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [journey, status, fetchRestaurantsAhead]);

  useEffect(() => {
    const isOrdered = nextStop && (
      orderedRestaurantIds.has(String(nextStop._id)) ||
      orderedRestaurantIds.has(String(nextStop.id)) ||
      orderedRestaurantIds.has(String(nextStop.restaurantSlug))
    );
    // Use a larger threshold for orders so the alert comes out earlier
    const alertThreshold = isOrdered ? 5.0 : NEXT_STOP_ALERT_DISTANCE_KM;

    if (!nextStop || !Number.isFinite(nextStopLiveDistanceKm) || nextStopLiveDistanceKm > alertThreshold) {
      return;
    }

    const nextStopIdStr = String(nextStop._id || nextStop.id || nextStop.restaurantSlug);

    const lastAlert = lastNextStopAlertRef.current;
    const now = Date.now();
    if (lastAlert.restaurantId === nextStopIdStr && (now - lastAlert.announcedAt) < NEXT_STOP_ALERT_COOLDOWN_MS) {
      return;
    }

    lastNextStopAlertRef.current = {
      restaurantId: nextStopIdStr,
      announcedAt: now
    };

    playNextStopAlert(nextStop.restaurantName || nextStop.name, nextStopLiveDistanceKm, isOrdered);
  }, [nextStop, nextStopLiveDistanceKm, playNextStopAlert, orderedRestaurantIds]);




  // Render Loader UI for intermediate loading states, wrapped with BottomNavigation
  if ((status === "CHECKING_LOCATION" || status === "CHECKING_HIGHWAY" || status === "LOADING_RESTAURANTS") && journey) {
    return (
      <div className="flex flex-col h-screen justify-between bg-gray-50 dark:bg-[#0a0a0a] relative">
        <DrivingModeSkeleton className="flex-1" />
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
    return <Navigate to="/food/user/driving" replace />;
  }

  if (status !== "AVAILABLE" && status !== "NO_RESTAURANTS") {
    return (
      <div className="min-h-screen bg-white dark:bg-[#121212] flex flex-col justify-between relative">
        <div className="flex-1 overflow-y-auto pb-4">
          <DrivingModeFallback
            status={status}
            distanceMeters={resultData?.userTravel?.distanceToHighway}
            requiredDistanceMeters={settings?.highwayEntryRadiusMeters}
            onRetry={handleRetry}
            onEnableLocation={handleEnableLocation}
            onGoBack={status === "NO_RESTAURANTS" ? handleBackToPlanner : undefined}
            errorMessage={errorMessage}
          />
        </div>
        <div className="pb-[env(safe-area-inset-bottom)] bg-white dark:bg-[#1a1a1a]">
          <BottomNavigation />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gray-50 dark:bg-[#0a0a0a] overflow-hidden flex flex-col">

      {/* Top Summary Section */}
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-center px-0 pointer-events-none">
        <div className="w-full max-w-md pointer-events-auto">
          <DrivingSummaryCard
            highwayRef={journey?.selectedHighway?.name || resultData?.highway?.ref || journey?.selectedHighway?.ref}
            distanceAhead={Number.isFinite(nextStopLiveDistanceKm) ? Number(nextStopLiveDistanceKm.toFixed(nextStopLiveDistanceKm >= 10 ? 0 : 1)) : (nextStop?.distanceKm ?? null)}
            nextStopEta={nextStopLiveEtaMinutes}
            restaurantCount={filteredRestaurants.length}
            onExit={handleExitDriving}
          />
        </div>
      </div>

      <div className="absolute top-[calc(env(safe-area-inset-top)+196px)] left-0 right-0 z-20 flex justify-center px-3 pointer-events-none">
        <div className="flex w-full max-w-md flex-col items-end gap-2 pointer-events-auto">
          {hasMultipleRoutes && (
            <button
              type="button"
              onClick={() => setIsRoutePickerOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white px-3.5 py-2 text-xs font-black uppercase tracking-[0.12em] text-gray-800 shadow-sm transition hover:border-orange-200 hover:text-orange-600 dark:border-neutral-800 dark:bg-[#151515] dark:text-white"
            >
              Route
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          )}

          <div className="flex items-end justify-end gap-2">
            {(() => {
              const isOrderedStop = nextStop && orderedRestaurantIds.has(String(nextStop._id || nextStop.id));
              const alertBorderColor = isOrderedStop ? "border-green-400 dark:border-green-900/60" : "border-orange-200 dark:border-orange-900/60";
              const alertIconBgColor = isOrderedStop ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : "bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300";
              const alertTitleColor = isOrderedStop ? "text-green-700 dark:text-green-400" : "text-orange-600";
              const alertTitleText = isOrderedStop ? "Order Pickup" : "Next Restaurant";
              const alertButtonBg = isOrderedStop ? "border-green-300 bg-green-500 text-white" : "border-orange-300 bg-orange-500 text-white";
              const alertButtonHover = isOrderedStop ? "hover:border-green-200 hover:text-green-600" : "hover:border-orange-200 hover:text-orange-600";
              
              return (
                <>
                  <div className={`overflow-hidden rounded-2xl border ${alertBorderColor} bg-white/95 shadow-lg backdrop-blur transition-all duration-300 dark:bg-[#151515]/95 ${isNextStopAlertOpen ? "max-w-[240px] translate-x-0 opacity-100" : "max-w-0 translate-x-6 opacity-0"}`}>
                    <div className="flex min-w-[210px] items-center gap-2 px-3 py-2.5">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${alertIconBgColor}`}>
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className={`text-[10px] font-black uppercase tracking-[0.12em] ${alertTitleColor}`}>{alertTitleText}</div>
                        <div className="truncate text-xs font-bold text-gray-900 dark:text-white">
                          {nextStop?.restaurantName || nextStop?.name || "No stop ahead"}
                        </div>
                        <div className="text-[11px] font-medium text-gray-500 dark:text-neutral-400">
                          {nextStop
                            ? `is ${Number.isFinite(nextStopLiveDistanceKm) ? nextStopLiveDistanceKm.toFixed(nextStopLiveDistanceKm >= 10 ? 0 : 1) : nextStop?.distanceKm ?? "-"} km from current location`
                            : "No nearby restaurant on this route"}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNextStopAlertOpen((prev) => !prev)}
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-full border shadow-sm transition ${isNextStopAlertOpen ? alertButtonBg : "border-white/80 bg-white text-gray-800 dark:border-neutral-800 dark:bg-[#151515] dark:text-white"} ${!isNextStopAlertOpen ? alertButtonHover : ""}`}
                    title="Next restaurant alert"
                  >
                    <BellRing className="h-4 w-4" />
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      <Dialog open={isRoutePickerOpen} onOpenChange={setIsRoutePickerOpen}>
        <DialogContent className="max-w-sm w-[calc(100vw-32px)] rounded-3xl border-none bg-white p-0 shadow-2xl dark:bg-[#111111]">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-neutral-800">
            <h3 className="text-base font-black text-gray-900 dark:text-white">Select Route</h3>
            <p className="mt-1 text-xs font-medium text-gray-500 dark:text-neutral-400">Choose the route you want to follow for this trip.</p>
          </div>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto px-4 py-4">
            {visibleRouteOptions.map((routeOption) => {
              const isActiveRoute = (journey?.selectedRouteId || journey?.selectedHighway?._id) === (routeOption.routeId || routeOption._id);
              return (
                <button
                  key={routeOption.routeId || routeOption._id}
                  type="button"
                  onClick={() => handleSelectRouteOption(routeOption)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${isActiveRoute
                    ? "border-orange-500 bg-orange-50/80 shadow-sm dark:bg-orange-950/20"
                    : "border-gray-200 bg-white hover:border-orange-200 dark:border-neutral-800 dark:bg-neutral-950"
                    }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-orange-600">{routeOption.name || "Route"}</span>
                    {routeOption.badges?.[0] && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-bold uppercase text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                        {routeOption.badges[0]}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 truncate text-sm font-bold text-gray-900 dark:text-white">{routeOption.ref || routeOption.name}</div>
                  <div className="mt-2 flex items-center gap-3 text-[11px] font-medium text-gray-500 dark:text-neutral-400">
                    <span>{routeOption.distanceText || `${routeOption.approxDistanceKm || "-"} km`}</span>
                    <span>{routeOption.durationText || ""}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Map or List Container */}
      <div className="flex-1 w-full relative min-h-0 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {viewMode === "map" ? (
            <motion.div
              key="driving-map-view"
              className="absolute inset-0"
              initial={{ opacity: 0, y: 18, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.99 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <DrivingMap
                userLocation={journey?.origin ? { latitude: journey.origin.lat, longitude: journey.origin.lng } : currentLocation}
                destinationLocation={journey?.destination}
                journey={journey}
                onRouteCalculated={handleRouteCalculated}
                heading={heading}
                highway={resultData?.highway}
                restaurants={filteredRestaurants}
                onRestaurantClick={setSelectedRestaurant}
                onRouteSelect={handleSelectRouteOption}
                onUserPositionChange={handleLiveTravelPositionChange}
                recenterBottomOffset={isDrawerExpanded ? "hidden" : "bottom-[230px]"}
                orderedRestaurantIds={orderedRestaurantIds}
              />
            </motion.div>
          ) : (
            <motion.div
              key="driving-list-view"
              className="absolute inset-0 w-full h-full overflow-y-auto px-4 pt-4 space-y-4 bg-gray-50/50 dark:bg-[#0a0a0a] pb-[calc(100px+env(safe-area-inset-bottom))]"
              initial={{ opacity: 0, y: 18, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.99 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Top Search distance filter & sorting */}
              <div className="flex items-center justify-between gap-4 pb-2">
                {/* Range Filters */}
                <div className="flex gap-1.5 overflow-x-auto">
                  {distanceFilterOptions.map((d) => (
                    <button
                      key={d ?? "all"}
                      onClick={() => setActiveDistanceLimit(d)}
                      className={`px-3 py-1 text-xs font-bold rounded-full border transition-all shrink-0 ${activeDistanceLimit === d
                        ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 dark:bg-neutral-900 dark:text-neutral-400"
                        }`}
                    >
                      {d === null ? "All" : `${d} km`}
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
                {filteredRestaurants.length > 0 ? (
                  filteredRestaurants.map((res) => (
                    <DrivingRestaurantCard
                      key={res._id}
                      restaurant={res}
                      onClick={() => setSelectedRestaurant(res)}
                    />
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-gray-200 bg-white/90 px-4 py-6 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900/90">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      No restaurants found on this route right now
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-neutral-400">
                      The map is still active. Try another route, move further ahead, or adjust driving mode settings.
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Bottom Toggle Control */}
      <div className={`absolute z-20 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom)] left-4 right-4 transition-all duration-300 ${viewMode !== "map"
        ? "bottom-[138px] opacity-100 scale-100"
        : (isDrawerExpanded ? "bottom-[calc(100vh-140px)] opacity-0 scale-0 pointer-events-none" : "bottom-[230px] opacity-100 scale-100")
        }`}>
        <Button
          onClick={() => {
            if (viewMode === "map") {
              window.requestAnimationFrame(() => {
                setIsDrawerExpanded(true);
              });
              return;
            }
            setViewMode("map");
          }}
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
          className="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto w-full max-w-md mx-auto bg-white dark:bg-[#111111] border-t dark:border-neutral-800/80 rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] flex flex-col transition-[height,transform,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[height] overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
        >
          {/* Drag Handle Top Bar */}
          <div
            onClick={toggleDrawer}
            className="relative w-full cursor-pointer bg-white dark:bg-[#111111] py-2 shrink-0 flex flex-col items-center select-none touch-none"
          >
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-neutral-800 rounded-full my-1" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDrawerExpanded((prev) => !prev);
              }}
              className="absolute left-1/2 top-1/2 inline-flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors duration-150 hover:bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              aria-label={isDrawerExpanded ? "Collapse drawer" : "Expand drawer"}
            >
              {isDrawerExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>

          {/* Category Filters (Fixed Header) */}
          <DrivingFilters
            activeFilter={activeFacilityFilter}
            onFilterChange={setActiveFacilityFilter}
          />

          {/* Restaurants List Container */}
          <div 
            ref={scrollContainerRef}
            className={`flex-1 px-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isDrawerExpanded ? "overflow-y-auto pb-28 filters-scroll-hide" : "pb-4 overflow-hidden"}`}
          >
            {/* Header Row */}
            <div className="flex items-center justify-between py-3 border-b dark:border-neutral-900/60 mb-3 bg-white dark:bg-[#111111] sticky top-0 z-10">
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                Restaurants Ahead ({activeDistanceLimit === null ? "All" : `${activeDistanceLimit} km`})
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
      <Dialog open={!!selectedRestaurant} onOpenChange={(open) => !open && setSelectedRestaurant(null)}>
        <DialogContent className="max-w-md w-[calc(100vw-32px)] p-0 overflow-hidden bg-white dark:bg-[#111111] rounded-2xl border-none shadow-2xl">
          {displayRestaurant && (
            <>
              {/* Cover photo / Carousel with absolute overlays */}
              <div className="relative h-52 bg-neutral-100 dark:bg-neutral-900">
                <RestaurantImageCarousel restaurant={displayRestaurant} />

              {/* Back Arrow button */}
              <button
                onClick={() => setSelectedRestaurant(null)}
                className="absolute top-4 left-4 z-20 w-9 h-9 bg-white/90 dark:bg-neutral-900/90 hover:bg-white dark:hover:bg-neutral-900 text-gray-800 dark:text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all border-none focus:outline-none cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Share & Favorite buttons */}
              <div className="absolute top-4 right-4 z-20 flex gap-2">
                <button
                  onClick={handleShare}
                  title="Share restaurant"
                  className="w-9 h-9 bg-white/90 dark:bg-neutral-900/90 hover:bg-white dark:hover:bg-neutral-900 text-gray-800 dark:text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all border-none focus:outline-none cursor-pointer"
                >
                  <Share2 className="w-4.5 h-4.5 text-gray-700 dark:text-gray-200" />
                </button>
                <button
                  onClick={handleToggleFavorite}
                  title={isFavourited ? "Remove from favorites" : "Add to favorites"}
                  className="w-9 h-9 bg-white/90 dark:bg-neutral-900/90 hover:bg-white dark:hover:bg-neutral-900 text-gray-800 dark:text-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all border-none focus:outline-none cursor-pointer"
                >
                  <Heart className={`w-4.5 h-4.5 ${isFavourited ? "text-red-500 fill-current" : "text-gray-600 dark:text-gray-300"}`} />
                </button>
              </div>
            </div>

            {/* Content Details Area */}
            <div className="p-5 space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto filters-scroll-hide">

              {/* Title & Status Row */}
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight flex items-center gap-1.5">
                    {displayRestaurant.restaurantName}
                    <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 fill-current" />
                  </h3>
                  <p className="text-xs font-bold text-gray-400 dark:text-neutral-500 mt-1">
                    {displayRestaurant.highwayRef}, {displayRestaurant.distanceKm} km Ahead
                  </p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border border-green-200 text-green-700 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900/40">
                    Open
                  </span>
                  <span className="text-xs font-black text-orange-600 flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-orange-500 fill-current" />
                    {displayRestaurant.etaMinutes} min
                  </span>
                </div>
              </div>

              {/* Rating & Tag Info Chips */}
              <div className="flex items-center flex-wrap gap-2 text-[10px] font-bold text-gray-500 dark:text-neutral-400">
                {displayRestaurant.rating && displayRestaurant.rating > 0 ? (
                  <>
                    <div className="flex items-center gap-0.5 bg-green-700 text-white px-1.5 py-0.5 rounded shrink-0">
                      <span>{displayRestaurant.rating.toFixed(1)}</span>
                      <Star className="w-2.5 h-2.5 fill-current text-white" />
                    </div>
                    {displayRestaurant.totalRatings && (
                      <span className="text-gray-400 dark:text-neutral-500">({displayRestaurant.totalRatings} Ratings)</span>
                    )}
                    <span className="text-gray-300 dark:text-neutral-800">•</span>
                  </>
                ) : null}
                <span className="truncate max-w-[120px]">{displayRestaurant.cuisines?.length ? displayRestaurant.cuisines.join(", ") : "North Indian, Punjabi"}</span>
                <span className="text-gray-300 dark:text-neutral-800">•</span>
                <span>₹₹</span>
                {getFacilityAvailability(displayRestaurant.facilities, "familyFriendly") && (
                  <>
                    <span className="text-gray-300 dark:text-neutral-800">•</span>
                    <span className="text-orange-600 dark:text-orange-400 font-extrabold flex items-center gap-1">
                      <img src="/icons/familyfriendly.png" alt="Family Friendly" className="w-3.5 h-3.5 object-contain inline-block rounded-full" />
                      Family Friendly
                    </span>
                  </>
                )}
              </div>

              {/* Facilities Grid (Render only active dynamic cards) */}
              {(getFacilityAvailability(displayRestaurant.facilities, "parking") ||
                getFacilityAvailability(displayRestaurant.facilities, "washroom") ||
                getFacilityAvailability(displayRestaurant.facilities, "evCharging") ||
                getFacilityAvailability(displayRestaurant.facilities, "wifi")) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {/* Parking Card */}
                    {getFacilityAvailability(displayRestaurant.facilities, "parking") && (
                      <div className="flex flex-col items-center justify-between p-2 rounded-xl border border-gray-100 dark:border-neutral-900/60 bg-gray-50/30 dark:bg-[#151515] text-center min-w-[72px] flex-1 min-h-[64px]">
                        <img src="/icons/carparking.png" alt="Parking" className="w-5 h-5 object-contain rounded-full" />
                        <span className="text-[9px] font-bold text-gray-700 dark:text-neutral-300 mt-1">Parking</span>
                      </div>
                    )}

                    {/* Washroom Card */}
                    {getFacilityAvailability(displayRestaurant.facilities, "washroom") && (
                      <div className="flex flex-col items-center justify-between p-2 rounded-xl border border-gray-100 dark:border-neutral-900/60 bg-gray-50/30 dark:bg-[#151515] text-center min-w-[72px] flex-1 min-h-[64px]">
                        <img src="/icons/washroom.png" alt="Washroom" className="w-5 h-5 object-contain rounded-full" />
                        <span className="text-[9px] font-bold text-gray-700 dark:text-neutral-300 mt-1">Washroom</span>
                      </div>
                    )}

                    {/* EV Charging Card */}
                    {getFacilityAvailability(displayRestaurant.facilities, "evCharging") && (
                      <div className="flex flex-col items-center justify-between p-2 rounded-xl border border-gray-100 dark:border-neutral-900/60 bg-gray-50/30 dark:bg-[#151515] text-center min-w-[72px] flex-1 min-h-[64px]">
                        <img src="/icons/evcharging.png" alt="EV Charging" className="w-5 h-5 object-contain rounded-full" />
                        <span className="text-[9px] font-bold text-gray-700 dark:text-neutral-300 mt-1">EV Charging</span>
                      </div>
                    )}

                    {/* Wi-Fi Card */}
                    {getFacilityAvailability(displayRestaurant.facilities, "wifi") && (
                      <div className="flex flex-col items-center justify-between p-2 rounded-xl border border-gray-100 dark:border-neutral-900/60 bg-gray-50/30 dark:bg-[#151515] text-center min-w-[72px] flex-1 min-h-[64px]">
                        <img src="/icons/wifi.png" alt="Wi-Fi" className="w-5 h-5 object-contain rounded-full" />
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

                const overallFacilityRatingObj = getOverallFacilityRatingEntry(displayRestaurant);
                const overallFacilityAvg = overallFacilityRatingObj.average || 0;
                const overallFacilityCount = overallFacilityRatingObj.count || 0;

                const restaurantFacilities = displayRestaurant.facilities || {};
                const activeFacilities = FACILITIES_CONFIG.filter(f => getFacilityAvailability(restaurantFacilities, f.key));

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
                        const stats = getFacilityRatingEntry(displayRestaurant, fac.key);
                        const avg = stats.average || 0;
                        const count = stats.count || 0;

                        return (
                          <div key={fac.key} className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-gray-700 dark:text-neutral-300 flex items-center gap-1.5">
                              {fac.icon ? (
                                <img src={fac.icon} alt={fac.label} className="w-4 h-4 object-contain rounded-full" />
                              ) : (
                                <span>{fac.emoji}</span>
                              )}
                              {fac.label}
                            </span>
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

              {/* Dynamic Offers Section - Completely hidden if no active coupons match */}
              {restaurantOffers && restaurantOffers.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-gray-900 dark:text-white">Offers for You</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {restaurantOffers.map((offer, idx) => (
                      <div key={offer._id || offer.id || idx} className="p-3 rounded-xl border border-orange-100 dark:border-neutral-900 bg-orange-50/20 dark:bg-neutral-950/20 flex flex-col justify-between min-h-[88px]">
                        <div>
                          <h5 className="text-xs font-black text-orange-600">
                            {offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}
                          </h5>
                          <p className="text-[10px] font-extrabold text-gray-800 dark:text-neutral-300 mt-0.5">
                            {offer.maxDiscount ? `Up to ₹${offer.maxDiscount}` : (offer.title || offer.couponCode)}
                          </p>
                          {offer.minOrderValue ? (
                            <p className="text-[8px] font-bold text-gray-400 mt-1">Min order ₹{offer.minOrderValue}</p>
                          ) : null}
                        </div>
                        <div className="mt-2 text-[9px] font-extrabold text-orange-600 bg-orange-100/50 dark:bg-orange-950/40 px-2 py-0.5 rounded text-center tracking-wider uppercase">
                          {offer.couponCode}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Single Primary Action Button */}
              <div className="pt-3 border-t border-gray-100 dark:border-neutral-900/60">
                <Button
                  onClick={() => handlePreorder(displayRestaurant)}
                  className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm shadow-lg shadow-orange-600/20 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <span>Order Now</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

            </div>
            </>
          )}
          </DialogContent>
        </Dialog>

      {/* Bottom Navigation Bar */}
      <BottomNavigation />

    </div>
  );
}



