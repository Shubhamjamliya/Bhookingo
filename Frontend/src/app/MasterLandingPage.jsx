import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Star,
  Zap,
  Utensils,
  Smartphone,
  Search,
  ShoppingBag,
  Car,
  CreditCard,
  Flame,
  X,
  Check,
  Navigation2
} from 'lucide-react';
import LandingHeader from './components/LandingHeader';
import LandingFooter from './components/LandingFooter';

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
    <div className="landing-shell min-h-screen text-[color:var(--landing-text)]">
      <LandingHeader />

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden bg-[color:var(--landing-hero)] text-white min-h-[640px] lg:min-h-[720px] flex items-center py-12 lg:py-16">
        {/* Background Image with Dark Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/images/landingbg.png"
            alt="Expressway Highway Sunset"
            className="w-full h-full object-cover opacity-100"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,8,6,0.84)_0%,rgba(12,8,6,0.68)_38%,rgba(12,8,6,0.42)_100%)]" />
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

            {/* Left Column: Hero Text Content */}
            <div className="lg:col-span-5 space-y-6">
              {/* Badge */}
              <div className="landing-section-label inline-flex items-center gap-2 rounded-full bg-[color:var(--landing-accent)] px-4 py-2 text-[11px] font-extrabold uppercase text-white shadow-lg shadow-red-900/20">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>INDIA'S FIRST HIGHWAY FOOD APP</span>
              </div>

              {/* Headline */}
              <div className="space-y-2">
                <h1 className="landing-title text-4xl sm:text-5xl lg:text-[3.25rem] xl:text-[3.5rem] font-black text-white">
                  <span className="whitespace-nowrap">
                    <span className="text-white">Bhookingo</span>{" "}
                    <span className="text-[color:var(--landing-accent)]">=</span>{" "}
                  </span>
                  <br />
                  <span className="mt-2 inline-block text-[color:var(--landing-accent)] text-2xl sm:text-3xl lg:text-[2.35rem] xl:text-[2.6rem] font-extrabold tracking-[0.02em] whitespace-nowrap">
                    Bhook + in + Go
                  </span>
                  <span className="landing-subtitle mt-3 block text-white text-3xl sm:text-4xl lg:text-5xl font-extrabold">
                    Highway Takeaway & Dine-In
                  </span>
                </h1>
              </div>

              {/* Subheadline */}
              <div className="landing-subtitle text-xl sm:text-2xl font-semibold text-[#f7efe7] leading-snug">
                Order Before You Reach. <br />
                <span className="text-[#d8c8be]">Pick Up Without Waiting.</span>
              </div>

              {/* Description */}
              <p className="max-w-xl text-sm sm:text-base leading-8 text-[#e2d5cc]">
                India's first highway food discovery & pre-order app. Find only forward restaurants, pre-order takeaway or reserve dine-in and enjoy quality food on your journey.
              </p>

              {/* CTA Row */}
              <div className="pt-2 flex flex-wrap gap-4 justify-start">
                <button
                  onClick={handleAuthClick}
                  className="landing-button-primary flex items-center gap-2.5 rounded-full px-8 py-4 text-sm font-extrabold transition-all active:scale-95"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Download App</span>
                </button>
                <button
                  onClick={handleExploreWebClick}
                  className="landing-button-secondary flex items-center gap-2.5 rounded-full px-8 py-4 text-sm font-semibold shadow-lg transition-all active:scale-95 backdrop-blur-sm"
                >
                  <Search className="w-4 h-4" />
                  <span>Browse on Web</span>
                </button>
              </div>

              {/* Horizontal Feature Chips Row (Hero Bottom) */}
              <div className="grid grid-cols-1 gap-3 border-t border-white/15 pt-6 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { icon: MapPin, text: "Forward Restaurants" },
                  { icon: Clock, text: "Save Time & Money" },
                  { icon: Star, text: "Quality Food Every Time" },
                  { icon: RestroomIcon, text: "Clean Washrooms Info" },
                  { icon: Utensils, text: "Dine-in & Takeaway" },
                  { icon: Zap, text: "EV Charging On Route" },
                  { icon: ParkingIcon, text: "Parking Info Easy & Safe" }
                ].map((item, idx) => (
                  <div key={idx} className="min-h-[60px] w-full overflow-hidden rounded-2xl border border-white/12 bg-[rgba(255,251,247,0.92)] px-3.5 py-3 flex items-center gap-2.5 shadow-[0_16px_40px_rgba(15,8,5,0.18)] transition-colors hover:border-white/30">
                    <item.icon className="w-4 h-4 text-[color:var(--landing-accent)] shrink-0" />
                    <span className="text-[11px] sm:text-xs font-semibold text-[#5f463c] leading-tight break-words min-w-0">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Phone Mockup & Floating Feature Cards (7 Cols, Shifted Right) */}
            <div className="lg:col-span-7 flex flex-col sm:flex-row items-center justify-end gap-6 lg:gap-10 lg:pl-10">
              {/* Phone Mockup */}
              <div className="shrink-0 py-4 flex items-center justify-center">
                <img
                  src="/Landing page phone.png"
                  alt="Bhookingo Phone Mockup"
                  className="w-[270px] sm:w-[290px] h-auto object-contain drop-shadow-[0_25px_60px_rgba(0,0,0,0.4)]"
                />
              </div>

              {/* Desktop Floating Feature Cards Vertical Stack */}
              <div className="hidden lg:flex flex-col gap-2.5 w-full max-w-[260px] shrink-0">
                {[
                  { icon: MapPin, label: "Forward Restaurants" },
                  { icon: Clock, label: "Save Time & Money" },
                  { icon: Star, label: "Quality Food Every Time" },
                  { icon: RestroomIcon, label: "Clean Washrooms Info" },
                  { icon: Utensils, label: "Dine-in & Takeaway" },
                  { icon: Zap, label: "EV Charging On Route" },
                  { icon: ParkingIcon, label: "Parking Info Easy & Safe" }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="landing-surface-card cursor-pointer rounded-2xl p-3 flex items-center gap-3 transition-all hover:translate-x-1 w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[color:var(--landing-accent)] to-[color:var(--landing-accent-strong)] flex items-center justify-center shrink-0 shadow-sm">
                      <item.icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-[color:var(--landing-text)] break-words leading-tight flex-1">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Eyebrow */}
          <span className="landing-section-label mb-3 block text-xs font-extrabold uppercase text-[color:var(--landing-accent)]">
            HOW IT WORKS
          </span>
          {/* Heading */}
          <h2 className="landing-subtitle mb-12 text-3xl sm:text-4xl font-extrabold text-[color:var(--landing-text)]">
            Simple Steps for a <span className="text-[color:var(--landing-accent)]">Better Journey</span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Steps (Left 8 Cols) */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
              {[
                {
                  num: "1",
                  icon: Search,
                  title: "Search Your Route",
                  desc: "Enter your start & end location and we will show you only forward restaurants ahead on your highway."
                },
                {
                  num: "2",
                  icon: ShoppingBag,
                  title: "Order Before You Reach",
                  desc: "Choose your restaurant and pre-order for takeaway or dine-in."
                },
                {
                  num: "3",
                  icon: Utensils,
                  title: "Pick Up or Dine-in",
                  desc: "Reach the restaurant and pick up your order or dine-in without waiting."
                },
                {
                  num: "4",
                  icon: Car,
                  title: "Continue Your Journey",
                  desc: "Save time, money and enjoy a stress-free journey."
                }
              ].map((step, idx) => (
                <div key={idx} className="landing-surface-card flex flex-col items-center rounded-[var(--landing-radius)] p-6 text-center relative group">
                  {/* Icon Circle with Step Number Badge */}
                  <div className="relative mb-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#fff1f1] to-[color:var(--landing-accent-soft)] border-2 border-[#d62828]/20 flex items-center justify-center text-[color:var(--landing-accent)] group-hover:scale-105 transition-transform shadow-sm">
                      <step.icon className="w-8 h-8 text-[color:var(--landing-accent)]" />
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[color:var(--landing-accent)] text-white font-black text-xs flex items-center justify-center border-2 border-white shadow">
                      {step.num}
                    </div>
                  </div>

                  <h3 className="font-[var(--font-display)] mb-2 text-base font-bold text-[color:var(--landing-text)]">
                    {step.title}
                  </h3>
                  <p className="max-w-xs text-sm leading-6 text-[color:var(--landing-text-muted)]">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Winding Road Graphic (Right 4 Cols) */}
            <div className="lg:col-span-4 flex justify-center py-6">
              <div className="relative w-full max-w-[280px] h-[340px] bg-[#1d1511] rounded-3xl p-4 border border-white/10 shadow-xl flex flex-col justify-between overflow-hidden">
                {/* Simulated Winding Road */}
                <svg className="absolute inset-0 w-full h-full text-gray-800" viewBox="0 0 280 340" fill="none">
                  <path
                    d="M 50,320 C 180,280 220,200 140,160 C 60,120 100,50 220,20"
                    stroke="#334155"
                    strokeWidth="36"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 50,320 C 180,280 220,200 140,160 C 60,120 100,50 220,20"
                    stroke="#F8FAFC"
                    strokeWidth="3"
                    strokeDasharray="10 10"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Map Pins on Road */}
                <div className="relative z-10 flex flex-col justify-between h-full py-2 px-2">
                  <div className="flex items-center gap-2 bg-black/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-white/10 self-end">
                    <MapPin className="w-3.5 h-3.5 text-red-500 fill-current" />
                    <span>Only Forward Restaurants</span>
                  </div>
                  <div className="flex items-center gap-2 bg-amber-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg self-center">
                    <MapPin className="w-3.5 h-3.5 text-white fill-current" />
                    <span>Always Ahead of You</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#E0332F] text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg self-start">
                    <MapPin className="w-3.5 h-3.5 text-white fill-current" />
                    <span>On Your Highway</span>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg self-end">
                    <Navigation2 className="w-3.5 h-3.5 text-white fill-current" />
                    <span>Start Journey</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHY BHOOKINGO & 5. EVERYTHING YOU NEED IN ONE APP */}
      <section id="features" className="border-y border-[color:var(--landing-line)] bg-[rgba(255,255,255,0.58)] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

            {/* Left Column: Why Bhookingo Comparison (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <span className="landing-section-label block text-xs font-extrabold text-[color:var(--landing-accent)]">
                WHY Bhookingo?
              </span>

              <div className="relative grid grid-cols-2 gap-3 pt-2">
                {/* VS Badge */}
                <div className="absolute top-1/2 left-1/2 z-20 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#1d1511] text-xs font-black text-white shadow-lg">
                  VS
                </div>

                {/* Normal Highway Stop Card */}
                <div className="landing-surface-card flex flex-col overflow-hidden rounded-[var(--landing-radius)]">
                  <div className="bg-[#3a312c] px-3 py-3 text-center text-xs font-extrabold uppercase tracking-[0.16em] text-white">
                    Normal Highway Stop
                  </div>
                  <div className="flex-1 space-y-3 p-4 text-sm text-[color:var(--landing-text-muted)]">
                    {[
                      "Wait time 20–40 mins",
                      "Unknown food quality",
                      "No washroom information",
                      "No parking information",
                      "No EV charging information",
                      "Crowded & unplanned stops"
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                          <X className="w-2.5 h-2.5 text-red-600 stroke-[3]" />
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* With Bhookingo Card */}
                <div className="flex flex-col overflow-hidden rounded-[var(--landing-radius)] border border-emerald-200 bg-white shadow-md ring-1 ring-emerald-500/15">
                  <div className="bg-[#1f8a48] px-3 py-3 text-center text-xs font-extrabold uppercase tracking-[0.16em] text-white">
                    With Bhookingo
                  </div>
                  <div className="flex-1 space-y-3 bg-emerald-50/40 p-4 text-sm font-medium text-[#21442f]">
                    {[
                      "Pre-order & save time",
                      "Verified & quality food",
                      "Washroom ratings & photos",
                      "Parking available info",
                      "EV charging points shown",
                      "Planned, comfortable & smart stops"
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Everything You Need in One App (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              <h2 className="landing-subtitle text-2xl sm:text-3xl font-extrabold text-[color:var(--landing-text)]">
                Everything You Need in One App
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    icon: ShoppingBag,
                    color: "text-red-500 bg-red-50 border-red-150",
                    title: "Takeaway & Dine-in",
                    desc: "Pre-order for takeaway or choose dine-in seamlessly."
                  },
                  {
                    icon: MapPin,
                    color: "text-red-500 bg-red-50 border-red-150",
                    title: "Forward Restaurants",
                    desc: "Shows only restaurants ahead of you on your highway."
                  },
                  {
                    icon: RestroomIcon,
                    color: "text-gray-700 bg-gray-100 border-gray-200",
                    title: "Washroom Ratings",
                    desc: "Find clean washrooms with ratings & real photos."
                  },
                  {
                    icon: Utensils,
                    color: "text-emerald-600 bg-emerald-50 border-emerald-150",
                    title: "Food Quality",
                    desc: "Quality food from trusted & verified restaurants."
                  },
                  {
                    icon: ParkingIcon,
                    color: "text-red-500 bg-red-50 border-red-150",
                    title: "Parking Availability",
                    desc: "Find restaurants with safe & spacious parking."
                  },
                  {
                    icon: Zap,
                    color: "text-emerald-600 bg-emerald-50 border-emerald-150",
                    title: "EV Charging",
                    desc: "Locate EV charging stations on your route."
                  },
                  {
                    icon: Star,
                    color: "text-amber-500 bg-amber-50 border-amber-150",
                    title: "Real Reviews",
                    desc: "Ratings & reviews from real travelers like you."
                  },
                  {
                    icon: CreditCard,
                    color: "text-blue-600 bg-blue-50 border-blue-150",
                    title: "Multiple Payment",
                    desc: "Pay securely using UPI, Cards, Wallets & more."
                  }
                ].map((card, idx) => (
                  <div key={idx} className="landing-surface-card group rounded-[24px] p-5 transition-all hover:-translate-y-1">
                    <div className={`w-10 h-10 rounded-xl ${card.color} border flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xs`}>
                      <card.icon className="w-5 h-5" />
                    </div>
                    <h3 className="mb-1 font-[var(--font-display)] text-base font-bold text-[color:var(--landing-text)]">
                      {card.title}
                    </h3>
                    <p className="text-sm leading-6 text-[color:var(--landing-text-muted)]">
                      {card.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. STATS BAR */}
      <section className="bg-gradient-to-r from-[#bf341b] via-[#d9471f] to-[#e36d3f] py-6 text-white shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-white/20 text-center">
            <div className="py-2 md:py-0 px-2 flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-black">1000+</span>
              <span className="text-xs font-medium text-white/90">Restaurants</span>
            </div>
            <div className="py-2 md:py-0 px-2 flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-black">200+</span>
              <span className="text-xs font-medium text-white/90">Highways Covered</span>
            </div>
            <div className="py-2 md:py-0 px-2 flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-black">50+</span>
              <span className="text-xs font-medium text-white/90">Highway Cities</span>
            </div>
            <div className="py-2 md:py-0 px-2 flex flex-col items-center">
              <span className="text-lg sm:text-xl font-extrabold">Safe & Reliable</span>
              <span className="text-xs font-medium text-white/90">Trusted by Travelers</span>
            </div>
            <div className="py-2 md:py-0 px-2 flex flex-col items-center col-span-2 md:col-span-1">
              <span className="text-lg sm:text-xl font-extrabold flex items-center gap-1.5">
                Made in India
              </span>
              <span className="text-xs font-medium text-white/90">For Indian Travelers</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CHOOSE YOUR WAY TO EXPLORE */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="landing-subtitle flex items-center justify-center gap-3 text-2xl sm:text-3xl font-black text-[color:var(--landing-text)]">
              <span className="hidden h-0.5 w-8 rounded-full bg-[#d9471f] sm:block" />
              Choose Your Way to Explore
              <span className="hidden h-0.5 w-8 rounded-full bg-[#d9471f] sm:block" />
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* DRIVE MODE CARD (Vertical Image on Left) */}
            <div className="landing-surface-card relative overflow-hidden rounded-[32px] flex flex-col md:flex-row items-stretch bg-[#fff7f2]">

              {/* Left Vertical Image / Banner */}
              <div className="w-full md:w-48 lg:w-52 relative bg-gray-900 shrink-0 min-h-[220px] md:min-h-full overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=600&q=80"
                  alt="Live Highway Drive Mode"
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                {/* 3D Location Marker Overlay */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-[#E0332F] text-white flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                    <MapPin className="w-6 h-6 fill-white text-[#E0332F]" />
                  </div>
                </div>

                {/* Bottom Navigation Arrow Marker */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white p-2.5 rounded-full shadow-lg border-2 border-white flex items-center justify-center">
                  <Navigation2 className="w-5 h-5 fill-white" />
                </div>
              </div>

              {/* Right Content Column */}
              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between relative">
                {/* Recommended Tag */}
                  <div className="absolute top-4 right-4 rounded-full bg-[#d9471f] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-white shadow">
                  RECOMMENDED
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-[var(--font-display)] text-2xl font-black text-[color:var(--landing-text)]">Drive Mode</h3>
                    <span className="rounded-full border border-[#d62828]/20 bg-[#d62828]/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[color:var(--landing-accent)]">
                      Live Highway
                    </span>
                  </div>

                  <p className="text-sm font-medium leading-7 text-[color:var(--landing-text-muted)]">
                    Real-time highway mode that shows only forward restaurants on your live route.
                  </p>

                  <div className="space-y-2.5 pt-1">
                    {[
                      "Works while you drive",
                      "Shows distance ahead",
                      "No need to search",
                      "Save fuel, time & effort"
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 text-sm font-semibold text-[color:var(--landing-text)]">
                        <div className="w-4 h-4 rounded-full bg-[color:var(--landing-accent)] flex items-center justify-center shrink-0 shadow-xs">
                          <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleDriveModeClick}
                  className="landing-button-primary mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-extrabold uppercase tracking-[0.18em] transition-all active:scale-[0.98]"
                >
                  <span>Start Drive Mode</span>
                  <Navigation2 className="w-4 h-4 fill-white" />
                </button>
              </div>
            </div>

            {/* SEARCH MODE CARD (Vertical Restaurant Illustration on Right) */}
            <div className="landing-surface-card relative overflow-hidden rounded-[32px] flex flex-col md:flex-row items-stretch bg-[#f4fbf7]">

              {/* Left Content Column */}
              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-[var(--font-display)] text-2xl font-black text-[color:var(--landing-text)]">Search Mode</h3>
                    <span className="rounded-full border border-emerald-600/20 bg-emerald-600/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-emerald-700">
                      Any Restaurant
                    </span>
                  </div>

                  <p className="text-sm font-medium leading-7 text-[color:var(--landing-text-muted)]">
                    Search any restaurant by name, city or location.
                  </p>

                  <div className="space-y-2.5 pt-1">
                    {[
                      "Search by restaurant name",
                      "Explore restaurants in any city",
                      "View menu, ratings & more",
                      "Order takeaway or dine-in"
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 text-sm font-semibold text-[color:var(--landing-text)]">
                        <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
                          <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleExploreWebClick}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-emerald-600 bg-white py-3.5 text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700 transition-all active:scale-[0.98] hover:bg-emerald-50"
                >
                  <span>Search Restaurants</span>
                  <Search className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Right Vertical Image / Illustration Banner */}
              <div className="w-full md:w-48 lg:w-52 relative bg-emerald-950 shrink-0 min-h-[220px] md:min-h-full overflow-hidden flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80"
                  alt="Search Restaurant Mode"
                  className="w-full h-full object-cover opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-transparent to-transparent" />

                {/* 3D Magnifying Glass Icon Overlay */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-2xl bg-white/90 backdrop-blur-sm text-emerald-700 flex items-center justify-center shadow-xl border border-white">
                  <Search className="w-8 h-8 stroke-[2.5]" />
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* 8. BOTTOM CTA BANNER */}
      <section className="border-y border-[color:var(--landing-line)] bg-[linear-gradient(180deg,#fff7f2_0%,#ffefe5_100%)] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#E0332F] flex items-center justify-center shadow-md shadow-red-500/20 shrink-0 hidden sm:flex">
              <MapPin className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-[var(--font-display)] text-xl sm:text-2xl font-black text-[color:var(--landing-text)]">
                Hungry? Order Before You Arrive.
              </h3>
              <p className="mt-1 text-sm font-medium text-[color:var(--landing-text-muted)]">
                Save Time. Save Money. Eat Quality.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAuthClick}
              className="bg-black text-white px-5 py-2.5 rounded-xl text-left flex items-center gap-3 shadow-md hover:bg-gray-900 transition-colors"
            >
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="none">
                <path d="M3.25 2.3c-.15.15-.25.38-.25.68v18.04c0 .3.1.53.25.68l.08.08L13.5 12.18v-.18L3.33 2.22l-.08.08z" fill="url(#play1)" />
                <path d="M16.89 15.63l-3.39-3.39v-.18l3.39-3.39.08.05 4.01 2.28c1.15.65 1.15 1.73 0 2.38l-4.01 2.28-.08-.03z" fill="url(#play2)" />
                <path d="M13.59 12.09L3.33 22.25c.38.4 1 .33 1.55.02l12.01-6.84-3.3-3.34z" fill="url(#play3)" />
                <path d="M13.59 12.09l3.3-3.34-12.01-6.84c-.55-.31-1.17-.38-1.55.02l10.26 10.16z" fill="url(#play4)" />
                <defs>
                  <linearGradient id="play1" x1="10.23" y1="2.46" x2="-2.04" y2="14.73" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#00a0ff" />
                    <stop offset="0.01" stopColor="#00a1ff" />
                    <stop offset="0.26" stopColor="#00beff" />
                    <stop offset="0.57" stopColor="#00d7ff" />
                    <stop offset="0.86" stopColor="#00e6ff" />
                    <stop offset="1" stopColor="#00ebff" />
                  </linearGradient>
                  <linearGradient id="play2" x1="22.27" y1="12" x2="3.19" y2="12" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#ff3a44" />
                    <stop offset="1" stopColor="#c31162" />
                  </linearGradient>
                  <linearGradient id="play3" x1="16.5" y1="15.89" x2="-2.26" y2="34.65" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#00e676" />
                    <stop offset="1" stopColor="#12c37d" />
                  </linearGradient>
                  <linearGradient id="play4" x1="10.45" y1="10.15" x2="-2.25" y2="-2.55" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#ffe000" />
                    <stop offset="0.4" stopColor="#ffca00" />
                    <stop offset="0.77" stopColor="#ff9f00" />
                    <stop offset="1" stopColor="#ff7a00" />
                  </linearGradient>
                </defs>
              </svg>
              <div>
                <span className="text-[9px] uppercase tracking-wider block text-gray-400">GET IT ON</span>
                <span className="text-sm font-bold leading-none">Google Play</span>
              </div>
            </button>
            <button
              onClick={handleAuthClick}
              className="bg-black text-white px-5 py-2.5 rounded-xl text-left flex items-center gap-3 shadow-md hover:bg-gray-900 transition-colors"
            >
              <svg className="w-6 h-6 fill-current text-white" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.8 16.32 3.98 9.58 8.1 9.28c1.37.1 2.2.78 3.03.8.84-.02 1.86-.8 3.42-.65 1.64.16 2.82.88 3.5 1.95-3.22 1.88-2.69 6.08.28 7.3-.7 1.76-1.52 3.48-3.28 3.6zM12.03 9.25c-.15-2.23 1.66-4.14 3.75-4.25.2 2.52-2.1 4.54-3.75 4.25z" />
              </svg>
              <div>
                <span className="text-[9px] uppercase tracking-wider block text-gray-400">Download on the</span>
                <span className="text-sm font-bold leading-none">App Store</span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <LandingFooter />
    </div>
  );
}

// Custom Helper Icons for Restroom and Parking
function RestroomIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M9 10v7l-2 5" />
      <path d="M9 17l2 5" />
      <path d="M6 11h6" />
      <path d="M16 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      <path d="M16 10l2.5 5h-5L16 10Z" />
      <path d="M14.5 17l-1 5" />
      <path d="M17.5 17l1 5" />
    </svg>
  );
}

function ParkingIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
    </svg>
  );
}
