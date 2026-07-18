import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, ArrowRight, ShieldCheck, Clock, Zap, Map } from 'lucide-react';
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import Lenis from 'lenis';
import api from "@food/api";

export default function MasterLandingPage() {
  const navigate = useNavigate();
  const [activeGastronomy, setActiveGastronomy] = useState(1);
  const [heroImageIndex, setHeroImageIndex] = useState(0);
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

  useEffect(() => {
    const authStatus = localStorage.getItem("user_authenticated");
    const token = localStorage.getItem("user_accessToken");
    if (authStatus === "true" && token) {
      navigate("/food/user", { replace: true });
    }
  }, [navigate]);

  const heroImages = [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1557872943-16a5ac26437e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Parallax setup
  const { scrollYProgress } = useScroll();
  const yParallaxMission = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const yParallaxMobile = useTransform(scrollYProgress, [0, 1], [0, 200]);

  // Mobile Section scroll animation setup
  const mobileSectionRef = useRef(null);
  const { scrollYProgress: mobileScrollYProgress } = useScroll({
    target: mobileSectionRef,
    offset: ["start end", "end start"]
  });

  const phoneRotateX = useTransform(mobileScrollYProgress, [0, 0.5, 1], [40, 5, -20]);
  const phoneRotateY = useTransform(mobileScrollYProgress, [0, 0.5, 1], [-30, 15, 30]);
  const phoneY = useTransform(mobileScrollYProgress, [0, 0.5, 1], [150, 0, -150]);
  const phoneScale = useTransform(mobileScrollYProgress, [0, 0.5, 1], [0.8, 1.05, 0.9]);

  // Spring config for smooth interpolation of scroll values
  const smoothRotateX = useSpring(phoneRotateX, { damping: 20, stiffness: 100 });
  const smoothRotateY = useSpring(phoneRotateY, { damping: 20, stiffness: 100 });
  const smoothY = useSpring(phoneY, { damping: 20, stiffness: 100 });
  const smoothScale = useSpring(phoneScale, { damping: 20, stiffness: 100 });

  return (
    <div className="min-h-screen bg-white font-['Inter',sans-serif] selection:bg-[#CB202D] selection:text-white overflow-x-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[110vh] md:min-h-screen lg:h-screen w-full bg-[#111] overflow-hidden flex flex-col">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.55] mix-blend-screen"
          style={{ backgroundImage: "url('/highway_road_bg.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-[#111] pointer-events-none" />

        <nav className="relative z-10 w-full bg-white border-b border-gray-200 shadow-sm mt-4 md:mt-0">
          <div className="w-full px-6 py-2 flex items-center justify-between max-w-[1440px] mx-auto">
            <Link to="/" className="flex items-center">
              <img src="/bhookingo-logo-transparent.png" alt="Bhookingo" className="h-10 md:h-12 object-contain" />
            </Link>
            <div className="flex items-center">
              <Link to="/user/auth/login" className="bg-[#CB202D] hover:bg-[#A31621] text-white text-[10px] md:text-[13px] font-bold uppercase tracking-widest px-3 md:px-6 py-1.5 md:py-2.5 rounded shadow-lg transition-all active:scale-95 whitespace-nowrap">
                Login / Sign Up
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-center lg:justify-between px-6 md:px-16 max-w-[1440px] mx-auto w-full mb-8 lg:mb-12 gap-8 lg:gap-12 mt-8 lg:mt-0">

          {/* Left Text Content */}
          <div className="w-full lg:w-[55%] flex flex-col justify-center items-start">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              className="inline-block px-3 py-1 bg-[#CB202D] text-white text-[9px] font-bold uppercase tracking-widest w-fit mb-4 rounded-sm shadow-[0_0_15px_rgba(203,32,45,0.4)]"
            >
              Excellence in Highway Dining
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="text-4xl md:text-6xl lg:text-[72px] font-black text-white leading-[1.05] tracking-tight max-w-4xl uppercase" style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Empowering <span className="text-[#CB202D]">Travelers</span>,<br />
              Restoring Taste.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="mt-6 text-sm md:text-base text-white/80 max-w-2xl font-medium leading-relaxed"
            >
              Bhookingo redefines your road-trip dining. From gourmet rest stops to predictive order management, we ensure every mile leaves an epicurean mark.
            </motion.p>
          </div>

          {/* Right Floating Composition */}
          <div className="flex w-full lg:w-[45%] justify-center relative items-center h-full mt-10 lg:mt-0 min-h-[300px] lg:min-h-0">
            <div className="relative w-full max-w-[280px] md:max-w-[450px] aspect-square">

              {/* Main Floating Dish */}
              <motion.div
                animate={{ y: [-3, 3, -3] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="absolute inset-0 z-10 flex items-center justify-center"
              >
                <div className="relative w-56 h-56 md:w-80 md:h-80 rounded-full p-1.5 md:p-2 bg-gradient-to-tr from-[#CB202D] to-[#ff4d5a] shadow-[0_0_60px_rgba(203,32,45,0.25)]">
                  <div className="w-full h-full rounded-full border-[6px] border-[#0A0A0E] relative overflow-hidden bg-[#0A0A0E]">
                    <AnimatePresence>
                      <motion.img
                        key={heroImageIndex}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        src={heroImages[heroImageIndex]}
                        alt="Premium Highway Meal"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>

              {/* Floating Badge 1 - Restaurants */}
              <motion.div
                animate={{ y: [-8, 8, -8] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                className="absolute top-4 -right-4 md:top-10 md:right-4 z-20 bg-black/60 backdrop-blur-md border border-white/10 p-2 md:p-3.5 rounded-xl md:rounded-2xl shadow-2xl flex items-center gap-2 md:gap-3 scale-85 md:scale-100 origin-right"
              >
                <div className="bg-[#CB202D] text-white p-2 md:p-2.5 rounded-full flex items-center justify-center text-xs md:text-sm shadow-[0_0_15px_rgba(203,32,45,0.5)]">
                  🍽️
                </div>
                <div>
                  <div className="text-white text-xs md:text-sm font-black tracking-wide">Premium Takeaway </div>
                  <div className="text-gray-400 text-[8px] md:text-[10px] font-bold uppercase tracking-widest mt-0.5">For Highway</div>
                </div>
              </motion.div>

              {/* Floating Badge 2 - Distance */}
              <motion.div
                animate={{ y: [10, -10, 10] }}
                transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 2 }}
                className="absolute bottom-4 -left-4 md:bottom-16 md:left-0 z-20 bg-black/60 backdrop-blur-md border border-white/10 p-2 md:p-3.5 rounded-xl md:rounded-2xl shadow-2xl flex items-center gap-2 md:gap-3 scale-85 md:scale-100 origin-left"
              >
                <div className="bg-[#10B981] text-white p-2 md:p-2.5 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <MapPin className="w-3 h-3 md:w-4 md:h-4" />
                </div>
                <div>
                  <div className="text-white text-xs md:text-sm font-black tracking-wide">Up to 45 KM</div>
                  <div className="text-gray-400 text-[8px] md:text-[10px] font-bold uppercase tracking-widest mt-0.5">Restaurant Discovery</div>
                </div>
              </motion.div>

            </div>
          </div>

        </div>
      </section>


      {/* 2. THE MISSION SECTION */}
      <section className="py-24 px-6 bg-white w-full max-w-[1440px] mx-auto flex flex-col md:flex-row items-center gap-16 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full md:w-1/2"
        >
          <span className="text-[10px] font-bold text-[#CB202D] uppercase tracking-widest mb-3 block">The Mission</span>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 uppercase" style={{ fontFamily: "'Outfit', sans-serif" }}>
            What is <span className="text-[#CB202D]">Bhookingo?</span>
          </h2>
          <p className="text-gray-500 font-medium leading-relaxed mb-6 text-sm md:text-base">
            Bhookingo is a next-generation food discovery platform built to elevate your highway dining experience. Whether you're craving a quick takeaway or a relaxing dine-in meal, we seamlessly connect you with premium restaurants right on your route.
          </p>

          <div className="flex gap-4 mb-6">
            <div className="bg-gray-50 p-6 border-l-2 border-[#CB202D] flex-1">
              <div className="text-4xl font-black text-[#CB202D] mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>45 KM</div>
              <div className="text-[9px] font-bold text-gray-900 uppercase tracking-widest">Search Radius</div>
            </div>
            <div className="bg-gray-50 p-6 border-l-2 border-gray-900 flex-1">
              <div className="text-4xl font-black text-gray-900 mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>100%</div>
              <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Dine-in & Takeaway</div>
            </div>
          </div>

        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="w-full md:w-1/2 relative h-[350px] md:h-[450px]"
        >
          <motion.img style={{ y: yParallaxMission }} src="/premium_highway_restaurant.png" alt="Highway Restaurant" className="absolute top-0 right-0 w-[80%] h-[250px] md:h-[300px] object-cover rounded shadow-2xl z-10 hover:scale-[1.02] transition-all duration-500" />
          <motion.img style={{ y: yParallaxMobile }} src="https://images.unsplash.com/photo-1600891964092-4316c288032e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Plated dish" className="absolute bottom-0 left-0 w-[65%] h-[200px] md:h-[240px] object-cover rounded shadow-2xl border-[8px] md:border-[12px] border-white z-20 hover:scale-[1.02] transition-all duration-500" />
        </motion.div>
      </section>

      {/* 3. MOBILE EXPERIENCE SECTION */}
      <section ref={mobileSectionRef} className="py-24 bg-[#F8F9FA] relative overflow-hidden">
        <div className="w-full max-w-[1440px] mx-auto px-6 flex flex-col md:flex-row items-center gap-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="w-full md:w-1/2 flex justify-center relative"
          >
            {/* Phone Mockup 3D Container */}
            <div style={{ perspective: 1000 }} className="relative z-20">
              <motion.div
                style={{
                  rotateX: smoothRotateX,
                  rotateY: smoothRotateY,
                  y: smoothY,
                  scale: smoothScale
                }}
                className="w-[280px] sm:w-[300px] h-[560px] sm:h-[600px] bg-white rounded-[40px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border-[8px] sm:border-[12px] border-gray-900 overflow-hidden relative flex flex-col cursor-pointer"
              >
                {/* Notch */}
                <div className="absolute top-0 inset-x-0 h-7 bg-gray-900 rounded-b-3xl w-28 sm:w-32 mx-auto z-20 shadow-md"></div>
                {/* App UI */}
                <div className="flex-1 bg-white p-5 pt-14 flex flex-col gap-4 relative">
                  <div className="overflow-hidden rounded-[20px] shadow-sm">
                    <motion.img
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.8 }}
                      src="https://images.unsplash.com/photo-1579871494447-9811cf80d66c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"
                      className="w-full h-48 sm:h-56 object-cover"
                      alt="Sushi"
                    />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-xl tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>Sushi Masterclass</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Japanese • 4.9 ★</p>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold mt-2 pb-4 border-b border-gray-100">
                    <span className="text-[#CB202D] uppercase tracking-wider text-[10px] animate-pulse">In Route</span>
                    <span className="text-gray-900 uppercase tracking-wider text-[10px]">14 mins</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: "#CB202D" }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-[#111] text-white text-[10px] font-bold uppercase tracking-widest py-4 rounded-xl mt-auto mb-2 shadow-lg transition-colors"
                  >
                    Track Delivery
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
            }}
            className="w-full md:w-1/2"
          >
            <motion.span variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } }} className="text-[10px] font-bold text-[#CB202D] uppercase tracking-widest mb-3 block">Mobile Experience</motion.span>
            <motion.h2 variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } }} className="text-4xl md:text-5xl font-black text-gray-900 mb-6 uppercase leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Flawless from <br />Tap to Table.
            </motion.h2>
            <motion.p variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } }} className="text-gray-500 font-medium leading-relaxed mb-10 text-sm md:text-base max-w-lg">
              Browse digital menus, reserve your table, and place dine-in or takeaway orders in seconds. Designed to make every restaurant visit faster, smoother, and more enjoyable.
            </motion.p>

            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="flex flex-wrap gap-4">
              <motion.button
                whileHover={{ scale: 1.05, y: -5, boxShadow: "0px 15px 25px rgba(0,0,0,0.15)" }}
                whileTap={{ scale: 0.95 }}
                className="bg-[#111] text-white flex items-center gap-3 px-6 py-3.5 rounded transition-all shadow-xl"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.8 16.32 3.98 9.58 8.1 9.28c1.37.1 2.2.78 3.03.8.84-.02 1.86-.8 3.42-.65 1.64.16 2.82.88 3.5 1.95-3.22 1.88-2.69 6.08.28 7.3-.7 1.76-1.52 3.48-3.28 3.6zM12.03 9.25c-.15-2.23 1.66-4.14 3.75-4.25.2 2.52-2.1 4.54-3.75 4.25z" /></svg>
                <div className="flex flex-col items-start">
                  <span className="text-[8px] uppercase tracking-wider text-gray-400 font-bold">Download on the</span>
                  <span className="text-sm font-bold leading-none mt-0.5">App Store</span>
                </div>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -5, boxShadow: "0px 15px 25px rgba(0,0,0,0.1)" }}
                whileTap={{ scale: 0.95 }}
                className="bg-white border border-gray-200 text-gray-900 flex items-center gap-3 px-6 py-3.5 rounded transition-all shadow-lg"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" /></svg>
                <div className="flex flex-col items-start">
                  <span className="text-[8px] uppercase tracking-wider text-gray-500 font-bold">Get it on</span>
                  <span className="text-sm font-bold leading-none mt-0.5">Google Play</span>
                </div>
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 4. MIDNIGHT GASTRONOMY SECTION */}
      <section className="py-24 relative overflow-hidden min-h-[700px] flex items-center" style={{ background: 'radial-gradient(circle at center, #2e0915 0%, #150308 50%, #0a0003 100%)' }}>

        <style>
          {`
            @keyframes floatImage {
              0% { transform: translateY(0px); }
              50% { transform: translateY(-20px); }
              100% { transform: translateY(0px); }
            }
          `}
        </style>

        <div className="w-full max-w-[1440px] mx-auto px-6 relative z-10 flex flex-col lg:flex-row items-center gap-12">

          {/* Left Menu Column */}
          <div className="w-full lg:w-[45%] flex flex-col gap-6">

            {/* Item 1 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6 }}
              className={`flex items-start gap-6 cursor-pointer transition-all duration-500 rounded-2xl ${activeGastronomy === 1 ? 'bg-black/30 p-6 border-l-4 border-[#CB202D]' : 'p-4 hover:bg-white/5 opacity-60 hover:opacity-100'}`}
              onClick={() => setActiveGastronomy(1)}
            >
              <div className="text-xl md:text-3xl font-black text-white/50" style={{ fontFamily: "'Outfit', sans-serif" }}>01</div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-[#3a0d1e] text-[#f27a44] text-[9px] font-bold px-2 py-1 uppercase tracking-wider rounded border border-[#f27a44]/30">🔥 Bestseller</span>
                  <span className="text-gray-400 text-[10px] font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> 15-20 min</span>
                </div>
                <h3 className="font-black text-2xl md:text-3xl text-white mb-3 tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>Midnight Wagyu Burger</h3>

                <div className={`overflow-hidden transition-all duration-500 ${activeGastronomy === 1 ? 'max-h-[600px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}>
                  <p className="text-xs md:text-sm text-gray-400 font-medium leading-relaxed mb-4 pr-4">
                    Double-patty dry-aged Wagyu beef, aged cheddar melt, caramelized onion jam, and truffle aioli on toasted brioche.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-[#240a13] text-[#e0e0e0] text-[9px] font-bold px-3 py-1.5 rounded-full border border-white/5">🧀 Cheddar</span>
                    <span className="bg-[#240a13] text-[#e0e0e0] text-[9px] font-bold px-3 py-1.5 rounded-full border border-white/5">🧅 Onion Jam</span>
                    <span className="bg-[#240a13] text-[#e0e0e0] text-[9px] font-bold px-3 py-1.5 rounded-full border border-white/5">🍞 Brioche</span>
                    <span className="bg-[#240a13] text-[#e0e0e0] text-[9px] font-bold px-3 py-1.5 rounded-full border border-white/5">🍄 Truffle</span>
                  </div>
                  <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Wagyu Burger" className="w-full h-48 object-cover rounded-xl shadow-lg border border-white/10 lg:hidden block" />
                </div>
              </div>
            </motion.div>

            {/* Item 2 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className={`flex items-start gap-6 cursor-pointer transition-all duration-500 rounded-2xl ${activeGastronomy === 2 ? 'bg-black/30 p-6 border-l-4 border-[#CB202D]' : 'p-4 hover:bg-white/5 opacity-60 hover:opacity-100'}`}
              onClick={() => setActiveGastronomy(2)}
            >
              <div className="text-xl md:text-3xl font-black text-white/50" style={{ fontFamily: "'Outfit', sans-serif" }}>02</div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-transparent text-[#e0e0e0] text-[9px] font-bold px-2 py-1 uppercase tracking-wider rounded border border-white/20">✨ Chef's Special</span>
                  <span className="text-gray-400 text-[10px] font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> 20-30 min</span>
                </div>
                <h3 className="font-black text-2xl md:text-3xl text-white tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>Spicy Tonkotsu Ramen</h3>

                <div className={`overflow-hidden transition-all duration-500 ${activeGastronomy === 2 ? 'max-h-[600px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}>
                  <p className="text-xs md:text-sm text-gray-400 font-medium leading-relaxed mb-4 pr-4">
                    12-hour pork bone broth, handmade artisan noodles, perfectly soft-boiled egg, and our signature spicy tare blend.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-[#240a13] text-[#e0e0e0] text-[9px] font-bold px-3 py-1.5 rounded-full border border-white/5">🍜 Handmade Noodles</span>
                    <span className="bg-[#240a13] text-[#e0e0e0] text-[9px] font-bold px-3 py-1.5 rounded-full border border-white/5">🥚 Soft-boiled Egg</span>
                  </div>
                  <img src="https://images.unsplash.com/photo-1557872943-16a5ac26437e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Tonkotsu Ramen" className="w-full h-48 object-cover rounded-xl shadow-lg border border-white/10 lg:hidden block" />
                </div>
              </div>
            </motion.div>

            {/* Item 3 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={`flex items-start gap-6 cursor-pointer transition-all duration-500 rounded-2xl ${activeGastronomy === 3 ? 'bg-black/30 p-6 border-l-4 border-[#CB202D]' : 'p-4 hover:bg-white/5 opacity-60 hover:opacity-100'}`}
              onClick={() => setActiveGastronomy(3)}
            >
              <div className="text-xl md:text-3xl font-black text-white/50" style={{ fontFamily: "'Outfit', sans-serif" }}>03</div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-transparent text-[#e0e0e0] text-[9px] font-bold px-2 py-1 uppercase tracking-wider rounded border border-white/20">🌟 Late Night Exclusive</span>
                  <span className="text-gray-400 text-[10px] font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> 10-15 min</span>
                </div>
                <h3 className="font-black text-2xl md:text-3xl text-white tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>Signature Loaded Fries</h3>

                <div className={`overflow-hidden transition-all duration-500 ${activeGastronomy === 3 ? 'max-h-[600px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}`}>
                  <p className="text-xs md:text-sm text-gray-400 font-medium leading-relaxed mb-4 pr-4">
                    Crispy skin-on fries smothered in house cheese sauce, topped with green onions and smoky bacon crumbles.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-[#240a13] text-[#e0e0e0] text-[9px] font-bold px-3 py-1.5 rounded-full border border-white/5">🍟 Crispy Fries</span>
                    <span className="bg-[#240a13] text-[#e0e0e0] text-[9px] font-bold px-3 py-1.5 rounded-full border border-white/5">🥓 Bacon</span>
                  </div>
                  <img src="https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Loaded Fries" className="w-full h-48 object-cover rounded-xl shadow-lg border border-white/10 lg:hidden block" />
                </div>
              </div>
            </motion.div>

          </div>

          {/* Right Image Column (Desktop Only) */}
          <div className="hidden lg:flex w-full lg:w-[55%] justify-center lg:justify-end relative h-[400px] md:h-[500px] lg:h-[650px] items-center">

            {/* Floating Image Container */}
            <div
              className="relative w-full max-w-[400px] md:max-w-[500px] lg:max-w-[700px] h-[300px] md:h-[400px] lg:h-[500px] flex shrink-0 lg:translate-x-8 group rounded-3xl overflow-hidden shadow-2xl border-[12px] border-black"
              style={{ animation: 'floatImage 6s ease-in-out infinite' }}
            >

              {/* Image 1 */}
              <img
                src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
                alt="Wagyu Burger"
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${activeGastronomy === 1 ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-8 scale-95'}`}
              />

              {/* Image 2 */}
              <img
                src="https://images.unsplash.com/photo-1557872943-16a5ac26437e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
                alt="Tonkotsu Ramen"
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${activeGastronomy === 2 ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-8 scale-95'}`}
              />

              {/* Image 3 */}
              <img
                src="https://images.unsplash.com/photo-1585109649139-366815a0d713?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
                alt="Loaded Fries"
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${activeGastronomy === 3 ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-8 scale-95'}`}
              />

            </div>

          </div>

        </div>
      </section>

      {/* 5. PRECISION LOGISTICS SECTION */}
      <section className="py-24 bg-white">
        <div className="w-full max-w-[1440px] mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
          <div className="w-full md:w-1/2">
            <span className="text-[10px] font-bold text-[#CB202D] uppercase tracking-widest mb-3 block">Seamless Highway Dining</span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 uppercase leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Discover. <br />
              <span className="text-[#CB202D] italic">Pre-Order. Enjoy.</span>
            </h2>
            <p className="text-gray-500 font-medium leading-relaxed mb-10 text-sm md:text-base max-w-lg">
              Find the best highway restaurants on your route. Browse menus in advance and pre-order your meals for a quick takeaway or a relaxing dine-in experience, saving you valuable travel time.
            </p>
          </div>

          <div className="w-full md:w-1/2">
            <div className="bg-[#0A0A0E] rounded-3xl p-6 shadow-2xl relative overflow-hidden border border-gray-900 min-h-[450px] flex items-center justify-center">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#CB202D 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
              <div className="relative z-10 w-full max-w-sm mx-auto">
                {/* Digital Order Header */}
                <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></div>
                    <span className="text-[9px] font-bold text-[#10B981] uppercase tracking-widest">Active Pre-Order</span>
                  </div>
                  <span className="text-[9px] text-gray-500 font-bold tracking-widest uppercase">SYNC // 12</span>
                </div>

                {/* Order Status Widget */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-2xl relative">

                  {/* Decorative corner accents */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/20 rounded-tl-xl"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/20 rounded-br-xl"></div>

                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-white font-black text-xl mb-1 tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>Order #842</h3>
                      <p className="text-gray-400 text-xs font-medium">Takeaway • Ready in 15m</p>
                    </div>
                    <div className="bg-[#CB202D]/20 text-[#CB202D] px-3 py-1.5 rounded text-[9px] font-bold tracking-widest uppercase border border-[#CB202D]/30 shadow-[0_0_15px_rgba(203,32,45,0.2)]">
                      Preparing
                    </div>
                  </div>

                  <div className="space-y-5 mb-8">
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex justify-between items-center text-sm"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500 font-mono text-xs">1x</span>
                        <span className="text-gray-200 font-semibold tracking-wide">Midnight Wagyu Burger</span>
                      </div>
                      <span className="text-gray-400 font-mono text-xs">₹450</span>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex justify-between items-center text-sm"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500 font-mono text-xs">2x</span>
                        <span className="text-gray-200 font-semibold tracking-wide">Loaded Fries</span>
                      </div>
                      <span className="text-gray-400 font-mono text-xs">₹300</span>
                    </motion.div>
                    <div className="border-t border-white/10 pt-5 flex justify-between items-center">
                      <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Total</span>
                      <span className="text-white font-bold font-mono tracking-wide">₹750</span>
                    </div>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#CB202D] to-[#ff4d5a]"
                      initial={{ width: "0%" }}
                      whileInView={{ width: "65%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.6 }}
                    />
                  </div>
                  <div className="mt-3 flex justify-between text-[9px] font-bold tracking-widest uppercase text-gray-500">
                    <span>Placed</span>
                    <span className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">Kitchen</span>
                    <span>Ready</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="bg-white text-gray-500 py-16 px-6 border-t border-gray-200">
        <div className="w-full max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="col-span-1">
            <img
              src="/bhookingo-logo-transparent.png"
              alt="Bhookingo"
              className="h-10 md:h-14 mb-6 object-contain drop-shadow-sm"
            />
            <p className="text-[10px] font-medium leading-relaxed max-w-xs mb-6">
              Pioneering the dining experience. Flawless food delivery for those who expect more on the road.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="https://play.google.com/store/apps/details?id=com.bhookingo.user" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity block">
                <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" className="h-9 md:h-10 object-contain" />
              </a>
              <a href="#" className="hover:opacity-80 transition-opacity block">
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="Download on the App Store" className="h-9 md:h-10 object-contain" />
              </a>
            </div>
          </div>

          <div className="col-span-1">
            <h5 className="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-5">Legal</h5>
            <ul className="space-y-3">
              <li><Link to="/user/profile/privacy" className="text-xs font-medium hover:text-[#CB202D] transition-colors">Privacy Policy</Link></li>
              <li><Link to="/user/profile/terms" className="text-xs font-medium hover:text-[#CB202D] transition-colors">Terms of Service</Link></li>
              <li><a href="#" className="text-xs font-medium hover:text-[#CB202D] transition-colors">Support</a></li>
            </ul>
          </div>

          <div className="col-span-1">
            <h5 className="text-[10px] font-bold text-gray-900 uppercase tracking-widest mb-5">Contact</h5>
            <ul className="space-y-3">
              <li className="text-xs font-medium"><a href={`mailto:${contactInfo.email}`} className="hover:text-[#CB202D] transition-colors">{contactInfo.email}</a></li>
              <li className="text-xs font-medium"><a href={`tel:${contactInfo.mobile}`} className="hover:text-[#CB202D] transition-colors">{contactInfo.mobile}</a></li>
            </ul>
          </div>
        </div>

        <div className="w-full max-w-[1440px] mx-auto mt-16 pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between">
          <p className="text-[9px] uppercase tracking-widest font-bold text-gray-400">&copy; 2026 Bhookingo India Pvt Ltd.</p>
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div>
            <span className="text-[9px] uppercase tracking-widest font-bold text-[#10B981]">System Health: 100% Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
