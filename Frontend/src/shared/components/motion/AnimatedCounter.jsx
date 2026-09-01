import React, { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { useReducedMotionSafe } from '../../motion/useReducedMotionSafe';

/**
 * Animated numeric counter that counts up once when scrolled into view.
 * Handles prefixes/suffixes (e.g. "1000+", "200+", "100%", "+40%").
 */
export function AnimatedCounter({
  value,
  duration = 1.4, // seconds
  className = '',
  style = {},
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const shouldReduceMotion = useReducedMotionSafe();

  // Extract prefix, numeric value, and suffix
  const parseValue = (val) => {
    if (typeof val === 'number') {
      return { prefix: '', target: val, suffix: '', decimals: 0 };
    }
    const str = String(val).trim();
    const match = str.match(/^([^0-9.]*)([0-9.]+)(.*)$/);
    if (!match) {
      return { prefix: '', target: 0, suffix: str, isRawText: true };
    }
    const prefix = match[1] || '';
    const numStr = match[2];
    const suffix = match[3] || '';
    const target = parseFloat(numStr) || 0;
    const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0;
    return { prefix, target, suffix, decimals, isRawText: false };
  };

  const parsed = parseValue(value);
  const [displayCount, setDisplayCount] = useState(
    shouldReduceMotion || parsed.isRawText ? parsed.target : 0
  );

  useEffect(() => {
    if (!isInView || shouldReduceMotion || parsed.isRawText) {
      if (isInView && (shouldReduceMotion || parsed.isRawText)) {
        setDisplayCount(parsed.target);
      }
      return;
    }

    let startTimestamp = null;
    const startVal = 0;
    const endVal = parsed.target;
    const totalDurationMs = duration * 1000;

    let frameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / totalDurationMs, 1);
      // Premium easeOutExpo curve
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startVal + (endVal - startVal) * easeOut;

      setDisplayCount(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [isInView, shouldReduceMotion, parsed.target, duration, parsed.isRawText]);

  if (parsed.isRawText) {
    return (
      <span ref={ref} className={className} style={style}>
        {value}
      </span>
    );
  }

  const formattedNumber =
    parsed.decimals > 0
      ? displayCount.toFixed(parsed.decimals)
      : Math.floor(displayCount).toLocaleString();

  return (
    <span ref={ref} className={className} style={style}>
      {parsed.prefix}
      {formattedNumber}
      {parsed.suffix}
    </span>
  );
}

export default AnimatedCounter;
