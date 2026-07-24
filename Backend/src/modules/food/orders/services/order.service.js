import mongoose from 'mongoose';
import { FoodOrder, FoodSettings } from '../models/order.model.js';
// import { paymentSnapshotFromOrder } from './foodOrderPayment.service.js';
import { logger } from '../../../../utils/logger.js';
import { FoodUser } from '../../../../core/users/user.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';

import { FoodHighway } from '../../admin/models/highway.model.js';
import { FoodFeeSettings } from '../../admin/models/feeSettings.model.js';
import { ValidationError, ForbiddenError, NotFoundError } from '../../../../core/auth/errors.js';
import { buildPaginationOptions, buildPaginatedResult } from '../../../../utils/helpers.js';
import { FoodOffer } from '../../admin/models/offer.model.js';
import { FoodOfferUsage } from '../../admin/models/offerUsage.model.js';
import { FoodSystemConfig } from '../../admin/models/systemConfig.model.js';

import { FoodRestaurantCommission } from '../../admin/models/restaurantCommission.model.js';
import { FoodTransaction } from '../models/foodTransaction.model.js';
import { FoodSupportTicket } from '../../user/models/supportTicket.model.js';
import { config } from '../../../../config/env.js';
import {
  createRazorpayOrder,
  verifyPaymentSignature,
  getRazorpayKeyId,
  isRazorpayConfigured,
  initiateRazorpayRefund
} from '../helpers/razorpay.helper.js';
import { getIO, rooms } from '../../../../config/socket.js';
import { addOrderJob } from '../../../../queues/producers/order.producer.js';
import { fetchPolyline } from '../utils/googleMaps.js';
import { getFirebaseDB } from '../../../../config/firebase.js';
import { FACILITIES_CONFIG } from '../utils/facilitiesConfig.js';
import * as foodTransactionService from './foodTransaction.service.js';
import * as userWalletService from '../../user/services/userWallet.service.js';
import { calculateOrderPricing } from './order-pricing.service.js';


import { decryptOtp } from '../utils/otpSecurity.js';
import { sendOrderSms } from '../../../../core/otp/otp.service.js';
import * as paymentService from './order-payment.service.js';
import * as dispatchService from './dispatch.service.js';
import {
  enqueueOrderEvent,
  haversineKm,
  sanitizeOrderForExternal,
  notifyOwnersSafely,
  notifyOwnerSafely,
  buildOrderIdentityFilter,
  toGeoPoint,
  pushStatusHistory,
  normalizeOrderForClient,
  applyAggregateRating,
  notifyRestaurantNewOrder,
  isStatusAdvance,
  validateBookingDistance,
} from './order.helpers.js';




const COMMISSION_CACHE_MS = 10 * 1000;
let commissionRulesCache = null;
let commissionRulesLoadedAt = 0;

async function getActiveCommissionRules() {
  const now = Date.now();
  if (
    commissionRulesCache &&
    now - commissionRulesLoadedAt < COMMISSION_CACHE_MS
  ) {
    return commissionRulesCache;
  }
  const list = await FoodRestaurantCommission.find({ status: { $ne: false } }).lean();
  commissionRulesCache = list || [];
  commissionRulesLoadedAt = now;
  return commissionRulesCache;
}

// 🗑️ Moved to foodTransaction.service.js to centralize finance logic.


async function getRiderEarning(distanceKm) {
  const d = Number(distanceKm);
  if (!Number.isFinite(d) || d <= 0) return 0;
  const rules = await getActiveCommissionRules();
  if (!rules.length) return 0;

  const sorted = [...rules].sort(
    (a, b) => (a.minDistance || 0) - (b.minDistance || 0),
  );
  const baseRule = sorted.find((r) => Number(r.minDistance || 0) === 0) || null;
  if (!baseRule) return 0;

  let earning = Number(baseRule.basePayout || 0);

  for (const r of sorted) {
    const perKm = Number(r.commissionPerKm || 0);
    if (!Number.isFinite(perKm) || perKm <= 0) continue;
    const min = Number(r.minDistance || 0);
    const max = r.maxDistance == null ? null : Number(r.maxDistance);
    if (d <= min) continue;
    const upper = max == null ? d : Math.min(d, max);
    const kmInSlab = Math.max(0, upper - min);
    if (kmInSlab > 0) {
      earning += kmInSlab * perKm;
    }
  }

  if (!Number.isFinite(earning) || earning <= 0) return 0;
  return Math.round(earning);
}

/** Append-only food_order_payments row; never blocks main flow on failure */
// 🗑️ Deprecated in favor of FoodTransaction system.

// ----- Settings -----
export async function getDispatchSettings() {
  return dispatchService.getDispatchSettings();
}

export async function updateDispatchSettings(dispatchMode, adminId) {
  return dispatchService.updateDispatchSettings(dispatchMode, adminId);
}

// ----- Calculate (validation + return pricing from payload) -----
export async function calculateOrder(userId, dto) {
  const restaurant = await FoodRestaurant.findById(dto.restaurantId)
    .select("status location")
    .lean();
  if (!restaurant) throw new ValidationError("Restaurant not found");

  const orderType = String(dto.orderType || (dto.address ? "DELIVERY" : "TAKEAWAY")).toUpperCase();
  validateBookingDistance(
    orderType === "DELIVERY" ? { address: dto.address } : dto.userLocation,
    restaurant.location,
    orderType
  );

  return calculateOrderPricing(userId, dto);
}

// ----- Create order -----
export async function createOrder(userId, dto) {
  const restaurant = await FoodRestaurant.findById(dto.restaurantId)
    .select("status restaurantName highwayId location isAcceptingOrders takeawaySettings diningSettings isHighwayRestaurant")
    .lean();
  if (!restaurant) throw new ValidationError("Restaurant not found");
  if (restaurant.status !== "approved")
    throw new ValidationError("Restaurant not accepting orders");
  if (restaurant.isAcceptingOrders === false)
    throw new ValidationError("Restaurant not accepting orders");

  if (restaurant.isHighwayRestaurant && restaurant.highwayId) {
    const { validateOrderDrivingRange } = await import('../../driving/services/driving.service.js');
    await validateOrderDrivingRange(restaurant, dto.userLocation);
  }

  const orderType = String(dto.orderType || (dto.address ? "DELIVERY" : "TAKEAWAY")).toUpperCase();

  let distanceKm = null;
  const restLat = restaurant.location?.coordinates?.[1] ?? restaurant.location?.latitude;
  const restLng = restaurant.location?.coordinates?.[0] ?? restaurant.location?.longitude;

  if (restLat !== undefined && restLng !== undefined) {
    if (orderType === "DELIVERY" && dto.address?.location?.coordinates?.length === 2) {
      const [dLng, dLat] = dto.address.location.coordinates;
      const d = haversineKm(restLat, restLng, dLat, dLng);
      distanceKm = Number.isFinite(d) ? d : null;
    } else if (dto.userLocation?.latitude != null && dto.userLocation?.longitude != null) {
      const d = haversineKm(restLat, restLng, dto.userLocation.latitude, dto.userLocation.longitude);
      distanceKm = Number.isFinite(d) ? d : null;
    }
  }

  validateBookingDistance(
    orderType === "DELIVERY" ? { address: dto.address } : dto.userLocation,
    restaurant.location,
    orderType
  );

  if (orderType === "TAKEAWAY") {
    if (restaurant.takeawaySettings?.isEnabled === false) {
      throw new ValidationError("Takeaway is not available for this restaurant");
    }
  }

  if (orderType === "DINING") {
    if (restaurant.diningSettings?.isEnabled === false) {
      throw new ValidationError("Dining is not available for this restaurant");
    }
  }


  let dispatchMode = "auto";
  try {
    const settings = await getDispatchSettings();
    dispatchMode = settings?.dispatchMode || "auto";
  } catch (error) {
    logger.error(`[OrderService] Failed to retrieve dispatch settings during order creation: ${error.message}`);
  }



  const paymentMethod =
    dto.paymentMethod === "card" ? "razorpay" : dto.paymentMethod;
  const isCash = paymentMethod === "cash";
  const isWallet = paymentMethod === "wallet";

  // Global Customization Toggles Enforcement
  if (isCash) {
    // 1. General COD Toggle (Master switch for non-takeaway/non-dining)
    if (orderType !== "TAKEAWAY" && orderType !== "DINING") {
      const globalCodConfig = await FoodSystemConfig.findOne({ key: "cod_enabled" }).select("value").lean();
      if (globalCodConfig && globalCodConfig.value === false) {
        throw new ValidationError("Cash on Delivery is currently disabled");
      }
    }

    // 2. Mode-specific COD Toggles
    let codEnabledKey = "";
    if (orderType === "TAKEAWAY") codEnabledKey = "takeaway_cod_enabled";
    else if (orderType === "DINING") codEnabledKey = "dining_cod_enabled";

    if (codEnabledKey) {
      const codConfig = await FoodSystemConfig.findOne({ key: codEnabledKey }).select("value").lean();
      if (codConfig && codConfig.value === false) {
        throw new ValidationError("Cash on Delivery is disabled for this order type");
      }
    }
  }

  if (isWallet) {
    const walletConfig = await FoodSystemConfig.findOne({ key: "wallet_payment_enabled" }).select("value").lean();
    if (walletConfig && walletConfig.value === false) {
      throw new ValidationError("Wallet payment is currently disabled");
    }
  }

  if (paymentMethod === "razorpay") {
    const onlineConfig = await FoodSystemConfig.findOne({ key: "online_payment_enabled" }).select("value").lean();
    if (onlineConfig && onlineConfig.value === false) {
      throw new ValidationError("Online payment is currently disabled");
    }
  }

  // Ensure pricing is present and consistent.
  const computedSubtotal = (dto.items || []).reduce((sum, item) => {
    const price = Number(item?.price);
    const qty = Number(item?.quantity);
    if (!Number.isFinite(price) || !Number.isFinite(qty)) return sum;
    return sum + Math.max(0, price) * Math.max(0, qty);
  }, 0);
  const normalizedPricing = {
    subtotal: Number(dto.pricing?.subtotal ?? computedSubtotal),
    tax: Number(dto.pricing?.tax ?? 0),
    packagingFee: Number(dto.pricing?.packagingFee ?? 0),
    platformFee: Number(dto.pricing?.platformFee ?? 0),
    discount: Number(dto.pricing?.discount ?? 0),
    total: Number(dto.pricing?.total ?? 0),
    currency: String(dto.pricing?.currency || "INR"),
  };
  const computedTotal = Math.max(
    0,
    (Number.isFinite(normalizedPricing.subtotal)
      ? normalizedPricing.subtotal
      : 0) +
    (Number.isFinite(normalizedPricing.tax) ? normalizedPricing.tax : 0) +
    (Number.isFinite(normalizedPricing.packagingFee)
      ? normalizedPricing.packagingFee
      : 0) +
    (Number.isFinite(normalizedPricing.platformFee)
      ? normalizedPricing.platformFee
      : 0) -
    (Number.isFinite(normalizedPricing.discount)
      ? normalizedPricing.discount
      : 0),
  );
  if (
    !Number.isFinite(normalizedPricing.total) ||
    normalizedPricing.total <= 0
  ) {
    normalizedPricing.total = computedTotal;
  }

  const payment = {
    method: paymentMethod,
    status: isCash ? "cod_pending" : isWallet ? "paid" : "created",
    amountDue: normalizedPricing.total ?? 0,
    razorpay: {},
    qr: {},
  };

  if (distanceKm === null) {
    console.warn(
      `Food order: distance not available, rider earning set to 0`,
    );
  }

  const riderEarning = (orderType === "TAKEAWAY" || orderType === "DINING") ? 0 : await getRiderEarning(distanceKm);

  // Calculate restaurant commission from subtotal
  const { commissionAmount: restaurantCommission } = await foodTransactionService.getRestaurantCommissionSnapshot({
    pricing: normalizedPricing,
    restaurantId: dto.restaurantId
  });

  normalizedPricing.restaurantCommission = restaurantCommission || 0;

  const platformProfit = Math.max(
    0,
    (Number.isFinite(normalizedPricing.platformFee) ? normalizedPricing.platformFee : 0) +
    restaurantCommission -
    riderEarning,
  );

  const order = new FoodOrder({
    userId: new mongoose.Types.ObjectId(userId),
    restaurantId: new mongoose.Types.ObjectId(dto.restaurantId),
    highwayId: dto.highwayId
      ? new mongoose.Types.ObjectId(dto.highwayId)
      : restaurant.highwayId,
    items: dto.items,
    orderType,
    pricing: normalizedPricing,
    payment,
    orderStatus: (isCash || isWallet) ? "confirmed" : "created",
    dispatch: { modeAtCreation: dispatchMode, status: "unassigned" },
    address: orderType === "DELIVERY" ? dto.address : undefined,
    customerLocation: dto.userLocation ? {
      latitude: dto.userLocation.latitude,
      longitude: dto.userLocation.longitude
    } : undefined,
    distanceKm,
    statusHistory: [
      {
        at: new Date(),
        byRole: "SYSTEM",
        from: "",
        to: (isCash || isWallet) ? "confirmed" : "created",
        note: (isCash || isWallet) ? "Order placed and confirmed" : "Order placed",
      },
    ],
    note: dto.note || "",
    restaurantNote: dto.restaurantNote || "",
    sendCutlery: dto.sendCutlery !== false,
    scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
    riderEarning,
    platformProfit,
  });

  let razorpayPayload = null;

  if (paymentMethod === "razorpay" && isRazorpayConfigured()) {
    const amountPaise = Math.round((normalizedPricing.total ?? 0) * 100);
    if (amountPaise < 100)
      throw new ValidationError("Amount too low for online payment");
    try {
      const rzOrder = await createRazorpayOrder(amountPaise, "INR", order._id.toString());
      razorpayPayload = {
        key: getRazorpayKeyId(),
        orderId: rzOrder.id,
        amount: rzOrder.amount,
        currency: rzOrder.currency || "INR",
      };
      // Store Razorpay order id in local payment snapshot (ledger will store it)
      payment.razorpay = { orderId: rzOrder.id, paymentId: "", signature: "" };
      payment.status = "created";
    } catch (err) {
      throw new ValidationError(err?.message || "Payment gateway error");
    }
  }

  await order.save();

  if (isWallet) {
    try {
      await userWalletService.deductWalletBalance(userId, order.pricing.total, `Payment for order #${order.order_id || order._id}`, { orderId: order._id });
    } catch (err) {
      // If wallet deduction fails (e.g. insufficient balance), we should not have saved the order or we should delete/cancel it.
      // But since we already saved it, let's at least throw the error so the user knows.
      // Ideally this should be in a transaction.
      await FoodOrder.deleteOne({ _id: order._id });
      throw err;
    }
  }

  // Phase 2: store financials in ledger only.
  await foodTransactionService.createInitialTransaction({
    ...(order.toObject?.() || order),
    pricing: normalizedPricing,
    payment,
  });

  if (paymentMethod === "razorpay" && payment?.razorpay?.orderId) {
    // Audit can still happen here or via FinanceService events
  }

  // Realtime + push notifications.
  try {
    // Notify customer. For online payments, order is created but awaits payment confirmation.
    const isAwaitingOnlinePayment =
      String(paymentMethod || "").toLowerCase() === "razorpay" &&
      String(payment?.status || "").toLowerCase() !== "paid";
    await notifyOwnersSafely([{ ownerType: "USER", ownerId: userId }], {
      title: isAwaitingOnlinePayment
        ? "Complete Payment to Confirm Order"
        : "Order Confirmed! 🍔",
      body: isAwaitingOnlinePayment
        ? `Order #${order.order_id || order._id} is created. Please complete payment to send it to ${restaurant.restaurantName || "the restaurant"}.`
        : `Your order #${order.order_id || order._id} from ${restaurant.restaurantName || "the restaurant"} has been placed successfully.`,
      image: "https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png",
      data: {
        type: isAwaitingOnlinePayment
          ? "order_created_pending_payment"
          : "order_created",
        orderId: String(order._id),
        orderMongoId: order._id?.toString?.() || "",
        link: `/food/user/orders/${order._id?.toString?.() || ""}`,
      },
    });

    // Restaurant gets new-order request only when payment flow is eligible.
    await notifyRestaurantNewOrder(order);
  } catch {
    // Don't block order placement on socket failures.
  }
  const couponCode = dto.pricing?.couponCode
    ? String(dto.pricing.couponCode).trim().toUpperCase()
    : "";
  if (couponCode) {
    const offer = await FoodOffer.findOne({ couponCode }).lean();
    if (offer) {
      await FoodOffer.updateOne({ _id: offer._id }, { $inc: { usedCount: 1 } });
      if (userId) {
        await FoodOfferUsage.updateOne(
          { offerId: offer._id, userId: new mongoose.Types.ObjectId(userId) },
          { $inc: { count: 1 }, $set: { lastUsedAt: new Date() } },
          { upsert: true },
        );
      }
    }
  }

  const dispatchableStatuses = [
    "confirmed",
    "preparing",
    "ready_for_pickup",
    "ready",
    "picked_up",
  ];
  if (
    dispatchMode === "auto" &&
    orderType === "DELIVERY" &&
    (isCash ||
      order.payment.status === "paid" ||
      order.payment.status === "cod_pending") &&
    dispatchableStatuses.includes(order.orderStatus)
  ) {
    try {
      await tryAutoAssign(order._id);
    } catch {
      // leave unassigned
    }
  }

  const saved = normalizeOrderForClient(order);
  return { order: saved, razorpay: razorpayPayload };
}

// ----- Verify payment -----
export async function verifyPayment(userId, dto) {
  const identity = buildOrderIdentityFilter(dto.orderId);
  if (!identity) throw new ValidationError("Order id required");

  const order = await FoodOrder.findOne({
    ...identity,
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (!order) throw new NotFoundError("Order not found");
  if (order.payment.status === "paid")
    return { order: normalizeOrderForClient(order), payment: order.payment };

  const valid = verifyPaymentSignature(
    dto.razorpayOrderId,
    dto.razorpayPaymentId,
    dto.razorpaySignature,
  );
  if (!valid) throw new ValidationError("Payment verification failed");

  order.orderStatus = "confirmed";
  order.payment.status = "paid";
  order.payment.razorpay.paymentId = dto.razorpayPaymentId;
  order.payment.razorpay.signature = dto.razorpaySignature;
  pushStatusHistory(order, {
    byRole: "USER",
    byId: userId,
    from: "created",
    to: "confirmed",
    note: "Payment verified",
  });
  await order.save();

  await foodTransactionService.updateTransactionStatus(order._id, 'captured', {
    status: 'captured',
    razorpayPaymentId: dto.razorpayPaymentId,
    razorpaySignature: dto.razorpaySignature,
    recordedByRole: "USER",
    recordedById: new mongoose.Types.ObjectId(userId)
  });

  // After online payment is verified, now notify restaurant about the new order.
  await notifyRestaurantNewOrder(order);

  // Notify Customer about payment success
  await notifyOwnersSafely([{ ownerType: "USER", ownerId: userId }], {
    title: "Payment Successful! ✅",
    body: `We have received your payment of ₹${order.payment.amountDue} for Order #${order._id.toString()}.`,
    image: "https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png",
    data: {
      type: "payment_success",
      orderId: String(order._id.toString()),
      orderMongoId: String(order._id),
    },
  });

  const settings = await getDispatchSettings();
  const dispatchableStatuses = [
    "confirmed",
    "preparing",
    "ready_for_pickup",
    "ready",
    "picked_up",
  ];
  if (order.orderType === "DELIVERY" && settings.dispatchMode === "auto" && dispatchableStatuses.includes(order.orderStatus)) {
    try {
      await tryAutoAssign(order._id);
    } catch { }
  }

  return { order: normalizeOrderForClient(order), payment: order.payment };
}

// ----- Auto-assign -----

/**
 * Start or continue a smart cascading dispatch.
 * @param {string} orderId - Mongo ID of the order.
 * @param {object} options - Options (retry count, etc)
 */
export async function tryAutoAssign(orderId, options = {}) {
  return dispatchService.tryAutoAssign(orderId, options);
}

/**
 * Triggered by worker after 60 seconds of zero response.
 */
export async function processDispatchTimeout(orderId, partnerId, options = {}) {
  return dispatchService.processDispatchTimeout(orderId, partnerId, options);
}

// ----- User: list, get, cancel -----
export async function listOrdersUser(userId, query) {
  const { page, limit, skip } = buildPaginationOptions(query);
  const filter = { userId: new mongoose.Types.ObjectId(userId) };
  const [docs, total] = await Promise.all([
    FoodOrder.find(filter)
      .populate(
        "restaurantId",
        "restaurantName profileImage area city location rating totalRatings",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FoodOrder.countDocuments(filter),
  ]);
  return buildPaginatedResult({
    docs: docs.map((doc) => normalizeOrderForClient(doc)),
    total,
    page,
    limit,
  });
}

export async function getOrderById(
  orderId,
  { userId, restaurantId, admin } = {}
) {
  const identity = buildOrderIdentityFilter(orderId);
  if (!identity) throw new ValidationError("Order id required");
  const order = await FoodOrder.findOne(identity)
    .populate(
      "restaurantId",
      "restaurantName ownerPhone profileImage area city location rating totalRatings primaryContactNumber highwayName facilities",
    )
    .populate("userId", "name fullName phone email")
    .lean();
  if (!order) throw new NotFoundError("Order not found");

  const orderUserId = order.userId?._id?.toString() || order.userId?.toString();
  const orderRestaurantId = order.restaurantId?._id?.toString() || order.restaurantId?.toString();

  if (!admin) {
    if (userId && orderUserId !== userId.toString())
      throw new ForbiddenError("Not your order");
    if (restaurantId && orderRestaurantId !== restaurantId.toString())
      throw new ForbiddenError("Not your restaurant order");
  }

  return normalizeOrderForClient(order, { includeOtp: true, admin: Boolean(admin) });
}

export async function getDropOtpUser(orderId, userId) {
  const identity = buildOrderIdentityFilter(orderId);
  if (!identity) throw new ValidationError("Order id required");
  const order = await FoodOrder.findOne({
    ...identity,
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (!order) throw new NotFoundError("Order not found");
  return { otp: null };
}

/**
 * Watchdog: Recovers orders stuck in 'assigned' or 'preparing' status for too long.
 * Should be called on server startup.
 */
export async function recoverStuckOrders() {
  const now = new Date();
  const FIVE_MIN = 5 * 60 * 1000;
  const TWO_MIN = 2 * 60 * 1000;

  try {
    // 1. Stuck in 'assigned' (partner never accepted) for > 2m
    const stuckAssigned = await FoodOrder.find({
      'dispatch.status': 'assigned',
      'dispatch.acceptedAt': { $exists: false },
      'dispatch.assignedAt': { $lt: new Date(now - TWO_MIN) },
      orderStatus: { $nin: ['delivered', 'cancelled_by_user', 'cancelled_by_restaurant'] }
    });

    if (stuckAssigned.length > 0) {
      logger.info(`Watchdog: Healing ${stuckAssigned.length} stuck assigned orders.`);
      for (const order of stuckAssigned) {
        // Reset status to unassigned and re-trigger auto-assign
        order.dispatch.status = 'unassigned';
        await order.save();
        await tryAutoAssign(order._id);
      }
    }

    // 2. Clear old dispatching locks (cleanup in case of crash)
    await FoodOrder.updateMany(
      { 'dispatch.dispatchingAt': { $lt: new Date(now - FIVE_MIN) } },
      { $unset: { 'dispatch.dispatchingAt': '' } }
    );

  } catch (err) {
    logger.error(`Watchdog recovery error: ${err.message}`);
  }
}

export async function resyncState(userId, role) {
  if (role === "USER") {
    const order = await FoodOrder.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      orderStatus: {
        $nin: [
          "delivered",
          "cancelled_by_user",
          "cancelled_by_restaurant",
          "cancelled_by_admin",
        ],
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (order) {
      const out = normalizeOrderForClient(order);
      // Re-add handover OTP if order is picked up

      return { activeOrder: out };
    }
    return { activeOrder: null };
  }



  return {};
}

export async function cancelOrder(orderId, userId, reason, refundDestination = "source") {
  const identity = buildOrderIdentityFilter(orderId);
  if (!identity) throw new ValidationError("Order id required");

  const order = await FoodOrder.findOne({
    ...identity,
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (!order) throw new NotFoundError("Order not found");

  const allowed = ["created"];
  if (!allowed.includes(order.orderStatus))
    throw new ValidationError("Order cannot be cancelled");

  const from = order.orderStatus;
  order.orderStatus = "cancelled_by_user";
  pushStatusHistory(order, {
    byRole: "USER",
    byId: userId,
    from,
    to: "cancelled_by_user",
    note: reason || "",
  });

  const paymentMethod = String(order.payment?.method || "cash").toLowerCase();
  const paymentStatus = String(order.payment?.status || "cod_pending").toLowerCase();
  const normalizedRefundDestination =
    String(refundDestination || "source").toLowerCase() === "wallet"
      ? "wallet"
      : "source";
  const hasRefundProcessed =
    String(order.payment?.refund?.status || "none").toLowerCase() === "processed";

  // ✅ NEW: Automated Razorpay Refund on User Cancel
  if (
    paymentStatus === "paid" &&
    paymentMethod === "razorpay" &&
    order.payment?.razorpay?.paymentId &&
    !hasRefundProcessed
  ) {
    try {
      if (normalizedRefundDestination === "wallet") {
        await userWalletService.refundWalletBalance(
          userId,
          order.pricing.total,
          `Refund for cancelled order #${order.order_id || order._id}`,
          { orderId: order._id, source: "order_refund_wallet" },
        );
        order.payment.status = "refunded";
        order.payment.refund = {
          status: "processed",
          destination: "wallet",
          amount: order.pricing.total,
          refundId: "",
          processedAt: new Date()
        };
      } else {
        const refundResult = await initiateRazorpayRefund(
          order.payment.razorpay.paymentId,
          order.pricing.total
        );

        if (refundResult.success) {
          order.payment.status = "refunded";
          order.payment.refund = {
            status: "processed",
            destination: "source",
            amount: order.pricing.total,
            refundId: refundResult.refundId,
            processedAt: new Date()
          };
        } else {
          // Log failure but let order cancellation proceed
          order.payment.refund = {
            status: "failed",
            destination: "source",
            amount: order.pricing.total
          };
        }
      }
    } catch (err) {
      console.error(`Refund processing error for Order ${orderId}:`, err);
      order.payment.refund = {
        status: "failed",
        destination: normalizedRefundDestination,
        amount: order.pricing.total,
      };
    }
  } else if (
    paymentStatus === "paid" &&
    paymentMethod === "wallet" &&
    !hasRefundProcessed
  ) {
    try {
      await userWalletService.refundWalletBalance(userId, order.pricing.total, `Refund for cancelled order #${order.order_id || order._id}`, { orderId: order._id });
      order.payment.status = "refunded";
      order.payment.refund = {
        status: "processed",
        destination: "wallet",
        amount: order.pricing.total,
        processedAt: new Date()
      };
    } catch (err) {
      console.error(`Wallet refund processing error for Order ${orderId}:`, err);
      order.payment.refund = { status: "failed", destination: "wallet", amount: order.pricing.total };
    }
  }

  await order.save();

  enqueueOrderEvent("order_cancelled_by_user", {
    orderMongoId: order._id?.toString?.(),
    orderId: order._id.toString(),
    userId,
    reason: reason || "",
  });

  // Sync transaction status
  try {
    const finalPaymentMethod = String(order.payment?.method || paymentMethod || "cash").toLowerCase();
    const finalPaymentStatus = String(order.payment?.status || paymentStatus || "cod_pending").toLowerCase();
    const isOnlinePaid =
      finalPaymentMethod === "razorpay" &&
      (finalPaymentStatus === "paid" || finalPaymentStatus === "refunded");
    await foodTransactionService.updateTransactionStatus(order._id, 'cancelled_by_user', {
      status: isOnlinePaid ? 'refunded' : 'failed',
      note: `Order cancelled by user: ${reason || "No reason"}`,
      recordedByRole: 'USER',
      recordedById: userId
    });
  } catch (err) {
    logger.warn(`cancelOrder transaction sync failed: ${err?.message || err}`);
  }

  // Notify User and Restaurant about the cancellation
  const finalPaymentMethod = String(order.payment?.method || paymentMethod || "cash").toLowerCase();
  const finalPaymentStatus = String(order.payment?.status || paymentStatus || "cod_pending").toLowerCase();
  const isOnlinePaid =
    finalPaymentMethod === "razorpay" &&
    (finalPaymentStatus === "paid" || finalPaymentStatus === "refunded");
  const settledRefundDestination =
    String(order.payment?.refund?.destination || normalizedRefundDestination || "source").toLowerCase() === "wallet"
      ? "wallet"
      : "source";
  const refundDetail = isOnlinePaid
    ? settledRefundDestination === "wallet"
      ? ` Your refund of ₹${order.pricing.total} has been credited to your wallet.`
      : ` Your refund of ₹${order.pricing.total} is being processed and will be credited to your original payment method within 5-7 working days.`
    : "";

  await notifyOwnersSafely(
    [
      { ownerType: "USER", ownerId: userId },
      { ownerType: "RESTAURANT", ownerId: order.restaurantId },
    ],
    {
      title: "Order Cancelled ❌",
      body: `Order #${order.order_id || order._id} has been cancelled successfully.${refundDetail}`,
      image: "https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png",
      data: {
        type: "order_cancelled",
        orderId: String(order._id.toString()),
        orderMongoId: String(order._id),
      },
    },
  );

  // Real-time: status update via socket
  try {
    const io = getIO();
    if (io) {
      const payload = {
        orderMongoId: order._id?.toString?.(),
        orderId: order._id.toString(),
        orderStatus: order.orderStatus,
        message: `Order #${order.order_id || order._id} has been cancelled successfully.${refundDetail}`
      };
      io.to(rooms.user(userId)).emit("order_status_update", payload);
      io.to(rooms.restaurant(order.restaurantId)).emit("order_status_update", payload);
    }
  } catch (err) {
    logger.warn(`cancelOrder socket emit failed: ${err?.message || err}`);
  }

  return normalizeOrderForClient(order);
}

export async function submitOrderRatings(orderId, userId, dto) {
  const identity = buildOrderIdentityFilter(orderId);
  if (!identity) throw new ValidationError("Order id required");

  const order = await FoodOrder.findOne({
    ...identity,
    userId: new mongoose.Types.ObjectId(userId),
  }).populate('restaurantId');
  if (!order) throw new NotFoundError("Order not found");
  const currentStatus = String(order.orderStatus).toLowerCase();
  if (currentStatus !== "delivered" && currentStatus !== "completed") {
    throw new ValidationError("You can rate only completed or delivered orders");
  }

  const now = new Date();
  order.ratings.restaurant = {
    rating: dto.restaurantRating,
    comment: dto.restaurantComment || "",
    ratedAt: now,
  };

  const restaurantFacilities = order.restaurantId?.facilities || {};
  FACILITIES_CONFIG.forEach(fac => {
    const facKey = fac.key;
    const isSupported = restaurantFacilities[facKey] === true;
    if (isSupported && dto[facKey]) {
      order.ratings[facKey] = {
        rating: typeof dto[facKey].rating === 'number' ? dto[facKey].rating : null,
        availability: dto[facKey].availability !== false
      };
    } else {
      order.ratings[facKey] = undefined;
    }
  });

  await order.save();
  await calculateAndSaveRestaurantRatingStats(order.restaurantId?._id || order.restaurantId);

  enqueueOrderEvent('order_ratings_submitted', {
    orderMongoId: order._id?.toString?.(),
    orderId: order._id.toString(),
    userId,
    restaurantRating: dto.restaurantRating,
  });

  return order;
}

/**
 * Recalculate and update a restaurant's overall and facility average ratings.
 */
export async function calculateAndSaveRestaurantRatingStats(restaurantId) {
  const FoodOrder = mongoose.model('FoodOrder');
  const FoodRestaurant = mongoose.model('FoodRestaurant');

  const orders = await FoodOrder.find({
    restaurantId,
    'ratings.restaurant.rating': { $exists: true, $ne: null }
  }).select('ratings').lean();

  if (orders.length === 0) return;

  let overallSum = 0, overallCount = 0;

  // Initialize dynamic facility stats
  const facilityStats = {};
  FACILITIES_CONFIG.forEach(fac => {
    facilityStats[fac.key] = { sum: 0, count: 0 };
  });

  let overallFacilitySum = 0;
  let overallFacilityCount = 0;

  orders.forEach(o => {
    const ratings = o.ratings || {};

    if (ratings.restaurant && typeof ratings.restaurant.rating === 'number') {
      overallSum += ratings.restaurant.rating;
      overallCount++;
    }

    FACILITIES_CONFIG.forEach(fac => {
      const facKey = fac.key;
      if (ratings[facKey] && ratings[facKey].availability !== false && typeof ratings[facKey].rating === 'number') {
        const rVal = ratings[facKey].rating;
        facilityStats[facKey].sum += rVal;
        facilityStats[facKey].count++;

        overallFacilitySum += rVal;
        overallFacilityCount++;
      }
    });
  });

  // Calculate dynamic nested facilityRatings structure
  const facilityRatings = {};
  FACILITIES_CONFIG.forEach(fac => {
    const { sum, count } = facilityStats[fac.key];
    facilityRatings[fac.key] = {
      average: count > 0 ? Number((sum / count).toFixed(1)) : 0,
      count
    };
  });

  // Overall facilities summary
  facilityRatings.overall = {
    average: overallFacilityCount > 0 ? Number((overallFacilitySum / overallFacilityCount).toFixed(1)) : 0,
    count: overallFacilityCount
  };

  const updateData = {
    rating: overallCount > 0 ? Number((overallSum / overallCount).toFixed(1)) : 0,
    totalRatings: overallCount,

    // Backward compatibility (old top-level fields)
    parkingRating: facilityRatings.parking?.average || 0,
    wifiRating: facilityRatings.wifi?.average || 0,
    familyFriendlyRating: facilityRatings.familyFriendly?.average || 0,
    evChargingRating: facilityRatings.evCharging?.average || 0,
    washroomRating: facilityRatings.washroom?.average || 0,

    // Nested ratings configuration
    facilityRatings
  };

  await FoodRestaurant.findByIdAndUpdate(restaurantId, { $set: updateData });
}

export async function updateOrderInstructions(orderId, userId, instructions) {
  const identity = buildOrderIdentityFilter(orderId);
  if (!identity) throw new ValidationError("Order id required");

  const order = await FoodOrder.findOne({
    ...identity,
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (!order) throw new NotFoundError("Order not found");

  const allowedStatuses = ['created', 'confirmed', 'preparing'];
  if (!allowedStatuses.includes(order.orderStatus)) {
    throw new ValidationError("Instructions can no longer be updated for this order");
  }

  order.note = String(instructions || "").trim();
  await order.save();
  return order;
}

// ----- Restaurant -----
export async function listOrdersRestaurant(restaurantId, query) {
  const { page, limit, skip } = buildPaginationOptions(query);
  const filter = {
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
    $or: [
      { "payment.method": { $in: ["cash", "wallet"] } },
      { "payment.status": { $in: ["paid", "authorized", "captured", "settled", "refunded"] } },
    ],
  };
  const [docs, total] = await Promise.all([
    FoodOrder.find(filter)
      .populate("userId", "name phone email profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FoodOrder.countDocuments(filter),
  ]);
  return buildPaginatedResult({ docs: docs.map(d => normalizeOrderForClient(d)), total, page, limit });
}

export async function updateOrderStatusRestaurant(
  orderId,
  restaurantId,
  orderStatus,
  note = "",
  paymentStatus = null
) {
  const identity = buildOrderIdentityFilter(orderId);
  let order = await FoodOrder.findOne({
    ...identity,
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
  });
  if (!order) throw new NotFoundError("Order not found");

  const from = order.orderStatus;
  let modified = false;

  if (orderStatus) {
    if (!isStatusAdvance(from, orderStatus)) {
      throw new ValidationError(`Current order status '${from}' is further ahead than '${orderStatus}'. Order cannot be moved backwards.`);
    }
    order.orderStatus = orderStatus;
    pushStatusHistory(order, {
      byRole: "RESTAURANT",
      byId: restaurantId,
      from,
      to: orderStatus,
      note: note || ""
    });
    modified = true;
  }

  if (paymentStatus) {
    const prevPaymentStatus = order.payment?.status || 'cod_pending';
    if (!order.payment) {
      order.payment = { method: 'cash', status: 'cod_pending' };
    }
    order.payment.status = paymentStatus;

    if (paymentStatus === 'paid') {
      await foodTransactionService.updateTransactionStatus(order._id, 'captured', {
        status: 'captured',
        recordedByRole: "RESTAURANT",
        recordedById: restaurantId,
        note: "COD Cash payment collected by restaurant"
      });
    }

    pushStatusHistory(order, {
      byRole: "RESTAURANT",
      byId: restaurantId,
      from: order.orderStatus,
      to: order.orderStatus,
      note: `Payment status updated from ${prevPaymentStatus} to ${paymentStatus}`
    });
    modified = true;
  }

  if (!modified) {
    throw new ValidationError("No status or payment status updates specified");
  }

  await order.save();

  // Send Pickup OTP SMS if status changed to ready_for_pickup
  if (orderStatus === 'ready_for_pickup' && ['TAKEAWAY', 'DINING'].includes(order.orderType)) {
    try {
      if (order.pickupOtp && order.pickupOtp.hash) {
        const otpCode = decryptOtp(order.pickupOtp.hash);
        if (otpCode) {
          let phone = order.customerPhone;
          if (!phone && order.userId) {
            const user = await FoodUser.findById(order.userId).select('phone').lean();
            phone = user?.phone;
          }
          if (phone) {
            await sendOrderSms(phone, otpCode);
          }
        }
      }
    } catch (err) {
      logger.warn(`Failed to send order ready SMS: ${err.message}`);
    }
  }

  // Custom messages / titles for status updates
  let title = `Order ${order._id.toString()} updated`;
  let body = `Status changed to ${String(orderStatus).replace(/_/g, " ")}`;

  if (orderStatus === "confirmed") {
    title = "Order Accepted! 🧑‍🍳";
    body = "The restaurant has accepted your order and is starting to prepare it.";
  } else if (orderStatus === "preparing") {
    title = "Food is being prepared! 🍳";
    body = "Your food is currently being prepared by the restaurant.";
  } else if (orderStatus === "ready_for_pickup") {
    title = "Food is ready! 🛍️";
    body = "Your order is ready and waiting to be picked up.";
  } else if (String(orderStatus).includes("cancel")) {
    const isOnlinePaid = order.payment.method === "razorpay" && (order.payment.status === "paid" || order.payment.status === "refunded");
    const refundDetail = isOnlinePaid ? ` Your refund of ₹${order.pricing.total} is being processed and will be credited to your original payment method within 5-7 working days.` : "";

    title = "Order Cancelled ❌";
    body = `Unfortunately, your order has been cancelled by the restaurant.${refundDetail}`;
  }

  // Real-time: status update to restaurant room.
  try {
    const io = getIO();
    if (io) {
      console.log(
        `[DEBUG] Emitting status update to restaurant ${restaurantId} and user ${order.userId}: ${orderStatus}`,
      );
      const payload = {
        orderMongoId: order._id?.toString?.(),
        orderId: order._id.toString(),
        orderStatus: order.orderStatus,
        paymentStatus: order.payment?.status,
        paymentMethod: order.payment?.method,
        title,
        message: body,
      };

      if (order.pickupOtp && order.pickupOtp.hash) {
        const otpCode = decryptOtp(order.pickupOtp.hash);
        if (otpCode) {
          payload.pickupOtp = {
            code: otpCode,
            status: order.pickupOtp.status || 'ACTIVE',
            generatedAt: order.pickupOtp.generatedAt,
            attempts: order.pickupOtp.attempts || 0
          };
        }
      }

      const restRoom = rooms.restaurant(restaurantId);
      const userRoom = rooms.user(order.userId);

      console.log(`[DEBUG] Emitting order_status_update to rooms: ${restRoom}, ${userRoom}`);
      io.to(restRoom).emit("order_status_update", payload);
      io.to(userRoom).emit("order_status_update", payload);

      // Notify assigned rider via socket if they exist (only for DELIVERY)
      if (order.orderType === "DELIVERY" && order.dispatch?.riderId) {
        const assignedRiderId = order.dispatch.riderId;
        const riderRoom = `rider:${assignedRiderId}`;
        console.log(`[DEBUG] Emitting order_status_update to rider room: ${riderRoom}`);
        io.to(riderRoom).emit("order_status_update", payload);
      }
    }

    if (orderStatus === 'ready_for_pickup') {
      await notifyOwnerSafely(
        { ownerType: "USER", ownerId: order.userId },
        {
          title: "Your food is ready for pickup.",
          body: "Show this OTP while collecting your order.",
          image: "https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png",
          data: {
            type: "order_status_update",
            orderId: order._id.toString(),
            orderMongoId: order._id?.toString?.() || "",
            orderStatus: String(orderStatus || ""),
            link: `/food/user/orders/${order._id?.toString?.() || ""}`,
          }
        }
      );
      await notifyOwnerSafely(
        { ownerType: "RESTAURANT", ownerId: restaurantId },
        {
          title: "Order Ready for Pickup 🛍️",
          body: "Order is ready for pickup. Verify customer's OTP before handing over.",
          image: "https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png",
          data: {
            type: "order_status_update",
            orderId: order._id.toString(),
            orderMongoId: order._id?.toString?.() || "",
            orderStatus: String(orderStatus || ""),
            link: `/restaurant/orders/${order._id?.toString?.() || ""}`,
          }
        }
      );
    } else {
      await notifyOwnersSafely(
        notifyList,
        {
          title: title,
          body: body,
          image: "https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png",
          data: {
            type: "order_status_update",
            orderId: order._id.toString(),
            orderMongoId: order._id?.toString?.() || "",
            orderStatus: String(orderStatus || ""),
            link: `/food/user/orders/${order._id?.toString?.() || ""}`,
          },
        },
      );
    }
  } catch (err) {
    console.error("[DEBUG] Error emitting status update to restaurant:", err);
  }

  try {
    const io = getIO();
    if (io) {
      if (
        order.orderType === "DELIVERY" &&
        (String(orderStatus) === "preparing" || String(orderStatus) === "confirmed") &&
        (String(from) !== "preparing" && String(from) !== "confirmed")
      ) {
        console.log(
        );

        try {
          await tryAutoAssign(order._id);
          // Refresh local order state after assignment search
          order = await FoodOrder.findById(order._id);
        } catch (err) {
          console.error(`[DEBUG] Auto-assign in updateOrderStatusRestaurant failed:`, err);
        }
      }

      if (String(orderStatus) === 'ready_for_pickup' && String(from) !== 'ready_for_pickup') {
        console.log(`[DEBUG] Order ${order._id.toString()} changed to 'ready_for_pickup'.`);
        if (assignedId) {
          console.log(`[DEBUG] Notifying assigned partner ${assignedId} that order is ready.`);
          const restaurant = await FoodRestaurant.findById(order.restaurantId).select('restaurantName location addressLine1 area city state').lean();
          logger.info(
          );
        } else {
          console.log(`[DEBUG] Order ${order._id.toString()} is ready but no partner assigned.`);
        }
      }
    }
  } catch (err) {
  }

  enqueueOrderEvent('restaurant_order_status_updated', {
    orderMongoId: order._id?.toString?.(),
    orderId: order._id.toString(),
    restaurantId,
    from,
    to: orderStatus
  });

  // ✅ NEW: Automated Razorpay Refund on Restaurant Cancel
  // Triggers if the restaurant sets status to a cancelled state (e.g., cancelled_by_restaurant)
  if (
    String(orderStatus).includes("cancel") &&
    order.payment.status === "paid" &&
    order.payment.method === "razorpay" &&
    order.payment.razorpay?.paymentId &&
    (!order.payment.refund || order.payment.refund.status !== "processed")
  ) {
    try {
      const refundResult = await initiateRazorpayRefund(
        order.payment.razorpay.paymentId,
        order.pricing.total
      );

      if (refundResult.success) {
        order.payment.status = "refunded";
        order.payment.refund = {
          status: "processed",
          amount: order.pricing.total,
          refundId: refundResult.refundId,
          processedAt: new Date()
        };
      } else {
        // Record failure so admin knows a manual refund might be needed
        order.payment.refund = {
          status: "failed",
          amount: order.pricing.total
        };
      }
    } catch (err) {
      console.error(`Automated refund failed for Order ${order._id.toString()} (Restaurant Cancel):`, err);
      order.payment.refund = { status: "failed", amount: order.pricing.total };
    }
    // Re-save order with updated payment status
    await order.save();
  } else if (
    String(orderStatus).includes("cancel") &&
    order.payment.status === "paid" &&
    order.payment.method === "wallet" &&
    (!order.payment.refund || order.payment.refund.status !== "processed")
  ) {
    try {
      await userWalletService.refundWalletBalance(order.userId, order.pricing.total, `Refund for order #${order.order_id || order._id} cancelled by restaurant`, { orderId: order._id });
      order.payment.status = "refunded";
      order.payment.refund = {
        status: "processed",
        amount: order.pricing.total,
        processedAt: new Date()
      };
    } catch (err) {
      console.error(`Wallet refund processing error for Order ${order._id.toString()}:`, err);
      order.payment.refund = { status: "failed", amount: order.pricing.total };
    }
    // Re-save order with updated payment status
    await order.save();
  }

  return normalizeOrderForClient(order);
}

/**
 * Only allowed if status is preparing/ready and no partner has accepted yet.
 */






// ----- Admin -----
export async function listOrdersAdmin(query) {
  const { page, limit, skip } = buildPaginationOptions(query);
  // Admin sees ALL orders — no payment method/status restriction
  const filter = {};

  const rawStatus =
    typeof query.status === "string" ? query.status.trim().toLowerCase() : "";
  const cancelledBy =
    typeof query.cancelledBy === "string"
      ? query.cancelledBy.trim().toLowerCase()
      : "";
  const restaurantIdRaw =
    typeof query.restaurantId === "string" ? query.restaurantId.trim() : "";
  const startDateRaw =
    typeof query.startDate === "string" ? query.startDate.trim() : "";
  const endDateRaw =
    typeof query.endDate === "string" ? query.endDate.trim() : "";

  if (rawStatus && rawStatus !== "all") {
    switch (rawStatus) {
      case "pending":
        // All active/in-progress orders — matches dashboard "pending" count
        filter.orderStatus = { $in: ["created", "confirmed", "preparing", "ready_for_pickup", "picked_up"] };
        break;
      case "accepted":
        filter.orderStatus = "confirmed";
        break;
      case "processing":
        filter.orderStatus = { $in: ["preparing", "ready_for_pickup"] };
        break;
      case "food-on-the-way":
        filter.orderStatus = "picked_up";
        break;
      case "delivered":
        filter.orderStatus = "delivered";
        break;
      case "canceled":
      case "cancelled":
        filter.orderStatus = {
          $in: [
            "cancelled_by_user",
            "cancelled_by_restaurant",
            "cancelled_by_admin",
          ],
        };
        break;
      case "restaurant-cancelled":
        filter.orderStatus = "cancelled_by_restaurant";
        break;
      case "payment-failed":
        filter["payment.status"] = "failed";
        break;
      case "refunded":
        filter["payment.status"] = "refunded";
        break;
      case "offline-payments":
        filter["payment.method"] = "cash";
        filter.orderStatus = { $in: ["created", "confirmed", "delivered"] };
        break;
      case "scheduled":
        filter.scheduledAt = { $ne: null };
        break;
      default:
        break;
    }
  }

  if (cancelledBy) {
    if (cancelledBy === "restaurant") {
      filter.orderStatus = "cancelled_by_restaurant";
    } else if (cancelledBy === "user" || cancelledBy === "customer") {
      filter.orderStatus = "cancelled_by_user";
    }
  }

  if (restaurantIdRaw && mongoose.Types.ObjectId.isValid(restaurantIdRaw)) {
    filter.restaurantId = new mongoose.Types.ObjectId(restaurantIdRaw);
  }

  if (startDateRaw || endDateRaw) {
    const createdAt = {};
    const start = startDateRaw ? new Date(startDateRaw) : null;
    const end = endDateRaw ? new Date(endDateRaw) : null;
    if (start && !Number.isNaN(start.getTime())) {
      createdAt.$gte = start;
    }
    if (end && !Number.isNaN(end.getTime())) {
      createdAt.$lte = end;
    }
    if (Object.keys(createdAt).length > 0) {
      filter.createdAt = createdAt;
    }
  }

  const [docs, total] = await Promise.all([
    FoodOrder.find(filter)
      .populate("userId", "name phone email")
      .populate("restaurantId", "restaurantName area city ownerPhone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FoodOrder.countDocuments(filter),
  ]);
  const paginated = buildPaginatedResult({ docs: docs.map(d => normalizeOrderForClient(d, { includeOtp: true, admin: true })), total, page, limit });
  return { ...paginated, orders: paginated.data };
}



export async function deleteOrderAdmin(orderId, adminId) {
  const identity = buildOrderIdentityFilter(orderId);
  if (!identity) throw new ValidationError("Order id required");

  const order = await FoodOrder.findOne(identity).lean();
  if (!order) throw new NotFoundError("Order not found");

  // Keep support tickets but detach deleted order reference.
  await Promise.all([
    FoodSupportTicket.updateMany(
      { orderId: order._id },
      { $set: { orderId: null } },
    ),
    FoodTransaction.deleteOne({
      $or: [{ orderId: order._id }, { orderReadableId: String(order._id.toString()) }],
    }),
    FoodOrder.deleteOne({ _id: order._id }),
  ]);

  // Remove realtime tracking node if present.
  try {
    const db = getFirebaseDB();
    if (db && order?.orderId) {
      await db.ref(`active_orders/${order._id.toString()}`).remove();
    }
  } catch (err) {
    logger.warn(`Delete order firebase cleanup failed: ${err?.message || err}`);
  }

  // Notify connected apps so stale UI entries can disappear without refresh.
  try {
    const io = getIO();
    if (io) {
      const payload = {
        orderMongoId: String(order._id),
        orderId: String(order._id.toString() || ""),
        deletedBy: "ADMIN",
        adminId: adminId ? String(adminId) : null,
      };

      if (order.userId) io.to(rooms.user(order.userId)).emit("order_deleted", payload);
      if (order.restaurantId) io.to(rooms.restaurant(order.restaurantId)).emit("order_deleted", payload);
    }
  } catch (err) {
    logger.warn(`Delete order socket emit failed: ${err?.message || err}`);
  }

  enqueueOrderEvent("order_deleted_by_admin", {
    orderMongoId: String(order._id),
    orderId: String(order._id.toString() || ""),
    adminId: adminId ? String(adminId) : null,
  });

  return {
    deleted: true,
    orderId: String(order._id.toString() || ""),
    orderMongoId: String(order._id),
  };
}

export async function acceptOrderAdmin(orderId, adminId) {
  const identity = buildOrderIdentityFilter(orderId);
  if (!identity) throw new ValidationError("Order id required");

  let order = await FoodOrder.findOne(identity);
  if (!order) throw new NotFoundError("Order not found");

  const from = order.orderStatus;
  const to = "confirmed";

  if (!isStatusAdvance(from, to)) {
    throw new ValidationError(`Current order status '${from}' is further ahead than '${to}'. Order cannot be moved backwards.`);
  }

  order.orderStatus = to;
  pushStatusHistory(order, {
    byRole: "ADMIN",
    byId: adminId,
    from,
    to,
    note: "Accepted by admin",
  });
  await order.save();

  try {
    const io = getIO();
    if (io) {
      const payload = {
        orderMongoId: order._id?.toString?.(),
        orderId: order._id.toString(),
        orderStatus: order.orderStatus,
        title: "Order Accepted! 🧑‍🍳",
        message: "The admin has accepted your order.",
      };
      io.to(rooms.restaurant(order.restaurantId)).emit("order_status_update", payload);
      io.to(rooms.user(order.userId)).emit("order_status_update", payload);
    }

    await notifyOwnersSafely(
      [
        { ownerType: "USER", ownerId: order.userId },
        { ownerType: "RESTAURANT", ownerId: order.restaurantId },
      ],
      {
        title: "Order Accepted! 🧑‍🍳",
        body: "Your order has been accepted.",
        image: "https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png",
        data: {
          type: "order_status_update",
          orderId: order._id.toString(),
          orderMongoId: order._id?.toString?.() || "",
          orderStatus: "confirmed",
          link: `/food/user/orders/${order._id?.toString?.() || ""}`,
        },
      }
    );
  } catch (err) {
    console.error("Error in admin accept socket/notification:", err);
  }

  const settings = await getDispatchSettings();
  if (
    settings.dispatchMode === "auto" &&
    order.orderType === "DELIVERY" &&
    (order.payment?.method === "cash" ||
      order.payment?.status === "paid" ||
      order.payment?.status === "cod_pending")
  ) {
    try {
      await tryAutoAssign(order._id);
    } catch { }
  }

  return normalizeOrderForClient(order);
}

export async function rejectOrderAdmin(orderId, adminId, reason = "") {
  const identity = buildOrderIdentityFilter(orderId);
  if (!identity) throw new ValidationError("Order id required");

  let order = await FoodOrder.findOne(identity);
  if (!order) throw new NotFoundError("Order not found");

  const from = order.orderStatus;
  const to = "cancelled_by_restaurant";

  order.orderStatus = to;
  pushStatusHistory(order, {
    byRole: "ADMIN",
    byId: adminId,
    from,
    to,
    note: reason || "Rejected by admin",
  });
  await order.save();

  const isOnlinePaid = order.payment?.method === "razorpay" && (order.payment?.status === "paid" || order.payment?.status === "refunded");
  const refundDetail = isOnlinePaid ? ` Your refund of ₹${order.pricing?.total} is being processed and will be credited to your original payment method within 5-7 working days.` : "";
  const title = "Order Cancelled ❌";
  const body = `Unfortunately, your order has been cancelled by admin.${refundDetail}`;

  try {
    const io = getIO();
    if (io) {
      const payload = {
        orderMongoId: order._id?.toString?.(),
        orderId: order._id.toString(),
        orderStatus: order.orderStatus,
        title,
        message: body,
      };
      io.to(rooms.restaurant(order.restaurantId)).emit("order_status_update", payload);
      io.to(rooms.user(order.userId)).emit("order_status_update", payload);
    }

    try {
      await foodTransactionService.updateTransactionStatus(order._id, 'cancelled_by_restaurant', {
        status: isOnlinePaid ? 'refunded' : 'failed',
        note: `Order cancelled by admin: ${reason}`,
        recordedByRole: 'ADMIN',
        recordedById: adminId
      });
    } catch (err) {
      logger.warn(`rejectOrderAdmin transaction sync failed: ${err?.message || err}`);
    }

    await notifyOwnersSafely(
      [
        { ownerType: "USER", ownerId: order.userId },
        { ownerType: "RESTAURANT", ownerId: order.restaurantId },
      ],
      {
        title,
        body,
        image: "https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png",
        data: {
          type: "order_status_update",
          orderId: order._id.toString(),
          orderMongoId: order._id?.toString?.() || "",
          orderStatus: to,
          link: `/food/user/orders/${order._id?.toString?.() || ""}`,
        },
      }
    );
  } catch (err) {
    console.error("Error in admin reject socket/notification:", err);
  }

  if (
    order.payment?.status === "paid" &&
    order.payment?.method === "razorpay" &&
    order.payment?.razorpay?.paymentId &&
    (!order.payment?.refund || order.payment?.refund?.status !== "processed")
  ) {
    try {
      const refundResult = await initiateRazorpayRefund(
        order.payment.razorpay.paymentId,
        order.pricing.total
      );

      if (refundResult.success) {
        order.payment.status = "refunded";
        order.payment.refund = {
          status: "processed",
          amount: order.pricing.total,
          refundId: refundResult.refundId,
          processedAt: new Date()
        };
      } else {
        order.payment.refund = {
          status: "failed",
          amount: order.pricing.total
        };
      }
    } catch (err) {
      console.error(`Automated refund failed for Order ${order._id.toString()} (Admin Cancel):`, err);
      order.payment.refund = { status: "failed", amount: order.pricing.total };
    }
    await order.save();
  } else if (
    order.payment?.status === "paid" &&
    order.payment?.method === "wallet" &&
    (!order.payment?.refund || order.payment?.refund?.status !== "processed")
  ) {
    try {
      await userWalletService.refundWalletBalance(order.userId, order.pricing.total, `Refund for order #${order.order_id || order._id} cancelled by admin`, { orderId: order._id });
      order.payment.status = "refunded";
      order.payment.refund = {
        status: "processed",
        amount: order.pricing.total,
        processedAt: new Date()
      };
    } catch (err) {
      console.error(`Wallet refund processing error for Order ${order._id.toString()}:`, err);
      order.payment.refund = { status: "failed", amount: order.pricing.total };
    }
    await order.save();
  }

  enqueueOrderEvent('restaurant_order_status_updated', {
    orderMongoId: order._id?.toString?.(),
    orderId: order._id.toString(),
    restaurantId: order.restaurantId,
    from,
    to,
  });

  return normalizeOrderForClient(order);
}

export async function verifyOtp(orderId, otpCode, verifier) {
  const identity = buildOrderIdentityFilter(orderId);
  if (!identity) throw new ValidationError("Order id required");

  const order = await FoodOrder.findOne(identity);
  if (!order) throw new NotFoundError("Order not found");

  if (order.orderType !== 'TAKEAWAY' && order.orderType !== 'DINING') {
    throw new ValidationError("OTP verification is not supported for this order type");
  }

  if (!order.pickupOtp || !order.pickupOtp.hash) {
    throw new ValidationError("No OTP has been generated for this order");
  }

  if (order.payment?.method === 'cash' && order.payment?.status !== 'paid') {
    throw new ValidationError("Please collect payment and mark as cash received before verifying OTP.");
  }

  if (order.pickupOtp.status === 'VERIFIED') {
    throw new ValidationError("OTP has already been verified");
  }

  if (order.pickupOtp.attempts >= 5) {
    throw new ValidationError("Too many failed attempts. This OTP is locked.");
  }

  const expiryWindowMs = 2 * 60 * 60 * 1000;
  const now = new Date();
  if (order.pickupOtp.generatedAt && (now - order.pickupOtp.generatedAt > expiryWindowMs)) {
    order.pickupOtp.status = 'EXPIRED';
    await order.save();
    throw new ValidationError("OTP has expired");
  }

  if (order.pickupOtp.status === 'EXPIRED') {
    throw new ValidationError("OTP has expired");
  }

  const decrypted = decryptOtp(order.pickupOtp.hash);
  if (decrypted !== otpCode) {
    order.pickupOtp.attempts = (order.pickupOtp.attempts || 0) + 1;
    await order.save();
    throw new ValidationError("Invalid OTP code");
  }

  const fromStatus = order.orderStatus;
  order.pickupOtp.status = 'VERIFIED';
  order.pickupOtp.verifiedAt = now;
  order.pickupOtp.verifiedBy = verifier.userId;
  order.orderStatus = 'completed';

  pushStatusHistory(order, {
    byRole: verifier.role,
    byId: verifier.userId,
    from: fromStatus,
    to: 'completed',
    note: 'OTP verified. Order completed.'
  });

  await order.save();

  try {
    const io = getIO();
    if (io) {
      const payload = {
        orderMongoId: order._id.toString(),
        orderId: order._id.toString(),
        orderStatus: 'completed',
        title: "Order Completed! 🎉",
        message: "Your OTP has been verified and your order is complete.",
        pickupOtp: {
          code: decrypted,
          status: 'VERIFIED',
          verifiedAt: order.pickupOtp.verifiedAt,
          verifiedBy: order.pickupOtp.verifiedBy
        }
      };
      io.to(rooms.user(order.userId)).emit("order_status_update", payload);
      io.to(rooms.restaurant(order.restaurantId)).emit("order_status_update", payload);
    }

    // Send push notifications
    await notifyOwnerSafely(
      { ownerType: "USER", ownerId: order.userId },
      {
        title: "Order Completed! 🎉",
        body: "Your order is successfully collected and completed.",
        image: "https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png",
        data: {
          type: "order_status_update",
          orderId: order._id.toString(),
          orderMongoId: order._id.toString(),
          orderStatus: 'completed',
          link: `/food/user/orders/${order._id.toString()}`
        }
      }
    );
    await notifyOwnerSafely(
      { ownerType: "RESTAURANT", ownerId: order.restaurantId },
      {
        title: "OTP Verified Successfully",
        body: `OTP verified for Order #${order.order_id || order._id}. Order marked as completed.`,
        image: "https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png",
        data: {
          type: "order_status_update",
          orderId: order._id.toString(),
          orderMongoId: order._id.toString(),
          orderStatus: 'completed',
          link: `/restaurant/orders/${order._id.toString()}`
        }
      }
    );
  } catch (err) {
    logger.warn(`verifyOtp socket emit or notifications failed: ${err.message}`);
  }

  return normalizeOrderForClient(order, { includeOtp: true, admin: verifier.role === 'ADMIN' });
}

export async function updateOrderLocation(orderId, lat, lng, distanceText, durationText, etaMins) {
  const identity = buildOrderIdentityFilter(orderId);
  if (!identity) throw new ValidationError("Order id required");

  const order = await FoodOrder.findOne(identity);
  if (!order) throw new NotFoundError("Order not found");

  if (lat != null && lng != null) {
    order.customerLocation = { latitude: lat, longitude: lng };
  }
  if (distanceText) {
    order.distanceKm = Number(parseFloat(distanceText));
  }
  if (etaMins != null) {
    order.etaMins = Number(etaMins);
  }
  if (durationText) {
    order.arrivalEstimate = durationText;
  }

  await order.save();
  return order;
}

