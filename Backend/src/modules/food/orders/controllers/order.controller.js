import { sendResponse } from '../../../../utils/response.js';
import { ValidationError } from '../../../../core/auth/errors.js';
import * as orderService from '../services/order.service.js';
import * as foodOrderPaymentService from '../services/foodOrderPayment.service.js';
import {
    validateCalculateOrderDto,
    validateCreateOrderDto,
    validateVerifyPaymentDto,
    validateCancelOrderDto,
    validateOrderStatusDto,
    validateDispatchSettingsDto,
    validateOrderRatingsDto,
    validateRejectOrderDto
} from '../validators/order.validator.js';

export async function calculateOrderController(req, res, next) {
    try {
        const userId = req.user?.userId;
        const dto = validateCalculateOrderDto(req.body);
        const result = await orderService.calculateOrder(userId, dto);
        return sendResponse(res, 200, 'Pricing calculated', result);
    } catch (err) {
        next(err);
    }
}

export async function createOrderController(req, res, next) {
    try {
        const userId = req.user?.userId;
        const dto = validateCreateOrderDto(req.body);
        const result = await orderService.createOrder(userId, dto);
        return sendResponse(res, 201, 'Order placed successfully', result);
    } catch (err) {
        next(err);
    }
}

export async function verifyPaymentController(req, res, next) {
    try {
        const userId = req.user?.userId;
        const dto = validateVerifyPaymentDto(req.body);
        const result = await orderService.verifyPayment(userId, dto);
        return sendResponse(res, 200, 'Payment verified', result);
    } catch (err) {
        next(err);
    }
}

export async function listOrdersUserController(req, res, next) {
    try {
        const userId = req.user?.userId;
        const result = await orderService.listOrdersUser(userId, req.query);
        return sendResponse(res, 200, 'Orders retrieved', result);
    } catch (err) {
        next(err);
    }
}

export async function getOrderByIdUserController(req, res, next) {
    try {
        const userId = req.user?.userId;
        const orderId = req.params.orderId;
        const order = await orderService.getOrderById(orderId, { userId });
        
        const restaurant = order?.restaurantId || null;
        const restaurantLocation = restaurant?.location || null;
        const userLocation = order?.userLocation || null;
        const timeline = order?.statusHistory || [];

        return sendResponse(res, 200, 'Order retrieved', {
            order,
            restaurant,
            orderStatus: order?.orderStatus || order?.status || 'PENDING',
            paymentStatus: order?.paymentStatus || 'PENDING',
            orderType: order?.orderType || 'TAKEAWAY',
            restaurantLocation,
            userLocation,
            timeline
        });
    } catch (err) {
        next(err);
    }
}

export async function getOrderDropOtpUserController(req, res, next) {
    try {
        const userId = req.user?.userId;
        const orderId = req.params.orderId;
        const result = await orderService.getDropOtpUser(orderId, userId);
        return sendResponse(res, 200, 'Drop OTP retrieved', result);
    } catch (err) {
        next(err);
    }
}

/** Ledger rows from `food_order_payments` (append-only audit trail) */
export async function getOrderPaymentsUserController(req, res, next) {
    try {
        const userId = req.user?.userId;
        const orderId = req.params.orderId;
        const result = await foodOrderPaymentService.listFoodOrderPaymentsForUser(orderId, userId);
        return sendResponse(res, 200, 'Payment history', result);
    } catch (err) {
        next(err);
    }
}

export async function cancelOrderController(req, res, next) {
    try {
        const userId = req.user?.userId;
        const orderId = req.params.orderId;
        const dto = validateCancelOrderDto(req.body);
        const order = await orderService.cancelOrder(orderId, userId, dto.reason, dto.refundDestination);
        return sendResponse(res, 200, 'Order cancelled', { order });
    } catch (err) {
        next(err);
    }
}

export async function submitOrderRatingsController(req, res, next) {
    try {
        const userId = req.user?.userId;
        const orderId = req.params.orderId;
        const dto = validateOrderRatingsDto(req.body);
        const order = await orderService.submitOrderRatings(orderId, userId, dto);
        return sendResponse(res, 200, 'Ratings submitted successfully', { order });
    } catch (err) {
        next(err);
    }
}

export async function updateOrderInstructionsController(req, res, next) {
    try {
        const userId = req.user?.userId;
        const orderId = req.params.orderId;
        const instructions = req.body.instructions;
        const order = await orderService.updateOrderInstructions(orderId, userId, instructions);
        return sendResponse(res, 200, 'Instructions updated successfully', { order });
    } catch (err) {
        next(err);
    }
}

export async function getDispatchSettingsController(req, res, next) {
    try {
        const result = await orderService.getDispatchSettings();
        return sendResponse(res, 200, 'Dispatch settings retrieved', result);
    } catch (err) {
        next(err);
    }
}

export async function updateDispatchSettingsController(req, res, next) {
    try {
        const adminId = req.user?.userId;
        const dto = validateDispatchSettingsDto(req.body);
        const result = await orderService.updateDispatchSettings(dto.dispatchMode, adminId);
        return sendResponse(res, 200, 'Dispatch settings updated', result);
    } catch (err) {
        next(err);
    }
}

export async function listOrdersRestaurantController(req, res, next) {
    try {
        const restaurantId = req.user?.userId;
        const result = await orderService.listOrdersRestaurant(restaurantId, req.query);
        return sendResponse(res, 200, 'Orders retrieved', result);
    } catch (err) {
        next(err);
    }
}

export async function getOrderByIdRestaurantController(req, res, next) {
    try {
        const restaurantId = req.user?.userId;
        const orderId = req.params.orderId;
        const order = await orderService.getOrderById(orderId, { restaurantId });
        return sendResponse(res, 200, 'Order retrieved', { order });
    } catch (err) {
        next(err);
    }
}

export async function updateOrderStatusRestaurantController(req, res, next) {
    try {
        const restaurantId = req.user?.userId;
        const orderId = req.params.orderId;
        const dto = validateOrderStatusDto(req.body);
        const order = await orderService.updateOrderStatusRestaurant(orderId, restaurantId, dto.orderStatus, dto.note);
        return sendResponse(res, 200, 'Order status updated', { order });
    } catch (err) {
        next(err);
    }
}



export async function createCollectQrController(req, res, next) {
    try {
        const orderId = req.params.orderId;
        const customerInfo = req.body || {};
        return sendResponse(res, 200, 'QR created', result);
    } catch (err) {
        next(err);
    }
}





export async function listOrdersAdminController(req, res, next) {
    try {
        const result = await orderService.listOrdersAdmin(req.query);
        return sendResponse(res, 200, 'Orders retrieved', result);
    } catch (err) {
        next(err);
    }
}

export async function getOrderByIdAdminController(req, res, next) {
    try {
        const orderId = req.params.orderId;
        const order = await orderService.getOrderById(orderId, { admin: true });
        return sendResponse(res, 200, 'Order retrieved', { order });
    } catch (err) {
        next(err);
    }
}



export async function deleteOrderAdminController(req, res, next) {
    try {
        const adminId = req.user?.userId;
        const orderId = req.params.orderId;
        const result = await orderService.deleteOrderAdmin(orderId, adminId);
        return sendResponse(res, 200, 'Order deleted successfully', result);
    } catch (err) {
        next(err);
    }
}

export async function acceptOrderAdminController(req, res, next) {
    try {
        const adminId = req.user?.userId;
        const orderId = req.params.orderId;
        const order = await orderService.acceptOrderAdmin(orderId, adminId);
        return sendResponse(res, 200, 'Order accepted by admin', { order });
    } catch (err) {
        next(err);
    }
}

export async function rejectOrderAdminController(req, res, next) {
    try {
        const adminId = req.user?.userId;
        const orderId = req.params.orderId;
        const dto = validateRejectOrderDto(req.body);
        const order = await orderService.rejectOrderAdmin(orderId, adminId, dto.reason);
        return sendResponse(res, 200, 'Order rejected by admin', { order });
    } catch (err) {
        next(err);
    }
}

export async function verifyOtpController(req, res, next) {
    try {
        const orderId = req.params.orderId;
        const otp = req.body.otp;
        const verifier = {
            userId: req.user?.userId,
            role: req.user?.role
        };
        if (!otp) {
            throw new ValidationError("OTP code is required");
        }
        const order = await orderService.verifyOtp(orderId, otp, verifier);
        return sendResponse(res, 200, 'OTP verified successfully', { order });
    } catch (err) {
        next(err);
    }
}


