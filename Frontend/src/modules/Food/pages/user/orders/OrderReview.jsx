import { useParams, useNavigate } from "react-router-dom"
import React, { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import {
  ArrowLeft,
  Star,
  Loader2,
  Car,
  Wifi,
  Users,
  Zap,
  Check,
  Edit2
} from "lucide-react"
import AnimatedPage from "@food/components/user/AnimatedPage"
import { Card, CardContent } from "@food/components/ui/card"
import { Button } from "@food/components/ui/button"
import { Textarea } from "@food/components/ui/textarea"
import { orderAPI } from "@food/api"

// Restroom SVG Icon matching Restroom Sign
const RestroomIcon = (props) => (
  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 22V12h6v10M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM8 8h8a2 2 0 0 1 2 2v6h-3v4H9v-4H6v-6a2 2 0 0 1 2-2Z" />
  </svg>
)

export default function OrderReview() {
  const { orderId } = useParams()
  const navigate = useNavigate()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Review states
  const [overallRating, setOverallRating] = useState(null)
  const [feedbackText, setFeedbackText] = useState("")

  const [parkingRating, setParkingRating] = useState(null)
  const [wifiRating, setWifiRating] = useState(null)
  const [familyFriendlyRating, setFamilyFriendlyRating] = useState(null)
  const [evChargingRating, setEvChargingRating] = useState(null)
  const [washroomRating, setWashroomRating] = useState(null)

  const hasSubmittedReview = useMemo(() => {
    return typeof (order?.ratings?.restaurant?.rating || order?.restaurantRating) === 'number' && (order?.ratings?.restaurant?.rating || order?.restaurantRating) > 0
  }, [order])

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true)
        const response = await orderAPI.getOrderDetails(orderId)
        if (response?.data?.success && response?.data?.data?.order) {
          const fetchedOrder = response.data.data.order
          setOrder(fetchedOrder)
          
          // Populate states
          const currentRating = fetchedOrder.ratings?.restaurant?.rating || fetchedOrder.restaurantRating || null
          setOverallRating(currentRating)
          setFeedbackText(fetchedOrder.ratings?.restaurant?.comment || "")

          setParkingRating(fetchedOrder.ratings?.parking?.rating || null)
          setWifiRating(fetchedOrder.ratings?.wifi?.rating || null)
          setFamilyFriendlyRating(fetchedOrder.ratings?.familyFriendly?.rating || null)
          setEvChargingRating(fetchedOrder.ratings?.evCharging?.rating || null)
          setWashroomRating(fetchedOrder.ratings?.washroom?.rating || null)

          // If review exists, default to read-only view mode
          if (typeof currentRating === 'number' && currentRating > 0) {
            setIsEditing(false)
          } else {
            setIsEditing(true)
          }
        } else {
          setError("Order not found")
        }
      } catch (err) {
        console.error("Error loading order review details:", err)
        setError(err.response?.data?.message || "Failed to load order details")
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [orderId])

  const handleSubmit = async () => {
    if (overallRating === null) {
      toast.error("Please select a rating score first")
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        restaurantRating: overallRating,
        restaurantComment: feedbackText || undefined,
      }

      const facilitiesList = [
        { key: 'parking', rating: parkingRating },
        { key: 'wifi', rating: wifiRating },
        { key: 'familyFriendly', rating: familyFriendlyRating },
        { key: 'evCharging', rating: evChargingRating },
        { key: 'washroom', rating: washroomRating },
      ]

      const restaurantFacilities = order?.restaurantId?.facilities || order?.restaurant?.facilities || {}

      facilitiesList.forEach(fac => {
        const isSupported = restaurantFacilities[fac.key] === true
        if (isSupported) {
          payload[fac.key] = {
            rating: fac.rating,
            availability: true
          }
        }
      })

      console.log("Submitting Review", payload);
      const response = await orderAPI.submitOrderRatings(order.mongoId || order._id || order.id, payload)
      if (response?.data?.success) {
        toast.success("Thank you for your feedback!")
        // Mark as reviewed in localStorage
        const localCompletedKey = `order_review_shown_${orderId}`
        window.localStorage.setItem(localCompletedKey, 'true')
        
        // Refresh detail view
        const refreshedOrder = response.data.data?.order || response.data?.order
        if (refreshedOrder) {
          setOrder(refreshedOrder)
        }
        setIsEditing(false)
      } else {
        toast.error(response.data?.message || "Failed to save ratings")
      }
    } catch (err) {
      console.error("Error submitting ratings:", err)
      toast.error(err.response?.data?.message || "Failed to submit ratings")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] p-4 flex flex-col items-center justify-center">
        <p className="text-rose-500 font-bold mb-4">{error || "Failed to load order"}</p>
        <Button onClick={() => navigate('/user/orders')} className="bg-[var(--primary)] text-white">
          Back to Orders
        </Button>
      </div>
    )
  }

  const restaurantName = order?.restaurantId?.restaurantName || order?.restaurant || 'Restaurant'
  const restaurantImage = order?.restaurantId?.profileImage || order?.restaurantImage || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400"
  const orderNumber = order?.orderId || order?._id
  const orderDateStr = order?.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'
  
  const restaurantFacilities = order?.restaurantId?.facilities || order?.restaurant?.facilities || {}
  const activeFacilities = [
    { key: 'parking', label: 'Parking', icon: Car, rating: parkingRating, setRating: setParkingRating, bgClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400' },
    { key: 'wifi', label: 'WiFi', icon: Wifi, rating: wifiRating, setRating: setWifiRating, bgClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400' },
    { key: 'familyFriendly', label: 'Family Friendly', icon: Users, rating: familyFriendlyRating, setRating: setFamilyFriendlyRating, bgClass: 'bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400' },
    { key: 'evCharging', label: 'EV Charging', icon: Zap, rating: evChargingRating, setRating: setEvChargingRating, bgClass: 'bg-amber-50 text-amber-500 dark:bg-amber-950/20 dark:text-amber-400' },
    { key: 'washroom', label: 'Restroom', icon: RestroomIcon, rating: washroomRating, setRating: setWashroomRating, bgClass: 'bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400' },
  ].filter(f => restaurantFacilities[f.key] === true)

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-slate-50/50 dark:bg-[#0a0a0a] pb-24 font-sans text-left">
        {/* Top Header */}
        <div className="bg-white dark:bg-[#121212] p-4 flex items-center sticky top-0 z-10 border-b border-gray-100 dark:border-gray-800">
          <button onClick={() => navigate('/user/orders')} className="p-1 rounded-full hover:bg-gray-150 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-gray-100" />
          </button>
          <h1 className="ml-3 text-xl font-bold text-gray-900 dark:text-gray-100">
            Rate Order
          </h1>
          {hasSubmittedReview && !isEditing && (
            <button 
              onClick={() => setIsEditing(true)} 
              className="ml-auto flex items-center gap-1 text-xs text-[var(--primary)] font-bold hover:opacity-80 border border-[var(--primary)]/30 rounded-lg px-2.5 py-1.5 transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Review
            </button>
          )}
        </div>

        <div className="max-w-xl mx-auto p-4 space-y-5">
          {/* Card 1: Restaurant Meta */}
          <Card className="rounded-3xl border border-slate-100 dark:border-gray-850 bg-white dark:bg-[#121212] shadow-sm overflow-hidden">
            <CardContent className="p-5 flex gap-4">
              <img
                src={restaurantImage}
                alt={restaurantName}
                className="w-20 h-20 rounded-2xl object-cover border border-slate-100 dark:border-gray-850"
                onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400"; }}
              />
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-lg truncate">
                  {restaurantName}
                </h3>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-1 font-medium">
                  Order ID: <span className="font-mono text-slate-700 dark:text-gray-300">{orderNumber}</span>
                </p>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5 font-medium">
                  Date: {orderDateStr}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Overall Ratings & Individual Features Ratings */}
          <Card className="rounded-3xl border border-slate-100 dark:border-gray-850 bg-white dark:bg-[#121212] shadow-sm">
            <CardContent className="p-6 space-y-6">
              {/* Overall Rating Section */}
              <div className="text-center space-y-4">
                <p className="font-extrabold text-slate-800 dark:text-gray-250 text-sm">
                  How was the restaurant overall?
                </p>
                
                {hasSubmittedReview && !isEditing && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-black uppercase rounded-full border border-green-500/20 mb-2">
                    <Check className="w-3.5 h-3.5" />
                    Review Submitted
                  </div>
                )}

                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={`star-${star}`}
                      disabled={!isEditing}
                      onClick={() => setOverallRating(star)}
                      className={`p-1 transition-transform ${isEditing ? 'hover:scale-110 active:scale-95' : 'cursor-default'}`}
                    >
                      <Star
                        className={`w-12 h-12 transition-colors duration-200 ${
                          star <= (overallRating || 0)
                            ? "text-yellow-400 fill-yellow-400 drop-shadow-sm"
                            : "text-slate-200 dark:text-gray-800 fill-none stroke-[1.5]"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Individual Feature Ratings Section */}
              {activeFacilities.length > 0 && (
                <>
                  <hr className="border-slate-100 dark:border-gray-850" />
                  <div className="space-y-4">
                    <p className="text-[11px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest text-left">
                      RATE INDIVIDUAL FEATURES
                    </p>

                    <div className="space-y-4">
                      {activeFacilities.map((fac) => {
                        const Icon = fac.icon
                        return (
                          <div key={fac.key} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${fac.bgClass}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{fac.label}</span>
                            </div>

                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={`fac-${fac.key}-${star}`}
                                  disabled={!isEditing}
                                  onClick={() => fac.setRating(star)}
                                  type="button"
                                  className="p-1"
                                >
                                  <Star
                                    className={`w-7 h-7 transition-colors duration-200 ${
                                      star <= (fac.rating || 0)
                                        ? "text-yellow-400 fill-yellow-400"
                                        : "text-slate-200 dark:text-gray-800 fill-none stroke-[1.5]"
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Review Comment */}
          <Card className="rounded-3xl border border-slate-100 dark:border-gray-850 bg-white dark:bg-[#121212] shadow-sm">
            <CardContent className="p-6 space-y-4">
              <p className="text-[11px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest text-left">
                REVIEW COMMENT
              </p>
              {isEditing ? (
                <Textarea
                  placeholder="Tell us about your experience..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="min-h-[100px] text-sm bg-slate-50/50 dark:bg-gray-900 border-slate-100 dark:border-gray-850 resize-none rounded-2xl focus:ring-[var(--primary)] p-4"
                />
              ) : (
                <div className="bg-slate-50/50 dark:bg-gray-900 p-4 rounded-2xl border border-slate-100 dark:border-gray-850">
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                    {feedbackText ? `"${feedbackText}"` : "No review comment provided."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Bar */}
          {isEditing && (
            <div className="pt-2">
              <Button
                onClick={handleSubmit}
                disabled={submitting || overallRating === null}
                className="w-full bg-[#eb8b5d] hover:bg-[#d67b4f] text-white font-extrabold h-14 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all border-none"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  hasSubmittedReview ? "Save Changes" : "Submit Feedback"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AnimatedPage>
  )
}
