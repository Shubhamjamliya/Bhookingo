import React from 'react';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import { Search, ShoppingBag, Utensils, Car, MapPin, CheckCircle2, ShieldCheck, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HowItWorksPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900 selection:bg-[#E0332F] selection:text-white">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white py-16 md:py-24 text-center px-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <span className="text-xs font-black text-[#E0332F] uppercase tracking-widest bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/20">
              HOW IT WORKS
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              Simple Steps for a <span className="text-[#E0332F]">Better Journey</span>
            </h1>
            <p className="text-gray-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              Bhookingo makes highway food ordering effortless. Discover forward-only restaurants along your route, pre-order meals in advance, and enjoy takeaway or dine-in without waiting.
            </p>
          </div>
        </section>

        {/* Steps Detailed */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            {[
              {
                num: "01",
                icon: Search,
                title: "Search & Route Discovery",
                desc: "Enter your starting point and destination. Our smart algorithm maps out your exact highway route and displays only verified, forward-facing restaurants ahead of your current location.",
                bullets: ["Live location tracking", "Filter by cuisine, ratings, & amenities", "Real distance & ETA estimates"]
              },
              {
                num: "02",
                icon: ShoppingBag,
                title: "Pre-Order Meals Ahead",
                desc: "Browse digital menus with live photos and customized dish variants. Choose between quick takeaway pick-up or reserving a table for relaxing dine-in.",
                bullets: ["Instant digital menu access", "Customizable dietary options", "Secure online payment via UPI, Cards, & Wallets"]
              },
              {
                num: "03",
                icon: Utensils,
                title: "Seamless Pick-up or Dine-in",
                desc: "Arrive at the restaurant right when your food is freshly prepared. Skip long queues and enjoy your meal immediately upon arrival.",
                bullets: ["Zero waiting time", "Clean washroom & parking info verified", "Fresh, hot meals ready at arrival"]
              },
              {
                num: "04",
                icon: Car,
                title: "Continue Your Journey",
                desc: "Save valuable travel time, avoid unhygienic roadside stops, and hit the road refreshed and satisfied.",
                bullets: ["Stress-free highway travel", "Consistent food quality every time", "Saved receipts & re-ordering features"]
              }
            ].map((step, idx) => (
              <div
                key={idx}
                className={`flex flex-col md:flex-row items-center gap-12 p-8 rounded-3xl border border-gray-150 shadow-sm ${idx % 2 === 1 ? 'md:flex-row-reverse bg-gray-50' : 'bg-white'}`}
              >
                <div className="w-full md:w-1/2 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-[#E0332F]">{step.num}</span>
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E0332F] flex items-center justify-center">
                      <step.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-black text-gray-900">{step.title}</h2>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                  <ul className="space-y-2 pt-2">
                    {step.bullets.map((b, bIdx) => (
                      <li key={bIdx} className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="w-full md:w-1/2 flex justify-center">
                  <div className="w-full max-w-sm h-64 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-white flex flex-col justify-between shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#E0332F]/10 rounded-full blur-2xl" />
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#E0332F]">BHOOKINGO STEP {step.num}</span>
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-black">{step.title}</h3>
                      <p className="text-sm text-gray-300">Guaranteed quality and real-time route precision.</p>
                    </div>
                    <button
                      onClick={() => navigate('/user/auth/login')}
                      className="bg-[#E0332F] hover:bg-[#c92824] text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors w-fit"
                    >
                      <span>Try Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
