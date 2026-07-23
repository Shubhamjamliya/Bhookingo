import React from "react";
import { Star, ShieldCheck } from "lucide-react";
import { extractImages } from "@food/utils/common";

const FOOD_IMAGE_FALLBACK = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80";

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

  const candidates = [
    restaurant.profileImage,
    restaurant.profileImageUrl,
    restaurant.onboarding?.step2?.profileImageUrl,
    restaurant.image,
    restaurant.imageUrl,
    ...(Array.isArray(coverImages) ? coverImages : [coverImages]),
    restaurant.coverImage
  ].filter(Boolean);

  const extracted = extractImages(candidates);
  const imageSrc = extracted[0] || FOOD_IMAGE_FALLBACK;

  const hasEvCharging = facilities?.evCharging === true;
  const hasWashroom = facilities?.washroom !== false; // default true for highway restaurants
  const hasParking = facilities?.parking !== false;
  const hasFamily = facilities?.familyFriendly !== false;
  const hasWifi = facilities?.wifi === true;

  return (
    <div 
      onClick={onClick}
      className="flex gap-3.5 p-3.5 bg-white dark:bg-[#161616] border border-gray-150 dark:border-neutral-800 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] cursor-pointer"
    >
      {/* Left: Image with Veg Indicator */}
      <div className="relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-gray-100 dark:bg-neutral-800 shadow-inner">
        <img 
          src={imageSrc} 
          alt={restaurantName}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = FOOD_IMAGE_FALLBACK; }}
        />
        {pureVegRestaurant && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[8px] font-black uppercase tracking-wider shadow-sm">
            Veg
          </div>
        )}
      </div>

      {/* Right: Info Column */}
      <div className="flex-1 min-w-0 flex flex-col justify-between space-y-1.5">
        
        {/* Header: Name & Distance */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-extrabold text-sm text-gray-900 dark:text-white truncate flex items-center gap-1">
              <span>{restaurantName}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0 fill-current" />
            </h4>
            <p className="text-[10px] text-gray-400 dark:text-neutral-500 font-semibold mt-0.5">
              {highwayRef || "NH"}, {distanceKm ?? 0} km Ahead
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-sm font-black text-[#FF6B00] block leading-tight">
              {distanceKm ?? 0} km
            </span>
            <span className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 block">
              {etaMinutes || 1} min
            </span>
          </div>
        </div>

        {/* Rating and Cuisines */}
        <div className="flex items-center gap-1.5 text-[10px] font-bold">
          <div className="flex items-center gap-0.5 text-[#FF6B00]">
            <Star className="w-3 h-3 fill-current" />
            <span>{rating ? rating.toFixed(1) : "5.0"}</span>
          </div>
          <span className="text-gray-300 dark:text-neutral-700">•</span>
          <span className="text-gray-400 dark:text-neutral-500">({totalRatings || "3"})</span>
          <span className="text-gray-300 dark:text-neutral-700">•</span>
          <span className="text-gray-500 dark:text-neutral-400 truncate max-w-[130px]">
            {cuisines?.length ? cuisines.join(", ") : "North Indian, Punjabi"}
          </span>
        </div>

        {/* Main Feature Cards Grid: Washroom & EV Charging */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          {/* Washroom Card */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-neutral-900 border border-gray-150 dark:border-neutral-800/80">
            <div className="flex items-center gap-1.5 min-w-0">
              <img src="/icons/washroom.svg" alt="Washroom" className="w-4 h-4 shrink-0" />
              <div className="min-w-0">
                <span className="block text-[11px] font-bold text-gray-900 dark:text-white leading-none">Washroom</span>
                <span className="block text-[10px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">Clean</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-[9px] shrink-0 ml-1">
              <span>⚡</span>
              <span>4.0</span>
            </div>
          </div>

          {/* EV Charging Card */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-neutral-900 border border-gray-150 dark:border-neutral-800/80">
            <div className="flex items-center gap-1.5 min-w-0">
              <img 
                src={hasEvCharging ? "/icons/ev_charging.svg" : "/icons/ev_charging_unavailable.svg"} 
                alt="EV Charging" 
                className="w-4 h-4 shrink-0" 
              />
              <div className="min-w-0">
                <span className="block text-[11px] font-bold text-gray-900 dark:text-white leading-none truncate">EV Charging</span>
                <span className={`block text-[10px] font-semibold mt-0.5 ${hasEvCharging ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                  {hasEvCharging ? "Available" : "Not Available"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Pills Below: Parking, Family, Wi-Fi */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {hasParking && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-50 dark:bg-neutral-900 border border-gray-150 dark:border-neutral-800 text-[10px] font-bold text-gray-700 dark:text-neutral-300">
              <img src="/icons/parking.svg" alt="Parking" className="w-3.5 h-3.5 shrink-0" />
              <span>Parking</span>
            </div>
          )}
          {hasFamily && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-50 dark:bg-neutral-900 border border-gray-150 dark:border-neutral-800 text-[10px] font-bold text-gray-700 dark:text-neutral-300">
              <img src="/icons/family.svg" alt="Family" className="w-3.5 h-3.5 shrink-0" />
              <span>Family</span>
            </div>
          )}
          {hasWifi && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-50 dark:bg-neutral-900 border border-gray-150 dark:border-neutral-800 text-[10px] font-bold text-gray-700 dark:text-neutral-300">
              <img src="/icons/wifi.svg" alt="Wi-Fi" className="w-3.5 h-3.5 shrink-0" />
              <span>Wi-Fi</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
