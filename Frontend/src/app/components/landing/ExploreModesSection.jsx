import React from 'react';
import { motion } from 'framer-motion';
import { Navigation2, Search, Check, MapPin, Compass, ArrowRight } from 'lucide-react';
import { useReducedMotionSafe } from '@/shared/motion/useReducedMotionSafe';
import { EASING, MOTION_RULES } from '@/shared/motion/tokens';

export default function ExploreModesSection({
  onDriveModeClick,
  onSearchModeClick
}) {
  const shouldReduceMotion = useReducedMotionSafe();

  return (
    <section className="py-20 md:py-28 bg-[#FCFAF7] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: MOTION_RULES.interaction, ease: EASING.smooth }}
            className="inline-flex items-center gap-2 rounded-full border border-[#E0332F]/20 bg-red-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#E0332F]"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>DISCOVERY MODES</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: MOTION_RULES.reveal, delay: 0.08, ease: EASING.smooth }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-[1.05]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Choose Your Way to <span className="text-[#E0332F]">Explore</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: MOTION_RULES.reveal, delay: 0.15, ease: EASING.smooth }}
            className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            Whether you are currently cruising down the highway or planning your road trip from home, Bhookingo has you covered.
          </motion.p>
        </div>

        {/* 2 Mode Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          
          {/* Card 1: Drive Mode (Live Highway Navigation) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: MOTION_RULES.section, ease: EASING.smooth }}
            whileHover={{ y: -MOTION_RULES.maxHoverLift }}
            className="relative rounded-[32px] border border-red-200/70 bg-gradient-to-br from-white via-red-50/20 to-orange-50/40 p-7 sm:p-9 shadow-xl shadow-red-950/5 flex flex-col justify-between overflow-hidden group transition-all"
          >
            {/* Top Recommended Tag */}
            <div className="absolute top-6 right-6 z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E0332F] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md" style={{ fontFamily: 'var(--font-ui)' }}>
                <span>⚡ RECOMMENDED</span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E0332F] via-[#D62828] to-[#C72420] text-white flex items-center justify-center shadow-lg shadow-red-600/30 group-hover:scale-105 transition-transform duration-200">
                  <Navigation2 className="w-7 h-7 fill-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
                    Drive Mode
                  </h3>
                  <span className="text-xs font-bold text-[#E0332F] uppercase tracking-wider" style={{ fontFamily: 'var(--font-ui)' }}>
                    Live Highway GPS
                  </span>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6 font-normal" style={{ fontFamily: 'var(--font-ui)' }}>
                Real-time active highway copilot that continuously tracks your vehicle's GPS position and displays verified forward restaurants ahead on your route.
              </p>

              {/* Feature bullets */}
              <div className="space-y-3 mb-8" style={{ fontFamily: 'var(--font-ui)' }}>
                {[
                  "Hands-free automated forward radar",
                  "Shows live distance & ETA ahead",
                  "Instant one-tap pre-ordering",
                  "Saves fuel, time & roadside anxiety"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm font-semibold text-slate-800">
                    <div className="w-5 h-5 rounded-full bg-red-100 text-[#E0332F] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <motion.button
              onClick={onDriveModeClick}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-2xl bg-gradient-to-r from-[#E0332F] via-[#D62828] to-[#C72420] py-4 px-6 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 group-hover:shadow-red-600/50 transition-all cursor-pointer"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              <span>Start Drive Mode</span>
              <Navigation2 className="w-4 h-4 fill-white" />
            </motion.button>
          </motion.div>

          {/* Card 2: Search Mode (Explore by City / Name) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: MOTION_RULES.section, delay: 0.1, ease: EASING.smooth }}
            whileHover={{ y: -MOTION_RULES.maxHoverLift }}
            className="relative rounded-[32px] border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/40 p-7 sm:p-9 shadow-xl shadow-emerald-950/5 flex flex-col justify-between overflow-hidden group transition-all"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 group-hover:scale-105 transition-transform duration-200">
                  <Search className="w-7 h-7 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
                    Search Mode
                  </h3>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider" style={{ fontFamily: 'var(--font-ui)' }}>
                    Plan & Explore Any Stop
                  </span>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6 font-normal" style={{ fontFamily: 'var(--font-ui)' }}>
                Search specific highway dhabas, multi-cuisine food courts, coffee stops, or EV plazas by name, highway number, or landmark city.
              </p>

              {/* Feature bullets */}
              <div className="space-y-3 mb-8" style={{ fontFamily: 'var(--font-ui)' }}>
                {[
                  "Search by restaurant name or highway",
                  "Explore top culinary stops in any corridor",
                  "View comprehensive menus & verified photos",
                  "Reserve dine-in tables for family & groups"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm font-semibold text-slate-800">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <motion.button
              onClick={onSearchModeClick}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-2xl border-2 border-emerald-600 bg-white py-4 px-6 text-sm font-bold uppercase tracking-wider text-emerald-700 shadow-md hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              <span>Explore Restaurants</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
