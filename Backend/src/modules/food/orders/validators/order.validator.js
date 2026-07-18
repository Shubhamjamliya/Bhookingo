import { z } from 'zod';
import { ValidationError } from '../../../../core/auth/errors.js';

const orderItemSchema = z.object({
    itemId: z.string().min(1, 'Item id required'),
    name: z.string().min(1, 'Item name required'),
    variantId: z.string().optional(),
    variantName: z.string().optional(),
    variantPrice: z.number().min(0).optional(),
    price: z.number().min(0),
    quantity: z.number().int().min(1),
    isVeg: z.boolean().optional().default(true),
    image: z.string().optional(),
    notes: z.string().optional()
});

const addressSchema = z.object({
    label: z.enum(['Home', 'Office', 'Other']).optional(),
    name: z.string().optional(),
    fullName: z.string().optional(),
    street: z.string().min(1, 'Street required'),
    additionalDetails: z.string().optional(),
    city: z.string().min(1, 'City required'),
    state: z.string().min(1, 'State required'),
    zipCode: z.string().optional(),
    phone: z.string().optional(),
    location: z
        .object({
            type: z.literal('Point').optional(),
            coordinates: z.tuple([z.number(), z.number()]).optional()
        })
        .optional()
});

const pricingSchema = z.object({
    subtotal: z.number().min(0),
    tax: z.number().min(0).optional(),
    packagingFee: z.number().min(0).optional(),
    platformFee: z.number().min(0).optional(),
    discount: z.number().min(0).optional(),
    total: z.number().min(0),
    currency: z.string().optional()
});

export function validateCalculateOrderDto(body) {
    const schema = z.object({
        items: z.array(orderItemSchema).min(1, 'At least one item required'),
        restaurantId: z.string().min(1, 'Restaurant id required'),
        highwayId: z.string().optional(),
        couponCode: z.string().optional(),
        orderType: z.enum(['DELIVERY', 'TAKEAWAY', 'DINING']).optional(),
    });
    const result = schema.safeParse(body);
    if (!result.success) {
        const first = result.error.issues?.[0];
        const path = first?.path?.length ? first.path.join('.') : '';
        const msg = path ? `${path}: ${first?.message || 'Validation failed'}` : first?.message || 'Validation failed';
        throw new ValidationError(msg);
    }
    return result.data;
}

export function validateCreateOrderDto(body) {
    const schema = z.object({
        items: z.array(orderItemSchema).min(1, 'At least one item required'),
        address: addressSchema.optional(),
        restaurantId: z.string().min(1, 'Restaurant id required'),
        restaurantName: z.string().optional(),
        customerName: z.string().optional(),
        customerPhone: z.string().optional(),
        pricing: pricingSchema,
        note: z.string().optional(),
        restaurantNote: z.string().optional(),
        sendCutlery: z.boolean().optional(),
        paymentMethod: z.enum(['cash', 'razorpay', 'razorpay_qr', 'card', 'wallet']),
        highwayId: z.string().nullable().optional(),
        scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
        orderType: z.enum(['DELIVERY', 'TAKEAWAY', 'DINING']).default('DELIVERY'),
        userLocation: z.object({
            latitude: z.number(),
            longitude: z.number()
        }).optional()
    }).refine(data => {
        if (data.orderType === 'DELIVERY' && !data.address) {
            return false;
        }
        return true;
    }, {
        message: 'Delivery address is required for delivery orders',
        path: ['address']
    });
    const result = schema.safeParse(body);
    if (!result.success) {
        const msg = result.error.errors?.[0]?.message || 'Validation failed';
        throw new ValidationError(msg);
    }
    return result.data;
}

export function validateVerifyPaymentDto(body) {
    const schema = z.object({
        orderId: z.string().min(1, 'Order id required'),
        razorpayOrderId: z.string().min(1, 'Razorpay order id required'),
        razorpayPaymentId: z.string().min(1, 'Razorpay payment id required'),
        razorpaySignature: z.string().min(1, 'Razorpay signature required')
    });
    const result = schema.safeParse(body);
    if (!result.success) {
        const msg = result.error.errors?.[0]?.message || 'Validation failed';
        throw new ValidationError(msg);
    }
    return result.data;
}

export function validateCancelOrderDto(body) {
    const schema = z.object({
        reason: z.string().optional(),
        refundDestination: z.enum(['source', 'wallet']).optional()
    });
    const result = schema.safeParse(body || {});
    if (!result.success) {
        throw new ValidationError(result.error.errors?.[0]?.message || 'Validation failed');
    }
    return result.data;
}

export function validateOrderStatusDto(body) {
    const schema = z.object({
        orderStatus: z.enum([
            'confirmed',
            'preparing',
            'ready_for_pickup',
            'picked_up',
            'delivered',
            'cancelled_by_restaurant'
        ]).optional(),
        paymentStatus: z.enum([
            'cod_pending',
            'created',
            'authorized',
            'paid',
            'failed',
            'refunded',
            'pending_qr'
        ]).optional(),
        note: z.string().optional()
    });
    const result = schema.safeParse(body);
    if (!result.success) {
        throw new ValidationError(result.error.errors?.[0]?.message || 'Validation failed');
    }
    return result.data;
}



export function validateDispatchSettingsDto(body) {
    const schema = z.object({
        dispatchMode: z.enum(['auto', 'manual'])
    });
    const result = schema.safeParse(body);
    if (!result.success) {
        throw new ValidationError(result.error.errors?.[0]?.message || 'Validation failed');
    }
    return result.data;
}

export function validateOrderRatingsDto(body) {
    console.log("📥 Incoming ratings payload validation request body:", JSON.stringify(body, null, 2));
    const facilitySchema = z.object({
        rating: z.number().min(1).max(5).nullable().optional(),
        availability: z.boolean().optional()
    }).optional();

    const schema = z.object({
        restaurantRating: z.number().min(1).max(5),
        restaurantComment: z.string().max(500).optional().nullable(),
        parking: facilitySchema,
        wifi: facilitySchema,
        familyFriendly: facilitySchema,
        evCharging: facilitySchema,
        washroom: facilitySchema
    });
    const result = schema.safeParse(body || {});
    if (!result.success) {
        const formattedErrors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        console.error("❌ Ratings validation failed! Details:", formattedErrors);
        throw new ValidationError(`Validation failed: ${formattedErrors}`);
    }
    console.log("✅ Ratings validation passed successfully. Validated DTO:", JSON.stringify(result.data, null, 2));
    return result.data;
}

export function validateRejectOrderDto(body) {
    const schema = z.object({
        reason: z.string().optional()
    });
    const result = schema.safeParse(body || {});
    if (!result.success) {
        throw new ValidationError(result.error.errors?.[0]?.message || 'Validation failed');
    }
    return result.data;
}
