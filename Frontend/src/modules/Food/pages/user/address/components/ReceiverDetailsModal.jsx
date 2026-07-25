import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Phone, CheckCircle2, ShieldCheck, MapPin } from "lucide-react";
import { Button } from "@food/components/ui/button";

export function isValidIndianPhone(phone) {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, "");
  // Standard Indian 10-digit mobile number check
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) return true;
  if (digits.length === 12 && digits.startsWith("91") && /^91[6-9]\d{9}$/.test(digits)) return true;
  return false;
}

export default function ReceiverDetailsModal({
  isOpen,
  onClose,
  initialData = {},
  addressText = "",
  onSave
}) {
  const [receiverName, setReceiverName] = useState(initialData.receiverName || "");
  const [receiverPhone, setReceiverPhone] = useState(initialData.receiverPhone || "");
  const [consentChecked, setConsentChecked] = useState(initialData.consentConfirmed || false);

  const cleanPhone = String(receiverPhone).replace(/\D/g, "");
  const phoneValid = isValidIndianPhone(cleanPhone);
  const nameValid = Boolean(receiverName && receiverName.trim().length > 0);
  const saveEnabled = Boolean(nameValid && phoneValid && consentChecked);

  const handleSave = () => {
    if (!saveEnabled) return;
    onSave({
      receiverName: receiverName.trim(),
      receiverPhone: cleanPhone.length === 12 ? cleanPhone.slice(2) : cleanPhone,
      consentConfirmed: true
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-white dark:bg-[#18181b] rounded-3xl shadow-2xl border border-gray-100 dark:border-neutral-800 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-neutral-800 bg-orange-50/50 dark:bg-orange-950/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-bold shadow-md shadow-orange-500/20">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Receiver Details</h3>
                <p className="text-xs text-gray-500 dark:text-neutral-400">Order for someone else</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {addressText && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 text-xs text-gray-600 dark:text-neutral-300">
                <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <span className="line-clamp-2 font-medium">{addressText}</span>
              </div>
            )}

            {/* Receiver Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1.5">
                Receiver's Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>
            </div>

            {/* Receiver Phone */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1.5">
                Receiver's Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-gray-50 dark:bg-neutral-900 border ${
                    receiverPhone && !phoneValid
                      ? "border-red-500"
                      : "border-gray-200 dark:border-neutral-700"
                  } text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50`}
                />
              </div>
              {receiverPhone && !phoneValid && (
                <p className="text-[11px] text-red-500 mt-1">Please enter a valid 10-digit Indian mobile number.</p>
              )}
            </div>

            {/* Consent Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200/50 dark:border-orange-900/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-xs text-gray-700 dark:text-neutral-300 leading-snug">
                  <span className="font-semibold text-gray-900 dark:text-white block mb-0.5">
                    Permission Confirmation
                  </span>
                  I confirm I have this person's permission to share their contact number with the restaurant for order updates & pickup OTP.
                </span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <Button
              type="button"
              disabled={!saveEnabled}
              onClick={handleSave}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Save Details
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
