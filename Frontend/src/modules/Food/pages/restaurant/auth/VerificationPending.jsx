import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Clock3, AlertCircle, ShieldCheck, RefreshCw, LogOut } from "lucide-react"
import { Button } from "@food/components/ui/button"
import { useCompanyName } from "@food/hooks/useCompanyName"
import { restaurantAPI } from "@food/api"
import { toast } from "sonner"
import {
  clearRestaurantPendingPhone,
  getModuleToken,
  getRestaurantPendingPhone,
  clearModuleAuth
} from "@food/utils/auth"

export default function VerificationPending() {
  const companyName = useCompanyName()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [status, setStatus] = useState(location.state?.isRejected ? "rejected" : "pending")
  const [rejectionReason, setRejectionReason] = useState(location.state?.message || "")
  const [hasRejectionHistory, setHasRejectionHistory] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const pendingPhone = useMemo(() => {
    return (
      location.state?.phone ||
      getRestaurantPendingPhone() ||
      ""
    )
  }, [location.state?.phone])

  const checkApprovalStatus = async (showFeedback = false) => {
    const token = getModuleToken("restaurant")
    if (!token) {
      setCheckingStatus(false)
      return
    }

    if (showFeedback) {
      setIsRefreshing(true)
    }

    try {
      const response = await restaurantAPI.getCurrentRestaurant()
      const restaurant =
        response?.data?.data?.restaurant ||
        response?.data?.restaurant ||
        response?.data?.data?.user ||
        response?.data?.user

      const dbStatus = String(restaurant?.status || "").toLowerCase()
      const dbReason = restaurant?.rejectionReason || restaurant?.adminMessage || ""
      const history = restaurant?.rejectionHistory || []
      
      setStatus(dbStatus)
      setRejectionReason(dbReason)
      setHasRejectionHistory(history.length > 0)

      if (dbStatus === "approved") {
        clearRestaurantPendingPhone()
        toast.success("Congratulations! Your restaurant has been approved.")
        navigate("/food/restaurant", { replace: true })
        return
      }

      if (showFeedback) {
        toast.success("Status updated successfully.")
      }
    } catch (err) {
      console.error("Failed to fetch restaurant status:", err)
      if (showFeedback) {
        toast.error("Failed to refresh status. Please try again.")
      }
    } finally {
      setCheckingStatus(false)
      setIsRefreshing(false)
    }
  }

  // Initial status check
  useEffect(() => {
    checkApprovalStatus()

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        checkApprovalStatus()
      }
    }

    window.addEventListener("focus", handleVisibilityOrFocus)
    document.addEventListener("visibilitychange", handleVisibilityOrFocus)

    return () => {
      window.removeEventListener("focus", handleVisibilityOrFocus)
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus)
    }
  }, [navigate])

  // Real-time socket event listeners
  useEffect(() => {
    const handleApprovedEvent = () => {
      clearRestaurantPendingPhone()
      toast.success("Restaurant Approved! Redirecting...")
      navigate("/food/restaurant", { replace: true })
    }

    const handleRejectedEvent = (e) => {
      const detail = e.detail || {}
      setStatus("rejected")
      setRejectionReason(detail.rejectionReason || detail.adminMessage || "Details incorrect")
      toast.error("Your onboarding request has been rejected.")
    }

    window.addEventListener("restaurantOnboardingApproved", handleApprovedEvent)
    window.addEventListener("restaurantOnboardingRejected", handleRejectedEvent)

    return () => {
      window.removeEventListener("restaurantOnboardingApproved", handleApprovedEvent)
      window.removeEventListener("restaurantOnboardingRejected", handleRejectedEvent)
    }
  }, [navigate])

  const handleLogout = () => {
    clearRestaurantPendingPhone()
    clearModuleAuth("restaurant")
    navigate("/food/restaurant/login", { replace: true })
  }

  // Derived content based on status
  const isRejectedState = status === "rejected"
  const isResubmittedState = status === "pending" && hasRejectionHistory

  return (
    <div className="min-h-screen bg-[#f8fafc] px-6 py-10 flex items-center justify-center">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] relative overflow-hidden">
          
          {/* Header Status Badge & Icon */}
          <div className="mb-6 flex flex-col items-center">
            {isRejectedState ? (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-4 animate-bounce">
                  <AlertCircle className="h-8 w-8" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-600">
                  Request Rejected
                </p>
              </>
            ) : isResubmittedState ? (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-4">
                  <Clock3 className="h-8 w-8 animate-pulse" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">
                  Updated Request Under Review
                </p>
              </>
            ) : (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-4">
                  <Clock3 className="h-8 w-8 animate-spin-slow" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">
                  Verification Pending
                </p>
              </>
            )}
          </div>

          {/* Core Content */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">
              {isRejectedState ? (
                "Your onboarding request was rejected"
              ) : isResubmittedState ? (
                "Your updated request is under review"
              ) : (
                "Your restaurant is under review"
              )}
            </h1>
            
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {isRejectedState ? (
                "Please review the reason provided below, update your details/documents, and resubmit for verification."
              ) : isResubmittedState ? (
                "We received your updated onboarding details. Our team is re-evaluating your restaurant and will activate your dashboard once verified."
              ) : (
                `${companyName} received your onboarding details successfully. Our team will verify your restaurant and activate your dashboard once approval is complete.`
              )}
            </p>

            {checkingStatus && !isRefreshing ? (
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Checking latest approval status...
              </p>
            ) : null}
          </div>

          {/* Rejection Details Callout */}
          {isRejectedState && rejectionReason && (
            <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-left">
              <p className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-1">
                Rejection Reason
              </p>
              <p className="text-sm font-medium text-rose-700 leading-relaxed">
                "{rejectionReason}"
              </p>
            </div>
          )}

          {/* Next Steps Card */}
          {!isRejectedState && (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600 shrink-0" />
                <div className="text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">What happens next</p>
                  <p className="mt-1">We will notify you once the verification is approved.</p>
                  {pendingPhone ? (
                    <p className="mt-2 text-slate-500 text-xs">
                      Registered phone: <span className="font-medium text-slate-700">{pendingPhone}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* Interactive Actions */}
          <div className="space-y-3">
            {isRejectedState ? (
              <Button
                className="h-12 w-full rounded-xl bg-gradient-to-br from-[#B80B3D] to-[#66001D] text-base font-semibold hover:opacity-95 shadow-md shadow-rose-900/10 text-white"
                onClick={() => navigate("/food/restaurant/onboarding")}
              >
                Update & Resubmit
              </Button>
            ) : null}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-medium"
                onClick={() => checkApprovalStatus(true)}
                disabled={isRefreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? "Refreshing..." : "Refresh Status"}
              </Button>
              
              <Button
                variant="ghost"
                className="h-11 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
