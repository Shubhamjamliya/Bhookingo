import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotionSafe } from '../../motion/useReducedMotionSafe';
import { EASING, MOTION_RULES } from '../../motion/tokens';

export function Stagger({
  children,
  stagger = 0.08,
  delay = 0.04,
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: threshold }}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  distance = 14,
  duration = MOTION_RULES.reveal,
  className = '',
  style = {},
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

  const itemVariants = {
    hidden: { opacity: 0, y: distance },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration,
        ease: EASING.smooth,
      },
    },
  };

  return (
    <motion.div
      variants={itemVariants}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default Stagger;
