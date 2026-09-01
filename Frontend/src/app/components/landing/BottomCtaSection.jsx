import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Smartphone, ArrowRight, ShieldCheck, Star } from 'lucide-react';

export default function BottomCtaSection({ onAuthClick }) {
  return (
    <section className="relative overflow-hidden bg-[#150F0B] py-16 md:py-20 text-white border-y border-white/10">
      {/* Background highway ambient glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 rounded-[36px] bg-gradient-to-r from-white/8 via-white/5 to-white/8 p-8 sm:p-12 border border-white/15 backdrop-blur-xl shadow-2xl">
          
          {/* Left Text */}
          <div className="space-y-3 text-center lg:text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-950/60 px-3.5 py-1 text-xs font-extrabold uppercase text-rose-300">
              <Star className="w-3.5 h-3.5 fill-current text-rose-400" />
              <span>START TRAVELING SMARTER</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              Hungry on the Highway? <br className="hidden sm:inline" />
              <span className="text-[#E11D48]">Order Before You Arrive.</span>
            </h2>

            <p className="text-base text-slate-300 font-medium" style={{ fontFamily: 'var(--font-body)' }}>
              Save 30-45 minutes per stop. Experience verified dhabas, clean restrooms, and piping hot food ready the moment you step in.
            </p>
          </div>

          {/* Right App Store & Google Play Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 shrink-0">
            {/* Google Play Button */}
            <motion.button
              onClick={onAuthClick}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              className="bg-black hover:bg-slate-900 text-white px-6 py-3.5 rounded-2xl border border-white/20 flex items-center gap-3.5 shadow-xl transition-all group"
            >
              <svg className="w-7 h-7 shrink-0" viewBox="0 0 24 24" fill="none">
                <path d="M3.25 2.3c-.15.15-.25.38-.25.68v18.04c0 .3.1.53.25.68l.08.08L13.5 12.18v-.18L3.33 2.22l-.08.08z" fill="url(#bottomCtaPlay1)" />
                <path d="M16.89 15.63l-3.39-3.39v-.18l3.39-3.39.08.05 4.01 2.28c1.15.65 1.15 1.73 0 2.38l-4.01 2.28-.08-.03z" fill="url(#bottomCtaPlay2)" />
                <path d="M13.59 12.09L3.33 22.25c.38.4 1 .33 1.55.02l12.01-6.84-3.3-3.34z" fill="url(#bottomCtaPlay3)" />
                <path d="M13.59 12.09l3.3-3.34-12.01-6.84c-.55-.31-1.17-.38-1.55.02l10.26 10.16z" fill="url(#bottomCtaPlay4)" />
                <defs>
                  <linearGradient id="bottomCtaPlay1" x1="10.23" y1="2.46" x2="-2.04" y2="14.73" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#00a0ff" />
                    <stop offset="0.01" stopColor="#00a1ff" />
                    <stop offset="0.26" stopColor="#00beff" />
                    <stop offset="0.57" stopColor="#00d7ff" />
                    <stop offset="0.86" stopColor="#00e6ff" />
                    <stop offset="1" stopColor="#00ebff" />
                  </linearGradient>
                  <linearGradient id="bottomCtaPlay2" x1="22.27" y1="12" x2="3.19" y2="12" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#ff3a44" />
                    <stop offset="1" stopColor="#c31162" />
                  </linearGradient>
                  <linearGradient id="bottomCtaPlay3" x1="16.5" y1="15.89" x2="-2.26" y2="34.65" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#00e676" />
                    <stop offset="1" stopColor="#12c37d" />
                  </linearGradient>
                  <linearGradient id="bottomCtaPlay4" x1="10.45" y1="10.15" x2="-2.25" y2="-2.55" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#ffe000" />
                    <stop offset="0.4" stopColor="#ffca00" />
                    <stop offset="0.77" stopColor="#ff9f00" />
                    <stop offset="1" stopColor="#ff7a00" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="text-left">
                <span className="text-[10px] uppercase tracking-wider block text-slate-400 font-bold">GET IT ON</span>
                <span className="text-sm font-extrabold leading-none text-white">Google Play</span>
              </div>
            </motion.button>

            {/* App Store Button */}
            <motion.button
              onClick={onAuthClick}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              className="bg-black hover:bg-slate-900 text-white px-6 py-3.5 rounded-2xl border border-white/20 flex items-center gap-3.5 shadow-xl transition-all group"
            >
              <svg className="w-7 h-7 fill-current text-white shrink-0" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.8 16.32 3.98 9.58 8.1 9.28c1.37.1 2.2.78 3.03.8.84-.02 1.86-.8 3.42-.65 1.64.16 2.82.88 3.5 1.95-3.22 1.88-2.69 6.08.28 7.3-.7 1.76-1.52 3.48-3.28 3.6zM12.03 9.25c-.15-2.23 1.66-4.14 3.75-4.25.2 2.52-2.1 4.54-3.75 4.25z" />
              </svg>
              <div className="text-left">
                <span className="text-[10px] uppercase tracking-wider block text-slate-400 font-bold">DOWNLOAD ON THE</span>
                <span className="text-sm font-extrabold leading-none text-white">App Store</span>
              </div>
            </motion.button>
          </div>

        </div>
      </div>
    </section>
  );
}
