import React from "react";
import { ArrowLeft, Compass, Flag } from "lucide-react";

export default function DrivingSummaryCard({ highwayRef, distanceAhead, nextStopEta, restaurantCount, onExit }) {
  return (
    <div className="w-full overflow-hidden rounded-b-[28px] border-b border-orange-400 bg-white px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)] animate-fade-in relative dark:border-orange-500 dark:bg-[#0a0a0a]">
      
      {/* Top Section */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800 mb-3.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
            <Compass className="w-4 h-4 text-orange-600" />
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
