import React from 'react';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import { MapPin, Clock, Star, Zap, Utensils, CreditCard, ParkingCircle, ShieldCheck, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FeaturesPage() {
  const navigate = useNavigate();

  const featuresList = [
    {
      icon: MapPin,
      title: "Forward-Only Highway Restaurants",
      desc: "Our intelligent route mapping technology filters out restaurants behind you or far off route. You only see options directly ahead on your travel path.",
      color: "bg-red-50 text-[#E0332F]"
    },
    {
      icon: Clock,
      title: "Pre-Ordering & Zero Wait Time",
      desc: "Order takeaway or reserve dine-in before arrival. Food is ready the moment you step out of your vehicle.",
      color: "bg-blue-50 text-blue-600"
    },
    {
      icon: Utensils,
      title: "Verified Hygiene & Food Quality",
      desc: "All onboarded highway restaurants undergo strict hygiene checks and customer rating audits for total peace of mind.",
      color: "bg-emerald-50 text-emerald-600"
    },
    {
      icon: ShieldCheck,
      title: "Clean Washrooms Information",
      desc: "View verified washroom photos, clean ratings, and facility availability before deciding where to stop.",
      color: "bg-gray-100 text-gray-700"
    },
    {
      icon: ParkingCircle,
      title: "Spacious & Safe Parking Details",
      desc: "Get real information on parking capacity, security, and accessibility for cars, buses, and EVs.",
      color: "bg-amber-50 text-amber-600"
    },
    {
      icon: Zap,
      title: "EV Charging Stations On Route",
      desc: "Locate charging hubs along highways so you can charge your electric vehicle while enjoying your meal.",
      color: "bg-purple-50 text-purple-600"
    },
    {
      icon: Star,
      title: "Real Highway Traveler Reviews",
      desc: "Read genuine feedback and dish recommendations from fellow highway road-trippers.",
      color: "bg-yellow-50 text-yellow-600"
    },
    {
      icon: CreditCard,
      title: "Multiple Secure Payment Modes",
      desc: "Seamlessly pay online via UPI, Credit/Debit Cards, Net Banking, or digital wallets.",
      color: "bg-indigo-50 text-indigo-600"
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900 selection:bg-[#E0332F] selection:text-white">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white py-16 md:py-24 text-center px-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <span className="text-xs font-black text-[#E0332F] uppercase tracking-widest bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/20">
              PLATFORM FEATURES
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              Everything You Need on the <span className="text-[#E0332F]">Highway</span>
            </h1>
            <p className="text-gray-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              Explore the rich set of features engineered specifically for Indian highway travelers and road-trippers.
            </p>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-16 md:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuresList.map((f, idx) => (
                <div key={idx} className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className={`w-12 h-12 rounded-2xl ${f.color} flex items-center justify-center shadow-xs`}>
                      <f.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">{f.title}</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">{f.desc}</p>
                  </div>
                  <div className="pt-4">
                    <button
                      onClick={() => navigate('/food/user')}
                      className="text-xs font-bold text-[#E0332F] hover:underline flex items-center gap-1"
                    >
                      <span>Explore</span> →
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
