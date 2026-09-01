import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import PageTransition from '@/shared/components/motion/PageTransition';
import { EASING, MOTION_RULES } from '@/shared/motion/tokens';
import { useReducedMotionSafe } from '@/shared/motion/useReducedMotionSafe';
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronDown,
  HelpCircle,
  Store,
  Navigation,
  Headphones,
  ShieldCheck,
  MessageSquareHeart,
  Car
} from 'lucide-react';
import { loadBusinessSettings } from "@food/utils/businessSettings";
import { useNavigate } from 'react-router-dom';

export default function ContactPage() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotionSafe();
  const [contactInfo, setContactInfo] = useState({
    email: "bhookingo@gmail.com",
    mobile: "9999999999",
    companyName: "Bhookingo",
    address: "",
    state: "",
    pincode: "",
    region: "India"
  });

  const [inquiryType, setInquiryType] = useState('Traveler Support');
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: ""
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const settings = await loadBusinessSettings();
        if (settings) {
          const number = settings.phone?.number
            ? `${settings.phone?.countryCode || ''} ${settings.phone.number}`.trim()
            : "9999999999";

          setContactInfo({
            email: settings.email || "bhookingo@gmail.com",
            mobile: number,
            companyName: settings.companyName || "Bhookingo",
            address: settings.address || "",
            state: settings.state || "",
            pincode: settings.pincode || "",
            region: settings.region || "India"
          });
        }
      } catch (_error) {
        // Fallback
      }
    };
    fetchContactInfo();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[${inquiryType}] Website Inquiry from ${formData.name}`);
    const body = encodeURIComponent(
      [
        `Inquiry Type: ${inquiryType}`,
        `Name: ${formData.name}`,
        `Phone: ${formData.phone}`,
        `Email: ${formData.email}`,
        "",
        "Message:",
        formData.message
      ].join("\n")
    );

    window.location.href = `mailto:${contactInfo.email}?subject=${subject}&body=${body}`;
    setFormSubmitted(true);
  };

  const officeAddressLine = [
    contactInfo.address,
    contactInfo.state,
    contactInfo.pincode
  ]
    .filter(Boolean)
    .join(", ");

  const officeRegionLine = contactInfo.region || "India";

  const inquiryTypes = [
    'Traveler Support',
    'Restaurant Partner',
    'EV & Amenities',
    'General Feedback'
  ];

  const faqs = [
    {
      q: "How does Bhookingo highway pre-ordering work?",
      a: "Bhookingo tracks your route direction and calculates your estimated arrival time. You can choose food 15-30 km in advance so your fresh meal is prepared and waiting when you arrive."
    },
    {
      q: "How do I partner my highway restaurant or dhaba?",
      a: "Register directly on our 'For Restaurants' page or download the Bhookingo Restaurant Partner App from Google Play. Onboarding is completed in under 10 minutes with basic FSSAI credentials."
    },
    {
      q: "Are washroom hygiene and parking amenities verified?",
      a: "Yes! Every partnered restaurant on Bhookingo undergoes hygiene checks and clearly displays real photos of parking facilities, clean washroom availability, and EV fast chargers."
    },
    {
      q: "What if I get delayed in highway traffic after ordering?",
      a: "Our smart route assistant automatically tracks your speed and alerts the restaurant's kitchen display system to adjust meal preparation timing."
    }
  ];

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
                <div>
                  <span className="landing-hero-badge">
                    Contact Us
                  </span>
                </div>

                <div className="mt-4 sm:mt-5">
                  <h1 className="landing-hero-h1 max-w-2xl">
                    We're Here to <span className="text-[color:var(--landing-accent)]">Help You Move</span>
                  </h1>
                  <p className="landing-hero-body mt-3 sm:mt-3.5">
                    Have questions, feedback, or restaurant partnership queries? Reach out to the Bhookingo team anytime.
                  </p>
                </div>

                {/* Action Buttons in Hero */}
                <div className="flex flex-wrap items-center gap-3 mt-5 sm:mt-6">
                  <a
                    href={`tel:${contactInfo.mobile}`}
                    className="landing-button-primary flex items-center gap-2 rounded-full px-6 sm:px-7 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-[0_8px_25px_rgba(224,51,47,0.35)] hover:shadow-[0_12px_32px_rgba(224,51,47,0.55)] transition-all active:scale-95 group cursor-pointer"
                  >
                    <Phone className="h-4 w-4" />
                    <span>Call Support 24/7</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                  <a
                    href="#contact-form"
                    className="landing-button-secondary flex items-center gap-2 rounded-full px-6 sm:px-7 py-3 text-xs sm:text-sm font-bold tracking-wider text-white shadow-lg backdrop-blur-md transition-all group cursor-pointer"
                  >
                    <span>Send Message</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                </div>

                {/* Standardized Three Pillar Cards in Hero */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-6 sm:mt-7">
                  {[
                    { value: '< 2 Mins', label: 'Average emergency support response' },
                    { value: '24 / 7', label: 'Active highway assistance helpline' },
                    { value: '100% Resolve', label: 'Committed to seamless road trips' }
                  ].map((item) => (
                    <div
                      key={item.value}
                      className="landing-pillar-card"
                    >
                      <div className="landing-pillar-title">{item.value}</div>
                      <p className="landing-pillar-body">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Interactive Mockup Column */}
              <div className="lg:col-span-5 lg:pl-2 xl:pl-4 mt-6 lg:mt-0">
                <div className="landing-showcase-panel-outer">
                  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[rgba(214,40,40,0.22)] blur-3xl" />
                  <div className="pointer-events-none absolute -left-8 bottom-8 h-24 w-24 rounded-full bg-white/8 blur-2xl" />

                  <div className="landing-showcase-panel-inner">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <div>
                        <div className="text-[9.5px] font-extrabold uppercase tracking-wider text-[#FF8582]">
                          Direct Channels
                        </div>
                        <h2 className="pt-0.5 font-[var(--font-display)] text-base sm:text-lg font-bold text-white">
                          Immediate Reach
                        </h2>
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-400 border border-emerald-500/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Online Now</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2.5">
                      <a
                        href={`mailto:${contactInfo.email}`}
                        className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 transition-all hover:bg-white/[0.08] group"
                      >
                        <div className="h-8 w-8 rounded-lg bg-[#E0332F]/20 text-[#FF8582] flex items-center justify-center shrink-0 border border-[#E0332F]/30">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Email Support</span>
                          <p className="text-xs font-bold text-white truncate">{contactInfo.email}</p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-white transition-transform group-hover:translate-x-1" />
                      </a>

                      <a
                        href={`tel:${contactInfo.mobile}`}
                        className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 transition-all hover:bg-white/[0.08] group"
                      >
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                          <Phone className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Call Support</span>
                          <p className="text-xs font-bold text-white truncate">{contactInfo.mobile}</p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-white transition-transform group-hover:translate-x-1" />
                      </a>

                      <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                        <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Headquarters</span>
                          <p className="text-xs font-bold text-white truncate">
                            {contactInfo.companyName} • {officeRegionLine}
                          </p>
                        </div>
                      </div>
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
        <section className="border-y border-[color:var(--landing-line)] bg-[rgba(255,255,255,0.65)] py-6">
          <div className="mx-auto grid max-w-7xl gap-3.5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {[
              { title: "24/7 Traveler Helpdesk", copy: "Immediate live assistance for on-route orders & navigation." },
              { title: "Restaurant Onboarding", copy: "Fast-track partnership support for highway dhabas & food plazas." },
              { title: "Clean Restroom Feedback", copy: "Report facility issues to help keep highway stops pristine." },
              { title: "EV Station Queries", copy: "Assistance with verified fast charger locations and bay availability." }
            ].map((item, index) => (
              <div
                key={item.title}
                className="relative rounded-2xl border border-[color:var(--landing-line)] bg-white p-4 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="absolute left-0 top-5 h-10 w-1 rounded-r-full bg-[color:var(--landing-accent)]" />
                <div className="flex items-start justify-between gap-3 pl-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff1f1] text-[color:var(--landing-accent)]">
                    <Sparkles className="h-4.5 w-4.5" />
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
        {/* CONTACT FORM & IMAGE SECTION                                              */}
        {/* ========================================================================= */}
        <section id="contact-form" className="py-10 md:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
            {/* Section Header */}
            <div className="max-w-2xl space-y-2 text-center md:text-left">
              <span className="landing-section-label text-[11px] font-extrabold text-[color:var(--landing-accent)]">
                GET IN TOUCH
              </span>
              <h2 className="landing-subtitle text-2xl sm:text-3xl font-black text-[color:var(--landing-text)]">
                Send Us a Message &
                <span className="text-[color:var(--landing-accent)]"> We'll Reply Promptly</span>
              </h2>
              <p className="text-xs sm:text-sm leading-relaxed text-[color:var(--landing-text-muted)]">
                Our support team is available 24/7 for travelers, highway diners, and restaurant partners.
              </p>
            </div>

            {/* 2-Column Form Card */}
            <div className="rounded-3xl border border-[color:var(--landing-line)] bg-white p-5 sm:p-7 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Form Column (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Inquiry Type Chips */}
                  <div>
                    <span className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-2">
                      Select Inquiry Type:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {inquiryTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setInquiryType(type)}
                          className={`rounded-full px-3.5 py-1.5 text-[11px] font-extrabold tracking-wide transition-all ${
                            inquiryType === type
                              ? 'bg-[#1b130f] text-white shadow-2xs'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formSubmitted ? (
                    <div className="text-center py-8 space-y-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 p-6">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-black text-gray-900 font-[var(--font-display)]">Email Draft Ready</h3>
                      <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                        Your email app has been opened with your pre-filled inquiry details for <strong>{contactInfo.email}</strong>.
                      </p>
                      <button
                        onClick={() => setFormSubmitted(false)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#1b130f] px-5 py-2 text-xs font-bold text-white hover:bg-[color:var(--landing-accent)] transition-all"
                      >
                        <span>Send Another Note</span>
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-700 mb-1">
                            Your Name <span className="text-[color:var(--landing-accent)]">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. John Doe"
                            value={formData.name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[color:var(--landing-accent)] bg-gray-50/50"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-700 mb-1">
                            Phone Number <span className="text-[color:var(--landing-accent)]">*</span>
                          </label>
                          <input
                            required
                            type="tel"
                            placeholder="e.g. +91 98765 43210"
                            value={formData.phone}
                            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[color:var(--landing-accent)] bg-gray-50/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-700 mb-1">
                          Email Address <span className="text-[color:var(--landing-accent)]">*</span>
                        </label>
                        <input
                          required
                          type="email"
                          placeholder="e.g. traveler@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[color:var(--landing-accent)] bg-gray-50/50"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-gray-700 mb-1">
                          Message / Inquiry <span className="text-[color:var(--landing-accent)]">*</span>
                        </label>
                        <textarea
                          required
                          rows={3}
                          placeholder="How can our highway support team help you today?"
                          value={formData.message}
                          onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[color:var(--landing-accent)] bg-gray-50/50 resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full landing-button-primary flex items-center justify-center gap-2 rounded-full py-3 text-xs font-extrabold uppercase tracking-[0.16em] shadow-md transition-all active:scale-95 group"
                      >
                        <span>Send Message</span>
                        <Send className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </button>
                    </form>
                  )}
                </div>

                {/* Right Visual Image Block */}
                <div className="lg:col-span-5">
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm h-[280px] sm:h-[340px] group">
                    <img
                      src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80"
                      alt="Bhookingo Highway Travelers Care"
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md mb-1.5 shadow-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Support Priority</span>
                      </div>
                      <h4 className="font-[var(--font-display)] text-base sm:text-lg font-bold">
                        Fast Highway Resolutions
                      </h4>
                      <p className="text-[11px] text-gray-200 leading-relaxed">
                        Dedicated coordinators available for live route changes and partner help.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Cards: Call, Email, Office */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Call Us Directly Card */}
              <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--landing-line)] bg-[#fcfaf8] p-4 shadow-2xs transition-all hover:border-[color:var(--landing-accent)] hover:shadow-sm">
                <div className="h-11 w-11 rounded-xl bg-red-50 text-[color:var(--landing-accent)] flex items-center justify-center shrink-0 shadow-2xs">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Call Directly</h3>
                  <a
                    href={`tel:${contactInfo.mobile}`}
                    className="pt-0.5 block font-[var(--font-display)] text-sm font-black text-gray-900 hover:text-[#E0332F] transition-colors truncate"
                  >
                    {contactInfo.mobile}
                  </a>
                  <span className="text-[10px] text-gray-500">Mon-Sun 24/7 Hotline</span>
                </div>
              </div>

              {/* Send Us an Email Card */}
              <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--landing-line)] bg-[#fcfaf8] p-4 shadow-2xs transition-all hover:border-[color:var(--landing-accent)] hover:shadow-sm">
                <div className="h-11 w-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Send Us an Email</h3>
                  <a
                    href={`mailto:${contactInfo.email}`}
                    className="pt-0.5 block font-[var(--font-display)] text-sm font-black text-gray-900 hover:text-[#E0332F] transition-colors truncate"
                  >
                    {contactInfo.email}
                  </a>
                  <span className="text-[10px] text-gray-500">Fast digital support</span>
                </div>
              </div>

              {/* Corporate Office Card */}
              <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--landing-line)] bg-[#fcfaf8] p-4 shadow-2xs transition-all hover:border-[color:var(--landing-accent)] hover:shadow-sm">
                <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Our Offices</h3>
                  <p className="pt-0.5 font-[var(--font-display)] text-sm font-black text-gray-900">
                    {contactInfo.companyName}
                  </p>
                  <span className="text-[10px] text-gray-500">
                    {officeAddressLine ? `${officeAddressLine}, ` : ''}{officeRegionLine}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECONDARY DISCOVERY CARDS & FAQS                                          */}
        {/* ========================================================================= */}
        <section className="py-10 md:py-14 bg-[linear-gradient(180deg,#fff8f7_0%,#fff2f2_100%)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
            {/* Feature 1: Find Bhookingo Near You */}
            <div className="rounded-3xl border border-[color:var(--landing-line)] bg-white p-5 sm:p-7 shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5 rounded-2xl overflow-hidden border border-gray-200 h-48 sm:h-56">
                  <img
                    src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80"
                    alt="Find Restaurants on Highway"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="md:col-span-7 space-y-3">
                  <span className="landing-section-label text-[11px] font-extrabold text-[color:var(--landing-accent)]">
                    HIGHWAY NETWORK
                  </span>
                  <h3 className="font-[var(--font-display)] text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                    Find Bhookingo Highway Stops Near You
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-[color:var(--landing-text-muted)]">
                    Explore verified dhabas, food plazas, EV charging hubs, and clean restrooms currently active on major Indian national highways.
                  </p>
                  <button
                    onClick={() => navigate('/features')}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#1b130f] px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white hover:bg-[color:var(--landing-accent)] transition-all group"
                  >
                    <span>View All Features</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>

            {/* Feature 2: Interactive FAQ Accordion Section */}
            <div className="rounded-3xl border border-[color:var(--landing-line)] bg-white p-5 sm:p-7 shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-5 space-y-3">
                  <span className="landing-section-label text-[11px] font-extrabold text-[color:var(--landing-accent)]">
                    NEED QUICK ANSWERS?
                  </span>
                  <h3 className="font-[var(--font-display)] text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                    Please Visit Our FAQ Before Contacting Us
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-[color:var(--landing-text-muted)]">
                    Find immediate answers to common questions about live tracking, pre-orders, and highway partner onboarding.
                  </p>
                </div>

                <div className="md:col-span-7 space-y-2.5">
                  {faqs.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-gray-200 overflow-hidden transition-all bg-gray-50/50"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                          className="w-full p-3.5 text-left flex items-center justify-between gap-2.5 font-bold text-xs sm:text-sm text-gray-900 hover:text-[color:var(--landing-accent)] transition-colors"
                        >
                          <span>{faq.q}</span>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 transition-transform duration-300 ${
                              isOpen ? 'rotate-180 text-[color:var(--landing-accent)]' : 'text-gray-400'
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-3.5 pb-3.5 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-2.5">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* HIGH CONVERSION BOTTOM CTA BANNER                                         */}
        {/* ========================================================================= */}
        <section className="pb-10 md:pb-14 pt-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-3xl bg-[#1a120f] px-6 py-8 text-white shadow-xl sm:px-8 md:py-10 relative">
              <div className="pointer-events-none absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-[rgba(214,40,40,0.25)] blur-3xl" />

              <div className="relative grid items-center gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8 space-y-2">
                  <span className="landing-section-label text-[10px] font-extrabold text-[#f2b2b2]">
                    GET STARTED
                  </span>
                  <h2 className="font-[var(--font-display)] text-2xl sm:text-3xl font-black">
                    Ready to Travel with Zero Chaos?
                  </h2>
                  <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-[#d8c7bb]">
                    Download Bhookingo today or register your highway restaurant to become part of India's fastest growing highway food network.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
                  <button
                    onClick={() => window.open('https://play.google.com/store/apps/details?id=com.bhookingo.user', '_blank')}
                    className="landing-button-primary flex items-center gap-2 rounded-full px-6 py-3 text-xs sm:text-sm font-extrabold uppercase tracking-[0.18em] group active:scale-95 shadow-md"
                  >
                    <span>Download App</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
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

