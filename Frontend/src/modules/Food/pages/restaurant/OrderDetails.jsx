import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import useRestaurantBackNavigation from "@food/hooks/useRestaurantBackNavigation"
import Lenis from "lenis"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { restaurantAPI } from "@food/api"
import io from "socket.io-client"
import { API_BASE_URL } from "@food/api/config"
import {
  ArrowLeft,
  Printer,
  Copy,
  User,
  MapPin,
  CheckCircle,
  XCircle,
  Loader2,
  Volume2,
  FileText,
} from "lucide-react"
import ResendNotificationButton from "@food/components/restaurant/ResendNotificationButton"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}

const toNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const firstNumber = (...values) => {
  for (const value of values) {
    const num = toNumber(value)
    if (num !== null) return num
  }
  return null
}

const firstText = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

const formatMoney = (value) => `₹${Number(value || 0).toFixed(2)}`
const formatDiscount = (value) => `-₹${Math.abs(Number(value || 0)).toFixed(2)}`


export default function OrderDetails() {
  const navigate = useNavigate()
  const goBack = useRestaurantBackNavigation()
  const { id: orderId } = useParams()
  const location = useLocation()
  
  // State for order data
  const [orderData, setOrderData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Toast state
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [otpInput, setOtpInput] = useState("")
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false)
  const [isCollectingPayment, setIsCollectingPayment] = useState(false)

  // Fetch order data from API
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true)
        setError(null)
        
        let response;
        try {
          response = await restaurantAPI.getOrderById(orderId)
          if (!response.data?.success) throw new Error('Readable ID fetch failed')
        } catch (e) {
          const fallbackId = location.state?.mongoId
          if (fallbackId && fallbackId !== orderId) {
            response = await restaurantAPI.getOrderById(fallbackId)
          } else {
            throw e
          }
        }
        
        if (response.data?.success) {
          const order = response.data.data?.order || response.data.data
          if (!order) throw new Error('Order data is missing')
          const orderStatusRaw = String(order.status || order.orderStatus || "").toLowerCase()
          const pricing = order.pricing || {}
          const computedSubtotal = Array.isArray(order.items)
            ? order.items.reduce((sum, item) => {
                const price = Number(item?.price || 0)
                const qty = Number(item?.quantity || 1)
                return sum + (Number.isFinite(price) ? price : 0) * (Number.isFinite(qty) ? qty : 1)
              }, 0)
            : 0

          const itemSubtotal =
            firstNumber(
              pricing.subtotal,
              pricing.itemsTotal,
              pricing.itemSubtotal,
              order.itemSubtotal,
              order.subtotal
            ) ?? computedSubtotal

          const taxes =
            firstNumber(
              pricing.tax,
              pricing.gst,
              order.tax,
              order.gst
            ) ?? 0

          const packagingFee = firstNumber(pricing.packagingFee, order.packagingFee) ?? 0
          const platformFee = firstNumber(pricing.platformFee, order.platformFee) ?? 0
          const discount = firstNumber(pricing.discount, order.discount) ?? 0
          const couponDiscount = firstNumber(pricing.couponDiscount, order.couponDiscount) ?? 0
          const referralDiscount = firstNumber(pricing.referralDiscount, order.referralDiscount) ?? 0

          const total =
            firstNumber(
              pricing.total,
              order.payment?.amountDue,
              order.totalAmount,
              order.total,
              order.amount
            ) ??
            Math.max(
              0,
              itemSubtotal +
                taxes +
                packagingFee +
                platformFee -
                discount
            )
          const paidAmount = firstNumber(order.payment?.amountDue, order.payment?.amount, total) ?? total

          const addressParts = [
            order.address?.street,
            order.address?.area,
            order.address?.city,
            order.address?.state,
            order.address?.pincode
          ].filter(Boolean)

          const fullAddress =
            order.address?.formattedAddress ||
            order.address?.address ||
            [
            ].filter(Boolean).join(", ") ||
            (addressParts.length > 0 ? addressParts.join(", ") : "") ||
            "Address not available"

          const customerName = firstText(
            order.userId?.name,
            order.customerName,
            order.customer?.name,
            order.customerInfo?.name,
            order.address?.name
          ) || "Customer"

          const restaurantName = firstText(
            order.restaurantName,
            order.restaurant?.restaurantName,
            order.restaurant?.name,
            order.restaurantId?.restaurantName,
            order.restaurantId?.name,
            order.outletName
          ) || "Restaurant"

          const rawPaymentStatus = String(
            order.payment?.status || order.paymentStatus || ""
          ).toLowerCase()
          const paymentMethod = String(order.payment?.method || "").toLowerCase()

          let paymentStatus = "PENDING"
          if (["completed", "paid", "captured", "success", "succeeded"].includes(rawPaymentStatus)) {
            paymentStatus = "PAID"
          } else if (["failed", "declined"].includes(rawPaymentStatus)) {
            paymentStatus = "FAILED"
          } else if (["refunded", "refund"].includes(rawPaymentStatus)) {
            paymentStatus = "REFUNDED"
          } else if (paymentMethod === "cash") {
            paymentStatus = orderStatusRaw === "delivered" ? "PAID" : "COD"
          }
          
          const statusLower = orderStatusRaw
          const reached = {
            delivered: order.tracking?.delivered?.status || statusLower === "delivered"
          }

          // Transform API order data to match component structure
          const transformedOrder = {
            id: order.orderId || order._id,
            status: orderStatusRaw.toUpperCase() || 'PENDING',
            date: new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            time: new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            restaurant: restaurantName,
            address: fullAddress,
            orderType: order.orderType || "DELIVERY",
            paymentMethod: order.payment?.method || "cash",
            isForSomeoneElse: Boolean(order.isForSomeoneElse),
            receiverName: order.receiverName || '',
            receiverPhone: order.receiverPhone || '',
            customer: {
              name: customerName,
              orderCount: order.userId?.orderCount || 1,
              location: fullAddress,
              distance: order.distanceKm != null ? `${order.distanceKm.toFixed(1)} km` : null,
              arrivalEstimate: order.distanceKm != null ? `~${Math.max(5, Math.round((order.distanceKm / 45) * 60))} mins travel time` : null,
            },
            items: order.items?.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              image: item.image,
              type: item.isVeg || item.foodType === 'Veg' ? 'Veg' : 'Non-Veg'
            })) || [],
            billing: {
              itemSubtotal,
              taxes,
              packagingFee,
              platformFee,
              discount,
              couponDiscount,
              referralDiscount,
              total,
              paidAmount,
              paymentStatus
            },
            dispatchStatus: order.dispatch?.status || null,
            reason: order.cancellationReason || '',
            restaurantNote: order.restaurantNote || '',
            timeline: [
              { event: 'Order placed', timestamp: new Date(order.createdAt).toLocaleString('en-GB'), status: 'completed' },
              ...(reached.confirmed ? [{ event: 'Order confirmed', timestamp: order.tracking?.confirmed?.timestamp ? new Date(order.tracking.confirmed.timestamp).toLocaleString('en-GB') : '', status: 'completed' }] : []),
              ...(reached.preparing ? [{ event: 'Preparing', timestamp: order.tracking?.preparing?.timestamp ? new Date(order.tracking.preparing.timestamp).toLocaleString('en-GB') : '', status: 'completed' }] : []),
              ...(reached.ready ? [{ event: 'Ready for pickup', timestamp: order.tracking?.ready?.timestamp ? new Date(order.tracking.ready.timestamp).toLocaleString('en-GB') : '', status: 'completed' }] : []),
              ...(reached.delivered ? [{ event: 'Delivered', timestamp: order.tracking?.delivered?.timestamp ? new Date(order.tracking.delivered.timestamp).toLocaleString('en-GB') : '', status: 'completed' }] : []),
              ...(statusLower === 'cancelled' ? [{ event: 'Cancelled', timestamp: order.cancelledAt ? new Date(order.cancelledAt).toLocaleString('en-GB') : '', status: 'rejected', reason: order.cancellationReason }] : [])
            ]
          }
          
          setOrderData(transformedOrder)
        } else {
          throw new Error('Order not found')
        }
      } catch (err) {
        debugError('Error fetching order:', err)
        setError(err.response?.data?.message || err.message || 'Failed to fetch order')
        setOrderData(null)
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      fetchOrder()
    }
  }, [orderId])

  // Real-time location socket updates
  useEffect(() => {
    if (!orderId) return;

    let backendUrl = API_BASE_URL;
    try {
      backendUrl = new URL(backendUrl).origin;
    } catch {
      backendUrl = String(backendUrl || "")
        .replace(/\/api\/v\d+\/?$/i, "")
        .replace(/\/api\/?$/i, "")
        .replace(/\/+$/, "");
    }

    const socket = io(backendUrl, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    socket.on('connect', () => {
      socket.emit('join-tracking', orderId);
    });

    socket.on('location-update', (payload) => {
      if (payload && String(payload.orderId) === String(orderId)) {
        setOrderData(prev => {
          if (!prev) return prev;
          const updatedDistance = payload.distanceText || (payload.distanceKm != null ? `${payload.distanceKm.toFixed(1)} km` : prev.customer.distance);
          const updatedEstimate = payload.durationText || payload.arrivalEstimate || (payload.etaMins != null ? `~${payload.etaMins} mins` : prev.customer.arrivalEstimate);
          return {
            ...prev,
            customer: {
              ...prev.customer,
              distance: updatedDistance,
              arrivalEstimate: updatedEstimate
            }
          };
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId]);

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

  const handleCopyOrderId = () => {
    if (!orderData?.id) return
    navigator.clipboard.writeText(orderData.id)
    setToastMessage("Order ID copied to clipboard")
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
  }

  const handleVerifyOtp = async () => {
    if (!otpInput || (otpInput.length !== 6 && otpInput.length !== 4)) {
      setToastMessage("Please enter a valid 4 or 6-digit OTP");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }
    try {
      setIsVerifyingOtp(true);
      const response = await restaurantAPI.verifyOtp(orderId, otpInput);
      if (response.data?.success) {
        setToastMessage("OTP Verified! Order completed.");
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          window.location.reload();
        }, 1500);
      } else {
        setToastMessage(response.data?.message || "Failed to verify OTP");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) {
      setToastMessage(err.response?.data?.message || "Failed to verify OTP");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  const handleCollectPayment = async () => {
    try {
      setIsCollectingPayment(true);
      const response = await restaurantAPI.updateOrderStatus(orderId, {
        paymentStatus: 'paid'
      });
      if (response.data?.success) {
        setToastMessage("Payment status updated: Cash Received");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
        setOrderData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            paymentStatus: 'paid',
            billing: {
              ...prev.billing,
              paymentStatus: 'PAID'
            }
          };
        });
      } else {
        setToastMessage(response.data?.message || "Failed to collect payment");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) {
      setToastMessage(err.response?.data?.message || err.message || "Failed to update payment status");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsCollectingPayment(false);
      setShowPaymentConfirm(false);
    }
  }

  const handlePrintReceipt = async () => {
    try {
      setIsGeneratingPDF(true)
      setToastMessage("Generating receipt...")
      setShowToast(true)
      
      // Small delay to show the toast
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Check if orderData exists
      if (!orderData) {
        throw new Error("Order data not found")
      }
      
      const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const leftMargin = 15
    const rightMargin = 15
    const bottomMargin = 20
    let yPosition = 20

    const ensureSpace = (requiredHeight = 0, resetY = 20) => {
      if (yPosition + requiredHeight > pageHeight - bottomMargin) {
        doc.addPage()
        yPosition = resetY
      }
    }

    // Header - Restaurant Name
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text(orderData.restaurant, pageWidth / 2, yPosition, { align: "center" })
    yPosition += 7

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(orderData.address, pageWidth / 2, yPosition, { align: "center" })
    yPosition += 15

    // Order Receipt Title
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("ORDER RECEIPT", pageWidth / 2, yPosition, { align: "center" })
    yPosition += 10

    // Horizontal line
    doc.setLineWidth(0.5)
    doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition)
    yPosition += 10

    // Order Information
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("Order ID:", leftMargin, yPosition)
    doc.setFont("helvetica", "normal")
    doc.text(orderData.id, 50, yPosition)
    yPosition += 7

    doc.setFont("helvetica", "bold")
    doc.text("Date & Time:", leftMargin, yPosition)
    doc.setFont("helvetica", "normal")
    doc.text(`${orderData.date}, ${orderData.time}`, 50, yPosition)
    yPosition += 7

    doc.setFont("helvetica", "bold")
    doc.text("Status:", leftMargin, yPosition)
    doc.setFont("helvetica", "normal")
    // Set color based on status
    if (orderData.status === "REJECTED" || orderData.status === "CANCELLED") {
      doc.setTextColor(220, 38, 38) // Red
    } else if (orderData.status === "DELIVERED") {
      doc.setTextColor(22, 163, 74) // Green
    }
    doc.text(orderData.status, 50, yPosition)
    doc.setTextColor(0, 0, 0) // Reset to black
    yPosition += 10

    // Customer Details Section
    doc.setLineWidth(0.5)
    ensureSpace(35)
    doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition)
    yPosition += 8

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("CUSTOMER DETAILS", leftMargin, yPosition)
    yPosition += 8

    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("Name:", leftMargin, yPosition)
    doc.setFont("helvetica", "normal")
    doc.text(orderData.customer.name, 50, yPosition)
    yPosition += 6

    doc.setFont("helvetica", "bold")
    doc.text("Location:", leftMargin, yPosition)
    doc.setFont("helvetica", "normal")
    const locationLines = doc.splitTextToSize(orderData.customer.location || "-", pageWidth - 65)
    doc.text(locationLines, 50, yPosition)
    yPosition += locationLines.length * 5

    doc.setFont("helvetica", "bold")
    doc.text("Distance:", leftMargin, yPosition)
    doc.setFont("helvetica", "normal")
    doc.text(orderData.customer.distance || "-", 50, yPosition)
    yPosition += 10

    // Items Section
    doc.setLineWidth(0.5)
    ensureSpace(20)
    doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition)
    yPosition += 8

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("ITEM DETAILS", 15, yPosition)
    yPosition += 5

    // Items Table
    const itemsTableData = orderData.items.map(item => [
      `${item.quantity}x`,
      item.name,
      item.type || "-",
      formatMoney(item.price)
    ])

    // Use autoTable with the doc instance
    autoTable(doc, {
      startY: yPosition,
      head: [["Qty", "Item Name", "Type", "Price"]],
      body: itemsTableData,
      theme: "grid",
      headStyles: {
        fillColor: [55, 65, 81],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: "bold"
      },
      bodyStyles: {
        fontSize: 9
      },
      margin: { left: leftMargin, right: rightMargin }
    })

    yPosition = doc.lastAutoTable.finalY + 10

    // Bill Details Section
    doc.setLineWidth(0.5)
    ensureSpace(50)
    doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition)
    yPosition += 8

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("BILL DETAILS", 15, yPosition)
    yPosition += 8

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    const billRows = [
      ["Item Subtotal:", formatMoney(orderData.billing.itemSubtotal)],
      ["Taxes:", formatMoney(orderData.billing.taxes)],
    ]
    if (Number(orderData.billing.packagingFee) > 0) {
      billRows.push(["Packaging Fee:", formatMoney(orderData.billing.packagingFee)])
    }
    if (Number(orderData.billing.platformFee) > 0) {
      billRows.push(["Platform Fee:", formatMoney(orderData.billing.platformFee)])
    }
    if (Number(orderData.billing.discount) > 0) {
      billRows.push(["Discount:", formatDiscount(orderData.billing.discount)])
    }
    if (Number(orderData.billing.couponDiscount) > 0) {
      billRows.push(["Coupon Discount:", formatDiscount(orderData.billing.couponDiscount)])
    }
    if (Number(orderData.billing.referralDiscount) > 0) {
      billRows.push(["Referral Discount:", formatDiscount(orderData.billing.referralDiscount)])
    }
    billRows.forEach(([label, value]) => {
      doc.text(label, 15, yPosition)
      doc.text(value, pageWidth - rightMargin, yPosition, { align: "right" })
      yPosition += 6
    })

    // Dashed line for total
    doc.setLineDash([2, 2])
    doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition)
    yPosition += 6
    doc.setLineDash([]) // Reset to solid line

    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text("Total Bill:", leftMargin, yPosition)
    doc.text(formatMoney(orderData.billing.total), pageWidth - rightMargin, yPosition, { align: "right" })
    yPosition += 6
    if (Number(orderData.billing.paidAmount) > 0) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.text("Amount Paid:", leftMargin, yPosition)
      doc.text(formatMoney(orderData.billing.paidAmount), pageWidth - rightMargin, yPosition, { align: "right" })
      yPosition += 6
    }

    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.text(`Payment Status: ${orderData.billing.paymentStatus}`, leftMargin, yPosition)
    yPosition += 10

    // Rejection/Cancellation Reason (if exists)
    if (orderData.reason) {
      doc.setLineWidth(0.5)
      ensureSpace(25)
      doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition)
      yPosition += 8

      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(220, 38, 38)
      doc.text("REASON:", leftMargin, yPosition)
      yPosition += 6

      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      const reasonLines = doc.splitTextToSize(orderData.reason, pageWidth - (leftMargin + rightMargin))
      doc.text(reasonLines, leftMargin, yPosition)
      yPosition += (reasonLines.length * 5) + 5
      doc.setTextColor(0, 0, 0)
    }

    // Order Timeline
    ensureSpace(40)

    doc.setLineWidth(0.5)
    doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition)
    yPosition += 8

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("ORDER TIMELINE", leftMargin, yPosition)
    yPosition += 8

    orderData.timeline.forEach((event) => {
      ensureSpace(15)
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      
      // Add status indicator
      if (event.status === "completed") {
        doc.setFillColor(22, 163, 74)
      } else if (event.status === "rejected") {
        doc.setFillColor(220, 38, 38)
      } else {
        doc.setFillColor(156, 163, 175)
      }
      doc.circle(18, yPosition - 1, 2, "F")
      
      doc.setTextColor(0, 0, 0)
      doc.text(event.event, 25, yPosition)
      yPosition += 5
      
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 100, 100)
      doc.text(event.timestamp || "-", 25, yPosition)
      yPosition += 8
      doc.setTextColor(0, 0, 0)
    })

    ensureSpace(15)
    // Footer
    yPosition = pageHeight - bottomMargin
    doc.setFontSize(8)
    doc.setFont("helvetica", "italic")
    doc.setTextColor(100, 100, 100)
    doc.text("Thank you for your business!", pageWidth / 2, yPosition, { align: "center" })
    yPosition += 5
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: "center" })

    // Save the PDF
    doc.save(`Order_Receipt_${orderData.id}.pdf`)
    
    // Show success message
    setToastMessage("Receipt downloaded successfully!")
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
    } catch (error) {
      debugError("Error generating PDF:", error)
      debugError("Error details:", error.message, error.stack)
      setToastMessage(`Failed: ${error.message || "Unknown error"}`)
      setShowToast(true)  
      setTimeout(() => setShowToast(false), 3000)
    } finally {
      setIsGeneratingPDF(false)
    }
    
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "REJECTED":
      case "CANCELLED":
        return "bg-red-700 text-white"
      case "DELIVERED":
      case "COMPLETED":
        return "bg-green-600 text-white"
      case "READY":
      case "READY_FOR_PICKUP":
        return "bg-orange-500 text-white"
      default:
        return "bg-gray-600 text-white"
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header Skeleton */}
        <div className="bg-white px-4 py-4 sticky top-0 z-50 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-1/3 animate-pulse" />
              <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-2xl p-6 space-y-4 shadow-sm border border-gray-50">
            <div className="flex justify-between">
              <div className="h-6 bg-gray-100 rounded w-24 animate-pulse" />
              <div className="h-6 bg-gray-100 rounded w-20 animate-pulse" />
            </div>
            <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
          </div>
          
          <div className="bg-white rounded-2xl p-6 space-y-4 shadow-sm border border-gray-50">
            <div className="h-5 bg-gray-100 rounded w-40 animate-pulse" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
                <div className="h-3 bg-gray-100 rounded w-1/3 animate-pulse" />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600 mb-4" />
            <p className="text-gray-500 font-medium tracking-tight">Fetching order details...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-10 max-w-sm w-full text-center border border-gray-100"
        >
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-[#B80B3D]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Order Not Found</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            {error || "We couldn't retrieve the details for this order. It might have been removed or the ID is incorrect."}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-br from-[#B80B3D] to-[#66001D] text-white font-bold py-4 px-6 rounded-2xl transition-all active:scale-95 shadow-lg shadow-gray-200"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/food/restaurant/orders/all')}
              className="bg-white text-gray-700 font-bold py-4 px-6 rounded-2xl border-2 border-gray-100 hover:bg-gray-50 transition-all active:scale-95"
            >
              Back to History
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // No order data
  if (!orderData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <XCircle className="w-16 h-16 text-[#B80B3D] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-6">The order you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/restaurant/orders')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Back to Orders
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white  px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900">Order details</h1>
            <p className="text-xs text-gray-600 truncate">
              ID: {orderData.id}, {orderData.restaurant?.substring(0, 20) || 'Restaurant'}...
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintReceipt}
              disabled={isGeneratingPDF}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
              aria-label="Print"
            >
              {isGeneratingPDF ? (
                <svg className="animate-spin h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <Printer className="w-5 h-5 text-gray-900" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-4 space-y-4">
        {/* Order Summary Card */}
        <div className="bg-white rounded-lg p-4">
          {/* Status and Order ID Row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                <span className={`px-2.5 py-1 rounded text-xs font-bold ${getStatusColor(orderData.status)}`}>
                  {orderData.status}
                </span>
                <span className={`px-2.5 py-1 rounded text-xs font-bold border uppercase tracking-wider ${
                  orderData.orderType === "DELIVERY" ? "bg-blue-50 text-blue-600 border-blue-100" : 
                  orderData.orderType === "TAKEAWAY" ? "bg-orange-50 text-orange-600 border-orange-100" : 
                  "bg-purple-50 text-purple-600 border-purple-100"
                }`}>
                  {orderData.orderType || "DELIVERY"}
                </span>
              </div>
              <span className="text-xs text-gray-500">{orderData.date}, {orderData.time}</span>
              {/* Resend button for order details */}
              {(orderData.status === "PREPARING" || orderData.status === "READY" || orderData.status === "CONFIRMED") && 
                orderData.dispatchStatus !== "accepted" && (
                <div className="mt-2">
                  <ResendNotificationButton 
                    orderId={orderId} 
                    onSuccess={() => window.location.reload()} 
                  />
                </div>
              )}
            </div>
          </div>

          {/* Order ID */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base font-bold text-gray-900">ID: {orderData.id}</span>
            <button
              onClick={handleCopyOrderId}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Copy order ID"
            >
              <Copy className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Restaurant Info */}
          <p className="text-sm text-gray-900 mb-3">
            {orderData.restaurant}, {orderData.address}
          </p>

          {/* Divider */}
          <div className="border-t border-gray-200 my-3"></div>

          {/* Customer Live Travel / Distance Info for TAKEAWAY and DINING */}
          {(orderData.orderType === "TAKEAWAY" || orderData.orderType === "DINING") && orderData.customer.distance && (
            <div className="mb-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600 animate-bounce" style={{ animationDuration: '3s' }} />
                <div>
                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block">Customer Travel Info</span>
                  <span className="text-xs text-indigo-900 font-bold">{orderData.customer.arrivalEstimate || "Arriving soon"}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block">Distance</span>
                <span className="text-sm font-black text-indigo-900">{orderData.customer.distance}</span>
              </div>
            </div>
          )}

          {/* Rejection Reason */}
          {orderData.reason && (
            <p className="text-sm text-[#B80B3D]">{orderData.reason}</p>
          )}

          {/* Restaurant Note */}
          {orderData.restaurantNote && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Volume2 className="w-4 h-4 text-blue-700" />
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Note for Restaurant</span>
              </div>
              <p className="text-sm text-blue-900 font-medium">{orderData.restaurantNote}</p>
            </div>
          )}
        </div>

        {/* OTP Verification Section for TAKEAWAY and DINING */}
        {(orderData.orderType === "TAKEAWAY" || orderData.orderType === "DINING") && (
          <>
            <div className="bg-white rounded-lg p-4 border border-orange-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Customer Pickup Verification</h3>
              
              {orderData.status === "READY_FOR_PICKUP" || orderData.status === "READY" ? (
                <div className="space-y-4">
                  {/* Meta details list */}
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">Order Status:</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${getStatusColor(orderData.status)} uppercase tracking-wider`}>
                        {orderData.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">Payment Method:</span>
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-50 text-blue-800 uppercase">
                        {orderData.paymentMethod === 'cash' ? 'CASH (COD)' : 'ONLINE'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">Payment Status:</span>
                      {orderData.paymentMethod !== 'cash' ? (
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-green-105 bg-emerald-50 text-emerald-800 border border-emerald-100 uppercase">
                          ONLINE PAID
                        </span>
                      ) : (
                        orderData.paymentStatus === 'paid' ? (
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 uppercase">
                            Cash Received
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-55 bg-amber-50 text-amber-800 border border-amber-100 uppercase animate-pulse">
                            Payment Pending
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Cash Payment Flow logic */}
                  {orderData.paymentMethod === 'cash' && orderData.paymentStatus !== 'paid' && (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-2.5 font-medium leading-relaxed">
                        ⚠️ Collect cash payment first. OTP verification will become enabled once cash payment is received.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowPaymentConfirm(true)}
                        className="w-full bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-2.5 rounded-lg text-sm font-bold shadow hover:opacity-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        Collect Cash (₹{orderData.billing.total})
                      </button>
                    </div>
                  )}

                  {/* OTP Input Handoff container */}
                  <div className={`space-y-3 transition-opacity ${
                    orderData.paymentMethod === 'cash' && orderData.paymentStatus !== 'paid' ? 'opacity-40 pointer-events-none' : ''
                  }`}>
                    <div className="flex justify-between items-center bg-orange-50 border border-orange-100 rounded-lg p-3">
                      <span className="text-xs text-orange-850 font-medium">Customer's Pickup OTP:</span>
                      <span className="text-xl font-mono font-bold text-orange-950 tracking-wider">
                        {orderData.pickupOtp?.code || "******"}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        pattern="\d*"
                        placeholder="Enter 6-digit OTP"
                        disabled={orderData.paymentMethod === 'cash' && orderData.paymentStatus !== 'paid'}
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').substring(0, 6))}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 font-mono text-center tracking-widest text-lg disabled:bg-gray-150"
                      />
                      <button
                        type="button"
                        disabled={isVerifyingOtp || (orderData.paymentMethod === 'cash' && orderData.paymentStatus !== 'paid')}
                        onClick={handleVerifyOtp}
                        className="bg-gradient-to-br from-[#B80B3D] to-[#66001D] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {isVerifyingOtp ? "Verifying..." : "Verify & Complete Order"}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500">Ask the customer for the OTP code shown in their User App.</p>
                  </div>
                </div>
              ) : orderData.pickupOtp?.status === "VERIFIED" || orderData.status === "COMPLETED" || orderData.status === "DELIVERED" ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-xs text-green-850 font-semibold">
                    <span>Pickup OTP Status:</span>
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-green-100 text-green-900 uppercase">VERIFIED</span>
                  </div>
                  {orderData.pickupOtp?.code && (
                    <div className="flex justify-between text-xs text-green-700">
                      <span>Verified OTP Code:</span>
                      <span className="font-mono font-bold">{orderData.pickupOtp.code}</span>
                    </div>
                  )}
                  {orderData.pickupOtp?.verifiedAt && (
                    <div className="flex justify-between text-[11px] text-gray-500">
                      <span>Verified At:</span>
                      <span>{new Date(orderData.pickupOtp.verifiedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">OTP verification will become active when the order is marked ready for pickup.</p>
              )}
            </div>

            {/* Payment Confirmation Dialog */}
            <AnimatePresence>
              {showPaymentConfirm && (
                <div className="fixed inset-0 bg-black/55 z-55 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-xl p-5 max-w-md w-full shadow-2xl border border-gray-100 space-y-4"
                  >
                    <h3 className="text-base font-bold text-gray-900">Confirm Cash Payment</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Confirm you have received <span className="font-bold text-gray-900">₹{orderData.billing.total}</span> from the customer.
                    </p>
                    <div className="flex gap-3 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowPaymentConfirm(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isCollectingPayment}
                        onClick={handleCollectPayment}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {isCollectingPayment ? "Processing..." : "Confirm Payment"}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* Ordered For Someone Else Banner */}
        {orderData.isForSomeoneElse && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider">
                ORDERED FOR SOMEONE ELSE
              </span>
            </div>
            <p className="text-sm font-bold text-gray-900">
              Ordered for: {orderData.receiverName || "Receiver"} — {orderData.receiverPhone}
            </p>
            {orderData.receiverPhone && (
              <div className="mt-2">
                <a
                  href={`tel:${orderData.receiverPhone}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                  📞 Call Receiver: {orderData.receiverPhone}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Customer Details Section */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Customer details</h2>
          
          {/* Customer Card */}
          <div className="bg-white rounded-lg p-4 gap-8 flex flex-col mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{orderData.customer.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{orderData.customer.orderCount} order with you</p>
              </div>

              <hr className="border-gray-200 my-3" />
              
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-900 font-semibold">
                  {orderData.orderType === "DELIVERY" ? "Delivery Location" : orderData.orderType === "TAKEAWAY" ? "Takeaway Order" : "Dining Order"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{orderData.customer.location}</p>
                {orderData.customer.arrivalEstimate && (
                  <p className="text-xs text-green-600 font-semibold mt-1 bg-green-50 px-2 py-0.5 rounded inline-block">
                    Expected Arrival: {orderData.customer.arrivalEstimate}
                  </p>
                )}
              </div>
              {orderData.customer.distance && (
                <span className="text-xs font-black bg-gray-100 text-gray-700 px-2 py-1 rounded shrink-0">
                  {orderData.customer.distance}
                </span>
              )}
            </div>
          </div>

        </div>

        {/* Item Details Section */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Item details</h2>
          
          {orderData.items.map((item, index) => (
            <div key={index} className="bg-white rounded-lg p-4">
              <div className="flex items-start gap-4">
                {item.image && (
                  <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden shadow-sm border border-gray-100">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                       <div className={`w-3 h-3 rounded-full border ${String(item.type).toLowerCase().includes("non") ? "border-red-600" : "border-green-600"} flex items-center justify-center p-[1px]`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${String(item.type).toLowerCase().includes("non") ? "bg-gradient-to-br from-[#B80B3D] to-[#66001D]" : "bg-green-600"}`}></div>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.quantity} x {item.name}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatMoney(item.price)}</p>
                  </div>
                  {item.type && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{item.type}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bill Details Section */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Bill details</h2>
          
          <div className="bg-white  rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">Item subtotal</span>
              <span className="text-sm text-gray-900">{formatMoney(orderData.billing.itemSubtotal)}</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">Taxes</span>
              <span className="text-sm text-gray-900">{formatMoney(orderData.billing.taxes)}</span>
            </div>
            {Number(orderData.billing.packagingFee) > 0 && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">Packaging fee</span>
                <span className="text-sm text-gray-900">{formatMoney(orderData.billing.packagingFee)}</span>
              </div>
            )}

            {Number(orderData.billing.platformFee) > 0 && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">Platform fee</span>
                <span className="text-sm text-gray-900">{formatMoney(orderData.billing.platformFee)}</span>
              </div>
            )}
            {Number(orderData.billing.discount) > 0 && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-green-700">Discount</span>
                <span className="text-sm text-green-700">{formatDiscount(orderData.billing.discount)}</span>
              </div>
            )}
            {Number(orderData.billing.couponDiscount) > 0 && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-green-700">Coupon discount</span>
                <span className="text-sm text-green-700">{formatDiscount(orderData.billing.couponDiscount)}</span>
              </div>
            )}
            {Number(orderData.billing.referralDiscount) > 0 && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-green-700">Referral discount</span>
                <span className="text-sm text-green-700">{formatDiscount(orderData.billing.referralDiscount)}</span>
              </div>
            )}
            <div className="my-3"></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Total bill</span>
                <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-medium rounded">
                  {orderData.billing.paymentStatus}
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{formatMoney(orderData.billing.total)}</span>
            </div>
            {Number(orderData.billing.paidAmount) > 0 && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-600">Amount paid</span>
                <span className="text-sm font-medium text-gray-900">{formatMoney(orderData.billing.paidAmount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Order Timeline Section */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Order timeline</h2>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
              
              {/* Timeline Events */}
              <div className="space-y-4">
                {orderData.timeline.map((event, index) => (
                  <div key={index} className="relative flex items-start gap-3">
                    {/* Icon */}
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                      event.status === "completed" 
                        ? "bg-gradient-to-br from-[#B80B3D] to-[#66001D]" 
                        : event.status === "rejected"
                        ? "bg-gradient-to-br from-[#B80B3D] to-[#66001D]"
                        : "bg-gray-400"
                    }`}>
                      {event.status === "completed" ? (
                        <CheckCircle className="w-4 h-4 text-white" />
                      ) : (
                        <XCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    
                    {/* Event Details */}
                    <div className="flex-1 pt-1">
                      <p className="text-sm text-gray-900">{event.event}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{event.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] bg-gradient-to-br from-[#B80B3D] to-[#66001D] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm"
          >
            {isGeneratingPDF ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span className="text-sm font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}









