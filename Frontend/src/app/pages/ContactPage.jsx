import React, { useState, useEffect } from 'react';
import LandingHeader from '../components/LandingHeader';
import LandingFooter from '../components/LandingFooter';
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { loadBusinessSettings } from "@food/utils/businessSettings";

export default function ContactPage() {
  const [contactInfo, setContactInfo] = useState({
    email: "bhookingo@gmail.com",
    mobile: "9999999999",
    companyName: "Bhookingo",
    address: "",
    state: "",
    pincode: "",
    region: "India"
  });
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: ""
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

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
    const subject = encodeURIComponent(`Website Inquiry from ${formData.name}`);
    const body = encodeURIComponent(
      [
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

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900 selection:bg-[#E0332F] selection:text-white">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white py-16 md:py-24 text-center px-4">
          <div className="max-w-4xl mx-auto space-y-4">
            <span className="text-xs font-black text-[#E0332F] uppercase tracking-widest bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/20">
              CONTACT US
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              We're Here to <span className="text-[#E0332F]">Help</span>
            </h1>
            <p className="text-gray-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              Have questions, feedback, or restaurant partnership queries? Reach out to the Bhookingo team anytime.
            </p>
          </div>
        </section>

        {/* Contact Form & Info */}
        <section className="py-16 md:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              
              {/* Info Column */}
              <div className="lg:col-span-5 space-y-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Get in Touch</h2>
                  <p className="text-sm text-gray-600 mt-1">Our support team is available 24/7 for travelers and restaurant partners.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-150">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E0332F] flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Us</h3>
                      <a href={`mailto:${contactInfo.email}`} className="text-sm font-bold text-gray-900 hover:text-[#E0332F] transition-colors">
                        {contactInfo.email}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-150">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E0332F] flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Call Support</h3>
                      <a href={`tel:${contactInfo.mobile}`} className="text-sm font-bold text-gray-900 hover:text-[#E0332F] transition-colors">
                        {contactInfo.mobile}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-150">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E0332F] flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Corporate Office</h3>
                      <p className="text-sm font-bold text-gray-900">{contactInfo.companyName}</p>
                      {officeAddressLine ? (
                        <p className="text-sm text-gray-500">{officeAddressLine}</p>
                      ) : null}
                      <p className="text-sm text-gray-500">{officeRegionLine}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Column */}
              <div className="lg:col-span-7 bg-gray-50 rounded-3xl p-8 border border-gray-200 shadow-sm">
                {formSubmitted ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">Email Draft Ready</h3>
                    <p className="text-sm text-gray-600 max-w-md mx-auto">Your email app has been opened with your message details. Send the email to complete your inquiry.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Send Us a Message</h2>
                    <p className="text-sm text-gray-600 -mt-3">This form opens your email app with a pre-filled message so your inquiry reaches the Bhookingo team directly.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Your Name</label>
                        <input required type="text" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E0332F]" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                        <input required type="tel" value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E0332F]" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                      <input required type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E0332F]" />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Message / Inquiry</label>
                      <textarea required rows={4} value={formData.message} onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E0332F]" />
                    </div>

                    <button type="submit" className="w-full bg-[#E0332F] hover:bg-[#c92824] text-white text-sm font-black uppercase tracking-wider py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                      <span>Send via Email</span>
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>

            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
