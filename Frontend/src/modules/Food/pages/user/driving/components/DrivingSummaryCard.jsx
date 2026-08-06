import React from "react";
import { ArrowLeft, Compass, Navigation, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const RollingNumber = ({ value }) => {
  return (
    <span className="relative inline-flex justify-center overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0, position: "absolute", left: 0, right: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="inline-block whitespace-nowrap"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export default function DrivingSummaryCard({ highwayRef, distanceAhead, nextStopEta, restaurantCount, restaurants, maxDistance, onExit }) {
  return (
    <div className="w-full rounded-b-[32px] border-b border-white/20 bg-white/85 dark:bg-[#0a0a0a]/85 backdrop-blur-2xl px-5 py-5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5)] transition-all relative overflow-hidden">
      
      {/* Decorative Gradient Blob (Subtle) */}
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-orange-500/20 dark:bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 dark:bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="group flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 shadow-sm transition-all hover:scale-105 active:scale-95"
            aria-label="Exit Driving Mode"
          >
            <ArrowLeft className="h-4.5 w-4.5 text-gray-700 dark:text-neutral-300 group-hover:text-orange-600 transition-colors" />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
              <span className="text-[10px] font-black tracking-[0.15em] text-orange-600 uppercase">Live Route</span>
            </div>
            <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white leading-none mt-1">
              {highwayRef || "Highway Driving"}
            </h3>
          </div>
        </div>
        
        {/* Restaurants Counter Badge */}
        <div className="flex flex-col items-end">
           <div className="flex items-center gap-1.5 bg-gray-900 dark:bg-white px-2.5 py-1 rounded-full shadow-md">
             <MapPin className="w-3 h-3 text-white dark:text-black" />
             <span className="text-xs font-black text-white dark:text-black">{restaurantCount ?? 0}</span>
           </div>
           <span className="text-[9px] font-bold text-gray-500 dark:text-neutral-400 mt-1 uppercase tracking-wide">Places Ahead</span>
        </div>
      </div>

      {/* Main Stats Area */}
      <div className="flex items-center justify-between bg-white dark:bg-[#121212] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-neutral-800/80 mb-5 relative z-10">
        {/* Distance */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider mb-1">Next Stop</span>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tighter">
              {distanceAhead !== null ? <RollingNumber value={distanceAhead} /> : "—"}
            </span>
            <span className="text-xs font-bold text-gray-500 dark:text-neutral-400 mb-0.5">km</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-gradient-to-b from-transparent via-gray-200 dark:via-neutral-700 to-transparent" />

        {/* ETA */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider mb-1">Reach In</span>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-black text-orange-600 dark:text-orange-500 leading-none tracking-tighter">
              {nextStopEta !== null ? <RollingNumber value={nextStopEta} /> : "—"}
            </span>
            <span className="text-xs font-bold text-gray-500 dark:text-neutral-400 mb-0.5">min</span>
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="relative pt-2 pb-2 z-10 px-2">
        {/* Track Line */}
        <div className="absolute top-1/2 left-0 w-full h-[4px] bg-gray-200 dark:bg-neutral-800 rounded-full -translate-y-1/2 overflow-hidden shadow-inner">
          <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 w-[30%] rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
        </div>

        {/* Blinking Restaurant Dots */}
        {restaurants && restaurants.map((r, i) => {
          const dist = r.distanceKm || 0;
          const maxD = maxDistance || 50;
          const pct = Math.min(dist / maxD, 1);
          // 30% is the car, up to 96% for furthest restaurant so it doesn't overlap the end node
          const leftPos = 30 + (pct * 66);
          
          return (
            <div 
              key={r._id || i}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-0 pointer-events-none"
              style={{ left: `${leftPos}%` }}
            >
              <div className="w-1.5 h-1.5 bg-orange-400 rounded-full shadow-[0_0_6px_rgba(249,115,22,0.9)] animate-pulse" style={{ animationDuration: `${1.5 + (i % 3) * 0.5}s` }} />
            </div>
          );
        })}
        
        {/* Car Pointer */}
        <div 
          className="absolute top-1/2 left-[30%] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-all duration-1000"
        >
          <div className="bg-white dark:bg-neutral-900 text-orange-600 p-1.5 rounded-full shadow-[0_0_12px_rgba(234,88,12,0.4)] border-[2.5px] border-orange-500 relative z-10">
            <Navigation className="w-3.5 h-3.5 fill-current rotate-45" />
            <div className="absolute inset-0 rounded-full border border-orange-500 animate-ping opacity-50" />
          </div>
        </div>

        {/* Destination Node */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 z-0">
          <div className="bg-gray-100 dark:bg-neutral-800 border-[3px] border-white dark:border-[#0a0a0a] w-4 h-4 rounded-full shadow-sm" />
        </div>
      </div>

    </div>
  );
}
