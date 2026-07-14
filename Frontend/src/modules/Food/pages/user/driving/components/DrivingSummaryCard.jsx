import React from "react";
import { Navigation, Clock, UtensilsCrossed, Flag, Compass } from "lucide-react";

export default function DrivingSummaryCard({ highwayRef, distanceAhead, nextStopEta, restaurantCount }) {
  return (
    <div className="w-full bg-white dark:bg-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.08)] rounded-2xl overflow-hidden border border-gray-100 dark:border-neutral-800 p-4 animate-fade-in relative z-10">
      
      {/* Top Section */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
            <Compass className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white leading-none">Restaurants Ahead</h3>
            <span className="text-xs text-gray-500 dark:text-neutral-400">Delicious stops on your highway</span>
          </div>
        </div>
        {highwayRef && (
          <span className="px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase text-orange-700 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200/40">
            On {highwayRef}
          </span>
        )}
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-3 gap-2 text-center mb-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Distance Ahead</span>
          <p className="text-lg font-black text-gray-900 dark:text-white leading-none">
            {distanceAhead !== null ? `${distanceAhead} km` : "—"}
          </p>
        </div>
        <div className="space-y-1 border-x border-gray-100 dark:border-neutral-800">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Next Stop ETA</span>
          <p className="text-lg font-black text-gray-900 dark:text-white leading-none">
            {nextStopEta !== null ? `${nextStopEta} min` : "—"}
          </p>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Restaurants</span>
          <p className="text-lg font-black text-gray-900 dark:text-white leading-none">
            {restaurantCount ?? 0}
          </p>
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
