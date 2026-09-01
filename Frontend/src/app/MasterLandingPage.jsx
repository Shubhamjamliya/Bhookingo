import React from 'react';
import { useNavigate } from 'react-router-dom';
import LandingHeader from './components/LandingHeader';
import LandingFooter from './components/LandingFooter';
import HeroSection from './components/landing/HeroSection';
import HowItWorksSection from './components/landing/HowItWorksSection';
import WhyBhookingoSection from './components/landing/WhyBhookingoSection';
import FeaturesGridSection from './components/landing/FeaturesGridSection';
import StatsBarSection from './components/landing/StatsBarSection';
import ExploreModesSection from './components/landing/ExploreModesSection';
import BottomCtaSection from './components/landing/BottomCtaSection';

export default function MasterLandingPage() {
  const navigate = useNavigate();

  const handleAuthClick = () => {
    window.open("https://play.google.com/store/apps/details?id=com.bhookingo.user", "_blank");
  };

  const openConsumerExperience = (path, webFallbackPath = "/user/auth/login") => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isAndroid = /android/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;

    const playStoreUrl = "https://play.google.com/store/apps/details?id=com.bhookingo.user";
    const appSchemeUrl = `bhookingo://${path}`;

    if (isAndroid) {
      const intentUrl = `intent://${path}#Intent;scheme=bhookingo;package=com.bhookingo.user;S.browser_fallback_url=${encodeURIComponent(playStoreUrl)};end`;
      window.location.href = intentUrl;
      return;
    }

    if (isIOS) {
      window.location.href = appSchemeUrl;
      setTimeout(() => {
        window.location.href = playStoreUrl;
      }, 2000);
      return;
    }

    navigate(webFallbackPath);
  };

  const handleDriveModeClick = () => {
    openConsumerExperience("food/user/driving");
  };

  const handleExploreWebClick = () => {
    navigate("/user/auth/login");
  };

  return (
    <div className="landing-shell min-h-screen flex flex-col text-slate-900 bg-[#FCFAF7] selection:bg-rose-500 selection:text-white">
      {/* 1. Floating Animated Navbar */}
      <LandingHeader />

      <main className="flex-1">
        {/* 2. Hero Section with 3D Phone Mockup & Animated Route */}
        <HeroSection
          onDownloadClick={handleAuthClick}
          onBrowseWebClick={handleExploreWebClick}
        />

        {/* 3. Highway Stats Ribbon */}
        <StatsBarSection />

        {/* 4. How It Works (Interactive Journey Timeline & Miniature Map) */}
        <HowItWorksSection />

        {/* 5. Why Bhookingo Comparison (Interactive VS) */}
        <WhyBhookingoSection />

        {/* 6. Everything You Need in One App (Staggered Feature Grid) */}
        <FeaturesGridSection />

        {/* 7. Explore Modes (Live Drive Mode vs Search Mode) */}
        <ExploreModesSection
          onDriveModeClick={handleDriveModeClick}
          onSearchModeClick={handleExploreWebClick}
        />

        {/* 8. Night Drive CTA Banner */}
        <BottomCtaSection onAuthClick={handleAuthClick} />
      </main>

      {/* 9. Landing Footer */}
      <LandingFooter />
    </div>
  );
}
