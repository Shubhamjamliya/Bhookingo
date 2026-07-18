import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@food/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@food/components/ui/card"
import { Input } from "@food/components/ui/input"
import { Label } from "@food/components/ui/label"
import { Mail, ArrowLeft, Shield, Phone } from "lucide-react"
import quickSpicyLogo from "@food/assets/quicky-spicy-logo.png"
import { adminAPI } from "@food/api"
import { useCompanyName } from "@food/hooks/useCompanyName"
import { loadBusinessSettings } from "@food/utils/businessSettings"
import { toast } from "sonner"

export default function AdminForgotPassword() {
  const companyName = useCompanyName()
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: Recovery details, 2: OTP verify, 3: Reset password
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [resetToken, setResetToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [resendTimer, setResendTimer] = useState(0)
  const [logoUrl, setLogoUrl] = useState(quickSpicyLogo)
  const inputRefs = useRef(Array(6).fill(null).map(() => null))

  // Fetch business settings logo on mount
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const settings = await loadBusinessSettings()
        if (settings?.logo?.url) {
          setLogoUrl(settings.logo.url)
        }
      } catch (error) {
        // Silently fail
      }
    }
    fetchLogo()

    // Listen for business settings updates
    const handleSettingsUpdate = async () => {
      const settings = await loadBusinessSettings();
      if (settings?.logo?.url) {
        setLogoUrl(settings.logo.url);
      }
    };
    window.addEventListener('businessSettingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('businessSettingsUpdated', handleSettingsUpdate);
  }, [])

  // Enforce secure step access: Step 3 requires valid resetToken
  useEffect(() => {
    if (step === 3 && !resetToken) {
      setError("Please complete verification first.")
      setStep(1)
    }
  }, [step, resetToken])

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setError("")

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPhone = phone.trim()
    if (!trimmedEmail || !trimmedPhone) {
      setError("Both email and mobile number are required")
      return
    }

    setIsLoading(true)
    try {
      await adminAPI.requestForgotPasswordOtp(trimmedEmail, trimmedPhone)
      setEmail(trimmedEmail)
      setStep(2)
      setResendTimer(60)
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "The provided recovery information is invalid."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text")
    const digits = pastedData.replace(/\D/g, "").slice(0, 6).split("")
    const newOtp = [...otp]
    digits.forEach((digit, i) => {
      if (i < 6) {
        newOtp[i] = digit
      }
    })
    setOtp(newOtp)
    if (digits.length === 6) {
      inputRefs.current[5]?.focus()
    } else {
      inputRefs.current[digits.length]?.focus()
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    setError("")

    const otpCode = otp.join("")
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit OTP")
      return
    }

    setIsLoading(true)
    try {
      const res = await adminAPI.verifyForgotPasswordOtp(email, otpCode)
      if (res?.data?.success && res.data.data?.resetToken) {
        setResetToken(res.data.data.resetToken)
        setStep(3)
      } else {
        setError("The verification code is invalid or has expired.")
      }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "The verification code is invalid or has expired."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (resendTimer > 0) return

    setIsLoading(true)
    setError("")
    try {
      await adminAPI.requestForgotPasswordOtp(email, phone)
      setResendTimer(60)
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to request new code. Please wait."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!resetToken) {
      setError("Verification expired. Please restart the process.")
      setStep(1)
      return
    }

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields")
      return
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)
    try {
      await adminAPI.resetPasswordWithOtp(resetToken, newPassword)
      toast.success("Password reset successfully. Please login again.")
      navigate("/admin/login", {
        state: { message: "Password reset successfully. Please login with your new password." },
      })
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to reset password. Please try again."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-neutral-50 via-gray-100 to-white relative">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-neutral-900/5 blur-3xl" />
        <div className="absolute right-[-80px] bottom-[-80px] h-72 w-72 rounded-full bg-gray-700/5 blur-3xl" />
      </div>

      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg bg-white/90 backdrop-blur border-neutral-200 shadow-2xl rounded-3xl">
          <CardHeader className="pb-4">
            <div className="flex w-full items-center gap-4 sm:gap-5">
              <div className="flex h-14 w-28 shrink-0 items-center justify-center rounded-xl bg-gray-900/5 ring-1 ring-neutral-200">
                <img
                  src={logoUrl || quickSpicyLogo}
                  alt={companyName}
                  className="h-10 w-24 object-contain"
                  loading="lazy"
                  onError={(e) => {
                    if (e.target.src !== quickSpicyLogo) {
                      e.target.src = quickSpicyLogo
                    }
                  }}
                />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <CardTitle className="text-2xl leading-tight text-gray-900 font-bold">
                  {step === 1 && "Forgot Password"}
                  {step === 2 && "Verify OTP"}
                  {step === 3 && "Reset Password"}
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  {step === 1 && "Enter registered recovery details to verify your identity"}
                  {step === 2 && "Enter the 6-digit code sent to both channels"}
                  {step === 3 && "Configure your new secure password"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          {/* Wizard Progress Bar */}
          <div className="px-6 mb-6">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-200 dark:bg-gray-800 -z-10" />
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-rose-600 transition-all duration-500 -z-10"
                style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
              />

              {/* Step 1 indicator */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  step >= 1 ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-gray-300 text-gray-500"
                }`}>
                  1
                </div>
                <span className="text-[9px] font-bold text-gray-500 mt-1 uppercase tracking-wider">Recovery</span>
              </div>

              {/* Step 2 indicator */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  step >= 2 ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-gray-300 text-gray-500"
                }`}>
                  2
                </div>
                <span className="text-[9px] font-bold text-gray-500 mt-1 uppercase tracking-wider">Verify</span>
              </div>

              {/* Step 3 indicator */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  step >= 3 ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-gray-300 text-gray-500"
                }`}>
                  3
                </div>
                <span className="text-[9px] font-bold text-gray-500 mt-1 uppercase tracking-wider">Reset</span>
              </div>
            </div>
          </div>

          <CardContent className="text-left">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-6 font-semibold">
                {error}
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-900">
                      Registered Email Address
                    </Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                        <Mail className="h-5 w-5" />
                      </span>
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@domain.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        autoComplete="email"
                        required
                        className="h-12 pl-10 text-base rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-semibold text-gray-900">
                      Registered Mobile Number
                    </Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                        <Phone className="h-5 w-5" />
                      </span>
                      <Input
                        id="phone"
                        type="text"
                        placeholder="+919999999999"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isLoading}
                        required
                        className="h-12 pl-10 text-base rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full bg-black hover:bg-neutral-900 text-white font-semibold transition-colors rounded-xl border-none"
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying recovery..." : "Send Verification Code"}
                </Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-base font-semibold text-gray-900 text-center block">
                    Enter Verification Code
                  </Label>
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => {
                          if (inputRefs.current) {
                            inputRefs.current[index] = el
                          }
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={index === 0 ? handleOtpPaste : undefined}
                        className="h-14 w-14 text-center text-2xl font-bold border-2 focus-visible:ring-2 focus-visible:ring-black rounded-xl"
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Code has been sent to both your registered email and mobile number.
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-semibold"
                    disabled={isLoading}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Step 1
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || isLoading}
                    className="text-black hover:underline font-semibold disabled:text-gray-400 disabled:no-underline"
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
                  </button>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full bg-black hover:bg-neutral-900 text-white font-semibold transition-colors rounded-xl border-none"
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Verify Code"}
                </Button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-semibold text-gray-900">
                    New Password
                  </Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                      <Shield className="h-5 w-5" />
                    </span>
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isLoading}
                      autoComplete="new-password"
                      required
                      className="h-12 pl-10 pr-10 text-base rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500 hover:text-gray-800"
                      disabled={isLoading}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-900">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                      <Shield className="h-5 w-5" />
                    </span>
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      autoComplete="new-password"
                      required
                      className="h-12 pl-10 pr-10 text-base rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500 hover:text-gray-800"
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full bg-black hover:bg-neutral-900 text-white font-semibold transition-colors rounded-xl border-none"
                  disabled={isLoading}
                >
                  {isLoading ? "Resetting password..." : "Reset Password"}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex-col items-start gap-2 text-sm text-gray-500">
            <button
              onClick={() => navigate("/admin/login")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
