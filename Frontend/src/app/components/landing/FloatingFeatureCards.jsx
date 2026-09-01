import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Star, Utensils, Zap, Car } from 'lucide-react';

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
      staggerChildren: 0.08,
      delayChildren: 0.3
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

export default function FloatingFeatureCards({ layout = "vertical" }) {
  if (layout === "horizontal-chips") {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full"
      >
        {FEATURE_ITEMS.map((item, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            whileHover={{ y: -4, scale: 1.02 }}
            className="rounded-2xl border border-white/12 bg-[rgba(255,251,247,0.94)] p-3.5 flex items-center gap-3 shadow-lg shadow-black/10 transition-all hover:border-[#E11D48]/40 hover:shadow-rose-900/20 backdrop-blur-md cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-50 to-red-100 border border-rose-200/60 flex items-center justify-center text-[#E11D48] shrink-0 group-hover:scale-110 transition-transform shadow-xs">
              <item.icon className="w-4 h-4 text-[#E11D48]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-slate-800 truncate group-hover:text-[#E11D48] transition-colors">
                {item.label}
              </span>
              <span className="block text-[10px] text-slate-500 truncate">
                {item.desc}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-2.5 w-full max-w-[270px] shrink-0"
    >
      {FEATURE_ITEMS.map((item, idx) => (
        <motion.div
          key={idx}
          variants={itemVariants}
          whileHover={{
            x: 6,
            y: -2,
            scale: 1.02,
            transition: { duration: 0.2 }
          }}
          className="relative rounded-2xl border border-white/30 bg-white/92 p-3 flex items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.1)] backdrop-blur-md transition-all hover:border-[#E11D48]/40 hover:shadow-[0_14px_35px_rgba(225,29,72,0.18)] cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E11D48] to-[#BE123C] flex items-center justify-center shrink-0 shadow-sm shadow-rose-900/30 group-hover:rotate-6 group-hover:scale-110 transition-transform">
            <item.icon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-xs font-bold text-slate-900 leading-tight truncate group-hover:text-[#E11D48] transition-colors">
              {item.label}
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

export { RestroomIcon, ParkingIcon };
