import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Smartphone, Globe } from 'lucide-react';
import api from "@food/api";

export default function LandingFooter() {
  const navigate = useNavigate();
  const [contactInfo, setContactInfo] = useState({
    email: "support@bhookingo.com",
    mobile: "9999999999"
  });

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const response = await api.get(`/food/admin/pages-social-media/contact`);
        if (response.data?.success && response.data?.data) {
          setContactInfo({
            email: response.data.data.email || "support@bhookingo.com",
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
    const authStatus = localStorage.getItem("user_authenticated");
    const token = localStorage.getItem("user_accessToken");
    if (authStatus === "true" || token) {
      navigate("/food/user");
    } else {
      navigate("/user/auth/login");
    }
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
              <div className="w-8 h-8 rounded-lg bg-[#E0332F] flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-white tracking-tight">bhookingo</span>
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
                <Smartphone className="w-5 h-5 text-gray-300" />
                <div className="text-left">
                  <span className="text-[8px] uppercase tracking-wider block text-gray-400">GET IT ON</span>
                  <span className="text-xs font-bold leading-none">Google Play</span>
                </div>
              </button>
              <button
                onClick={handleAuthClick}
                className="w-full bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-lg flex items-center gap-3 transition-colors border border-white/10"
              >
                <Globe className="w-5 h-5 text-gray-300" />
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
