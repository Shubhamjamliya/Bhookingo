import { useReducedMotion } from 'framer-motion';

/**
 * Hook to safely query prefers-reduced-motion in browser/SSR environments.
 */
export function useReducedMotionSafe() {
  const shouldReduce = useReducedMotion();
  return Boolean(shouldReduce);
}

export default useReducedMotionSafe;
