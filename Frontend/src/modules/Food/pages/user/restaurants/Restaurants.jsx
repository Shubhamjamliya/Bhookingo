import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Star,
  Bookmark,
  Zap,
  Clock,
  Timer,
  Heart,
  ArrowLeft,
  MapPin,
  Check,
  Building2,
  ChevronRight
} from "lucide-react";
import AnimatedPage from "@food/components/user/AnimatedPage";
import Footer from "@food/components/user/Footer";
import ScrollReveal from "@food/components/user/ScrollReveal";
import { getFacilityAvailability, getFacilityRatingEntry } from "@food/utils/facilityHelpers";
import TextReveal from "@food/components/user/TextReveal";
import { Card, CardContent } from "@food/components/ui/card";
import { Button } from "@food/components/ui/button";
import { RestaurantGridSkeleton } from "@food/components/ui/loading-skeletons";
import OptimizedImage from "@food/components/OptimizedImage";

import { useProfile } from "@food/context/ProfileContext";
import { useLocation } from "@food/hooks/useLocation";
import { restaurantAPI } from "@food/api";
import { API_BASE_URL } from "@food/api/config";
import { useDelayedLoading } from "@food/hooks/useDelayedLoading";
import BookingRangeBadge, { getRestaurantDistanceKm } from "@food/components/user/BookingRangeBadge";
import { shouldShowRestaurantInVegMode } from "@food/utils/vegUtils";
import { getRestaurantAvailabilityStatus } from "@food/utils/restaurantAvailability";

import HomeHeader from "@food/components/user/home/HomeHeader";
import homeBannerRed from "@food/assets/home-banner-orange-clean.png";

const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

const normalizeImageUrl = (imageUrl) => {
  if (typeof imageUrl !== "string" || !imageUrl.trim()) return "";
  const trimmed = imageUrl.trim();
  if (/^(https?:)?\/\//i.test(trimmed) || /^data:/i.test(trimmed) || /^blob:/i.test(trimmed)) {
    return trimmed;
  }
  return trimmed.startsWith("/")
    ? `${BACKEND_ORIGIN}${trimmed}`
    : `${BACKEND_ORIGIN}/${trimmed}`;
};

const pickRestaurantImage = (restaurant) => {
  const candidates = [
    restaurant?.coverImage?.url,
    restaurant?.coverImage,
    ...(Array.isArray(restaurant?.coverImages) ? restaurant.coverImages.map((img) => img?.url || img) : []),
    ...(Array.isArray(restaurant?.menuImages) ? restaurant.menuImages.map((img) => img?.url || img) : []),
    restaurant?.profileImage?.url,
    restaurant?.profileImage,
  ];
  const firstValid = candidates.find((value) => typeof value === "string" && value.trim());
  return normalizeImageUrl(firstValid || "");
};

const TAKEAWAY_FACILITY_ICONS = {
  parking: { key: "parking", label: "Parking", icon: "/icons/carparking.png", bgClass: "bg-amber-500/15 dark:bg-amber-500/25" },
  wifi: { key: "wifi", label: "WiFi", icon: "/icons/wifi.png", bgClass: "bg-blue-500/15 dark:bg-blue-500/25" },
  familyFriendly: { key: "familyFriendly", label: "Family Friendly", icon: "/icons/familyfriendly.png", bgClass: "bg-purple-500/15 dark:bg-purple-500/25" },
  evCharging: { key: "evCharging", label: "EV Charging", icon: "/icons/evcharging.png", bgClass: "bg-emerald-500/15 dark:bg-emerald-500/25" },
  washroom: { key: "washroom", label: "Washroom", icon: "/icons/washroom.png", bgClass: "bg-cyan-500/15 dark:bg-cyan-500/25" },
};

const getTakeawayActiveAmenities = (facilities) => {
  if (!facilities || typeof facilities !== "object") return [];
  const items = [];
  const isTrue = (val) => val === true || val === "true" || val === 1 || val === "1";

  if (isTrue(getFacilityAvailability(facilities, "parking") || facilities.carparking)) items.push(TAKEAWAY_FACILITY_ICONS.parking);
  if (isTrue(getFacilityAvailability(facilities, "wifi"))) items.push(TAKEAWAY_FACILITY_ICONS.wifi);
  if (isTrue(getFacilityAvailability(facilities, "familyFriendly") || facilities.family_friendly || facilities.family)) items.push(TAKEAWAY_FACILITY_ICONS.familyFriendly);
  if (isTrue(getFacilityAvailability(facilities, "evCharging") || facilities.ev_charging)) items.push(TAKEAWAY_FACILITY_ICONS.evCharging);
  if (isTrue(getFacilityAvailability(facilities, "washroom"))) items.push(TAKEAWAY_FACILITY_ICONS.washroom);
  return items;
};

const getFacilityRatingInfo = (restaurant, facKey) => {
  if (!restaurant) return { ratingText: "5+", countText: null, hasRating: false };
  const facRating = getFacilityRatingEntry(restaurant, facKey);
  const avg = Number(facRating.average) || 0;
  const cnt = Number(facRating.count) || 0;

  if (avg > 0) {
    return {
      ratingText: avg.toFixed(1),
      countText: cnt > 0 ? `${cnt}+` : null,
      hasRating: true,
    };
  }

  return {
    ratingText: "5+",
    countText: null,
    hasRating: false,
  };
};

const formatRatingsDisplay = (ratingNum, totalRatingsNum) => {
  const rating = Number(ratingNum) || 0;
  const count = Number(totalRatingsNum) || 0;

  if (rating <= 0) {
    return {
      badgeText: "NEW",
      countText: "No ratings yet",
      hasRating: false,
    };
  }

  let formattedCount = "";
  if (count >= 1000) {
    formattedCount = `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K+ Ratings`;
  } else if (count > 0) {
    formattedCount = `${count} Ratings`;
  } else {
    formattedCount = "No ratings yet";
  }

  return {
    badgeText: rating.toFixed(1),
    countText: formattedCount,
    hasRating: true,
  };
};

const WEBVIEW_SESSION_CACHE_BUSTER = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const RestaurantImageCarousel = React.memo(({ restaurant, priority = false }) => {
  const webviewSessionKeyRef = useRef(WEBVIEW_SESSION_CACHE_BUSTER);
  const imageElementRef = useRef(null);

  const withCacheBuster = useCallback((url) => {
    if (typeof url !== "string" || !url) return "";
    if (/^data:/i.test(url) || /^blob:/i.test(url)) return url;

    const isRelative = !/^(https?:|\/\/|data:|blob:)/i.test(url.trim());
    const resolvedUrl = isRelative
      ? `${BACKEND_ORIGIN.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`
      : url;

    const hasSignedParams =
      /[?&](X-Amz-|Signature=|Expires=|AWSAccessKeyId=|GoogleAccessId=|token=|sig=|se=|sp=|sv=)/i.test(resolvedUrl);
    if (hasSignedParams) return resolvedUrl;

    try {
      const parsed = new URL(resolvedUrl, window.location.origin);
      const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
      const isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname);
      const isSameHost = currentHost && parsed.hostname === currentHost;

      if (isLocalHost || isSameHost) {
        parsed.searchParams.set("_wv", webviewSessionKeyRef.current);
      }
      return parsed.toString();
    } catch {
      return resolvedUrl;
    }
  }, []);

  const images = React.useMemo(() => {
    const candidates = [
      ...(Array.isArray(restaurant?.coverImages) ? restaurant.coverImages.map((img) => img?.url || img) : []),
      restaurant?.coverImage?.url,
      restaurant?.coverImage,
      ...(Array.isArray(restaurant?.menuImages) ? restaurant.menuImages.map((img) => img?.url || img) : []),
      restaurant?.profileImage?.url,
      restaurant?.profileImage,
      restaurant?.image,
    ];
    const valid = candidates.filter((img) => typeof img === "string" && img.trim()).map((img) => img.trim());
    return valid.length > 0 ? valid.map((img) => withCacheBuster(img)) : ["https://via.placeholder.com/400x300?text=Restaurant"];
  }, [restaurant, withCacheBuster]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const safeIndex = images.length > 0 ? (currentIndex % images.length + images.length) % images.length : 0;

  return (
    <div className="relative w-full h-[200px] sm:h-[220px] md:h-[240px] overflow-hidden bg-gray-100 dark:bg-gray-800">
      <OptimizedImage
        ref={imageElementRef}
        src={images[safeIndex]}
        alt={restaurant.name || "Restaurant"}
        priority={priority}
        className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700"
      />
      {images.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1 px-2 pointer-events-none z-10">
          {images.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx === safeIndex ? 'w-4 bg-white shadow-sm' : 'w-1 bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default function Restaurants() {
  const navigate = useNavigate();
  const { addFavorite, removeFavorite, isFavorite, orderType, vegMode, setVegMode, vegModeOption } = useProfile();
  const { location: userLocation } = useLocation();
  const [restaurants, setRestaurants] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const showRestaurantsSkeleton = useDelayedLoading(initialLoading);
  const loaderRef = useRef(null);
  const [activeTab, setActiveTab] = useState("food");
  const [availabilityTick, setAvailabilityTick] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setAvailabilityTick(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Reset page and restaurants when userLocation coordinates or orderType changes
  useEffect(() => {
    setRestaurants([]);
    setPage(1);
    setHasMore(true);
    setInitialLoading(true);
  }, [userLocation?.latitude, userLocation?.longitude, orderType]);

  useEffect(() => {
    let cancelled = false;

    const fetchPage = async () => {
      if (!hasMore && page !== 1) return;
      try {
        setLoading(true);
        const params = {
          limit: 20,
          page: page,
          _ts: Date.now()
        };
        if (Number.isFinite(userLocation?.latitude) && Number.isFinite(userLocation?.longitude)) {
          params.lat = parseFloat(userLocation.latitude.toFixed(4));
          params.lng = parseFloat(userLocation.longitude.toFixed(4));
        }

        const response = await restaurantAPI.getRestaurants(params, { noCache: true });
        if (cancelled) return;

        const data = response?.data?.data || response?.data || {};
        const list = data.restaurants || [];
        const serverHasMore = data.hasMore ?? (list.length === 20);

        const transformed = list.map((restaurant) => {
          const slug =
            restaurant?.slug ||
            String(restaurant?.name || "")
              .toLowerCase()
              .trim()
              .replace(/\s+/g, "-");
          const cuisine = Array.isArray(restaurant?.cuisines) && restaurant.cuisines.length > 0
            ? restaurant.cuisines[0]
            : "Multi-cuisine";
          return {
            ...restaurant,
            id: restaurant?._id || restaurant?.restaurantId || slug,
            slug,
            name: restaurant?.restaurantName || restaurant?.name || "Unknown Restaurant",
            cuisine,
            rating: Number(restaurant?.rating || 0) || 4.5,
            time: restaurant?.preparationTime || "20-25 mins",
            distance: restaurant?.distance ? (typeof restaurant.distance === 'number' ? `${restaurant.distance.toFixed(1)} km` : restaurant.distance) : "1.2 km",
            priceRange: restaurant?.priceRange || "$$",
            image: pickRestaurantImage(restaurant),
          };
        });

        setRestaurants((prev) => (page === 1 ? transformed : [...prev, ...transformed]));
        setHasMore(serverHasMore);
      } catch (error) {
        if (!cancelled) {
          setHasMore(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setInitialLoading(false);
        }
      }
    };

    fetchPage();
    return () => {
      cancelled = true;
    };
  }, [page, userLocation?.latitude, userLocation?.longitude, orderType]);

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    if (!hasMore || loading || initialLoading) return;
    const target = loaderRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      {
        root: null,
        rootMargin: "200px",
        threshold: 0.1,
      }
    );

    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, initialLoading]);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => shouldShowRestaurantInVegMode(r, vegMode, vegModeOption));
  }, [restaurants, vegMode, vegOption => vegModeOption]);

  const hasRestaurants = useMemo(() => filteredRestaurants.length > 0, [filteredRestaurants.length]);

  return (
    <AnimatedPage className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      {/* Orange Hero Banner Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#ff8100] via-[#ff6b00] to-[#e05300] text-white">
        <div className="absolute inset-0 z-0 opacity-20">
          <img
            src={homeBannerRed}
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <div className="relative z-10">
          <HomeHeader
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            location={userLocation}
            handleSearchFocus={() => navigate("/food/user/search")}
            placeholderIndex={0}
            placeholders={["Search for restaurants, cuisines..."]}
            vegMode={vegMode}
            handleVegModeChange={setVegMode}
            showBanner={true}
          />
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-12">
        {/* Pickup Restaurants Header */}
        <div className="px-4 pt-6 pb-2 bg-white dark:bg-[#0a0a0a]">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <ShoppingBag className="h-6 w-6 text-[#ff8100]" />
              </span>
              Pickup Restaurants
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5 ml-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Order online, skip the queue & pickup yourself
            </p>
          </div>
          <div className="h-[1px] bg-gradient-to-r from-gray-200 via-gray-300 to-transparent dark:from-gray-800 dark:via-gray-700 dark:to-transparent mt-4 mb-2" />
        </div>

        {/* Featured Restaurants Section Header */}
        <div className="px-4 mb-2 sm:mb-4">
          <div className="flex flex-col gap-0.5 antialiased">
            <h2 className="text-xs sm:text-sm font-bold text-[#ff8100] tracking-widest uppercase">
              {loading ? "Finding Nearby Restaurants" : `${filteredRestaurants.length} Restaurants Available`}
            </h2>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Featured Restaurants
            </h3>
          </div>
        </div>

        {/* Restaurants Grid / Skeletons */}
        {showRestaurantsSkeleton ? (
          <div className="px-4">
            <RestaurantGridSkeleton count={4} />
          </div>
        ) : !hasRestaurants ? (
          <div className="py-20 text-center text-base text-gray-500 dark:text-gray-400 font-medium">
            No restaurants available near your location right now.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 px-4 items-stretch">
              {filteredRestaurants.map((restaurant, index) => {
                const favorite = isFavorite(restaurant.slug);

                const handleToggleFavorite = (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (favorite) {
                    removeFavorite(restaurant.slug);
                  } else {
                    addFavorite({
                      slug: restaurant.slug,
                      name: restaurant.name,
                      cuisine: restaurant.cuisine,
                      rating: restaurant.rating,
                      distance: restaurant.distance,
                      priceRange: restaurant.priceRange,
                      image: restaurant.image,
                    });
                  }
                };

                const availability = getRestaurantAvailabilityStatus(
                  restaurant,
                  new Date(availabilityTick),
                  { ignoreOperationalStatus: true }
                );

                const activeAmenities = getTakeawayActiveAmenities(restaurant.facilities);
                const cuisineStr = Array.isArray(restaurant.cuisines) && restaurant.cuisines.length > 0
                  ? restaurant.cuisines.join(", ")
                  : (restaurant.cuisine || "Multi-cuisine");

                const featuredDishText = restaurant.featuredDish
                  ? `${restaurant.featuredDish}${restaurant.featuredPrice ? ` • ₹${restaurant.featuredPrice}` : ""}`
                  : null;

                const distanceKm = getRestaurantDistanceKm(restaurant);
                const isBookingUnavailable = distanceKm !== null && distanceKm > 50;

                return (
                  <div
                    key={restaurant.id || index}
                    className="h-full transform transition-all duration-300 hover:-translate-y-1"
                  >
                    <Link
                      to={`/user/restaurants/${restaurant.slug}`}
                      className="h-full flex"
                    >
                      <Card
                        className={`overflow-hidden gap-0 cursor-pointer border border-gray-200/80 dark:border-gray-800/80 group bg-white dark:bg-[#1a1a1a] transition-all duration-500 py-0 rounded-[24px] sm:rounded-[28px] flex flex-col h-full w-full relative shadow-md hover:shadow-xl ${
                          !availability.isOpen ? "grayscale opacity-75" : ""
                        }`}
                      >
                        {/* Image Section with Overlays */}
                        <div className="relative overflow-hidden rounded-t-[24px] sm:rounded-t-[28px]">
                          <BookingRangeBadge restaurant={restaurant} className="top-3 left-3 z-10" />

                          {featuredDishText && (
                            <div className="absolute top-3 left-3 z-10 bg-black/75 backdrop-blur-md text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-semibold shadow-md max-w-[70%]">
                              <div className="w-4 h-4 rounded bg-[#ff8100] flex items-center justify-center text-[9px] font-bold shrink-0">
                                🍱
                              </div>
                              <span className="truncate">{featuredDishText}</span>
                            </div>
                          )}

                          <RestaurantImageCarousel
                            restaurant={restaurant}
                            priority={index < 2}
                          />

                          {/* Bookmark Button Top Right */}
                          <div className="absolute top-3 right-3 z-10 transform transition-transform duration-300 group-hover:scale-105">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleToggleFavorite}
                              aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
                              className={`h-10 w-10 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
                                favorite
                                  ? "bg-red-500 text-white"
                                  : "bg-white/90 backdrop-blur-md text-gray-800 hover:bg-white"
                              }`}
                            >
                              <Bookmark className={`h-4.5 w-4.5 transition-all duration-300 ${favorite ? "fill-white" : ""}`} />
                            </Button>
                          </div>

                          {/* Rating Badge Bottom Right over Image */}
                          {(() => {
                            const ratingInfo = formatRatingsDisplay(restaurant.rating, restaurant.totalRatings);
                            return (
                              <div className="absolute bottom-3 right-3 z-10 bg-black/80 backdrop-blur-md text-white px-3 py-1.5 rounded-xl border border-white/10 flex flex-col items-end shadow-lg">
                                <div className="flex items-center gap-1">
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={0} />
                                  <span className="text-sm font-bold tracking-tight">
                                    {ratingInfo.badgeText}
                                  </span>
                                </div>
                                <span className="text-[10px] font-medium text-gray-300 tracking-tight">
                                  {ratingInfo.countText}
                                </span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Content Section */}
                        <CardContent className="p-4 sm:p-5 flex flex-col flex-grow justify-between gap-3 bg-white dark:bg-[#1a1a1a]">
                          {/* Restaurant Information */}
                          <div className="space-y-1.5">
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white line-clamp-1 leading-tight tracking-tight transition-colors duration-300 group-hover:text-[#ff8100]">
                              {restaurant.name}
                            </h3>

                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium line-clamp-1">
                              {cuisineStr}
                            </p>

                            <div className="flex items-center gap-2 pt-1 text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                              <Zap className="h-4 w-4 fill-emerald-600 text-emerald-600 shrink-0" strokeWidth={2.5} />
                              <span>{restaurant.distance}</span>
                              <span className="text-gray-300 dark:text-gray-600">•</span>
                              <span>{restaurant.time}</span>
                            </div>

                            {/* Availability Status */}
                            {(!availability.isOpen || availability.closingCountdownLabel) && (
                              <div className="pt-1">
                                {availability.isOpen && availability.closingCountdownLabel && (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 text-[10px] font-black uppercase tracking-widest">
                                    <Timer className="h-3.5 w-3.5 flex-shrink-0 text-indigo-500 dark:text-indigo-400" strokeWidth={3} />
                                    <span>{availability.closingCountdownLabel}</span>
                                  </div>
                                )}
                                {!availability.isOpen && availability.openingTime && (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-[10px] font-black uppercase tracking-widest">
                                    <Clock className="h-3 w-3 flex-shrink-0" />
                                    <span>Opens at {availability.openingTime}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Dynamic Amenities Row */}
                          {activeAmenities.length > 0 && (
                            <div className="pt-2.5 sm:pt-3 border-t border-gray-100 dark:border-gray-800">
                              <div className="flex items-stretch justify-between gap-1 sm:gap-1.5 w-full">
                                {activeAmenities.map((amenity) => {
                                  const ratingInfo = getFacilityRatingInfo(restaurant, amenity.key);
                                  return (
                                    <div
                                      key={amenity.key}
                                      className="flex-1 min-w-0 bg-[#fafafa] dark:bg-[#222222] border border-gray-200/60 dark:border-gray-800/80 rounded-xl sm:rounded-2xl p-1.5 sm:p-2 flex flex-col justify-between items-center text-center shadow-2xs hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200"
                                    >
                                      <div className="flex flex-col items-center gap-1 w-full min-w-0">
                                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full ${amenity.bgClass} p-1 flex items-center justify-center shrink-0 overflow-hidden`}>
                                          <img
                                            src={amenity.icon}
                                            alt={amenity.label}
                                            className="w-full h-full object-cover rounded-full"
                                            onError={(e) => {
                                              e.target.style.display = 'none';
                                            }}
                                          />
                                        </div>
                                        <span className="text-[10px] sm:text-xs font-bold text-gray-800 dark:text-gray-100 leading-tight truncate w-full px-0.5">
                                          {amenity.label}
                                        </span>
                                      </div>

                                      <div className="mt-1 flex flex-col items-center gap-0.5 w-full">
                                        <div className="flex items-center gap-0.5 text-[10px] sm:text-xs font-bold text-[#ff8100]">
                                          <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
                                          <span>{ratingInfo.ratingText}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Booking Status / Order Button */}
                          <div className="pt-2">
                            {isBookingUnavailable ? (
                              <Button
                                disabled
                                className="w-full bg-gray-200 dark:bg-gray-800 text-gray-500 font-bold text-xs sm:text-sm py-2 rounded-xl cursor-not-allowed"
                              >
                                Booking Unavailable (&gt;50 km)
                              </Button>
                            ) : (
                              <Button className="w-full bg-gradient-to-r from-[#ff8100] to-[#ff6b00] hover:from-[#e07200] hover:to-[#e05b00] text-white font-bold text-sm py-2.5 rounded-xl shadow-md transition-all duration-300 flex items-center justify-center gap-1.5">
                                <span>Explore Restaurant</span>
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div ref={loaderRef} className="py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff8100]"></div>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </AnimatedPage>
  );
}
