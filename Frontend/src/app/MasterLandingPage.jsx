import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Star,
  Zap,
  Utensils,
  Smartphone,
  Globe,
  Search,
  ShoppingBag,
  Car,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Award,
  CreditCard,
  Building2,
  Navigation,
  Sparkles,
  Flame,
  ArrowRight,
  Bell,
  User,
  Home as HomeIcon,
  ShoppingBag as OrdersIcon,
  X,
  Menu,
  Check,
  Coffee,
  Compass,
  Navigation2
} from 'lucide-react';
import LandingHeader from './components/LandingHeader';
import LandingFooter from './components/LandingFooter';

export default function MasterLandingPage() {
  const navigate = useNavigate();

  const handleAuthClick = () => {
    const authStatus = localStorage.getItem("user_authenticated");
    const token = localStorage.getItem("user_accessToken");
    if (authStatus === "true" || token) {
      navigate("/food/user");
    } else {
      navigate("/user/auth/login");
    }
  };

  const handleDriveModeClick = () => {
    navigate("/food/user/driving");
  };

  const handleExploreWebClick = () => {
    navigate("/food/user");
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-[#E0332F] selection:text-white">
      <LandingHeader />

      {/* 2. HERO SECTION */}
      <section className="relative bg-[#0F172A] text-white overflow-hidden min-h-[640px] lg:min-h-[720px] flex items-center py-12 lg:py-16">
        {/* Background Image with Dark Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/images/landingbg.png"
            alt="Expressway Highway Sunset"
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/65" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">

            {/* Left Column: Hero Text Content */}
            <div className="lg:col-span-6 space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-[#E0332F] text-white text-[11px] font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg shadow-red-500/30">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>INDIA'S FIRST HIGHWAY FOOD APP</span>
              </div>

              {/* Headline */}
              <div className="space-y-2">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-none">
                  Bhookingo = <br />
                  <span className="text-[#E0332F]">Bhookh + In + Go</span> <br />
                  <span className="text-white text-3xl sm:text-4xl lg:text-5xl font-extrabold block mt-2">
                    Highway Takeaway & Dine-In
                  </span>
                </h1>
              </div>

              {/* Subheadline */}
              <div className="text-xl sm:text-2xl font-bold text-gray-100 leading-snug">
                Order Before You Reach. <br />
                <span className="text-gray-200">Pick Up Without Waiting.</span>
              </div>

              {/* Description */}
              <p className="text-sm sm:text-base text-gray-300 max-w-xl font-normal leading-relaxed">
                India's first highway food discovery & pre-order app. Find only forward restaurants, pre-order takeaway or reserve dine-in and enjoy quality food on your journey.
              </p>

              {/* CTA Row */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={handleAuthClick}
                  className="bg-gradient-to-r from-[#E0332F] to-[#C92824] hover:from-[#c92824] hover:to-[#a81f1c] text-white text-sm font-black px-8 py-4 rounded-full shadow-xl shadow-red-500/30 transition-all active:scale-95 flex items-center gap-2.5"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Download App</span>
                </button>
                <button
                  onClick={handleExploreWebClick}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/30 text-sm font-bold px-8 py-4 rounded-full shadow-lg transition-all active:scale-95 flex items-center gap-2.5 backdrop-blur-sm"
                >
                  <Globe className="w-4 h-4" />
                  <span>Explore on Web</span>
                </button>
              </div>

              {/* Horizontal Feature Chips Row (Hero Bottom) */}
              <div className="pt-6 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {[
                  { icon: MapPin, text: "Only Forward Restaurants" },
                  { icon: Clock, text: "Save Time & Money" },
                  { icon: Star, text: "Quality Food Every Time" },
                  { icon: RestroomIcon, text: "Clean Washrooms Info" },
                  { icon: Utensils, text: "Dine-in & Takeaway" },
                  { icon: Zap, text: "EV Charging On Route" },
                  { icon: ParkingIcon, text: "Parking Info Easy & Safe" }
                ].map((item, idx) => (
                  <div key={idx} className="bg-black/40 border border-white/10 rounded-xl p-2.5 flex flex-col items-start gap-1.5 backdrop-blur-sm hover:border-red-500/50 transition-colors">
                    <item.icon className="w-4 h-4 text-[#E0332F]" />
                    <span className="text-[10px] font-semibold text-gray-200 leading-tight">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Center-Right Column: Mobile Device Mockup */}
            <div className="lg:col-span-3 flex justify-center py-4">
              <div className="relative w-[270px] sm:w-[290px] h-[570px] bg-black rounded-[44px] p-3 shadow-[0_25px_60px_rgba(0,0,0,0.8)] border-4 border-gray-800">
                {/* Notch */}
                <div className="absolute top-0 inset-x-0 h-5 bg-black rounded-b-xl w-32 mx-auto z-30 flex items-center justify-center">
                  <div className="w-12 h-1 bg-gray-800 rounded-full" />
                </div>

                {/* Screen Content */}
                <div className="w-full h-full bg-white rounded-[34px] overflow-hidden flex flex-col pt-4 text-gray-900">
                  {/* Top Bar */}
                  <div className="px-3.5 pt-2 pb-1.5 flex items-center justify-between border-b border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-md bg-[#E0332F] flex items-center justify-center">
                        <MapPin className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-xs font-black tracking-tight text-gray-900">bhookingo</span>
                    </div>
                    <Bell className="w-4 h-4 text-gray-600" />
                  </div>

                  {/* Search Bar */}
                  <div className="p-3">
                    <div className="bg-gray-100 rounded-xl px-3 py-2 flex items-center gap-2 text-gray-400 text-[11px]">
                      <Search className="w-3.5 h-3.5 text-gray-500" />
                      <span>Search your route or restaurant</span>
                    </div>
                  </div>

                  {/* Filter Badges */}
                  <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide text-[10px] font-bold">
                    <span className="bg-[#E0332F] text-white px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 shadow-sm">
                      <ShoppingBag className="w-3 h-3" /> Takeaway
                    </span>
                    <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                      <Utensils className="w-3 h-3" /> Dine-in
                    </span>
                    <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full shrink-0">Washrooms</span>
                    <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full shrink-0">EV Charging</span>
                    <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full shrink-0">Parking</span>
                  </div>

                  {/* Section Label */}
                  <div className="px-3 pt-1 pb-1.5 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-gray-900">Forward Restaurants on NH 48</span>
                    <span className="text-[#E0332F] font-bold text-[10px] cursor-pointer">Change Route</span>
                  </div>

                  {/* Restaurant List Cards */}
                  <div className="px-3 flex-1 overflow-y-auto space-y-2 pb-2">
                    {[
                      {
                        name: "Haldiram's",
                        dist: "2.4 km ahead",
                        rating: "4.6 ★ · 20–30 mins",
                        tag: "Takeaway",
                        tagRed: true,
                        img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=120&q=80"
                      },
                      {
                        name: "Amrik Sukhdev",
                        dist: "4.8 km ahead",
                        rating: "4.6 ★ · 20–40 mins",
                        tag: "Dine-in",
                        tagRed: false,
                        img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=120&q=80"
                      },
                      {
                        name: "Pind Balluchi",
                        dist: "12.3 km ahead",
                        rating: "4.3 ★ · 20–30 mins",
                        tag: "Takeaway",
                        tagRed: true,
                        img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=120&q=80"
                      }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-white border border-gray-150 rounded-xl p-2 flex items-center gap-2.5 shadow-sm">
                        <img src={item.img} alt={item.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px] text-gray-900 truncate">{item.name}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${item.tagRed ? 'bg-[#E0332F] text-white' : 'border border-amber-500 text-amber-600'}`}>
                              {item.tag}
                            </span>
                          </div>
                          <span className="text-[9px] text-gray-500 block">{item.dist}</span>
                          <span className="text-[9px] font-semibold text-gray-700">{item.rating}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom Navigation Bar */}
                  <div className="border-t border-gray-150 px-4 py-2 flex items-center justify-between text-gray-400">
                    <div className="flex flex-col items-center text-[#E0332F]">
                      <HomeIcon className="w-4 h-4" />
                      <span className="text-[8px] font-bold mt-0.5">Home</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Search className="w-4 h-4" />
                      <span className="text-[8px] font-medium mt-0.5">Search</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <OrdersIcon className="w-4 h-4" />
                      <span className="text-[8px] font-medium mt-0.5">Orders</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <User className="w-4 h-4" />
                      <span className="text-[8px] font-medium mt-0.5">Profile</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Desktop Floating Feature Cards Vertical Stack */}
            <div className="lg:col-span-3 hidden lg:flex flex-col gap-2.5 pl-4">
              {[
                { icon: MapPin, label: "Only Forward Restaurants" },
                { icon: Clock, label: "Save Time & Money" },
                { icon: Star, label: "Quality Food Every Time" },
                { icon: RestroomIcon, label: "Clean Washrooms Info" },
                { icon: Utensils, label: "Dine-in & Takeaway" },
                { icon: Zap, label: "EV Charging On Route" },
                { icon: ParkingIcon, label: "Parking Info Easy & Safe" }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white text-gray-900 rounded-full px-4 py-2.5 flex items-center gap-3 shadow-md hover:shadow-lg transition-all border border-gray-100 cursor-pointer hover:translate-x-1"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E0332F] to-[#B91C1C] flex items-center justify-center shrink-0 shadow-sm">
                    <item.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs font-bold text-gray-800 truncate">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Eyebrow */}
          <span className="text-xs font-black text-[#E0332F] uppercase tracking-widest block mb-2">
            HOW IT WORKS
          </span>
          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-12">
            Simple Steps for a <span className="text-[#E0332F]">Better Journey</span>
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
                <div key={idx} className="flex flex-col items-center text-center relative group">
                  {/* Icon Circle with Step Number Badge */}
                  <div className="relative mb-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFF0F0] to-[#FFEBEB] border-2 border-[#E0332F]/20 flex items-center justify-center text-[#E0332F] group-hover:scale-105 transition-transform shadow-sm">
                      <step.icon className="w-8 h-8 text-[#E0332F]" />
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#E0332F] text-white font-black text-xs flex items-center justify-center border-2 border-white shadow">
                      {step.num}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed max-w-xs">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Winding Road Graphic (Right 4 Cols) */}
            <div className="lg:col-span-4 flex justify-center py-6">
              <div className="relative w-full max-w-[280px] h-[340px] bg-gray-900 rounded-3xl p-4 border border-gray-800 shadow-xl flex flex-col justify-between overflow-hidden">
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
      <section id="features" className="py-16 md:py-24 bg-gray-50 border-t border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

            {/* Left Column: Why Bhookingo Comparison (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-black text-[#E0332F] uppercase tracking-widest block">
                WHY BHOOKINGO?
              </span>

              <div className="relative grid grid-cols-2 gap-3 pt-2">
                {/* VS Badge */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black text-white font-black text-xs flex items-center justify-center shadow-lg border-2 border-white">
                  VS
                </div>

                {/* Normal Highway Stop Card */}
                <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex flex-col">
                  <div className="bg-[#323535] text-white text-xs font-black px-3 py-3 text-center uppercase tracking-wider">
                    Normal Highway Stop
                  </div>
                  <div className="p-3.5 space-y-3 text-[11px] text-gray-600 flex-1">
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
                <div className="bg-white rounded-2xl overflow-hidden border border-emerald-200 shadow-md flex flex-col ring-1 ring-emerald-500/20">
                  <div className="bg-[#22C55E] text-white text-xs font-black px-3 py-3 text-center uppercase tracking-wider">
                    With Bhookingo
                  </div>
                  <div className="p-3.5 space-y-3 text-[11px] text-gray-800 font-medium flex-1 bg-emerald-50/20">
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
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
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
                  <div key={idx} className="bg-white rounded-2xl p-4 border border-gray-150 shadow-sm hover:shadow-md transition-all group">
                    <div className={`w-10 h-10 rounded-xl ${card.color} border flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xs`}>
                      <card.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 mb-1">
                      {card.title}
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
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
      <section className="bg-[#D70000] text-white py-6 shadow-inner">
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
                <span>🇮🇳</span> Made in India
              </span>
              <span className="text-xs font-medium text-white/90">For Indian Travelers</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CHOOSE YOUR WAY TO EXPLORE */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center justify-center gap-3">
              <span className="w-8 h-0.5 bg-[#E0332F] rounded-full hidden sm:block" />
              Choose Your Way to Explore
              <span className="w-8 h-0.5 bg-[#E0332F] rounded-full hidden sm:block" />
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* DRIVE MODE CARD (Vertical Image on Left) */}
            <div className="bg-[#FFF5F5] rounded-3xl border border-red-150 shadow-md relative overflow-hidden flex flex-col md:flex-row items-stretch">
              
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
                <div className="absolute top-4 right-4 bg-[#E0332F] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow">
                  RECOMMENDED
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-2xl font-black text-gray-900">Drive Mode</h3>
                    <span className="bg-[#E0332F]/10 text-[#E0332F] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border border-[#E0332F]/20">
                      Live Highway
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                    Real-time highway mode that shows only forward restaurants on your live route.
                  </p>

                  <div className="space-y-2.5 pt-1">
                    {[
                      "Works while you drive",
                      "Shows distance ahead",
                      "No need to search",
                      "Save fuel, time & effort"
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 text-xs font-bold text-gray-800">
                        <div className="w-4 h-4 rounded-full bg-[#E0332F] flex items-center justify-center shrink-0 shadow-xs">
                          <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleDriveModeClick}
                  className="mt-6 w-full bg-[#E0332F] hover:bg-[#c92824] text-white text-xs font-black uppercase tracking-wider py-3.5 rounded-2xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>Start Drive Mode</span>
                  <Navigation2 className="w-4 h-4 fill-white" />
                </button>
              </div>
            </div>

            {/* SEARCH MODE CARD (Vertical Restaurant Illustration on Right) */}
            <div className="bg-[#F4FBF7] rounded-3xl border border-emerald-150 shadow-md relative overflow-hidden flex flex-col md:flex-row items-stretch">
              
              {/* Left Content Column */}
              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-2xl font-black text-gray-900">Search Mode</h3>
                    <span className="bg-emerald-600/10 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border border-emerald-600/20">
                      Any Restaurant
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                    Search any restaurant by name, city or location.
                  </p>

                  <div className="space-y-2.5 pt-1">
                    {[
                      "Search by restaurant name",
                      "Explore restaurants in any city",
                      "View menu, ratings & more",
                      "Order takeaway or dine-in"
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 text-xs font-bold text-gray-800">
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
                  className="mt-6 w-full bg-white border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-black uppercase tracking-wider py-3.5 rounded-2xl shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2"
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
      <section className="bg-[#FFF0F0] py-10 border-t border-b border-red-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#E0332F] flex items-center justify-center shadow-md shadow-red-500/20 shrink-0 hidden sm:flex">
              <MapPin className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900">
                Hungry? Order Before You Arrive.
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-gray-600 mt-1">
                Save Time. Save Money. Eat Quality.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAuthClick}
              className="bg-black text-white px-5 py-2.5 rounded-xl text-left flex items-center gap-3 shadow-md hover:bg-gray-900 transition-colors"
            >
              <Smartphone className="w-6 h-6" />
              <div>
                <span className="text-[9px] uppercase tracking-wider block text-gray-400">GET IT ON</span>
                <span className="text-sm font-bold leading-none">Google Play</span>
              </div>
            </button>
            <button
              onClick={handleAuthClick}
              className="bg-black text-white px-5 py-2.5 rounded-xl text-left flex items-center gap-3 shadow-md hover:bg-gray-900 transition-colors"
            >
              <Globe className="w-6 h-6" />
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
