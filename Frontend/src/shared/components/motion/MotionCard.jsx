import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotionSafe } from '../../motion/useReducedMotionSafe';
import { isMobileScreen } from '../../motion/motionUtils';
import { EASING, DURATION } from '../../motion/tokens';

/**
 * Reusable MotionCard with subtle cursor spotlight and tactile hover lift.
 */
export function MotionCard({
  children,
  className = '',
  spotlightColor = 'rgba(224, 51, 47, 0.06)',
  spotlightRadius = 300,
  enableSpotlight = true,
  hoverLift = 6,
  hoverScale = 1.01,
  active = false,
  onClick,
  ...props
}) {
  const cardRef = useRef(null);
  const shouldReduceMotion = useReducedMotionSafe();
  const [coords, setCoords] = useState({ x: -1000, y: -1000, isHovered: false });

  const handleMouseMove = (e) => {
    if (!enableSpotlight || shouldReduceMotion || isMobileScreen() || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      isHovered: true,
    });
  };

  const handleMouseLeave = () => {
    setCoords((prev) => ({ ...prev, isHovered: false }));
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileHover={
        shouldReduceMotion
          ? {}
          : {
              y: -hoverLift,
              scale: hoverScale,
              transition: { duration: DURATION.fast, ease: EASING.smooth },
            }
      }
      whileTap={
        shouldReduceMotion
          ? {}
          : {
              scale: 0.985,
              transition: { duration: 0.1 },
            }
      }
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {/* Subtle Cursor Spotlight Overlay */}
      {enableSpotlight && !shouldReduceMotion && coords.isHovered && (
        <div
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
          style={{
            background: `radial-gradient(${spotlightRadius}px circle at ${coords.x}px ${coords.y}px, ${spotlightColor}, transparent 65%)`,
          }}
        />
      )}

      {children}
    </motion.div>
  );
}

export default MotionCard;
