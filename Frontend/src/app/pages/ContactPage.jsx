import React, { useState, useEffect } from 'react';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
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
                CONTACT US
              </span>

              <div className="space-y-4">
                <h1 className="landing-title max-w-4xl text-4xl font-black text-white sm:text-5xl lg:text-[3.75rem]">
                  We're Here to
                  <br />
                  <span className="text-[color:var(--landing-accent)]">Help You Move</span>
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[#f1e4db] sm:text-lg">
                  Have questions, feedback, or restaurant partnership queries? Reach out to the Bhookingo team anytime.
                </p>
              </div>

              {/* Action Buttons in Hero */}
              <div className="flex flex-wrap gap-4 pt-2">
                <a
                  href={`tel:${contactInfo.mobile}`}
                  className="landing-button-primary flex items-center gap-2 rounded-full px-8 py-4 text-sm font-extrabold uppercase tracking-[0.18em] transition-all active:scale-95 group shadow-lg"
                >
                  <Phone className="h-4 w-4" />
                  <span>Call Support 24/7</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                </a>
                <a
                  href="#contact-form"
                  className="landing-button-secondary flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold transition-all group"
                >
                  <span>Send a Message</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                </a>
              </div>

              {/* Three Highway Contact Pillars in Hero */}
              <div className="grid gap-3 pt-4 sm:grid-cols-3">
                {[
                  { value: '24/7 Road Support', label: 'Assistance for highway travelers anytime' },
                  { value: '< 10 Min Response', label: 'Quick resolution for live pre-order queries' },
                  { value: 'Partner Desk', label: 'Dedicated onboarding for highway restaurants' }
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

            {/* Right Hero: Direct Contact Hotline Widget */}
            <div className="lg:col-span-5 lg:pl-6 xl:pl-8">
              <div className="relative overflow-hidden rounded-[36px] border border-white/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0.12)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl">
                <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[rgba(214,40,40,0.22)] blur-3xl" />
                <div className="pointer-events-none absolute -left-8 bottom-8 h-24 w-24 rounded-full bg-white/8 blur-2xl" />

                <div className="relative rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(28,18,15,0.96)_0%,rgba(20,13,11,0.92)_100%)] p-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_22px_55px_rgba(12,8,6,0.32)] space-y-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <div className="landing-section-label text-[10px] font-extrabold text-[#f2b2b2]">
                        DIRECT CHANNELS
                      </div>
                      <h2 className="pt-1 font-[var(--font-display)] text-xl font-black text-white">
                        Connect in Seconds
                      </h2>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/8 p-3 text-[color:var(--landing-accent)]">
                      <Headphones className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Direct Contact Links */}
                  <div className="space-y-3">
                    <a
                      href={`mailto:${contactInfo.email}`}
                      className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.05] p-3.5 transition-all hover:bg-white/10 hover:border-white/20 group"
                    >
                      <div className="h-10 w-10 rounded-xl bg-red-500/20 text-[#f2b2b2] flex items-center justify-center shrink-0 border border-red-500/30">
                        <Mail className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Email Address</span>
                        <p className="text-xs sm:text-sm font-bold text-white truncate">{contactInfo.email}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-white transition-transform group-hover:translate-x-1" />
                    </a>

                    <a
                      href={`tel:${contactInfo.mobile}`}
                      className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.05] p-3.5 transition-all hover:bg-white/10 hover:border-white/20 group"
                    >
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <Phone className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Call Support</span>
                        <p className="text-xs sm:text-sm font-bold text-white truncate">{contactInfo.mobile}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-white transition-transform group-hover:translate-x-1" />
                    </a>

                    <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.05] p-3.5">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
                        <MapPin className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Headquarters</span>
                        <p className="text-xs sm:text-sm font-bold text-white truncate">
                          {contactInfo.companyName} • {officeRegionLine}
                        </p>
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
        <section className="border-y border-[color:var(--landing-line)] bg-[rgba(255,255,255,0.65)] py-8">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {[
              { title: "24/7 Traveler Helpdesk", copy: "Immediate live assistance for on-route orders & navigation." },
              { title: "Restaurant Onboarding", copy: "Fast-track partnership support for highway dhabas & food plazas." },
              { title: "Clean Restroom Feedback", copy: "Report facility issues to help keep highway stops pristine." },
              { title: "EV Station Queries", copy: "Assistance with verified fast charger locations and bay availability." }
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
        {/* CONTACT FORM & IMAGE SECTION (MATCHING IMAGE 3 REFERENCE LAYOUT)          */}
        {/* ========================================================================= */}
        <section id="contact-form" className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            {/* Section Header */}
            <div className="max-w-2xl space-y-3 text-center md:text-left">
              <span className="landing-section-label text-xs font-extrabold text-[color:var(--landing-accent)]">
                GET IN TOUCH
              </span>
              <h2 className="landing-subtitle text-3xl font-black sm:text-4xl text-[color:var(--landing-text)]">
                Send Us a Message &
                <span className="text-[color:var(--landing-accent)]"> We'll Reply Promptly</span>
              </h2>
              <p className="text-base leading-7 text-[color:var(--landing-text-muted)]">
                Our support team is available 24/7 for travelers, highway diners, and restaurant partners.
              </p>
            </div>

            {/* 2-Column Form Card (Form on Left/Right, High-Res Lifestyle Imagery on Side - Matching Image 3) */}
            <div className="rounded-[36px] border border-[color:var(--landing-line)] bg-white p-6 sm:p-10 shadow-[0_20px_60px_rgba(71,43,24,0.08)]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                {/* Form Column (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Inquiry Type Chips */}
                  <div>
                    <span className="block text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-2.5">
                      Select Inquiry Type:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {inquiryTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setInquiryType(type)}
                          className={`rounded-full px-4 py-2 text-xs font-extrabold tracking-wide transition-all ${
                            inquiryType === type
                              ? 'bg-[#1b130f] text-white shadow-sm'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formSubmitted ? (
                    <div className="text-center py-12 space-y-4 rounded-3xl bg-emerald-50/60 border border-emerald-200/80 p-8">
                      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 font-[var(--font-display)]">Email Draft Ready</h3>
                      <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                        Your email app has been opened with your pre-filled inquiry details for <strong>{contactInfo.email}</strong>.
                      </p>
                      <button
                        onClick={() => setFormSubmitted(false)}
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1b130f] px-6 py-2.5 text-xs font-bold text-white hover:bg-[color:var(--landing-accent)] transition-all"
                      >
                        <span>Send Another Note</span>
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">
                            Your Name <span className="text-[color:var(--landing-accent)]">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. John Doe"
                            value={formData.name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--landing-accent)] bg-gray-50/50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">
                            Phone Number <span className="text-[color:var(--landing-accent)]">*</span>
                          </label>
                          <input
                            required
                            type="tel"
                            placeholder="e.g. +91 98765 43210"
                            value={formData.phone}
                            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--landing-accent)] bg-gray-50/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">
                          Email Address <span className="text-[color:var(--landing-accent)]">*</span>
                        </label>
                        <input
                          required
                          type="email"
                          placeholder="e.g. traveler@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                          className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--landing-accent)] bg-gray-50/50"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">
                          Message / Inquiry <span className="text-[color:var(--landing-accent)]">*</span>
                        </label>
                        <textarea
                          required
                          rows={4}
                          placeholder="How can our highway support team help you today?"
                          value={formData.message}
                          onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                          className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--landing-accent)] bg-gray-50/50 resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full landing-button-primary flex items-center justify-center gap-2 rounded-full py-4 text-xs font-extrabold uppercase tracking-[0.16em] shadow-lg transition-all active:scale-95 group"
                      >
                        <span>Send Message</span>
                        <Send className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </button>
                    </form>
                  )}
                </div>

                {/* Right Visual Image Block (Image 3 Style with Floating Highway Badge) */}
                <div className="lg:col-span-5">
                  <div className="relative rounded-[28px] overflow-hidden border border-gray-200 shadow-lg h-[360px] sm:h-[440px] group">
                    <img
                      src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80"
                      alt="Highway Dining Experience"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#16100d]/90 via-[#16100d]/30 to-transparent p-6 sm:p-8 flex flex-col justify-between text-white">
                      {/* Floating Star Badge */}
                      <div className="self-end rounded-full bg-amber-400 text-gray-900 px-3.5 py-1 text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                        <span>★ 24/7 Live</span>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#f2b2b2]">
                          Highway Concierge
                        </span>
                        <h3 className="font-[var(--font-display)] text-xl sm:text-2xl font-black text-white leading-tight">
                          Dedicated Assistance for Road Trippers & Diners
                        </h3>
                        <p className="text-xs text-[#e2d5cb] leading-relaxed">
                          Whether pre-ordering meals or finding highway charging, our response team is on standby.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3 HORIZONTAL CONTACT INFO CARDS (MATCHING IMAGE 3 REFERENCE)              */}
        {/* ========================================================================= */}
        <section className="border-y border-[color:var(--landing-line)] bg-white py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Call Us Card */}
              <div className="flex items-center gap-4 rounded-[28px] border border-[color:var(--landing-line)] bg-[#fcfaf8] p-6 shadow-xs transition-all hover:border-[color:var(--landing-accent)] hover:shadow-md">
                <div className="h-14 w-14 rounded-2xl bg-red-50 text-[#E0332F] flex items-center justify-center shrink-0 shadow-xs">
                  <Phone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Call Us</h3>
                  <a
                    href={`tel:${contactInfo.mobile}`}
                    className="pt-1 block font-[var(--font-display)] text-base font-black text-gray-900 hover:text-[#E0332F] transition-colors"
                  >
                    {contactInfo.mobile}
                  </a>
                  <span className="text-[11px] text-gray-500">Mon-Sun 24/7 Hotline</span>
                </div>
              </div>

              {/* Send Us an Email Card */}
              <div className="flex items-center gap-4 rounded-[28px] border border-[color:var(--landing-line)] bg-[#fcfaf8] p-6 shadow-xs transition-all hover:border-[color:var(--landing-accent)] hover:shadow-md">
                <div className="h-14 w-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 shadow-xs">
                  <Mail className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Send Us an Email</h3>
                  <a
                    href={`mailto:${contactInfo.email}`}
                    className="pt-1 block font-[var(--font-display)] text-base font-black text-gray-900 hover:text-[#E0332F] transition-colors truncate"
                  >
                    {contactInfo.email}
                  </a>
                  <span className="text-[11px] text-gray-500">Fast digital support</span>
                </div>
              </div>

              {/* Corporate Office Card */}
              <div className="flex items-center gap-4 rounded-[28px] border border-[color:var(--landing-line)] bg-[#fcfaf8] p-6 shadow-xs transition-all hover:border-[color:var(--landing-accent)] hover:shadow-md">
                <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">Our Offices</h3>
                  <p className="pt-1 font-[var(--font-display)] text-base font-black text-gray-900">
                    {contactInfo.companyName}
                  </p>
                  <span className="text-[11px] text-gray-500">
                    {officeAddressLine ? `${officeAddressLine}, ` : ''}{officeRegionLine}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECONDARY DISCOVERY CARDS (FIND LOCATIONS & VISIT FAQS - IMAGE 3 STYLE)  */}
        {/* ========================================================================= */}
        <section className="py-16 md:py-24 bg-[linear-gradient(180deg,#fff8f7_0%,#fff2f2_100%)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            {/* Feature 1: Find Bhookingo Near You */}
            <div className="rounded-[36px] border border-[color:var(--landing-line)] bg-white p-6 sm:p-10 shadow-[0_18px_45px_rgba(71,43,24,0.06)]">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                <div className="md:col-span-5 rounded-[24px] overflow-hidden border border-gray-200 h-64 sm:h-72">
                  <img
                    src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80"
                    alt="Find Restaurants on Highway"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="md:col-span-7 space-y-4">
                  <span className="landing-section-label text-xs font-extrabold text-[color:var(--landing-accent)]">
                    HIGHWAY NETWORK
                  </span>
                  <h3 className="font-[var(--font-display)] text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
                    Find Bhookingo Highway Stops Near You
                  </h3>
                  <p className="text-sm leading-relaxed text-[color:var(--landing-text-muted)]">
                    Explore verified dhabas, food plazas, EV charging hubs, and clean restrooms currently active on major Indian national highways.
                  </p>
                  <button
                    onClick={() => navigate('/features')}
                    className="inline-flex items-center gap-2 rounded-full bg-[#1b130f] px-6 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-white hover:bg-[color:var(--landing-accent)] transition-all group"
                  >
                    <span>View All Features</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>

            {/* Feature 2: Interactive FAQ Accordion Section */}
            <div className="rounded-[36px] border border-[color:var(--landing-line)] bg-white p-6 sm:p-10 shadow-[0_18px_45px_rgba(71,43,24,0.06)]">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                <div className="md:col-span-5 space-y-4">
                  <span className="landing-section-label text-xs font-extrabold text-[color:var(--landing-accent)]">
                    NEED QUICK ANSWERS?
                  </span>
                  <h3 className="font-[var(--font-display)] text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
                    Please Visit Our FAQ Before Contacting Us
                  </h3>
                  <p className="text-sm leading-relaxed text-[color:var(--landing-text-muted)]">
                    Find immediate answers to common questions about live tracking, pre-orders, and highway partner onboarding.
                  </p>
                  <div className="rounded-[24px] overflow-hidden border border-gray-200 h-48 mt-4 hidden sm:block">
                    <img
                      src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80"
                      alt="Kitchen Support"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="md:col-span-7 space-y-3">
                  {faqs.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-gray-200 overflow-hidden transition-all bg-gray-50/50"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                          className="w-full p-4.5 text-left flex items-center justify-between gap-3 font-bold text-sm text-gray-900 hover:text-[color:var(--landing-accent)] transition-colors"
                        >
                          <span>{faq.q}</span>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 transition-transform duration-300 ${
                              isOpen ? 'rotate-180 text-[color:var(--landing-accent)]' : 'text-gray-400'
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-4.5 pb-4.5 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
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
        <section className="pb-16 md:pb-24 pt-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[36px] bg-[#1a120f] px-6 py-10 text-white shadow-[0_30px_80px_rgba(35,20,14,0.22)] sm:px-10 md:py-14 relative">
              <div className="pointer-events-none absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-[rgba(214,40,40,0.25)] blur-3xl" />

              <div className="relative grid items-center gap-8 lg:grid-cols-12">
                <div className="lg:col-span-8 space-y-3">
                  <span className="landing-section-label text-[11px] font-extrabold text-[#f2b2b2]">
                    GET STARTED
                  </span>
                  <h2 className="font-[var(--font-display)] text-3xl font-black sm:text-4xl">
                    Ready to Travel with Zero Chaos?
                  </h2>
                  <p className="max-w-2xl text-base leading-8 text-[#d8c7bb]">
                    Download Bhookingo today or register your highway restaurant to become part of India's fastest growing highway food network.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 lg:col-span-4 lg:justify-end">
                  <button
                    onClick={() => window.open('https://play.google.com/store/apps/details?id=com.bhookingo.user', '_blank')}
                    className="landing-button-primary flex items-center gap-2 rounded-full px-8 py-4 text-sm font-extrabold uppercase tracking-[0.18em] group active:scale-95 shadow-lg"
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

      <LandingFooter />
    </div>
  );
}

