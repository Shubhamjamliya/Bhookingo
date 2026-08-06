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
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-950 dark:text-white leading-none">Restaurants Ahead</h3>
            <span className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 mt-1 block">Food stops along your journey</span>
          </div>
        </div>
        <div className="w-9 shrink-0" />
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-3 gap-2 text-center mb-4">
        {/* Next Restaurant Column */}
        <div className="space-y-1">
          <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-neutral-500 tracking-wider block">
            Next Restaurant
          </span>
          <p className="text-base font-black text-gray-900 dark:text-white leading-none">
            {distanceAhead !== null ? `${distanceAhead} km` : "—"}
          </p>
          <span className="text-[8px] font-bold text-gray-400 dark:text-neutral-600 block mt-0.5">
            distance ahead
          </span>
        </div>

        {/* Reach In Column */}
        <div className="space-y-1 border-x border-gray-100 dark:border-neutral-800">
          <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-neutral-500 tracking-wider block">
            Reach In
          </span>
          <p className="text-base font-black text-gray-900 dark:text-white leading-none">
            {nextStopEta !== null ? `${nextStopEta} min` : "—"}
          </p>
          <span className="text-[8px] font-bold text-gray-400 dark:text-neutral-600 block mt-0.5">
            drive time
          </span>
        </div>

        {/* Restaurants Ahead Column */}
        <div className="space-y-1">
          <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-neutral-500 tracking-wider block">
            Restaurants Ahead
          </span>
          <p className="text-base font-black text-gray-900 dark:text-white leading-none">
            {restaurantCount ?? 0}
          </p>
          <span className="text-[8px] font-bold text-gray-400 dark:text-neutral-600 block mt-0.5">
            matching filters
          </span>
        </div>
      </div>

      {/* Progress Track with Car */}
      <div className="relative pt-3 pb-1">
        <div className="h-1.5 w-full bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full bg-orange-500 w-1/3 rounded-full" />
        </div>
        
        {/* Car Pointer */}
        <div 
          className="absolute top-1 left-[30%] -translate-x-1/2 flex flex-col items-center transition-all duration-1000"
        >
          <div className="bg-orange-600 text-white p-1 rounded-full shadow-md border-2 border-white">
            <svg 
              className="w-3.5 h-3.5 fill-current" 
              viewBox="0 0 24 24"
            >
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 11.5v8c0 .83.67 1.5 1.5 1.5h1c.82 0 1.5-.67 1.5-1.5v-1h10v1c0 .83.67 1.5 1.5 1.5h1c.82 0 1.5-.67 1.5-1.5v-8l-2.08-5.49zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.27-3.82c.14-.4.52-.68.96-.68h9.54c.44 0 .82.28.96.68L19 11H5z"/>
            </svg>
          </div>
        </div>

        {/* Flag End Pointer */}
        <div className="absolute -top-0 right-0">
          <div className="bg-red-500 text-white p-1 rounded-md shadow-sm border border-white">
            <Flag className="w-3 h-3 fill-current" />
          </div>
        </div>
      </div>
    </div>
  );
}
