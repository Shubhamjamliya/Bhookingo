import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Search, ShoppingBag, Utensils, Car, MapPin, Navigation2, CheckCircle2, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    num: "01",
    icon: Search,
    title: "Search Your Route",
    desc: "Enter your starting point & destination. We calculate your exact highway corridor and show forward restaurants ahead.",
    badge: "AI Route Detection"
  },
  {
    num: "02",
    icon: ShoppingBag,
    title: "Order Before You Reach",
    desc: "Browse live digital menus, customize items, check live kitchen prep times, and pre-order for instant takeaway or dine-in.",
    badge: "Zero Wait Time"
  },
  {
    num: "03",
    icon: Utensils,
    title: "Pick Up or Dine-in",
    desc: "Arrive at the restaurant. Your freshly cooked food is packed and steaming or your reserved table is ready.",
    badge: "Fresh & Steaming"
  },
  {
    num: "04",
    icon: Car,
    title: "Continue Your Journey",
    desc: "Enjoy top-rated food, clean washroom amenities, save 30-45 minutes per stop, and hit the highway with joy.",
    badge: "Speed & Comfort"
  }
];

export default function HowItWorksSection() {
  const shouldReduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.18,
        delayChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 35, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <section id="how-it-works" className="py-20 md:py-28 relative overflow-hidden bg-gradient-to-b from-[#FCFAF7] via-white to-[#F9F6F1]">
      {/* Decorative highway background watermarks */}
      <div className="absolute -top-24 right-0 w-96 h-96 bg-red-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-50 px-4 py-1.5 text-xs font-extrabold uppercase text-[#E11D48]"
          >
            <Navigation2 className="w-3.5 h-3.5 fill-current" />
            <span>HOW BHOOKINGO WORKS</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Seamless Highway Dining in <span className="text-[#E11D48]">4 Simple Steps</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-slate-600 leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            No more wandering for unknown dhabas. Experience smart food-tech built specifically for Indian highways.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Interactive 4-Step Journey Grid (8 Cols) */}
          <div className="lg:col-span-8">
            {/* Desktop Connector Track Line */}
            <div className="relative">
              
              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10"
              >
                {STEPS.map((step, idx) => (
                  <motion.div
                    key={idx}
                    variants={cardVariants}
                    whileHover={{ y: -6, scale: 1.02 }}
                    className="relative group rounded-3xl border border-slate-200/80 bg-white p-7 shadow-[0_12px_35px_rgba(0,0,0,0.04)] transition-all hover:border-[#E11D48]/30 hover:shadow-[0_20px_45px_rgba(225,29,72,0.12)] flex flex-col justify-between"
                  >
                    {/* Top Step Number & Badge */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-50 to-red-100/70 border border-rose-200/60 flex items-center justify-center text-[#E11D48] group-hover:scale-110 group-hover:bg-[#E11D48] group-hover:text-white transition-all shadow-sm">
                          <step.icon className="w-6 h-6 transition-transform group-hover:rotate-6" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 group-hover:bg-rose-50 group-hover:text-[#E11D48] transition-colors">
                          {step.badge}
                        </span>
                        <span className="text-xl font-black text-slate-300 group-hover:text-[#E11D48] transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>
                          {step.num}
                        </span>
                      </div>
                    </div>

                    {/* Step Title & Desc */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#E11D48] transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>
                        {step.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                        {step.desc}
                      </p>
                    </div>

                    {/* Subtle bottom progress indicator */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400">
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Instant Sync</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 group-hover:text-[#E11D48] transition-all" />
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>

          {/* Right Column: Miniature Interactive Journey Map (4 Cols) */}
          <div className="lg:col-span-4 flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative w-full max-w-[320px] rounded-[32px] bg-[#140E0A] p-5 border border-white/15 shadow-2xl overflow-hidden text-white"
            >
              {/* Highway night atmosphere background */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#1E130E] via-[#140E0A] to-[#0A0705] -z-10" />

              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span className="text-xs font-extrabold tracking-wider uppercase text-slate-300">Live Highway Radar</span>
                </div>
                <span className="text-[10px] font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-800/40">
                  NH-48 Corridor
                </span>
              </div>

              {/* Animated Winding Highway Graphic */}
              <div className="relative h-[340px] my-3 flex flex-col justify-between py-2">
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 280 340" fill="none">
                  {/* Road Base */}
                  <path
                    d="M 50,320 C 200,270 230,190 140,150 C 60,110 90,40 220,20"
                    stroke="#2A201A"
                    strokeWidth="36"
                    strokeLinecap="round"
                  />
                  {/* Road Asphalt Center */}
                  <path
                    d="M 50,320 C 200,270 230,190 140,150 C 60,110 90,40 220,20"
                    stroke="#3F3027"
                    strokeWidth="30"
                    strokeLinecap="round"
                  />
                  {/* Road Dashed Markings */}
                  <path
                    d="M 50,320 C 200,270 230,190 140,150 C 60,110 90,40 220,20"
                    stroke="#F59E0B"
                    strokeWidth="2.5"
                    strokeDasharray="8 8"
                    strokeLinecap="round"
                    className={shouldReduceMotion ? "" : "animate-road-dash"}
                  />
                </svg>

                {/* Milestone 4: Start Location */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative z-10 flex items-center gap-2 bg-emerald-600/95 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-full shadow-lg border border-emerald-400/30 self-end cursor-pointer"
                >
                  <Navigation2 className="w-3.5 h-3.5 fill-white" />
                  <span>Start Journey • 0 km</span>
                </motion.div>

                {/* Milestone 3: Route Forward Verified */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative z-10 flex items-center gap-2 bg-[#E11D48] text-white text-[11px] font-extrabold px-3 py-1.5 rounded-full shadow-lg border border-rose-400/40 self-start cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 fill-white" />
                  <span>Only Forward Restaurants</span>
                </motion.div>

                {/* Milestone 2: Pre-order Ready Point */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative z-10 flex items-center gap-2 bg-amber-500 text-slate-950 text-[11px] font-black px-3 py-1.5 rounded-full shadow-lg border border-amber-300 self-center cursor-pointer"
                >
                  <Utensils className="w-3.5 h-3.5 text-slate-950" />
                  <span>Always Ahead of You • Km 45</span>
                </motion.div>

                {/* Milestone 1: Arrive & Pick up */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative z-10 flex items-center gap-2 bg-black/90 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-full shadow-lg border border-white/20 self-end cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Zero Wait Pick-Up</span>
                </motion.div>
              </div>

              {/* Bottom status badge */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <span>Estimated Time Saved:</span>
                <span className="font-bold text-emerald-400">+38 Mins / Stop</span>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
