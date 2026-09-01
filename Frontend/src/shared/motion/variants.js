import { DURATION, EASING, SPRING } from './tokens';

/**
 * Standard reusable Framer Motion variants for Bhookingo
 */

export const fadeUp = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  visible: (custom = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      delay: typeof custom === 'number' ? custom : 0,
      ease: EASING.smooth,
    },
  }),
};

export const fadeIn = {
  hidden: {
    opacity: 0,
  },
  visible: (custom = 0) => ({
    opacity: 1,
    transition: {
      duration: DURATION.normal,
      delay: typeof custom === 'number' ? custom : 0,
      ease: EASING.smooth,
    },
  }),
};

export const scaleIn = {
  hidden: {
    opacity: 0,
    scale: 0.96,
  },
  visible: (custom = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      duration: DURATION.normal,
      delay: typeof custom === 'number' ? custom : 0,
      ease: EASING.smooth,
    },
  }),
};

export const staggerContainer = (staggerChildren = 0.08, delayChildren = 0.05) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

export const staggerItem = {
  hidden: {
    opacity: 0,
    y: 18,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.smooth,
    },
  },
};

export const cardHover = {
  rest: {
    y: 0,
    scale: 1,
  },
  hover: {
    y: -6,
    scale: 1.01,
    transition: {
      duration: DURATION.fast,
      ease: EASING.smooth,
    },
  },
};

export const buttonHover = {
  rest: {
    y: 0,
    scale: 1,
  },
  hover: {
    y: -2,
    scale: 1.015,
    transition: {
      duration: DURATION.micro,
      ease: EASING.smooth,
    },
  },
  tap: {
    scale: 0.97,
    transition: {
      duration: 0.1,
    },
  },
};

export const badgePop = {
  hidden: {
    opacity: 0,
    scale: 0.88,
  },
  visible: (custom = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      ...SPRING.gentle,
      delay: typeof custom === 'number' ? custom : 0,
    },
  }),
};

export const VARIANTS = {
  fadeUp,
  fadeIn,
  scaleIn,
  staggerContainer,
  staggerItem,
  cardHover,
  buttonHover,
  badgePop,
};

export default VARIANTS;
