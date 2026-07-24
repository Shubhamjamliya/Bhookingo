import React from "react";
import { Compass, Flag } from "lucide-react";

export default function DrivingSummaryCard({ highwayRef, distanceAhead, nextStopEta, restaurantCount, onExit }) {
  return (
    <div className="w-full bg-white dark:bg-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.08)] rounded-2xl overflow-hidden border border-gray-100 dark:border-neutral-800 p-4 animate-fade-in relative z-10">
      
      {/* Top Section */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800 mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
            <Compass className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-950 dark:text-white leading-none">Restaurants Ahead</h3>
            <span className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 mt-1 block">Food stops along your journey</span>
          </div>
        </div>
        {/* Exit button */}
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-800/40 text-red-600 dark:text-red-400 text-[10px] font-black tracking-wide uppercase hover:bg-red-100 dark:hover:bg-red-900/40 active:scale-95 transition-all"
        >
          <svg width={10} height={10} viewBox="0 0 24 24" className="fill-current shrink-0">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
          Exit
        </button>
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
