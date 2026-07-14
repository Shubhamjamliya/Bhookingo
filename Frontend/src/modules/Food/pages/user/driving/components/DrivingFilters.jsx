import React from "react";
import { Compass, Leaf, Users, MapPin, Eye, Zap, Flame } from "lucide-react";
import { cn } from "@food/utils/utils";

const FILTER_ITEMS = [
  { id: "all", label: "All", icon: Compass },
  { id: "veg", label: "Veg", icon: Leaf },
  { id: "family", label: "Family", icon: Users },
  { id: "washroom", label: "Washroom", icon: Flame }, // Lucide Flame as marker/washroom or other
  { id: "evCharging", label: "EV Charging", icon: Zap },
  { id: "parking", label: "Parking", icon: MapPin }
];

export default function DrivingFilters({ activeFilter, onFilterChange }) {
  return (
    <div className="w-full bg-white dark:bg-[#1a1a1a] py-3 px-4 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] border-b dark:border-neutral-800">
      <style>{`
        .filters-scroll-hide::-webkit-scrollbar {
          display: none;
        }
        .filters-scroll-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <div className="flex gap-2.5 overflow-x-auto filters-scroll-hide pb-0.5">
        {FILTER_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeFilter === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onFilterChange(item.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-tight transition-all duration-300",
                "border focus:outline-none shrink-0",
                isActive
                  ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md shadow-[var(--primary)]/20 scale-105"
                  : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800 hover:bg-gray-100"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive ? "animate-pulse" : "text-gray-400 dark:text-neutral-500")} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
