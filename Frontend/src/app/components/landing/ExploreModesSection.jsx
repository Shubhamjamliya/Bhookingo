import React from 'react';
import { motion } from 'framer-motion';
import { Navigation2, Search, Check, MapPin, Compass, ArrowRight } from 'lucide-react';

export default function ExploreModesSection({
  onDriveModeClick,
  onSearchModeClick
}) {
  return (
    <section className="py-20 md:py-28 bg-[#FCFAF7] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-50 px-4 py-1.5 text-xs font-extrabold uppercase text-[#E11D48]"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>DISCOVERY MODES</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Choose Your Way to <span className="text-[#E11D48]">Explore</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-slate-600 leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Whether you are currently cruising down the highway or planning your road trip from home, Bhookingo has you covered.
          </motion.p>
        </div>

        {/* 2 Mode Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          
          {/* Card 1: Drive Mode (Live Highway Navigation) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            whileHover={{ y: -6 }}
            className="relative rounded-[32px] border border-rose-200/70 bg-gradient-to-br from-white via-rose-50/20 to-orange-50/40 p-7 sm:p-9 shadow-xl shadow-rose-950/5 flex flex-col justify-between overflow-hidden group transition-all"
          >
            {/* Top Recommended Tag */}
            <div className="absolute top-6 right-6 z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E11D48] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                <span>⚡ RECOMMENDED</span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E11D48] to-[#BE123C] text-white flex items-center justify-center shadow-lg shadow-rose-600/30 group-hover:scale-110 transition-transform">
                  <Navigation2 className="w-7 h-7 fill-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-heading)' }}>
                    Drive Mode
                  </h3>
                  <span className="text-xs font-bold text-[#E11D48] uppercase tracking-wider">
                    Live Highway GPS
                  </span>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6" style={{ fontFamily: 'var(--font-body)' }}>
                Real-time active highway copilot that continuously tracks your vehicle's GPS position and displays verified forward restaurants ahead on your route.
              </p>

              {/* Feature bullets */}
              <div className="space-y-3 mb-8">
                {[
                  "Hands-free automated forward radar",
                  "Shows live distance & ETA ahead",
                  "Instant one-tap pre-ordering",
                  "Saves fuel, time & roadside anxiety"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm font-semibold text-slate-800">
                    <div className="w-5 h-5 rounded-full bg-rose-100 text-[#E11D48] flex items-center justify-center shrink-0">
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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-2xl bg-gradient-to-r from-[#E11D48] to-[#DC2626] py-4 px-6 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 group-hover:shadow-rose-600/50 transition-all"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <span>Start Drive Mode</span>
              <Navigation2 className="w-4 h-4 fill-white" />
            </motion.button>
          </motion.div>

          {/* Card 2: Search Mode (Explore by City / Name) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            whileHover={{ y: -6 }}
            className="relative rounded-[32px] border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/40 p-7 sm:p-9 shadow-xl shadow-emerald-950/5 flex flex-col justify-between overflow-hidden group transition-all"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 group-hover:scale-110 transition-transform">
                  <Search className="w-7 h-7 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: 'var(--font-heading)' }}>
                    Search Mode
                  </h3>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Plan & Explore Any Stop
                  </span>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6" style={{ fontFamily: 'var(--font-body)' }}>
                Search specific highway dhabas, multi-cuisine food courts, coffee stops, or EV plazas by name, highway number, or landmark city.
              </p>

              {/* Feature bullets */}
              <div className="space-y-3 mb-8">
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
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-2xl border-2 border-emerald-600 bg-white py-4 px-6 text-sm font-extrabold uppercase tracking-wider text-emerald-700 shadow-md hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2"
              style={{ fontFamily: 'var(--font-body)' }}
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
