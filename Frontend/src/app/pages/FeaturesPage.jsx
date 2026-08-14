import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Star,
  Zap,
  Utensils,
  CreditCard,
  ParkingCircle,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';

export default function FeaturesPage() {
  const navigate = useNavigate();

  const featuresList = [
    {
      icon: MapPin,
      title: "Forward-Only Highway Restaurants",
      desc: "Our route-aware discovery shows restaurants that are actually ahead of you, not behind you or far off your highway path.",
      color: "bg-red-50 text-[#E0332F]"
    },
    {
      icon: Clock,
      title: "Pre-Ordering and Zero Wait Time",
      desc: "Place your order before arrival so your stop feels planned, faster, and far more convenient during long journeys.",
      color: "bg-blue-50 text-blue-600"
    },
    {
      icon: Utensils,
      title: "Verified Hygiene and Food Quality",
      desc: "Partner restaurants are presented with quality expectations in mind so travelers can choose with more confidence.",
      color: "bg-emerald-50 text-emerald-600"
    },
    {
      icon: ShieldCheck,
      title: "Clean Washroom Information",
      desc: "See facility details before you stop, including washroom availability and comfort-focused travel essentials.",
      color: "bg-gray-100 text-gray-700"
    },
    {
      icon: ParkingCircle,
      title: "Parking and Accessibility Details",
      desc: "Know whether a stop is practical for cars, family travel, and larger highway vehicles before you reach it.",
      color: "bg-amber-50 text-amber-600"
    },
    {
      icon: Zap,
      title: "EV Charging on Route",
      desc: "Find charging-friendly stops that let you combine meals, breaks, and vehicle charging in one halt.",
      color: "bg-purple-50 text-purple-600"
    },
    {
      icon: Star,
      title: "Real Traveler Reviews",
      desc: "Read practical feedback from other highway users to decide where to stop with less guesswork.",
      color: "bg-yellow-50 text-yellow-600"
    },
    {
      icon: CreditCard,
      title: "Multiple Secure Payment Modes",
      desc: "Support for modern digital payments helps checkout feel familiar, quick, and trustworthy.",
      color: "bg-indigo-50 text-indigo-600"
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900 selection:bg-[#E0332F] selection:text-white">
      <LandingHeader />

      <main className="flex-1">
        <section className="bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white py-16 md:py-24 text-center px-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <span className="text-xs font-black text-[#E0332F] uppercase tracking-widest bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/20">
              PLATFORM FEATURES
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              Everything You Need on the <span className="text-[#E0332F]">Highway</span>
            </h1>
            <p className="text-gray-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              Explore the features that make Bhookingo more useful for real highway travel, planned stops, and faster food decisions.
            </p>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuresList.map((feature, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className={`w-12 h-12 rounded-2xl ${feature.color} flex items-center justify-center shadow-xs`}>
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">{feature.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
                  </div>
                  <div className="pt-4">
                    <button
                      onClick={() => navigate('/user/auth/login')}
                      className="text-sm font-bold text-[#E0332F] hover:underline flex items-center gap-1"
                    >
                      <span>Explore</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
