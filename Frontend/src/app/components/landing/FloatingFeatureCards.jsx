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
  { icon: MapPin, label: "Forward Restaurants", desc: "Only ahead on your highway" },
  { icon: Clock, label: "Save Time & Money", desc: "Zero waiting at highway stops" },
  { icon: Star, label: "Quality Food Every Time", desc: "Curated & verified highway dining" },
  { icon: RestroomIcon, label: "Clean Washrooms Info", desc: "Real traveler ratings & photos" },
  { icon: Utensils, label: "Dine-in & Takeaway", desc: "Ready before you step in" },
  { icon: Zap, label: "EV Charging On Route", desc: "Fast chargers at dining stops" },
  { icon: ParkingIcon, label: "Parking Info Easy & Safe", desc: "Spacious & secure parking spots" }
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
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full"
      >
        {FEATURE_ITEMS.map((item, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-white/40 bg-[#EDE8E3]/95 p-3 flex items-center gap-3 shadow-md transition-all hover:bg-white hover:shadow-lg cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E0332F] to-[#C72420] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <item.icon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs sm:text-sm font-bold text-slate-900 truncate">
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
      className="flex flex-col gap-2.5 w-full max-w-[270px] xl:max-w-[290px] shrink-0"
    >
      {FEATURE_ITEMS.map((item, idx) => (
        <motion.div
          key={idx}
          variants={itemVariants}
          whileHover={{
            x: 6,
            scale: 1.02,
            transition: { duration: 0.2 }
          }}
          className="relative rounded-[22px] border border-white/60 bg-[#EDE8E3]/95 hover:bg-white px-4 py-2.5 flex items-center gap-3.5 shadow-md hover:shadow-xl transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E0332F] to-[#C72420] text-white flex items-center justify-center shrink-0 shadow-sm shadow-red-900/30 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
            <item.icon className="w-4.5 h-4.5 text-white transition-transform duration-300 group-hover:rotate-6" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-[13px] font-bold text-slate-900 leading-snug group-hover:text-[#E0332F] transition-colors">
              {item.label}
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

export { RestroomIcon, ParkingIcon };

