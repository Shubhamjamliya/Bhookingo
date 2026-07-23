import React from "react";
import { Star, ShieldCheck, MapPin, Clock, Navigation, CheckCircle2, Bookmark } from "lucide-react";
import { cn } from "@food/utils/utils";
import { extractImages } from "@food/utils/common";

const FOOD_IMAGE_FALLBACK = "https://picsum.photos/seed/dhaba/300/200";

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

  return (
    <div 
      onClick={onClick}
      className="flex gap-3.5 p-3.5 bg-white dark:bg-[#161616] border border-gray-100 dark:border-neutral-900/60 rounded-2xl shadow-sm hover:shadow transition-all duration-200 active:scale-[0.98]"
    >
      {/* Left: Image with Veg Indicator */}
      <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-50 dark:bg-neutral-800">
        <img 
          src={imageSrc} 
          alt={restaurantName}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = FOOD_IMAGE_FALLBACK; }}
        />
        {pureVegRestaurant && (
          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-green-600 text-white text-[8px] font-black uppercase tracking-wider">
            Veg
          </div>
        )}
      </div>

      {/* Right: Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        
        {/* Name, Verified checkmark, Distance & ETA */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-extrabold text-sm text-gray-900 dark:text-white truncate flex items-center gap-1">
              {restaurantName}
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0 fill-current" />
            </h4>
            <p className="text-[10px] text-gray-400 dark:text-neutral-500 font-semibold mt-0.5">
              {highwayRef}, {distanceKm} km Ahead
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-black text-orange-500 block">
              {distanceKm} km
            </span>
            <span className="text-[9px] font-bold text-gray-400 dark:text-neutral-500 block">
              {etaMinutes} min
            </span>
          </div>
        </div>

        {/* Rating and Cuisines */}
        <div className="flex items-center gap-1.5 text-[10px] mt-1 font-bold">
          <div className="flex items-center gap-0.5 text-orange-500">
            <Star className="w-3 h-3 fill-current" />
            <span>{rating ? rating.toFixed(1) : "4.0"}</span>
          </div>
          <span className="text-gray-300 dark:text-neutral-800">•</span>
          <span className="text-gray-400 dark:text-neutral-500">({totalRatings || "1.2K"})</span>
          <span className="text-gray-300 dark:text-neutral-800">•</span>
          <span className="text-gray-500 dark:text-neutral-400 truncate max-w-[120px]">
            {cuisines?.length ? cuisines.join(", ") : "North Indian, Punjabi"}
          </span>
        </div>

        {/* Facilities Box Grid (Washroom & EV Charging) */}
        <div className="grid grid-cols-2 gap-1.5 mt-1.5">
          {facilities?.washroom && (
            <div className="flex items-center justify-between px-2 py-1 rounded bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 text-[9px] font-bold text-blue-700 dark:text-blue-400">
              <span className="flex items-center gap-1">
                <span>🚻</span>
                <span>Washroom</span>
              </span>
              <span className="text-blue-500/80 font-black">Clean</span>
            </div>
          )}
          {facilities?.evCharging && (
            <div className="flex items-center justify-between px-2 py-1 rounded bg-green-50/40 dark:bg-green-950/20 border border-green-100/50 dark:border-green-900/30 text-[9px] font-bold text-green-700 dark:text-green-400">
              <span className="flex items-center gap-1">
                <span>⚡</span>
                <span>EV Charging</span>
              </span>
              <span className="text-green-500/80 font-black">Available</span>
            </div>
          )}
        </div>

        {/* Smaller badges (Parking, Family) */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {facilities?.parking && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-black uppercase bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 text-gray-500 dark:text-neutral-400 rounded">
              <span>🅿️</span> Parking
            </span>
          )}
          {facilities?.familyFriendly && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-black uppercase bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 text-gray-500 dark:text-neutral-400 rounded">
              <span>👥</span> Family
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
