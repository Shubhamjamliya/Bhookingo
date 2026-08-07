import React, { useState, useEffect } from "react";
import { ArrowLeft, Compass, Flag } from "lucide-react";

function AnimatedCounter({ value, isInteger = false }) {
  const [displayValue, setDisplayValue] = useState(value === null ? 0 : value);

  useEffect(() => {
    if (value === null || value === undefined) return;
    const start = displayValue;
    const end = value;
    if (start === end) return;

    const duration = 1200; // ms
    let startTime = null;
    let animationFrame;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Smooth easeOutExpo curve
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const current = start + (end - start) * ease;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (value === null) return "—";

  if (isInteger) {
    return Math.round(displayValue);
  }

  // Format distance based on magnitude
  return displayValue >= 10 ? Math.round(displayValue) : displayValue.toFixed(1);
}

export default function DrivingSummaryCard({ highwayRef, distanceAhead, nextStopEta, restaurantCount, onExit }) {
  return (
    <div className="w-full overflow-hidden rounded-b-[28px] border-b border-orange-600 bg-gradient-to-b from-orange-500 via-orange-500 to-orange-400 px-4 pt-3 pb-2.5 shadow-[0_10px_30px_rgba(249,115,22,0.35)] animate-fade-in relative dark:from-orange-600 dark:via-orange-600 dark:to-orange-500">
      
      {/* Top Section */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/20 mb-2.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur-md transition-all hover:bg-white/30 hover:scale-105 active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-inner">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white drop-shadow-md leading-none">Restaurants Ahead</h3>
            <span className="text-[9px] font-bold text-orange-100 mt-0.5 block tracking-wide uppercase">Food stops on {highwayRef || 'your journey'}</span>
          </div>
        </div>
        <div className="w-8 shrink-0" />
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        {/* Next Restaurant Column */}
        <div className="space-y-0.5">
          <span className="text-[8.5px] uppercase font-bold text-orange-100/80 tracking-widest block">
            Next Stop
          </span>
          <p className="text-lg font-black text-white drop-shadow-md leading-none">
            {distanceAhead !== null ? <><AnimatedCounter value={distanceAhead} /> km</> : "—"}
          </p>
          <span className="text-[8px] font-bold text-orange-100 block">
            distance ahead
          </span>
        </div>

        {/* Reach In Column */}
        <div className="space-y-0.5 border-x border-white/20">
          <span className="text-[8.5px] uppercase font-bold text-orange-100/80 tracking-widest block">
            Reach In
          </span>
          <p className="text-lg font-black text-white drop-shadow-md leading-none">
            {nextStopEta !== null ? <><AnimatedCounter value={nextStopEta} isInteger={true} /> min</> : "—"}
          </p>
          <span className="text-[8px] font-bold text-orange-100 block">
            drive time
          </span>
        </div>

        {/* Restaurants Ahead Column */}
        <div className="space-y-0.5">
          <span className="text-[8.5px] uppercase font-bold text-orange-100/80 tracking-widest block">
            Available
          </span>
          <p className="text-lg font-black text-white drop-shadow-md leading-none">
            {restaurantCount ?? 0}
          </p>
          <span className="text-[8px] font-bold text-orange-100 block">
            restaurants
          </span>
        </div>
      </div>

      {/* Progress Track with Car */}
      <div className="relative pt-1 pb-0.5 px-1">
        <div className="h-1 w-full bg-black/20 dark:bg-black/30 rounded-full overflow-hidden shadow-inner">
          <div className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] w-[40%] rounded-full" />
        </div>
        
        {/* Car Pointer */}
        <div 
          className="absolute -top-1 left-[40%] -translate-x-1/2 flex flex-col items-center transition-all duration-1000"
        >
          <div className="bg-white text-orange-500 p-1 rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.15)] border border-orange-100">
            <svg 
              className="w-2.5 h-2.5 fill-current" 
              viewBox="0 0 24 24"
            >
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 11.5v8c0 .83.67 1.5 1.5 1.5h1c.82 0 1.5-.67 1.5-1.5v-1h10v1c0 .83.67 1.5 1.5 1.5h1c.82 0 1.5-.67 1.5-1.5v-8l-2.08-5.49zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.27-3.82c.14-.4.52-.68.96-.68h9.54c.44 0 .82.28.96.68L19 11H5z"/>
            </svg>
          </div>
        </div>

        {/* Flag End Pointer */}
        <div className="absolute -top-2 right-0">
          <div className="bg-red-500 text-white p-0.5 rounded shadow-[0_3px_6px_rgba(239,68,68,0.5)] border border-red-400">
            <Flag className="w-3 h-3 fill-current" />
          </div>
        </div>
      </div>
    </div>
  );
}
