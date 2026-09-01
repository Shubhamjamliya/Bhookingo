import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadBusinessSettings } from "@food/utils/businessSettings";
import { BHOOKINGO_LOGO as bhookingoLogo } from "@/constants/branding";
import BhookingoWordmark from "@/shared/components/BhookingoWordmark";

export default function LandingFooter() {
  const navigate = useNavigate();
  const [contactInfo, setContactInfo] = useState({
    email: "bhookingo@gmail.com",
    mobile: "+91 9999999999",
    companyName: "Bhookingo",
    logo: bhookingoLogo
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await loadBusinessSettings();
        if (settings) {
          const number = settings.phone?.number
            ? `${settings.phone?.countryCode || ''} ${settings.phone.number}`.trim()
            : "9999999999";

          setContactInfo({
            email: settings.email || "bhookingo@gmail.com",
            mobile: number,
            companyName: settings.companyName || "Bhookingo",
            logo: settings.logo?.url || settings.favicon?.url || bhookingoLogo
          });
        }
      } catch (_error) {
        // Fallback silently
      }
    };

    fetchSettings();
  }, []);

  const handleAuthClick = () => {
    window.open("https://play.google.com/store/apps/details?id=com.bhookingo.user", "_blank");
  };

  const handleExploreWebClick = () => {
    navigate("/user/auth/login");
  };

  const handleDriveModeClick = () => {
    navigate("/user/auth/login");
  };

  return (
    <footer id="contact" className="bg-[#15100d] py-16 text-sm text-[#bdaea4]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-1">
            <BhookingoWordmark
              logoSrc={contactInfo.logo}
              companyName={contactInfo.companyName}
              accentClassName="text-[#E0332F]"
              textClassName="text-2xl font-black tracking-tight text-white leading-none"
              logoClassName="h-14 w-14 rounded-lg object-contain"
              gapClassName="gap-3"
            />
            <p className="leading-7 text-[#bdaea4]">
              India's first highway takeaway and dine-in discovery app. Save time, eat better, and travel with more confidence.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-[var(--font-ui)] text-sm font-bold uppercase tracking-wider text-white">Quick Links</h4>
            <ul className="space-y-2.5">
              <li><Link to="/" className="transition-colors hover:text-white">Home</Link></li>
              <li><Link to="/how-it-works" className="transition-colors hover:text-white">How It Works</Link></li>
              <li><Link to="/features" className="transition-colors hover:text-white">Features</Link></li>
              <li><Link to="/blog" className="transition-colors hover:text-white">Blog</Link></li>
              <li><Link to="/contact" className="transition-colors hover:text-white">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-[var(--font-ui)] text-sm font-bold uppercase tracking-wider text-white">For Travelers</h4>
            <ul className="space-y-2.5">
              <li><button onClick={handleExploreWebClick} className="transition-colors hover:text-white">Browse on Web</button></li>
              <li><button onClick={handleExploreWebClick} className="transition-colors hover:text-white">Search Restaurants</button></li>
              <li><button onClick={handleExploreWebClick} className="transition-colors hover:text-white">Takeaway</button></li>
              <li><button onClick={handleDriveModeClick} className="transition-colors hover:text-white">Drive Mode</button></li>
              <li><Link to="/how-it-works" className="transition-colors hover:text-white">FAQs</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-[var(--font-ui)] text-sm font-bold uppercase tracking-wider text-white">Support</h4>
            <ul className="space-y-2.5">
              <li><Link to="/contact" className="transition-colors hover:text-white">Help Center</Link></li>
              <li><a href={`mailto:${contactInfo.email}`} className="transition-colors hover:text-white">{contactInfo.email}</a></li>
              <li><a href={`tel:${contactInfo.mobile}`} className="transition-colors hover:text-white">{contactInfo.mobile}</a></li>
              <li><Link to="/user/profile/terms" className="transition-colors hover:text-white">Terms & Conditions</Link></li>
              <li><Link to="/user/profile/privacy" className="transition-colors hover:text-white">Privacy Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-[var(--font-ui)] text-sm font-bold uppercase tracking-wider text-white">Download App</h4>
            <div className="space-y-2.5">
              <button
                onClick={handleAuthClick}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/8 p-3 text-white transition-colors hover:bg-white/14"
              >
                <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M3.25 2.3c-.15.15-.25.38-.25.68v18.04c0 .3.1.53.25.68l.08.08L13.5 12.18v-.18L3.33 2.22l-.08.08z" fill="url(#footerPlay1)" />
                  <path d="M16.89 15.63l-3.39-3.39v-.18l3.39-3.39.08.05 4.01 2.28c1.15.65 1.15 1.73 0 2.38l-4.01 2.28-.08-.03z" fill="url(#footerPlay2)" />
                  <path d="M13.59 12.09L3.33 22.25c.38.4 1 .33 1.55.02l12.01-6.84-3.3-3.34z" fill="url(#footerPlay3)" />
                  <path d="M13.59 12.09l3.3-3.34-12.01-6.84c-.55-.31-1.17-.38-1.55.02l10.26 10.16z" fill="url(#footerPlay4)" />
                  <defs>
                    <linearGradient id="footerPlay1" x1="10.23" y1="2.46" x2="-2.04" y2="14.73" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#00a0ff" />
                      <stop offset="0.01" stopColor="#00a1ff" />
                      <stop offset="0.26" stopColor="#00beff" />
                      <stop offset="0.57" stopColor="#00d7ff" />
                      <stop offset="0.86" stopColor="#00e6ff" />
                      <stop offset="1" stopColor="#00ebff" />
                    </linearGradient>
                    <linearGradient id="footerPlay2" x1="22.27" y1="12" x2="3.19" y2="12" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#ff3a44" />
                      <stop offset="1" stopColor="#c31162" />
                    </linearGradient>
                    <linearGradient id="footerPlay3" x1="16.5" y1="15.89" x2="-2.26" y2="34.65" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#00e676" />
                      <stop offset="1" stopColor="#12c37d" />
                    </linearGradient>
                    <linearGradient id="footerPlay4" x1="10.45" y1="10.15" x2="-2.25" y2="-2.55" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#ffe000" />
                      <stop offset="0.4" stopColor="#ffca00" />
                      <stop offset="0.77" stopColor="#ff9f00" />
                      <stop offset="1" stopColor="#ff7a00" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="text-left">
                  <span className="block text-[8px] uppercase tracking-[0.18em] text-[#8d8078]">GET IT ON</span>
                  <span className="text-sm font-semibold leading-none">Google Play</span>
                </div>
              </button>
              <button
                onClick={handleAuthClick}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/8 p-3 text-white transition-colors hover:bg-white/14"
              >
                <svg className="h-6 w-6 fill-current text-gray-300" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.8 16.32 3.98 9.58 8.1 9.28c1.37.1 2.2.78 3.03.8.84-.02 1.86-.8 3.42-.65 1.64.16 2.82.88 3.5 1.95-3.22 1.88-2.69 6.08.28 7.3-.7 1.76-1.52 3.48-3.28 3.6zM12.03 9.25c-.15-2.23 1.66-4.14 3.75-4.25.2 2.52-2.1 4.54-3.75 4.25z" />
                </svg>
                <div className="text-left">
                  <span className="block text-[8px] uppercase tracking-[0.18em] text-[#8d8078]">Download on the</span>
                  <span className="text-sm font-semibold leading-none">App Store</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center text-xs text-[#8d8078]">
          © {new Date().getFullYear()} {contactInfo.companyName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
