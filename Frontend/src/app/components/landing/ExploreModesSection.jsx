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
    <section className="py-12 md:py-16 bg-[#FCFAF7] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-2.5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: MOTION_RULES.interaction, ease: EASING.smooth }}
            className="inline-flex items-center gap-2 rounded-full border border-[#E0332F]/20 bg-red-50 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#E0332F]"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            <Compass className="w-3 h-3" />
            <span>DISCOVERY MODES</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: MOTION_RULES.reveal, delay: 0.08, ease: EASING.smooth }}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-[1.1]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Choose Your Way to <span className="text-[#E0332F]">Explore</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: MOTION_RULES.reveal, delay: 0.15, ease: EASING.smooth }}
            className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            Whether you are currently cruising down the highway or planning your road trip from home, Bhookingo has you covered.
          </motion.p>
        </div>

        {/* 2 Mode Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          
          {/* Card 1: Drive Mode (Live Highway Navigation) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: MOTION_RULES.section, ease: EASING.smooth }}
            whileHover={{ y: -MOTION_RULES.maxHoverLift }}
            className="relative rounded-2xl border border-red-200/70 bg-gradient-to-br from-white via-red-50/20 to-orange-50/40 p-5 sm:p-6 shadow-md shadow-red-950/5 flex flex-col justify-between overflow-hidden group transition-all"
          >
            {/* Top Recommended Tag */}
            <div className="absolute top-4 right-4 z-10">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E0332F] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm" style={{ fontFamily: 'var(--font-ui)' }}>
                <span>⚡ RECOMMENDED</span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#E0332F] via-[#D62828] to-[#C72420] text-white flex items-center justify-center shadow-md shadow-red-600/30 group-hover:scale-105 transition-transform duration-200">
                  <Navigation2 className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
                    Drive Mode
                  </h3>
                  <span className="text-[11px] font-bold text-[#E0332F] uppercase tracking-wider" style={{ fontFamily: 'var(--font-ui)' }}>
                    Live Highway GPS
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4 font-normal" style={{ fontFamily: 'var(--font-ui)' }}>
                Real-time active highway copilot that continuously tracks your vehicle's GPS position and displays verified forward restaurants ahead on your route.
              </p>

              {/* Feature bullets */}
              <div className="space-y-2 mb-6" style={{ fontFamily: 'var(--font-ui)' }}>
                {[
                  "Hands-free automated forward radar",
                  "Shows live distance & ETA ahead",
                  "Instant one-tap pre-ordering",
                  "Saves fuel, time & roadside anxiety"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-800">
                    <div className="w-4 h-4 rounded-full bg-red-100 text-[#E0332F] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
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
              className="w-full rounded-xl bg-gradient-to-r from-[#E0332F] via-[#D62828] to-[#C72420] py-3 px-5 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-red-600/30 flex items-center justify-center gap-2 group-hover:shadow-red-600/50 transition-all cursor-pointer"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              <span>Start Drive Mode</span>
              <Navigation2 className="w-3.5 h-3.5 fill-white" />
            </motion.button>
          </motion.div>

          {/* Card 2: Search Mode (Explore by City / Name) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: MOTION_RULES.section, delay: 0.1, ease: EASING.smooth }}
            whileHover={{ y: -MOTION_RULES.maxHoverLift }}
            className="relative rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/40 p-5 sm:p-6 shadow-md shadow-emerald-950/5 flex flex-col justify-between overflow-hidden group transition-all"
          >
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform duration-200">
                  <Search className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
                    Search Mode
                  </h3>
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider" style={{ fontFamily: 'var(--font-ui)' }}>
                    Plan & Explore Any Stop
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4 font-normal" style={{ fontFamily: 'var(--font-ui)' }}>
                Search specific highway dhabas, multi-cuisine food courts, coffee stops, or EV plazas by name, highway number, or landmark city.
              </p>

              {/* Feature bullets */}
              <div className="space-y-2 mb-6" style={{ fontFamily: 'var(--font-ui)' }}>
                {[
                  "Search by restaurant name or highway",
                  "Explore top culinary stops in any corridor",
                  "View comprehensive menus & verified photos",
                  "Reserve dine-in tables for family & groups"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-800">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
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
              className="w-full rounded-xl border-2 border-emerald-600 bg-white py-3 px-5 text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-700 shadow-sm hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              <span>Explore Restaurants</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
