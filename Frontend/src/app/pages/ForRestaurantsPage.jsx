import React, { useState } from 'react';
import { motion } from 'framer-motion';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import PageTransition from '@/shared/components/motion/PageTransition';
import TiltCard from '@/shared/components/motion/TiltCard';
import { EASING, MOTION_RULES } from '@/shared/motion/tokens';
import { useReducedMotionSafe } from '@/shared/motion/useReducedMotionSafe';
import {
  TrendingUp,
  Clock,
  Users,
  Smartphone,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Store,
  ChefHat,
  Bell,
  MapPin,
  Search,
  SlidersHorizontal,
  DollarSign,
  Award,
  Navigation,
  Car
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ForRestaurantsPage() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotionSafe();
  const [activeAppTab, setActiveAppTab] = useState('appView');
  const [dailyOrders, setDailyOrders] = useState(60);

  const partnerLink = 'https://play.google.com/store/apps/details?id=com.bhookingo.restaurant&hl=en';

  const benefitsList = [
    {
      icon: TrendingUp,
      title: "High Intent Highway Customers",
      desc: "Reach travelers who are actively driving on your exact highway route and ready to order takeaway or dine-in.",
      tag: "Direct Route Traffic",
      color: "bg-red-50 text-[#E0332F]",
      badgeColor: "bg-[#ffe5e5] text-[#d62828]"
    },
    {
      icon: Clock,
      title: "Pre-Prepared Order Management",
      desc: "Receive pre-orders 15-30 minutes before arrival so your kitchen operates with smooth preparation schedules.",
      tag: "Smooth Kitchen Prep",
      color: "bg-orange-50 text-[#EA580C]",
      badgeColor: "bg-[#fff1de] text-[#8a3412]"
    },
    {
      icon: Users,
      title: "Increased Repeat Business",
      desc: "Build a loyal customer base of frequent travelers, transport operators, and road trip enthusiasts.",
      tag: "Loyal Highway Base",
      color: "bg-emerald-50 text-emerald-600",
      badgeColor: "bg-emerald-100 text-emerald-800"
    }
  ];

  const onboardingSteps = [
    {
      step: "01",
      title: "Quick Registration",
      desc: "Sign up your highway outlet in under 10 minutes with basic FSSAI and location details."
    },
    {
      step: "02",
      title: "Setup Highway Menu",
      desc: "List your popular highway thalis, snacks, beverages, and takeaway-friendly combos."
    },
    {
      step: "03",
      title: "Receive Live Pre-Orders",
      desc: "Accept orders ahead of time, have food ready upon arrival, and maximize table turnaround."
    }
  ];

  // Calculate estimated monthly extra revenue based on orders
  const estimatedRevenue = Math.round(dailyOrders * 320 * 30).toLocaleString('en-IN');
  const savedMinutes = Math.round(dailyOrders * 18 * 30).toLocaleString('en-IN');

  return (
    <div className="landing-shell min-h-screen flex flex-col text-[color:var(--landing-text)]">
      <LandingHeader />

      <PageTransition>
        <main className="flex-1">
        {/* ========================================================================= */}
        {/* HERO SECTION (Matches Centralized Cinematic Dark Road Theme)              */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden bg-[#100B08] text-white flex items-center py-8 sm:py-10 lg:py-12 min-h-[500px] lg:min-h-[560px]">
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
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-6">
              {/* Left Content Column */}
              <div className="lg:col-span-7 flex flex-col justify-center">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: EASING.smooth }}
                >
                  <span className="landing-hero-badge">
                    Bhookingo Partner Network
                  </span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.10, ease: EASING.smooth }}
                  className="mt-4 sm:mt-5"
                >
                  <h1 className="landing-hero-h1 max-w-2xl">
                    Grow Your <span className="text-[color:var(--landing-accent)]">Highway Restaurant</span> Business
                  </h1>
                  <p className="landing-hero-body mt-3 sm:mt-3.5">
                    Connect directly with thousands of daily highway travelers and road-trippers passing by your outlet. Boost orders and reduce table turnaround time.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.20, ease: EASING.smooth }}
                  className="flex flex-wrap items-center gap-3 mt-5 sm:mt-6"
                >
                  <button
                    onClick={() => window.open(partnerLink, '_blank')}
                    className="landing-button-primary flex items-center gap-2 rounded-full px-6 sm:px-7 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-[0_8px_25px_rgba(224,51,47,0.35)] hover:shadow-[0_12px_32px_rgba(224,51,47,0.55)] transition-all active:scale-95 group cursor-pointer"
                  >
                    <Store className="h-4 w-4" />
                    <span>Register Your Restaurant</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                  <a
                    href="#partner-benefits"
                    className="landing-button-secondary flex items-center gap-2 rounded-full px-6 sm:px-7 py-3 text-xs sm:text-sm font-bold tracking-wider text-white shadow-lg backdrop-blur-md transition-all group cursor-pointer"
                  >
                    <span>See Partner Benefits</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                </motion.div>

                {/* Standardized Three Pillar Cards in Hero */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.32, ease: EASING.smooth }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-6 sm:mt-7"
                >
                  {[
                    { value: '+40% Pre-Orders', label: 'Capture drive-by traffic before they pass your door' },
                    { value: '0 min Rush Chaos', label: 'Predictable kitchen preparation schedules' },
                    { value: 'Verified Travelers', label: 'Build long-term loyalty with interstate travelers' }
                  ].map((item) => (
                    <motion.div
                      key={item.value}
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.2 }}
                      className="landing-pillar-card cursor-default"
                    >
                      <div className="landing-pillar-title">{item.value}</div>
                      <p className="landing-pillar-body">{item.label}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Right Hero: Compact High-Fidelity Mobile App Showcase */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.65, delay: 0.35, ease: EASING.smooth }}
                className="lg:col-span-5 lg:pl-2 xl:pl-4 mt-6 lg:mt-0 flex justify-center"
              >
                <div className="relative flex flex-col items-center justify-center py-2 select-none w-full max-w-[280px] sm:max-w-[310px] mx-auto px-2">
                  {/* Ambient background glow behind mockup */}
                  <div className="absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full bg-gradient-to-tr from-[#E0332F]/25 via-[#D62828]/15 to-transparent blur-3xl -z-10 pointer-events-none" />

                  {/* 3D Floating Phone Container */}
                  <motion.div
                    animate={shouldReduceMotion ? {} : { y: [0, -6, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="relative flex items-center justify-center"
                  >
                    {/* Compact Phone Mockup Frame */}
                    <div className="relative mx-auto w-[195px] sm:w-[215px] md:w-[230px] rounded-[32px] border-[5px] border-[#18110D] bg-[#18110D] p-0.5 shadow-[0_20px_45px_rgba(0,0,0,0.5)] overflow-hidden font-[var(--font-ui)]">
                      {/* Dynamic Island / Speaker notch */}
                      <div className="absolute left-1/2 top-2 -translate-x-1/2 h-2.5 w-14 rounded-full bg-[#18110D] z-20" />

                      {/* Phone Screen Image */}
                      <div className="overflow-hidden rounded-[26px] bg-white aspect-[9/19]">
                        <img
                          src="/assets/images/how-step2-restaurants.png"
                          alt="Bhookingo Highway Restaurant Discovery"
                          className="w-full h-full object-cover object-top"
                          loading="eager"
                        />
                      </div>
                    </div>

                    {/* Floating Badge 1: Top Right - Live Route */}
                    <motion.div
                      initial={{ opacity: 0, x: 12, y: -8 }}
                      animate={{ opacity: 1, x: 0, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.45 }}
                      className="absolute -top-1 -right-3 sm:-right-4 rounded-xl border border-emerald-500/30 bg-emerald-950/90 px-2.5 py-1 text-[10px] font-bold text-emerald-400 shadow-md backdrop-blur-md flex items-center gap-1 z-30"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Live Route</span>
                    </motion.div>

                    {/* Floating Badge 2: Bottom Left - Pre-Order Ready */}
                    <motion.div
                      initial={{ opacity: 0, x: -12, y: 8 }}
                      animate={{ opacity: 1, x: 0, y: 0 }}
                      transition={{ delay: 0.65, duration: 0.45 }}
                      className="absolute -bottom-1 -left-3 sm:-left-4 rounded-xl border border-red-500/30 bg-[#18110D]/95 px-2.5 py-1 text-[10px] font-bold text-[#FF8582] shadow-md backdrop-blur-md flex items-center gap-1 z-30"
                    >
                      <Sparkles className="h-3 w-3 text-[#E0332F]" />
                      <span>Pre-Order Ready</span>
                    </motion.div>

                    {/* Floating Badge 3: Bottom Right - Hygiene Rated */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8, duration: 0.45 }}
                      className="absolute top-1/2 -right-4 sm:-right-6 -translate-y-1/2 rounded-xl border border-amber-500/30 bg-[#18110D]/95 px-2.5 py-1 text-[10px] font-bold text-amber-300 shadow-md backdrop-blur-md flex items-center gap-1 z-30"
                    >
                      <ShieldCheck className="h-3 w-3 text-amber-400" />
                      <span>4.8★ Verified</span>
                    </motion.div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* QUICK BENEFIT METRIC STRIP                                               */}
        {/* ========================================================================= */}
        <section className="border-y border-[color:var(--landing-line)] bg-[rgba(255,255,255,0.65)] py-6">
          <div className="mx-auto grid max-w-7xl gap-3.5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {[
              { title: "Zero Hardware Needed", copy: "Works directly on any Android smartphone, tablet, or web browser." },
              { title: "Direct Route Marketing", copy: "Display your authentic dhaba specialties to approaching commuters." },
              { title: "Predictable Orders", copy: "Receive itemized meal pre-orders 15-30 minutes prior to arrival." },
              { title: "Instant UPI Settlements", copy: "Transparent payouts with automated daily settlements." }
            ].map((item, index) => (
              <div
                key={item.title}
                className="relative rounded-2xl border border-[color:var(--landing-line)] bg-white p-4 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="absolute left-0 top-5 h-10 w-1 rounded-r-full bg-[color:var(--landing-accent)]" />
                <div className="flex items-start justify-between gap-3 pl-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff1f1] text-[color:var(--landing-accent)]">
                    <TrendingUp className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-xs font-black text-[#d1c3b9]">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="pt-3.5 pl-2.5 font-[var(--font-display)] text-base font-black text-[color:var(--landing-text)]">
                  {item.title}
                </h3>
                <p className="pt-1 pl-2.5 text-xs leading-relaxed text-[color:var(--landing-text-muted)]">
                  {item.copy}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* WHY JOIN BHOOKINGO NETWORK                                               */}
        {/* ========================================================================= */}
        <section id="partner-benefits" className="relative overflow-hidden bg-[linear-gradient(180deg,#fff5f4_0%,#fef0ee_45%,#fae2df_100%)] border-b border-[color:var(--landing-line)] py-10 md:py-14">
          {/* Shaded Red Atmospheric Glow Highlights */}
          <div className="pointer-events-none absolute -right-20 top-1/4 h-96 w-96 rounded-full bg-[rgba(224,51,47,0.08)] blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-1/4 h-96 w-96 rounded-full bg-[rgba(244,63,94,0.06)] blur-3xl" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[color:var(--landing-line)]">
              <div className="max-w-2xl space-y-2">
                <span className="landing-section-label text-[11px] font-extrabold text-[color:var(--landing-accent)]">
                  Partner Advantages
                </span>
                <h2 className="landing-subtitle text-2xl sm:text-3xl font-black text-[color:var(--landing-text)]">
                  Why Join <span className="text-[color:var(--landing-accent)]">Bhookingo Network?</span>
                </h2>
                <p className="text-xs sm:text-sm leading-relaxed text-[color:var(--landing-text-muted)]">
                  Empowering highway dhabas, food courts, and fine-dining restaurants across India.
                </p>
              </div>

              <button
                onClick={() => window.open(partnerLink, '_blank')}
                className="flex items-center gap-1.5 rounded-full bg-[#1b130f] px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white transition-all hover:bg-[color:var(--landing-accent)] shadow-sm shrink-0 group active:scale-95"
              >
                <span>Partner With Us</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>

            {/* 3 Core Benefit Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {benefitsList.map((benefit) => {
                const IconComponent = benefit.icon;
                return (
                  <motion.div
                    key={benefit.title}
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={{ duration: 0.25, ease: EASING.smooth }}
                    className="group relative rounded-2xl border border-[color:var(--landing-line)] bg-white p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-[#d62828]/40 flex flex-col justify-between cursor-default select-none"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className={`h-11 w-11 rounded-xl ${benefit.color} flex items-center justify-center shadow-2xs transition-transform duration-300 group-hover:scale-105`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider ${benefit.badgeColor}`}>
                          {benefit.tag}
                        </span>
                      </div>

                      <h3 className="font-[var(--font-display)] text-lg font-black text-[color:var(--landing-text)] leading-snug">
                        {benefit.title}
                      </h3>
                      <p className="text-xs sm:text-[13px] text-[color:var(--landing-text-muted)] leading-relaxed">
                        {benefit.desc}
                      </p>
                    </div>

                    <div className="pt-4 mt-3 border-t border-[color:var(--landing-line)]">
                      <button
                        onClick={() => window.open(partnerLink, '_blank')}
                        className="w-full flex items-center justify-between rounded-full bg-gray-50 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-800 transition-all duration-300 group-hover:bg-[#E0332F] group-hover:text-white cursor-pointer active:scale-95"
                      >
                        <span>Learn More</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* INTERACTIVE RESTAURANT REVENUE ESTIMATOR                                  */}
        {/* ========================================================================= */}
        <section className="border-y border-[color:var(--landing-line)] bg-[linear-gradient(180deg,#fff8f7_0%,#fff2f2_100%)] py-10 md:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-12 items-center">
              <div className="lg:col-span-6 space-y-3">
                <span className="landing-section-label text-[11px] font-extrabold text-[color:var(--landing-accent)]">
                  REVENUE SIMULATOR
                </span>
                <h2 className="landing-subtitle text-2xl sm:text-3xl font-black text-[color:var(--landing-text)]">
                  Estimate Your Monthly
                  <span className="text-[color:var(--landing-accent)]"> Highway Growth</span>
                </h2>
                <p className="text-xs sm:text-sm leading-relaxed text-[color:var(--landing-text-muted)]">
                  See how accepting pre-orders from highway travelers transforms empty tables into high-volume, predictable revenue.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-gray-800">Daily Highway Pre-Orders:</span>
                    <span className="text-lg sm:text-xl font-black text-[color:var(--landing-accent)] font-[var(--font-display)]">
                      {dailyOrders} Orders / Day
                    </span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="200"
                    step="5"
                    value={dailyOrders}
                    onChange={(e) => setDailyOrders(Number(e.target.value))}
                    className="w-full h-2 bg-red-100 rounded-lg appearance-none cursor-pointer accent-[#E0332F]"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-gray-400">
                    <span>15 orders (Small Dhaba)</span>
                    <span>100 orders (Food Court)</span>
                    <span>200+ orders (Highway Hub)</span>
                  </div>
                </div>
              </div>

              {/* Estimated Metric Cards */}
              <div className="lg:col-span-6 grid sm:grid-cols-2 gap-3.5">
                <div className="rounded-2xl border border-red-200/70 bg-white p-5 shadow-2xs">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[color:var(--landing-accent)]">
                    <DollarSign className="h-4.5 w-4.5" />
                  </div>
                  <div className="pt-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Est. Monthly Revenue
                  </div>
                  <div className="pt-0.5 font-[var(--font-display)] text-2xl font-black text-gray-900">
                    ₹{estimatedRevenue}
                  </div>
                  <p className="pt-1.5 text-[11px] text-gray-500">Based on average ₹320 highway ticket size</p>
                </div>

                <div className="rounded-2xl border border-emerald-200/70 bg-white p-5 shadow-2xs">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Clock className="h-4.5 w-4.5" />
                  </div>
                  <div className="pt-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Kitchen Hours Saved
                  </div>
                  <div className="pt-0.5 font-[var(--font-display)] text-2xl font-black text-gray-900">
                    {savedMinutes} mins
                  </div>
                  <p className="pt-1.5 text-[11px] text-gray-500">Faster turnarounds and prepped meals</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* HOW ONBOARDING WORKS (3 SIMPLE STEPS)                                     */}
        {/* ========================================================================= */}
        <section className="py-10 md:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="landing-section-label text-[11px] font-extrabold text-[color:var(--landing-accent)]">
                SIMPLE 3-STEP PROCESS
              </span>
              <h2 className="landing-subtitle text-2xl sm:text-3xl font-black text-[color:var(--landing-text)]">
                Start Accepting Orders in Minutes
              </h2>
              <p className="text-xs sm:text-sm text-[color:var(--landing-text-muted)]">
                Our seamless onboarding gets your highway outlet live without complex hardware.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {onboardingSteps.map((step) => (
                <div
                  key={step.step}
                  className="rounded-2xl border border-[color:var(--landing-line)] bg-white p-5 shadow-2xs space-y-2.5"
                >
                  <div className="font-[var(--font-display)] text-2xl font-black text-[color:var(--landing-accent)]">
                    {step.step}
                  </div>
                  <h3 className="font-[var(--font-display)] text-lg font-bold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-[color:var(--landing-text-muted)] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* HIGH CONVERSION CTA BOX                                                   */}
        {/* ========================================================================= */}
        <section className="pb-10 md:pb-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-3xl bg-[#1a120f] px-6 py-8 text-white shadow-xl sm:px-8 md:py-10 relative">
              <div className="pointer-events-none absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-[rgba(214,40,40,0.25)] blur-3xl" />

              <div className="relative grid items-center gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8 space-y-2">
                  <span className="landing-section-label text-[10px] font-extrabold text-[#f2b2b2]">
                    FAST ONBOARDING
                  </span>
                  <h2 className="font-[var(--font-display)] text-2xl sm:text-3xl font-black">
                    Ready to boost your revenue?
                  </h2>
                  <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-[#d8c7bb]">
                    Onboarding takes less than 10 minutes. Get started today and connect with thousands of daily highway travelers.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
                  <button
                    onClick={() => window.open(partnerLink, '_blank')}
                    className="landing-button-primary flex items-center gap-2 rounded-full px-6 py-3 text-xs sm:text-sm font-extrabold uppercase tracking-[0.18em] group active:scale-95 shadow-md"
                  >
                    <span>Partner With Us</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
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

