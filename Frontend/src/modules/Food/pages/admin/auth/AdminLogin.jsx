import { useState, useEffect, useRef } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { adminAPI } from "@food/api"
import { setAuthData } from "@food/utils/auth"
import { ShieldCheck, ArrowRight, Loader2, Mail, Lock, Eye, EyeOff, BarChart2, Crown } from "lucide-react"
import { toast } from "sonner"
import adminBg from "@/assets/adminbg.jpg"

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const submitting = useRef(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Please fill in all fields")
      return
    }
    if (submitting.current) return
    submitting.current = true
    setLoading(true)

    try {
      const response = await adminAPI.login(email.trim(), password)
      const data = response?.data?.data || response?.data || {}

      const accessToken = data.accessToken
      const adminUser = data.user || data.admin
      const refreshToken = data.refreshToken ?? null

      if (!accessToken || !adminUser || !refreshToken) {
        throw new Error("Invalid response from server")
      }

      setAuthData("admin", accessToken, adminUser, refreshToken)
      toast.success("Welcome, Administrator")
      navigate("/admin/food", { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Login failed. Check your credentials."
      toast.error(msg)
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex font-['Poppins']">
      
      {/* Left Side (Dark Image Banner) */}
      <div className="hidden lg:flex w-[65%] relative bg-[#0a0a0a] rounded-r-[3rem] overflow-hidden shadow-2xl z-10 flex-col p-12">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={adminBg} 
            className="w-full h-full object-cover"
            alt="Food Background"
          />
          {/* Subtle dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/50" />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo Text */}
          <div className="mb-16">
            <h2 className="text-3xl font-black text-[#ff5a00] tracking-tight flex items-center gap-1.5">
              <span className="bg-[#ff5a00] text-white w-8 h-8 rounded flex items-center justify-center text-xl font-bold">b</span>
              bhookingo
            </h2>
          </div>

          {/* Main Headline */}
          <div className="max-w-2xl mt-8">
            <h1 className="text-6xl xl:text-[5rem] font-black leading-tight tracking-tight text-white mb-6 font-['Outfit']">
              Control Your <br/>
              <span className="text-[#ff5a00]">Empire</span>
            </h1>
            <p className="text-gray-300 text-lg xl:text-xl font-medium leading-relaxed max-w-lg mb-12">
              Manage restaurants, orders, and users from the centralized Bhookingo Admin Dashboard.<br/><br/>
              Gain insights, drive growth, and deliver excellence.
            </p>

            {/* Features Row */}
            <div className="grid grid-cols-3 gap-8 mt-12">
              <div>
                <div className="w-12 h-12 rounded-full border border-[#ff5a00]/30 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5 text-[#ff5a00]" />
                </div>
                <h3 className="text-white font-bold text-sm mb-2">Secure Access</h3>
                <p className="text-gray-400 text-xs leading-relaxed">Advanced encryption<br/>for your data</p>
              </div>
              <div>
                <div className="w-12 h-12 rounded-full border border-[#ff5a00]/30 flex items-center justify-center mb-4">
                  <BarChart2 className="w-5 h-5 text-[#ff5a00]" />
                </div>
                <h3 className="text-white font-bold text-sm mb-2">Real-time Insights</h3>
                <p className="text-gray-400 text-xs leading-relaxed">Make data-driven<br/>decisions faster</p>
              </div>
              <div>
                <div className="w-12 h-12 rounded-full border border-[#ff5a00]/30 flex items-center justify-center mb-4">
                  <Crown className="w-5 h-5 text-[#ff5a00]" />
                </div>
                <h3 className="text-white font-bold text-sm mb-2">Premium Tools</h3>
                <p className="text-gray-400 text-xs leading-relaxed">Powerful features for<br/>your business</p>
              </div>
            </div>
          </div>

          {/* Bottom Quote Card */}
          <div className="mt-auto pt-16">
            <div className="bg-[#1a1a1a]/80 backdrop-blur-md rounded-2xl p-6 border border-white/5 inline-block max-w-sm">
              <p className="text-gray-300 text-sm font-medium leading-relaxed mb-4">
                <span className="text-[#ff5a00] text-xl font-serif mr-2">"</span>
                Empowering restaurant businesses with technology & trust.
              </p>
              <div className="w-8 h-1 bg-[#ff5a00] rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Side (Login Box) */}
      <div className="w-full lg:w-[35%] flex flex-col items-center justify-center p-6 relative bg-[#F9FAFB]">
        {/* Top Badge */}
        <div className="absolute top-10 right-10 hidden xl:flex items-center gap-4 bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100">
          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
            <Crown className="w-5 h-5 text-[#ff5a00]" />
          </div>
          <div>
            <p className="text-[#ff5a00] font-bold text-sm">Premium Dashboard</p>
            <p className="text-gray-500 text-xs">For restaurant champions</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[420px]"
        >
          {/* Main Card */}
          <div className="bg-white rounded-[2rem] shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-gray-100 p-8 sm:p-10 w-full">
            
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-6 h-6 text-[#ff5a00]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2 font-['Outfit'] tracking-tight">
                Admin Login
              </h2>
              <p className="text-sm text-gray-500 font-medium">
                Enter your credentials to continue
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3.5 bg-white text-gray-900 border border-gray-200 focus:border-[#ff5a00]/50 focus:ring-2 focus:ring-[#ff5a00]/10 rounded-xl outline-none transition-all placeholder:text-gray-300 font-medium text-sm"
                      placeholder="admin@bhookingo.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-11 pr-11 py-3.5 bg-white text-gray-900 border border-gray-200 focus:border-[#ff5a00]/50 focus:ring-2 focus:ring-[#ff5a00]/10 rounded-xl outline-none transition-all placeholder:text-gray-300 font-medium text-sm"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <Link to="/admin/forgot-password" className="text-xs font-bold text-[#ff5a00] hover:text-[#e04f00] transition-colors">Forgot Password?</Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-4 bg-gradient-to-r from-[#ff3c00] to-[#ff5a00] hover:from-[#e03400] hover:to-[#e04f00] disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-xl font-bold text-[15px] shadow-[0_8px_20px_-6px_rgba(255,90,0,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 group overflow-hidden relative"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Enter Dashboard</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 flex justify-center items-center gap-2 text-gray-400">
            <Lock className="w-4 h-4" />
            <span className="text-xs font-medium">Your data is 100% secure and protected</span>
          </div>

        </motion.div>
      </div>
    </div>
  )
}


