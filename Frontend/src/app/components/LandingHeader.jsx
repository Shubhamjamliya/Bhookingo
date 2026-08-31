import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Smartphone, Menu, X } from 'lucide-react';
import { BHOOKINGO_LOGO as bhookingoLogo } from "@/constants/branding";
import { loadBusinessSettings } from "@food/utils/businessSettings";
import BhookingoWordmark from "@/shared/components/BhookingoWordmark";

export default function LandingHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [headerInfo, setHeaderInfo] = useState({
    companyName: "Bhookingo",
    logo: bhookingoLogo
  });

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
    <header className="sticky top-0 z-50 border-b border-[color:var(--landing-line)] bg-[rgba(252,250,247,0.88)] backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[76px] flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <BhookingoWordmark
            logoSrc={headerInfo.logo}
            companyName={headerInfo.companyName}
            accentClassName="text-[#E0332F]"
          />
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-[color:var(--landing-text-muted)]">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`${isActive ? 'text-[#d9471f] font-bold relative py-1.5' : 'hover:text-[#d9471f] transition-colors py-1.5'}`}
              >
                {link.name}
                {isActive && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#d9471f] rounded-full" />}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={handleAuthClick}
            className="landing-button-primary text-white text-xs font-extrabold uppercase tracking-[0.18em] px-6 py-3 rounded-full transition-all active:scale-95 flex items-center gap-2"
          >
            <Smartphone className="w-4 h-4" />
            <span>Download App</span>
          </button>
        </div>

        {/* Mobile Menu Trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-[color:var(--landing-text)] hover:bg-white/80 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[rgba(255,253,249,0.98)] border-b border-[color:var(--landing-line)] px-4 pt-2 pb-6 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block rounded-xl px-3 py-2.5 ${location.pathname === link.path ? 'bg-[#fff1de] text-[#d9471f] font-bold' : 'text-[color:var(--landing-text-muted)] font-medium hover:bg-white'}`}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-2">
            <button
              onClick={handleAuthClick}
              className="landing-button-primary w-full text-white text-xs font-extrabold uppercase tracking-[0.18em] py-3 rounded-full transition-all flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>Download App</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
