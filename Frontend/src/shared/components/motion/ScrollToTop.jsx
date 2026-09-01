import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

/**
 * Universal ScrollToTop component:
 * 1. Resets scroll position immediately on every route transition.
 * 2. Provides an accessible, animated floating "Scroll to Top" button when scrolled down.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  // 1. Auto scroll to top on every route change
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  }, [pathname]);

  // 2. Track scroll position for floating button visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 320) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 20 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.12, y: -3 }}
          whileTap={{ scale: 0.92 }}
          aria-label="Scroll back to top"
          title="Scroll back to top"
          className="fixed bottom-6 right-6 z-[9990] flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[#E0332F] via-[#EB4B47] to-[#D62828] text-white shadow-[0_10px_25px_rgba(224,51,47,0.45)] border border-white/30 backdrop-blur-md cursor-pointer transition-shadow hover:shadow-[0_14px_30px_rgba(224,51,47,0.6)] focus:outline-none focus:ring-2 focus:ring-[#E0332F] focus:ring-offset-2"
        >
          <ArrowUp className="h-5 w-5 sm:h-5.5 sm:w-5.5 text-white stroke-[2.5]" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
