import React from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  MapPin,
  Utensils,
  Zap,
  Star,
  CreditCard,
  Layers,
  Sparkles
} from 'lucide-react';
import { RestroomIcon, ParkingIcon } from './FloatingFeatureCards';

const FEATURES = [
  {
    icon: ShoppingBag,
    title: "Takeaway & Dine-in",
    desc: "Pre-order piping hot food for fast highway takeaway or reserve your dining table ahead.",
    badge: "Fast Ordering",
    theme: "text-[#E11D48] bg-rose-50 border-rose-200/70"
  },
  {
    icon: MapPin,
    title: "Forward Restaurants Only",
    desc: "Smart route algorithms display only verified restaurants directly ahead in your travel direction.",
    badge: "Smart Filter",
    theme: "text-amber-600 bg-amber-50 border-amber-200/70"
  },
  {
    icon: RestroomIcon,
    title: "Verified Washroom Ratings",
    desc: "Detailed hygiene score, cleanliness ratings, and authentic traveler photos before stopping.",
    badge: "Hygiene First",
    theme: "text-blue-600 bg-blue-50 border-blue-200/70"
  },
  {
    icon: Utensils,
    title: "Verified Food Quality",
    desc: "Every listed restaurant is vetted for food safety standards, kitchen hygiene, and taste consistency.",
    badge: "100% Vetted",
    theme: "text-emerald-600 bg-emerald-50 border-emerald-200/70"
  },
  {
    icon: ParkingIcon,
    title: "Safe Parking Information",
    desc: "Know parking capacity, security, and whether large SUV/bus parking is available before you pull in.",
    badge: "Easy Parking",
    theme: "text-indigo-600 bg-indigo-50 border-indigo-200/70"
  },
  {
    icon: Zap,
    title: "EV Fast Charging On Route",
    desc: "Locate active electric vehicle charging points right at dining stops so you eat while you charge.",
    badge: "Green Travel",
    theme: "text-teal-600 bg-teal-50 border-teal-200/70"
  },
  {
    icon: Star,
    title: "Real Highway Reviews",
    desc: "Unbiased feedback, dish recommendations, and tips left exclusively by highway motorists.",
    badge: "Motorist Rated",
    theme: "text-orange-500 bg-orange-50 border-orange-200/70"
  },
  {
    icon: CreditCard,
    title: "Seamless Digital Payments",
    desc: "Pay securely with instant UPI, Cards, NetBanking or Wallets with transparent digital receipts.",
    badge: "100% Secure",
    theme: "text-purple-600 bg-purple-50 border-purple-200/70"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
};

export default function FeaturesGridSection() {
  return (
    <section id="features" className="py-20 md:py-28 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-50 px-4 py-1.5 text-xs font-extrabold uppercase text-[#E11D48]"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>COMPREHENSIVE HIGHWAY AMENITIES</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Everything You Need in <span className="text-[#E11D48]">One Highway App</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-slate-600 leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Engineered from ground up to solve real roadside problems with precision technology.
          </motion.p>
        </div>

        {/* Feature Cards Staggered Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {FEATURES.map((feature, idx) => (
            <motion.div
              key={idx}
              variants={cardVariants}
              whileHover={{ y: -8, scale: 1.02 }}
              className="relative group rounded-3xl border border-slate-200/80 bg-[#FCFAF8] p-6 shadow-sm transition-all hover:bg-white hover:border-[#E11D48]/30 hover:shadow-[0_20px_40px_rgba(225,29,72,0.1)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl ${feature.theme} border flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-200/60 text-slate-700 group-hover:bg-rose-50 group-hover:text-[#E11D48] transition-colors">
                    {feature.badge}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-[#E11D48] transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>
                  {feature.title}
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                  {feature.desc}
                </p>
              </div>

              {/* Bottom Subtle Accent */}
              <div className="mt-5 pt-3 border-t border-slate-200/60 flex items-center text-[11px] font-bold text-slate-400 group-hover:text-[#E11D48] transition-colors">
                <span>Explore Feature &rarr;</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
