import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useReducedMotionSafe } from '../../motion/useReducedMotionSafe';
import { isMobileScreen } from '../../motion/motionUtils';
import { MOTION_RULES } from '../../motion/tokens';

/**
 * Reusable 3D Tilt Card with spring smoothing.
 * Automatically disabled on mobile (< 768px) and reduced-motion.
 */
export function TiltCard({
  children,
  className = '',
  style = {},
  maxTiltX = MOTION_RULES.max3DTilt,
  maxTiltY = MOTION_RULES.max3DTilt,
  ...props
}) {
  const containerRef = useRef(null);
  const shouldReduceMotion = useReducedMotionSafe();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 220, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [maxTiltX, -maxTiltX]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-maxTiltY, maxTiltY]);

  const handleMouseMove = (e) => {
    if (shouldReduceMotion || isMobileScreen() || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    mouseX.set(clientX / rect.width - 0.5);
    mouseY.set(clientY / heightCorrection(rect.height) - 0.5);
  };

  const heightCorrection = (h) => (h > 0 ? h : 1);

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`perspective-1000 ${className}`}
      style={style}
      {...props}
    >
      <motion.div
        style={{
          rotateX: shouldReduceMotion ? 0 : rotateX,
          rotateY: shouldReduceMotion ? 0 : rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}

export default TiltCard;
