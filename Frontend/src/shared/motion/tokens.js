/**
 * Bhookingo Motion Design System — Global Tokens & Motion Budget
 */

export const MOTION_RULES = {
  micro: 0.18,
  interaction: 0.28,
  reveal: 0.45,
  section: 0.70,
  cinematic: 1.10,

  maxHoverLift: 4,     // px
  max3DTilt: 5,        // deg
  maxParallax: 25,     // px
};

export const EASING = {
  smooth: [0.22, 1, 0.36, 1],
  cinematic: [0.16, 1, 0.3, 1],
  easeOut: [0, 0, 0.2, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  springCurve: [0.34, 1.56, 0.64, 1],
};

export const SPRINGS = {
  default: { type: "spring", stiffness: 320, damping: 24, mass: 0.6 },
  gentle: { type: "spring", stiffness: 200, damping: 22, mass: 0.8 },
};

export const VARIANTS = {
  fadeUp: {
    hidden: { opacity: 0, y: 16 },
    visible: (custom = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: MOTION_RULES.reveal,
        delay: custom,
        ease: EASING.smooth,
      },
    }),
  },

  fadeIn: {
    hidden: { opacity: 0 },
    visible: (custom = 0) => ({
      opacity: 1,
      transition: {
        duration: MOTION_RULES.reveal,
        delay: custom,
        ease: EASING.smooth,
      },
    }),
  },

  scaleIn: {
    hidden: { opacity: 0, scale: 0.96 },
    visible: (custom = 0) => ({
      opacity: 1,
      scale: 1,
      transition: {
        duration: MOTION_RULES.interaction,
        delay: custom,
        ease: EASING.smooth,
      },
    }),
  },

  badgePop: {
    hidden: { opacity: 0, scale: 0.9, y: 4 },
    visible: (custom = 0) => ({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 320,
        damping: 24,
        delay: custom,
      },
    }),
  },

  staggerContainer: (staggerVal = 0.08, delayVal = 0.05) => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerVal,
        delayChildren: delayVal,
      },
    },
  }),

  staggerItem: {
    hidden: { opacity: 0, y: 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: MOTION_RULES.reveal,
        ease: EASING.smooth,
      },
    },
  },

  cardHover: {
    rest: { y: 0, scale: 1 },
    hover: {
      y: -MOTION_RULES.maxHoverLift,
      transition: { duration: MOTION_RULES.interaction, ease: EASING.smooth },
    },
  },

  buttonHover: {
    rest: { y: 0, scale: 1 },
    hover: {
      y: -2,
      transition: { duration: MOTION_RULES.micro, ease: EASING.smooth },
    },
    tap: {
      scale: 0.97,
      transition: { duration: 0.1 },
    },
  },
};
