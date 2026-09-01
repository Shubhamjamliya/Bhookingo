import React from 'react';
import { motion } from 'framer-motion';
import { X, Check, ShieldAlert, Sparkles, Clock, Zap } from 'lucide-react';

const NORMAL_STOP_POINTS = [
  "Unpredictable 25–45 min waiting time",
  "Unknown hygiene & questionable food quality",
  "Dirty or unavailable washroom facilities",
  "Cramped or chaotic parking spaces",
  "Zero EV charging availability information",
  "Stressful, unplanned & delayed travel"
];

const BHOOKINGO_POINTS = [
  "Pre-order meals; ready on arrival (0 min wait)",
  "Curated, verified & top-rated food quality",
  "Washroom ratings & authentic traveler photos",
  "Guaranteed spacious & secure parking info",
  "Verified EV fast charging points on route",
  "Planned, luxurious & stress-free highway dining"
];

export default function WhyBhookingoSection() {
  return (
    <section className="py-20 md:py-28 bg-[#FAF8F5] border-y border-slate-200/80 relative overflow-hidden">
      {/* Decorative ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-rose-200/20 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-50 px-4 py-1.5 text-xs font-extrabold uppercase text-[#E11D48]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>THE BHOOKINGO ADVANTAGE</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Why Smart Travelers Choose <span className="text-[#E11D48]">Bhookingo</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-slate-600 leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            See how pre-ordering and verified highway amenities completely transform your road trips.
          </motion.p>
        </div>

        {/* Interactive Comparison Cards */}
        <div className="relative max-w-5xl mx-auto">
          
          {/* Central Floating VS Badge */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 hidden md:flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#FAF8F5] bg-slate-950 text-sm font-black text-white shadow-2xl shadow-black/30">
            <span className="tracking-wider">VS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-6 items-stretch">
            
            {/* Card 1: Normal Highway Stop (Left - slides in from left) */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6 }}
              className="rounded-[32px] border border-slate-300/80 bg-white shadow-lg shadow-slate-200/50 overflow-hidden flex flex-col justify-between transition-all"
            >
              <div>
                {/* Header */}
                <div className="bg-slate-800 px-6 py-4 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                    <span className="text-sm font-bold uppercase tracking-wider">Normal Highway Stop</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">Without App</span>
                </div>

                {/* Point List */}
                <div className="p-6 sm:p-8 space-y-4">
                  {NORMAL_STOP_POINTS.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-slate-600">
                      <div className="w-5 h-5 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0 mt-0.5">
                        <X className="w-3 h-3 text-rose-600 stroke-[3]" />
                      </div>
                      <span className="text-sm font-medium leading-snug">{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Result */}
              <div className="bg-rose-50/60 p-5 border-t border-rose-100 text-center">
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wide">
                  ⚠️ Average Highway Delay: +40 Mins
                </span>
              </div>
            </motion.div>

            {/* Card 2: With Bhookingo (Right - slides in from right) */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6 }}
              className="rounded-[32px] border-2 border-emerald-500/40 bg-gradient-to-b from-white via-emerald-50/30 to-emerald-50/70 shadow-2xl shadow-emerald-900/10 overflow-hidden flex flex-col justify-between transition-all relative"
            >
              {/* Highlight ribbon */}
              <div className="absolute top-3 right-3 z-10">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
                  <Sparkles className="w-3 h-3 fill-white" />
                  Recommended
                </span>
              </div>

              <div>
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-emerald-200" />
                    <span className="text-sm font-black uppercase tracking-wider">With Bhookingo</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-200">Smart Highway</span>
                </div>

                {/* Point List */}
                <div className="p-6 sm:p-8 space-y-4">
                  {BHOOKINGO_POINTS.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-slate-900">
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Check className="w-3 h-3 text-white stroke-[3]" />
                      </div>
                      <span className="text-sm font-bold leading-snug">{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Result */}
              <div className="bg-emerald-600/10 p-5 border-t border-emerald-200/60 text-center">
                <span className="text-xs font-black text-emerald-800 uppercase tracking-wide flex items-center justify-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-600 fill-current" />
                  Save 35+ Mins per stop • 100% Peace of Mind
                </span>
              </div>
            </motion.div>

          </div>
        </div>

      </div>
    </section>
  );
}
