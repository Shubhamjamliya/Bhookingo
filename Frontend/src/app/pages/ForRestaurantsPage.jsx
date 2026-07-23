import React from 'react';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import { Building2, TrendingUp, Users, Smartphone, ShieldCheck, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ForRestaurantsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900 selection:bg-[#E0332F] selection:text-white">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white py-16 md:py-24 text-center px-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <span className="text-xs font-black text-[#E0332F] uppercase tracking-widest bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/20">
              PARTNER WITH BHOOKINGO
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              Grow Your <span className="text-[#E0332F]">Highway Restaurant</span> Business
            </h1>
            <p className="text-gray-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              Connect directly with thousands of daily highway travelers and road-trippers passing by your outlet. Boost orders and reduce table turnaround time.
            </p>
            <div className="pt-4 flex justify-center gap-4">
              <button
                onClick={() => navigate('/food/restaurant/onboarding')}
                className="bg-[#E0332F] hover:bg-[#c92824] text-white text-xs font-black uppercase tracking-wider px-8 py-3.5 rounded-full shadow-lg transition-all"
              >
                Register Your Restaurant
              </button>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-black text-gray-900">Why Join Bhookingo Network?</h2>
              <p className="text-sm text-gray-600 mt-2">Empowering highway dhabas, food courts, and fine-dining restaurants across India.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: TrendingUp,
                  title: "High Intent Highway Customers",
                  desc: "Reach travelers who are actively driving on your exact highway route and ready to order takeaway or dine-in."
                },
                {
                  icon: ClockIcon,
                  title: "Pre-Prepared Order Management",
                  desc: "Receive pre-orders 15-30 minutes before arrival so your kitchen operates with smooth preparation schedules."
                },
                {
                  icon: Users,
                  title: "Increased Repeat Business",
                  desc: "Build a loyal customer base of frequent travelers, transport operators, and road trip enthusiasts."
                }
              ].map((b, idx) => (
                <div key={idx} className="bg-gray-50 rounded-3xl p-8 border border-gray-200 shadow-sm space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#E0332F] flex items-center justify-center">
                    <b.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{b.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>

            {/* CTA Box */}
            <div className="bg-[#FFF5F5] border border-red-150 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <h3 className="text-2xl font-black text-gray-900">Ready to boost your revenue?</h3>
                <p className="text-xs sm:text-sm text-gray-600">Onboarding takes less than 10 minutes. Get started today.</p>
              </div>
              <button
                onClick={() => navigate('/food/restaurant/onboarding')}
                className="bg-[#E0332F] hover:bg-[#c92824] text-white text-xs font-black uppercase tracking-wider px-8 py-4 rounded-2xl shadow-md transition-all shrink-0 flex items-center gap-2"
              >
                <span>Partner With Us</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

function ClockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
