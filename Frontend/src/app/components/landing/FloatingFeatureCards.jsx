import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Star, Utensils, Zap, Car } from 'lucide-react';
import { useReducedMotionSafe } from '@/shared/motion/useReducedMotionSafe';
import { EASING, MOTION_RULES } from '@/shared/motion/tokens';

function RestroomIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M9 10v7l-2 5" />
      <path d="M9 17l2 5" />
      <path d="M6 11h6" />
      <path d="M16 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M16 10l2.5 5h-5L16 10Z" />
      <path d="M14.5 17l-1 5" />
      <path d="M17.5 17l1 5" />
    </svg>
  );
}

function ParkingIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
    </svg>
  );
}

const FEATURE_ITEMS = [
  { icon: MapPin, label: "Forward Restaurants", desc: "Only ahead on your highway", iconAnim: "group-hover:-translate-y-1.5 group-hover:scale-120" },
  { icon: Clock, label: "Save Time & Money", desc: "Zero waiting at highway stops", iconAnim: "group-hover:rotate-180 group-hover:scale-120 duration-500" },
  { icon: Star, label: "Quality Food Every Time", desc: "Curated & verified highway dining", iconAnim: "group-hover:rotate-45 group-hover:scale-125" },
  { icon: RestroomIcon, label: "Clean Washrooms Info", desc: "Real traveler ratings & photos", iconAnim: "group-hover:-rotate-12 group-hover:scale-120" },
  { icon: Utensils, label: "Dine-in & Takeaway", desc: "Ready before you step in", iconAnim: "group-hover:rotate-12 group-hover:scale-125" },
  { icon: Zap, label: "EV Charging On Route", desc: "Fast chargers at dining stops", iconAnim: "group-hover:scale-130 group-hover:translate-x-1" },
  { icon: ParkingIcon, label: "Parking Info Easy & Safe", desc: "Spacious & secure parking spots", iconAnim: "group-hover:-translate-y-1 group-hover:scale-120" }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.25
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: 14 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: MOTION_RULES.reveal, ease: EASING.smooth }
  }
};

export default function FloatingFeatureCards({ layout = "vertical" }) {
  if (layout === "horizontal-chips") {
    return (
      <div
        style={{ fontFamily: 'var(--font-ui)' }}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 w-full"
      >
        {FEATURE_ITEMS.map((item, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-white/40 bg-[#EDE8E3]/95 p-2.5 flex items-center gap-2.5 shadow-sm transition-all hover:bg-white hover:shadow-md cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E0332F] to-[#C72420] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 group-hover:-rotate-12 group-hover:shadow-[0_4px_12px_rgba(224,51,47,0.35)] transition-all duration-300">
              <item.icon className={`w-3.5 h-3.5 text-white transition-transform duration-300 ${item.iconAnim || 'group-hover:scale-110'}`} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-slate-900 truncate">
                {item.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{ fontFamily: 'var(--font-ui)' }}
      className="flex flex-col gap-2 sm:gap-2.5 w-full max-w-[270px] xl:max-w-[290px] shrink-0"
    >
      {FEATURE_ITEMS.map((item, idx) => (
        <motion.div
          key={idx}
          variants={itemVariants}
          whileHover={{
            x: 4,
            scale: 1.02,
            transition: { duration: 0.2 }
          }}
          className="relative rounded-full border border-white/70 bg-[#EDE8E3]/95 hover:bg-white px-3.5 py-2 sm:py-2.5 flex items-center gap-3 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-br from-[#E0332F] to-[#C72420] text-white flex items-center justify-center shrink-0 shadow-xs shadow-red-900/30 group-hover:scale-110 group-hover:-rotate-12 group-hover:shadow-[0_4px_14px_rgba(224,51,47,0.4)] transition-all duration-300">
            <item.icon className={`w-4 h-4 text-white transition-transform duration-300 ${item.iconAnim || 'group-hover:rotate-6 group-hover:scale-110'}`} />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <span className="block text-[12px] sm:text-[12.5px] font-bold text-slate-900 leading-tight group-hover:text-[#E0332F] transition-colors">
              {item.label}
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

export { RestroomIcon, ParkingIcon };

