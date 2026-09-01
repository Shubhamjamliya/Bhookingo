import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotionSafe } from './useReducedMotionSafe';

// Register plugin once safely
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Custom hook for GSAP ScrollTrigger animations with automatic scope cleanup and reduced-motion safety.
 *
 * @param {Function} setupFunction - (ctx, utils) => void
 * @param {Array} dependencies - React dependencies array
 * @returns {React.RefObject} scopeRef - Attach to the container element
 */
export function useGsapScrollTrigger(setupFunction, dependencies = []) {
  const scopeRef = useRef(null);
  const shouldReduceMotion = useReducedMotionSafe();

  useEffect(() => {
    if (typeof window === 'undefined' || !scopeRef.current) return;
    if (shouldReduceMotion) return;

    let ctx;
    try {
      ctx = gsap.context(() => {
        setupFunction({
          gsap,
          ScrollTrigger,
          scope: scopeRef.current,
        });
      }, scopeRef.current);
    } catch (e) {
      console.warn('GSAP ScrollTrigger setup skipped:', e);
    }

    return () => {
      try {
        if (ctx) ctx.revert();
      } catch (_e) {}
    };
  }, [shouldReduceMotion, ...dependencies]);

  return scopeRef;
}

export default useGsapScrollTrigger;
