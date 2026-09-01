import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Clock,
  Star,
  Zap,
  Utensils,
  CreditCard,
  ParkingCircle,
  ShieldCheck,
  ArrowRight,
  Smartphone,
  Navigation,
  Sparkles,
  CheckCircle2,
  Car,
  Compass,
  Store,
  Layers
} from 'lucide-react';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import PageTransition from '@/shared/components/motion/PageTransition';
import { EASING, MOTION_RULES } from '@/shared/motion/tokens';
import { useReducedMotionSafe } from '@/shared/motion/useReducedMotionSafe';

export default function FeaturesPage() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotionSafe();
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedFeatureIdx, setSelectedFeatureIdx] = useState(0);

  const featuresList = [
    {
      icon: MapPin,
      title: "Forward-Only Highway Restaurants",
      desc: "Our route-aware discovery shows restaurants that are actually ahead of you, not behind you or far off your highway path.",
      color: "bg-red-50 text-[#E0332F]",
      badgeColor: "bg-[#ffe5e5] text-[#d62828]",
      category: "Navigation",
      pill: "Forward-First Discovery",
      tag: "Route Aware"
    },
    {
      icon: Clock,
      title: "Pre-Ordering and Zero Wait Time",
      desc: "Place your order before arrival so your stop feels planned, faster, and far more convenient during long journeys.",
      color: "bg-orange-50 text-[#EA580C]",
      badgeColor: "bg-[#fff1de] text-[#8a3412]",
      category: "Ordering",
      pill: "Zero Wait Time",
      tag: "Instant Prep"
    },
    {
      icon: Utensils,
      title: "Verified Hygiene and Food Quality",
      desc: "Partner restaurants are presented with quality expectations in mind so travelers can choose with more confidence.",
      color: "bg-emerald-50 text-emerald-600",
      badgeColor: "bg-emerald-100 text-emerald-800",
      category: "Quality",
      pill: "Quality Standards",
      tag: "Hygiene Rated"
    },
    {
      icon: ShieldCheck,
      title: "Clean Washroom Information",
      desc: "See facility details before you stop, including washroom availability and comfort-focused travel essentials.",
      color: "bg-teal-50 text-teal-700",
      badgeColor: "bg-teal-100 text-teal-800",
      category: "Comfort",
      pill: "Verified Restrooms",
      tag: "Sanitized Stops"
    },
    {
      icon: ParkingCircle,
      title: "Parking and Accessibility Details",
      desc: "Know whether a stop is practical for cars, family travel, and larger highway vehicles before you reach it.",
      color: "bg-amber-50 text-amber-600",
      badgeColor: "bg-amber-100 text-amber-800",
      category: "Comfort",
      pill: "Ample Parking",
      tag: "Vehicle Ready"
    },
    {
      icon: Zap,
      title: "EV Charging on Route",
      desc: "Find charging-friendly stops that let you combine meals, breaks, and vehicle charging in one halt.",
      color: "bg-purple-50 text-purple-600",
      badgeColor: "bg-purple-100 text-purple-800",
      category: "Navigation",
      pill: "Fast Charging Hubs",
      tag: "EV Compatible"
    },
    {
      icon: Star,
      title: "Real Traveler Reviews",
      desc: "Read practical feedback from other highway users to decide where to stop with less guesswork.",
      color: "bg-yellow-50 text-yellow-600",
      badgeColor: "bg-yellow-100 text-yellow-800",
      category: "Quality",
      pill: "Community Insights",
      tag: "100% Genuine"
    },
    {
      icon: CreditCard,
      title: "Multiple Secure Payment Modes",
      desc: "Support for modern digital payments helps checkout feel familiar, quick, and trustworthy.",
      color: "bg-red-50 text-[#E0332F]",
      badgeColor: "bg-red-100 text-red-800",
      category: "Ordering",
      pill: "Frictionless Checkout",
      tag: "Encrypted & Safe"
    }
  ];

  const categories = ['All', 'Navigation', 'Ordering', 'Comfort', 'Quality'];

  const filteredFeatures = activeCategory === 'All'
    ? featuresList
    : featuresList.filter(f => f.category === activeCategory);

  const openUserFlow = () => {
    navigate('/user/auth/login');
  };

  return (
    <div className="landing-shell min-h-screen flex flex-col text-[color:var(--landing-text)]">
      <LandingHeader />

      <PageTransition>
        <main className="flex-1">
        {/* ========================================================================= */}
        {/* HERO SECTION (Matches Centralized Cinematic Dark Road Theme)              */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden bg-[#100B08] text-white flex items-center py-12 sm:py-16 lg:py-20 min-h-[640px] lg:min-h-[700px]">
          <div className="absolute inset-0 z-0 select-none pointer-events-none overflow-hidden">
            <img
              src="/assets/images/landingbg.png"
              alt="Highway road"
              className="h-full w-full object-cover opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0C0806]/96 via-[#0E0907]/85 to-[#0E0907]/45" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#100B08] via-transparent to-black/60" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#0C0806]/30 to-[#0C0806]/90" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-10 lg:gap-8">
              {/* Left Content Column */}
              <div className="lg:col-span-7 flex flex-col justify-center">
                <div>
                  <span className="landing-hero-badge">
                    The Complete Platform
                  </span>
                </div>

                <div className="mt-6 sm:mt-7">
                  <h1 className="landing-hero-h1 max-w-2xl">
                    Every highway tool built for <span className="text-[color:var(--landing-accent)]">clarity, speed & comfort</span>
                  </h1>
                  <p className="landing-hero-body mt-4 sm:mt-5">
                    Bhookingo replaces random roadside decisions with verified stops, live corridor detection, and frictionless meal pre-ordering.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3.5 sm:gap-4 mt-7 sm:mt-8">
                  <button
                    onClick={openUserFlow}
                    className="landing-button-primary flex items-center gap-2.5 rounded-full px-7 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-[0_8px_25px_rgba(224,51,47,0.35)] hover:shadow-[0_12px_32px_rgba(224,51,47,0.55)] transition-all active:scale-95 group cursor-pointer"
                  >
                    <Smartphone className="h-4 w-4 transition-transform group-hover:rotate-12" />
                    <span>Try Platform Free</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                  <a
                    href="#features-catalog"
                    className="landing-button-secondary flex items-center gap-2.5 rounded-full px-7 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-bold tracking-wider text-white shadow-lg backdrop-blur-md transition-all group cursor-pointer"
                  >
                    <span>Browse All Features</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                </div>

                {/* Standardized Three Pillar Cards in Hero */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 sm:mt-9">
                  {[
                    { value: '1000+', label: 'Verified highway dining partners' },
                    { value: '0 Mins', label: 'Waiting time on pre-ordered meals' },
                    { value: '200+', label: 'Indian highway corridors mapped' }
                  ].map((item) => (
                    <div
                      key={item.value}
                      className="landing-pillar-card"
                    >
                      <div className="landing-pillar-title">{item.value}</div>
                      <p className="landing-pillar-body">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Interactive Mockup Column */}
              <div className="lg:col-span-5 lg:pl-2 xl:pl-4 mt-8 lg:mt-0">
                <div className="landing-showcase-panel-outer">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[rgba(214,40,40,0.22)] blur-3xl" />
                  <div className="pointer-events-none absolute -left-8 bottom-8 h-24 w-24 rounded-full bg-white/8 blur-2xl" />

                  <div className="landing-showcase-panel-inner">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF8582]">
                          Live Platform Spotlight
                        </div>
                        <h2 className="pt-0.5 font-[var(--font-display)] text-lg sm:text-xl font-bold text-white">
                          Smart Highway Assistant
                        </h2>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-400 border border-emerald-500/30 font-[var(--font-ui)]">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Live on Route</span>
                      </div>
                    </div>

                    {/* Active Selected Feature Details with AnimatePresence crossfade */}
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm min-h-[110px]">
                      <AnimatePresence mode="wait">
                        {(() => {
                          const feat = featuresList[selectedFeatureIdx] || featuresList[0];
                          const IconComp = feat.icon;
                          return (
                            <motion.div
                              key={selectedFeatureIdx}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              transition={{ duration: 0.2 }}
                              className="space-y-2.5"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#E0332F] to-[#C72420] text-white shadow-[0_6px_16px_rgba(224,51,47,0.35)]">
                                  <IconComp className="h-5 w-5" />
                                </div>
                                <div>
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF8582] font-[var(--font-ui)]">
                                    {feat.tag}
                                  </span>
                                  <h3 className="font-[var(--font-display)] text-sm sm:text-base font-bold text-white leading-tight">
                                    {feat.title}
                                  </h3>
                                </div>
                              </div>
                              <p className="text-xs leading-relaxed text-[#dccac0] font-[var(--font-ui)]">
                                {feat.desc}
                              </p>
                            </motion.div>
                          );
                        })()}
                      </AnimatePresence>
                    </div>

                    {/* Interactive Feature Selectors */}
                    <div className="space-y-2 pt-3.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#dccac0] font-[var(--font-ui)]">
                        Click to Preview Core Features:
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {featuresList.slice(0, 4).map((item, idx) => (
                          <button
                            key={item.title}
                            onClick={() => setSelectedFeatureIdx(idx)}
                            className={`flex items-center gap-2 rounded-xl p-2.5 text-left text-xs font-semibold transition-all cursor-pointer font-[var(--font-ui)] ${
                              selectedFeatureIdx === idx
                                ? 'border border-[color:var(--landing-accent)] bg-white/15 text-white shadow-sm'
                                : 'border border-white/8 bg-white/[0.04] text-[#d8c7bb] hover:bg-white/[0.08]'
                            }`}
                          >
                            <item.icon className="h-3.5 w-3.5 shrink-0 text-[color:var(--landing-accent)]" />
                            <span className="truncate">{item.title.split(' ')[0]} {item.title.split(' ')[1] || ''}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between font-[var(--font-ui)]">
                      <span className="text-xs text-[#d8c7bb]">Ready to test on your highway?</span>
                      <button
                        onClick={openUserFlow}
                        className="text-xs font-bold text-[#FF8582] flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                      >
                        <span>Open Map</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* QUICK BENEFIT METRIC STRIP                                               */}
        {/* ========================================================================= */}
        <section className="border-y border-[color:var(--landing-line)] bg-[rgba(255,255,255,0.65)] py-8">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {[
              { title: "Forward Discovery", copy: "Only shows restaurants in your travel direction with zero backtracking." },
              { title: "Zero Wait Time", copy: "Place meal orders 15-30 minutes ahead for instantaneous road stops." },
              { title: "Verified Cleanliness", copy: "Pre-screened hygiene ratings & verified clean washroom facilities." },
              { title: "Highway Amenities", copy: "Dedicated parking spaces, EV charging stalls & family convenience." }
            ].map((item, index) => (
              <div
                key={item.title}
                className="relative rounded-[24px] border border-[color:var(--landing-line)] bg-white p-5 shadow-[0_14px_35px_rgba(71,43,24,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(71,43,24,0.1)]"
              >
                <div className="absolute left-0 top-6 h-12 w-1 rounded-r-full bg-[color:var(--landing-accent)]" />
                <div className="flex items-start justify-between gap-4 pl-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1f1] text-[color:var(--landing-accent)]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-black text-[#d1c3b9]">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="pt-4 pl-3 font-[var(--font-display)] text-lg font-black text-[color:var(--landing-text)]">
                  {item.title}
                </h3>
                <p className="pt-1.5 pl-3 text-xs leading-6 text-[color:var(--landing-text-muted)]">
                  {item.copy}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* MAIN FEATURES CATALOG (IMAGE 3 STYLING WITH BHOOKINGO THEME)             */}
        {/* ========================================================================= */}
        <section id="features-catalog" className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Top Section Header (Inspired by Image 3) */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 border-b border-[color:var(--landing-line)]">
              <div className="max-w-2xl space-y-3">
                <span className="landing-section-label text-xs font-extrabold text-[color:var(--landing-accent)]">
                  Why Choose Bhookingo?
                </span>
                <h2 className="landing-subtitle text-3xl font-black sm:text-4xl text-[color:var(--landing-text)]">
                  Built for Highway Journeys,
                  <span className="text-[color:var(--landing-accent)]"> Not City Guesswork</span>
                </h2>
                <p className="text-base leading-7 text-[color:var(--landing-text-muted)]">
                  Our commitment to your road experience goes beyond simple food listings. Discover the unique features that set us apart and ensure a seamless travel stop.
                </p>
              </div>

              {/* Category Filter Pills + Action Button */}
              <div className="flex flex-wrap items-center gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-full px-4 py-2 text-xs font-extrabold tracking-wide transition-all ${
                      activeCategory === cat
                        ? 'bg-[#1b130f] text-white shadow-md'
                        : 'border border-[color:var(--landing-line)] bg-white text-[color:var(--landing-text-muted)] hover:border-[#1b130f]/30 hover:text-[color:var(--landing-text)]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Features Cards Grid (Image 3 layout + Bhookingo Brand Palette) */}
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredFeatures.map((feature, idx) => {
                const IconComponent = feature.icon;
                const isFirstHighlighted = idx === 0 && activeCategory === 'All';

                return (
                  <div
                    key={feature.title}
                    className={`group relative rounded-[28px] p-6.5 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1.5 ${
                      isFirstHighlighted
                        ? 'border border-[#2a1c17] bg-[#1a120f] text-white shadow-[0_22px_55px_rgba(26,18,15,0.22)]'
                        : 'border border-[color:var(--landing-line)] bg-white text-[color:var(--landing-text)] shadow-[0_12px_32px_rgba(71,43,24,0.05)] hover:shadow-[0_20px_45px_rgba(214,40,40,0.1)] hover:border-[#d62828]/40'
                    }`}
                  >
                    {/* Top Accent & Icon */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div
                          className={`flex h-13 w-13 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105 ${
                            isFirstHighlighted
                              ? 'bg-[color:var(--landing-accent)] text-white shadow-[0_8px_20px_rgba(214,40,40,0.35)]'
                              : `${feature.color} shadow-xs`
                          }`}
                        >
                          <IconComponent className="h-6 w-6" />
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                            isFirstHighlighted
                              ? 'bg-white/12 text-[#f2b2b2]'
                              : feature.badgeColor
                          }`}
                        >
                          {feature.tag}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-2 pt-2">
                        <h3
                          className={`font-[var(--font-display)] text-lg font-black tracking-tight leading-snug ${
                            isFirstHighlighted ? 'text-white' : 'text-[color:var(--landing-text)]'
                          }`}
                        >
                          {feature.title}
                        </h3>
                        <p
                          className={`text-xs sm:text-sm leading-relaxed ${
                            isFirstHighlighted ? 'text-[#ddcec3]' : 'text-[color:var(--landing-text-muted)]'
                          }`}
                        >
                          {feature.desc}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Action Button with Animated Arrow */}
                    <div className="pt-6 mt-4 border-t border-current/10">
                      <button
                        onClick={openUserFlow}
                        className={`w-full flex items-center justify-between rounded-full px-5 py-3 text-xs font-extrabold uppercase tracking-[0.14em] transition-all duration-300 active:scale-95 ${
                          isFirstHighlighted
                            ? 'bg-white text-[#1a120f] hover:bg-[color:var(--landing-accent)] hover:text-white shadow-md'
                            : 'bg-[#1b130f] text-white hover:bg-[color:var(--landing-accent)] shadow-sm'
                        }`}
                      >
                        <span>Explore Feature</span>
                        {/* Animated Arrow Icon on Hover */}
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* INTERACTIVE COMPARISON MATRIX (OLD TRAVEL VS BHOOKINGO WAY)               */}
        {/* ========================================================================= */}
        <section className="border-y border-[color:var(--landing-line)] bg-[linear-gradient(180deg,#fff8f7_0%,#fff2f2_100%)] py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center pb-12">
              <span className="landing-section-label text-xs font-extrabold text-[color:var(--landing-accent)]">
                The Highway Transformation
              </span>
              <h2 className="landing-subtitle pt-3 text-3xl font-black sm:text-4xl text-[color:var(--landing-text)]">
                Traditional Highway Stops vs
                <span className="text-[color:var(--landing-accent)]"> The Bhookingo Standard</span>
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Without Bhookingo */}
              <div className="rounded-[32px] border border-red-200/60 bg-white/90 p-7 sm:p-8 shadow-[0_16px_40px_rgba(214,40,40,0.06)]">
                <div className="flex items-center gap-3 border-b border-red-100 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                    <Car className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-600">The Problem</span>
                    <h3 className="font-[var(--font-display)] text-xl font-bold text-gray-900">Unplanned Road Breaks</h3>
                  </div>
                </div>

                <div className="space-y-4 pt-6 text-sm text-[color:var(--landing-text-muted)]">
                  {[
                    "Uncertain quality and unpredictable kitchen cleanliness.",
                    "30-45 minutes lost waiting in crowded highway dhabas.",
                    "Frequent U-turns and off-route detours from generic maps.",
                    "Unknown washroom hygiene and limited parking space."
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-400" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* With Bhookingo */}
              <div className="rounded-[32px] border border-emerald-200/80 bg-white/95 p-7 sm:p-8 shadow-[0_18px_45px_rgba(16,185,129,0.08)]">
                <div className="flex items-center gap-3 border-b border-emerald-100 pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">The Solution</span>
                    <h3 className="font-[var(--font-display)] text-xl font-bold text-gray-900">With Bhookingo Features</h3>
                  </div>
                </div>

                <div className="space-y-4 pt-6 text-sm text-gray-800 font-medium">
                  {[
                    "Pre-verified hygiene ratings and quality partner restaurants.",
                    "Pre-order ahead so fresh food is served instantly on arrival.",
                    "Forward-only discovery eliminates wrong-side highway crossings.",
                    "Clear amenity signals for clean washrooms, parking & EV chargers."
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-600" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* BOTTOM HIGH CONVERSION CTA BANNER                                         */}
        {/* ========================================================================= */}
        <section className="pb-16 md:pb-24 pt-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[36px] bg-[#1a120f] px-6 py-10 text-white shadow-[0_30px_80px_rgba(35,20,14,0.22)] sm:px-10 md:py-14 relative">
              <div className="pointer-events-none absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-[rgba(214,40,40,0.25)] blur-3xl" />

              <div className="relative grid items-center gap-8 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <span className="landing-section-label text-[11px] font-extrabold text-[#f2b2b2]">
                    GET STARTED TODAY
                  </span>
                  <h2 className="pt-4 font-[var(--font-display)] text-3xl font-black sm:text-4xl">
                    Ready to Experience Seamless
                    <span className="text-[color:var(--landing-accent)]"> Highway Travel?</span>
                  </h2>
                  <p className="max-w-2xl pt-4 text-base leading-8 text-[#d8c7bb]">
                    Join thousands of smart highway travelers who save time, eat better, and travel with total peace of mind.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 lg:col-span-4 lg:justify-end">
                  <button
                    onClick={openUserFlow}
                    className="landing-button-primary flex items-center gap-2 rounded-full px-8 py-4 text-sm font-extrabold uppercase tracking-[0.18em] group active:scale-95"
                  >
                    <span>Open Bhookingo</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      </PageTransition>

      <LandingFooter />
    </div>
  );
}

