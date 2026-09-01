import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useReducedMotionSafe } from '../../motion/useReducedMotionSafe';
import { isMobileScreen } from '../../motion/motionUtils';
import { EASING, DURATION } from '../../motion/tokens';

/**
 * Reusable Cinematic Parallax & Cursor-Shift Image Component
 */
export function ParallaxImage({
  src,
  alt = '',
  className = '',
  imgClassName = '',
  parallaxDistance = 12, // px
  enableCursorShift = false,
  ...props
}) {
  const containerRef = useRef(null);
  const shouldReduceMotion = useReducedMotionSafe();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const scrollY = useTransform(
    scrollYProgress,
    [0, 1],
    [-parallaxDistance, parallaxDistance]
  );

  // Mouse shift state
  const [cursorOffset, setCursorOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!enableCursorShift || shouldReduceMotion || isMobileScreen() || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xNorm = (e.clientX - rect.left) / rect.width - 0.5;
    const yNorm = (e.clientY - rect.top) / rect.height - 0.5;
    setCursorOffset({ x: xNorm * 8, y: yNorm * 6 }); // ±4px max
  };

  const handleMouseLeave = () => {
    if (!enableCursorShift) return;
    setCursorOffset({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`overflow-hidden relative ${className}`}
      {...props}
    >
      <motion.img
        src={src}
        alt={alt}
        style={{
          y: shouldReduceMotion ? 0 : scrollY,
          x: cursorOffset.x,
        }}
        animate={{
          x: cursorOffset.x,
          y: shouldReduceMotion ? 0 : undefined,
        }}
        transition={{
          x: { duration: DURATION.fast, ease: EASING.smooth },
          y: { duration: DURATION.fast, ease: EASING.smooth },
        }}
        className={`w-full h-full object-cover scale-[1.05] will-change-transform ${imgClassName}`}
      />
    </div>
  );
}

export default ParallaxImage;
