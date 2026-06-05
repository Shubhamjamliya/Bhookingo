import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import useRestaurantBackNavigation from "@food/hooks/useRestaurantBackNavigation"
import { motion, AnimatePresence } from "framer-motion"
import Lenis from "lenis"
import { ArrowLeft, Truck, X, CheckCircle, AlertCircle } from "lucide-react"
import { Switch } from "@food/components/ui/switch"
import { Card, CardContent } from "@food/components/ui/card"
import { restaurantAPI } from "@food/api"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


const RESTAURANT_ONLINE_STATUS_KEY = "restaurant_online_status"

  const navigate = useNavigate()
  const goBack = useRestaurantBackNavigation()
  const [showWarning, setShowWarning] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingStatus, setPendingStatus] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [savingStatus, setSavingStatus] = useState(false)

  // Lenis smooth scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [])

  const syncStatusLocally = (status) => {
    const value = Boolean(status)
    try {
      localStorage.setItem(RESTAURANT_ONLINE_STATUS_KEY, JSON.stringify(value))
    } catch (error) {
    }

    window.dispatchEvent(new CustomEvent("restaurantStatusChanged", {
      detail: { isOnline: value }
    }))
  }

  useEffect(() => {
    let cancelled = false

      try {
        const response = await restaurantAPI.getCurrentRestaurant()
        const restaurant =
          response?.data?.data?.restaurant ||
          response?.data?.restaurant ||
          null
        const nextStatus = restaurant?.isAcceptingOrders === true
        if (!cancelled) {
          syncStatusLocally(nextStatus)
        }
      } catch (error) {
        try {
          if (!cancelled && savedStatus !== null) {
          }
        } catch (_) {}

        if (error.code !== 'ERR_NETWORK' && error.code !== 'ECONNABORTED' && !error.message?.includes('timeout')) {
        }
      }
    }


    return () => {
      cancelled = true
    }
  }, [])

  // Keep backward-compatible local key in sync if another screen updates it.
  useEffect(() => {
    try {
      if (savedStatus !== null) {
      }
    } catch (error) {
      // Only log error if it's not a network/timeout error (backend might be down/slow)
      if (error.code !== 'ERR_NETWORK' && error.code !== 'ECONNABORTED' && !error.message?.includes('timeout')) {
      }
    }
  }, [])

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (showConfirmDialog) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showConfirmDialog])


  const showToast = (message) => {
    setToastMessage(message)
    setShowSuccessToast(true)
    setTimeout(() => setShowSuccessToast(false), 3000)
  }

    const value = Boolean(status)
    syncStatusLocally(value)

    if (value) {
    } else {
    }
  }

    if (savingStatus) return

    // If turning ON and outside outlet timings, show warning
      setPendingStatus(checked)
      setShowConfirmDialog(true)
      return
    }

    // If turning OFF, show confirmation
      setPendingStatus(checked)
      setShowConfirmDialog(true)
      return
    }

    // Otherwise, update directly
  }

    const nextStatus = Boolean(status)

    try {
      setSavingStatus(true)
      await restaurantAPI.updateAcceptingOrders(nextStatus)
    } catch (error) {
      syncStatusLocally(previousStatus)
      return
    } finally {
      setSavingStatus(false)
    }
  }

  const handleConfirmStatusChange = () => {
    setShowConfirmDialog(false)
    
    // Show warning if enabled outside timings
      setShowWarning(true)
      setTimeout(() => setShowWarning(false), 5000)
    }
  }

  const handleCancelStatusChange = () => {
    setShowConfirmDialog(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button 
            onClick={goBack}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <div className="flex-1">
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Truck className="w-5 h-5 text-gray-900" />
                </div>
                <div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <motion.div 
                    className="flex items-center gap-2"
                    initial={false}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="text-sm text-gray-500">
                    </p>
                  </motion.div>
                  <AnimatePresence>
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-xs text-orange-600 mt-2 flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                        You are outside outlet timings
                      </motion.p>
                    )}
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-xs text-[#B80B3D] mt-2 animate-pulse flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                <Switch
                  disabled={savingStatus}
                  className="ml-4 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-4"
        >
          <Card className="bg-blue-50 border-blue-200 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-gray-700">
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-[100]"
              onClick={handleCancelStatusChange}
            />
            
            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 flex items-center justify-center z-[100] px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
                <div className="flex justify-center mb-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    pendingStatus ? "bg-orange-100" : "bg-red-100"
                  }`}>
                    <AlertCircle className={`w-10 h-10 ${
                      pendingStatus ? "text-orange-600" : "text-[#B80B3D]"
                    }`} />
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
                </h3>
                
                <p className="text-sm text-gray-600 mb-6 text-center">
                  {pendingStatus ? (
                    ) : (
                    )
                  ) : (
                  )}
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelStatusChange}
                    className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmStatusChange}
                    className={`flex-1 px-4 py-3 font-semibold rounded-lg transition-colors ${
                      pendingStatus 
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-gradient-to-br from-[#B80B3D] to-[#66001D] hover:bg-red-700 text-white"
                    }`}
                  >
                    {pendingStatus ? "Enable" : "Disable"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-4 w-full max-w-md"
          >
            <div className="bg-gradient-to-br from-[#B80B3D] to-[#66001D] text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              <p className="text-sm font-medium flex-1">{toastMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}








