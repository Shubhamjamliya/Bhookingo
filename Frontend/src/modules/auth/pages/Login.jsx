import React, { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link, useNavigate } from "react-router-dom"
import { Phone, ArrowRight, ShieldCheck, Loader2, Utensils, Star, Heart, X, User, Pencil, Smartphone, ShoppingBag, Smile, Car, Lock, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { authAPI, userAPI } from "@food/api"
import { setAuthData } from "@food/utils/auth"
import logoNew from "@/assets/logo.png"
import GoogleLoginButton from "@food/components/user/GoogleLoginButton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@food/components/ui/dialog"
import { Button } from "@food/components/ui/button"
import { Input } from "@food/components/ui/input"
import { Label } from "@food/components/ui/label"


export default function UnifiedOTPFastLogin() {
  const RESEND_COOLDOWN_SECONDS = 59
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOtp] = useState("")
  const [otpError, setOtpError] = useState("")
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [showNameModal, setShowNameModal] = useState(false)
  const [newName, setNewName] = useState("")
  const [isUpdatingName, setIsUpdatingName] = useState(false)
  const [tempAuth, setTempAuth] = useState(null)
  const [pendingVerify, setPendingVerify] = useState(null)
  const [showRestorePopup, setShowRestorePopup] = useState(false)
  const [deletedAccountData, setDeletedAccountData] = useState(null)
  const [blockTimer, setBlockTimer] = useState(0)
  const navigate = useNavigate()
  const submitting = useRef(false)

  // --- PERSISTENCE LOGIC START ---
  const SESSION_KEY = "user_auth_session_data";

  // Rehydrate state on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem(SESSION_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.phoneNumber) setPhoneNumber(parsed.phoneNumber);
        if (parsed.step) setStep(parsed.step);
        if (parsed.showNameModal !== undefined) setShowNameModal(parsed.showNameModal);
        if (parsed.newName) setNewName(parsed.newName);
        if (parsed.tempAuth) setTempAuth(parsed.tempAuth);
        if (parsed.pendingVerify) setPendingVerify(parsed.pendingVerify);
        if (parsed.showRestorePopup !== undefined) setShowRestorePopup(parsed.showRestorePopup);
        if (parsed.deletedAccountData) setDeletedAccountData(parsed.deletedAccountData);

        // Resume Resend Timer
        if (parsed.resendExpiresAt) {
          const remaining = Math.max(0, Math.floor((parsed.resendExpiresAt - Date.now()) / 1000));
          if (remaining > 0) setResendTimer(remaining);
        }

        // Resume Block Timer
        if (parsed.blockExpiresAt) {
          const remaining = Math.max(0, Math.floor((parsed.blockExpiresAt - Date.now()) / 1000));
          if (remaining > 0) {
            setBlockTimer(remaining);
            if (parsed.step === 1) setStep(2); // Ensure we show step 2 if blocked
          }
        }
      } catch (e) {
        console.error("Failed to rehydrate login state", e);
      }
    }
  }, []);

  // Persist state on change
  useEffect(() => {
    if (step === 1 && !phoneNumber && !blockTimer && !showNameModal && !showRestorePopup) {
      // Don't save empty initial state
      return;
    }

    const stateToSave = {
      phoneNumber,
      step,
      showNameModal,
      newName,
      tempAuth,
      pendingVerify,
      showRestorePopup,
      deletedAccountData,
      // Save expiration timestamps instead of seconds
      resendExpiresAt: resendTimer > 0 ? Date.now() + (resendTimer * 1000) : null,
      blockExpiresAt: blockTimer > 0 ? Date.now() + (blockTimer * 1000) : null,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(stateToSave));
  }, [phoneNumber, step, showNameModal, newName, tempAuth, pendingVerify, showRestorePopup, deletedAccountData, resendTimer === 0, blockTimer === 0]);

  // Combined cleanup helper
  const clearSessionData = () => {
    sessionStorage.removeItem(SESSION_KEY);
  };
  // --- PERSISTENCE LOGIC END ---

  const normalizedPhone = () => {
    const digits = String(phoneNumber).replace(/\D/g, "").slice(-15)
    return digits.length >= 8 ? digits : ""
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    const phone = normalizedPhone()
    if (phone.length < 10) {
      toast.error("Please enter a valid 10-digit phone number")
      return
    }
    if (submitting.current) return
    submitting.current = true
    setLoading(true)
    try {
      await authAPI.sendOTP(phoneNumber, "login", null)
      setOtp("")
      setOtpError("")
      setBlockTimer(0)
      setStep(2)
      setResendTimer(RESEND_COOLDOWN_SECONDS)
      toast.success("OTP sent successfully!")
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to send OTP."
      const lowerMsg = msg.toLowerCase();
      const isBlocked = lowerMsg.includes("blocked") ||
        lowerMsg.includes("too many attempts") ||
        lowerMsg.includes("try again after");

      if (isBlocked) {
        let totalSeconds = 180; // default 3 mins
        const timeMatch = msg.match(/(\d+)(?::(\d+))?/);
        if (timeMatch) {
          const mins = parseInt(timeMatch[1]);
          const secs = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          totalSeconds = (mins * 60) + secs;
        }

        setBlockTimer(totalSeconds);
        setStep(2);
        return;
      }
      toast.error(msg)
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  const handleResendOTP = async () => {
    const phone = normalizedPhone()
    if (phone.length < 10) {
      toast.error("Please enter a valid phone number")
      return
    }
    if (resendTimer > 0 || blockTimer > 0 || submitting.current) return
    submitting.current = true
    setLoading(true)
    try {
      await authAPI.sendOTP(phoneNumber, "login", null)
      setOtp("")
      setResendTimer(RESEND_COOLDOWN_SECONDS)
      toast.success("OTP resent successfully.")
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to resend OTP."
      const lowerMsg = msg.toLowerCase();
      const isBlocked = lowerMsg.includes("blocked") ||
        lowerMsg.includes("too many attempts") ||
        lowerMsg.includes("try again after");

      if (isBlocked) {
        let totalSeconds = 180;
        const timeMatch = msg.match(/(\d+)(?::(\d+))?/);
        if (timeMatch) {
          const mins = parseInt(timeMatch[1]);
          const secs = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          totalSeconds = (mins * 60) + secs;
        }

        setBlockTimer(totalSeconds);
        return;
      }
      toast.error(msg)
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  const handleEditNumber = () => {
    setShowNameModal(false)
    setShowRestorePopup(false)
    setDeletedAccountData(null)
    setPendingVerify(null)
    setBlockTimer(0) // Clear block timer when changing number
    setOtpError("") // Clear error
    setOtp("") // Clear inputs
    // Small delay for smooth transition so the background doesn't flicker while modal is closing
    setTimeout(() => {
      if (step === 2) {
        // This naturally triggers the popstate listener which sets step back to 1
        window.history.back()
      } else {
        setStep(1)
        setOtp("")
        setResendTimer(0)
      }
    }, 150)
  }

  const handleVerifyOTP = async (e, customOtp = null) => {
    if (e && e.preventDefault) e.preventDefault()
    const code = typeof customOtp === "string" ? customOtp : otp
    const otpDigits = String(code).replace(/\D/g, "").slice(0, 4)
    if (otpDigits.length !== 4) {
      toast.error("Please enter the 4-digit OTP")
      return
    }
    await processVerify(phoneNumber, otpDigits)
  }

  const processVerify = async (phone, otpCode, confirmAction = null) => {
    if (submitting.current) return
    submitting.current = true
    setLoading(true)
    let fcmToken = null
    let platform = "web"
    try {
      try {
        if (typeof window !== "undefined") {
          if (window.flutter_inappwebview) {
            platform = "mobile";
            // Optimization: Try only the most common handler to save time
            try {
              const t = await window.flutter_inappwebview.callHandler("getFcmToken", { module: "user" });
              if (t && typeof t === "string" && t.length > 20) fcmToken = t.trim();
            } catch (e) { }
          } else {
            fcmToken = localStorage.getItem("fcm_web_registered_token_user") || null;
          }
        }
      } catch (e) {
        console.warn("Failed to get FCM token during login", e);
      }

      const response = await authAPI.verifyOTP(phone, otpCode, "login", null, null, "user", null, null, fcmToken, platform, null, confirmAction)
      const data = response?.data?.data || response?.data || {}

      // Handle deleted account found
      if (data.deletedAccountFound) {
        setDeletedAccountData(data)
        setShowRestorePopup(true)
        setLoading(false)
        submitting.current = false
        return
      }

      // Handle name required (Success response with flag)
      if (data.needsName) {
        setShowRestorePopup(false)
        setPendingVerify({
          phone: phoneNumber,
          otp: otpCode,
          fcmToken,
          platform,
          confirmAction // Preserve the action (new) for the subsequent name submission
        })
        setShowNameModal(true)
        setLoading(false)
        submitting.current = false
        return
      }

      const accessToken = data.accessToken
      const refreshToken = data.refreshToken || null
      const user = data.user

      if (!accessToken || !user) {
        throw new Error("Invalid parameters from server")
      }

      setAuthData("user", accessToken, user, refreshToken)

      // If user has no name, show name modal instead of immediate navigation
      if (!user.name || user.name.trim() === "") {
        setTempAuth({ accessToken, user, refreshToken })
        setShowNameModal(true)
      } else {
        clearSessionData()
        navigate("/user/auth/portal", { replace: true })
      }
    } catch (err) {
      const status = err?.response?.status
      let msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Invalid OTP. Please try again."

      // Clear OTP inputs on failure
      setOtp("")
      setTimeout(() => {
        document.getElementById("otp-0")?.focus()
      }, 50)

      if (msg.toLowerCase().includes("blocked") || msg.toLowerCase().includes("too many attempts")) {
        const timeMatch = msg.match(/(\d+)(?::(\d+))?/);
        if (timeMatch) {
          const mins = parseInt(timeMatch[1]);
          const secs = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          setBlockTimer((mins * 60) + secs);
          msg = ""; // Clear msg so only block UI displays
        }
      }

      // Legacy check for string-based name requirement (backward compatibility)
      const nameRequired = /name\s+is\s+required.*first[- ]?time|first[- ]?time.*name\s+is\s+required|first[- ]?time\s*sign\s*up/i.test(String(msg))
      if (nameRequired) {
        setShowRestorePopup(false)
        setPendingVerify({
          phone: phoneNumber,
          otp: otpCode,
          fcmToken,
          platform,
          confirmAction
        })
        setShowNameModal(true)
        return
      }

      if (status === 401 && msg) {
        if (/deactivat(ed|e)/i.test(String(msg))) {
          msg = "Your account is deactivated. Please contact support."
          toast.error(msg)
        } else {
          setOtpError("Invalid OTP")
        }
      } else if (msg) {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  const handleNameSubmit = async (e) => {
    e.preventDefault()
    if (!newName.trim()) {
      toast.error("Please enter your name")
      return
    }

    try {
      setIsUpdatingName(true)
      if (pendingVerify) {
        const response = await authAPI.verifyOTP(
          pendingVerify.phone,
          pendingVerify.otp,
          "login",
          newName.trim(),
          null,
          "user",
          null,
          null,
          pendingVerify.fcmToken,
          pendingVerify.platform,
          null, // _token
          pendingVerify.confirmAction // Pass the preserved action
        )
        const data = response?.data?.data || response?.data || {}
        const accessToken = data.accessToken
        const refreshToken = data.refreshToken || null
        const user = data.user

        setAuthData("user", accessToken, user, refreshToken)
        setPendingVerify(null)
        clearSessionData()
        setShowNameModal(false)
        navigate("/user/auth/portal", { replace: true })
        return
      }

      // Call update profile API
      await userAPI.updateProfile({ name: newName.trim() })

      // Update local storage and auth data with the new name
      const updatedUser = { ...tempAuth.user, name: newName.trim() }
      setAuthData("user", tempAuth.accessToken, updatedUser, tempAuth.refreshToken)

      clearSessionData()
      setShowNameModal(false)
      navigate("/user/auth/portal", { replace: true })
    } catch (err) {
      toast.error("Failed to update name. You can skip this for now or try again.")
      console.error(err)
    } finally {
      setIsUpdatingName(false)
    }
  }

  useEffect(() => {
    if (step !== 2 || resendTimer <= 0) return
    const intervalId = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(intervalId)
  }, [step, resendTimer])

  useEffect(() => {
    if (blockTimer <= 0) return
    const intervalId = setInterval(() => {
      setBlockTimer((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(intervalId)
  }, [blockTimer])

  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        document.getElementById("otp-0")?.focus();
      }, 100);
    }
  }, [step]);

  // Intercept hardware back button to return to step 1 instead of leaving the page
  useEffect(() => {
    const handlePopState = () => {
      if (step === 2) {
        if (blockTimer > 0) {
          // Push state again to keep user locked on step 2
          window.history.pushState({ otpStep: true }, "")
          return
        }
        setStep(1)
        setOtp("")
        setResendTimer(0)
      }
    }

    if (step === 2) {
      window.history.pushState({ otpStep: true }, "")
      window.addEventListener("popstate", handlePopState)
    }

    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [step, blockTimer > 0])

  const formatResendTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  const primaryColor = "#DC2626" // Rebranded Red color

  return (
    <div className="h-[100dvh] overflow-hidden lg:h-auto lg:min-h-screen lg:overflow-y-auto w-full flex flex-col justify-between items-center relative font-['Poppins'] select-none bg-[#0f0b09] lg:bg-white lg:bg-gradient-to-br lg:from-rose-50/70 lg:via-white lg:to-red-50/50">
      <style dangerouslySetInnerHTML={{
        __html: `
        .mobile-gap-spacing > * + * {
          margin-top: 16px;
        }
        @media (max-width: 1024px) {
          @media (max-height: 780px) {
            .mobile-flow-hide {
              display: none !important;
            }
            .mobile-header-hide {
              display: none !important;
            }
            .mobile-card-padding {
              padding: 16px 20px !important;
            }
            .mobile-switcher-spacing {
              margin-top: 8px !important;
              margin-bottom: 12px !important;
            }
            .mobile-welcome-spacing {
              margin-bottom: 12px !important;
            }
            .mobile-gap-spacing > * + * {
              margin-top: 10px !important;
            }
            .mobile-divider-spacing {
              padding-top: 2px !important;
              padding-bottom: 2px !important;
            }
            .mobile-footer-spacing {
              margin-top: 12px !important;
              padding-top: 8px !important;
            }
          }

          @media (max-height: 620px) {
            .mobile-card-padding {
              padding: 12px 16px !important;
            }
            .mobile-switcher-spacing {
              margin-top: 4px !important;
              margin-bottom: 8px !important;
            }
            .mobile-welcome-spacing {
              margin-bottom: 8px !important;
            }
            .mobile-gap-spacing > * + * {
              margin-top: 8px !important;
            }
            .mobile-button-padding {
              padding-top: 8px !important;
              padding-bottom: 8px !important;
            }
            .mobile-input-padding {
              padding-top: 8px !important;
              padding-bottom: 8px !important;
            }
            .mobile-footer-spacing {
              margin-top: 8px !important;
              padding-top: 6px !important;
            }
          }
        }
      `}} />

      {/* Background Image & Overlay for Mobile View */}
      <img
        src="/highway_road_bg.png"
        alt="Takeaway Restaurant"
        className="fixed -inset-y-1 inset-x-0 w-full h-[calc(100vh+8px)] object-cover z-0 lg:hidden pointer-events-none"
      />
      <div className="fixed -inset-y-1 inset-x-0 bg-black/15 z-0 lg:hidden pointer-events-none" />

      {/* Top Navbar (Desktop View) */}
      <nav className="hidden sm:flex w-full h-[68px] bg-white/85 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 px-6 items-center select-none">
        <div className="w-full max-w-[1440px] mx-auto flex items-center justify-center">
          <Link to="/food/user" className="flex items-center">
            <img
              src="/bhookingo-logo-red.png"
              alt="bhookingo"
              className="w-[200px] h-auto object-contain"
            />
          </Link>
        </div>
      </nav>

      {/* Split-Screen Container */}
      <div className="w-full max-w-[1440px] flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-8 lg:gap-12 flex-1 px-4 sm:px-8 py-3 lg:py-12 mb-auto mt-12 lg:my-auto z-10 relative">

        {/* Left Side (Hero Panel - Desktop View) */}
        <div
          className="w-full lg:w-3/5 hidden lg:flex flex-col justify-between p-12 rounded-[32px] overflow-hidden relative shadow-2xl bg-cover bg-center text-white min-h-[600px] border border-white/10"
          style={{ backgroundImage: "url('/highway_road_bg.png')" }}
        >
          {/* Dark overlay for contrast */}
          <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] z-0" />

          <div className="relative z-10 flex flex-col justify-between h-full gap-8">
            {/* Top Brand & Title */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6">
                <span className="w-2.5 h-2.5 rounded-full bg-[#CB202D] animate-pulse" />
                <span className="text-xs font-bold tracking-wider uppercase text-white/90">Highway Dining Partner</span>
              </div>
              <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-tight mb-4 drop-shadow-md">
                Pre-Book Food <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400 px-2">on Highways</span>
              </h1>
              <p className="text-lg text-white/80 font-medium max-w-xl leading-relaxed drop-shadow-sm">
                Skip waiting. Order ahead. Pick up fresh food while you travel.
              </p>
            </div>

            {/* Process Flow Component (Desktop Style) */}
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-lg">
              <h2 className="text-xs font-extrabold tracking-widest uppercase text-gray-300 mb-4">How it works</h2>
              <div className="grid grid-cols-4 gap-4 relative">
                {/* Step 1 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-transparent border border-white/20 flex items-center justify-center text-[#CB202D] mb-2.5">
                    <Smartphone className="w-5 h-5" strokeWidth={2.2} />
                  </div>
                  <span className="text-xs font-bold text-gray-350 uppercase tracking-wider">Pre-Book</span>
                  <p className="text-[10px] text-gray-400 font-semibold mt-1">Choose restaurant & items</p>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-transparent border border-white/20 flex items-center justify-center text-[#CB202D] mb-2.5">
                    <Car className="w-5 h-5" strokeWidth={2.2} />
                  </div>
                  <span className="text-xs font-bold text-gray-350 uppercase tracking-wider">Drive</span>
                  <p className="text-[10px] text-gray-400 font-semibold mt-1">Head towards outlet</p>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-transparent border border-white/20 flex items-center justify-center text-[#CB202D] mb-2.5">
                    <ShoppingBag className="w-5 h-5" strokeWidth={2.2} />
                  </div>
                  <span className="text-xs font-bold text-gray-350 uppercase tracking-wider">Pick Up</span>
                  <p className="text-[10px] text-gray-400 font-semibold mt-1">Collect hot, fresh food</p>
                </div>

                {/* Step 4 */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-transparent border border-white/20 flex items-center justify-center text-[#CB202D] mb-2.5">
                    <Smile className="w-5 h-5" strokeWidth={2.2} />
                  </div>
                  <span className="text-xs font-bold text-gray-350 uppercase tracking-wider">Enjoy</span>
                  <p className="text-[10px] text-gray-400 font-semibold mt-1">Eat in car or dine-in</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Side (Auth Form Column) */}
        <div className="w-full lg:w-2/5 flex flex-col items-center justify-center">
          <div className="w-full max-w-[325px] lg:max-w-[380px] bg-white/75 text-gray-900 rounded-[30px] shadow-2xl px-5 pt-4 pb-6 border border-white/50 flex flex-col flex-initial overflow-y-auto overflow-x-hidden max-h-[95dvh] backdrop-blur-md my-4 mobile-card-padding">

            {/* Logo Section */}
            <div className="flex justify-center mb-1">
              <img
                src="/bhookingo-logo-red.png"
                alt="bhookingo"
                className="h-20 lg:h-28 object-contain mobile-logo-size"
              />
            </div>
            {/* Heading Description */}
            <div className="text-center mb-1.5 lg:hidden mobile-header-hide">
              <h1 className="text-[21px] font-black text-gray-900 tracking-tight leading-tight">
                Pre-Book Food <br />
                <span className="text-[#CB202D]">on Highways</span>
              </h1>
              <p className="text-[9px] font-bold text-gray-500 tracking-wide mt-0.5">
                Skip Waiting. Order Ahead. Pick Up Fresh.
              </p>
            </div>

            {/* Process Flow */}
            <div className="flex items-center justify-between px-1 py-1 border-b border-gray-100 lg:hidden select-none mb-1.5 mobile-flow-hide">
              {/* Step 1 */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full border border-gray-250 flex items-center justify-center bg-white text-[#CB202D]">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <span className="text-[8px] font-bold text-gray-900 uppercase tracking-tight mt-0.5">Pre-Book</span>
              </div>

              <span className="text-gray-400 font-bold text-xs -mt-2.5">→</span>

              {/* Step 2 */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full border border-gray-250 flex items-center justify-center bg-white text-[#CB202D]">
                  <Car className="w-3.5 h-3.5" />
                </div>
                <span className="text-[8px] font-bold text-gray-900 uppercase tracking-tight mt-0.5">Drive</span>
              </div>

              <span className="text-gray-400 font-bold text-xs -mt-2.5">→</span>

              {/* Step 3 */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full border border-gray-250 flex items-center justify-center bg-white text-[#CB202D]">
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
                <span className="text-[8px] font-bold text-gray-900 uppercase tracking-tight mt-0.5">Pick Up</span>
              </div>

              <span className="text-gray-400 font-bold text-xs -mt-2.5">→</span>

              {/* Step 4 */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full border border-gray-250 flex items-center justify-center bg-white text-[#CB202D]">
                  <Smile className="w-3.5 h-3.5" />
                </div>
                <span className="text-[8px] font-bold text-gray-900 uppercase tracking-tight mt-0.5">Enjoy</span>
              </div>
            </div>

            {/* Takeaway / Dine In Tab Switcher */}
            <div className="grid grid-cols-2 mt-1 mb-3 border-b border-gray-200 relative select-none mobile-switcher-spacing">
              <div className="flex flex-col items-center pb-2 cursor-pointer text-[#CB202D] transition-all">
                <ShoppingBag className="w-4 h-4 mb-0.5" />
                <span className="text-[9px] font-bold tracking-wider uppercase">Takeaway</span>
              </div>
              <div className="flex flex-col items-center pb-2 cursor-not-allowed text-[#CB202D] transition-all">
                <svg className="w-5 h-5 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4l1 8h3" />
                  <path d="M5 12l-1 8" />
                  <path d="M8 12v8" />
                  <path d="M20 4l-1 8h-3" />
                  <path d="M19 12l1 8" />
                  <path d="M16 12v8" />
                  <path d="M10 11h4" />
                  <path d="M12 11v9" />
                  <path d="M10 20h4" />
                </svg>
                <span className="text-[9px] font-bold tracking-wider uppercase">Dine In</span>
              </div>
              <div className="absolute left-1/2 top-1.5 bottom-2.5 w-[1px] bg-gray-200" />
            </div>

            {/* Welcome Text */}
            <div className="text-center mb-3 lg:mb-6 mobile-welcome-spacing" style={{ fontFamily: "'Outfit', sans-serif" }}>
              <h3 className="text-lg md:text-xl font-bold text-gray-900 leading-tight tracking-tight" style={{ fontWeight: 700 }}>
                Welcome to
              </h3>
              <h2 className="text-[32px] md:text-4xl font-black text-[#CB202D] leading-none mt-0.5" style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 1000, letterSpacing: '-0.02em' }}>
                bhookingo!
              </h2>
              <p className="text-[10px] font-semibold text-gray-500 mt-1.5">
                {step === 1 ? (
                  "Login / Signup to continue"
                ) : (
                  <>
                    <span>We've sent a code to +91 {phoneNumber}</span>
                    <button
                      onClick={handleEditNumber}
                      className="p-0.5 ml-1 bg-red-50 hover:bg-red-100 rounded text-[#CB202D] transition-all cursor-pointer inline-flex items-center justify-center align-middle"
                      aria-label="Edit phone number"
                    >
                      <Pencil className="w-2.5 h-2.5" strokeWidth={2.5} />
                    </button>
                  </>
                )}
              </p>
            </div>

            {/* Form Actions */}
            <div>
              {step === 1 ? (
                <form onSubmit={handleSendOTP} className="mobile-gap-spacing">
                  {/* Phone Input Box */}
                  <div className="flex items-center border border-gray-250 focus-within:border-[#CB202D] focus-within:ring-2 focus-within:ring-[#CB202D]/10 rounded-xl px-3.5 py-2.5 bg-white shadow-sm transition-all duration-200 mobile-input-padding">
                    <div className="flex items-center gap-1.5 pr-2.5 border-r border-gray-200 text-xs font-bold text-gray-700 select-none">
                      <span>+91</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      required
                      autoFocus
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      onFocus={(e) => {
                        setTimeout(() => {
                          e.target.scrollIntoView({ behavior: "smooth", block: "center" });
                        }, 300);
                      }}
                      maxLength={10}
                      placeholder="Enter Mobile Number"
                      className="w-full pl-3 text-xs font-bold text-gray-800 outline-none placeholder-gray-400 bg-transparent"
                    />
                  </div>

                  {/* GET OTP Button */}
                  <button
                    type="submit"
                    disabled={loading || phoneNumber.length < 10}
                    className="w-full py-2.5 bg-[#CB202D] hover:bg-[#A31621] disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer mobile-button-padding"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "GET OTP"}
                  </button>

                  {/* OR Separator */}
                  <div className="flex items-center py-1 mobile-divider-spacing">
                    <div className="flex-1 h-px bg-gray-200"></div>
                    <span className="px-3 text-[9px] font-bold text-gray-450 tracking-wider">OR</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>

                  {/* Google & Apple Stack */}
                  <div className="space-y-1.5">
                    {/* Google Sign In */}
                    <div className="w-full flex justify-center">
                      <GoogleLoginButton />
                    </div>

                    {/* Apple Sign In */}
                    <button
                      type="button"
                      className="w-full py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl flex items-center justify-center gap-2.5 font-bold text-gray-700 text-xs shadow-sm cursor-pointer transition-colors mobile-button-padding"
                    >
                      <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.8 16.32 3.98 9.58 8.1 9.28c1.37.1 2.2.78 3.03.8.84-.02 1.86-.8 3.42-.65 1.64.16 2.82.88 3.5 1.95-3.22 1.88-2.69 6.08.28 7.3-.7 1.76-1.52 3.48-3.28 3.6zM12.03 9.25c-.15-2.23 1.66-4.14 3.75-4.25.2 2.52-2.1 4.54-3.75 4.25z" />
                      </svg>
                      <span>Continue with Apple</span>
                    </button>
                  </div>

                  {/* Skip For Now Button */}
                  {blockTimer <= 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem("user_authenticated", "false");
                        clearSessionData();
                        navigate("/food/user");
                      }}
                      className="w-full py-2.5 bg-white border border-[#CB202D]/35 hover:bg-red-50/50 rounded-xl flex items-center justify-center font-bold text-[#CB202D] text-xs transition-colors cursor-pointer mobile-button-padding"
                    >
                      Skip for now
                    </button>
                  )}
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="mobile-gap-spacing">
                  {otpError && (
                    <div className="text-red-600 text-[10px] font-bold text-center tracking-wide">
                      {otpError}
                    </div>
                  )}

                  {/* OTP Inputs */}
                  <div className="flex justify-center gap-3 my-3">
                    {[0, 1, 2, 3].map((index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="tel"
                        inputMode="numeric"
                        required
                        disabled={loading || blockTimer > 0}
                        autoFocus={index === 0}
                        value={otp[index] || ""}
                        onFocus={(e) => {
                          setTimeout(() => {
                            e.target.scrollIntoView({ behavior: "smooth", block: "center" });
                          }, 300);
                        }}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(-1);
                          if (index === 0 && val) {
                            setOtpError("");
                          }
                          if (!val) return;
                          const newOtp = otp.split("");
                          newOtp[index] = val;
                          const combined = newOtp.join("").slice(0, 4);
                          setOtp(combined);
                          if (index < 3 && val) {
                            document.getElementById(`otp-${index + 1}`)?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace") {
                            if (!otp[index] && index > 0) {
                              document.getElementById(`otp-${index - 1}`)?.focus();
                            } else {
                              const newOtp = otp.split("");
                              newOtp[index] = "";
                              setOtp(newOtp.join(""));
                            }
                          }
                        }}
                        className={`w-12 h-12 text-center text-lg font-bold border border-gray-300 shadow-sm rounded-xl outline-none transition-all duration-300 text-gray-900 focus:border-[#CB202D] focus:ring-2 focus:ring-[#CB202D]/10 hover:border-gray-400 ${blockTimer > 0 ? "opacity-50 cursor-not-allowed border-red-350 bg-red-50 text-red-800" : ""
                          }`}
                        placeholder="•"
                      />
                    ))}
                  </div>

                  {/* Resend Cooldown */}
                  <div className="flex flex-col items-center gap-1.5 py-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                      {blockTimer > 0 ? (
                        <span className="text-gray-400 uppercase tracking-wider">Resend SMS</span>
                      ) : resendTimer > 0 ? (
                        <span className="text-gray-400">Resend SMS in <span className="text-gray-800 font-bold">{formatResendTimer(resendTimer)}</span></span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendOTP}
                          className="text-gray-800 hover:text-[#CB202D] hover:underline cursor-pointer font-bold"
                        >
                          Didn't receive SMS? Resend SMS
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Submit OTP Button */}
                  <button
                    type="submit"
                    disabled={loading || otp.length < 4 || blockTimer > 0}
                    className="w-full py-2.5 bg-[#CB202D] hover:bg-[#A31621] disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer mobile-button-padding"
                  >
                    {loading ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Verifying...
                      </span>
                    ) : (
                      "Verify & Continue"
                    )}
                  </button>

                  {blockTimer > 0 && (
                    <div className="text-center w-fit mx-auto px-4 py-2 bg-red-50 rounded-xl border border-red-100 mt-3">
                      <p className="text-[9px] font-bold text-[#CB202D] uppercase tracking-wider">
                        Too many failed attempts
                      </p>
                      <p className="text-[11px] font-bold text-[#CB202D] mt-0.5">
                        Try again after {Math.floor((blockTimer - 1) / 60)}:{String((blockTimer - 1) % 60).padStart(2, '0')}
                      </p>
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Privacy & Terms Header Agreement */}
            <div className="flex items-start justify-center gap-2 mt-2 text-[10px] font-semibold text-gray-500 leading-normal text-center select-none mobile-footer-spacing">
              <Lock className="w-3.5 h-3.5 text-gray-450 mt-0.5 shrink-0" />
              <div className="text-center">
                <span>By continuing, you agree to</span>
                <br />
                <Link to="/user/profile/terms" state={{ from: "/user/auth/login" }} className="text-[#CB202D] hover:underline font-bold">Terms</Link>
                {", "}
                <Link to="/user/profile/privacy" state={{ from: "/user/auth/login" }} className="text-[#CB202D] hover:underline font-bold">Privacy Policy</Link>
                {" & "}
                <Link to="/food/user" className="text-[#CB202D] hover:underline font-bold">Support</Link>
              </div>
            </div>

          </div>

        </div>
      </div>



      {/* Name Collection Modal */}
      <Dialog
        open={showNameModal}
        onOpenChange={(open) => {
          if (!open) return;
          setShowNameModal(true);
        }}
      >
        <DialogContent
          className="sm:max-w-[425px] rounded-3xl border-none p-0 overflow-hidden bg-white"
          showCloseButton={false}
        >
          <div className="bg-gradient-to-br from-[#CB202D] to-[#8C141E] p-8 text-center relative">
            <button
              onClick={handleEditNumber}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-white transition-all active:scale-95 z-20 cursor-pointer"
              aria-label="Close and return to login"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border border-white/30">
              <User className="w-10 h-10 text-white" />
            </div>
            <DialogTitle className="text-2xl font-bold text-white mb-2">Almost there!</DialogTitle>
            <DialogDescription className="text-white/80">
              We'd love to know your name to personalize your experience.
            </DialogDescription>
          </div>

          <form onSubmit={handleNameSubmit} className="p-8 pt-6 space-y-6">
            <div className="space-y-4">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 ml-1">
                Full Name
              </Label>
              <div className="relative group">
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter your name"
                  className="pl-4 h-14 bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#CB202D] transition-all group-hover:border-[#CB202D]/30"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isUpdatingName}
                className="w-full h-14 bg-gradient-to-r from-[#CB202D] to-[#8C141E] text-white rounded-2xl font-bold text-lg shadow-lg shadow-[#CB202D]/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                {isUpdatingName ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Complete Profile"
                )}
              </Button>
              {!pendingVerify ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowNameModal(false)
                    navigate("/user/auth/portal", { replace: true })
                  }}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors py-2 cursor-pointer"
                >
                  Skip for now
                </button>
              ) : (
                <p className="text-xs text-gray-400 text-center">Name is required to complete signup.</p>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Restore/New Account Popup */}
      {showRestorePopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleEditNumber}
          />
          <div
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden p-8 text-center border border-gray-100 relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleEditNumber}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-all active:scale-95 cursor-pointer"
              aria-label="Close and return to login"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-20 h-20 bg-[#CB202D]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Phone className="h-10 w-10 text-[#CB202D]" />
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-3">Account Found!</h3>
            <p className="text-gray-500 mb-8 leading-relaxed text-sm">
              A deleted account for <span className="font-bold text-gray-900">+91 {phoneNumber}</span> was found.
              Do you want to restore your old data or start fresh with a new account?
            </p>

            <div className="space-y-4">
              <button
                onClick={async () => {
                  await processVerify(phoneNumber, otp, "restore");
                  setShowRestorePopup(false);
                }}
                className="w-full h-14 bg-[#CB202D] hover:bg-[#A31621] text-white font-bold rounded-2xl shadow-xl shadow-[#CB202D]/20 transition-all active:scale-[0.98] cursor-pointer"
              >
                Restore My Account
              </button>
              <button
                onClick={async () => {
                  await processVerify(phoneNumber, otp, "new");
                  setShowRestorePopup(false);
                }}
                className="w-full h-14 border border-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-[0.98] cursor-pointer"
              >
                Create New Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
