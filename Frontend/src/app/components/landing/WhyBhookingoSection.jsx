import React from 'react';
import { motion } from 'framer-motion';
import { X, Check, ShieldAlert, Sparkles, Clock, Zap } from 'lucide-react';
import { useReducedMotionSafe } from '@/shared/motion/useReducedMotionSafe';
import { EASING, MOTION_RULES } from '@/shared/motion/tokens';

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
  const shouldReduceMotion = useReducedMotionSafe();

  return (
    <section className="py-12 md:py-16 bg-[linear-gradient(180deg,#fff5f4_0%,#fef0ee_45%,#fae2df_100%)] border-y border-[color:var(--landing-line)] relative overflow-hidden">
      {/* Decorative ambient light */}
      <div className="pointer-events-none absolute -right-20 top-1/4 h-96 w-96 rounded-full bg-[rgba(224,51,47,0.08)] blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-1/4 h-96 w-96 rounded-full bg-[rgba(244,63,94,0.06)] blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-2.5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: MOTION_RULES.interaction, ease: EASING.smooth }}
            className="inline-flex items-center gap-2 rounded-full border border-[#E0332F]/20 bg-red-50 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#E0332F]"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            <Sparkles className="w-3 h-3" />
            <span>THE BHOOKINGO ADVANTAGE</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: MOTION_RULES.reveal, delay: 0.08, ease: EASING.smooth }}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-[1.1]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Why Smart Travelers Choose <span className="text-[#E0332F]">Bhookingo</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: MOTION_RULES.reveal, delay: 0.15, ease: EASING.smooth }}
            className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            See how pre-ordering and verified highway amenities completely transform your road trips.
          </motion.p>
        </div>

        {/* Interactive Comparison Cards */}
        <div className="relative max-w-5xl mx-auto" style={{ fontFamily: 'var(--font-ui)' }}>
          
          {/* Central Floating VS Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              delay: 0.15
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 hidden md:flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#fff5f4] bg-slate-950 text-xs font-bold text-white shadow-xl shadow-black/30"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            <span className="tracking-wider">VS</span>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-5 items-stretch">
            
            {/* Card 1: Normal Highway Stop (Left - slides in first) */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: MOTION_RULES.section, ease: EASING.smooth }}
              whileHover={{ y: -MOTION_RULES.maxHoverLift }}
              className="rounded-2xl border border-slate-300/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden flex flex-col justify-between transition-all"
            >
              <div>
                {/* Header */}
                <div className="bg-slate-800 px-5 py-3 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#FF8582]" />
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">Normal Highway Stop</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">Without App</span>
                </div>

                {/* Point List */}
                <div className="p-4 sm:p-5 space-y-2.5">
                  {NORMAL_STOP_POINTS.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-slate-600">
                      <div className="w-4 h-4 rounded-full bg-red-100 border border-red-200 flex items-center justify-center shrink-0 mt-0.5">
                        <X className="w-2.5 h-2.5 text-[#E0332F] stroke-[3]" />
                      </div>
                      <span className="text-xs sm:text-[13px] font-medium leading-snug">{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Result */}
              <div className="bg-red-50/60 p-3 border-t border-red-100 text-center">
                <span className="text-[11px] font-bold text-[#E0332F] uppercase tracking-wide">
                  ⚠️ Average Highway Delay: +40 Mins
                </span>
              </div>
            </motion.div>

            {/* Card 2: With Bhookingo (Right - slides in slightly after) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: MOTION_RULES.section, delay: 0.1, ease: EASING.smooth }}
              whileHover={{ y: -MOTION_RULES.maxHoverLift }}
              className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-white via-emerald-50/30 to-emerald-50/70 shadow-xl shadow-emerald-900/10 overflow-hidden flex flex-col justify-between transition-all relative"
            >
              {/* Highlight ribbon */}
              <div className="absolute top-2.5 right-2.5 z-10">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
                  <Sparkles className="w-2.5 h-2.5 fill-white" />
                  Recommended
                </span>
              </div>

              <div>
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-3 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-200" />
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">With Bhookingo</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-200">Smart Highway</span>
                </div>

                {/* Point List */}
                <div className="p-4 sm:p-5 space-y-2.5">
                  {BHOOKINGO_POINTS.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-slate-900">
                      <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                      </div>
                      <span className="text-xs sm:text-[13px] font-bold leading-snug">{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Result */}
              <div className="bg-emerald-600/10 p-3 border-t border-emerald-200/60 text-center">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide flex items-center justify-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-emerald-600 fill-current" />
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
