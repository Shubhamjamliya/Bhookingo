/**
 * Bhookingo Motion Design System — Global Tokens & Motion Budget
 */

export const DURATION = {
  micro: 0.18,
  fast: 0.28,
  normal: 0.45,
  slow: 0.70,
  cinematic: 1.10,
};

export const MOTION_RULES = {
  micro: DURATION.micro,
  interaction: DURATION.fast,
  reveal: DURATION.normal,
  section: DURATION.slow,
  cinematic: DURATION.cinematic,

  maxHoverLift: 4,     // px (4-6px max)
  max3DTilt: 4,        // deg (3-5deg max)
  maxParallax: 20,     // px
};

export const EASING = {
  smooth: [0.22, 1, 0.36, 1],
  cinematic: [0.16, 1, 0.3, 1],
  soft: [0.25, 0.8, 0.25, 1],
  easeOut: [0, 0, 0.2, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  springCurve: [0.34, 1.56, 0.64, 1],
};

export const SPRING = {
  gentle: {
    type: "spring",
    stiffness: 300,
    damping: 25,
    mass: 0.6,
  },
  soft: {
    type: "spring",
    stiffness: 220,
    damping: 22,
    mass: 0.8,
  },
  tight: {
    type: "spring",
    stiffness: 400,
    damping: 30,
    mass: 0.4,
  },
};

export const SPRINGS = SPRING;
