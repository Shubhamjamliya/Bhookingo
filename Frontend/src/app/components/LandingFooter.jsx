import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Smartphone, Globe } from 'lucide-react';
import api from "@food/api";
import bhookingoLogo from "@backend-uploads/logos/2026/07/e997aea1-c104-473d-9491-2b471c01f36f.webp";

export default function LandingFooter() {
  const navigate = useNavigate();
  const [contactInfo, setContactInfo] = useState({
    email: "bhookingo@gmail.com",
    mobile: "9999999999"
  });

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const response = await api.get(`/food/admin/pages-social-media/contact`);
        if (response.data?.success && response.data?.data) {
          setContactInfo({
            email: response.data.data.email || "bhookingo@gmail.com",
            mobile: response.data.data.mobile || "9999999999"
          });
        }
      } catch (error) {
        // Fallback silently
      }
    };
    fetchContactInfo();
  }, []);

  const handleAuthClick = () => {
    window.open("https://play.google.com/store/apps/details?id=com.bhookingo.user", "_blank");
  };

  const handleExploreWebClick = () => {
    navigate("/food/user");
  };

  const handleDriveModeClick = () => {
    navigate("/food/user/driving");
  };

  return (
    <footer id="contact" className="bg-[#0B1013] text-gray-400 py-16 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Col 1: Brand */}
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center gap-2">
              <img src={bhookingoLogo} className="w-8 h-8 object-contain rounded-lg" alt="Bhookingo Logo" />
              <span className="text-xl font-black text-white tracking-tight">Bhookingo</span>
            </div>
            <p className="text-gray-400 leading-relaxed">
              India's first highway takeaway & dine-in discovery app. Save time, eat quality food and travel better.
            </p>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link to="/features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Col 3: For Travelers */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">For Travelers</h4>
            <ul className="space-y-2.5">
              <li><button onClick={handleExploreWebClick} className="hover:text-white transition-colors">Search Restaurants</button></li>
              <li><button onClick={handleExploreWebClick} className="hover:text-white transition-colors">Takeaway</button></li>
              <li><button onClick={handleExploreWebClick} className="hover:text-white transition-colors">Dine-in</button></li>
              <li><button onClick={handleDriveModeClick} className="hover:text-white transition-colors">Route Guide</button></li>
              <li><Link to="/how-it-works" className="hover:text-white transition-colors">FAQs</Link></li>
            </ul>
          </div>

          {/* Col 4: Support */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Support</h4>
            <ul className="space-y-2.5">
              <li><Link to="/contact" className="hover:text-white transition-colors">Help Center</Link></li>
              <li><a href={`mailto:${contactInfo.email}`} className="hover:text-white transition-colors">{contactInfo.email}</a></li>
              <li><a href={`tel:${contactInfo.mobile}`} className="hover:text-white transition-colors">{contactInfo.mobile}</a></li>
              <li><Link to="/user/profile/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/user/profile/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Col 5: Download App */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4">Download App</h4>
            <div className="space-y-2.5">
              <button
                onClick={handleAuthClick}
                className="w-full bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-lg flex items-center gap-3 transition-colors border border-white/10"
              >
                <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M3.25 2.3c-.15.15-.25.38-.25.68v18.04c0 .3.1.53.25.68l.08.08L13.5 12.18v-.18L3.33 2.22l-.08.08z" fill="url(#footerPlay1)"/>
                  <path d="M16.89 15.63l-3.39-3.39v-.18l3.39-3.39.08.05 4.01 2.28c1.15.65 1.15 1.73 0 2.38l-4.01 2.28-.08-.03z" fill="url(#footerPlay2)"/>
                  <path d="M13.59 12.09L3.33 22.25c.38.4 1 .33 1.55.02l12.01-6.84-3.3-3.34z" fill="url(#footerPlay3)"/>
                  <path d="M13.59 12.09l3.3-3.34-12.01-6.84c-.55-.31-1.17-.38-1.55.02l10.26 10.16z" fill="url(#footerPlay4)"/>
                  <defs>
                    <linearGradient id="footerPlay1" x1="10.23" y1="2.46" x2="-2.04" y2="14.73" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#00a0ff"/>
                      <stop offset="0.01" stopColor="#00a1ff"/>
                      <stop offset="0.26" stopColor="#00beff"/>
                      <stop offset="0.57" stopColor="#00d7ff"/>
                      <stop offset="0.86" stopColor="#00e6ff"/>
                      <stop offset="1" stopColor="#00ebff"/>
                    </linearGradient>
                    <linearGradient id="footerPlay2" x1="22.27" y1="12" x2="3.19" y2="12" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#ff3a44"/>
                      <stop offset="1" stopColor="#c31162"/>
                    </linearGradient>
                    <linearGradient id="footerPlay3" x1="16.5" y1="15.89" x2="-2.26" y2="34.65" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#00e676"/>
                      <stop offset="1" stopColor="#12c37d"/>
                    </linearGradient>
                    <linearGradient id="footerPlay4" x1="10.45" y1="10.15" x2="-2.25" y2="-2.55" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#ffe000"/>
                      <stop offset="0.4" stopColor="#ffca00"/>
                      <stop offset="0.77" stopColor="#ff9f00"/>
                      <stop offset="1" stopColor="#ff7a00"/>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="text-left">
                  <span className="text-[8px] uppercase tracking-wider block text-gray-400">GET IT ON</span>
                  <span className="text-xs font-bold leading-none">Google Play</span>
                </div>
              </button>
              <button
                onClick={handleAuthClick}
                className="w-full bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-lg flex items-center gap-3 transition-colors border border-white/10"
              >
                <svg className="w-6 h-6 fill-current text-gray-300" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.8 16.32 3.98 9.58 8.1 9.28c1.37.1 2.2.78 3.03.8.84-.02 1.86-.8 3.42-.65 1.64.16 2.82.88 3.5 1.95-3.22 1.88-2.69 6.08.28 7.3-.7 1.76-1.52 3.48-3.28 3.6zM12.03 9.25c-.15-2.23 1.66-4.14 3.75-4.25.2 2.52-2.1 4.54-3.75 4.25z" />
                </svg>
                <div className="text-left">
                  <span className="text-[8px] uppercase tracking-wider block text-gray-400">Download on the</span>
                  <span className="text-xs font-bold leading-none">App Store</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800 text-center text-gray-500 text-[11px]">
          © 2025 Bhookingo. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
