import React, { useState } from 'react';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
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

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* HERO SECTION (Matches HowItWorks Cinematic Dark Road Theme)              */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden bg-[#16100d] text-white">
          <div className="absolute inset-0">
            <img
              src="/assets/images/landingbg.png"
              alt="Highway road"
              className="h-full w-full object-cover opacity-55"
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,40,40,0.28),transparent_35%),linear-gradient(180deg,rgba(12,8,8,0.72)_0%,rgba(12,8,8,0.8)_48%,rgba(12,8,8,0.92)_100%)]" />
          </div>

          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-24">
            <div className="lg:col-span-7 space-y-6">
              <span className="landing-section-label inline-flex rounded-full border border-white/15 bg-white/12 px-4 py-2 text-[11px] font-extrabold uppercase text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur-md">
                PARTNER WITH BHOOKINGO
              </span>

              <div className="space-y-4">
                <h1 className="landing-title max-w-4xl text-4xl font-black text-white sm:text-5xl lg:text-[3.75rem]">
                  Grow Your
                  <br />
                  <span className="text-[color:var(--landing-accent)]">Highway Restaurant</span> Business
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[#f1e4db] sm:text-lg">
                  Connect directly with thousands of daily highway travelers and road-trippers passing by your outlet. Boost orders and reduce table turnaround time.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={() => window.open(partnerLink, '_blank')}
                  className="landing-button-primary flex items-center gap-2 rounded-full px-8 py-4 text-sm font-extrabold uppercase tracking-[0.18em] transition-all active:scale-95 group shadow-lg"
                >
                  <Store className="h-4 w-4" />
                  <span>Register Your Restaurant</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                </button>
                <a
                  href="#partner-benefits"
                  className="landing-button-secondary flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold transition-all group"
                >
                  <span>See Partner Benefits</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                </a>
              </div>

              {/* Three Partner Pillars in Hero */}
              <div className="grid gap-3 pt-4 sm:grid-cols-3">
                {[
                  { value: '+40% Pre-Orders', label: 'Capture drive-by traffic before they pass your door' },
                  { value: '0 min Rush Chaos', label: 'Predictable kitchen preparation schedules' },
                  { value: 'Verified Travelers', label: 'Build long-term loyalty with interstate travelers' }
                ].map((item) => (
                  <div
                    key={item.value}
                    className="rounded-[24px] border border-white/12 bg-[rgba(255,255,255,0.12)] px-4 py-4 shadow-[0_18px_45px_rgba(0,0,0,0.16)] backdrop-blur-md transition-all hover:bg-[rgba(255,255,255,0.16)]"
                  >
                    <div className="font-[var(--font-display)] text-lg font-bold text-white">{item.value}</div>
                    <p className="pt-1 text-xs leading-5 text-[#f0e2d7]">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Hero: High-Fidelity Mobile App Showcase (Reference Image 3) */}
            <div className="lg:col-span-5 lg:pl-6 xl:pl-8">
              <div className="relative overflow-hidden rounded-[36px] border border-white/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0.12)_100%)] p-4 sm:p-5 shadow-[0_30px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[rgba(214,40,40,0.22)] blur-3xl" />
                <div className="pointer-events-none absolute -left-8 bottom-8 h-24 w-24 rounded-full bg-white/8 blur-2xl" />

                {/* Mobile Device Frame */}
                <div className="relative mx-auto max-w-[340px] rounded-[32px] border-4 border-[#2b1f1a] bg-[#fafafa] text-gray-900 shadow-2xl overflow-hidden">
                  {/* Phone Status Bar */}
                  <div className="bg-[#fffdfa] px-4 pt-2.5 pb-2 flex items-center justify-between text-[11px] font-bold text-gray-800 border-b border-gray-100">
                    <span>4:37 PM</span>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span>VoLTE</span>
                      <span>5G</span>
                      <span className="rounded bg-gray-800 text-white px-1 text-[9px]">71%</span>
                    </div>
                  </div>

                  {/* App Header (Matching Bhookingo Mobile App Interface) */}
                  <div className="bg-white px-3.5 pt-2.5 pb-2.5 border-b border-gray-100">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-[#E0332F] flex items-center justify-center text-white font-black text-xs shadow-xs">
                          B
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-xs font-black text-gray-900 leading-tight">
                            <span>South Tukoganj</span>
                            <span className="text-[10px]">▾</span>
                          </div>
                          <p className="text-[9px] text-gray-500 truncate max-w-[130px]">
                            Corporate House, 307 B, Regal...
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">
                          <Bell className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>

                    {/* Search Bar + Veg Mode Toggle */}
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-1.5 bg-gray-100/90 rounded-full px-3 py-1.5 text-[11px] text-gray-500 border border-gray-200">
                        <Search className="h-3.5 w-3.5 text-[#E0332F]" />
                        <span>Search "thali"</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black text-gray-600 uppercase">VEG MODE</span>
                        <div className="w-7 h-3.5 bg-gray-300 rounded-full p-0.5 flex items-center">
                          <div className="w-2.5 h-2.5 bg-white rounded-full shadow-xs" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* App Scroll Content */}
                  <div className="p-3 space-y-3 bg-[#fcfaf8] max-h-[300px] overflow-hidden">
                    {/* Featured Dish Carousel Card */}
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200/80 shadow-xs bg-white">
                      <img
                        src="/assets/images/landingbg.png"
                        alt="Restaurant Food Banner"
                        className="h-24 w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2.5 flex flex-col justify-end text-white">
                        <span className="text-[9px] font-bold text-[#f2b2b2] uppercase tracking-wider">Live On Route</span>
                        <span className="text-xs font-black leading-tight">Deluxe Highway Thali & Meals</span>
                      </div>
                    </div>

                    {/* Explore Categories Pills */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-gray-900 pb-1.5">
                        <span>Explore Categories</span>
                        <span className="text-[10px] text-[#E0332F] font-extrabold flex items-center">
                          View All <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
                        </span>
                      </div>

                      <div className="flex gap-2 text-center text-[10px] font-bold text-gray-800">
                        <div className="flex-1 rounded-xl bg-white p-1.5 border border-emerald-500/50 shadow-xs">
                          <span className="text-emerald-700">🍛 All</span>
                        </div>
                        <div className="flex-1 rounded-xl bg-white p-1.5 border border-gray-200 shadow-xs">
                          <span>🍔 Burger</span>
                        </div>
                        <div className="flex-1 rounded-xl bg-white p-1.5 border border-gray-200 shadow-xs">
                          <span>🍕 Pizza</span>
                        </div>
                      </div>
                    </div>

                    {/* Fast Travel Delivery Banner */}
                    <div className="rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 p-2.5 text-white shadow-sm flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-black uppercase tracking-wider text-red-200">Express Pickup</div>
                        <div className="text-xs font-black">Food Ready in 10 Mins</div>
                      </div>
                      <div className="rounded-full bg-white text-[#E0332F] px-2.5 py-1 text-[9px] font-black shadow-xs">
                        Order Ahead
                      </div>
                    </div>
                  </div>

                  {/* App Bottom Navigation Bar */}
                  <div className="bg-white border-t border-gray-200 px-3 py-2 flex justify-around text-center text-[9px] font-bold text-gray-500">
                    <div className="flex flex-col items-center gap-0.5">
                      <Navigation className="h-3.5 w-3.5 text-gray-400" />
                      <span>Driving</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 text-[#E0332F]">
                      <div className="h-4 w-7 rounded-full bg-red-50 flex items-center justify-center">
                        <ChefHat className="h-3.5 w-3.5 text-[#E0332F]" />
                      </div>
                      <span>Restaurants</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Store className="h-3.5 w-3.5 text-gray-400" />
                      <span>Orders</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      <span>Profile</span>
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
              { title: "Route-Specific Reach", copy: "Only target travelers heading directly toward your outlet." },
              { title: "Pre-Paid Orders", copy: "Zero payment disputes with secure advance digital checkouts." },
              { title: "Faster Table Turnaround", copy: "Serve travelers in half the time without crowded waiting areas." },
              { title: "Highway Brand Trust", copy: "Verified reviews & hygiene signals to attract highway families." }
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
        {/* WHY JOIN BHOOKINGO NETWORK (UPGRADED BENEFIT CARDS)                      */}
        {/* ========================================================================= */}
        <section id="partner-benefits" className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[color:var(--landing-line)]">
              <div className="max-w-2xl space-y-3">
                <span className="landing-section-label text-xs font-extrabold text-[color:var(--landing-accent)]">
                  Partner Advantages
                </span>
                <h2 className="landing-subtitle text-3xl font-black sm:text-4xl text-[color:var(--landing-text)]">
                  Why Join <span className="text-[color:var(--landing-accent)]">Bhookingo Network?</span>
                </h2>
                <p className="text-base leading-7 text-[color:var(--landing-text-muted)]">
                  Empowering highway dhabas, food courts, and fine-dining restaurants across India.
                </p>
              </div>

              <button
                onClick={() => window.open(partnerLink, '_blank')}
                className="flex items-center gap-2 rounded-full bg-[#1b130f] px-6 py-3 text-xs font-extrabold uppercase tracking-[0.16em] text-white transition-all hover:bg-[color:var(--landing-accent)] shadow-md shrink-0 group active:scale-95"
              >
                <span>Partner With Us</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
              </button>
            </div>

            {/* 3 Core Benefit Cards with Animated Hover Arrow */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {benefitsList.map((benefit, idx) => {
                const IconComponent = benefit.icon;
                return (
                  <div
                    key={benefit.title}
                    className="group relative rounded-[28px] border border-[color:var(--landing-line)] bg-white p-7 shadow-[0_14px_35px_rgba(71,43,24,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_50px_rgba(214,40,40,0.12)] hover:border-[#d62828]/40 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className={`h-13 w-13 rounded-2xl ${benefit.color} flex items-center justify-center shadow-xs transition-transform duration-300 group-hover:scale-105`}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider ${benefit.badgeColor}`}>
                          {benefit.tag}
                        </span>
                      </div>

                      <h3 className="font-[var(--font-display)] text-xl font-black text-[color:var(--landing-text)] leading-snug">
                        {benefit.title}
                      </h3>
                      <p className="text-sm text-[color:var(--landing-text-muted)] leading-relaxed">
                        {benefit.desc}
                      </p>
                    </div>

                    <div className="pt-6 mt-4 border-t border-[color:var(--landing-line)]">
                      <button
                        onClick={() => window.open(partnerLink, '_blank')}
                        className="w-full flex items-center justify-between rounded-full bg-gray-50 px-5 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-gray-800 transition-all duration-300 group-hover:bg-[#E0332F] group-hover:text-white"
                      >
                        <span>Learn More</span>
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* INTERACTIVE RESTAURANT REVENUE ESTIMATOR                                  */}
        {/* ========================================================================= */}
        <section className="border-y border-[color:var(--landing-line)] bg-[linear-gradient(180deg,#fff8f7_0%,#fff2f2_100%)] py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-12 items-center">
              <div className="lg:col-span-6 space-y-4">
                <span className="landing-section-label text-xs font-extrabold text-[color:var(--landing-accent)]">
                  REVENUE SIMULATOR
                </span>
                <h2 className="landing-subtitle text-3xl font-black sm:text-4xl text-[color:var(--landing-text)]">
                  Estimate Your Monthly
                  <span className="text-[color:var(--landing-accent)]"> Highway Growth</span>
                </h2>
                <p className="text-base leading-7 text-[color:var(--landing-text-muted)]">
                  See how accepting pre-orders from highway travelers transforms empty tables into high-volume, predictable revenue.
                </p>

                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-800">Daily Highway Pre-Orders:</span>
                    <span className="text-xl font-black text-[color:var(--landing-accent)] font-[var(--font-display)]">
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
                  <div className="flex justify-between text-[11px] font-bold text-gray-400">
                    <span>15 orders (Small Dhaba)</span>
                    <span>100 orders (Food Court)</span>
                    <span>200+ orders (Highway Hub)</span>
                  </div>
                </div>
              </div>

              {/* Estimated Metric Cards */}
              <div className="lg:col-span-6 grid sm:grid-cols-2 gap-4">
                <div className="rounded-[28px] border border-red-200/70 bg-white p-6 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-[color:var(--landing-accent)]">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div className="pt-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                    Est. Monthly Revenue
                  </div>
                  <div className="pt-1 font-[var(--font-display)] text-3xl font-black text-gray-900">
                    ₹{estimatedRevenue}
                  </div>
                  <p className="pt-2 text-xs text-gray-500">Based on average ₹320 highway ticket size</p>
                </div>

                <div className="rounded-[28px] border border-emerald-200/70 bg-white p-6 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="pt-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                    Kitchen Hours Saved
                  </div>
                  <div className="pt-1 font-[var(--font-display)] text-3xl font-black text-gray-900">
                    {savedMinutes} mins
                  </div>
                  <p className="pt-2 text-xs text-gray-500">Faster turnarounds and prepped meals</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* HOW ONBOARDING WORKS (3 SIMPLE STEPS)                                     */}
        {/* ========================================================================= */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="landing-section-label text-xs font-extrabold text-[color:var(--landing-accent)]">
                SIMPLE 3-STEP PROCESS
              </span>
              <h2 className="landing-subtitle text-3xl font-black sm:text-4xl text-[color:var(--landing-text)]">
                Start Accepting Orders in Minutes
              </h2>
              <p className="text-sm text-[color:var(--landing-text-muted)]">
                Our seamless onboarding gets your highway outlet live without complex hardware.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {onboardingSteps.map((step) => (
                <div
                  key={step.step}
                  className="rounded-[28px] border border-[color:var(--landing-line)] bg-white p-7 shadow-xs space-y-3"
                >
                  <div className="font-[var(--font-display)] text-3xl font-black text-[color:var(--landing-accent)]">
                    {step.step}
                  </div>
                  <h3 className="font-[var(--font-display)] text-xl font-bold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="text-sm text-[color:var(--landing-text-muted)] leading-relaxed">
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
        <section className="pb-16 md:pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[36px] bg-[#1a120f] px-6 py-10 text-white shadow-[0_30px_80px_rgba(35,20,14,0.22)] sm:px-10 md:py-14 relative">
              <div className="pointer-events-none absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-[rgba(214,40,40,0.25)] blur-3xl" />

              <div className="relative grid items-center gap-8 lg:grid-cols-12">
                <div className="lg:col-span-8 space-y-3">
                  <span className="landing-section-label text-[11px] font-extrabold text-[#f2b2b2]">
                    FAST ONBOARDING
                  </span>
                  <h2 className="font-[var(--font-display)] text-3xl font-black sm:text-4xl">
                    Ready to boost your revenue?
                  </h2>
                  <p className="max-w-2xl text-base leading-8 text-[#d8c7bb]">
                    Onboarding takes less than 10 minutes. Get started today and connect with thousands of daily highway travelers.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 lg:col-span-4 lg:justify-end">
                  <button
                    onClick={() => window.open(partnerLink, '_blank')}
                    className="landing-button-primary flex items-center gap-2 rounded-full px-8 py-4 text-sm font-extrabold uppercase tracking-[0.18em] group active:scale-95 shadow-lg"
                  >
                    <span>Partner With Us</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

