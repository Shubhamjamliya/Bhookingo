import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Flame, Smartphone, Search, ArrowRight, ShieldCheck } from 'lucide-react';
import HighwayRouteVisual from './HighwayRouteVisual';
import InteractivePhoneMockup from './InteractivePhoneMockup';
import FloatingFeatureCards from './FloatingFeatureCards';
import { useReducedMotionSafe } from '@/shared/motion/useReducedMotionSafe';
import { EASING, MOTION_RULES } from '@/shared/motion/tokens';

export default function HeroSection({
  onDownloadClick,
  onBrowseWebClick
}) {
  const shouldReduceMotion = useReducedMotionSafe();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 20]);

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden bg-[#100B08] text-white min-h-[640px] lg:min-h-[700px] flex items-center py-10 sm:py-12 lg:py-16"
    >
      {/* Background Highway Image with Multi-layer Cinematic Vignette */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none overflow-hidden">
        <motion.img
          style={{ y: shouldReduceMotion ? 0 : bgY }}
          src="/assets/images/landingbg.png"
          alt="Highway Sunset Express"
          className="w-full h-full object-cover object-center opacity-85 scale-105"
          loading="eager"
        />
        {/* Layered dark gradients: darker on left for text contrast, open on right */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0C0806]/96 via-[#0E0907]/85 to-[#0E0907]/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#100B08] via-transparent to-black/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#0C0806]/30 to-[#0C0806]/90 pointer-events-none" />
      </div>

      {/* Animated Highway SVG Route and Light Milestones */}
      <HighwayRouteVisual />

      {/* Main Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">

          {/* Left Column: Hero Content & Exact Visual Hierarchy (5 cols) */}
          <div
            className="lg:col-span-5 xl:col-span-5 flex flex-col justify-center lg:pr-2 z-20"
          >
            {/* 1. Small Badge */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div
                className="inline-flex items-center gap-2 rounded-full border border-[#E0332F]/40 bg-[#E0332F]/15 px-3.5 py-1.5 text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-[#FF8582] shadow-xl backdrop-blur-md"
                style={{ fontFamily: 'var(--font-ui)' }}
              >
                <Flame className="w-3.5 h-3.5 text-[#E0332F] fill-[#E0332F] animate-pulse" />
                <span>INDIA'S FIRST HIGHWAY FOOD PLATFORM</span>
              </div>
            </motion.div>

            {/* 2. Main Brand: Bhookingo */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="mt-4 sm:mt-5"
            >
              <h2
                className="text-4xl sm:text-5xl md:text-[3.25rem] lg:text-[3.75rem] xl:text-[4.25rem] font-black text-white tracking-tight leading-none"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Bhookingo
              </h2>
            </motion.div>

            {/* 3. Tagline / Equation: Bhook + in + Go */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="mt-1.5 sm:mt-2"
            >
              <div
                className="text-lg sm:text-xl lg:text-[1.35rem] xl:text-[1.5rem] font-medium italic text-[#E0332F] tracking-wide"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Bhook + in + Go
              </div>
            </motion.div>

            {/* 4. Main Product Heading: Highway Takeaway & Dine-In */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mt-3 sm:mt-3.5"
            >
              <h1
                className="text-xl sm:text-2xl lg:text-[1.85rem] xl:text-[2.1rem] font-bold text-white tracking-tight leading-[1.2]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Highway Takeaway <br className="hidden sm:inline" />
                & Dine-In
              </h1>
            </motion.div>

            {/* 5. Supporting Message */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-5 sm:mt-6"
            >
              <p
                className="text-sm sm:text-base lg:text-lg font-bold text-slate-100 tracking-tight leading-snug"
                style={{ fontFamily: 'var(--font-ui)' }}
              >
                Order Before You Reach. <br className="hidden xs:inline" />
                <span className="text-[#FF8582]">Pick Up Without Waiting.</span>
              </p>
            </motion.div>

            {/* 6. Supporting Description */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-2.5 sm:mt-3"
            >
              <p
                className="text-xs sm:text-sm text-slate-300/90 leading-relaxed max-w-[480px] font-normal"
                style={{ fontFamily: 'var(--font-ui)' }}
              >
                Find forward restaurants on your highway, pre-order hot meals or reserve dine-in, check clean washrooms & EV charging — travel effortlessly with zero waiting.
              </p>
            </motion.div>

            {/* 7. Action Buttons */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-5 sm:mt-6 flex flex-wrap items-center gap-3"
            >
              {/* Primary Download Button */}
              <motion.button
                onClick={onDownloadClick}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="relative group overflow-hidden rounded-full bg-gradient-to-r from-[#E0332F] via-[#D62828] to-[#C72420] px-6 sm:px-7 py-3 sm:py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-[0_8px_25px_rgba(224,51,47,0.35)] hover:shadow-[0_12px_32px_rgba(224,51,47,0.55)] transition-all flex items-center gap-2 cursor-pointer"
                style={{ fontFamily: 'var(--font-ui)' }}
              >
                <Smartphone className="w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-12" />
                <span>Download App</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </motion.button>

              {/* Secondary Browse on Web Button */}
              <motion.button
                onClick={onBrowseWebClick}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="rounded-full border border-white/20 bg-white/10 hover:bg-white/15 px-6 sm:px-7 py-3 sm:py-3.5 text-xs sm:text-sm font-bold tracking-wider text-white shadow-lg backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
                style={{ fontFamily: 'var(--font-ui)' }}
              >
                <Search className="w-3.5 h-3.5 text-slate-300" />
                <span>Browse on Web</span>
              </motion.button>
            </motion.div>

            {/* 8. Bottom Statistics */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="mt-5 sm:mt-6 flex flex-wrap items-center gap-3.5 text-[11px] sm:text-xs font-medium text-slate-400"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>Live on 200+ National Highways</span>
              </div>
              <span className="text-white/20 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% Verified Stops</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: 3D Phone Mockup + Vertical Feature Cards (7 cols) */}
          <div
            className="lg:col-span-7 xl:col-span-7 flex flex-col md:flex-row items-center justify-center lg:justify-end gap-5 xl:gap-6 relative w-full mt-6 lg:mt-0"
          >
            {/* 3D Phone Mockup */}
            <div className="w-full sm:w-auto flex justify-center shrink-0">
              <InteractivePhoneMockup />
            </div>

            {/* Vertical Feature Cards Stack (Restored from Screenshot 3) */}
            <div className="hidden md:flex flex-col shrink-0">
              <FloatingFeatureCards layout="vertical" />
            </div>
          </div>

        </div>

        {/* Mobile / Tablet Horizontal Feature Chips */}
        <div className="md:hidden mt-6 pt-5 border-t border-white/12">
          <FloatingFeatureCards layout="horizontal-chips" />
        </div>
      </div>
    </section>
  );
}


