import React from 'react';
import { motion } from 'framer-motion';
import { Utensils, Navigation, MapPin, ShieldCheck, Heart } from 'lucide-react';

const STATS = [
  {
    icon: Utensils,
    value: "1000+",
    label: "Highway Restaurants",
    sublabel: "Verified Quality & Taste"
  },
  {
    icon: Navigation,
    value: "200+",
    label: "Highways Covered",
    sublabel: "National & State Corridors"
  },
  {
    icon: MapPin,
    value: "50+",
    label: "Highway Cities",
    sublabel: "Pan-India Connectivity"
  },
  {
    icon: ShieldCheck,
    value: "100%",
    label: "Safe & Reliable",
    sublabel: "Trusted by 50k+ Travelers"
  },
  {
    icon: Heart,
    value: "Made in India",
    label: "For Indian Travelers",
    sublabel: "Tailored for Road Trips"
  }
];

export default function StatsBarSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#E11D48] py-10 text-white shadow-xl">
      {/* Decorative ambient road overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-black/20 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-2 divide-y md:divide-y-0 md:divide-x divide-white/20 items-center text-center">
          {STATS.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className={`p-3 flex flex-col items-center justify-center space-y-1 ${idx === 4 ? 'col-span-2 md:col-span-1' : ''}`}
            >
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center mb-1 text-white shadow-xs backdrop-blur-sm">
                <stat.icon className="w-4 h-4" />
              </div>
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                {stat.value}
              </span>
              <span className="text-xs sm:text-sm font-bold text-white/95 leading-tight">
                {stat.label}
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-rose-100/80">
                {stat.sublabel}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
