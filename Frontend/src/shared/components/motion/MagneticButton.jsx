import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotionSafe } from '../../motion/useReducedMotionSafe';
import { EASING, DURATION } from '../../motion/tokens';

/**
 * Reusable Tactile / Magnetic Button Wrapper
 */
export function MagneticButton({
  children,
  className = '',
  onClick,
  disabled = false,
  whileHover = { y: -2, scale: 1.015 },
  whileTap = { scale: 0.97 },
  ...props
}) {
  const shouldReduceMotion = useReducedMotionSafe();

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={
        shouldReduceMotion || disabled
          ? {}
          : {
              ...whileHover,
              transition: { duration: DURATION.micro, ease: EASING.smooth },
            }
      }
      whileTap={
        shouldReduceMotion || disabled
          ? {}
          : {
              ...whileTap,
              transition: { duration: 0.1 },
            }
      }
      className={`cursor-pointer inline-flex items-center justify-center select-none ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export default MagneticButton;
