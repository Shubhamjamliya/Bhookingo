import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Animated SVG Highway Route with glowing markers and traveling lights.
 * Adds a cinematic depth layer to the hero background.
 */
export default function HighwayRouteVisual() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[2]">
      <svg
        className="w-full h-full opacity-60 sm:opacity-80"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          {/* Highway glow filter */}
          <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          
          {/* Subtle line gradient */}
          <linearGradient id="routeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E11D48" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#FB7185" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FDA4AF" stopOpacity="0.2" />
          </linearGradient>

          {/* Marker glow */}
          <radialGradient id="markerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E11D48" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#E11D48" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#E11D48" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer ambient highway curve */}
        <motion.path
          d="M 100,950 C 400,750 650,620 850,420 C 1050,220 1200,120 1380,-50"
          stroke="url(#routeGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#routeGlow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={{ duration: shouldReduceMotion ? 0 : 2.2, ease: "easeOut" }}
        />

        {/* Main dashed highway path */}
        <motion.path
          d="M 100,950 C 400,750 650,620 850,420 C 1050,220 1200,120 1380,-50"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeDasharray="8 12"
          strokeLinecap="round"
          className={shouldReduceMotion ? "" : "animate-road-dash"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.65 }}
          transition={{ duration: 1, delay: 0.5 }}
        />

        {/* Traveling light particle on the highway */}
        {!shouldReduceMotion && (
          <motion.circle
            r="4"
            fill="#FFFFFF"
            filter="url(#routeGlow)"
            initial={{ offsetDistance: "0%" }}
            animate={{ offsetDistance: "100%" }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{
              offsetPath: "path('M 100,950 C 400,750 650,620 850,420 C 1050,220 1200,120 1380,-50')",
            }}
          />
        )}

        {/* Highway Milestone Pin 1 (Start) */}
        <g transform="translate(320, 800)">
          <circle r="14" fill="url(#markerGlow)" className={shouldReduceMotion ? "" : "animate-soft-pulse"} />
          <circle r="5" fill="#E11D48" stroke="#FFFFFF" strokeWidth="2" />
        </g>

        {/* Highway Milestone Pin 2 (Forward Restaurant Ahead) */}
        <g transform="translate(730, 520)">
          <circle r="18" fill="url(#markerGlow)" className={shouldReduceMotion ? "" : "animate-soft-pulse"} style={{ animationDelay: "1s" }} />
          <circle r="6" fill="#E11D48" stroke="#FFFFFF" strokeWidth="2" />
        </g>

        {/* Highway Milestone Pin 3 (Destination / Pick-up) */}
        <g transform="translate(1120, 180)">
          <circle r="16" fill="url(#markerGlow)" className={shouldReduceMotion ? "" : "animate-soft-pulse"} style={{ animationDelay: "2s" }} />
          <circle r="5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}
