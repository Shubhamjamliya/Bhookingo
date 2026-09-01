import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { Clock, ShieldCheck, Navigation, RotateCw, Sparkles, Utensils } from 'lucide-react';
import { useReducedMotionSafe } from '@/shared/motion/useReducedMotionSafe';
import { MOTION_RULES } from '@/shared/motion/tokens';

/**
 * 3D Interactive Phone Mockup with 3D Flip & Open Animation,
 * mouse parallax, dual-sided view (Drive Mode & Live Menu Ordering),
 * and contextual highway micro-badges.
 */
export default function InteractivePhoneMockup() {
  const containerRef = useRef(null);
  const shouldReduceMotion = useReducedMotionSafe();
  const [isFlipped, setIsFlipped] = useState(false);

  // Mouse position normalized (-0.5 to 0.5)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring physics for rotation
  const springConfig = { damping: 26, stiffness: 180, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Controlled 3D rotation: 4-5 degrees max
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [MOTION_RULES.max3DTilt, -MOTION_RULES.max3DTilt]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-MOTION_RULES.max3DTilt, MOTION_RULES.max3DTilt]);

  const handleMouseMove = (e) => {
    if (shouldReduceMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    mouseX.set(clientX / width - 0.5);
    mouseY.set(clientY / height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const toggleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => {
        setIsFlipped(false);
        handleMouseLeave();
      }}
      style={{ fontFamily: 'var(--font-ui)', perspective: 1200 }}
      className="relative flex flex-col items-center justify-center py-4 sm:py-6 select-none w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[390px] mx-auto px-2 cursor-pointer group"
    >
      {/* Ambient background glow behind mockup */}
      <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-gradient-to-tr from-[#E0332F]/25 via-[#D62828]/15 to-transparent blur-3xl -z-10 pointer-events-none" />

      {/* Interactive Flip Hint Pill */}
      <motion.button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleFlip();
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="mb-3 z-30 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/75 px-3 py-1 text-[10.5px] font-bold text-white shadow-lg backdrop-blur-md transition-colors hover:bg-[#E0332F] cursor-pointer"
      >
        <RotateCw className={`w-3 h-3 text-red-400 transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`} />
        <span>{isFlipped ? 'Showing Live Restaurants' : 'Hover / Click to Flip Screen'}</span>
      </motion.button>

      {/* 3D Rotating & Flipping Container */}
      <motion.div
        initial={{ rotateY: -80, opacity: 0, scale: 0.85 }}
        animate={{
          rotateY: isFlipped ? 180 : 0,
          opacity: 1,
          scale: 1,
          y: shouldReduceMotion ? 0 : [0, -10, 0]
        }}
        transition={{
          rotateY: { duration: 0.75, ease: [0.23, 1, 0.32, 1] },
          opacity: { duration: 0.6 },
          scale: { duration: 0.6 },
          y: { duration: 5, repeat: Infinity, ease: "easeInOut" }
        }}
        style={{
          rotateX: shouldReduceMotion ? 0 : rotateX,
          transformStyle: "preserve-3d",
        }}
        onClick={toggleFlip}
        className="relative flex items-center justify-center pointer-events-none"
      >
        {/* FRONT FACE: Drive Mode App UI */}
        <div
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
          className="relative z-10 shrink-0"
        >
          <img
            src="/Landing page phone.png"
            alt="Bhookingo Highway App Interface"
            className="w-[230px] sm:w-[265px] md:w-[280px] lg:w-[290px] xl:w-[310px] h-auto object-contain pointer-events-none drop-shadow-[0_30px_50px_rgba(0,0,0,0.55)] transition-transform duration-300"
            loading="eager"
          />
        </div>

        {/* BACK FACE: Flipped Live Ordering & Menu UI */}
        <div
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          className="absolute inset-0 z-10 flex items-center justify-center shrink-0"
        >
          <div className="w-[225px] sm:w-[260px] md:w-[275px] lg:w-[285px] xl:w-[305px] rounded-[42px] border-[7px] border-[#18110D] bg-[#18110D] p-1 shadow-[0_30px_55px_rgba(0,0,0,0.65)] overflow-hidden">
            <div className="relative overflow-hidden rounded-[34px] bg-white aspect-[9/19.2]">
              {/* Dynamic Island */}
              <div className="absolute left-1/2 top-2.5 -translate-x-1/2 h-3.5 w-20 rounded-full bg-[#18110D] z-20" />
              <img
                src="/assets/images/how-step2-restaurants.png"
                alt="Bhookingo Restaurant Ordering Screen"
                className="w-full h-full object-cover object-top"
              />
            </div>
          </div>
        </div>

        {/* Floating 3D Badge 1: Top Right - Live Highway Route */}
        <motion.div
          initial={{ opacity: 0, x: 15, y: -10 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          whileHover={{ scale: 1.08, y: -3 }}
          className="absolute top-2 -right-2 sm:-right-4 z-20 hidden xs:flex items-center gap-2 rounded-2xl border border-white/20 bg-black/85 px-3 py-2 text-white shadow-2xl backdrop-blur-md cursor-default pointer-events-auto"
        >
          <div className="w-6 h-6 rounded-xl bg-gradient-to-br from-[#E0332F] to-[#C72420] flex items-center justify-center shadow-sm shrink-0">
            <Navigation className="w-3 h-3 text-white" />
          </div>
          <div>
            <span className="block text-[8.5px] font-bold text-[#FF8582] uppercase tracking-wider">Live Route</span>
            <span className="text-[10.5px] font-bold text-white flex items-center gap-1">
              Forward Only <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            </span>
          </div>
        </motion.div>

        {/* Floating 3D Card 2: Bottom Left - Pre-Order Ready */}
        <motion.div
          initial={{ opacity: 0, x: -15, y: 10 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          whileHover={{ scale: 1.08, y: -3 }}
          className="absolute bottom-4 sm:bottom-6 -left-3 sm:-left-6 z-20 flex items-center gap-2.5 rounded-2xl border border-white/30 bg-white/95 px-3.5 py-2.5 text-slate-900 shadow-[0_15px_35px_rgba(0,0,0,0.25)] backdrop-blur-md cursor-default pointer-events-auto"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[9.5px] font-bold text-emerald-700 uppercase tracking-wider">PRE-ORDER READY</span>
            <span className="text-[11.5px] font-bold text-slate-900">Zero Wait Pickup</span>
          </div>
        </motion.div>

        {/* Floating 3D Badge 3: Bottom Right - Verified Hygiene 4.8★ */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          whileHover={{ scale: 1.08, y: -3 }}
          className="absolute -bottom-1 -right-2 z-20 hidden sm:flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/80 px-3 py-1.5 text-white shadow-xl backdrop-blur-md cursor-default pointer-events-auto"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10.5px] font-bold text-white/90">
            Verified Hygiene 4.8★
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}

