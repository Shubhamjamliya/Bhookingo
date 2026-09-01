import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Menu, X, ArrowRight, Sparkles } from 'lucide-react';
import { BHOOKINGO_LOGO as bhookingoLogo } from "@/constants/branding";
import { loadBusinessSettings } from "@food/utils/businessSettings";
import BhookingoWordmark from "@/shared/components/BhookingoWordmark";

export default function LandingHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  const [headerInfo, setHeaderInfo] = useState({
    companyName: "Bhookingo",
    logo: bhookingoLogo
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await loadBusinessSettings();
        if (settings) {
          setHeaderInfo({
            companyName: settings.companyName || "Bhookingo",
            logo: settings.logo?.url || settings.favicon?.url || bhookingoLogo
          });
        }
      } catch (error) {
        // Fallback silently
      }
    };
    fetchSettings();
  }, []);

  const handleAuthClick = () => {
    window.open("https://play.google.com/store/apps/details?id=com.bhookingo.user", "_blank");
  };

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "How It Works", path: "/how-it-works" },
    { name: "Features", path: "/features" },
    { name: "For Restaurants", path: "/for-restaurants" },
    { name: "Blog", path: "/blog" },
    { name: "Contact", path: "/contact" }
  ];

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-black/8 bg-white/85 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] py-2.5'
          : 'border-b border-transparent bg-white/60 backdrop-blur-md py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        
        {/* Logo with micro-interaction */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <BhookingoWordmark
              logoSrc={headerInfo.logo}
              companyName={headerInfo.companyName}
              accentClassName="text-[#E0332F]"
              textClassName="text-2xl font-black tracking-tight text-slate-900 leading-none group-hover:text-[#E0332F] transition-colors"
            />
          </motion.div>
        </Link>

        {/* Center Navigation Links with animated hover underline */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-sm font-semibold text-slate-600">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className="relative px-3.5 py-2 rounded-full transition-colors group"
                style={{ fontFamily: 'var(--font-ui)' }}
              >
                <span className={`transition-colors ${isActive ? 'text-[#E0332F] font-bold' : 'text-slate-700 group-hover:text-[#E0332F]'}`}>
                  {link.name}
                </span>
                
                {/* Active or Hover Animated Underline Indicator */}
                {isActive ? (
                  <motion.span
                    layoutId="landingNavUnderline"
                    className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#E0332F] rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Button (Download App with red glow) */}
        <div className="hidden sm:flex items-center gap-3">
          <motion.button
            onClick={handleAuthClick}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="relative group overflow-hidden rounded-full bg-gradient-to-r from-[#E0332F] via-[#D62828] to-[#C72420] text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 shadow-[0_4px_15px_rgba(224,51,47,0.3)] hover:shadow-[0_8px_25px_rgba(224,51,47,0.5)] transition-all flex items-center gap-2 cursor-pointer"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            <Smartphone className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />
            <span>Download App</span>
          </motion.button>
        </div>

        {/* Mobile Menu Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-slate-800 hover:bg-slate-100 transition-colors focus:outline-hidden"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-white/95 border-b border-slate-200/80 px-4 pt-3 pb-6 space-y-2 backdrop-blur-xl shadow-xl overflow-hidden"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                  location.pathname === link.path
                    ? 'bg-red-50 text-[#E0332F] font-bold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-[#E0332F]'
                }`}
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleAuthClick();
                }}
                className="w-full rounded-2xl bg-gradient-to-r from-[#E0332F] via-[#D62828] to-[#C72420] text-white text-xs font-bold uppercase tracking-wider py-3.5 shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                <span>Download App</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
