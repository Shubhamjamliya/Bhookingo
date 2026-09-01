import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotionSafe } from '../../motion/useReducedMotionSafe';
import { EASING, MOTION_RULES } from '../../motion/tokens';

/**
 * Viewport entrance reveal wrapper
 */
export function Reveal({
  children,
  direction = 'up', // 'up' | 'down' | 'left' | 'right' | 'none'
  delay = 0,
  duration = MOTION_RULES.reveal,
  distance = 18,
  threshold = 0.15,
  className = '',
  style = {},
  once = true,
  ...props
}) {
  const shouldReduceMotion = useReducedMotionSafe();

  if (shouldReduceMotion) {
    return (
      <div className={className} style={style} {...props}>
        {children}
      </div>
    );
  }

  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { y: distance, opacity: 0 };
      case 'down':
        return { y: -distance, opacity: 0 };
      case 'left':
        return { x: distance, opacity: 0 };
      case 'right':
        return { x: -distance, opacity: 0 };
      case 'scale':
        return { scale: 0.96, opacity: 0 };
      case 'fade':
      case 'none':
      default:
        return { opacity: 0 };
    }
  };

  return (
    <motion.div
      initial={getInitialPosition()}
      whileInView={{ x: 0, y: 0, opacity: 1 }}
      viewport={{ once, amount: threshold }}
      transition={{
        duration,
        delay,
        ease: EASING.smooth,
      }}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default Reveal;
