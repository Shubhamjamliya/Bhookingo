import { useParams, Link, useSearchParams, useNavigate, useLocation } from "react-router-dom"
import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  ArrowLeft,
  Share2,
  Star,
  RefreshCw,
  Phone,
  User,
  ChevronRight,
  MapPin,
  Home as HomeIcon,
  MessageSquare,
  X,
  Check,
  Shield,
  Copy,
  Receipt,
  CircleSlash,
  Loader2,
  Clock,
  Calendar,
  Compass,
  Car,
  Wifi,
  Users,
  Zap
} from "lucide-react"
import AnimatedPage from "@food/components/user/AnimatedPage"
import { Card, CardContent } from "@food/components/ui/card"
import { Button } from "@food/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@food/components/ui/dialog"
import { Textarea } from "@food/components/ui/textarea"
import { useOrders } from "@food/context/OrdersContext"
import { useProfile } from "@food/context/ProfileContext"
import { useLocation as useUserLocation } from "@food/hooks/useLocation"

import { orderAPI, restaurantAPI, userAPI } from "@food/api"
import { useCompanyName } from "@food/hooks/useCompanyName"
import { useUserNotifications } from "@food/hooks/useUserNotifications"
import { RESTAURANT_PIN_SVG, CUSTOMER_PIN_SVG } from "@food/constants/mapIcons"
import OrderTrackingMap from "./components/OrderTrackingMap"
import useLocationSharing from "@food/hooks/useLocationSharing"

// Fallback definitions in case imports fail at runtime or are shadowed
const DEFAULT_CUSTOMER_PIN = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#10B981"><path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.08.48 1.52 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/><circle cx="12" cy="9" r="3" fill="#FFFFFF"/></svg>`;
const SAFE_CUSTOMER_PIN = typeof CUSTOMER_PIN_SVG !== 'undefined' ? CUSTOMER_PIN_SVG : DEFAULT_CUSTOMER_PIN;
const DEFAULT_RESTAURANT_PIN = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#FF6B35"><path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.08.48 1.52 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5z"/><circle cx="12" cy="9" r="3" fill="#FFFFFF"/></svg>`;
const SAFE_RESTAURANT_PIN = typeof RESTAURANT_PIN_SVG !== 'undefined' ? RESTAURANT_PIN_SVG : DEFAULT_RESTAURANT_PIN;

const debugLog = (...args) => console.log('[OrderTracking]', ...args)
const debugWarn = (...args) => console.warn('[OrderTracking]', ...args)
const debugError = (...args) => console.error('[OrderTracking]', ...args)


// Animated checkmark component
const AnimatedCheckmark = ({ delay = 0 }) => (
  <motion.svg
    width="80"
    height="80"
    viewBox="0 0 80 80"
    initial="hidden"
    animate="visible"
    className="mx-auto"
  >
    <motion.circle
      cx="40"
      cy="40"
      r="36"
      fill="none"
      stroke="#22c55e"
      strokeWidth="4"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    />
    <motion.path
      d="M24 40 L35 51 L56 30"
      fill="none"
      stroke="#22c55e"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.4, delay: delay + 0.4, ease: "easeOut" }}
    />
  </motion.svg>
)

// Map Component for Restaurant Location


// Section item component
const SectionItem = ({ icon: Icon, iconNode, title, subtitle, onClick, showArrow = true, rightContent }) => (
  <motion.button
    onClick={onClick}
    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left border-b border-dashed border-border dark:border-gray-800 last:border-0"
    whileTap={{ scale: 0.99 }}
  >
    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
      {iconNode ? (
        <div
          className="w-6 h-6 flex-shrink-0 flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:block"
        >
          {iconNode}
        </div>
      ) : (
        <Icon className="w-5 h-5 text-text-secondary dark:text-text-secondary flex-shrink-0" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-text-primary dark:text-gray-100 truncate">{title}</p>
      {subtitle && <p className="text-sm text-text-secondary dark:text-text-secondary truncate">{subtitle}</p>}
    </div>
    {rightContent || (showArrow && <ChevronRight className="w-5 h-5 text-text-secondary dark:text-text-secondary flex-shrink-0" />)}
  </motion.button>
)

class MapErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    debugError('OrderTracking map render failed:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative h-[300px] sm:h-[450px] bg-gray-100 dark:bg-gray-900 rounded-2xl border border-border dark:border-gray-800 flex items-center justify-center">
          <p className="text-sm text-text-secondary dark:text-text-secondary px-4 text-center">Live map unavailable right now</p>
        </div>
      )
    }
    return this.props.children
  }
}

const getRestaurantCoordsFromOrder = (apiOrder, fallback = null) => {
  if (
    apiOrder?.restaurantId?.location?.coordinates &&
    Array.isArray(apiOrder.restaurantId.location.coordinates) &&
    apiOrder.restaurantId.location.coordinates.length >= 2
  ) {
    return apiOrder.restaurantId.location.coordinates
  }
  if (apiOrder?.restaurantId?.location?.latitude && apiOrder?.restaurantId?.location?.longitude) {
    return [apiOrder.restaurantId.location.longitude, apiOrder.restaurantId.location.latitude]
  }
  if (
    apiOrder?.restaurant?.location?.coordinates &&
    Array.isArray(apiOrder.restaurant.location.coordinates) &&
    apiOrder.restaurant.location.coordinates.length >= 2
  ) {
    return apiOrder.restaurant.location.coordinates
  }
  return fallback || null
}

const getRestaurantAddressFromOrder = (apiOrder, previousOrder = null, explicitRestaurantAddress = null) => {
  if (explicitRestaurantAddress && String(explicitRestaurantAddress).trim()) {
    return String(explicitRestaurantAddress).trim()
  }

  const location = apiOrder?.restaurantId?.location || apiOrder?.restaurant?.location || {}

  if (location?.formattedAddress && String(location.formattedAddress).trim()) {
    return String(location.formattedAddress).trim()
  }
  if (location?.address && String(location.address).trim()) {
    return String(location.address).trim()
  }
  if (location?.addressLine1 && String(location.addressLine1).trim()) {
    return String(location.addressLine1).trim()
  }

  const parts = [location?.street, location?.area, location?.city, location?.state, location?.zipCode]
    .map((value) => (value == null ? '' : String(value).trim()))
    .filter(Boolean)

  if (parts.length > 0) return parts.join(', ')

  return previousOrder?.restaurantAddress || apiOrder?.restaurantAddress || apiOrder?.restaurant?.address || 'Restaurant location'
}

const getCustomerCoordsFromApiOrder = (apiOrder, previousOrder = null) => {
  const addr = apiOrder?.address || apiOrder?.address || {}
  const fromLoc = addr?.location?.coordinates
  if (Array.isArray(fromLoc) && fromLoc.length >= 2) return fromLoc
  const flat = addr?.coordinates
  if (Array.isArray(flat) && flat.length >= 2) return flat

  // Some payloads provide plain object coordinates instead of GeoJSON arrays.
  const objectCoord = addr?.location || addr
  const objLat = Number(objectCoord?.lat ?? objectCoord?.latitude)
  const objLng = Number(objectCoord?.lng ?? objectCoord?.longitude)
  if (Number.isFinite(objLat) && Number.isFinite(objLng)) return [objLng, objLat]

  const prev = previousOrder?.address?.coordinates || previousOrder?.address?.location?.coordinates
  if (Array.isArray(prev) && prev.length >= 2) return prev
  return null
}

const transformOrderForTracking = (apiOrder, previousOrder = null, explicitRestaurantCoords = null, explicitRestaurantAddress = null) => {
  const restaurantCoords = explicitRestaurantCoords || getRestaurantCoordsFromOrder(apiOrder, previousOrder?.restaurantLocation?.coordinates)
  const restaurantAddress = getRestaurantAddressFromOrder(apiOrder, previousOrder, explicitRestaurantAddress)
  // API returns `address`; some paths use `address`
  const addr = apiOrder?.address || apiOrder?.address || {}
  const customerCoordsResolved = getCustomerCoordsFromApiOrder(apiOrder, previousOrder)

  return {
    id: apiOrder?.orderId || apiOrder?._id,
    mongoId: apiOrder?._id || null,
    orderId: apiOrder?.orderId || apiOrder?._id,
    restaurant: apiOrder?.restaurantName || previousOrder?.restaurant || 'Restaurant',
    restaurantPhone:
      apiOrder?.restaurantPhone ||
      apiOrder?.restaurantId?.phone ||
      apiOrder?.restaurantId?.ownerPhone ||
      apiOrder?.restaurant?.phone ||
      apiOrder?.restaurant?.ownerPhone ||
      previousOrder?.restaurantPhone ||
      '',
    restaurantAddress,
    restaurantId: apiOrder?.restaurantId || previousOrder?.restaurantId || null,
    userId: apiOrder?.userId || previousOrder?.userId || null,
    userName: apiOrder?.userName || apiOrder?.userId?.name || apiOrder?.userId?.fullName || previousOrder?.userName || '',
    userPhone: apiOrder?.userPhone || apiOrder?.userId?.phone || previousOrder?.userPhone || '',
    address: {
      street: addr?.street || previousOrder?.address?.street || '',
      city: addr?.city || previousOrder?.address?.city || '',
      state: addr?.state || previousOrder?.address?.state || '',
      zipCode: addr?.zipCode || previousOrder?.address?.zipCode || '',
      additionalDetails: addr?.additionalDetails || previousOrder?.address?.additionalDetails || '',
      formattedAddress: addr?.formattedAddress ||
        (addr?.street && addr?.city
          ? `${addr.street}${addr.additionalDetails ? `, ${addr.additionalDetails}` : ''}, ${addr.city}${addr.state ? `, ${addr.state}` : ''}${addr.zipCode ? ` ${addr.zipCode}` : ''}`
          : previousOrder?.address?.formattedAddress || addr?.city || ''),
      coordinates: customerCoordsResolved || addr?.location?.coordinates || previousOrder?.address?.coordinates || null
    },
    restaurantLocation: {
      coordinates: restaurantCoords
    },
    items: apiOrder?.items?.map(item => ({
      name: item.name,
      variantName: item.variantName || '',
      quantity: item.quantity,
      price: item.price
    })) || previousOrder?.items || [],
    total: apiOrder?.pricing?.total || previousOrder?.total || 0,
    // Backend canonical field is orderStatus; keep legacy `status` for UI compatibility.
    status: apiOrder?.orderStatus || apiOrder?.status || previousOrder?.status || 'pending',
    tracking: apiOrder?.tracking || previousOrder?.tracking || {},
    scheduledAt: apiOrder?.scheduledAt || previousOrder?.scheduledAt || null,
    createdAt: apiOrder?.createdAt || previousOrder?.createdAt || null,
    totalAmount: apiOrder?.pricing?.total || apiOrder?.totalAmount || previousOrder?.totalAmount || 0,
    
    gst: apiOrder?.pricing?.tax || apiOrder?.pricing?.gst || apiOrder?.gst || apiOrder?.tax || previousOrder?.gst || 0,
    packagingFee: apiOrder?.pricing?.packagingFee || apiOrder?.packagingFee || 0,
    platformFee: apiOrder?.pricing?.platformFee || apiOrder?.platformFee || 0,
    discount: apiOrder?.pricing?.discount || apiOrder?.discount || 0,
    subtotal: apiOrder?.pricing?.subtotal || apiOrder?.subtotal || 0,
    paymentMethod: apiOrder?.paymentMethod || apiOrder?.payment?.method || previousOrder?.paymentMethod || null,
    payment: apiOrder?.payment || previousOrder?.payment || null,
    cancellationReason: apiOrder?.cancellationReason || previousOrder?.cancellationReason || null,
    ratings: apiOrder?.ratings || previousOrder?.ratings || {},
    restaurantRating: apiOrder?.ratings?.restaurant?.rating || apiOrder?.restaurantRating || previousOrder?.restaurantRating || null,
    orderType: apiOrder?.orderType || previousOrder?.orderType || "DELIVERY",
    pickupOtp: apiOrder?.pickupOtp || previousOrder?.pickupOtp || null,
  }
}

/**
 * Backend uses `orderStatus` (created, confirmed, preparing, ready_for_pickup, picked_up, delivered, cancelled_*).
 * This page used to read legacy `status` only — so UI never updated. Map canonical + legacy values to tracking steps.
 */
function mapBackendOrderStatusToUi(raw) {
  const s = String(raw || "").toLowerCase()
  if (!s || s === "pending" || s === "created") return "placed"
  if (s === "confirmed" || s === "accepted") return "confirmed"
  if (s === "preparing" || s === "processed") return "preparing"
  if (s === "ready" || s === "ready_for_pickup" || s === "reached_pickup" || s === "order_confirmed") return "ready"
  if (s === "delivered" || s === "completed" || s === "picked_up") return "delivered"
  if (s.includes("cancelled") || s === "cancelled") return "cancelled"
  return "placed"
}

function mapOrderToTrackingUiStatus(orderLike) {
  if (!orderLike) return "placed"
  const statusRaw = orderLike.status || orderLike.orderStatus
  const phase = orderLike.orderState?.currentPhase

  // Terminal states handled first
  if (isFoodOrderCancelledStatus(statusRaw)) return "cancelled"
  if (statusRaw === "delivered" || statusRaw === "completed") return "delivered"
  return mapBackendOrderStatusToUi(statusRaw)
}

/** Prefer live order phase when present (socket / polling include orderState). */
function isFoodOrderCancelledStatus(statusRaw) {
  const s = String(statusRaw || "").toLowerCase()
  return s === "cancelled" || s.includes("cancelled")
}

function normalizeLookupId(value) {
  if (value == null) return ""
  const raw = String(value).trim()
  if (!raw || raw === "undefined" || raw === "null") return ""
  return raw
}

function getTimelineStageIndex(orderStatus) {
  const s = String(orderStatus || "").toLowerCase();
  if (s === "placed" || s === "confirmed" || s === "created" || s === "pending") return 0;
  if (s === "accepted") return 1;
  if (s === "preparing") return 2;
  if (s === "ready_for_pickup" || s === "ready") return 3;
  if (s === "reached_restaurant" || s === "reached") return 4;
  if (s === "completed" || s === "delivered") return 5;
  return 0;
}

export default function OrderTracking() {
  const companyName = useCompanyName()
  const navigate = useNavigate()
  const location = useLocation()
  const { orderId } = useParams()
  const [searchParams] = useSearchParams()
  const confirmed = searchParams.get("confirmed") === "true"
  const { getOrderById } = useOrders()
  const { profile, getDefaultAddress } = useProfile()
  const { location: userLiveLocation } = useUserLocation()

  // State for order data
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showConfirmation, setShowConfirmation] = useState(confirmed)
  const [orderStatus, setOrderStatus] = useState('placed')
  const [estimatedTime, setEstimatedTime] = useState(29)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [cancellationReason, setCancellationReason] = useState("")

  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false)
  const [liveSpeed, setLiveSpeed] = useState(null)
  const [liveHeading, setLiveHeading] = useState(null)
  const [liveGpsCoords, setLiveGpsCoords] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (pos.coords && pos.coords.latitude && pos.coords.longitude) {
          setLiveGpsCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        }
        if (pos.coords.speed != null) {
          setLiveSpeed(Math.round(pos.coords.speed * 3.6));
        } else {
          setLiveSpeed(null);
        }
        if (pos.coords.heading != null) {
          setLiveHeading(Math.round(pos.coords.heading));
        } else {
          setLiveHeading(null);
        }
      },
      (err) => console.warn("GPS tracking error:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const touchStartYRef = useRef(0);
  const touchMoveYRef = useRef(0);

  const handleTouchStart = (e) => {
    touchStartYRef.current = e.touches ? e.touches[0].clientY : e.clientY;
    touchMoveYRef.current = touchStartYRef.current;
  };

  const handleTouchMove = (e) => {
    touchMoveYRef.current = e.touches ? e.touches[0].clientY : e.clientY;
  };

  const handleTouchEnd = () => {
    const deltaY = touchMoveYRef.current - touchStartYRef.current;
    if (deltaY < -30) {
      setIsBottomSheetExpanded(true);
    } else if (deltaY > 30) {
      setIsBottomSheetExpanded(false);
    }
  };

  const isTakeawayOrDining = order && ["takeaway", "dining"].includes(String(order.orderType || "").toLowerCase());
  const isSharingEnabled = Boolean(
    order &&
    isTakeawayOrDining &&
    ['confirmed', 'preparing', 'ready', 'ready_for_pickup'].includes(orderStatus)
  );
  const { updateDirections } = useLocationSharing(orderId, isSharingEnabled);

  const { isConnected: isSocketConnected } = useUserNotifications()
  const [refundDestination, setRefundDestination] = useState("source")
  const [isCancelling, setIsCancelling] = useState(false)
  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState(false)
  const [orderNote, setorderNote] = useState("")
  const [isUpdatingInstructions, setIsUpdatingInstructions] = useState(false)
  const [resolvedLookupId, setResolvedLookupId] = useState("")
  const [timerNow, setTimerNow] = useState(Date.now())
  const [remainingDistance, setRemainingDistance] = useState("")
  const [restaurantsAhead, setRestaurantsAhead] = useState([])
  const [socketDropOtpCode, setSocketDropOtpCode] = useState(null)
  
  // Rating states
  const [showSuccessPage, setShowSuccessPage] = useState(false)

  // Check if order is already rated
  const hasRestaurantRating = typeof (order?.ratings?.restaurant?.rating || order?.restaurantRating) === 'number' && (order?.ratings?.restaurant?.rating || order?.restaurantRating) > 0
  const isOrderRated = hasRestaurantRating

  const handleOpenRating = () => {
    navigate(`/user/orders/${orderId || order?._id || order?.id}/review`)
  }

  const handleSuccessPageContinue = () => {
    setShowSuccessPage(false)
    const localCompletedKey = `order_review_shown_${order?.id || order?._id || orderId}`
    window.localStorage.setItem(localCompletedKey, 'true')
    navigate(`/user/orders/${orderId || order?._id || order?.id}/review`)
  }

  useEffect(() => {
    if (showSuccessPage) {
      const timer = setTimeout(() => {
        handleSuccessPageContinue()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showSuccessPage])

  // Trigger success screen on order completion
  useEffect(() => {
    if (!order) return
    const uiStatus = mapOrderToTrackingUiStatus(order)
    const orderRawStatus = order.status || order.orderStatus
    const isCompleted = uiStatus === 'delivered' || orderRawStatus === 'completed' || orderRawStatus === 'delivered'
    
    if (isCompleted && !isOrderRated) {
      const localCompletedKey = `order_review_shown_${order.id || order._id || orderId}`
      if (window.localStorage.getItem(localCompletedKey) !== 'true') {
        setShowSuccessPage(true)
      }
    }
  }, [order, isOrderRated, orderId])



  const handleNavigate = () => {
    if (!activeUserCoords || !restaurantCoordsResolved) {
      toast.error("Locations not available for navigation");
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&origin=${activeUserCoords.lat},${activeUserCoords.lng}&destination=${restaurantCoordsResolved.lat},${restaurantCoordsResolved.lng}&travelmode=driving`;
    window.open(url, "_blank");
  };

  const handleEtaUpdate = useCallback((newEta) => {
    if (typeof newEta === 'string') {
      const match = newEta.match(/(\d+)/);
      if (match) {
        setEstimatedTime(parseInt(match[1], 10));
        return;
      }
    }
    if (typeof newEta === 'number' && !isNaN(newEta)) {
      setEstimatedTime(newEta);
    }
  }, [])
  const lastRealtimeRefreshRef = useRef(0)
  const trackingOrderIdsRef = useRef(new Set())
  const terminalPollStopRef = useRef(false)
  const lookupIdsRef = useRef([])
  const isInitialPollRequestedRef = useRef(null)
  const lastPollExecutionRef = useRef(0) // New: Hard throttle for extreme cases
  const lastStatusToastRef = useRef({ key: '', at: 0 })

  const ORDER_STATUS_TOAST_ID = 'order-tracking-status-update'
  const ORDER_STATUS_TOAST_DEDUPE_MS = 4000

  // Order handover OTP received via socket event.
  // Kept separately so UI still renders even if the event arrives
  // before the order API poll populates `order` state.


  // OTP received via socket event (pickupDropOtp)
  useEffect(() => {
    const handlepickupDropOtp = (event) => {
      const detail = event?.detail || {}
      const otp = detail?.otp != null ? String(detail.otp) : null
      const evtOrderId = detail?.orderId != null ? String(detail.orderId) : null
      const evtOrderMongoId =
        detail?.orderMongoId != null ? String(detail.orderMongoId) : null

      if (!otp) return

      // If the order is already loaded, match by either orderId or mongoId.
      // Otherwise, match against the current URL param.
      const currentIds = [String(orderId)]
      if (order?.orderId) currentIds.push(String(order.orderId))
      if (order?.mongoId) currentIds.push(String(order.mongoId))
      if (order?._id) currentIds.push(String(order._id))

      const matches =
        (evtOrderId && currentIds.includes(evtOrderId)) ||
        (evtOrderMongoId && currentIds.includes(evtOrderMongoId))

      if (!matches) return

      // Always store so UI can render even if `order` hasn't loaded yet.
      setSocketDropOtpCode(otp)

      setOrder((prev) => {
        if (!prev) return prev
        const prevDV = prev.pickupVerification || {}
        const prevDropOtp = prevDV.dropOtp || {}
        
        // Only update if code actually changed to avoid render loops
        if (prevDropOtp.code === otp) return prev;
        
        return {
          ...prev,
          pickupVerification: {
            ...prevDV,
            dropOtp: {
              ...prevDropOtp,
              required: true,
              verified: false,
              code: otp
            }
          }
        }
      })
    }

  }, [orderId, order])



  // Initial fallback estimatedTime from order data (never decremented by clock timer)
  useEffect(() => {
    if (!order) return;
    if (typeof order.estimatedTime === 'number' && order.estimatedTime > 0) {
      setEstimatedTime((prev) => (typeof prev === 'number' && prev > 0 ? prev : order.estimatedTime));
    }
  }, [order?.estimatedTime]);

  // --------------------------------------------------------------------------
  // DATA FETCHING & POLLING STABILITY (FIXED FOR HAMMERING)
  // --------------------------------------------------------------------------

  // Socket notifications include order ids — keep a set so events match this page.
  useEffect(() => {
    const s = trackingOrderIdsRef.current
    s.add(String(orderId))
    if (order?.orderId) s.add(String(order.orderId))
    if (order?.mongoId) s.add(String(order.mongoId))
    if (order?.id) s.add(String(order.id))
  }, [orderId, order?.orderId, order?.mongoId, order?.id])

  useEffect(() => {
    const ids = [
      resolvedLookupId,
      orderId,
      order?.orderId,
      order?.mongoId,
      order?._id,
      order?.id,
    ]
      .map(normalizeLookupId)
      .filter(Boolean)
    lookupIdsRef.current = Array.from(new Set(ids))
  }, [orderId, resolvedLookupId, order?.orderId, order?.mongoId, order?._id, order?.id])

  // Stability Nuke: Move function bodies into a ref-protected execute flow
  const stableOpsRef = useRef({
    resolveOrderFromList: async (rawLookupId) => {
      const needle = normalizeLookupId(rawLookupId)
      if (!needle) return null
      const maxPages = 3
      const limit = 50

      for (let page = 1; page <= maxPages; page += 1) {
        const listResponse = await orderAPI.getOrders({ page, limit })
        let orders = []
        if (listResponse?.data?.success && listResponse?.data?.data?.orders) {
          orders = listResponse.data.data.orders || []
        } else if (listResponse?.data?.orders) {
          orders = listResponse.data.orders || []
        } else if (Array.isArray(listResponse?.data?.data?.data)) {
          orders = listResponse.data.data.data || []
        } else if (Array.isArray(listResponse?.data?.data)) {
          orders = listResponse.data.data || []
        }

        const matched = (orders || []).find((o) => {
          const candidates = [o?._id, o?.id, o?.orderId, o?.mongoId].map(normalizeLookupId)
          return candidates.includes(needle)
        })
        if (matched) return matched
        const totalPages = Number(listResponse?.data?.data?.pagination?.pages) || Number(listResponse?.data?.data?.totalPages) || 1
        if (page >= totalPages) break
      }
      return null
    },
    fetchOrderDetailsWithFallback: async (options = {}) => {
      const lookupIds = lookupIdsRef.current
      if (lookupIds.length === 0) throw new Error("Order id required")
      let lastError = null
      for (const id of lookupIds) {
        try {
          // Double guard against hammer
          return await orderAPI.getOrderDetails(id, options)
        } catch (err) {
          lastError = err
          if (err?.response?.status === 400 || err?.response?.status === 404) continue
          throw err
        }
      }
      throw lastError || new Error("Failed to fetch order details")
    }
  });

  const resolveOrderFromList = useCallback((id) => stableOpsRef.current.resolveOrderFromList(id), [])
  const fetchOrderDetailsWithFallback = useCallback((opts) => stableOpsRef.current.fetchOrderDetailsWithFallback(opts), [])

  // Clear OTP when order is finalized.
  useEffect(() => {
    if (!order) return
    const status = mapOrderToTrackingUiStatus(order)
    if (status === 'delivered' || status === 'cancelled') {
      setSocketDropOtpCode(null)


      setOrder((prev) => {
        if (!prev?.pickupVerification?.dropOtp?.code) return prev
        return {
          ...prev,
          pickupVerification: {
            ...(prev.pickupVerification || {}),
            dropOtp: {
              ...(prev.pickupVerification?.dropOtp || {}),
              code: null
            }
          }
        }
      })
    }
  }, [orderStatus, order])

  const defaultAddress = getDefaultAddress()
  const fallbackCustomerCoords = useMemo(() => {
    const orderCoords = order?.address?.coordinates || order?.address?.location?.coordinates
    if (Array.isArray(orderCoords) && orderCoords.length >= 2) {
      const lng = Number(orderCoords[0])
      const lat = Number(orderCoords[1])
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng }
      }
    }

    const orderLocObj = order?.address?.location || order?.address
    const orderObjLat = Number(orderLocObj?.lat ?? orderLocObj?.latitude)
    const orderObjLng = Number(orderLocObj?.lng ?? orderLocObj?.longitude)
    if (Number.isFinite(orderObjLat) && Number.isFinite(orderObjLng)) {
      return { lat: orderObjLat, lng: orderObjLng }
    }

    const defaultCoords = defaultAddress?.location?.coordinates
    if (Array.isArray(defaultCoords) && defaultCoords.length >= 2) {
      const lng = Number(defaultCoords[0])
      const lat = Number(defaultCoords[1])
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng }
      }
    }

    const defaultLocObj = defaultAddress?.location || defaultAddress
    const defaultObjLat = Number(defaultLocObj?.lat ?? defaultLocObj?.latitude)
    const defaultObjLng = Number(defaultLocObj?.lng ?? defaultLocObj?.longitude)
    if (Number.isFinite(defaultObjLat) && Number.isFinite(defaultObjLng)) {
      return { lat: defaultObjLat, lng: defaultObjLng }
    }

    const liveLat = Number(userLiveLocation?.latitude)
    const liveLng = Number(userLiveLocation?.longitude)
    if (Number.isFinite(liveLat) && Number.isFinite(liveLng)) {
      return { lat: liveLat, lng: liveLng }
    }

    return null
  }, [
    order?.address?.coordinates,
    order?.address?.location?.coordinates,
    defaultAddress?.location?.coordinates,
    userLiveLocation?.latitude,
    userLiveLocation?.longitude
  ])

  const userLiveCoords = useMemo(() => {
    const lat = Number(userLiveLocation?.latitude)
    const lng = Number(userLiveLocation?.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  }, [userLiveLocation?.latitude, userLiveLocation?.longitude])

  const isAdminAccepted = useMemo(() => {
    const status = order?.status
    return [
      "confirmed",
      "preparing",
      "ready",
      "ready_for_pickup",
      "picked_up",
    ].includes(status)
  }, [order?.status])

  // Single source of truth: backend order.status (+ orderState phase for live ride)
  useEffect(() => {
    if (!order) return
    setOrderStatus(mapOrderToTrackingUiStatus(order))
  }, [
    order?.status,
    order?.orderState?.currentPhase,
    order?.orderState?.status,
  ])

  const acceptedAtMs = useMemo(() => {
    const timestamp =
      order?.tracking?.confirmed?.timestamp ||
      order?.tracking?.preparing?.timestamp ||
      order?.updatedAt ||
      order?.createdAt

    const parsed = timestamp ? new Date(timestamp).getTime() : NaN
    return Number.isFinite(parsed) ? parsed : null
  }, [order?.tracking?.confirmed?.timestamp, order?.tracking?.preparing?.timestamp, order?.updatedAt, order?.createdAt])

  const editWindowRemainingMs = useMemo(() => {
    if (!isAdminAccepted || !acceptedAtMs) return 0
    const remaining = 60000 - (timerNow - acceptedAtMs)
    return Math.max(0, remaining)
  }, [isAdminAccepted, acceptedAtMs, timerNow])

  const isEditWindowOpen = editWindowRemainingMs > 0

  const editWindowText = useMemo(() => {
    const totalSeconds = Math.ceil(editWindowRemainingMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }, [editWindowRemainingMs])

  const handleCallRestaurant = (e) => {
    // Prevent event bubbling if necessary
    if (e && e.stopPropagation) e.stopPropagation();

    const rawPhone =
      order?.restaurantPhone ||
      order?.restaurantId?.phone ||
      order?.restaurantId?.ownerPhone ||
      order?.restaurantId?.contact?.phone ||
      order?.restaurant?.phone ||
      order?.restaurant?.ownerPhone ||
      order?.restaurantId?.location?.phone ||
      '';

    const cleanPhone = String(rawPhone).replace(/[^\d+]/g, '');
    
    if (!cleanPhone || cleanPhone.length < 5) {
      toast.error('Restaurant phone number not available');
      return;
    }

    debugLog('?? Attempting to call restaurant:', cleanPhone);
    
    // Most compatible way to trigger dialer on overall mobile/web environments:
    // Create a temporary hidden anchor and programmatically click it.
    try {
      const link = document.createElement('a');
      link.href = `tel:${cleanPhone}`;
      link.setAttribute('target', '_self');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      debugError('Call failed via link click:', err);
      // Last-ditch fallback
      window.location.assign(`tel:${cleanPhone}`);
    }
  };

  useEffect(() => {
    if (!isEditWindowOpen) return
    const interval = setInterval(() => {
      setTimerNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [isEditWindowOpen])

  // Poll for order updates (especially when restaurant accepts)

  const pollRef = useRef(null);

  // Main fetch & polling core logic. (Isolated from socket connection stat-changes)
  useEffect(() => {
    if (!orderId) return;

    let isSubscribed = true;
    let requestInProgress = false;

    const poll = async (isInitial = false) => {
      if (!isSubscribed || requestInProgress) return;
      if (terminalPollStopRef.current && !isInitial) return;

      const now = Date.now();
      if (isInitial && now - lastPollExecutionRef.current < 1000) return;
      if (isInitial) lastPollExecutionRef.current = now;

      // Check context immediately to avoid loaders if data exists locally
      if (isInitial) {
        const rawContext = getOrderById(orderId);
        if (rawContext) {
          setOrder(transformOrderForTracking(rawContext));
          setLoading(false);
        }
      }

      requestInProgress = true;
      try {
        const response = await fetchOrderDetailsWithFallback({ force: isInitial });
        if (!isSubscribed) return;

        let finalOrderData = null;

        if (response.data?.success && response.data.data?.order) {
          finalOrderData = response.data.data.order;
        } else if (isInitial) {
          const matchedOrder = await resolveOrderFromList(orderId);
          if (matchedOrder) finalOrderData = matchedOrder;
        }

        if (finalOrderData) {
          setOrder(prev => {
            const transformedOrder = transformOrderForTracking(finalOrderData, prev);
            const ui = mapOrderToTrackingUiStatus(transformedOrder);
            terminalPollStopRef.current = ui === 'delivered' || ui === 'cancelled';
            return transformedOrder;
          });
          setError(null);
          setLoading(false);
          return;
        }

        if (isInitial && !order) {
          setError(response.data?.message || 'Order not found');
          terminalPollStopRef.current = true;
        }
      } catch (err) {
        if (isInitial && !order) {
          try {
            const matchedOrder = await resolveOrderFromList(orderId);
            if (matchedOrder) {
              if (!isSubscribed) return;
              setOrder(prev => transformOrderForTracking(matchedOrder, prev));
              setError(null);
              setLoading(false);
              return;
            }
          } catch {}
          if (!isSubscribed) return;
          setError(err.response?.data?.message || 'Failed to fetch order details');
          terminalPollStopRef.current = true;
        }
      } finally {
        requestInProgress = false;
        if (isInitial && isSubscribed) setLoading(false);
      }
    };

    pollRef.current = poll;
    terminalPollStopRef.current = false;

    if (isInitialPollRequestedRef.current !== orderId) {
      isInitialPollRequestedRef.current = orderId;
      poll(true);
    }

    return () => {
      isSubscribed = false;
    };
  }, [orderId, fetchOrderDetailsWithFallback, resolveOrderFromList]);

  // Interval Manager (dynamically adapts based on socket connection state independently)
  useEffect(() => {
    if (!orderId) return;

    const tick = () => {
      if (terminalPollStopRef.current) return;
      if (document.hidden) return;
      // Delegate to the latest instance of our polling function capturing current state
      if (pollRef.current) pollRef.current(false);
    };
    
    const pollInterval = (isSocketConnected || window.orderSocketConnected) ? 12000 : 5000;
    const interval = setInterval(tick, pollInterval);

    return () => clearInterval(interval);
  }, [orderId, isSocketConnected]);

  useEffect(() => {
    if (!order) return
    const ui = mapOrderToTrackingUiStatus(order)
    terminalPollStopRef.current = ui === 'delivered' || ui === 'cancelled'
  }, [order])

  // Post-checkout splash only — real status comes from API / poll / socket.
  useEffect(() => {
    if (!confirmed) return
    const timer1 = setTimeout(() => setShowConfirmation(false), 3000)
    return () => clearTimeout(timer1)
  }, [confirmed])

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setEstimatedTime((prev) => Math.max(0, prev - 1))
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const restaurantCoordsResolved = useMemo(() => {
    const coords = getRestaurantCoordsFromOrder(order);
    if (Array.isArray(coords) && coords.length >= 2) {
      return { lat: Number(coords[1]), lng: Number(coords[0]) };
    }
    return null;
  }, [order]);

  const activeUserCoords = useMemo(() => {
    return userLiveCoords || fallbackCustomerCoords;
  }, [userLiveCoords, fallbackCustomerCoords]);

  const handleDirectionsCalculated = useCallback(({ distanceText, durationText, durationValue }) => {
    if (distanceText) {
      setRemainingDistance(distanceText);
    }
    let etaVal = 0;
    if (typeof durationValue === "number" && durationValue > 0) {
      etaVal = Math.max(1, Math.round(durationValue / 60));
      setEstimatedTime(etaVal);
    } else if (durationText) {
      const parsedMin = parseInt(durationText, 10);
      if (!isNaN(parsedMin) && parsedMin > 0) {
        etaVal = parsedMin;
        setEstimatedTime(parsedMin);
      }
    }
    if (typeof updateDirections === 'function' && etaVal > 0) {
      updateDirections(distanceText, durationText, etaVal);
    }
  }, [updateDirections]);

  useEffect(() => {
    if (!order || !userLiveLocation?.latitude || !userLiveLocation?.longitude) return;

    const isTakeawayOrDining = ["takeaway", "dining"].includes(String(order.orderType || "").toLowerCase());
    if (!isTakeawayOrDining) return;

    let isSubscribed = true;
    const fetchStops = async () => {
      try {
        const response = await userAPI.getRestaurantsAhead({
          lat: userLiveLocation.latitude,
          lng: userLiveLocation.longitude,
        });
        if (response?.data?.success && isSubscribed) {
          setRestaurantsAhead(response.data.data.restaurants || []);
        }
      } catch (err) {
        console.warn("Failed to fetch restaurants ahead in order tracking:", err);
      }
    };

    fetchStops();
    const interval = setInterval(fetchStops, 30000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [order?.orderId, userLiveLocation?.latitude, userLiveLocation?.longitude]);

  // Listen for order status updates from socket (e.g., "Order is ready")
  useEffect(() => {
    const handleOrderStatusNotification = (event) => {
      const payload = event?.detail || {};
      const { message, status, estimatedTime, orderId: evtOrderId, orderMongoId } = payload;

      const evtKeys = [evtOrderId, orderMongoId, payload?._id].filter(Boolean).map(String)
      const idMatches =
        evtKeys.length === 0 ||
        evtKeys.some((k) => String(k) === String(orderId)) ||
        evtKeys.some((k) => trackingOrderIdsRef.current.has(k))

      debugLog('?? Order status notification received:', { message, status, idMatches });

      if (idMatches) {
        const next = mapOrderToTrackingUiStatus({
          status,
          orderStatus: payload.orderStatus || status,
        });
        setOrderStatus(next);

        setOrder(prev => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            status: payload.orderStatus || status || prev.status,
            orderStatus: payload.orderStatus || status || prev.orderStatus
          };
          if (payload.pickupOtp) {
            updated.pickupOtp = {
              ...(prev.pickupOtp || {}),
              ...payload.pickupOtp
            };
          }
          return updated;
        });

        // Pull latest order state without refresh spam on bursty socket events.
        const now = Date.now();
        if (now - lastRealtimeRefreshRef.current > 1500 && !isRefreshing) {
          lastRealtimeRefreshRef.current = now;
          handleRefresh();
        }
      }

      // Show a single deduped notification toast
      if (message && idMatches) {
        const toastKey = `${String(evtOrderId || orderMongoId || orderId)}:${String(status || payload.orderStatus || '')}`
        const now = Date.now()
        const isDuplicateToast =
          toastKey &&
          toastKey === lastStatusToastRef.current.key &&
          now - lastStatusToastRef.current.at < ORDER_STATUS_TOAST_DEDUPE_MS

        if (isDuplicateToast) return

        lastStatusToastRef.current = { key: toastKey, at: now }
        toast.dismiss(ORDER_STATUS_TOAST_ID)
        toast.success(message, {
          id: ORDER_STATUS_TOAST_ID,
          duration: 5000,
          position: 'top-center',
          description: estimatedTime
            ? `Estimated arrival in ${Math.round(estimatedTime / 60)} minutes`
            : undefined
        });

        // Optional: Vibrate device if supported
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    };


    // Listen for order status notifications
    window.addEventListener('orderStatusNotification', handleOrderStatusNotification);

    return () => {
      window.removeEventListener('orderStatusNotification', handleOrderStatusNotification);
    };
  }, [orderId])

  const handleCancelOrder = () => {
    // Check if order can be cancelled (only Razorpay orders that aren't delivered/cancelled)
    if (!order) return;

    if (isAdminAccepted && !isEditWindowOpen) {
      toast.error('Cancellation window ended. You can no longer cancel this order.');
      return;
    }

    if (order.status === 'cancelled') {
      toast.error('Order is already cancelled');
      return;
    }

    if (order.status === 'delivered') {
      toast.error('Cannot cancel a delivered order');
      return;
    }

    // Allow cancellation for all payment methods (Razorpay, COD, Wallet)
    // Only restrict if order is already cancelled or delivered (checked above)

    const method = String(order?.payment?.method || order?.paymentMethod || "").toLowerCase()
    const status = String(order?.payment?.status || "").toLowerCase()
    const isRazorpayPaid =
      method === "razorpay" && ["paid", "authorized", "captured", "settled", "refunded"].includes(status)

    setRefundDestination(isRazorpayPaid ? "source" : "wallet")

    setShowCancelDialog(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellationReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    setIsCancelling(true);
    try {
      const cancelLookupId =
        lookupIdsRef.current[0] || normalizeLookupId(orderId)
      const method = String(order?.payment?.method || order?.paymentMethod || "").toLowerCase()
      const status = String(order?.payment?.status || "").toLowerCase()
      const isRazorpayPaid =
        method === "razorpay" && ["paid", "authorized", "captured", "settled", "refunded"].includes(status)

      const payload = {
        reason: cancellationReason.trim(),
        ...(isRazorpayPaid ? { refundDestination } : {}),
      }

      const response = await orderAPI.cancelOrder(cancelLookupId, payload);
      if (response.data?.success) {
        const paymentMethod = order?.payment?.method || order?.paymentMethod;
        const successMessage = response.data?.message ||
          (paymentMethod === 'cash' || paymentMethod === 'cod'
            ? 'Order cancelled successfully. No refund required as payment was not made.'
            : refundDestination === 'wallet'
              ? 'Order cancelled successfully. Refund has been added to your wallet.'
              : 'Order cancelled successfully. Refund will be processed to your original payment method.');
        toast.success(successMessage);
        setShowCancelDialog(false);
        setCancellationReason("");
        setRefundDestination("source");
        // Refresh order data
        const orderResponse = await fetchOrderDetailsWithFallback({ force: true });
        if (orderResponse.data?.success && orderResponse.data.data?.order) {
          const apiOrder = orderResponse.data.data.order;
          setOrder(transformOrderForTracking(apiOrder, order));
        }
      } else {
        toast.error(response.data?.message || 'Failed to cancel order');
      }
    } catch (error) {
      debugError('Error cancelling order:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleUpdateInstructions = async () => {
    try {
      setIsUpdatingInstructions(true);
      const response = await orderAPI.updateOrderInstructions(resolvedLookupId || orderId, orderNote);
      if (response.data?.success) {
        toast.success("Order instructions updated");
        setIsInstructionsModalOpen(false);
        const updatedOrder = response.data.data?.order;
        if (updatedOrder) {
          setOrder(prev => transformOrderForTracking(updatedOrder, prev));
        } else {
          setOrder(prev => ({ ...prev, note: orderNote }));
        }
      } else {
        toast.error(response.data?.message || "Failed to update instructions");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update instructions");
    } finally {
      setIsUpdatingInstructions(false);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Track my order from ${order?.restaurant || companyName}`,
          text: `Hey! Track my order from ${order?.restaurant || companyName} with ID #${order?.orderId || order?.id}.`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Tracking link copied to clipboard!");
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        debugError('Error sharing:', error);
        toast.error("Failed to share link");
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetchOrderDetailsWithFallback({ force: true })
      if (response.data?.success && response.data.data?.order) {
        const apiOrder = response.data.data.order

        // Extract restaurant location coordinates with multiple fallbacks
        let restaurantCoords = null;
        let restaurantAddress = null;

        // Priority 1: restaurantId.location.coordinates (GeoJSON format: [lng, lat])
        if (apiOrder.restaurantId?.location?.coordinates &&
          Array.isArray(apiOrder.restaurantId.location.coordinates) &&
          apiOrder.restaurantId.location.coordinates.length >= 2) {
          restaurantCoords = apiOrder.restaurantId.location.coordinates;
        }
        // Priority 2: restaurantId.location with latitude/longitude properties
        else if (apiOrder.restaurantId?.location?.latitude && apiOrder.restaurantId?.location?.longitude) {
          restaurantCoords = [apiOrder.restaurantId.location.longitude, apiOrder.restaurantId.location.latitude];
        }
        // Priority 3: Check nested restaurant data
        else if (apiOrder.restaurant?.location?.coordinates) {
          restaurantCoords = apiOrder.restaurant.location.coordinates;
        }
        // Priority 4: Check if restaurantId is a string ID and fetch restaurant details
        else if (typeof apiOrder.restaurantId === 'string') {
          debugLog('?? restaurantId is a string ID, fetching restaurant details...', apiOrder.restaurantId);
          try {
            const restaurantResponse = await restaurantAPI.getRestaurantById(apiOrder.restaurantId);
            if (restaurantResponse?.data?.success && restaurantResponse.data.data?.restaurant) {
              const restaurant = restaurantResponse.data.data.restaurant;
              if (restaurant.location?.coordinates && Array.isArray(restaurant.location.coordinates) && restaurant.location.coordinates.length >= 2) {
                restaurantCoords = restaurant.location.coordinates;
                debugLog('? Fetched restaurant coordinates from API:', restaurantCoords);
              }
              restaurantAddress =
                restaurant?.location?.formattedAddress ||
                restaurant?.location?.address ||
                restaurant?.address ||
                null;
            }
          } catch (err) {
            debugError('? Error fetching restaurant details:', err);
          }
        }

        setOrder(transformOrderForTracking(apiOrder, order, restaurantCoords, restaurantAddress))
      }
    } catch (err) {
      debugError('Error refreshing order:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // --------------------------------------------------------------------------
  // RENDER (Final JSX)
  // --------------------------------------------------------------------------

  // Loading state (moved after hooks)
  if (loading) {
    return (
      <AnimatedPage className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] p-4">
        <div className="max-w-lg mx-auto text-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-text-secondary dark:text-text-secondary mx-auto mb-4" />
          <p className="text-text-secondary dark:text-text-secondary">Loading order details...</p>
        </div>
      </AnimatedPage>
    )
  }

  // Error state (moved after hooks)
  if (error || !order) {
    return (
      <AnimatedPage className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] p-4">
        <div className="max-w-lg mx-auto text-center py-20">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-4 dark:text-gray-100">Order Not Found</h1>
          <p className="text-text-secondary dark:text-text-secondary mb-6">{error || 'The order you\'re looking for doesn\'t exist.'}</p>
          <Link to="/user/orders">
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </AnimatedPage>
    )
  }

  const statusConfig = {
    placed: {
      title: "Order Placed",
      subtitle: "Waiting for restaurant to accept",
      color: "bg-green-600",
      iconType: 'food'
    },
    confirmed: {
      title: "Order Confirmed",
      subtitle: "Restaurant has accepted your order",
      color: "bg-green-600",
      iconType: 'food'
    },
    preparing: {
      title: "Food is being prepared",
      subtitle: typeof estimatedTime === 'number' ? `Arriving in ${estimatedTime} mins` : "Cooking your meal",
      color: "bg-green-600",
      iconType: 'food'
    },
    ready: {
      title: "Order is ready",
      subtitle: "Please collect your order",
      color: "bg-green-600",
      iconType: 'food'
    },
    delivered: {
      title: "Order delivered",
      subtitle: "Enjoy your meal!",
      color: "bg-green-600",
      iconType: 'delivered'
    },
    cancelled: {
      title: "Order cancelled",
      subtitle: order?.cancellationReason || "This order has been cancelled",
      color: "bg-primary",
      iconType: 'cancelled'
    }
  }

  const currentStatus = statusConfig[orderStatus] || statusConfig.placed
  const isScheduledOrder = Boolean(order?.scheduledAt) && !['delivered', 'cancelled'].includes(orderStatus)
  const scheduledDateFormatted = order?.scheduledAt
    ? new Date(order.scheduledAt).toLocaleString("en-IN", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null
  const isDeliveredOrder =
    orderStatus === "delivered" ||
    order?.status === "delivered" ||
    Boolean(order?.deliveredAt)
  const showPickupOtp = isTakeawayOrDining && (orderStatus === 'ready' || orderStatus === 'ready_for_pickup') && (order?.pickupOtp?.code || (typeof order?.pickupOtp === 'string' ? order?.pickupOtp : null));
  const customerOtp = order?.pickupVerification?.dropOtp?.code || order?.customerOtp || order?.deliveryOtp || (typeof order?.pickupOtp === 'string' ? order?.pickupOtp : null) || order?.otp || socketDropOtpCode;
  const showLegacyOtp = !isTakeawayOrDining && customerOtp;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] relative overflow-hidden flex flex-col h-screen w-screen">
      {/* 1. Header (Floating glassmorphic card over the map) */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between p-3 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100/60 dark:border-neutral-800/50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/food')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-orange-50 dark:bg-neutral-900 border border-orange-100 dark:border-neutral-800 text-orange-600 dark:text-orange-400 hover:bg-orange-100 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-left">
            <h2 className="font-extrabold text-sm text-gray-900 dark:text-white leading-tight">Order Tracking</h2>
            <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5 uppercase tracking-wider font-extrabold">#{order.orderId || order._id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 text-gray-800 dark:text-gray-200 hover:bg-gray-100 active:scale-95 transition-all"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/user/profile/report-safety-emergency', { state: { returnTo: location.pathname } })}
            className="px-4 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600 active:scale-95 transition-all"
          >
            Help
          </button>
        </div>
      </div>

      {/* 2. Floating Status Card */}
      <div className="absolute top-20 left-4 right-4 z-30 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-gray-100/60 dark:border-neutral-800/50 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
            <h3 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-wider">
              {currentStatus.title}
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-200/50">
            On Time
          </span>
        </div>
        <div className="flex justify-between items-end">
          <div className="text-left">
            <p className="text-[9px] text-gray-400 dark:text-neutral-500 uppercase tracking-widest font-extrabold">Estimated Arrival</p>
            <p className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-0.5 leading-none">
              {estimatedTime} <span className="text-xs font-bold text-gray-500">mins</span>
            </p>
          </div>
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-neutral-900 text-xs font-black text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-neutral-800 hover:bg-orange-100 active:scale-95 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* 3. Full Screen Map / Neutral Receiver View Background */}
      <div className="absolute inset-0 z-0 h-full w-full bg-gray-100 dark:bg-neutral-900">
        {order?.polylineEnabled === false || order?.isForSomeoneElse === true ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 dark:from-neutral-950 dark:via-[#121212] dark:to-neutral-900 p-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-orange-500 text-white flex items-center justify-center shadow-2xl shadow-orange-500/30 mb-4 animate-bounce-short">
              <MapPin className="w-10 h-10" />
            </div>
            <span className="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 text-xs font-black uppercase tracking-wider mb-2 border border-orange-200 dark:border-orange-900">
              Ordered for {order?.receiverName || "Someone else"}
            </span>
            <h3 className="text-xl font-black text-gray-900 dark:text-white max-w-sm">
              {order?.restaurant || "Bhookingo Partner Restaurant"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-neutral-400 max-w-md mt-1.5 line-clamp-2">
              {order?.restaurantAddress || "Destination location set for receiver collection"}
            </p>
            {order?.receiverPhone && (
              <p className="text-xs font-semibold text-gray-700 dark:text-neutral-300 mt-2">
                Receiver Phone: <span className="font-bold text-orange-600 dark:text-orange-400">{order.receiverPhone}</span>
              </p>
            )}
            <button
              onClick={() => {
                const receiverName = order?.receiverName || "Receiver";
                const restName = order?.restaurant || order?.restaurantName || "Bhookingo Restaurant";
                const restPhone = order?.restaurantPhone || "";
                const restAddr = order?.restaurantAddress || "";
                const text = `Hi ${receiverName}, your order from ${restName} has been placed! Mode: ${order?.orderType || 'TAKEAWAY'}.${restAddr ? ` Address: ${restAddr}.` : ''}${restPhone ? ` Phone: ${restPhone}.` : ''} Your pickup OTP will follow via SMS once ready.`;

                if (navigator.share) {
                  navigator.share({ title: `Order from ${restName}`, text, url: window.location.href }).catch(() => {});
                } else if (navigator.clipboard) {
                  navigator.clipboard.writeText(text);
                  toast.success("Order details copied to clipboard!");
                }
              }}
              className="mt-5 px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-orange-500/25 flex items-center gap-2 transition-all active:scale-95"
            >
              <Share2 className="w-4 h-4" /> Share Order with {order?.receiverName || "Receiver"}
            </button>
          </div>
        ) : (
          <MapErrorBoundary>
            {activeUserCoords && restaurantCoordsResolved ? (
              <OrderTrackingMap
                userLocation={activeUserCoords}
                restaurantLocation={restaurantCoordsResolved}
                restaurantName={order.restaurant || "Restaurant"}
                restaurantsAhead={restaurantsAhead}
                orderType={order.orderType || "TAKEAWAY"}
                onDirectionsCalculated={handleDirectionsCalculated}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-neutral-900 p-4">
                <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-2" />
                <p className="text-sm font-extrabold text-gray-500 uppercase tracking-wider">Locating coordinates...</p>
              </div>
            )}
          </MapErrorBoundary>
        )}

        {/* Floating Map Action Buttons & Dashboard Metrics */}
        {activeUserCoords && restaurantCoordsResolved && (
          <div className="absolute bottom-32 left-4 right-4 z-20 flex flex-col gap-3">
            {/* Real-time Dashboard metrics floating on the map */}
            <div className="bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md rounded-2xl p-3 border border-gray-100/60 dark:border-neutral-800/50 shadow-xl flex items-center justify-between text-left">
              <div className="flex-1 border-r border-gray-100 dark:border-neutral-800 pr-2">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Distance</span>
                <span className="text-sm font-black text-gray-900 dark:text-gray-100">{remainingDistance || "Calculating..."}</span>
              </div>
              <div className="flex-1 border-r border-gray-100 dark:border-neutral-800 px-3">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Highway</span>
                <span className="text-sm font-black text-orange-600 dark:text-orange-400 truncate block">
                  {order.restaurantId?.highwayName || order.restaurant?.highwayName || order.highwayName || "On Highway"}
                </span>
              </div>
              {(liveSpeed !== null || liveHeading !== null) && (
                <div className="pl-3 flex gap-4">
                  {liveSpeed !== null && (
                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Speed</span>
                      <span className="text-sm font-black text-gray-900 dark:text-gray-100">{liveSpeed} km/h</span>
                    </div>
                  )}
                  {liveHeading !== null && (
                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Heading</span>
                      <span className="text-sm font-black text-gray-900 dark:text-gray-100">{liveHeading}°</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick map action buttons */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  if (activeUserCoords) {
                    window.dispatchEvent(new CustomEvent("recenter-map", { detail: activeUserCoords }));
                  }
                }}
                className="w-12 h-12 rounded-full bg-white dark:bg-[#121212] shadow-xl flex items-center justify-center text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-neutral-800 hover:scale-105 active:scale-95 transition-all"
                title="My Location"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600 dark:text-orange-400">
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                  <line x1="12" y1="2" x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="5" y2="12" />
                  <line x1="19" y1="12" x2="22" y2="12" />
                </svg>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleNavigate}
                  className="flex items-center gap-2 h-12 px-5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-amber-600 active:scale-95 transition-all"
                >
                  <Compass className="w-4 h-4 text-white" />
                  Navigate
                </button>
                <button
                  onClick={handleCallRestaurant}
                  className="w-12 h-12 rounded-full bg-white dark:bg-[#121212] border border-gray-100 dark:border-neutral-800 shadow-xl flex items-center justify-center text-orange-600 dark:text-orange-400 hover:scale-105 active:scale-95 transition-all"
                >
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Sliding Order Details Panel */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#121212] rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.15)] border-t border-gray-100 dark:border-neutral-800 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col overflow-hidden ${
          isBottomSheetExpanded ? 'translate-y-0 h-[85vh]' : 'translate-y-[calc(100%-110px)] h-[600px]'
        }`}
      >
        {/* Sliding Header/Handle */}
        <div 
          className="h-10 w-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50/50 dark:hover:bg-neutral-900/30 border-b border-gray-50 dark:border-neutral-900/50 select-none touch-none"
          onClick={() => setIsBottomSheetExpanded(prev => !prev)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-neutral-700 rounded-full mb-1" />
        </div>

        {/* Collapsed Header Details (always visible at top of sliding panel) */}
        <div 
          className="flex items-center justify-between px-6 pb-4 cursor-pointer select-none touch-none"
          onClick={() => setIsBottomSheetExpanded(prev => !prev)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
        >
          <div className="flex items-center gap-3">
            <img 
              src={order.restaurantImage || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&q=80"} 
              alt={order.restaurant}
              className="w-12 h-12 rounded-2xl object-cover border border-gray-100 dark:border-neutral-800 shadow-sm" 
            />
            <div className="text-left">
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white leading-tight">
                {order.restaurant}
              </h4>
              <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5 font-extrabold uppercase tracking-wider">ID: #{order.orderId}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-orange-600 dark:text-orange-400 font-black uppercase tracking-wider block">ETA</span>
            <span className="text-sm font-black text-gray-900 dark:text-gray-100">
              {estimatedTime} mins
            </span>
          </div>
        </div>

        {/* Scrollable Expanded Details Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 pb-12">
          {/* OTP Section (only if status is ready/ready_for_pickup) */}
          {showPickupOtp && orderStatus !== 'delivered' && orderStatus !== 'cancelled' && (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border border-orange-200/80 dark:border-orange-900/40 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 dark:bg-orange-950/50 flex items-center justify-center text-orange-600 dark:text-orange-400 flex-shrink-0">
                  <Shield className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900 dark:text-gray-100 text-left">Pickup Verification OTP</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 text-left mt-0.5 leading-relaxed">
                    Show this OTP to the restaurant to collect your order.
                  </p>
                </div>
              </div>
              <div className="flex items-center flex-shrink-0">
                <div className="border border-orange-200 dark:border-orange-900/40 bg-white dark:bg-neutral-900 font-mono font-black text-xl text-orange-600 dark:text-orange-400 px-4 py-2.5 rounded-l-2xl select-all leading-none h-11 flex items-center shadow-sm">
                  {showPickupOtp}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(String(showPickupOtp));
                    toast.success("OTP copied to clipboard!");
                  }}
                  className="border-y border-r border-orange-200 dark:border-orange-900/40 bg-orange-100/70 dark:bg-orange-950/40 hover:bg-orange-200/80 dark:hover:bg-orange-900/50 text-orange-600 dark:text-orange-400 p-3 rounded-r-2xl transition-colors cursor-pointer flex items-center justify-center h-11"
                  title="Copy OTP"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Horizontal Timeline progress */}
          <div className="bg-gray-50/80 dark:bg-neutral-900/40 rounded-2xl p-4 border border-gray-100 dark:border-neutral-800 shadow-sm">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 text-left">Timeline</h5>
            {(() => {
              const stages = [
                { label: "Confirmed", key: "confirmed" },
                { label: "Accepted", key: "accepted" },
                { label: "Preparing", key: "preparing" },
                { label: "Ready", key: "ready" },
                { label: "Reached", key: "reached" },
                { label: "Completed", key: "completed" }
              ];
              const getStageStatus = (idx) => {
                const currentIdx = getTimelineStageIndex(orderStatus);
                const hasReached = remainingDistance && parseFloat(remainingDistance) < 0.1;
                let activeIdx = currentIdx;
                if (currentIdx === 3 && hasReached) {
                  activeIdx = 4;
                }
                if (idx < activeIdx) return "completed";
                if (idx === activeIdx) return "active";
                return "pending";
              };
              const activeIdx = getTimelineStageIndex(orderStatus);
              return (
                <div className="relative w-full py-2">
                  <div className="absolute top-[20px] left-[8%] right-[8%] h-[3px] bg-gray-200 dark:bg-neutral-800 z-0">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500" 
                      style={{ width: `${(Math.max(0, activeIdx) / (stages.length - 1)) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between relative z-10">
                    {stages.map((stage, idx) => {
                      const status = getStageStatus(idx);
                      return (
                        <div key={idx} className="flex flex-col items-center w-[16%]">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                            status === "completed" ? "bg-emerald-500 text-white shadow-sm" :
                            status === "active" ? "bg-orange-50 dark:bg-orange-950/40 border-2 border-orange-500 text-orange-600 animate-pulse" :
                            "bg-gray-100 border border-gray-200 dark:bg-neutral-900 dark:border-neutral-800 text-gray-400"
                          }`}>
                            {status === "completed" ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              <div className={`w-2 h-2 rounded-full ${status === "active" ? "bg-orange-600" : "bg-gray-300 dark:bg-neutral-700"}`} />
                            )}
                          </div>
                          <span className={`text-[8px] font-black mt-2 text-center leading-tight uppercase tracking-wider ${
                            status === "completed" ? "text-emerald-600 dark:text-emerald-400" :
                            status === "active" ? "text-orange-600 font-black text-orange-600" :
                            "text-gray-400 dark:text-neutral-600"
                          }`}>
                            {stage.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Restaurant Information section */}
          <div className="space-y-3 text-left">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Restaurant Details</h5>
            <div className="flex items-start gap-3 bg-gray-50/80 dark:bg-neutral-900/40 rounded-2xl p-3 border border-gray-100 dark:border-neutral-800 shadow-sm">
              <img 
                src={order.restaurantImage || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&q=80"} 
                alt={order.restaurant}
                className="w-16 h-16 rounded-2xl object-cover border border-gray-100 dark:border-neutral-800 shadow-sm" 
              />
              <div className="flex-1">
                <h6 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">{order.restaurant}</h6>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{order.restaurantAddress || "Restaurant location details"}</p>
                {order.restaurantId?.highwayName && (
                  <span className="inline-block mt-2 px-2.5 py-0.5 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-orange-200/50">
                    Highway: {order.restaurantId.highwayName}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleCallRestaurant}
                className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-gray-50 dark:bg-neutral-900 border border-gray-200/80 dark:border-neutral-800 text-gray-800 dark:text-gray-200 text-xs font-black uppercase tracking-wider hover:bg-gray-100 active:scale-95 transition-all shadow-sm"
              >
                <Phone className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                Call Restaurant
              </button>
              <button
                onClick={handleNavigate}
                className="flex items-center justify-center gap-2 h-12 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black uppercase tracking-wider hover:from-orange-600 hover:to-amber-600 active:scale-95 transition-all shadow-md shadow-orange-500/20"
              >
                <Compass className="w-4 h-4 text-white" />
                Navigate
              </button>
            </div>
          </div>

          {/* Order Details list */}
          <div className="space-y-3 text-left border-t border-gray-50 dark:border-neutral-900/50 pt-4">
            <div className="flex items-center justify-between">
              <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Order Details</h5>
              <button
                onClick={() => setShowOrderDetails(true)}
                className="text-[10px] font-black text-[var(--primary)] uppercase tracking-wider hover:opacity-80"
              >
                View Bill Receipt
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-neutral-900/30 rounded-2xl p-4 space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Order ID</span>
                <span className="font-mono font-bold text-gray-800 dark:text-gray-200">#{order.orderId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Placed Date</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Payment status</span>
                <span className="font-bold text-green-600 uppercase text-[10px] tracking-wider">
                  {order.payment?.status === "paid" || order.paymentMethod === "wallet" ? "Paid" : "Pending / COD"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Order Type</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 uppercase">{order.orderType || "Takeaway"}</span>
              </div>
              {remainingDistance && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Distance to Restaurant</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{remainingDistance}</span>
                </div>
              )}
            </div>

            {/* List of items */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block font-bold">Items List</span>
              {order.items?.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm p-2 bg-gray-50/50 dark:bg-neutral-900/10 rounded-xl border border-gray-105 border-gray-200 dark:border-neutral-850">
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {item.quantity} x {item.name}
                  </span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">
                    ₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rating Summary Block if Rated */}
          {orderStatus === 'delivered' && isOrderRated && (
            <div className="p-4 bg-gray-50 dark:bg-neutral-900/30 rounded-2xl text-left border border-gray-250 border-gray-200 dark:border-neutral-850">
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-neutral-800/30 pb-2 mb-2">
                <span className="text-xs font-extrabold text-gray-800 dark:text-gray-200">Your Feedback</span>
                <button onClick={handleOpenRating} className="text-[10px] font-black text-[var(--primary)] uppercase tracking-wider">Edit</button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Rating</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={`res-rated-${star}`}
                      className={`w-3.5 h-3.5 ${
                        star <= (order?.ratings?.restaurant?.rating || order?.restaurantRating)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-200 dark:text-gray-800"
                      }`}
                    />
                  ))}
                </div>
              </div>
              {order?.ratings?.restaurant?.comment && (
                <p className="text-xs text-text-secondary dark:text-text-secondary italic mt-2">"{order.ratings.restaurant.comment}"</p>
              )}
            </div>
          )}

          {/* Rating Prompt if Completed and NOT Rated */}
          {orderStatus === 'delivered' && !isOrderRated && (
            <div className="p-4 bg-[var(--primary)]/5 rounded-2xl text-center space-y-3">
              <h6 className="font-extrabold text-sm text-gray-800 dark:text-gray-200">Enjoyed your food?</h6>
              <p className="text-xs text-text-secondary">Help others by rating your checkout experience at the restaurant counter.</p>
              <button 
                onClick={handleOpenRating} 
                className="w-full h-10 rounded-xl bg-[var(--primary)] text-white text-xs font-black uppercase tracking-wider shadow-md"
              >
                Rate Order
              </button>
            </div>
          )}

          {/* Cancellation Option (Pending only) */}
          {!isAdminAccepted && orderStatus !== 'cancelled' && orderStatus !== 'delivered' && (
            <div className="pt-2">
              <button
                onClick={handleCancelOrder}
                className="w-full h-11 rounded-xl border border-red-200 hover:bg-red-50 text-red-655 text-red-600 text-xs font-black uppercase tracking-wider transition-all"
              >
                Cancel Order
              </button>
              <p className="text-[10px] text-gray-500 text-center mt-2 px-2">You can cancel your order until the restaurant accepts it.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      
      {/* Cancel Order Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-xl w-[95%] max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-text-primary">
              Cancel Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-6 px-2">
            {(() => {
              const method = String(order?.payment?.method || order?.paymentMethod || "").toLowerCase()
              const status = String(order?.payment?.status || "").toLowerCase()
              const isRazorpayPaid =
                method === "razorpay" && ["paid", "authorized", "captured", "settled", "refunded"].includes(status)

              if (!isRazorpayPaid) return null

              return (
                <div className="space-y-3 rounded-lg border border-border bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-text-primary">Refund preference</p>
                  <div className="space-y-2">
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-white px-3 py-2">
                      <input
                        type="radio"
                        name="refund-destination"
                        value="source"
                        checked={refundDestination === "source"}
                        onChange={() => setRefundDestination("source")}
                        disabled={isCancelling}
                        className="mt-0.5"
                      />
                      <span className="text-sm text-gray-700">Refund to original payment method (5-7 working days)</span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-white px-3 py-2">
                      <input
                        type="radio"
                        name="refund-destination"
                        value="wallet"
                        checked={refundDestination === "wallet"}
                        onChange={() => setRefundDestination("wallet")}
                        disabled={isCancelling}
                        className="mt-0.5"
                      />
                      <span className="text-sm text-gray-700">Refund to wallet (instant credit)</span>
                    </label>
                  </div>
                </div>
              )
            })()}

            <div className="space-y-2 w-full">
              <Textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g., Changed my mind, Wrong address, etc."
                className="w-full min-h-[100px] resize-none border-2 border-border rounded-lg px-4 py-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed disabled:border-border"
                disabled={isCancelling}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancelDialog(false);
                  setCancellationReason("");
                  setRefundDestination("source");
                }}
                disabled={isCancelling}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmCancel}
                disabled={isCancelling || !cancellationReason.trim()}
                className="flex-1 bg-primary hover:bg-primary-dark text-white"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Confirm Cancellation'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md bg-white dark:bg-[#121212] rounded-2xl p-0 overflow-hidden border-none outline-none shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border dark:border-gray-800 pr-12">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold text-text-primary">Order Details</DialogTitle>
            </div>
          </DialogHeader>

          <div className="p-6 pt-4 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Order Meta Info */}
            <div className="flex flex-col gap-1 b">
              <div className="flex items-center gap-4 mt-2">
                <div>
                  <p className="text-xs text-text-secondary uppercase tracking-wider">Date & Time</p>
                  <p className="text-sm font-medium text-text-primary dark:text-gray-100">
                    {order?.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    }) : 'N/A'}
                  </p>
                </div>
                <div className="h-8 w-px bg-gray-100" />
                <div>
                  <p className="text-xs text-text-secondary uppercase tracking-wider">Status</p>
                  <span className="text-sm font-bold text-green-600 uppercase">
                    {order?.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Instructions Section */}
            {order?.note && (
              <div className="bg-orange-50/50 rounded-xl p-4 border border-orange-100 flex gap-3">
                <MessageSquare className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-var(--primary-dark) font-bold uppercase tracking-wider mb-1">Order Instructions</p>
                  <p className="text-sm text-gray-800 leading-relaxed font-medium capitalize">
                    {order.note}
                  </p>
                </div>
              </div>
            )}

            {/* Items Section */}
            <div>
              <p className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">Order Items</p>
              <div className="space-y-4">
                {order?.items?.map((item, index) => (
                  <div key={index} className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-5 h-5 rounded border border-green-600 flex items-center justify-center mt-0.5 shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-text-primary leading-tight">{item.name}</p>
                        {item.variantName ? (
                          <p className="text-sm text-text-secondary mt-0.5">{item.variantName}</p>
                        ) : null}
                        <p className="text-sm text-text-secondary mt-0.5">Quantity: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="font-semibold text-text-primary">₹{((item?.price || 0) * (item?.quantity || 0)).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold text-text-primary uppercase tracking-wider mb-1">Bill Summary</p>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary">Item Total</span>
                <span className="text-text-primary font-medium">₹{Number(order?.subtotal || 0).toFixed(2)}</span>
              </div>

              {Number(order?.packagingFee) > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-secondary">Packaging Charges</span>
                  <span className="text-text-primary font-medium">₹{Number(order.packagingFee).toFixed(2)}</span>
                </div>
              )}

              {Number(order?.platformFee) > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-secondary">Platform Fee</span>
                  <span className="text-text-primary font-medium">₹{Number(order.platformFee).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary">GST</span>
                <span className="text-text-primary font-medium">₹{Number(order?.gst || 0).toFixed(2)}</span>
              </div>

              {Number(order?.discount) > 0 && (
                <div className="flex justify-between items-center text-sm text-green-600 font-medium">
                  <span>Discount Applied</span>
                  <span>-₹{Number(order.discount).toFixed(2)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-border dark:border-gray-800 flex justify-between items-center">
                <span className="text-base font-bold text-text-primary dark:text-white">Total Amount</span>
                <span className="text-lg font-bold text-text-primary dark:text-white">₹{Number(order?.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method */}
            {order?.paymentMethod && (
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Payment Method</span>
                </div>
                <span className="text-sm font-bold text-text-primary uppercase tracking-wide">
                  {order.paymentMethod}
                </span>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-border">
            <Button
              onClick={() => setShowOrderDetails(false)}
              className="w-full bg-gray-900 text-white font-bold h-12 rounded-xl"
            >
              Okay
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Instructions Modal */}
      <Dialog open={isInstructionsModalOpen} onOpenChange={setIsInstructionsModalOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-3xl p-6 border-0 shadow-2xl bg-surface dark:bg-[#1a1a1a] max-h-[90vh] overflow-y-auto z-[200]">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-var(--primary-dark) to-orange-400 bg-clip-text text-transparent">
              Order Instructions
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Add any special instructions for your order.
            </p>
            <Textarea
              value={orderNote}
              onChange={(e) => setorderNote(e.target.value)}
              placeholder="E.g. Ring the doorbell, leave at the front desk..."
              className="min-h-[120px] resize-none border-border focus:ring-[var(--primary)] rounded-xl bg-gray-50 text-base"
            />
            <Button 
              onClick={handleUpdateInstructions} 
              disabled={isUpdatingInstructions}
              className="w-full bg-gradient-to-r from-[var(--primary)] to-amber-500 hover:from-var(--primary-dark) hover:to-amber-600 text-white font-bold h-12 rounded-xl border-none"
            >
              {isUpdatingInstructions ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Save Instructions"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Page Splash Overlay */}
      <AnimatePresence>
        {showSuccessPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white dark:bg-gray-950 z-[999] flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="max-w-md space-y-6">
              <motion.div
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1.0, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-24 h-24 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto shadow-md"
              >
                <Check className="w-12 h-12 text-green-600 dark:text-green-400" />
              </motion.div>

              <div className="space-y-3">
                <h1 className="text-3xl font-black text-text-primary dark:text-white">
                  🎉 Order Successfully Completed
                </h1>
                <p className="text-lg text-text-secondary dark:text-gray-400 font-medium">
                  Thank you for choosing Bhookingo!
                </p>
                <p className="text-base text-green-600 dark:text-green-400 font-semibold">
                  Enjoy your meal.
                </p>
              </div>

              <div className="pt-6">
                <Button
                  onClick={handleSuccessPageContinue}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold h-14 rounded-2xl shadow-lg active:scale-[0.98] transition-all"
                >
                  Continue
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

