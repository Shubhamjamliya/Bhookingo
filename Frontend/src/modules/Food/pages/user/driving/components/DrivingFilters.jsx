import React from "react";
import { Compass, Leaf, Users, Bath, Zap, ParkingCircle, Wifi } from "lucide-react";
import { cn } from "@food/utils/utils";

const FILTER_ITEMS = [
  {
    id: "all",
    label: "All",
    icon: Compass,
    inactiveIconBg: "bg-orange-50 dark:bg-orange-950/20",
    inactiveIconColor: "text-orange-600 dark:text-orange-400"
  },
  {
    id: "veg",
    label: "Veg",
    icon: Leaf,
    inactiveIconBg: "bg-green-50 dark:bg-green-950/20",
    inactiveIconColor: "text-green-600 dark:text-green-400"
  },
  {
    id: "familyFriendly",
    label: "Family",
    icon: Users,
    inactiveIconBg: "bg-indigo-50 dark:bg-indigo-950/20",
    inactiveIconColor: "text-indigo-600 dark:text-indigo-400"
  },
  {
    id: "washroom",
    label: "Washroom",
    icon: Bath,
    inactiveIconBg: "bg-teal-50 dark:bg-teal-950/20",
    inactiveIconColor: "text-teal-600 dark:text-teal-400"
  },
  {
    id: "evCharging",
    label: "EV",
    icon: Zap,
    inactiveIconBg: "bg-emerald-50 dark:bg-emerald-950/20",
    inactiveIconColor: "text-emerald-600 dark:text-emerald-400"
  },
  {
    id: "parking",
    label: "Parking",
    icon: ParkingCircle,
    inactiveIconBg: "bg-blue-50 dark:bg-blue-950/20",
    inactiveIconColor: "text-blue-600 dark:text-blue-400"
  },
  {
    id: "wifi",
    label: "WiFi",
    icon: Wifi,
    inactiveIconBg: "bg-sky-50 dark:bg-sky-950/20",
    inactiveIconColor: "text-sky-600 dark:text-sky-400"
  },
];

export default function DrivingFilters({ activeFilter, onFilterChange }) {
  return (
    <div className="w-full bg-white dark:bg-[#111111] pt-3 pb-2 px-4 border-b dark:border-neutral-800">
      <div className="flex items-start gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style dangerouslySetInnerHTML={{__html: `
          .flex::-webkit-scrollbar { display: none; }
        `}} />
        {FILTER_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeFilter === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onFilterChange(item.id)}
              className="flex flex-col items-center shrink-0 min-w-[56px] focus:outline-none bg-transparent border-none shadow-none group transition-all duration-200 active:scale-95"
            >
              {/* Circular Icon */}
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200",
                  isActive
                    ? "bg-orange-500 scale-105 shadow-md shadow-orange-500/25"
                    : cn(item.inactiveIconBg, "group-hover:scale-105")
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 transition-colors duration-200",
                    isActive ? "text-white" : item.inactiveIconColor
                  )}
                />
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-[8.5px] font-bold text-center tracking-tight leading-none mt-1 transition-colors duration-200 truncate w-full",
                  isActive ? "text-orange-500 font-extrabold" : "text-gray-600 dark:text-neutral-400"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
