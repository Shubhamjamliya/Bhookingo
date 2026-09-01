import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotionSafe } from '../../motion/useReducedMotionSafe';
import { EASING, MOTION_RULES } from '../../motion/tokens';

/**
 * Lightweight, non-blocking page transition wrapper
 */
export function PageTransition({ children, className = '' }) {
  const shouldReduceMotion = useReducedMotionSafe();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{
        duration: MOTION_RULES.interaction,
        ease: EASING.smooth,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
