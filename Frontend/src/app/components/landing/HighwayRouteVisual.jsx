import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Star, Navigation2, Zap, Clock } from 'lucide-react';
import { useReducedMotionSafe } from '@/shared/motion/useReducedMotionSafe';
import { EASING, MOTION_RULES } from '@/shared/motion/tokens';

const MILESTONES = [
  {
    id: 1,
    x: 750,
    y: 780,
    name: "NH-48 Expressway Corridor",
    subtitle: "Start Journey • 0 km",
    badge: "Live GPS",
    icon: Navigation2,
    accent: "#E0332F",
  },
  {
    id: 2,
    x: 930,
    y: 530,
    name: "Rao Heritage Dhaba",
    subtitle: "2.4 km Ahead • 4.8 ★",
    badge: "Pre-order Ready",
    icon: Clock,
    accent: "#E0332F",
    highlight: "Zero Wait Takeaway"
  },
  {
    id: 3,
    x: 1110,
    y: 330,
    name: "Express Highway Plaza",
    subtitle: "14 km Ahead • 4.9 ★",
    badge: "Verified Restrooms & EV",
    icon: Zap,
    accent: "#10B981",
    highlight: "Dine-In Reserved"
  },
  {
    id: 4,
    x: 1270,
    y: 150,
    name: "Zero-Wait Hub",
    subtitle: "32 km Ahead • Destination Stop",
    badge: "Food Handover Point",
    icon: MapPin,
    accent: "#E0332F",
    highlight: "Hot Meal Ready"
  }
];

export default function HighwayRouteVisual() {
  const shouldReduceMotion = useReducedMotionSafe();
  const [activeMarker, setActiveMarker] = useState(null);

  // SVG Path from bottom right to top right, staying behind the right-hand phone area
  const routePath = "M 750,880 C 820,740 920,600 1020,460 C 1120,320 1200,220 1340,80";

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[2]">
      <svg
        className="w-full h-full opacity-65 sm:opacity-85"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          {/* Highway ambient glow */}
          <filter id="heroRouteGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Glowing gradient for highway curve */}
          <linearGradient id="heroRouteGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E0332F" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#FF5753" stopOpacity="0.65" />
            <stop offset="85%" stopColor="#FFA4A2" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
          </linearGradient>

          {/* Marker glow filter */}
          <radialGradient id="heroMarkerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E0332F" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#E0332F" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#E0332F" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer Glow Route Path */}
        <motion.path
          d={routePath}
          stroke="url(#heroRouteGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          filter="url(#heroRouteGlow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={{ duration: shouldReduceMotion ? 0 : 2.0, ease: EASING.smooth }}
        />

        {/* Main Dashed Highway Route Line */}
        <motion.path
          d={routePath}
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeDasharray="8 12"
          strokeLinecap="round"
          className={shouldReduceMotion ? "" : "animate-road-dash"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        />

        {/* Interactive Highway Milestones */}
        {MILESTONES.map((m, idx) => {
          const isHovered = activeMarker === m.id;
          const isDestination = m.id === 4;
          return (
            <g
              key={m.id}
              transform={`translate(${m.x}, ${m.y})`}
              className="pointer-events-auto cursor-pointer"
              onMouseEnter={() => setActiveMarker(m.id)}
              onMouseLeave={() => setActiveMarker(null)}
            >
              {/* Outer ring (subtle pulse only on destination or when hovered) */}
              <circle
                r={isHovered ? 24 : isDestination ? 18 : 12}
                fill="url(#heroMarkerGlow)"
                className={shouldReduceMotion ? "" : isDestination ? "animate-soft-pulse" : ""}
                style={{ transition: "all 0.3s ease" }}
              />

              {/* Pin Center Core */}
              <circle
                r={isHovered ? 7 : 5}
                fill={m.accent}
                stroke="#FFFFFF"
                strokeWidth={isHovered ? 2.5 : 2}
                className="transition-all duration-300"
              />
            </g>
          );
        })}
      </svg>

      {/* Floating Info Tooltip on Hover */}
      <AnimatePresence>
        {activeMarker && (
          <motion.div
            key={activeMarker}
            initial={{ opacity: 0, y: 10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.92 }}
            transition={{ duration: 0.2 }}
            style={{
              fontFamily: 'var(--font-ui)',
              left: `${(MILESTONES.find(m => m.id === activeMarker)?.x / 1440) * 100}%`,
              top: `${(MILESTONES.find(m => m.id === activeMarker)?.y / 900) * 100}%`,
            }}
            className="absolute -translate-x-1/2 -translate-y-[135%] z-30 pointer-events-none hidden md:block"
          >
            {(() => {
              const item = MILESTONES.find(m => m.id === activeMarker);
              if (!item) return null;
              const Icon = item.icon;
              return (
                <div className="rounded-2xl border border-white/20 bg-slate-950/90 px-3.5 py-2.5 shadow-2xl backdrop-blur-xl text-white min-w-[200px]">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-lg bg-red-500/20 text-[#FF8582] flex items-center justify-center">
                      <Icon className="w-3 h-3 text-[#E0332F]" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF8582]">
                      {item.badge}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white">{item.name}</div>
                  <div className="text-[11px] text-slate-300 flex items-center gap-1.5 mt-0.5">
                    <span>{item.subtitle}</span>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
