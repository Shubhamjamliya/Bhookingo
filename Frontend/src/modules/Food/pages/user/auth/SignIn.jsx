import { useState, useEffect, useRef } from "react"
import { useNavigate, Link, useSearchParams } from "react-router-dom"
import { AlertCircle, Loader2 } from "lucide-react"
import AnimatedPage from "@food/components/user/AnimatedPage"
import { Button } from "@food/components/ui/button"
import { Input } from "@food/components/ui/input"
import { authAPI } from "@food/api"
import loginBanner from "@food/assets/loginbanner.png"
import GoogleLoginButton from "@food/components/user/GoogleLoginButton"
const debugLog = (...args) => { }
const debugWarn = (...args) => { }
const debugError = (...args) => { }


export default function SignIn() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [formData, setFormData] = useState({
    phone: "",
    countryCode: "+91", // required; default +91 for India
  })

  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const submittingRef = useRef(false)

  useEffect(() => {
    const stored = sessionStorage.getItem("userAuthData")
    if (!stored) return

    try {
      const data = JSON.parse(stored)
      const fullPhone = String(data.phone || "").trim()
      const phoneDigits = fullPhone.replace(/^\+91\s*/, "").replace(/\D/g, "").slice(0, 10)

      setFormData((prev) => ({
        ...prev,
        phone: phoneDigits || prev.phone,
      }))
    } catch (err) {
      debugError("Error parsing stored auth data:", err)
    }
  }, [])

  const validatePhone = (phone) => {
    if (!phone.trim()) return "Phone number is required"
    const cleanPhone = phone.replace(/\D/g, "")
    if (!/^\d{10}$/.test(cleanPhone)) return "Phone number must be exactly 10 digits"
    return ""
  }

  const handleChange = (e) => {
    const { name } = e.target
    let { value } = e.target

    if (name === "phone") {
      value = value.replace(/\D/g, "").slice(0, 10)
      setError(validatePhone(value))
    }

    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const phoneError = validatePhone(formData.phone)
    setError(phoneError)
    if (phoneError) return
    if (submittingRef.current) return
    submittingRef.current = true
    setIsLoading(true)
    setError("")

    try {
      const countryCode = formData.countryCode?.trim() || "+91"
      const phoneDigits = String(formData.phone ?? "").replace(/\D/g, "").slice(0, 10)
      if (phoneDigits.length !== 10) {
        setError("Phone number must be exactly 10 digits")
        setIsLoading(false)
        submittingRef.current = false
        return
      }
      const fullPhone = `${countryCode} ${phoneDigits}`
      await authAPI.sendOTP(fullPhone, "login", null)

      const ref = String(searchParams.get("ref") || "").trim()
      const authData = {
        method: "phone",
        phone: fullPhone,
        email: null,
        name: null,
        referralCode: ref || null,
        isSignUp: false,
        module: "user",
      }

      sessionStorage.setItem("userAuthData", JSON.stringify(authData))
      navigate("/food/user/auth/otp")
    } catch (apiError) {
      const message =
        apiError?.response?.data?.message ||
        apiError?.response?.data?.error ||
        "Failed to send OTP. Please try again."
      setError(message)
    } finally {
      setIsLoading(false)
      submittingRef.current = false
    }
  }

  return (
    <AnimatedPage className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center p-4">
      {/* Background decoration (desktop only) */}
      <div className="fixed inset-0 z-0 hidden md:block opacity-40">
        <img src={loginBanner} alt="" className="w-full h-full object-cover blur-sm" />
        <div className="absolute inset-0 bg-white/60 dark:bg-black/80" />
      </div>

      <div className="w-full max-w-[450px] bg-surface dark:bg-[#1a1a1a] rounded-xl shadow-2xl relative z-10 overflow-hidden border border-border dark:border-gray-800">
        {/* Banner (Mobile Only) */}
        <div className="md:hidden w-full h-[180px] relative">
          <img src={loginBanner} alt="Food Banner" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#1a1a1a] to-transparent" />
        </div>

        <div className="p-6 sm:p-8 md:p-10 space-y-6 md:space-y-8">
          <div className="text-center space-y-2 md:space-y-3">
            <img src="/bhookingo-logo.png" alt="Bhookingo Logo" className="h-20 mx-auto object-contain mb-4 rounded-xl shadow-sm" />
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary dark:text-white leading-tight">
              Login or Signup
            </h2>
            <p className="text-sm sm:text-base text-text-secondary dark:text-text-secondary">
              Enter your phone number to continue
            </p>
          </div>

          <form id="user-signin-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <div className="relative flex items-center">
                <div className="flex items-center px-4 h-12 md:h-14 border border-border dark:border-gray-700 bg-surface dark:bg-[#2a2a2a] text-text-primary dark:text-white rounded-lg border-r-0 rounded-r-none font-medium">
                  <span>+91</span>
                </div>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`flex-1 h-12 md:h-14 text-lg bg-surface dark:bg-[#1a1a1a] text-text-primary dark:text-white border-border dark:border-gray-700 rounded-lg rounded-l-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary ${error ? "border-red-500" : ""} transition-all`}
                  aria-invalid={error ? "true" : "false"}
                />
              </div>

              {error && (
                <div className="flex items-center gap-1.5 text-xs text-red-500 pl-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              form="user-signin-form"
              className="w-full h-12 md:h-14 bg-primary hover:bg-primary-dark text-white font-bold text-base md:text-lg rounded-lg transition-all hover:shadow-lg active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>

          {/* Social login separator */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border dark:border-gray-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface dark:bg-[#1a1a1a] px-3 text-text-secondary dark:text-text-secondary font-medium">
                or
              </span>
            </div>
          </div>

          {/* Social login buttons */}
          <div className="grid grid-cols-1 gap-3">
            <GoogleLoginButton />
          </div>

          <div className="text-center text-xs md:text-sm text-text-secondary dark:text-text-secondary pt-2">
            <p className="mt-8 text-center text-xs text-text-secondary dark:text-text-secondary max-w-xs mx-auto">
              By continuing, you agree to our{" "}
              <Link to="/user/profile/terms" className="underline hover:text-text-primary dark:hover:text-gray-100 transition-colors">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/user/profile/privacy" className="underline hover:text-text-primary dark:hover:text-gray-100 transition-colors">
                Privacy Policy
              </Link>
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              <span className="text-gray-300 dark:text-gray-700">•</span>
              <Link to="/profile/refund" className="underline hover:text-text-primary dark:hover:text-gray-100 transition-colors">
                Content Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AnimatedPage>
  )
}

