import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { MapPin, Clock, ShieldCheck, Sparkles, Navigation } from 'lucide-react';

/**
 * 3D Interactive Phone Mockup with mouse parallax, floating oscillation,
 * and contextual highway micro-badges.
 */
export default function InteractivePhoneMockup() {
  const containerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  // Mouse position normalized (-0.5 to 0.5)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring physics for rotation
  const springConfig = { damping: 20, stiffness: 180, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Transforms: mouse movement -> 3D rotation
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-12, 12]);
  const shadowX = useTransform(smoothX, [-0.5, 0.5], [-18, 18]);
  const shadowY = useTransform(smoothY, [-0.5, 0.5], [15, 35]);

  const handleMouseMove = (e) => {
    if (shouldReduceMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Center origin (-0.5 to 0.5)
    mouseX.set(clientX / width - 0.5);
    mouseY.set(clientY / height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex items-center justify-center py-6 sm:py-8 select-none perspective-1000 w-full max-w-[380px] sm:max-w-[420px] mx-auto"
    >
      {/* Ambient background glow behind mockup */}
      <div className="absolute w-72 h-72 sm:w-84 sm:h-84 rounded-full bg-gradient-to-tr from-rose-600/25 via-red-500/15 to-transparent blur-3xl -z-10 pointer-events-none" />

      {/* 3D Rotating Container */}
      <motion.div
        style={{
          rotateX: shouldReduceMotion ? 0 : rotateX,
          rotateY: shouldReduceMotion ? 0 : rotateY,
          transformStyle: "preserve-3d",
        }}
        animate={
          shouldReduceMotion
            ? {}
            : {
                y: [0, -10, 0],
              }
        }
        transition={{
          y: {
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }}
        className="relative flex items-center justify-center"
      >
        {/* Main Phone Image */}
        <motion.div
          className="relative z-10 shrink-0"
          style={{
            filter: "drop-shadow(0 30px 50px rgba(0, 0, 0, 0.45))",
          }}
        >
          <img
            src="/Landing page phone.png"
            alt="Bhookingo Highway App Interface"
            className="w-[260px] sm:w-[290px] md:w-[310px] h-auto object-contain pointer-events-none transition-transform duration-300"
            loading="eager"
          />
        </motion.div>

        {/* Floating Interactive Badge 1: Top Right - Live Highway Route */}
        <motion.div
          initial={{ opacity: 0, x: 20, y: -10 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          whileHover={{ scale: 1.05, y: -4 }}
          style={{ transform: "translateZ(35px)" }}
          className="absolute -top-3 sm:top-4 -right-4 sm:-right-8 z-20 hidden xs:flex items-center gap-2 rounded-2xl border border-white/20 bg-black/75 px-3 py-2 text-white shadow-2xl backdrop-blur-md cursor-default"
        >
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-sm shrink-0">
            <Navigation className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="block text-[9px] font-bold text-rose-300 uppercase tracking-wider">Live Route</span>
            <span className="text-[11px] font-extrabold text-white flex items-center gap-1">
              Forward Only <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            </span>
          </div>
        </motion.div>

        {/* Floating Interactive Badge 2: Bottom Left - Pre-Order Status */}
        <motion.div
          initial={{ opacity: 0, x: -20, y: 15 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ delay: 0.8, duration: 0.7 }}
          whileHover={{ scale: 1.05, y: -4 }}
          style={{ transform: "translateZ(45px)" }}
          className="absolute bottom-12 sm:bottom-16 -left-4 sm:-left-10 z-20 flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/90 px-3.5 py-2.5 text-slate-900 shadow-2xl backdrop-blur-md cursor-default"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pre-order Ready</span>
            <span className="text-xs font-black text-slate-900">Zero Wait Pickup</span>
          </div>
        </motion.div>

        {/* Floating Interactive Badge 3: Bottom Right - Clean Washrooms */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.7 }}
          whileHover={{ scale: 1.05, y: -4 }}
          style={{ transform: "translateZ(30px)" }}
          className="absolute -bottom-4 sm:-bottom-2 right-2 sm:right-0 z-20 hidden sm:flex items-center gap-2 rounded-xl border border-white/15 bg-black/60 px-3 py-1.5 text-white shadow-xl backdrop-blur-md cursor-default"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-bold text-white/90">
            Verified Hygiene 4.8★
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
