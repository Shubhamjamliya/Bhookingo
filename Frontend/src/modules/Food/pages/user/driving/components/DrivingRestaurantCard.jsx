import React, { useState, useEffect, useMemo } from "react";
import { extractImages } from "@food/utils/common";

const FOOD_IMAGE_FALLBACK =
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80";

/* ── helpers ──────────────────────────────────────────────────────── */
function safeNum(v) {
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function formatDistance(distKm) {
  const n = safeNum(distKm);
  if (n === null) return null;
  return n < 1 ? `${Math.round(n * 1000)} m` : `${n.toFixed(1)} km`;
}

function formatEta(eta) {
  if (!eta) return null;
  if (typeof eta === "string") return eta.includes("min") ? eta : `${eta} min`;
  return `${eta} min`;
}

function formatRatingCount(count) {
  const n = safeNum(count);
  if (!n || n <= 0) return null;
  if (n < 1000) return `(${n})`;
  return `(${(n / 1000).toFixed(1).replace(/\.0$/, "")}K)`;
}

/* facilityRatings[key] → { average, count } or plain number */
function resolveFacilityRating(facilityRatings, key) {
  const entry = facilityRatings?.[key];
  if (!entry) return null;
  if (typeof entry === "object") {
    const avg = safeNum(entry.average);
    return avg !== null && avg > 0 ? avg : null;
  }
  const n = safeNum(entry);
  return n !== null && n > 0 ? n : null;
}

/* ── tiny inline SVGs (zero icon libs) ───────────────────────────── */
const StarSVG = () => (
  <svg width={11} height={11} viewBox="0 0 24 24" className="fill-amber-400 shrink-0">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

/* ── restaurant image (no wrapper bg/border) ─────────────────────── */
function RestaurantImage({ images }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!images || images.length <= 1) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % images.length), 3500);
    return () => clearInterval(t);
  }, [images]);

  return (
    <img
      src={images[idx] || FOOD_IMAGE_FALLBACK}
      alt="Restaurant"
      className="w-[80px] h-[115px] shrink-0 rounded-xl object-cover object-center"
      onError={(e) => { e.target.src = FOOD_IMAGE_FALLBACK; }}
    />
  );
}

/* ── Row 1: featured rated amenity chip ─────────────────────────── */
function FeaturedAmenity({ icon, name, avg }) {
  return (
    <div className="flex items-center gap-1">
      <img src={icon} alt={name} style={{ width: 16, height: 16 }} className="object-cover rounded-full shrink-0 opacity-80" />
      <span className="text-[10.5px] font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{name}</span>
      <StarSVG />
      <span className="text-[10.5px] font-extrabold text-gray-800 dark:text-gray-100">{Number(avg).toFixed(1)}</span>
    </div>
  );
}

/* ── main card ───────────────────────────────────────────────────── */
export default function DrivingRestaurantCard({ restaurant, onClick }) {
  if (!restaurant) return null;

  const {
    restaurantName,
    coverImages,
    pureVegRestaurant,
    rating,
    totalRatings,
    distanceKm,
    etaMinutes,
    cuisines,
    facilities,
    facilityRatings,
    highwayRef,
    isVerified,
  } = restaurant;

  /* food images */
  const foodImages = useMemo(() => {
    const raw = [
      ...(Array.isArray(coverImages) ? coverImages : [coverImages]),
      restaurant.coverImage,
      ...(restaurant.menuImages || []),
      restaurant.onboarding?.step2?.profileImageUrl,
      ...(restaurant.onboarding?.step2?.menuImageUrls || []),
      restaurant.image,
      restaurant.imageUrl,
      restaurant.profileImage,
    ].filter(Boolean);
    const extracted = extractImages(raw);
    return extracted.length > 0 ? extracted : [FOOD_IMAGE_FALLBACK];
  }, [restaurant, coverImages]);

  /* restaurant rating */
  const ratingNum = safeNum(rating);
  const formattedRating = ratingNum && ratingNum > 0 ? ratingNum.toFixed(1) : null;
  const ratingsCount = formatRatingCount(totalRatings);

  /* cuisine text */
  const cuisineText =
    Array.isArray(cuisines) && cuisines.length > 0
      ? cuisines.join(", ")
      : typeof cuisines === "string" && cuisines
        ? cuisines
        : null;

  /* distance / eta */
  const distText = formatDistance(distanceKm);
  const etaText = formatEta(etaMinutes);

  /* highway line */
  const aheadText = distText ? `${distText} Ahead` : null;
  const highwayLine = highwayRef && aheadText
    ? `${highwayRef}, ${aheadText}`
    : aheadText || (highwayRef || null);

  /* amenity definitions */
  const AMENITY_DEFS = [
    { key: "parking", name: "Parking", icon: "/icons/carparking.png", enabled: facilities?.parking !== false },
    { key: "wifi", name: "WiFi", icon: "/icons/wifi.png", enabled: facilities?.wifi !== false },
    { key: "familyFriendly", name: "Family Friendly", icon: "/icons/familyfriendly.png", enabled: facilities?.familyFriendly !== false },
    { key: "evCharging", name: "EV Charging", icon: "/icons/evcharging.png", enabled: facilities?.evCharging === true },
    { key: "washroom", name: "Washroom", icon: "/icons/washroom.png", enabled: facilities?.washroom !== false },
  ];

  /* resolve avg + count for each amenity */
  const resolveFullRating = (key) => {
    const entry = facilityRatings?.[key];
    if (!entry) return { avg: null, count: 0 };
    if (typeof entry === "object") {
      const avg = safeNum(entry.average);
      const count = safeNum(entry.count) ?? 0;
      return { avg: avg && avg > 0 ? avg : null, count };
    }
    const n = safeNum(entry);
    return { avg: n && n > 0 ? n : null, count: 0 };
  };

  /* Row 2 icons: all enabled amenities */
  const enabledAmenities = AMENITY_DEFS.filter((a) => a.enabled);

  /* Row 1: rated amenities sorted by count desc → avg desc, max 2 */
  const featuredAmenities = AMENITY_DEFS
    .filter((a) => a.enabled)
    .map((a) => ({ ...a, ...resolveFullRating(a.key) }))
    .filter((a) => a.avg !== null)
    .sort((a, b) => (b.avg - a.avg) || (b.name.length - a.name.length))
    .slice(0, 1);

  return (
    <div
      onClick={onClick}
      className="flex flex-row items-start gap-3 px-3.5 py-3 bg-white dark:bg-[#161616] border border-gray-100 dark:border-neutral-800 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.07)] hover:shadow-md transition-all duration-200 active:scale-[0.995] cursor-pointer w-full min-w-0"
    >
      {/* ── Left: restaurant image ── */}
      <RestaurantImage images={foodImages} />

      {/* ── Centre: main info ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-1 pt-0.5">

        {/* Line 1 – name + verification */}
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="font-black text-[14px] text-gray-900 dark:text-white leading-tight truncate">
            {restaurantName || "Restaurant"}
          </h3>
          {isVerified && (
            <svg width={14} height={14} viewBox="0 0 24 24" className="fill-blue-500 shrink-0">
              <path d="M12 1L3 5v6c0 5.25 3.75 10.15 9 11.25C17.25 21.15 21 16.25 21 11V5l-9-4zm0 4l5.5 2.45V11c0 3.65-2.5 7.05-5.5 8.1-3-1.05-5.5-4.45-5.5-8.1V7.45L12 5z" />
            </svg>
          )}
        </div>

        {/* Line 2 – highway / ahead */}
        {highwayLine && (
          <p className="text-[11px] text-gray-400 dark:text-neutral-500 font-medium leading-tight truncate">
            {highwayLine}
          </p>
        )}

        {/* Line 3 – rating + cuisine */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {formattedRating && (
            <div className="flex items-center gap-0.5">
              <StarSVG />
              <span className="text-[12px] font-extrabold text-gray-800 dark:text-gray-100">{formattedRating}</span>
            </div>
          )}
          {ratingsCount && (
            <span className="text-[11px] text-gray-400 dark:text-neutral-500 font-medium">{ratingsCount}</span>
          )}
          {cuisineText && (
            <>
              {(formattedRating || ratingsCount) && (
                <span className="text-gray-300 dark:text-neutral-600 text-[11px]">•</span>
              )}
              <span className="text-[11px] text-gray-500 dark:text-neutral-400 font-medium truncate">{cuisineText}</span>
            </>
          )}
        </div>

        {/* Row 1 – top 2 rated amenities: icon + name + star + rating */}
        {featuredAmenities.length > 0 && (
          <div className="flex items-center gap-3 mt-0.5">
            {featuredAmenities.map((a) => (
              <FeaturedAmenity key={a.key} icon={a.icon} name={a.name} avg={a.avg} />
            ))}
          </div>
        )}

        {/* Row 2 – circular icon buttons for all enabled amenities */}
        {enabledAmenities.length > 0 && (
          <div className="flex items-center gap-2 pt-1.5 mt-0.5 border-t border-gray-100 dark:border-neutral-800">
            {enabledAmenities.map((a) => (
              <img
                key={a.key}
                src={a.icon}
                alt={a.name}
                title={a.name}
                style={{ width: 22, height: 22 }}
                className="object-cover rounded-full shrink-0 opacity-75 hover:opacity-100 transition-opacity"
              />
            ))}
          </div>
        )}

      </div>

      {/* ── Right: distance + ETA ── */}
      {(distText || etaText) && (
        <div className="shrink-0 flex flex-col items-end gap-0.5 pt-0.5">
          {distText && (
            <span className="text-[13px] font-extrabold text-orange-500 dark:text-orange-400 whitespace-nowrap">
              {distText}
            </span>
          )}
          {etaText && (
            <span className="text-[11px] font-semibold text-gray-400 dark:text-neutral-500 whitespace-nowrap">
              {etaText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
