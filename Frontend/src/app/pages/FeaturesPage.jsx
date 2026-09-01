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

// Reusable Interactive Feature Card with 3D Tilt, Cursor Spotlight, SVG Highway Route, and Micro-Motion
function FeatureCard({
  feature,
  index,
  isSelected,
  onSelect,
  onExplore,
  shouldReduceMotion
}) {
  const isFirstCard = index === 0;
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, active: false });
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

  const handleMouseMove = (e) => {
    if (shouldReduceMotion || (typeof window !== 'undefined' && window.innerWidth < 768)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y, active: true });

    const maxTilt = 3.5;
    const rotateY = ((x / rect.width) - 0.5) * (maxTilt * 2);
    const rotateX = ((y / rect.height) - 0.5) * -(maxTilt * 2);
    setTilt({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0, active: false });
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  // Feature-specific micro-icon animations on hover
  const renderIconMicroMotion = () => {
    switch (index) {
      case 0: // Forward-Only Highway (MapPin)
        return (
          <div className="relative flex items-center justify-center">
            <span className="absolute -inset-1.5 rounded-full bg-[#E0332F]/20 animate-ping pointer-events-none opacity-50" />
            <MapPin className="h-6 w-6 transition-transform duration-300 group-hover:scale-110 text-[#E0332F]" />
          </div>
        );
      case 1: // Pre-ordering (Clock)
        return (
          <Clock className="h-6 w-6 transition-transform duration-300 group-hover:rotate-45 text-[#EA580C]" />
        );
      case 2: // Verified Hygiene (Utensils)
        return (
          <Utensils className="h-6 w-6 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110 text-emerald-600" />
        );
      case 3: // Clean Washroom (ShieldCheck)
        return (
          <ShieldCheck className="h-6 w-6 transition-transform duration-300 group-hover:scale-110 text-teal-700" />
        );
      case 4: // Parking (ParkingCircle)
        return (
          <ParkingCircle className="h-6 w-6 transition-transform duration-300 group-hover:-translate-y-1 text-amber-600" />
        );
      case 5: // EV Charging (Zap)
        return (
          <Zap className="h-6 w-6 transition-transform duration-300 group-hover:scale-115 text-purple-600 group-hover:drop-shadow-[0_0_8px_rgba(147,51,234,0.4)]" />
        );
      case 6: // Reviews (Star)
        return (
          <Star className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 text-yellow-600" />
        );
      case 7: // Payment (CreditCard)
        return (
          <CreditCard className="h-6 w-6 transition-transform duration-300 group-hover:translate-x-1 text-[#E0332F]" />
        );
      default: {
        const IconComponent = feature.icon;
        return <IconComponent className="h-6 w-6" />;
      }
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, ease: EASING.smooth }}
      whileHover={{ y: -8, scale: 1.015 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => onSelect(index)}
      style={{
        transformStyle: 'preserve-3d',
        transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`
      }}
      className={`group relative rounded-[28px] p-6.5 transition-all duration-300 flex flex-col justify-between cursor-pointer select-none overflow-hidden ${
        isSelected
          ? 'border-2 border-[color:var(--landing-accent)] bg-gradient-to-b from-[#FFFDF9] via-[#FFFAF7] to-[#FFF5F2] text-[color:var(--landing-text)] shadow-[0_22px_50px_rgba(224,51,47,0.14)]'
          : isFirstCard
          ? 'border border-[color:var(--landing-accent)]/35 bg-gradient-to-b from-[#FFFDF9] via-[#FFFAF7] to-[#FFF6F3] text-[color:var(--landing-text)] shadow-[0_14px_36px_rgba(224,51,47,0.07)] hover:border-[color:var(--landing-accent)]/60 hover:shadow-[0_22px_50px_rgba(224,51,47,0.12)]'
          : 'border border-[color:var(--landing-line)] bg-white/95 text-[color:var(--landing-text)] shadow-[0_10px_30px_rgba(71,43,24,0.04)] hover:shadow-[0_20px_45px_rgba(224,51,47,0.10)] hover:border-[#d62828]/40'
      }`}
    >
      {/* Mouse-Following Radial Spotlight */}
      {mousePos.active && !shouldReduceMotion && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(280px circle at ${mousePos.x}px ${mousePos.y}px, rgba(224, 51, 47, 0.08), transparent 70%)`
          }}
        />
      )}

      {/* Featured Card Decorative Animated Highway Route Graphic */}
      {(isFirstCard || isSelected) && (
        <div className="pointer-events-none absolute -right-2 top-2 w-36 h-28 opacity-25 overflow-hidden -z-0">
          <svg className="w-full h-full" viewBox="0 0 140 110" fill="none">
            <path
              d="M 10,95 Q 65,85 75,45 T 130,15"
              stroke="#E0332F"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              className="animate-road-dash"
            />
            {/* Start location marker */}
            <circle cx="10" cy="95" r="3.5" fill="#E0332F" />
            <circle cx="10" cy="95" r="7" stroke="#E0332F" strokeWidth="1" opacity="0.4" />
            {/* Mid waypoint */}
            <circle cx="75" cy="45" r="2.5" fill="#E0332F" />
            {/* Destination / Restaurant Pin */}
            <circle cx="130" cy="15" r="4" fill="#E0332F" />
            <circle cx="130" cy="15" r="8" stroke="#E0332F" strokeWidth="1" opacity="0.5" />
          </svg>
        </div>
      )}

      {/* Top Accent & Icon */}
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div
            className={`flex h-13 w-13 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-108 group-hover:-rotate-2 ${
              isSelected
                ? 'bg-[#ffebee] text-[#E0332F] shadow-xs'
                : isFirstCard
                ? 'bg-[#fff1f1] text-[#E0332F] shadow-xs border border-red-100'
                : `${feature.color} shadow-xs`
            }`}
          >
            {renderIconMicroMotion()}
          </div>

          <div className="flex items-center gap-1.5">
            {isSelected && (
              <span className="flex h-2 w-2 rounded-full bg-[color:var(--landing-accent)] animate-pulse" />
            )}
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider font-[var(--font-ui)] ${
                isSelected || isFirstCard
                  ? 'bg-[#ffe5e5] text-[#d62828]'
                  : feature.badgeColor
              }`}
            >
              {feature.tag}
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2 pt-2">
          <h3
            className="font-[var(--font-ui)] text-lg font-bold tracking-tight text-[color:var(--landing-text)] leading-snug transition-transform duration-300 group-hover:translate-x-1"
          >
            {feature.title}
          </h3>
          <p
            className="font-[var(--font-ui)] text-xs sm:text-sm leading-relaxed text-[color:var(--landing-text-muted)] transition-opacity duration-300"
          >
            {feature.desc}
          </p>
        </div>
      </div>

      {/* Bottom Action Button with Animated Arrow */}
      <div className="relative z-10 pt-6 mt-4 border-t border-[color:var(--landing-line)]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExplore(index);
          }}
          className={`w-full flex items-center justify-between rounded-full px-5 py-3 text-xs font-extrabold uppercase tracking-[0.14em] transition-all duration-300 active:scale-95 cursor-pointer font-[var(--font-ui)] ${
            isSelected
              ? 'bg-[color:var(--landing-accent)] text-white shadow-md'
              : 'bg-[#FAF7F4] text-[#1B130E] border border-[color:var(--landing-line)] group-hover:bg-[color:var(--landing-accent)] group-hover:text-white group-hover:border-[color:var(--landing-accent)] shadow-xs'
          }`}
        >
          <span>{isSelected ? 'Selected' : 'Explore Feature'}</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1.5" />
        </button>
      </div>
    </motion.div>
  );
}

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
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: EASING.smooth }}
                >
                  <span className="landing-hero-badge">
                    The Complete Platform
                  </span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.10, ease: EASING.smooth }}
                  className="mt-6 sm:mt-7"
                >
                  <h1 className="landing-hero-h1 max-w-2xl">
                    Every highway tool built for <span className="text-[color:var(--landing-accent)]">clarity, speed & comfort</span>
                  </h1>
                  <p className="landing-hero-body mt-4 sm:mt-5">
                    Bhookingo replaces random roadside decisions with verified stops, live corridor detection, and frictionless meal pre-ordering.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.20, ease: EASING.smooth }}
                  className="flex flex-wrap items-center gap-3.5 sm:gap-4 mt-7 sm:mt-8"
                >
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
                </motion.div>

                {/* Standardized Three Pillar Cards in Hero */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.32, ease: EASING.smooth }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 sm:mt-9"
                >
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
                </motion.div>
              </div>

              {/* Right Interactive Mockup Column */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.35, ease: EASING.smooth }}
                className="lg:col-span-5 lg:pl-2 xl:pl-4 mt-8 lg:mt-0"
              >
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
                              initial={{ opacity: 0, y: 8, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -8, scale: 0.98 }}
                              transition={{ duration: 0.28, ease: EASING.smooth }}
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
              </motion.div>
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
        <section id="features-catalog" className="relative overflow-hidden bg-[linear-gradient(180deg,#fff9f7_0%,#fcf5f0_45%,#f8ede4_100%)] border-b border-[color:var(--landing-line)] py-16 md:py-24">
          {/* Atmospheric Glow Highlights */}
          <div className="pointer-events-none absolute -right-20 top-1/4 h-96 w-96 rounded-full bg-[rgba(224,51,47,0.06)] blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-1/4 h-96 w-96 rounded-full bg-[rgba(245,158,11,0.05)] blur-3xl" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
                <p className="text-base font-bold leading-7 text-[color:var(--landing-text-muted)]">
                  Our commitment to your road experience goes beyond simple food listings. Discover the unique features that set us apart and ensure a seamless travel stop.
                </p>
              </div>

              {/* Category Filter Pills Container */}
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-full bg-white/90 border border-[color:var(--landing-line)] shadow-[0_4px_16px_rgba(71,43,24,0.06)] backdrop-blur-md">
                {categories.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`relative rounded-full px-5 py-2 text-xs font-extrabold tracking-wide transition-colors cursor-pointer select-none ${
                        isActive
                          ? 'text-white'
                          : 'text-[color:var(--landing-text-muted)] hover:text-[color:var(--landing-text)]'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="featureFilterActive"
                          className="absolute inset-0 rounded-full bg-[#1b130f] shadow-md"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Features Cards Grid (Image 3 layout + Bhookingo Brand Palette) */}
            <motion.div
              layout
              className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <AnimatePresence mode="popLayout">
                {filteredFeatures.map((feature) => {
                  const originalIdx = featuresList.findIndex(f => f.title === feature.title);
                  const isSelected = selectedFeatureIdx === originalIdx;

                  return (
                    <FeatureCard
                      key={feature.title}
                      feature={feature}
                      index={originalIdx}
                      isSelected={isSelected}
                      onSelect={(idx) => setSelectedFeatureIdx(idx)}
                      onExplore={() => {
                        setSelectedFeatureIdx(originalIdx);
                        openUserFlow();
                      }}
                      shouldReduceMotion={shouldReduceMotion}
                    />
                  );
                })}
              </AnimatePresence>
            </motion.div>
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

