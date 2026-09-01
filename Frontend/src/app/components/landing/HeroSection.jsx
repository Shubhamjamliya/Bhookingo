import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Flame, Smartphone, Search, ArrowRight, Sparkles } from 'lucide-react';
import HighwayRouteVisual from './HighwayRouteVisual';
import InteractivePhoneMockup from './InteractivePhoneMockup';
import FloatingFeatureCards from './FloatingFeatureCards';

export default function HeroSection({
  onDownloadClick,
  onBrowseWebClick
}) {
  const shouldReduceMotion = useReducedMotion();

  const heroContentVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.12 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  return (
    <section className="relative overflow-hidden bg-[#120B08] text-white min-h-[680px] lg:min-h-[760px] flex items-center py-12 lg:py-20">
      {/* Background Highway Image with Multi-layer Cinematic Gradient */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <motion.img
          src="/assets/images/landingbg.png"
          alt="Highway Sunset Express"
          className="w-full h-full object-cover object-center opacity-90 scale-105"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: shouldReduceMotion ? 0 : 3, ease: "easeOut" }}
        />
        {/* Layered dark gradients for pristine readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0E0907]/95 via-[#0E0907]/80 to-[#0E0907]/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#120B08] via-transparent to-black/50" />
      </div>

      {/* Animated Highway SVG Route and Light Milestones */}
      <HighwayRouteVisual />

      {/* Main Content Container */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">

          {/* Left Column: Hero Typography & CTA (5.5 cols) */}
          <motion.div
            variants={heroContentVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-6 xl:col-span-5 space-y-6 lg:pr-4"
          >
            {/* Top Brand Ribbon */}
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-950/60 px-4 py-2 text-[11px] font-extrabold uppercase text-rose-300 shadow-xl backdrop-blur-md">
              <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
              <span className="tracking-wider">INDIA'S FIRST HIGHWAY FOOD PLATFORM</span>
            </motion.div>

            {/* Main Headline */}
            <motion.div variants={itemVariants} className="space-y-1">
              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] xl:text-[3.65rem] font-extrabold text-white tracking-tight leading-[1.04]" style={{ fontFamily: 'var(--font-heading)' }}>
                <span className="inline-block text-white">Bhookingo</span>{" "}
                <span className="text-[#E11D48]">=</span>{" "}
                <span className="text-[#E11D48] font-bold text-3xl sm:text-4xl lg:text-[2.6rem] block sm:inline-block">
                  Bhook + in + Go
                </span>
                <span className="block mt-2 text-2xl sm:text-3xl lg:text-[2.2rem] font-bold text-slate-100 leading-snug">
                  Highway Takeaway & Dine-In
                </span>
              </h1>
            </motion.div>

            {/* Sub-headline */}
            <motion.div variants={itemVariants} className="space-y-1">
              <p className="text-xl sm:text-2xl font-bold text-slate-200 leading-snug" style={{ fontFamily: 'var(--font-heading)' }}>
                Order Before You Reach. <br />
                <span className="text-[#FDA4AF]">Pick Up Without Waiting.</span>
              </p>
              <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed max-w-lg pt-1" style={{ fontFamily: 'var(--font-body)' }}>
                Find forward restaurants on your highway, pre-order hot meals or reserve dine-in, check clean washrooms & EV charging — travel effortlessly with zero waiting.
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div variants={itemVariants} className="pt-2 flex flex-wrap items-center gap-4">
              <motion.button
                onClick={onDownloadClick}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="relative group overflow-hidden rounded-full bg-gradient-to-r from-[#E11D48] via-[#DC2626] to-[#BE123C] px-8 py-4 text-sm font-bold text-white shadow-[0_10px_30px_rgba(225,29,72,0.4)] transition-all hover:shadow-[0_15px_40px_rgba(225,29,72,0.6)] flex items-center gap-2.5"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {/* Subtle sheen highlight */}
                <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out" />
                <Smartphone className="w-4 h-4 transition-transform group-hover:rotate-12" />
                <span>Download App</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </motion.button>

              <motion.button
                onClick={onBrowseWebClick}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="rounded-full border border-white/25 bg-white/10 px-8 py-4 text-sm font-bold text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/20 hover:border-white/40 flex items-center gap-2.5"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <Search className="w-4 h-4 text-slate-300" />
                <span>Browse on Web</span>
              </motion.button>
            </motion.div>

            {/* Trust Indicator */}
            <motion.div variants={itemVariants} className="pt-2 flex items-center gap-4 text-xs font-semibold text-slate-400">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>Live on 200+ National Highways</span>
              </div>
              <span className="text-white/20">•</span>
              <span>100% Verified Stops</span>
            </motion.div>
          </motion.div>

          {/* Right Column: 3D Phone Mockup + Floating Feature Cards (6.5 cols) */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col lg:flex-row items-center justify-center lg:justify-end gap-6 xl:gap-8">
            {/* Interactive 3D Phone Mockup */}
            <div className="w-full lg:w-auto flex justify-center">
              <InteractivePhoneMockup />
            </div>

            {/* Floating Feature Cards (Desktop Stack) */}
            <div className="hidden lg:flex flex-col">
              <FloatingFeatureCards layout="vertical" />
            </div>
          </div>

        </div>

        {/* Mobile / Tablet Horizontal Feature Chips */}
        <div className="lg:hidden mt-12 pt-8 border-t border-white/12">
          <FloatingFeatureCards layout="horizontal-chips" />
        </div>
      </div>
    </section>
  );
}
