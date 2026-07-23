import React, { useState, useEffect, useMemo } from "react";
import { Star, ShieldCheck } from "lucide-react";
import { extractImages } from "@food/utils/common";

const FOOD_IMAGE_FALLBACK = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80";

function FoodImageCarousel({ images, isVeg }) {
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    if (!images || images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [images]);

  const activeSrc = images[currentIdx] || FOOD_IMAGE_FALLBACK;

  return (
    <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-2xl overflow-hidden bg-gray-100 dark:bg-neutral-800 shadow-xs border border-gray-100 dark:border-neutral-800">
      <img 
        src={activeSrc} 
        alt="Delicious Food"
        className="w-full h-full object-cover transition-all duration-500 transform hover:scale-105"
        onError={(e) => { e.target.src = FOOD_IMAGE_FALLBACK; }}
      />

      {/* Veg Indicator Badge */}
      {isVeg && (
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[8px] font-black uppercase tracking-wider shadow-sm backdrop-blur-xs">
          Veg
        </div>
      )}

      {/* Carousel Dot Indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1 z-10">
          {images.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${i === currentIdx ? 'w-3 bg-white' : 'w-1 bg-white/60'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DrivingRestaurantCard({ restaurant, onClick }) {
  const {
    restaurantName,
    coverImages,
    pureVegRestaurant,
    rating,
    totalRatings,
    highwayRef,
    distanceKm,
    etaMinutes,
    cuisines,
    facilities
  } = restaurant;

  // Extract food images for carousel
  const foodImages = useMemo(() => {
    const candidates = [
      ...(Array.isArray(coverImages) ? coverImages : [coverImages]),
      restaurant.coverImage,
      ...(restaurant.menuImages || []),
      restaurant.onboarding?.step2?.profileImageUrl,
      ...(restaurant.onboarding?.step2?.menuImageUrls || []),
      restaurant.image,
      restaurant.imageUrl,
      restaurant.profileImage
    ].filter(Boolean);

    const extracted = extractImages(candidates);
    return extracted.length > 0 ? extracted : [FOOD_IMAGE_FALLBACK];
  }, [restaurant, coverImages]);

  const hasEvCharging = facilities?.evCharging === true;
  const hasWashroom = facilities?.washroom !== false;
  const hasParking = facilities?.parking !== false;
  const hasFamily = facilities?.familyFriendly !== false;
  const hasWifi = facilities?.wifi === true;

  return (
    <div 
      onClick={onClick}
      className="flex gap-4 p-4 bg-white dark:bg-[#161616] border border-gray-150 dark:border-neutral-800 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.99] cursor-pointer"
    >
      {/* Left: Food Item Image Carousel */}
      <FoodImageCarousel images={foodImages} isVeg={pureVegRestaurant} />

      {/* Right: Detailed Content Area */}
      <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2">
        
        {/* Header: Name, Verified Badge & Distance */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-extrabold text-base text-gray-900 dark:text-white truncate flex items-center gap-1.5">
              <span>{restaurantName}</span>
              <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 fill-current" />
            </h4>
            <p className="text-xs text-gray-500 dark:text-neutral-400 font-medium mt-0.5">
              {highwayRef || "NH"}, {distanceKm ?? 0} km Ahead
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-base font-black text-[#FF6B00] block leading-tight">
              {distanceKm ?? 0} km
            </span>
            <span className="text-xs font-bold text-gray-400 dark:text-neutral-500 block mt-0.5">
              {etaMinutes || 1} min
            </span>
          </div>
        </div>

        {/* Rating and Cuisines Row */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <div className="flex items-center gap-1 text-[#FF6B00]">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>{rating ? rating.toFixed(1) : "5.0"}</span>
          </div>
          <span className="text-gray-300 dark:text-neutral-700">•</span>
          <span className="text-gray-500 dark:text-neutral-400">({totalRatings || "3"})</span>
          <span className="text-gray-300 dark:text-neutral-700">•</span>
          <span className="text-gray-600 dark:text-neutral-300 truncate max-w-[160px]">
            {cuisines?.length ? cuisines.join(", ") : "North Indian, Punjabi"}
          </span>
        </div>

        {/* Main Amenity Cards Grid: Washroom & EV Charging */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {/* Washroom Card */}
          {hasWashroom && (
            <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100/60 dark:border-blue-900/30">
              <div className="flex items-center gap-2 min-w-0">
                <img src="/icons/washroom.svg" alt="Washroom" className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[11px] font-extrabold text-gray-900 dark:text-white leading-none">Washroom</span>
                  <span className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">Clean</span>
                </div>
              </div>
              <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500 text-white font-black text-[9px] shrink-0 ml-1">
                <span>⚡</span>
                <span>4.0</span>
              </div>
            </div>
          )}

          {/* EV Charging Card */}
          <div className={`flex items-center justify-between px-3 py-2 rounded-2xl border ${hasEvCharging ? 'bg-emerald-50/40 border-emerald-100 dark:bg-emerald-950/20' : 'bg-red-50/30 border-red-100 dark:bg-red-950/20'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <img 
                src={hasEvCharging ? "/icons/ev_charging.svg" : "/icons/ev_charging_unavailable.svg"} 
                alt="EV Charging" 
                className="w-4 h-4 shrink-0" 
              />
              <div className="min-w-0">
                <span className="block text-[11px] font-extrabold text-gray-900 dark:text-white leading-none">EV Charging</span>
                <span className={`block text-[10px] font-bold mt-0.5 ${hasEvCharging ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                  {hasEvCharging ? "Available" : "Not Available"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Pills Below: Parking, Family, Wi-Fi */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {hasParking && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-neutral-900 border border-gray-200/60 dark:border-neutral-800 text-[10px] font-bold text-gray-700 dark:text-neutral-300">
              <img src="/icons/parking.svg" alt="Parking" className="w-3.5 h-3.5 shrink-0" />
              <span>Parking</span>
            </div>
          )}
          {hasFamily && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-neutral-900 border border-gray-200/60 dark:border-neutral-800 text-[10px] font-bold text-gray-700 dark:text-neutral-300">
              <img src="/icons/family.svg" alt="Family" className="w-3.5 h-3.5 shrink-0" />
              <span>Family</span>
            </div>
          )}
          {hasWifi && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-neutral-900 border border-gray-200/60 dark:border-neutral-800 text-[10px] font-bold text-gray-700 dark:text-neutral-300">
              <img src="/icons/wifi.svg" alt="Wi-Fi" className="w-3.5 h-3.5 shrink-0" />
              <span>Wi-Fi</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
