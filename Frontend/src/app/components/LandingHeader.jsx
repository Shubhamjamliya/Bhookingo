import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Smartphone, Menu, X } from 'lucide-react';

export default function LandingHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleAuthClick = () => {
    const authStatus = localStorage.getItem("user_authenticated");
    const token = localStorage.getItem("user_accessToken");
    if (authStatus === "true" || token) {
      navigate("/food/user");
    } else {
      navigate("/user/auth/login");
    }
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
    <header className="sticky top-0 z-50 bg-white border-b border-gray-150 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E0332F] to-[#B91C1C] flex items-center justify-center shadow-md shadow-red-500/20">
            <div className="relative flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white fill-white/20" />
              <span className="absolute text-xs font-black text-[#E0332F] translate-y-[-1px]">b</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight text-gray-900 leading-none">
              bhookingo
            </span>
            <span className="text-[10px] font-bold text-gray-500 tracking-wider mt-0.5">
              Bhookh + In + Go
            </span>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-gray-700">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`${isActive ? 'text-[#E0332F] font-extrabold relative py-1' : 'hover:text-[#E0332F] transition-colors py-1'}`}
              >
                {link.name}
                {isActive && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#E0332F] rounded-full" />}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={handleAuthClick}
            className="bg-gradient-to-r from-[#E0332F] to-[#C92824] hover:from-[#c92824] hover:to-[#a81f1c] text-white text-xs font-black uppercase tracking-wider px-6 py-3 rounded-full shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all active:scale-95 flex items-center gap-2"
          >
            <Smartphone className="w-4 h-4" />
            <span>Download App</span>
          </button>
        </div>

        {/* Mobile Menu Trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 pt-2 pb-6 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block py-2 ${location.pathname === link.path ? 'text-[#E0332F] font-bold' : 'text-gray-700 font-medium'}`}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-2">
            <button
              onClick={handleAuthClick}
              className="w-full bg-[#E0332F] text-white text-xs font-bold py-3 rounded-full shadow-md flex items-center justify-center gap-2"
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
