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
      className="flex gap-4 p-3 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-neutral-800 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5"
    >
      {/* Left: Image with Veg Indicator */}
      <div className="relative w-28 h-28 shrink-0 rounded-xl overflow-hidden bg-gray-50 dark:bg-neutral-800">
        <img 
          src={imageSrc} 
          alt={restaurantName}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = FOOD_IMAGE_FALLBACK; }}
        />
        {pureVegRestaurant && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-green-600 text-white text-[8px] font-black uppercase tracking-wider">
            Veg
          </div>
        )}
      </div>

      {/* Right: Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        
        {/* Name and Rating */}
        <div>
          <div className="flex items-start justify-between gap-1">
            <h4 className="font-extrabold text-sm text-gray-900 dark:text-white truncate flex items-center gap-1">
              {restaurantName}
              <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 fill-current" />
            </h4>
            <div className="flex items-center gap-0.5 text-xs text-orange-600 font-bold shrink-0">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{rating ? rating.toFixed(1) : "0.0"}</span>
            </div>
          </div>
          
          {/* Cuisines */}
          <p className="text-[10px] text-gray-400 dark:text-neutral-500 truncate mt-0.5 font-semibold">
            {cuisines?.length ? cuisines.join(", ") : "North Indian, Fast Food"}
          </p>
        </div>

        {/* Highway ref & Distance */}
        <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-neutral-300 mt-1">
          <span className="text-gray-500 dark:text-neutral-400 font-medium truncate max-w-[70%]">
            {highwayRef}, {distanceKm} km Ahead
          </span>
          <span className="text-[var(--primary)] shrink-0 flex items-center gap-0.5 font-black">
            <Clock className="w-3.5 h-3.5" />
            {etaMinutes} min
          </span>
        </div>

        {/* Facilities list */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {facilities?.washroom && (
            <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-md">
              Washroom
            </span>
          )}
          {facilities?.evCharging && (
            <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400 rounded-md">
              EV Charging
            </span>
          )}
          {facilities?.parking && (
            <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 rounded-md">
              Parking
            </span>
          )}
          {facilities?.familyFriendly && (
            <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 rounded-md">
              Family
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
