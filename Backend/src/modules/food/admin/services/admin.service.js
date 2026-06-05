import mongoose from 'mongoose';
import { ValidationError } from '../../../../core/auth/errors.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';


import { FoodZone } from '../models/zone.model.js';
import { FoodCategory } from '../models/category.model.js';
import { FoodItem } from '../models/food.model.js';
import { FoodOffer } from '../models/offer.model.js';
import { FoodOfferUsage } from '../models/offerUsage.model.js';

import { FoodEarningAddon } from '../models/earningAddon.model.js';
import { FoodEarningAddonHistory } from '../models/earningAddonHistory.model.js';
import { FoodRestaurantCommission } from '../models/restaurantCommission.model.js';

import { FoodFeeSettings } from '../models/feeSettings.model.js';
import { FeedbackExperience } from '../models/feedbackExperience.model.js';
import { FoodUser } from '../../../../core/users/user.model.js';
import { FoodRefreshToken } from '../../../../core/refreshTokens/refreshToken.model.js';


import { FoodReferralSettings } from '../models/referralSettings.model.js';
import { FoodReferralLog } from '../models/referralLog.model.js';
import { FoodSafetyEmergencyReport } from '../models/safetyEmergencyReport.model.js';
import { FoodAddon } from '../../restaurant/models/foodAddon.model.js';
import { FoodSupportTicket } from '../../user/models/supportTicket.model.js';
import { FoodRestaurantSupportTicket } from '../../restaurant/models/supportTicket.model.js';
import { FoodOrder } from '../../orders/models/order.model.js';
import { FoodTransaction } from '../../orders/models/foodTransaction.model.js';
import { FoodRestaurantWithdrawal } from '../../restaurant/models/foodRestaurantWithdrawal.model.js';


    countDocuments: async () => 0,
    find: () => ({
        sort: () => ({
            limit: () => ({
                select: () => ({
                    lean: async () => []
                })
            })
        }),
        select: () => ({
            lean: async () => []
        }),
        skip: () => ({
            limit: () => ({
                populate: () => ({
                    lean: async () => []
                }),
                lean: async () => []
            })
        }),
        lean: async () => []
    }),
    findOne: () => ({
        select: () => ({
            lean: async () => null
        }),
        lean: async () => null
    }),
    findById: () => ({
        lean: async () => null,
        select: () => ({
            lean: async () => null
        })
    }),
    findByIdAndUpdate: async () => null,
    updateOne: async () => null
};



import {
    backfillLegacyCategoryWorkflow,
    categoryAllowsFoodType,
    normalizeCategoryFoodTypeScope,
    serializeCategoryForResponse
} from '../../shared/categoryWorkflow.js';
import {
    extractRawFoodVariants,
    getFoodDisplayPrice,
    hasFoodVariants,
    normalizeFoodVariantsInput,
    serializeFoodVariants
} from './foodVariant.service.js';

const parseBooleanLike = (value, fieldName) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'y', 'on', 'active'].includes(normalized)) return true;
        if (['false', '0', 'no', 'n', 'off', 'inactive'].includes(normalized)) return false;
    }
    throw new ValidationError(`${fieldName} must be a boolean`);
};

const toFiniteNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const num = typeof value === 'number' ? value : Number(String(value).trim());
    return Number.isFinite(num) ? num : null;
};

const normalizeRestaurantTime = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';

    const toHHMM = (hour, minute) => {
        const h = Number(hour);
        const m = Number(minute);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return '';
        if (h < 0 || h > 23 || m < 0 || m > 59) return '';
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const hhmm = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (hhmm) return toHHMM(hhmm[1], hhmm[2]);

    const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
    if (ampm) {
        let hour = Number(ampm[1]);
        const minute = Number(ampm[2]);
        const period = ampm[3].toUpperCase();
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) return '';
        if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return '';
        if (period === 'AM') hour = hour === 12 ? 0 : hour;
        if (period === 'PM') hour = hour === 12 ? 12 : hour + 12;
        return toHHMM(hour, minute);
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
        return toHHMM(parsed.getHours(), parsed.getMinutes());
    }

    return '';
};

const timeToMinutes = (value) => {
    const normalized = normalizeRestaurantTime(value);
    if (!normalized) return null;
    const [h, m] = normalized.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
};

const validateOpeningClosingTimes = (openingTime, closingTime) => {
    const open = timeToMinutes(openingTime);
    const close = timeToMinutes(closingTime);
    if (open === null || close === null) return;
    if (open === close) {
        throw new ValidationError('Opening time and closing time cannot be same');
    }
    if (close < open) {
        throw new ValidationError('Closing time cannot be less than opening time');
    }
};

export async function getRestaurantComplaints(query = {}) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 500);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = { type: 'order' };
    if (query.status && query.status !== 'all') filter.status = query.status;
    if (query.complaintType && query.complaintType !== 'all') filter.issueType = query.complaintType;
    if (query.restaurantId && mongoose.Types.ObjectId.isValid(query.restaurantId)) {
        filter.restaurantId = new mongoose.Types.ObjectId(query.restaurantId);
    }
    if (query.search) {
        const searchRegex = { $regex: query.search, $options: 'i' };
        const restaurantIds = await FoodRestaurant.find({ restaurantName: searchRegex }).select('_id').lean();
        const userIds = await FoodUser.find({ name: searchRegex }).select('_id').lean();
        const orderIds = await FoodOrder.find({ orderId: searchRegex }).select('_id').lean();

        filter.$or = [
            { restaurantId: { $in: restaurantIds.map(r => r._id) } },
            { userId: { $in: userIds.map(u => u._id) } },
            { orderId: { $in: orderIds.map(o => o._id) } },
            { description: searchRegex },
            { issueType: searchRegex }
        ];
    }
    const fromDate = query.fromDate || query.startDate;
    const toDate = query.toDate || query.endDate;
    if (fromDate && toDate) {
        filter.createdAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    }

    const [complaints, total] = await Promise.all([
        FoodSupportTicket.find(filter)
            .populate('userId', 'name phone profileImage')
            .populate('restaurantId', 'restaurantName profileImage area city')
            .populate('orderId', 'orderId orderStatus pricing createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        FoodSupportTicket.countDocuments(filter)
    ]);

    return { complaints, total, page, limit };
}

export async function globalSearch(query = '') {
    const term = String(query).trim();
    if (!term) return [];
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = { $regex: escaped, $options: 'i' };

    const [orders, users, restaurants, items, categories, addons] = await Promise.all([
        FoodOrder.find({
            $or: [{ orderId: regex }, { orderStatus: regex }]
        })
            .limit(5)
            .select('orderId orderStatus createdAt')
            .lean(),
        FoodUser.find({
            $or: [{ name: regex }, { email: regex }, { phone: regex }],
            role: 'USER'
        })
            .limit(5)
            .select('name email phone')
            .lean(),
        FoodRestaurant.find({
            $or: [{ restaurantName: regex }, { ownerName: regex }, { city: regex }]
        })
            .limit(5)
            .select('restaurantName city area status')
            .lean(),
        FoodItem.find({
            $or: [{ name: regex }, { description: regex }]
        })
            .limit(5)
            .select('name description price')
            .lean(),
        FoodCategory.find({ name: regex })
            .limit(3)
            .select('name image')
            .lean(),
        FoodAddon.find({ name: regex })
            .limit(3)
            .select('name price')
            .lean()
    ]);

    const results = [];

    orders.forEach(o => results.push({
        id: o._id,
        type: 'Order',
        title: `#${o.orderId}`,
        description: `Status: ${o.orderStatus}`,
        path: `/admin/food/orders/all?orderId=${o._id}`
    }));

    users.forEach(u => results.push({
        id: u._id,
        type: 'User',
        title: u.name || 'Unnamed',
        description: `${u.email || u.phone || ''}`,
        path: `/admin/food/customers?userId=${u._id}`
    }));

    restaurants.forEach(r => results.push({
        id: r._id,
        type: 'Restaurant',
        title: r.restaurantName,
        description: `${r.area || ''}, ${r.city || ''} (${r.status})`,
        path: `/admin/food/restaurants?restaurantId=${r._id}`
    }));

    items.forEach(i => results.push({
        id: i._id,
        type: 'Product',
        title: i.name,
        description: `Price: â‚¹${i.price}`,
        path: `/admin/food/foods?productId=${i._id}`
    }));

    categories.forEach(c => results.push({
        id: c._id,
        type: 'Category',
        title: c.name,
        description: 'Menu Category',
        path: `/admin/food/categories`
    }));

    addons.forEach(a => results.push({
        id: a._id,
        type: 'Addon',
        title: a.name,
        description: `Price: â‚¹${a.price}`,
        path: `/admin/food/addons`
    }));

    return results;
}

export async function getArchivedAccounts() {
        FoodUser.find({ isActive: false })
            .select('name phone email profileImage createdAt updatedAt deletedAt')
            .lean(),
        FoodRestaurant.find({ status: 'deleted' })
            .select('restaurantName ownerPhone ownerEmail profileImage createdAt updatedAt deletedAt')
            .lean(),

            .select('name phone email profilePhoto createdAt updatedAt deletedAt')
            .lean(),
    ]);


    // Helper to get original phone (remove _deleted_ suffix)
    const getOriginalPhone = (p) => String(p || '').split('_')[0];

    const archived = [
        ...users.map(u => ({
            id: u._id,
            name: u.name || 'Unnamed User',
            phone: u.phone,
            originalPhone: getOriginalPhone(u.phone),
            email: u.email || 'N/A',
            profileImage: u.profileImage,
            role: 'User',
            type: 'user',
            deletedAt: u.deletedAt || u.updatedAt,
            status: 'Deleted'
        })),
        ...restaurants.map(r => ({
            id: r._id,
            name: r.restaurantName,
            phone: r.ownerPhone,
            originalPhone: getOriginalPhone(r.ownerPhone),
            email: r.ownerEmail || 'N/A',
            profileImage: r.profileImage,
            role: 'Restaurant',
            type: 'restaurant',
            deletedAt: r.deletedAt || r.updatedAt,
            status: 'Deleted'
        })),
            id: d._id,
            name: d.name,
            phone: d.phone,
            originalPhone: getOriginalPhone(d.phone),
            email: d.email || 'N/A',
            profileImage: d.profilePhoto,
            deletedAt: d.deletedAt || d.updatedAt,
            status: 'Deleted'
        }))
    ];

    // For each archived entity, check if a NEW account exists with the original phone
    const enhancedArchived = await Promise.all(archived.map(async (acc) => {
        let newAccount = null;
        if (acc.type === 'user') {
            newAccount = await FoodUser.findOne({ phone: acc.originalPhone, isActive: true }).select('createdAt').lean();
        } else if (acc.type === 'restaurant') {
            newAccount = await FoodRestaurant.findOne({ ownerPhone: acc.originalPhone, status: { $ne: 'deleted' } }).select('createdAt').lean();

        }

        return {
            ...acc,
            newAccountCreatedAt: newAccount ? newAccount.createdAt : null
        };
    }));

    // Sort by deletedAt (updatedAt) descending
    return enhancedArchived.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
}

export async function updateRestaurantComplaint(id, updateData) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid complaint ID');
    }
    const update = {};
    if (updateData.status) update.status = updateData.status;
    if (updateData.adminResponse !== undefined) update.adminResponse = updateData.adminResponse;

    const updated = await FoodSupportTicket.findByIdAndUpdate(
        id,
        { $set: update },
        { new: true }
    ).lean();

    if (!updated) throw new ValidationError('Complaint not found');
    return updated;
}

export async function getRestaurants(query) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 100, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;
    const status = query.status;
    const filter = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        filter.status = status;
    }
    const [restaurants, total] = await Promise.all([
        FoodRestaurant.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('restaurantName location area city profileImage coverImages menuImages status ownerName ownerPhone zoneId')
            .populate('zoneId', 'name zoneName')
            .lean(),
        FoodRestaurant.countDocuments(filter)
    ]);
    return { restaurants, total, page, limit };
}


const CANCELLED_ORDER_STATUSES = ['cancelled_by_user', 'cancelled_by_restaurant', 'cancelled_by_admin'];
const PENDING_ORDER_STATUSES = ['created', 'confirmed', 'preparing', 'ready_for_pickup', 'picked_up'];
const DASHBOARD_PENDING_ORDER_STATUSES = ['created', 'confirmed'];
const DASHBOARD_PROCESSING_ORDER_STATUSES = ['preparing', 'ready_for_pickup'];
const DELIVERED_ORDER_STATUS_EXPR = { $eq: ['$orderStatus', 'delivered'] };
const DASHBOARD_DERIVED_PLATFORM_FEE_EXPR = {
    $max: [
        0,
        {
            $subtract: [
                {
                    $subtract: [
                        {
                            $subtract: [
                                {
                                    $subtract: [
                                        { $ifNull: ['$pricing.total', 0] },
                                        { $ifNull: ['$pricing.subtotal', 0] }
                                    ]
                                },
                                { $ifNull: ['$pricing.packagingFee', 0] }
                            ]
                        },
                    ]
                },
                {
                    $subtract: [
                        { $ifNull: ['$pricing.tax', 0] },
                        { $ifNull: ['$pricing.discount', 0] }
                    ]
                }
            ]
        }
    ]
};
const DASHBOARD_PLATFORM_FEE_EXPR = {
    $ifNull: ['$pricing.platformFee', DASHBOARD_DERIVED_PLATFORM_FEE_EXPR]
};
    $ifNull: [
        {
            $ifNull: [
                { $ifNull: ['$riderEarning', 0] }
            ]
        }
    ]
};

const getDateRangeByPeriod = (periodRaw) => {
    const period = String(periodRaw || 'overall').trim().toLowerCase();
    if (!period || period === 'overall' || period === 'all') return null;

    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (period === 'today') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    if (period === 'week') {
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - start.getDay());
        end.setTime(start.getTime());
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    if (period === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start: monthStart, end: monthEnd };
    }

    if (period === 'year') {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return { start: yearStart, end: yearEnd };
    }

    return null;
};

const formatMonthShort = (year, monthIndex) =>
    new Date(year, monthIndex, 1).toLocaleString('en-IN', { month: 'short' });

export async function getDashboardStats(query = {}) {
    const periodRange = getDateRangeByPeriod(query.period);
    const zoneId = query.zoneId && mongoose.Types.ObjectId.isValid(query.zoneId)
        ? new mongoose.Types.ObjectId(query.zoneId)
        : null;

    const orderMatch = {
        $or: [
            { "payment.method": { $in: ["cash", "wallet"] } },
            { "payment.status": { $in: ["paid", "authorized", "captured", "settled", "refunded"] } },
        ],
    };
    if (periodRange) {
        orderMatch.createdAt = { $gte: periodRange.start, $lte: periodRange.end };
    }
    if (zoneId) {
        orderMatch.zoneId = zoneId;
    }

    const restaurantMatch = {};
    if (zoneId) {
        restaurantMatch.zoneId = zoneId;
    }

    const zoneRestaurantIds = zoneId
        ? await FoodRestaurant.find({ zoneId }).distinct('_id')
        : null;
    const zoneScopedRestaurantMatch = zoneId
        ? { restaurantId: { $in: zoneRestaurantIds || [] } }
        : {};

    const [
        orderTotalsAgg,
        monthlyAgg,
        restaurantsTotal,
        restaurantsPending,
        foodsTotal,
        addonsTotal,
        customersTotal,
        recentPendingRestaurants,
        recentPendingOrders,
        recentDeliveredOrders,
        recentCancelledOrders,
        recentCustomers
    ] = await Promise.all([
        FoodOrder.aggregate([
            { $match: orderMatch },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    delivered: { $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] } },
                    cancelled: {
                        $sum: {
                            $cond: [{ $in: ['$orderStatus', CANCELLED_ORDER_STATUSES] }, 1, 0]
                        }
                    },
                    pending: {
                        $sum: {
                            $cond: [{ $in: ['$orderStatus', PENDING_ORDER_STATUSES] }, 1, 0]
                        }
                    },
                    dashboardPending: {
                        $sum: {
                            $cond: [{ $in: ['$orderStatus', DASHBOARD_PENDING_ORDER_STATUSES] }, 1, 0]
                        }
                    },
                    dashboardProcessing: {
                        $sum: {
                            $cond: [{ $in: ['$orderStatus', DASHBOARD_PROCESSING_ORDER_STATUSES] }, 1, 0]
                        }
                    },
                    revenueTotal: { 
                        $sum: { 
                            $cond: [DELIVERED_ORDER_STATUS_EXPR, { $ifNull: ['$pricing.total', 0] }, 0] 
                        } 
                    },
                    commissionTotal: { 
                        $sum: { 
                            $cond: [DELIVERED_ORDER_STATUS_EXPR, { $ifNull: ['$pricing.restaurantCommission', 0] }, 0] 
                        } 
                    },
                    platformFeeTotal: { 
                        $sum: { 
                            $cond: [DELIVERED_ORDER_STATUS_EXPR, DASHBOARD_PLATFORM_FEE_EXPR, 0] 
                        } 
                    },
                        $sum: { 
                        } 
                    },
                    gstTotal: { 
                        $sum: { 
                            $cond: [DELIVERED_ORDER_STATUS_EXPR, { $ifNull: ['$pricing.tax', 0] }, 0] 
                        } 
                    },
                    adminNetProfit: { 
                        $sum: { 
                            $cond: [DELIVERED_ORDER_STATUS_EXPR, { $ifNull: ['$platformProfit', 0] }, 0] 
                        } 
                    }
                }
            }
        ]),
        FoodOrder.aggregate([
            {
                $match: {
                    ...orderMatch,
                    createdAt: {
                        $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1),
                        $lte: new Date()
                    }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    orders: { $sum: 1 },
                    revenue: { 
                        $sum: { 
                            $cond: [{ $eq: ['$orderStatus', 'delivered'] }, { $ifNull: ['$pricing.total', 0] }, 0] 
                        } 
                    },
                    commission: {
                        $sum: {
                            $cond: [
                                { $eq: ['$orderStatus', 'delivered'] },
                                { $ifNull: ['$platformProfit', { $ifNull: ['$pricing.platformFee', 0] }] },
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]),
        FoodRestaurant.countDocuments({ ...restaurantMatch, status: 'approved' }),
        FoodRestaurant.countDocuments({ ...restaurantMatch, status: 'pending' }),
        0,
        0,
        FoodItem.countDocuments({ approvalStatus: 'approved', ...zoneScopedRestaurantMatch }),
        FoodAddon.countDocuments({ approvalStatus: 'approved', isDeleted: { $ne: true }, ...zoneScopedRestaurantMatch }),
        zoneId
            ? FoodOrder.distinct('userId', { ...orderMatch, userId: { $ne: null } }).then((ids) => ids.length)
            : FoodUser.countDocuments({}),
        FoodRestaurant.find({ ...restaurantMatch, status: 'pending' }).sort({ createdAt: -1 }).limit(5).select('restaurantName createdAt').lean(),
        [],
        FoodOrder.find({ 
            ...orderMatch,
            orderStatus: { $in: PENDING_ORDER_STATUSES },
        }).sort({ createdAt: -1 }).limit(5).select('orderId createdAt').lean(),
        FoodOrder.find({ ...orderMatch, orderStatus: 'delivered' }).sort({ updatedAt: -1 }).limit(5).select('orderId updatedAt').lean(),
        FoodOrder.find({ 
            ...orderMatch,
            orderStatus: { $in: CANCELLED_ORDER_STATUSES },
        }).sort({ updatedAt: -1 }).limit(5).select('orderId updatedAt').lean(),
        zoneId
            ? FoodOrder.aggregate([
                { $match: { ...orderMatch, userId: { $ne: null } } },
                { $sort: { createdAt: -1 } },
                {
                    $group: {
                        _id: '$userId',
                        createdAt: { $first: '$createdAt' }
                    }
                },
                { $sort: { createdAt: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: 'food_users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: '$user' },
                {
                    $project: {
                        _id: '$user._id',
                        name: '$user.name',
                        createdAt: 1
                    }
                }
            ])
            : FoodUser.find({}).sort({ createdAt: -1 }).limit(5).select('name createdAt').lean()
    ]);

    const liveSignals = [];
    
    (recentPendingRestaurants || []).forEach(r => {
        liveSignals.push({
            type: 'restaurant',
            title: 'New Restaurant Request',
            detail: `${r.restaurantName} is waiting for approval`,
            time: formatTimeAgo(r.createdAt),
            timestamp: r.createdAt
        });
    });

        liveSignals.push({
            detail: `${d.name} requested to join`,
            time: formatTimeAgo(d.createdAt),
            timestamp: d.createdAt
        });
    });

    (recentPendingOrders || []).forEach(o => {
        liveSignals.push({
            type: 'order_pending',
            title: 'New Order Received',
            detail: `Order #${o.orderId} is pending`,
            time: formatTimeAgo(o.createdAt),
            timestamp: o.createdAt
        });
    });

    (recentDeliveredOrders || []).forEach(o => {
        liveSignals.push({
            type: 'order_delivered',
            title: 'Order Confirmed',
            detail: `Order #${o.orderId} was successful`,
            time: formatTimeAgo(o.updatedAt),
            timestamp: o.updatedAt
        });
    });

    (recentCancelledOrders || []).forEach(o => {
        liveSignals.push({
            type: 'order_cancelled',
            title: 'Order Cancelled',
            detail: `Order #${o.orderId} was cancelled`,
            time: formatTimeAgo(o.updatedAt),
            timestamp: o.updatedAt
        });
    });

    (recentCustomers || []).forEach(c => {
        liveSignals.push({
            type: 'customer',
            title: 'New Customer',
            detail: `${c.name} just registered`,
            time: formatTimeAgo(c.createdAt),
            timestamp: c.createdAt
        });
    });

    // Sort by timestamp and take top 15
    liveSignals.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const finalLiveSignals = liveSignals.slice(0, 15);

    let totals = orderTotalsAgg?.[0] || {};

    // Use the ledger (FoodTransaction) as the absolute authority for financial metrics
    // and merge with FoodOrder's active counts for high reliability
    const txMatch = {};
    if (periodRange) {
        txMatch.createdAt = { $gte: periodRange.start, $lte: periodRange.end };
    }
    if (zoneId) {
        txMatch.restaurantId = { $in: zoneRestaurantIds || [] };
    }

    const txAgg = await FoodTransaction.aggregate([
        { $match: txMatch },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                delivered: { $sum: { $cond: [{ $in: ['$status', ['captured', 'settled']] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                
                revenueTotal: {
                    $sum: {
                        $cond: [{ $in: ['$status', ['captured', 'settled']] }, { $ifNull: ['$amounts.totalCustomerPaid', 0] }, 0]
                    }
                },
                commissionTotal: {
                    $sum: {
                        $cond: [{ $in: ['$status', ['captured', 'settled']] }, { $ifNull: ['$amounts.restaurantCommission', 0] }, 0]
                    }
                },
                platformFeeTotal: {
                    $sum: {
                        $cond: [{ $in: ['$status', ['captured', 'settled']] }, { $ifNull: ['$amounts.platformNetProfit', 0] }, 0]
                    }
                },
                    $sum: {
                        $cond: [{ $in: ['$status', ['captured', 'settled']] }, { $ifNull: ['$amounts.riderShare', 0] }, 0]
                    }
                },
                gstTotal: {
                    $sum: {
                        $cond: [{ $in: ['$status', ['captured', 'settled']] }, { $ifNull: ['$amounts.taxAmount', 0] }, 0]
                    }
                },
                adminNetProfit: {
                    $sum: {
                        $cond: [{ $in: ['$status', ['captured', 'settled']] }, { $ifNull: ['$amounts.platformNetProfit', 0] }, 0]
                    }
                }
            }
        }
    ]);

    if (txAgg && txAgg.length > 0) {
        totals = {
            ...totals,
            // Keep order status counts strictly from the actual food_orders collection
            totalOrders: totals.totalOrders || 0,
            delivered: totals.delivered || 0,
            cancelled: totals.cancelled || 0,
            pending: totals.pending || 0,
            dashboardPending: totals.dashboardPending || 0,
            
            revenueTotal: txAgg[0].revenueTotal || totals.revenueTotal || 0,
            commissionTotal: txAgg[0].commissionTotal || totals.commissionTotal || 0,
            platformFeeTotal: txAgg[0].platformFeeTotal || totals.platformFeeTotal || 0,
            
            gstTotal: txAgg[0].gstTotal || totals.gstTotal || 0,
            adminNetProfit: txAgg[0].adminNetProfit || totals.adminNetProfit || 0
        };
    }

    // Robust Monthly Trajectory Chart (strictly driven by ledger)
    const txMonthlyMatch = {
        createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1),
            $lte: new Date()
        }
    };
    if (zoneId) {
        txMonthlyMatch.restaurantId = { $in: zoneRestaurantIds || [] };
    }
    
    const txMonthly = await FoodTransaction.aggregate([
        { $match: txMonthlyMatch },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                },
                orders: { $sum: 1 },
                revenue: {
                    $sum: {
                        $cond: [{ $in: ['$status', ['captured', 'settled']] }, { $ifNull: ['$amounts.totalCustomerPaid', 0] }, 0]
                    }
                },
                commission: {
                    $sum: {
                        $cond: [{ $in: ['$status', ['captured', 'settled']] }, { $ifNull: ['$amounts.platformNetProfit', 0] }, 0]
                    }
                }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const finalMonthlyAgg = txMonthly && txMonthly.length > 0 ? txMonthly : (monthlyAgg || []);

    const now = new Date();
    const monthlyMap = new Map(
        (finalMonthlyAgg || []).map((row) => {
            const key = `${row._id?.year}-${row._id?.month}`;
            return [key, row];
        })
    );

    const monthlyData = [];
    for (let i = 11; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const key = `${year}-${month}`;
        const row = monthlyMap.get(key);
        monthlyData.push({
            month: formatMonthShort(year, month - 1),
            orders: Number(row?.orders || 0),
            revenue: Number(row?.revenue || 0),
            commission: Number(row?.commission || 0)
        });
    }

    return {
        orders: {
            total: Number(totals.totalOrders || 0),
            byStatus: {
                delivered: Number(totals.delivered || 0),
                cancelled: Number(totals.cancelled || 0),
                pending: Number(totals.pending || 0)
            }
        },
        revenue: { total: Number(totals.revenueTotal || 0) },
        commission: { total: Number(totals.commissionTotal || 0) },
        platformFee: { total: Number(totals.platformFeeTotal || 0) },
        
        gst: { total: Number(totals.gstTotal || 0) },
        totalAdminEarnings: Number(totals.adminNetProfit || 0) + Number(totals.gstTotal || 0),
        
        restaurants: {
            total: Number(restaurantsTotal || 0),
            pendingRequests: Number(restaurantsPending || 0)
        },
        
        foods: { total: Number(foodsTotal || 0) },
        addons: { total: Number(addonsTotal || 0) },
        customers: { total: Number(customersTotal || 0) },
        orderStats: {
            pending: Number(totals.pending || 0),
            processing: Number(totals.dashboardProcessing || 0),
            completed: Number(totals.delivered || 0)
        },
        monthlyData,
        liveSignals: finalLiveSignals
    };
}

function formatTimeAgo(date) {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    return Math.floor(seconds) + ' seconds ago';
}


export async function getTransactionReport(query = {}) {
    const { fromDate, toDate, zone, restaurant, search } = query;
    const match = {};

    if (fromDate && toDate) {
        match.createdAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    }

    if (search) {
        const searchRegex = new RegExp(String(search).trim(), "i");
        const matchingOrders = await FoodOrder.find({ orderId: { $regex: searchRegex } })
            .select('_id')
            .lean();

        match.$or = [
            { orderReadableId: { $regex: searchRegex } },
            { orderId: { $in: matchingOrders.map((order) => order._id) } }
        ];
    }

    let restaurantIds = null;
    if (zone || restaurant) {
        const restFilter = {};
        
        // Robust Zone Handling (supports both Name string and ObjectId)
        if (zone && zone !== 'All Zones') {
            if (mongoose.Types.ObjectId.isValid(zone)) {
                restFilter.zoneId = new mongoose.Types.ObjectId(zone);
            } else {
                const matchedZone = await FoodZone.findOne({
                    $or: [{ name: zone }, { zoneName: zone }]
                })
                    .select('_id')
                    .lean();
                if (matchedZone?._id) {
                    restFilter.zoneId = matchedZone._id;
                } else {
                    // Force empty result if zone name is not found
                    restFilter.zoneId = new mongoose.Types.ObjectId();
                }
            }
        }

        // Robust Restaurant Handling (supports both Name string and ObjectId)
        if (restaurant && restaurant !== 'All restaurants') {
            if (mongoose.Types.ObjectId.isValid(restaurant)) {
                restFilter._id = new mongoose.Types.ObjectId(restaurant);
            } else {
                const restDoc = await FoodRestaurant.findOne({ restaurantName: restaurant })
                    .select('_id')
                    .lean();
                if (restDoc) {
                    restFilter._id = restDoc._id;
                } else {
                    // Force empty result if restaurant name is not found
                    restFilter._id = new mongoose.Types.ObjectId();
                }
            }
        }
        
        const restaurantsList = await FoodRestaurant.find(restFilter).select('_id').lean();
        restaurantIds = restaurantsList.map(r => r._id);
        match.restaurantId = { $in: restaurantIds };
    }

    // Include only resolved transactions for reports (or all to match orders)
    // We will query the FoodTransaction table directly as it is the ledger
    const transactionRows = await FoodTransaction.find(match)
        .populate('orderId')
        .populate('userId', 'name')
        .populate('restaurantId', 'restaurantName')
        .sort({ createdAt: -1 })
        .lean();

    const transactions = transactionRows.map((tx) => {
        const order = tx.orderId || {};
        const pricing = order.pricing || {};
        const subtotal = Number(pricing.subtotal || 0) || 0;
        const packagingFee = Number(pricing.packagingFee || 0) || 0;
        
        const tax = Number(pricing.tax || 0) || 0;
        const discount = Number(pricing.discount || 0) || 0;
        const total = Number(pricing.total || 0) || 0;

        // "Platform fee" should come from pricing.platformFee when available.
        // For older orders where pricing.platformFee isn't stored, derive it from the pricing equation:
        const platformFeeDerived = Math.max(
            0,
            total - subtotal - packagingFee - tax + discount
        );
        const platformFee =
            pricing.platformFee !== undefined && pricing.platformFee !== null
                ? Number(pricing.platformFee || 0) || 0
                : platformFeeDerived;
        return {
            id: tx._id,
            orderId: tx.orderReadableId || order.orderId || 'N/A',
            restaurant: tx.restaurantId?.restaurantName || 'N/A',
            customerName: tx.userId?.name || 'Guest',
            totalItemAmount: subtotal,
            itemDiscount: pricing.discount || 0,
            couponDiscount: 0, // Placeholder if you add coupon logic
            referralDiscount: 0, // Placeholder
            discountedAmount: Math.max(0, (pricing.subtotal || 0) - (pricing.discount || 0)),
            vatTax: tx.amounts?.taxAmount || pricing.tax || 0,
            
            platformFee,
            orderAmount: tx.amounts?.totalCustomerPaid || pricing.total || 0,
            status: tx.status
        };
    });

    let completedTransaction = 0;
    let refundedTransaction = 0;
    let adminEarning = 0;
    let restaurantEarning = 0;
    

    for (const tx of transactionRows) {
        // Calculate Summary
        if (tx.status === 'captured' || tx.status === 'settled' || (tx.orderId && tx.orderId.orderStatus === 'delivered')) {
            completedTransaction += tx.amounts?.totalCustomerPaid || 0;
            adminEarning += tx.amounts?.platformNetProfit || 0;
            restaurantEarning += tx.amounts?.restaurantShare || 0;
            
        }
        if (tx.status === 'refunded' || (tx.orderId && tx.orderId.orderStatus === 'cancelled_by_admin')) {
            // Count number of refunded transactions according to old logic or sum them
            refundedTransaction += tx.amounts?.totalCustomerPaid || 0;
        }
    }

    const summary = {
        completedTransaction,
        refundedTransaction, // Returning amount instead of count for consistency, frontend might expect count though
        adminEarning,
        restaurantEarning,
        
    };

    return { transactions, summary };
}

export async function getRestaurantReport(query = {}) {
    const parseTimeRange = (timeLabel) => {
        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);

        const value = String(timeLabel || '').trim().toLowerCase();
        if (!value || value === 'all time') return null;

        if (value === 'today') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return { $gte: start, $lte: end };
        }

        if (value === 'this week') {
            const day = start.getDay(); // 0=Sun
            const diffToMonday = day === 0 ? 6 : day - 1;
            start.setDate(start.getDate() - diffToMonday);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return { $gte: start, $lte: end };
        }

        if (value === 'this month') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return { $gte: start, $lte: end };
        }

        if (value === 'this year') {
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return { $gte: start, $lte: end };
        }

        return null;
    };

    const formatCurrency = (value) => `\u20B9${Number(value || 0).toFixed(2)}`;

    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 1000, 1), 5000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const restaurantFilter = {};
    const allFilter = String(query.all || '').trim().toLowerCase();
    if (allFilter === 'active') {
        restaurantFilter.status = 'approved';
    } else if (allFilter === 'inactive') {
        restaurantFilter.status = { $ne: 'approved' };
    }

    const zoneRaw = String(query.zone || '').trim();
    if (zoneRaw) {
        if (mongoose.Types.ObjectId.isValid(zoneRaw)) {
            restaurantFilter.zoneId = new mongoose.Types.ObjectId(zoneRaw);
        } else {
            const matchedZone = await FoodZone.findOne({
                $or: [{ name: zoneRaw }, { zoneName: zoneRaw }]
            })
                .select('_id')
                .lean();
            if (matchedZone?._id) {
                restaurantFilter.zoneId = matchedZone._id;
            } else {
                return { restaurants: [], total: 0, page, limit };
            }
        }
    }

    const typeRaw = String(query.type || '').trim().toLowerCase();
    if (typeRaw === 'commission') {
        const commissionRows = await FoodRestaurantCommission.find({ status: { $ne: false } })
            .select('restaurantId')
            .lean();
        const commissionRestaurantIds = commissionRows
            .map((row) => row?.restaurantId)
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id));

        if (!commissionRestaurantIds.length) {
            return { restaurants: [], total: 0, page, limit };
        }
        restaurantFilter._id = { $in: commissionRestaurantIds };
    }

    const searchRaw = String(query.search || '').trim();
    if (searchRaw) {
        const escaped = searchRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        restaurantFilter.$or = [
            { restaurantName: { $regex: escaped, $options: 'i' } },
            { ownerName: { $regex: escaped, $options: 'i' } },
            { ownerPhone: { $regex: escaped, $options: 'i' } },
            { city: { $regex: escaped, $options: 'i' } },
            { area: { $regex: escaped, $options: 'i' } }
        ];
    }

    const [restaurantDocs, total] = await Promise.all([
        FoodRestaurant.find(restaurantFilter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('restaurantName profileImage rating totalRatings status zoneId')
            .populate('zoneId', 'name zoneName')
            .lean(),
        FoodRestaurant.countDocuments(restaurantFilter)
    ]);

    const restaurantIds = restaurantDocs.map((r) => r._id).filter(Boolean);
    if (!restaurantIds.length) {
        return { restaurants: [], total, page, limit };
    }

    const orderCreatedAtFilter = parseTimeRange(query.time);
    const orderMatch = {
        restaurantId: { $in: restaurantIds },
        $or: [
            { "payment.method": { $in: ["cash", "wallet"] } },
            { "payment.status": { $in: ["paid", "authorized", "captured", "settled", "refunded"] } },
        ],
    };
    if (orderCreatedAtFilter) {
        orderMatch.createdAt = orderCreatedAtFilter;
    }

    const [foodsAgg, ordersAgg] = await Promise.all([
        FoodItem.aggregate([
            {
                $match: {
                    restaurantId: { $in: restaurantIds },
                    approvalStatus: 'approved'
                }
            },
            {
                $group: {
                    _id: '$restaurantId',
                    totalFood: { $sum: 1 }
                }
            }
        ]),
        FoodOrder.aggregate([
            { $match: orderMatch },
            {
                $group: {
                    _id: '$restaurantId',
                    totalOrder: { $sum: 1 },
                    totalOrderAmount: { $sum: { $ifNull: ['$pricing.total', 0] } },
                    totalDiscountGiven: { $sum: { $ifNull: ['$pricing.discount', 0] } },
                    totalVATTAX: { $sum: { $ifNull: ['$pricing.tax', 0] } },
                    totalAdminCommissionFromPlatformProfit: { $sum: { $ifNull: ['$platformProfit', 0] } },
                    totalAdminCommissionFromPlatformFee: { $sum: { $ifNull: ['$pricing.platformFee', 0] } }
                }
            }
        ])
    ]);

    const foodMap = new Map(foodsAgg.map((x) => [String(x._id), Number(x.totalFood || 0)]));
    const orderMap = new Map(
        ordersAgg.map((x) => [
            String(x._id),
            {
                totalOrder: Number(x.totalOrder || 0),
                totalOrderAmount: Number(x.totalOrderAmount || 0),
                totalDiscountGiven: Number(x.totalDiscountGiven || 0),
                totalVATTAX: Number(x.totalVATTAX || 0),
                totalAdminCommission:
                    Number(x.totalAdminCommissionFromPlatformProfit || 0) > 0
                        ? Number(x.totalAdminCommissionFromPlatformProfit || 0)
                        : Number(x.totalAdminCommissionFromPlatformFee || 0)
            }
        ])
    );

    const restaurants = restaurantDocs.map((restaurant, index) => {
        const key = String(restaurant._id);
        const counts = orderMap.get(key) || {
            totalOrder: 0,
            totalOrderAmount: 0,
            totalDiscountGiven: 0,
            totalVATTAX: 0,
            totalAdminCommission: 0
        };

        return {
            _id: restaurant._id,
            sl: skip + index + 1,
            icon: restaurant.profileImage || '',
            restaurantName: restaurant.restaurantName || '',
            totalFood: foodMap.get(key) || 0,
            totalOrder: counts.totalOrder,
            totalOrderAmount: formatCurrency(counts.totalOrderAmount),
            totalDiscountGiven: formatCurrency(counts.totalDiscountGiven),
            totalAdminCommission: formatCurrency(counts.totalAdminCommission),
            totalVATTAX: formatCurrency(counts.totalVATTAX),
            averageRatings: Number(restaurant.rating || 0),
            reviews: Number(restaurant.totalRatings || 0),
            status: restaurant.status || 'pending',
            zoneName: restaurant.zoneId?.name || restaurant.zoneId?.zoneName || ''
        };
    });

    return { restaurants, total, page, limit };
}

export async function getTaxReport(query = {}) {
    const { fromDate, toDate, search } = query;
    const match = {
        orderStatus: 'delivered' // Typically tax is reported on delivered/completed orders
    };

    if (fromDate && toDate) {
        match.createdAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    }

    if (search) {
        // Search by order ID if provided
        match.orderId = { $regex: search, $options: 'i' };
    }

    // For now, we'll group by Restaurant as the primary income source
    const taxData = await FoodOrder.aggregate([
        { $match: match },
        {
            $group: {
                _id: '$restaurantId',
                totalIncome: { $sum: { $ifNull: ['$pricing.total', 0] } },
                totalTax: { $sum: { $ifNull: ['$pricing.tax', 0] } },
                orderCount: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: 'food_restaurants',
                localField: '_id',
                foreignField: '_id',
                as: 'restaurant'
            }
        },
        { $unwind: { path: '$restaurant', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                incomeSource: { $ifNull: ['$restaurant.restaurantName', 'Unknown Restaurant'] },
                totalIncome: 1,
                totalTax: 1,
                orderCount: 1
            }
        },
        { $sort: { totalTax: -1 } }
    ]);

    const stats = {
        totalIncome: 0,
        totalTax: 0
    };

    const reports = taxData.map((item, index) => {
        stats.totalIncome += item.totalIncome;
        stats.totalTax += item.totalTax;
        return {
            sl: index + 1,
            id: item._id,
            incomeSource: item.incomeSource,
            totalIncome: `\u20B9${item.totalIncome.toFixed(2)}`,
            totalTax: `\u20B9${item.totalTax.toFixed(2)}`,
            orderCount: item.orderCount
        };
    });

    return {
        reports,
        stats: {
            totalIncome: `\u20B9${stats.totalIncome.toFixed(2)}`,
            totalTax: `\u20B9${stats.totalTax.toFixed(2)}`
        }
    };
}

export async function getTaxReportDetail(restaurantId, query = {}) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
        throw new ValidationError('Invalid restaurant ID');
    }

    const { fromDate, toDate } = query;
    const match = {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        orderStatus: 'delivered'
    };

    if (fromDate && toDate) {
        match.createdAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    }

    const orders = await FoodOrder.find(match)
        .select('orderId pricing createdAt orderStatus')
        .sort({ createdAt: -1 })
        .lean();

    const restaurant = await FoodRestaurant.findById(restaurantId).select('restaurantName').lean();

    return {
        restaurantName: restaurant?.restaurantName || 'Unknown Restaurant',
        orders: orders.map(o => ({
            id: o._id,
            orderId: o.orderId,
            totalAmount: `\u20B9${(o.pricing?.total || 0).toFixed(2)}`,
            taxAmount: `\u20B9${(o.pricing?.tax || 0).toFixed(2)}`,
            date: o.createdAt
        }))
    };
}

// ----- Customers / Users (admin) -----
export async function getCustomers(query = {}) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = { role: 'USER' };

    if (query.status) {
        if (String(query.status) === 'active') filter.isActive = true;
        if (String(query.status) === 'inactive') filter.isActive = false;
    }

    if (query.joiningDate && String(query.joiningDate).trim()) {
        const d = new Date(String(query.joiningDate));
        if (!Number.isNaN(d.getTime())) {
            const start = new Date(d);
            start.setHours(0, 0, 0, 0);
            const end = new Date(d);
            end.setHours(23, 59, 59, 999);
            filter.createdAt = { $gte: start, $lte: end };
        }
    }

    if (query.search && String(query.search).trim()) {
        const raw = String(query.search).trim().slice(0, 80);
        const term = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
            { name: { $regex: term, $options: 'i' } },
            { email: { $regex: term, $options: 'i' } },
            { phone: { $regex: term, $options: 'i' } }
        ];
    }

    const sort = {};
    const sortBy = String(query.sortBy || '').trim();
    if (sortBy === 'name-asc') sort.name = 1;
    else if (sortBy === 'name-desc') sort.name = -1;
    else sort.createdAt = -1;

    const [docs, total] = await Promise.all([
        FoodUser.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .select('name email phone countryCode isVerified isActive createdAt profileImage')
            .lean(),
        FoodUser.countDocuments(filter)
    ]);

    const sanitizeUrl = (s) => {
        if (!s) return '';
        const str = String(s).trim();
        return str.replace(/^`+|`+$/g, '').trim();
    };

    const userIds = docs.map((u) => u._id).filter(Boolean);
    const orderStats = userIds.length > 0
        ? await FoodOrder.aggregate([
            { $match: { userId: { $in: userIds } } },
            {
                $group: {
                    _id: '$userId',
                    totalOrder: { $sum: 1 },
                    totalOrderAmount: { $sum: { $ifNull: ['$pricing.total', 0] } }
                }
            }
        ])
        : [];

    const orderStatsMap = new Map(
        orderStats.map((x) => [
            String(x._id),
            {
                totalOrder: Number(x.totalOrder || 0),
                totalOrderAmount: Number(x.totalOrderAmount || 0)
            }
        ])
    );

    let customers = docs.map((u) => {
        const stats = orderStatsMap.get(String(u._id)) || { totalOrder: 0, totalOrderAmount: 0 };
        return ({
        id: u._id,
        _id: u._id,
        name: u.name || 'Unnamed',
        email: u.email || '',
        phone: u.phone || '',
        profileImage: sanitizeUrl(u.profileImage || ''),
        countryCode: u.countryCode || '+91',
        status: u.isActive !== false,
        isActive: u.isActive !== false,
        isVerified: u.isVerified === true,
        totalOrder: stats.totalOrder,
        totalOrderAmount: stats.totalOrderAmount,
        joiningDate: u.createdAt,
        createdAt: u.createdAt
        });
    });

    const chooseFirst = parseInt(query.chooseFirst, 10);
    if (Number.isFinite(chooseFirst) && chooseFirst > 0) {
        customers = customers.slice(0, chooseFirst);
    }

    return { customers, total, page, limit };
}

export async function getCustomerById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const u = await FoodUser.findById(id).select('-__v').lean();
    if (!u) return null;
    const customerObjectId = new mongoose.Types.ObjectId(id);
    const orderStats = await FoodOrder.aggregate([
        { $match: { userId: customerObjectId } },
        {
            $group: {
                _id: '$userId',
                totalOrders: { $sum: 1 },
                totalOrderAmount: { $sum: { $ifNull: ['$pricing.total', 0] } }
            }
        }
    ]);
    const stats = orderStats?.[0] || {};
    const sanitizeUrl = (s) => {
        if (!s) return '';
        const str = String(s).trim();
        return str.replace(/^`+|`+$/g, '').trim();
    };
    return {
        id: u._id,
        _id: u._id,
        name: u.name || 'Unnamed',
        email: u.email || '',
        phone: u.phone || '',
        profileImage: sanitizeUrl(u.profileImage || ''),
        countryCode: u.countryCode || '+91',
        status: u.isActive !== false,
        isActive: u.isActive !== false,
        isVerified: u.isVerified === true,
        totalOrders: Number(stats.totalOrders || 0),
        totalOrder: Number(stats.totalOrders || 0),
        totalOrderAmount: Number(stats.totalOrderAmount || 0),
        joiningDate: u.createdAt,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
    };
}

export async function updateCustomerStatus(id, isActive) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const updatedDoc = await FoodUser.findByIdAndUpdate(
        id,
        { $set: { isActive: Boolean(isActive) } },
        { new: true }
    );
    if (!updatedDoc) return null;
    const updated = updatedDoc.toObject();
    if (updated.isActive === false) {
        await FoodRefreshToken.deleteMany({ userId: updated._id });
    }
    return updated;
}

export async function getSupportTickets(query = {}) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;
    const source = String(query.source || 'all').toLowerCase();
    const search = String(query.search || '').trim();

    const userFilter = {};
    const restaurantFilter = {};
    if (query.status && ['open', 'in-progress', 'resolved'].includes(String(query.status))) {
        userFilter.status = String(query.status);
        restaurantFilter.status = String(query.status);
    }
    if (query.type && ['order', 'restaurant', 'other'].includes(String(query.type))) {
        userFilter.type = String(query.type);
    }
    if (query.category && ['orders', 'payments', 'menu', 'restaurant', 'technical', 'other'].includes(String(query.category))) {
        restaurantFilter.category = String(query.category);
    }

    const userSearchOr = [];
    const restaurantSearchOr = [];
    if (search) {
        const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        userSearchOr.push(
            { issueType: searchRegex },
            { description: searchRegex }
        );
        restaurantSearchOr.push(
            { issueType: searchRegex },
            { subject: searchRegex },
            { description: searchRegex },
            { orderRef: searchRegex }
        );
        const [restaurantIds, userIds, orderIds] = await Promise.all([
            FoodRestaurant.find({ restaurantName: searchRegex }).select('_id').lean(),
            FoodUser.find({ name: searchRegex }).select('_id').lean(),
            FoodOrder.find({ orderId: searchRegex }).select('_id').lean()
        ]);
        if (restaurantIds.length) {
            const ids = restaurantIds.map((r) => r._id);
            userSearchOr.push({ restaurantId: { $in: ids } });
            restaurantSearchOr.push({ restaurantId: { $in: ids } });
        }
        if (userIds.length) {
            userSearchOr.push({ userId: { $in: userIds.map((u) => u._id) } });
        }
        if (orderIds.length) {
            userSearchOr.push({ orderId: { $in: orderIds.map((o) => o._id) } });
        }
    }
    if (userSearchOr.length) userFilter.$or = userSearchOr;
    if (restaurantSearchOr.length) restaurantFilter.$or = restaurantSearchOr;

    const shouldFetchUser = source === 'all' || source === 'user';
    const shouldFetchRestaurant = source === 'all' || source === 'restaurant';

    const [userList, userTotal, restaurantList, restaurantTotal] = await Promise.all([
        shouldFetchUser
            ? FoodSupportTicket.find(userFilter)
                  .sort({ createdAt: -1 })
                  .skip(source === 'all' ? 0 : skip)
                  .limit(source === 'all' ? limit * page : limit)
                  .populate('userId', 'name phone email')
                  .populate('restaurantId', 'restaurantName city area')
                  .populate({
                      path: 'orderId',
                      select: 'restaurantId',
                      populate: { path: 'restaurantId', select: 'restaurantName city area' }
                  })
                  .lean()
            : Promise.resolve([]),
        shouldFetchUser ? FoodSupportTicket.countDocuments(userFilter) : Promise.resolve(0),
        shouldFetchRestaurant
            ? FoodRestaurantSupportTicket.find(restaurantFilter)
                  .sort({ createdAt: -1 })
                  .skip(source === 'all' ? 0 : skip)
                  .limit(source === 'all' ? limit * page : limit)
                  .populate('restaurantId', 'restaurantName city area')
                  .lean()
            : Promise.resolve([]),
        shouldFetchRestaurant ? FoodRestaurantSupportTicket.countDocuments(restaurantFilter) : Promise.resolve(0)
    ]);

    const mappedUserTickets = userList.map((t) => {
        const user =
            t.userId && typeof t.userId === 'object' && t.userId !== null
                ? {
                      _id: t.userId._id,
                      name: t.userId.name || '',
                      phone: t.userId.phone || '',
                      email: t.userId.email || ''
                  }
                : null;
        const userId =
            t.userId && typeof t.userId === 'object' && t.userId !== null ? String(t.userId._id) : String(t.userId);

        let restaurantDoc = null;
        if (t.restaurantId && typeof t.restaurantId === 'object' && t.restaurantId !== null) {
            restaurantDoc = t.restaurantId;
        } else if (t.orderId && typeof t.orderId === 'object' && t.orderId !== null) {
            const rid = t.orderId.restaurantId;
            if (rid && typeof rid === 'object' && rid !== null) {
                restaurantDoc = rid;
            }
        }

        const restaurant =
            restaurantDoc && typeof restaurantDoc === 'object'
                ? {
                      _id: restaurantDoc._id,
                      name: restaurantDoc.restaurantName || '',
                      city: restaurantDoc.city || '',
                      area: restaurantDoc.area || ''
                  }
                : null;

        const restaurantId =
            restaurant && restaurant._id
                ? String(restaurant._id)
                : t.restaurantId
                ? String(t.restaurantId)
                : t.orderId && typeof t.orderId === 'object' && t.orderId !== null && t.orderId.restaurantId
                ? String(t.orderId.restaurantId)
                : null;

        const restaurantName = restaurant ? restaurant.name : '';

        return {
            _id: t._id,
            source: 'user',
            userId,
            type: t.type,
            orderId: t.orderId || null,
            restaurantId,
            issueType: t.issueType,
            description: t.description,
            status: t.status,
            adminResponse: t.adminResponse,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            user,
            restaurant,
            restaurantName
        };
    });

    const mappedRestaurantTickets = restaurantList.map((t) => {
        const restaurant =
            t.restaurantId && typeof t.restaurantId === 'object'
                ? {
                      _id: t.restaurantId._id,
                      name: t.restaurantId.restaurantName || '',
                      city: t.restaurantId.city || '',
                      area: t.restaurantId.area || ''
                  }
                : null;
        const restaurantId =
            restaurant && restaurant._id ? String(restaurant._id) : t.restaurantId ? String(t.restaurantId) : null;
        return {
            _id: t._id,
            source: 'restaurant',
            userId: null,
            type: 'restaurant-support',
            category: t.category || 'other',
            orderId: null,
            orderRef: t.orderRef || '',
            restaurantId,
            issueType: t.issueType,
            subject: t.subject || '',
            description: t.description,
            priority: t.priority || 'medium',
            status: t.status,
            adminResponse: t.adminResponse,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            user: null,
            restaurant,
            restaurantName: restaurant ? restaurant.name : ''
        };
    });

    let tickets = [];
    let total = 0;
    if (source === 'user') {
        tickets = mappedUserTickets;
        total = userTotal;
    } else if (source === 'restaurant') {
        tickets = mappedRestaurantTickets;
        total = restaurantTotal;
    } else {
        const merged = [...mappedUserTickets, ...mappedRestaurantTickets].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        tickets = merged.slice(skip, skip + limit);
        total = userTotal + restaurantTotal;
    }

    return { tickets, total, page, limit };
}

export async function updateSupportTicket(id, body = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const source = String(body.source || 'user').toLowerCase();
    const set = {};
    if (body.status && ['open', 'in-progress', 'resolved'].includes(String(body.status))) {
        set.status = String(body.status);
    }
    if (typeof body.adminResponse === 'string') {
        set.adminResponse = body.adminResponse;
    }
    if (!Object.keys(set).length) return null;
    const model = source === 'restaurant' ? FoodRestaurantSupportTicket : FoodSupportTicket;
    const updated = await model.findByIdAndUpdate(id, { $set: set }, { new: true }).lean();
    return updated || null;
}

// ----- Restaurant Commission (admin) -----
export async function getRestaurantCommissions() {
    const list = await FoodRestaurantCommission.find({})
        .sort({ createdAt: -1 })
        .populate({ path: 'restaurantId', select: 'restaurantName' })
        .lean();

    const commissions = list.map((c, index) => ({
        _id: c._id,
        sl: index + 1,
        restaurantId: c.restaurantId?._id ? String(c.restaurantId._id) : String(c.restaurantId),
        restaurantName: c.restaurantId?.restaurantName || '',
        restaurant: c.restaurantId?._id ? { _id: c.restaurantId._id, name: c.restaurantId.restaurantName } : null,
        defaultCommission: c.defaultCommission || { type: 'percentage', value: 0 },
        notes: c.notes || '',
        status: c.status !== false
    }));

    return { commissions };
}

export async function getRestaurantCommissionBootstrap() {
    const [commissionsData, restaurantsData] = await Promise.all([
        getRestaurantCommissions(),
        getRestaurants({ status: 'approved', limit: 1000, page: 1 })
    ]);

    const commissionByRestaurantId = new Set(
        (commissionsData.commissions || []).map((c) => String(c.restaurantId))
    );

    const restaurants = (restaurantsData.restaurants || []).map((r) => ({
        _id: r._id,
        name: r.restaurantName || r.name || '',
        restaurantId: r._id ? `REST${r._id.toString().slice(-6).padStart(6, '0')}` : '',
        ownerName: r.ownerName || '',
        hasCommissionSetup: commissionByRestaurantId.has(String(r._id))
    }));

    return { commissions: commissionsData.commissions || [], restaurants };
}

export async function getRestaurantCommissionById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FoodRestaurantCommission.findById(id)
        .populate({ path: 'restaurantId', select: 'restaurantName' })
        .lean();
    if (!doc) return null;
    return {
        _id: doc._id,
        restaurantId: doc.restaurantId?._id ? String(doc.restaurantId._id) : String(doc.restaurantId),
        restaurant: doc.restaurantId?._id ? { _id: doc.restaurantId._id, name: doc.restaurantId.restaurantName } : null,
        restaurantName: doc.restaurantId?.restaurantName || '',
        defaultCommission: doc.defaultCommission || { type: 'percentage', value: 0 },
        notes: doc.notes || '',
        status: doc.status !== false
    };
}

export async function createRestaurantCommission(body) {
    const exists = await FoodRestaurantCommission.findOne({ restaurantId: body.restaurantId }).lean();
    if (exists) {
        throw new ValidationError('Commission already exists for this restaurant');
    }
    const created = await FoodRestaurantCommission.create({
        restaurantId: body.restaurantId,
        defaultCommission: body.defaultCommission,
        notes: body.notes || '',
        status: true
    });
    return created.toObject();
}

export async function updateRestaurantCommission(id, body) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const updated = await FoodRestaurantCommission.findByIdAndUpdate(
        id,
        { $set: { defaultCommission: body.defaultCommission, notes: body.notes || '' } },
        { new: true }
    ).lean();
    return updated;
}

export async function deleteRestaurantCommission(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const deleted = await FoodRestaurantCommission.findByIdAndDelete(id).lean();
    return deleted ? { id } : null;
}

export async function toggleRestaurantCommissionStatus(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FoodRestaurantCommission.findById(id);
    if (!doc) return null;
    doc.status = !Boolean(doc.status);
    await doc.save();
    return doc.toObject();
}



function validateCommissionRuleSet(rules) {
    const active = (rules || []).filter((r) => r && r.status !== false);
    if (!active.length) {
        throw new ValidationError('A base slab with minDistance = 0 is required');
    }
    const baseRules = active.filter((r) => Number(r.minDistance || 0) === 0);
    if (baseRules.length !== 1) {
        throw new ValidationError('A base slab with minDistance = 0 is required');
    }
    const sorted = [...active].sort((a, b) => Number(a.minDistance || 0) - Number(b.minDistance || 0));
    for (let i = 0; i < sorted.length; i += 1) {
        const current = sorted[i];
        const min = Number(current.minDistance || 0);
        const max = current.maxDistance == null ? null : Number(current.maxDistance);
        if (max != null && max <= min) {
            throw new ValidationError('maxDistance must be greater than minDistance');
        }
        if (i > 0) {
            const prev = sorted[i - 1];
            const prevMin = Number(prev.minDistance || 0);
            const prevMax = prev.maxDistance == null ? null : Number(prev.maxDistance);
            const effectivePrevMax = prevMax == null ? Infinity : prevMax;
            if (min < effectivePrevMax) {
                throw new ValidationError('Distance slabs must not overlap');
            }
            if (min === prevMin) {
                throw new ValidationError('Distance slabs must not share the same minDistance');
            }
        }
    }
}









// ----- Fee Settings (admin) -----
export async function getFeeSettings() {
    const doc = await FoodFeeSettings.findOne({ isActive: true }).sort({ createdAt: -1 }).lean();
    // If not configured yet, return null so UI does not show defaults automatically.
    return { feeSettings: doc || null };
}

export async function upsertFeeSettings(body) {
    // Single active doc pattern: keep only one active record.
    const existing = await FoodFeeSettings.findOne({ isActive: true }).sort({ createdAt: -1 });
    if (existing) {
        const $set = {};
        const $unset = {};

        

        

        

        

        if (body.platformFee === null) $unset.platformFee = 1;
        else if (body.platformFee !== undefined) $set.platformFee = body.platformFee;

        if (body.packagingFee === null) $unset.packagingFee = 1;
        else if (body.packagingFee !== undefined) $set.packagingFee = body.packagingFee;

        if (body.gstRate === null) $unset.gstRate = 1;
        else if (body.gstRate !== undefined) $set.gstRate = body.gstRate;

        if (body.isActive !== undefined) $set.isActive = body.isActive;

        const update = {};
        if (Object.keys($set).length) update.$set = $set;
        if (Object.keys($unset).length) update.$unset = $unset;
        if (!Object.keys(update).length) return existing.toObject();

        const updated = await FoodFeeSettings.findByIdAndUpdate(existing._id, update, { new: true }).lean();
        return updated;
    }

    const payload = {
        
        isActive: body.isActive !== false
    };
    
    
    
    if (body.platformFee !== undefined && body.platformFee !== null) payload.platformFee = body.platformFee;
    if (body.packagingFee !== undefined && body.packagingFee !== null) payload.packagingFee = body.packagingFee;
    if (body.gstRate !== undefined && body.gstRate !== null) payload.gstRate = body.gstRate;

    const created = await FoodFeeSettings.create(payload);
    return created.toObject();
}

// ----- Referral Settings (admin) -----
export async function getReferralSettings() {
    const doc = await FoodReferralSettings.findOne({ isActive: true }).sort({ createdAt: -1 }).lean();
    return { referralSettings: doc || null };
}

export async function upsertReferralSettings(body = {}) {
    const existing = await FoodReferralSettings.findOne({ isActive: true }).sort({ createdAt: -1 });
    if (existing) {
        const $set = {};

        if (body.referralRewardUser !== undefined) $set.referralRewardUser = Math.max(0, Number(body.referralRewardUser) || 0);
        
        if (body.referralLimitUser !== undefined) $set.referralLimitUser = Math.max(0, Number(body.referralLimitUser) || 0);
        
        if (body.isActive !== undefined) $set.isActive = Boolean(body.isActive);

        if (!Object.keys($set).length) return existing.toObject();
        const updated = await FoodReferralSettings.findByIdAndUpdate(existing._id, { $set }, { new: true }).lean();
        return updated;
    }

    const created = await FoodReferralSettings.create({
        referralRewardUser: Math.max(0, Number(body.referralRewardUser) || 0),
        referralLimitUser: Math.max(0, Number(body.referralLimitUser) || 0),
        isActive: body.isActive !== false
    });
    return created.toObject();
}

// ----- Safety / Emergency Reports (admin) -----
export async function getSafetyEmergencyReports(query = {}) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.status && ['unread', 'read', 'urgent', 'resolved'].includes(String(query.status))) {
        filter.status = String(query.status);
    }
    if (query.priority && ['low', 'medium', 'high', 'critical'].includes(String(query.priority))) {
        filter.priority = String(query.priority);
    }
    if (query.search && String(query.search).trim()) {
        const raw = String(query.search).trim().slice(0, 120);
        const term = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
            { userName: { $regex: term, $options: 'i' } },
            { userEmail: { $regex: term, $options: 'i' } },
            { message: { $regex: term, $options: 'i' } }
        ];
    }

    const [list, total] = await Promise.all([
        FoodSafetyEmergencyReport.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        FoodSafetyEmergencyReport.countDocuments(filter)
    ]);

    return {
        safetyEmergencies: list || [],
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 }
    };
}

export async function updateSafetyEmergencyStatus(id, status) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) throw new ValidationError('Invalid report id');
    const next = String(status);
    if (!['unread', 'read', 'urgent', 'resolved'].includes(next)) throw new ValidationError('Invalid status');
    const updated = await FoodSafetyEmergencyReport.findByIdAndUpdate(
        id,
        { $set: { status: next } },
        { new: true }
    ).lean();
    return updated;
}

export async function updateSafetyEmergencyPriority(id, priority) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) throw new ValidationError('Invalid report id');
    const next = String(priority);
    if (!['low', 'medium', 'high', 'critical'].includes(next)) throw new ValidationError('Invalid priority');
    const updated = await FoodSafetyEmergencyReport.findByIdAndUpdate(
        id,
        { $set: { priority: next } },
        { new: true }
    ).lean();
    return updated;
}

export async function deleteSafetyEmergencyReport(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) throw new ValidationError('Invalid report id');
    const deleted = await FoodSafetyEmergencyReport.findByIdAndDelete(id).lean();
    return deleted;
}

export async function getContactMessages(query = {}) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    // Fix old records with 'User' instead of 'FoodUser' for population to work
    await FeedbackExperience.updateMany({ userModel: 'User' }, { $set: { userModel: 'FoodUser' } });

    const filter = {};
    if (query.rating && !isNaN(query.rating)) {
        filter.rating = parseInt(query.rating);
    }

    if (query.search && String(query.search).trim()) {
        const term = String(query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(term, 'i');
        
        const [users, restaurants, partners] = await Promise.all([
            FoodUser.find({
                $or: [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }]
            }).select('_id').lean(),
            FoodRestaurant.find({
                $or: [{ restaurantName: searchRegex }, { ownerEmail: searchRegex }, { ownerPhone: searchRegex }]
            }).select('_id').lean(),
            []
        ]);

        filter.$or = [
            { comment: searchRegex },
            { userId: { $in: [...users.map(u => u._id), ...restaurants.map(r => r._id), ...partners.map(p => p._id)] } }
        ];
    }

    const [list, total] = await Promise.all([
        FeedbackExperience.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId')
            .lean(),
        FeedbackExperience.countDocuments(filter)
    ]);

    const reviews = list.map((doc) => {
        const user = (doc.userId && typeof doc.userId === 'object') ? doc.userId : {};
        return {
            _id: doc._id,
            customer: {
                name: user.name || user.restaurantName || 'Unknown',
                email: user.email || user.ownerEmail || 'N/A',
                phone: user.phone || user.ownerPhone || 'N/A'
            },
            comment: doc.comment || '',
            rating: doc.rating || 0,
            submittedAt: doc.createdAt,
            module: doc.module
        };
    });

    return {
        reviews,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1
        }
    };
}









export async function getRestaurantReviews(query = {}) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = {
        'ratings.restaurant.rating': { $exists: true, $ne: null }
    };

    if (query.search && String(query.search).trim()) {
        const term = String(query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(term, 'i');
        
        const restaurants = await FoodRestaurant.find({
            $or: [{ restaurantName: searchRegex }]
        }).select('_id').lean();
        
        const customers = await FoodUser.find({
            $or: [{ name: searchRegex }, { email: searchRegex }]
        }).select('_id').lean();

        filter.$or = [
            { orderId: searchRegex },
            { 'ratings.restaurant.comment': searchRegex },
            { restaurantId: { $in: restaurants.map(r => r._id) } },
            { userId: { $in: customers.map(c => c._id) } }
        ];
    }

    const [docs, total] = await Promise.all([
        FoodOrder.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'name email phone')
            .populate('restaurantId', 'restaurantName')
            .select('orderId userId restaurantId ratings.restaurant createdAt')
            .lean(),
        FoodOrder.countDocuments(filter)
    ]);

    const reviews = docs.map((doc, index) => ({
        sl: skip + index + 1,
        orderId: doc.orderId,
        restaurant: doc.restaurantId?.restaurantName || 'Unknown',
        restaurantId: doc.restaurantId?._id || 'N/A',
        customer: doc.userId?.name || 'Unknown',
        customerId: doc.userId?._id || 'N/A',
        review: doc.ratings?.restaurant?.comment || '',
        rating: doc.ratings?.restaurant?.rating || 0,
        submittedAt: doc.createdAt
    }));

    return { reviews, total, page, limit };
}

export async function getRestaurantById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return FoodRestaurant.findById(id)
        .select('-__v')
        .populate('zoneId', 'name zoneName serviceLocation isActive')
        .lean();
}

export async function getRestaurantAnalytics(restaurantId) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) return null;
    const rId = new mongoose.Types.ObjectId(restaurantId);

    const [restaurant, commissionDoc, orders, txRows] = await Promise.all([
        FoodRestaurant.findById(rId).lean(),
        FoodRestaurantCommission.findOne({ restaurantId: rId, status: { $ne: false } }).lean(),
        FoodOrder.find({ restaurantId: rId }).lean(),
        FoodTransaction.find({ restaurantId: rId })
            .populate('orderId', 'orderStatus createdAt pricing')
            .sort({ createdAt: -1 })
            .lean(),
    ]);

    if (!restaurant) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const completedOrders = orders.filter(o => o.orderStatus === 'delivered');
    const cancelledOrders = orders.filter(o => ['cancelled_by_user', 'cancelled_by_restaurant', 'cancelled_by_admin'].includes(o.orderStatus));

    // Money metrics should come from the ledger (FoodTransaction), not FoodOrder.
    const completedTx = (txRows || []).filter((tx) => {
        const orderStatus = tx?.orderId?.orderStatus;
        if (orderStatus) return orderStatus === 'delivered';
        return tx?.status === 'captured' || tx?.status === 'authorized' || tx?.status === 'settled';
    });

    const sum = (arr, pick) => (arr || []).reduce((s, it) => s + (Number(pick(it)) || 0), 0);

    // 1) Total order value (gross customer paid)
    const totalRevenue = sum(completedTx, (tx) => tx?.amounts?.totalCustomerPaid ?? tx?.pricing?.total ?? tx?.orderId?.pricing?.total);

    // 2) Restaurant share (payout to restaurant)
    const restaurantEarning = sum(completedTx, (tx) => tx?.amounts?.restaurantShare);

    // 3) Restaurant commission paid to admin
    const totalCommission = sum(completedTx, (tx) => tx?.amounts?.restaurantCommission ?? tx?.pricing?.restaurantCommission);

    // 4) Restaurant profit (in this system, equals restaurant share)
    const restaurantProfit = restaurantEarning;

    const monthlyOrdersList = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthlyCompletedTx = completedTx.filter((tx) => {
        const d = new Date(tx?.createdAt || tx?.orderId?.createdAt || 0);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthlyProfit = sum(monthlyCompletedTx, (tx) => tx?.amounts?.restaurantShare);

    const yearlyOrdersList = orders.filter(o => {
        const d = new Date(o.createdAt);
        return d.getFullYear() === currentYear;
    });
    const yearlyCompletedTx = completedTx.filter((tx) => {
        const d = new Date(tx?.createdAt || tx?.orderId?.createdAt || 0);
        return d.getFullYear() === currentYear;
    });
    const yearlyProfit = sum(yearlyCompletedTx, (tx) => tx?.amounts?.restaurantShare);

    const totalOrdersCount = orders.length;
    const avgOrderValue = completedTx.length > 0 ? totalRevenue / completedTx.length : 0;

    const uniqueCustomers = new Set(orders.map(o => String(o.userId))).size;
    const customerOrderCounts = orders.reduce((acc, o) => {
        const uid = String(o.userId);
        acc[uid] = (acc[uid] || 0) + 1;
        return acc;
    }, {});
    const repeatCustomers = Object.values(customerOrderCounts).filter(count => count > 1).length;

    // 5) Restaurant commission percent
    const commissionType = commissionDoc?.defaultCommission?.type || 'percentage';
    const commissionValue = Number(commissionDoc?.defaultCommission?.value || 0) || 0;
    const completedSubtotal = sum(completedTx, (tx) => tx?.pricing?.subtotal ?? tx?.orderId?.pricing?.subtotal);
    const computedCommissionPercent =
        commissionType === 'percentage'
            ? commissionValue
            : (completedSubtotal > 0 ? (totalCommission / completedSubtotal) * 100 : 0);

    const analytics = {
        totalOrders: totalOrdersCount,
        cancelledOrders: cancelledOrders.length,
        completedOrders: completedOrders.length,
        averageRating: Number(restaurant.rating || 0),
        totalRatings: Number(restaurant.totalRatings || 0),
        commissionPercentage: computedCommissionPercent,
        monthlyProfit,
        yearlyProfit,
        averageOrderValue: avgOrderValue,
        totalRevenue,
        totalCommission,
        restaurantEarning, // restaurant share
        restaurantProfit,
        monthlyOrders: monthlyOrdersList.length,
        yearlyOrders: yearlyOrdersList.length,
        averageMonthlyProfit: monthlyProfit, // Placeholder: can be improved if historical data exists
        averageYearlyProfit: yearlyProfit,   // Placeholder: can be improved if historical data exists
        status: restaurant.status === 'approved' ? 'active' : 'inactive',
        joinDate: restaurant.createdAt,
        totalCustomers: uniqueCustomers,
        repeatCustomers,
        cancellationRate: totalOrdersCount > 0 ? (cancelledOrders.length / totalOrdersCount) * 100 : 0,
        completionRate: totalOrdersCount > 0 ? (completedOrders.length / totalOrdersCount) * 100 : 0
    };

    const paymentSummary = {
        // Pricing (what customer paid components)
        subtotal: sum(completedTx, (tx) => tx?.pricing?.subtotal ?? tx?.orderId?.pricing?.subtotal),
        tax: sum(completedTx, (tx) => tx?.pricing?.tax ?? tx?.amounts?.taxAmount ?? tx?.orderId?.pricing?.tax),
        packagingFee: sum(completedTx, (tx) => tx?.pricing?.packagingFee ?? tx?.orderId?.pricing?.packagingFee),
        platformFee: sum(completedTx, (tx) => tx?.pricing?.platformFee ?? tx?.orderId?.pricing?.platformFee),
        discount: sum(completedTx, (tx) => tx?.pricing?.discount ?? tx?.orderId?.pricing?.discount),
        total: totalRevenue,
        currency: 'INR',

        // Split (who got what)
        restaurantShare: restaurantEarning,
        restaurantCommission: totalCommission,
        riderShare: sum(completedTx, (tx) => tx?.amounts?.riderShare),
        platformNetProfit: sum(completedTx, (tx) => tx?.amounts?.platformNetProfit),
    };

    return { restaurant, analytics, paymentSummary };
}

export async function getRestaurantMenuById(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FoodRestaurant.findById(id).select('menu').lean();
    if (!doc) return null;
    return doc.menu || { sections: [] };
}

export async function updateRestaurantMenuById(id, menu) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FoodRestaurant.findById(id);
    if (!doc) return null;
    const sections = Array.isArray(menu?.sections) ? menu.sections : [];
    doc.menu = { sections };
    await doc.save();
    return doc.menu || { sections: [] };
}

export async function getPendingRestaurants() {
    const restaurants = await FoodRestaurant.find({ status: { $in: ['pending', 'rejected'] } })
        .populate('zoneId', 'name zoneName')
        .sort({ createdAt: -1 })
        .lean();
    return restaurants.map((r, i) => ({
        ...r,
        sl: i + 1,
        zone: r.zoneId?.zoneName || r.zoneId?.name || null,
    }));
}

export async function updateRestaurantById(id, body = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FoodRestaurant.findById(id);
    if (!doc) return null;

    const toStr = (v) => (v != null ? String(v).trim() : '');
    const toFinite = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
    };

    if (body.name !== undefined || body.restaurantName !== undefined) {
        const name = toStr(body.name !== undefined ? body.name : body.restaurantName);
        if (!name) throw new ValidationError('Restaurant name cannot be empty');
        doc.restaurantName = name;
    }

    if (body.ownerName !== undefined) doc.ownerName = toStr(body.ownerName);
    if (body.ownerEmail !== undefined) doc.ownerEmail = toStr(body.ownerEmail).toLowerCase();
    if (body.ownerPhone !== undefined) doc.ownerPhone = toStr(body.ownerPhone);
    if (body.primaryContactNumber !== undefined) doc.primaryContactNumber = toStr(body.primaryContactNumber);

    if (body.pureVegRestaurant !== undefined) {
        doc.pureVegRestaurant = parseBooleanLike(body.pureVegRestaurant, 'pureVegRestaurant');
    }

    if (body.isAcceptingOrders !== undefined) {
        doc.isAcceptingOrders = parseBooleanLike(body.isAcceptingOrders, 'isAcceptingOrders');
    }

    if (body.cuisines !== undefined) {
        if (Array.isArray(body.cuisines)) {
            doc.cuisines = body.cuisines
                .map((c) => toStr(c))
                .filter(Boolean)
                .slice(0, 50);
        } else if (typeof body.cuisines === 'string') {
            doc.cuisines = body.cuisines
                .split(',')
                .map((c) => toStr(c))
                .filter(Boolean)
                .slice(0, 50);
        } else {
            throw new ValidationError('cuisines must be an array or comma-separated string');
        }
    }

    if (body.openingTime !== undefined) doc.openingTime = normalizeRestaurantTime(body.openingTime) || '';
    if (body.closingTime !== undefined) doc.closingTime = normalizeRestaurantTime(body.closingTime) || '';
    validateOpeningClosingTimes(doc.openingTime, doc.closingTime);
    if (body.openDays !== undefined && Array.isArray(body.openDays)) {
        doc.openDays = body.openDays.map(d => toStr(d)).filter(Boolean);
    }
    if (body.offer !== undefined) doc.offer = toStr(body.offer);

    }
        if (minutes === null) {
        } else if (minutes < 0) {
        } else {
        }
    }

    // Business & Docs
    if (body.panNumber !== undefined) doc.panNumber = toStr(body.panNumber);
    if (body.nameOnPan !== undefined) doc.nameOnPan = toStr(body.nameOnPan);
    if (body.gstRegistered !== undefined) doc.gstRegistered = parseBooleanLike(body.gstRegistered, 'gstRegistered');
    if (body.gstNumber !== undefined) doc.gstNumber = toStr(body.gstNumber);
    if (body.gstLegalName !== undefined) doc.gstLegalName = toStr(body.gstLegalName);
    if (body.gstAddress !== undefined) doc.gstAddress = toStr(body.gstAddress);
    if (body.fssaiNumber !== undefined) doc.fssaiNumber = toStr(body.fssaiNumber);
    if (body.fssaiExpiry !== undefined) doc.fssaiExpiry = body.fssaiExpiry ? new Date(body.fssaiExpiry) : undefined;

    // Bank Details
    if (body.accountNumber !== undefined) doc.accountNumber = toStr(body.accountNumber);
    if (body.ifscCode !== undefined) doc.ifscCode = toStr(body.ifscCode);
    if (body.accountHolderName !== undefined) doc.accountHolderName = toStr(body.accountHolderName);
    if (body.accountType !== undefined) doc.accountType = toStr(body.accountType);

    // Featured Info
    if (body.featuredDish !== undefined) doc.featuredDish = toStr(body.featuredDish);
    if (body.featuredPrice !== undefined) doc.featuredPrice = toFinite(body.featuredPrice);

    // Images
    const getUrl = (v) => (v && typeof v === 'object' ? v.url : v);
    if (body.profileImage !== undefined) doc.profileImage = toStr(getUrl(body.profileImage)) || undefined;
    if (body.panImage !== undefined) doc.panImage = toStr(getUrl(body.panImage)) || undefined;
    if (body.gstImage !== undefined) doc.gstImage = toStr(getUrl(body.gstImage)) || undefined;
    if (body.fssaiImage !== undefined) doc.fssaiImage = toStr(getUrl(body.fssaiImage)) || undefined;

    if (body.menuImages !== undefined) {
        if (Array.isArray(body.menuImages)) {
            doc.menuImages = body.menuImages.map(m => toStr(getUrl(m))).filter(Boolean);
        } else {
            doc.menuImages = [toStr(getUrl(body.menuImages))].filter(Boolean);
        }
    }

    await doc.save();
    return FoodRestaurant.findById(id).select('-__v').populate('zoneId', 'name zoneName serviceLocation isActive').lean();
}

export async function updateRestaurantStatus(id, body = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const raw = body.status !== undefined ? body.status : body.isActive;
    const isActive = parseBooleanLike(raw, 'status');
    const status = isActive ? 'approved' : 'rejected';

    return FoodRestaurant.findByIdAndUpdate(
        id,
        {
            $set: {
                status,
                approvedAt: isActive ? new Date() : undefined,
                rejectedAt: isActive ? undefined : new Date(),
                rejectionReason: isActive ? undefined : 'Disabled by admin'
            }
        },
        { new: true, runValidators: false }
    ).lean();
}

export async function updateRestaurantLocation(id, body = {}) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FoodRestaurant.findById(id);
    if (!doc) return null;

    const source = (body.location && typeof body.location === 'object') ? body.location : body;
    const toStr = (v) => (v != null ? String(v).trim() : '');

    const coordinates = Array.isArray(source.coordinates) ? source.coordinates : [];
    const lngFromCoordinates = toFiniteNumber(coordinates[0]);
    const latFromCoordinates = toFiniteNumber(coordinates[1]);
    const latitude = toFiniteNumber(source.latitude ?? latFromCoordinates);
    const longitude = toFiniteNumber(source.longitude ?? lngFromCoordinates);

    const addressLine1 = toStr(source.addressLine1 || source.formattedAddress || source.address);
    const addressLine2 = toStr(source.addressLine2);
    const area = toStr(source.area);
    const city = toStr(source.city);
    const state = toStr(source.state);
    const pincode = toStr(source.pincode || source.zipCode || source.postalCode);
    const landmark = toStr(source.landmark);
    const formattedAddress = toStr(source.formattedAddress || source.address || addressLine1);

    if (!doc.location || typeof doc.location !== 'object') {
        doc.location = { type: 'Point' };
    }
    doc.location.type = 'Point';
    if (latitude !== null && longitude !== null) {
        doc.location.latitude = latitude;
        doc.location.longitude = longitude;
        doc.location.coordinates = [longitude, latitude];
    }
    doc.location.formattedAddress = formattedAddress;
    doc.location.address = toStr(source.address || formattedAddress);
    doc.location.addressLine1 = addressLine1;
    doc.location.addressLine2 = addressLine2;
    doc.location.area = area;
    doc.location.city = city;
    doc.location.state = state;
    doc.location.pincode = pincode;
    doc.location.landmark = landmark;

    // Keep flat fields in sync for legacy readers.
    doc.addressLine1 = addressLine1;
    doc.addressLine2 = addressLine2;
    doc.area = area;
    doc.city = city;
    doc.state = state;
    doc.pincode = pincode;
    doc.landmark = landmark;

    if (body.zoneId !== undefined) {
        const zoneId = String(body.zoneId || '').trim();
        if (!zoneId) {
            doc.zoneId = undefined;
        } else if (!mongoose.Types.ObjectId.isValid(zoneId)) {
            throw new ValidationError('Invalid zoneId');
        } else {
            doc.zoneId = new mongoose.Types.ObjectId(zoneId);
        }
    }

    await doc.save();
    return FoodRestaurant.findById(id).select('-__v').populate('zoneId', 'name zoneName serviceLocation isActive').lean();
}

// ----- Categories -----
export async function getCategories(query) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 100, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.search && String(query.search).trim()) {
        const term = String(query.search).trim();
        filter.$or = [{ name: { $regex: term, $options: 'i' } }];
    }
    // Optional zone filter for admin list.
    // - zoneId=global => only global categories (zoneId missing)
    // - zoneId=<ObjectId> => only categories bound to that zone
    if (query.zoneId && String(query.zoneId).trim()) {
        const zid = String(query.zoneId).trim();
        if (zid === 'global') {
            filter.$or = [...(filter.$or || []), { zoneId: { $exists: false } }, { zoneId: null }];
        } else if (mongoose.Types.ObjectId.isValid(zid)) {
            filter.zoneId = new mongoose.Types.ObjectId(zid);
        }
    }
    if (query.approvalStatus) {
        const approvalStatus = String(query.approvalStatus);
        if (approvalStatus === 'pending') {
            filter.$and = [...(filter.$and || []), {
                $or: [
                    { approvalStatus: 'pending' },
                    { approvalStatus: { $exists: false }, isApproved: false }
                ]
            }];
        } else {
            filter.approvalStatus = approvalStatus;
        }
    } else if (query.isApproved !== undefined) {
        if (query.isApproved === true) {
            filter.$and = [...(filter.$and || []), {
                $or: [
                    { approvalStatus: 'approved' },
                    { approvalStatus: { $exists: false }, isApproved: { $ne: false } }
                ]
            }];
        } else {
            filter.$and = [...(filter.$and || []), {
                $or: [
                    { approvalStatus: 'pending' },
                    { approvalStatus: { $exists: false }, isApproved: false }
                ]
            }];
        }
    }

    const [list, total] = await Promise.all([
        FoodCategory.find(filter)
            .sort({ sortOrder: 1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        FoodCategory.countDocuments(filter)
    ]);

    const statsById = await backfillLegacyCategoryWorkflow(list);
    const restaurantIds = Array.from(
        new Set(
            list
                .flatMap((category) => [category?.restaurantId, category?.createdByRestaurantId])
                .map((value) => (value ? String(value) : ''))
                .filter(Boolean)
        )
    );
    const restaurants = restaurantIds.length
        ? await FoodRestaurant.find({ _id: { $in: restaurantIds } })
            .select('restaurantName ownerName ownerPhone')
            .lean()
        : [];
    const restaurantMap = new Map(restaurants.map((restaurant) => [String(restaurant._id), restaurant]));

    const hydratedList = list.map((category) => ({
        ...category,
        restaurantId: category?.restaurantId ? restaurantMap.get(String(category.restaurantId)) || category.restaurantId : category.restaurantId,
        createdByRestaurantId: category?.createdByRestaurantId ? restaurantMap.get(String(category.createdByRestaurantId)) || category.createdByRestaurantId : category.createdByRestaurantId
    }));
    const categories = hydratedList.map((category) => serializeCategoryForResponse(category, { includeCounts: true, statsById }));

    return { categories, total, page, limit };
}

export async function createCategory(body) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new ValidationError('Category name is required');
    const doc = new FoodCategory({
        name,
        image: typeof body.image === 'string' ? body.image.trim() : '',
        type: typeof body.type === 'string' ? body.type.trim() : '',
        foodTypeScope: normalizeCategoryFoodTypeScope(body.foodTypeScope, 'Both'),
        zoneId:
            body.zoneId && String(body.zoneId).trim()
                ? (() => {
                    const zid = String(body.zoneId).trim();
                    if (zid === 'global') return undefined;
                    if (!mongoose.Types.ObjectId.isValid(zid)) throw new ValidationError('Invalid zoneId');
                    return new mongoose.Types.ObjectId(zid);
                })()
                : undefined,
        isActive: body.isActive !== false,
        sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
        // Admin-created categories are globally available immediately.
        approvalStatus: 'approved',
        isApproved: true,
        approvedAt: new Date(),
        rejectionReason: '',
        restaurantId: undefined,
        createdByRestaurantId: undefined
    });
    await doc.save();
    return doc.toObject();
}

export async function approveCategory(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FoodCategory.findById(id);
    if (!doc) return null;

    if (!doc.createdByRestaurantId && doc.restaurantId) {
        doc.createdByRestaurantId = doc.restaurantId;
    }
    doc.approvalStatus = 'approved';
    doc.isApproved = true;
    doc.approvedAt = new Date();
    doc.rejectedAt = undefined;
    doc.rejectionReason = '';
    await doc.save();
    return doc.toObject();
}

export async function rejectCategory(id, reason) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FoodCategory.findById(id);
    if (!doc) return null;
    if (!doc.restaurantId && !doc.createdByRestaurantId) {
        throw new ValidationError('Only restaurant-created categories can be rejected');
    }

    if (!doc.createdByRestaurantId && doc.restaurantId) {
        doc.createdByRestaurantId = doc.restaurantId;
    }
    doc.approvalStatus = 'rejected';
    doc.isApproved = false;
    doc.rejectionReason = String(reason || '').trim();
    doc.rejectedAt = new Date();
    doc.approvedAt = undefined;
    await doc.save();
    return doc.toObject();
}

export async function makeCategoryGlobal(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FoodCategory.findById(id);
    if (!doc) return null;

    if (!doc.restaurantId && !doc.createdByRestaurantId) {
        return doc.toObject();
    }
    if (String(doc.approvalStatus || '') !== 'approved' && doc.isApproved !== true) {
        throw new ValidationError('Only approved categories can be made global');
    }

    doc.createdByRestaurantId = doc.createdByRestaurantId || doc.restaurantId;
    doc.restaurantId = undefined;
    doc.zoneId = undefined;
    doc.approvalStatus = 'approved';
    doc.isApproved = true;
    doc.rejectionReason = '';
    doc.globalizedAt = new Date();
    doc.approvedAt = doc.approvedAt || new Date();
    await doc.save();
    return doc.toObject();
}

export async function updateCategory(id, body) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FoodCategory.findById(id);
    if (!doc) return null;

    const nextFoodTypeScope = body.foodTypeScope !== undefined
        ? normalizeCategoryFoodTypeScope(body.foodTypeScope, doc.foodTypeScope || 'Both')
        : normalizeCategoryFoodTypeScope(doc.foodTypeScope, 'Both');

    if (body.foodTypeScope !== undefined && nextFoodTypeScope !== 'Both') {
        const incompatibleFoods = await FoodItem.countDocuments({
            categoryId: doc._id,
            foodType: nextFoodTypeScope === 'Veg' ? 'Non-Veg' : 'Veg'
        });
        if (incompatibleFoods > 0) {
            throw new ValidationError(`This category already has ${incompatibleFoods} food item(s) outside the selected diet scope`);
        }
    }

    if (body.name !== undefined) doc.name = String(body.name || '').trim();
    if (body.image !== undefined) doc.image = String(body.image || '').trim();
    if (body.type !== undefined) doc.type = String(body.type || '').trim();
    if (body.foodTypeScope !== undefined) doc.foodTypeScope = nextFoodTypeScope;
    if (!doc.restaurantId && doc.createdByRestaurantId) {
        doc.zoneId = undefined;
    } else if (body.zoneId !== undefined) {
        const raw = String(body.zoneId || '').trim();
        if (!raw || raw === 'global') {
            doc.zoneId = undefined;
        } else {
            if (!mongoose.Types.ObjectId.isValid(raw)) throw new ValidationError('Invalid zoneId');
            doc.zoneId = new mongoose.Types.ObjectId(raw);
        }
    }
    if (body.isActive !== undefined) doc.isActive = body.isActive !== false;
    if (body.sortOrder !== undefined) doc.sortOrder = Number(body.sortOrder) || 0;
    if (!doc.createdByRestaurantId && doc.restaurantId) {
        doc.createdByRestaurantId = doc.restaurantId;
    }
    await doc.save();
    return doc.toObject();
}

export async function deleteCategory(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const inUse = await FoodItem.countDocuments({ categoryId: id });
    if (inUse > 0) {
        throw new ValidationError('Cannot delete category while it has items');
    }
    const deleted = await FoodCategory.findByIdAndDelete(id).lean();
    return deleted ? { id } : null;
}

export async function toggleCategoryStatus(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FoodCategory.findById(id);
    if (!doc) return null;
    doc.isActive = !doc.isActive;
    if (!doc.createdByRestaurantId && doc.restaurantId) {
        doc.createdByRestaurantId = doc.restaurantId;
    }
    await doc.save();
    return doc.toObject();
}

// ----- Restaurant Add-ons approval (admin) -----
export async function getRestaurantAddonsAdmin(query = {}) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 200);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const filter = { isDeleted: { $ne: true } };

    const approvalStatus = String(query.approvalStatus || '').trim();
    if (approvalStatus && ['pending', 'approved', 'rejected'].includes(approvalStatus)) {
        filter.approvalStatus = approvalStatus;
    }

    if (query.restaurantId && mongoose.Types.ObjectId.isValid(String(query.restaurantId))) {
        filter.restaurantId = new mongoose.Types.ObjectId(String(query.restaurantId));
    }

    if (query.search && String(query.search).trim()) {
        const raw = String(query.search).trim().slice(0, 80);
        const term = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matchingRestaurantIds = await FoodRestaurant.find({
            restaurantName: { $regex: term, $options: 'i' }
        })
            .select('_id')
            .lean();

        filter.$or = [
            { 'draft.name': { $regex: term, $options: 'i' } },
            { restaurantId: { $in: matchingRestaurantIds.map((restaurant) => restaurant._id) } }
        ];
    }

    const [list, total] = await Promise.all([
        FoodAddon.find(filter)
            .sort({ requestedAt: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('restaurantId', 'restaurantName ownerName ownerPhone')
            .lean(),
        FoodAddon.countDocuments(filter)
    ]);

    const addons = list.map((a) => ({
        id: a._id,
        _id: a._id,
        restaurantId: a.restaurantId?._id ? String(a.restaurantId._id) : String(a.restaurantId),
        restaurant: a.restaurantId?._id
            ? {
                _id: a.restaurantId._id,
                name: a.restaurantId.restaurantName || '',
                ownerName: a.restaurantId.ownerName || '',
                ownerPhone: a.restaurantId.ownerPhone || ''
            }
            : null,
        approvalStatus: a.approvalStatus || 'pending',
        rejectionReason: a.rejectionReason || '',
        requestedAt: a.requestedAt,
        approvedAt: a.approvedAt,
        rejectedAt: a.rejectedAt,
        isAvailable: a.isAvailable !== false,
        draft: a.draft || null,
        published: a.published || null,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt
    }));

    return { addons, total, page, limit };
}

export async function updateRestaurantAddonAdmin(addonId, body) {
    if (!addonId || !mongoose.Types.ObjectId.isValid(String(addonId))) return null;
    const _id = new mongoose.Types.ObjectId(String(addonId));
    
    const addon = await FoodAddon.findOne({ _id, isDeleted: { $ne: true } });
    if (!addon) return null;

    const updatePayload = {};
    if (body.name !== undefined) updatePayload.name = String(body.name || '').trim();
    if (body.description !== undefined) updatePayload.description = String(body.description || '').trim();
    if (body.price !== undefined) {
        const p = Number(body.price);
        if (!Number.isFinite(p) || p < 0) throw new ValidationError('Price must be a valid positive number');
        updatePayload.price = p;
    }
    if (body.image !== undefined) updatePayload.image = String(body.image || '').trim();
    if (body.images !== undefined && Array.isArray(body.images)) {
        updatePayload.images = body.images.map(img => typeof img === 'string' ? img : img?.url).filter(Boolean);
    } else if (updatePayload.image) {
        updatePayload.images = [updatePayload.image];
    }

    // Update draft fields
    if (addon.draft) {
        Object.assign(addon.draft, updatePayload);
    } else {
        addon.draft = updatePayload;
    }

    // If already approved, update published state as well
    if (addon.approvalStatus === 'approved') {
        if (addon.published) {
            Object.assign(addon.published, updatePayload);
        } else {
            addon.published = updatePayload;
        }
    }

    if (body.isAvailable !== undefined) {
        addon.isAvailable = body.isAvailable === true;
    }

    await addon.save();
    return addon.toObject();
}

export async function approveRestaurantAddon(addonId) {
    if (!addonId || !mongoose.Types.ObjectId.isValid(String(addonId))) return null;
    const _id = new mongoose.Types.ObjectId(String(addonId));

    // Use update pipeline to copy draft -> published atomically.
    const updated = await FoodAddon.findOneAndUpdate(
        { _id, isDeleted: { $ne: true } },
        [
            {
                $set: {
                    published: '$draft',
                    approvalStatus: 'approved',
                    approvedAt: '$$NOW',
                    rejectedAt: null,
                    rejectionReason: ''
                }
            }
        ],
        { new: true }
    ).lean();

    if (updated?.restaurantId) {
        try {
            const { notifyOwnersSafely } = await import('../../../../core/notifications/firebase.service.js');
            await notifyOwnersSafely(
                [{ ownerType: 'RESTAURANT', ownerId: updated.restaurantId }],
                {
                    title: 'Addon Approved! Ã¢Å“â€¦',
                    body: `Your addon "${updated.published?.name || 'New Addon'}" has been approved and is now live.`,
                    image: 'https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png',
                    data: {
                        type: 'addon_approved',
                        addonId: String(updated._id),
                        restaurantId: String(updated.restaurantId)
                    }
                }
            );
        } catch (e) {
            console.error('Failed to send addon approval notification:', e);
        }
    }

    return updated || null;
}

export async function rejectRestaurantAddon(addonId, reason) {
    if (!addonId || !mongoose.Types.ObjectId.isValid(String(addonId))) return null;
    const _id = new mongoose.Types.ObjectId(String(addonId));
    const rejectionReason = String(reason || '').trim();
    if (!rejectionReason) {
        throw new ValidationError('Rejection reason is required');
    }
    const updated = await FoodAddon.findOneAndUpdate(
        { _id, isDeleted: { $ne: true } },
        {
            $set: {
                approvalStatus: 'rejected',
                rejectionReason,
                rejectedAt: new Date()
            }
        },
        { new: true }
    ).lean();

    if (updated?.restaurantId) {
        try {
            const { notifyOwnersSafely } = await import('../../../../core/notifications/firebase.service.js');
            await notifyOwnersSafely(
                [{ ownerType: 'RESTAURANT', ownerId: updated.restaurantId }],
                {
                    title: 'Addon Rejected Ã¢ÂÅ’',
                    body: `Your addon request for "${updated.draft?.name || 'New Addon'}" was rejected. Reason: ${rejectionReason}`,
                    image: 'https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png',
                    data: {
                        type: 'addon_rejected',
                        addonId: String(updated._id),
                        restaurantId: String(updated.restaurantId),
                        reason: rejectionReason
                    }
                }
            );
        } catch (e) {
            console.error('Failed to send addon rejection notification:', e);
        }
    }

    return updated || null;
}

// ----- Foods (separate collection) -----
export async function getFoods(query) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 100, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;
    const filter = {};

    if (query.restaurantId && mongoose.Types.ObjectId.isValid(query.restaurantId)) {
        filter.restaurantId = query.restaurantId;
    }
    if (query.search && String(query.search).trim()) {
        const term = String(query.search).trim();
        filter.$or = [
            { name: { $regex: term, $options: 'i' } },
            { categoryName: { $regex: term, $options: 'i' } }
        ];
    }
    if (query.approvalStatus && ['pending', 'approved', 'rejected'].includes(String(query.approvalStatus))) {
        filter.approvalStatus = String(query.approvalStatus);
    }

    const [list, total] = await Promise.all([
        FoodItem.find(filter)
            .select('-oldData -newData')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        FoodItem.countDocuments(filter)
    ]);

    const validRestaurantIds = Array.from(new Set(
        list.map((f) => String(f.restaurantId)).filter(id => id && mongoose.Types.ObjectId.isValid(id))
    ));
    const restaurants = validRestaurantIds.length
        ? await FoodRestaurant.find({ _id: { $in: validRestaurantIds } }).select('restaurantName').lean()
        : [];
    const restaurantMap = new Map(restaurants.map((r) => [String(r._id), r.restaurantName]));

    const foods = list.map((f) => ({
        id: f._id,
        _id: f._id,
        restaurantId: f.restaurantId,
        restaurantName: restaurantMap.get(String(f.restaurantId)) || 'Unknown Restaurant',
        categoryId: f.categoryId || null,
        categoryName: f.categoryName || '',
        name: f.name,
        description: f.description || '',
        price: getFoodDisplayPrice(f),
        variants: serializeFoodVariants(f.variants),
        variations: serializeFoodVariants(f.variants),
        image: f.image || '',
        foodType: f.foodType || 'Non-Veg',
        isAvailable: f.isAvailable !== false,
        isRecommended: f.isRecommended === true,
        preparationTime: f.preparationTime || '',
        approvalStatus: f.approvalStatus || 'approved',
        createdAt: f.createdAt,
        updatedAt: f.updatedAt
    }));

    return { foods, total, page, limit };
}

const resolveAdminFoodCategory = async ({ categoryId, categoryName, foodType, pureVegRestaurant }) => {
    let resolvedCategoryId = null;
    let resolvedCategoryName = typeof categoryName === 'string' ? categoryName.trim() : '';
    let categoryDoc = null;

    if (categoryId) {
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            throw new ValidationError('Invalid category id');
        }
        categoryDoc = await FoodCategory.findById(categoryId)
            .select('name foodTypeScope')
            .lean();
        if (!categoryDoc?._id) {
            throw new ValidationError('Category not found');
        }
        resolvedCategoryId = categoryDoc._id;
        resolvedCategoryName = categoryDoc.name || resolvedCategoryName;
    }

    if (!resolvedCategoryName) {
        throw new ValidationError('Category is required');
    }

    if (categoryDoc?.foodTypeScope) {
        if (pureVegRestaurant && String(categoryDoc.foodTypeScope || '') !== 'Veg') {
            throw new ValidationError('Pure veg restaurants can only use veg categories');
        }
        if (!categoryAllowsFoodType(categoryDoc.foodTypeScope, foodType)) {
            throw new ValidationError(`This ${categoryDoc.foodTypeScope} category cannot accept ${foodType} food`);
        }
    }

    return {
        categoryId: resolvedCategoryId,
        categoryName: resolvedCategoryName
    };
};

const getAdminFoodCreatePricing = (body = {}) => {
    const variants = normalizeFoodVariantsInput(extractRawFoodVariants(body));
    if (variants.length > 0) {
        return {
            price: getFoodDisplayPrice({ variants }),
            variants
        };
    }

    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0) throw new ValidationError('Price must be greater than 0');
    return {
        price,
        variants: []
    };
};

const getAdminFoodUpdatedPricing = (existing = {}, body = {}) => {
    const variantsTouched = body.variants !== undefined || body.variations !== undefined;
    const existingHasVariants = hasFoodVariants(existing);
    const update = {};

    if (variantsTouched) {
        const variants = normalizeFoodVariantsInput(extractRawFoodVariants(body));
        update.variants = variants;

        if (variants.length > 0) {
            update.price = getFoodDisplayPrice({ variants });
            return update;
        }

        const nextBasePrice = body.price !== undefined ? Number(body.price) : Number(existingHasVariants ? NaN : existing.price);
        if (!Number.isFinite(nextBasePrice) || nextBasePrice <= 0) {
            throw new ValidationError('Base price must be greater than 0 when variants are removed');
        }
        update.price = nextBasePrice;
        return update;
    }

    if (body.price !== undefined) {
        if (existingHasVariants) {
            throw new ValidationError('Update variants instead of base price for foods with variants');
        }
        const price = Number(body.price);
        if (!Number.isFinite(price) || price <= 0) throw new ValidationError('Price must be greater than 0');
        update.price = price;
    }

    return update;
};

export async function createFood(body) {
    const restaurantId = body.restaurantId;
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
        throw new ValidationError('Valid restaurantId is required');
    }
    const restaurant = await FoodRestaurant.findById(restaurantId)
        .select('pureVegRestaurant')
        .lean();
    if (!restaurant?._id) {
        throw new ValidationError('Restaurant not found');
    }
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new ValidationError('Food name is required');
    const foodType = body.foodType === 'Veg' ? 'Veg' : 'Non-Veg';
    if (restaurant.pureVegRestaurant === true && foodType !== 'Veg') {
        throw new ValidationError('Pure veg restaurants can only use veg foods');
    }
    const { price, variants } = getAdminFoodCreatePricing(body);

    let categoryName = typeof body.categoryName === 'string' ? body.categoryName.trim() : '';
    if (!categoryName && typeof body.category === 'string') categoryName = body.category.trim();
    const { categoryId, categoryName: resolvedCategoryName } = await resolveAdminFoodCategory({
        categoryId: body.categoryId,
        categoryName,
        foodType,
        pureVegRestaurant: restaurant.pureVegRestaurant === true
    });

    const doc = new FoodItem({
        restaurantId,
        categoryId,
        categoryName: resolvedCategoryName,
        name,
        description: typeof body.description === 'string' ? body.description.trim() : '',
        price,
        priceOnOtherPlatforms: body.priceOnOtherPlatforms ? Number(body.priceOnOtherPlatforms) : null,
        otherPlatformGst: body.otherPlatformGst !== undefined && body.otherPlatformGst !== null
            ? Number(body.otherPlatformGst)
            : null,
        variants,
        image: typeof body.image === 'string' ? body.image.trim() : '',
        foodType,
        isAvailable: body.isAvailable !== false,
        isRecommended: body.isRecommended === true,
        preparationTime: typeof body.preparationTime === 'string' ? body.preparationTime.trim() : '',
        approvalStatus: 'approved'
    });
    await doc.save();
    return doc.toObject();
}

export async function updateFood(id, body) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FoodItem.findById(id);
    if (!doc) return null;
    const restaurant = await FoodRestaurant.findById(doc.restaurantId)
        .select('pureVegRestaurant')
        .lean();
    if (!restaurant?._id) {
        throw new ValidationError('Restaurant not found');
    }
    if (body.name !== undefined) doc.name = String(body.name || '').trim();
    if (body.description !== undefined) doc.description = String(body.description || '').trim();
    const targetFoodType = body.foodType !== undefined ? (body.foodType === 'Veg' ? 'Veg' : 'Non-Veg') : (doc.foodType === 'Veg' ? 'Veg' : 'Non-Veg');
    if (restaurant.pureVegRestaurant === true && targetFoodType !== 'Veg') {
        throw new ValidationError('Pure veg restaurants can only use veg foods');
    }
    const pricingUpdate = getAdminFoodUpdatedPricing(doc.toObject(), body);
    if (pricingUpdate.price !== undefined) doc.price = pricingUpdate.price;
    if (pricingUpdate.variants !== undefined) doc.variants = pricingUpdate.variants;
    if (body.priceOnOtherPlatforms !== undefined) doc.priceOnOtherPlatforms = body.priceOnOtherPlatforms ? Number(body.priceOnOtherPlatforms) : null;
    if (body.otherPlatformGst !== undefined) {
        doc.otherPlatformGst = body.otherPlatformGst !== null && body.otherPlatformGst !== ''
            ? Number(body.otherPlatformGst)
            : null;
    }
    if (body.image !== undefined) doc.image = String(body.image || '').trim();
    if (body.foodType !== undefined) doc.foodType = targetFoodType;
    if (body.isAvailable !== undefined) doc.isAvailable = body.isAvailable !== false;
    if (body.isRecommended !== undefined) doc.isRecommended = body.isRecommended === true;
    if (body.preparationTime !== undefined) doc.preparationTime = String(body.preparationTime || '').trim();
    if (body.categoryId !== undefined || body.categoryName !== undefined || body.category !== undefined || body.foodType !== undefined) {
        const nextCategoryName = body.categoryName !== undefined
            ? String(body.categoryName || '').trim()
            : (body.category !== undefined ? String(body.category || '').trim() : doc.categoryName);
        const { categoryId, categoryName } = await resolveAdminFoodCategory({
            categoryId: body.categoryId !== undefined ? body.categoryId : doc.categoryId,
            categoryName: nextCategoryName,
            foodType: targetFoodType,
            pureVegRestaurant: restaurant.pureVegRestaurant === true
        });
        doc.categoryId = categoryId;
        doc.categoryName = categoryName;
    }
    await doc.save();
    return doc.toObject();
}

export async function deleteFood(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const deleted = await FoodItem.findByIdAndDelete(id).lean();
    return deleted ? { id } : null;
}

/** Admin creates a restaurant (JSON body with image URLs already uploaded). Single API. */
export async function createRestaurantByAdmin(body) {
    const loc = body.location || {};
    const toStr = (v) => (v != null && v !== undefined ? String(v).trim() : '');
    const toUrl = (v) => (v && (typeof v === 'string' ? v : v.url)) ? (typeof v === 'string' ? v : v.url) : undefined;
    const coordinates = Array.isArray(loc.coordinates) ? loc.coordinates : [];
    const lngFromCoordinates = toFiniteNumber(coordinates[0]);
    const latFromCoordinates = toFiniteNumber(coordinates[1]);
    const latitude = toFiniteNumber(loc.latitude ?? latFromCoordinates);
    const longitude = toFiniteNumber(loc.longitude ?? lngFromCoordinates);
    const menuUrls = Array.isArray(body.menuImages)
        ? body.menuImages.map((m) => toUrl(m)).filter(Boolean)
        : [];

    const normalizedOpeningTime = normalizeRestaurantTime(body.openingTime) || '09:00';
    const normalizedClosingTime = normalizeRestaurantTime(body.closingTime) || '22:00';
    validateOpeningClosingTimes(normalizedOpeningTime, normalizedClosingTime);

    const doc = {
        restaurantName: toStr(body.restaurantName) || toStr(body.name),
        ownerName: toStr(body.ownerName),
        ownerEmail: toStr(body.ownerEmail),
        ownerPhone: toStr(body.ownerPhone),
        primaryContactNumber: toStr(body.primaryContactNumber) || toStr(body.ownerPhone),
        pureVegRestaurant: body.pureVegRestaurant !== undefined
            ? parseBooleanLike(body.pureVegRestaurant, 'pureVegRestaurant')
            : false,
        addressLine1: toStr(loc.addressLine1),
        addressLine2: toStr(loc.addressLine2),
        area: toStr(loc.area),
        city: toStr(loc.city),
        state: toStr(loc.state),
        pincode: toStr(loc.pincode),
        landmark: toStr(loc.landmark),
        cuisines: Array.isArray(body.cuisines) ? body.cuisines : [],
        openingTime: normalizedOpeningTime,
        closingTime: normalizedClosingTime,
        openDays: Array.isArray(body.openDays) ? body.openDays : [],
        panNumber: toStr(body.panNumber),
        nameOnPan: toStr(body.nameOnPan),
        gstRegistered: Boolean(body.gstRegistered),
        gstNumber: toStr(body.gstNumber),
        gstLegalName: toStr(body.gstLegalName),
        gstAddress: toStr(body.gstAddress),
        fssaiNumber: toStr(body.fssaiNumber),
        fssaiExpiry: body.fssaiExpiry ? new Date(body.fssaiExpiry) : undefined,
        accountNumber: toStr(body.accountNumber),
        ifscCode: toStr(body.ifscCode),
        accountHolderName: toStr(body.accountHolderName),
        accountType: toStr(body.accountType),
        menuImages: menuUrls,
        profileImage: toUrl(body.profileImage),
        panImage: toUrl(body.panImage),
        gstImage: toUrl(body.gstImage),
        fssaiImage: toUrl(body.fssaiImage),
        featuredDish: toStr(body.featuredDish),
        featuredPrice: typeof body.featuredPrice === 'number' ? body.featuredPrice : (parseFloat(body.featuredPrice) || undefined),
        offer: toStr(body.offer),
        diningSettings: body.diningSettings && typeof body.diningSettings === 'object'
            ? {
                isEnabled: Boolean(body.diningSettings.isEnabled),
                maxGuests: Math.max(1, parseInt(body.diningSettings.maxGuests, 10) || 6),
                diningType: toStr(body.diningSettings.diningType) || 'family-dining'
            }
            : undefined,
        status: 'approved',
        approvedAt: new Date()
    };

    if (body.zoneId !== undefined) {
        const zoneId = String(body.zoneId || '').trim();
        if (!zoneId) {
            doc.zoneId = undefined;
        } else if (!mongoose.Types.ObjectId.isValid(zoneId)) {
            throw new ValidationError('Invalid zoneId');
        } else {
            doc.zoneId = new mongoose.Types.ObjectId(zoneId);
        }
    }

    if (latitude !== null && longitude !== null) {
        doc.location = {
            type: 'Point',
            coordinates: [longitude, latitude],
            latitude,
            longitude,
            formattedAddress: toStr(loc.formattedAddress || loc.address || loc.addressLine1),
            address: toStr(loc.address || loc.formattedAddress || loc.addressLine1),
            addressLine1: toStr(loc.addressLine1 || loc.formattedAddress || loc.address),
            addressLine2: toStr(loc.addressLine2),
            area: toStr(loc.area),
            city: toStr(loc.city),
            state: toStr(loc.state),
            pincode: toStr(loc.pincode || loc.zipCode || loc.postalCode),
            landmark: toStr(loc.landmark),
        };
    }

    if (!doc.restaurantName || !doc.ownerName) {
        throw new ValidationError('Restaurant name and owner name are required');
    }
    if (!doc.ownerPhone && !doc.primaryContactNumber) {
        throw new ValidationError('Owner phone or primary contact number is required');
    }

    const restaurant = await FoodRestaurant.create(doc);
    return restaurant.toObject();
}

export async function approveRestaurant(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const updated = await FoodRestaurant.findByIdAndUpdate(
        id,
        {
            $set: {
                status: 'approved',
                approvedAt: new Date(),
                rejectedAt: undefined,
                rejectionReason: undefined
            }
        },
        { new: true, runValidators: false }
    ).lean();

    if (updated) {
        try {
            const { notifyOwnersSafely } = await import('../../../../core/notifications/firebase.service.js');
            await notifyOwnersSafely(
                [{ ownerType: 'RESTAURANT', ownerId: updated._id }],
                {
                    title: 'Congratulations! Ã°Å¸Å½â€°',
                    body: `Your restaurant "${updated.restaurantName}" has been approved. You can now start receiving orders!`,
                    image: updated.profileImage || 'https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png',
                    data: {
                        type: 'restaurant_approved',
                        restaurantId: String(updated._id)
                    }
                }
            );
        } catch (e) {
            console.error('Failed to send restaurant approval notification:', e);
        }
    }
    return updated;
}

export async function rejectRestaurant(id, reason) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const updated = await FoodRestaurant.findByIdAndUpdate(
        id,
        {
            $set: {
                status: 'rejected',
                rejectedAt: new Date(),
                rejectionReason: typeof reason === 'string' ? reason.trim() : undefined,
                approvedAt: null
            }
        },
        { new: true, runValidators: false }
    ).lean();

    if (updated) {
        try {
            const { notifyOwnersSafely } = await import('../../../../core/notifications/firebase.service.js');
            await notifyOwnersSafely(
                [{ ownerType: 'RESTAURANT', ownerId: updated._id }],
                {
                    title: 'Update on Registration Ã°Å¸â€œâ€¹',
                    body: `Your restaurant registration for "${updated.restaurantName}" has been rejected. Reason: ${reason || 'Incomplete documents'}.`,
                    image: 'https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png',
                    data: {
                        type: 'restaurant_rejected',
                        restaurantId: String(updated._id),
                        reason: reason || ''
                    }
                }
            );
        } catch (e) {
            console.error('Failed to send restaurant rejection notification:', e);
        }
    }
    return updated;
}

export async function deleteRestaurant(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const restaurantId = new mongoose.Types.ObjectId(id);

    const restaurant = await FoodRestaurant.findById(restaurantId).lean();
    if (!restaurant) return null;

    // Cascading deletion
    await Promise.all([
        // Delete all food items
        FoodItem.deleteMany({ restaurantId }),
        // Delete all addons
        FoodAddon.deleteMany({ restaurantId }),
        // Delete restaurant-specific categories
        FoodCategory.deleteMany({ restaurantId }),
        // Delete commissions
        FoodRestaurantCommission.deleteMany({ restaurantId }),
        // Delete withdrawals
        FoodRestaurantWithdrawal.deleteMany({ restaurantId }),
        // Delete support tickets
        FoodRestaurantSupportTicket.deleteMany({ restaurantId }),
        // Delete offers linked to this restaurant
        FoodOffer.deleteMany({ restaurantId, restaurantScope: 'selected' }),
        // Finally delete the restaurant
        FoodRestaurant.findByIdAndDelete(restaurantId)
    ]);

    return { id: restaurantId };
}

// ----- Offers & Coupons -----
export async function getAllOffers(_query = {}) {
    const list = await FoodOffer.find({})
        .sort({ createdAt: -1 })
        .populate({ path: 'restaurantId', select: 'restaurantName' })
        .lean();

    const offers = list.map((o, index) => {
        const now = Date.now();
        const endTs = o.endDate ? new Date(o.endDate).getTime() : null;
        const isExpired = Boolean(endTs && now >= endTs);
        const restaurantName =
            o.restaurantScope === 'selected'
                ? (o.restaurantId?.restaurantName || 'Selected Restaurant')
                : 'All Restaurants';

        const discountPercentage = o.discountType === 'percentage' ? Number(o.discountValue) : 0;

        const originalPrice = o.discountType === 'flat-price' ? Number(o.discountValue) : 0;
        const discountedPrice = 0;

        return {
            sl: index + 1,
            offerId: String(o._id),
            dishId: 'all',
            restaurantName,
            dishName: 'All Items',
            couponCode: o.couponCode,
            customerGroup: o.customerScope === 'first-time' ? 'new' : 'all',
            discountType: o.discountType,
            discountPercentage,
            originalPrice,
            discountedPrice,
            status: isExpired ? 'inactive' : (o.status || 'active'),
            showInCart: o.showInCart !== false,
            endDate: o.endDate || null,
            // Additional info for admin UI (backward compatible)
            minOrderValue: o.minOrderValue ?? 0,
            maxDiscount: o.maxDiscount ?? null,
            usageLimit: o.usageLimit ?? null,
            usedCount: o.usedCount ?? 0,
            restaurantScope: o.restaurantScope
        };
    });

    return { offers };
}

export async function createAdminOffer(body) {
    const existing = await FoodOffer.findOne({ couponCode: body.couponCode }).lean();
    if (existing) {
        throw new ValidationError('Coupon code already exists');
    }

    const doc = await FoodOffer.create({
        couponCode: body.couponCode,
        discountType: body.discountType,
        discountValue: body.discountValue,
        customerScope: body.customerScope,
        restaurantScope: body.restaurantScope,
        restaurantId: body.restaurantScope === 'selected' ? body.restaurantId : undefined,
        minOrderValue: body.minOrderValue ?? 0,
        maxDiscount: body.maxDiscount ?? null,
        usageLimit: body.usageLimit ?? null,
        perUserLimit: body.perUserLimit ?? null,
        startDate: body.startDate,
        isFirstOrderOnly: body.isFirstOrderOnly ?? false,
        endDate: body.endDate,
        status: body.endDate && new Date(body.endDate).getTime() <= Date.now() ? 'inactive' : 'active',
        showInCart: true
    });

    if (doc.restaurantScope === 'selected' && doc.restaurantId) {
        try {
            const { notifyOwnersSafely } = await import('../../../../core/notifications/firebase.service.js');
            await notifyOwnersSafely(
                [{ ownerType: 'RESTAURANT', ownerId: doc.restaurantId }],
                {
                    title: 'New Campaign Invitation! Ã°Å¸â€œÂ¢',
                    body: `You have been invited to join a new campaign: "${doc.couponCode}". Check it out now!`,
                    image: 'https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png',
                    data: {
                        type: 'campaign_invitation',
                        offerId: String(doc._id),
                        couponCode: doc.couponCode
                    }
                }
            );
        } catch (e) {
            console.error('Failed to send campaign invitation notification:', e);
        }
    }

    return doc.toObject();
}

export async function updateAdminOfferCartVisibility(offerId, itemId, showInCart) {
    if (!offerId || !mongoose.Types.ObjectId.isValid(offerId)) return null;
    if (!itemId) return null;
    const updated = await FoodOffer.findByIdAndUpdate(
        offerId,
        { $set: { showInCart: Boolean(showInCart) } },
        { new: true }
    ).lean();
    return updated;
}

export async function deleteAdminOffer(id) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    const deleted = await FoodOffer.findByIdAndDelete(id).lean();
    if (!deleted) return null;
    await FoodOfferUsage.deleteMany({ offerId: new mongoose.Types.ObjectId(id) });
    return { id };
}

export async function expireExpiredOffers() {
    const now = new Date();
    await FoodOffer.updateMany(
        { status: 'active', endDate: { $lte: now } },
        { $set: { status: 'inactive' } }
    );
}




// ----- Support tickets -----
export async function getSupportTicketStats() {
    const [open, inProgress, resolved, closed] = await Promise.all([




    ]);
    return {
        total: open + inProgress + resolved + closed,
        open,
        inProgress,
        resolved,
        closed
    };
}







function generateBonusTransactionId() {
    const n = Date.now().toString(36).slice(-6).toUpperCase();
    const r = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `BON-${n}${r}`;
}







// ----- Earning Addon Offers (admin) -----










// ----- Earning Addon History (admin) -----
















// ----- Zones CRUD -----
export async function getZones(query) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 100, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;
    const isActive = query.isActive;
    const search = typeof query.search === 'string' ? query.search.trim() : '';

    const filter = {};
    if (isActive !== undefined && isActive !== '') {
        filter.isActive = isActive === 'true' || isActive === '1';
    }
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { zoneName: { $regex: search, $options: 'i' } },
            { serviceLocation: { $regex: search, $options: 'i' } },
            { country: { $regex: search, $options: 'i' } }
        ];
    }

    const [zones, total] = await Promise.all([
        FoodZone.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        FoodZone.countDocuments(filter)
    ]);
    return { zones, total, page, limit };
}

export async function getZoneById(id) {
    return FoodZone.findById(id).lean();
}

export async function createZone(body) {
    const name = typeof body.name === 'string' ? body.name.trim() : (body.zoneName && body.zoneName.trim()) || '';
    if (!name) return { error: 'Zone name is required' };
    const coordinates = Array.isArray(body.coordinates) ? body.coordinates : [];
    if (coordinates.length < 3) return { error: 'At least 3 coordinates (polygon points) are required' };

    const normalized = coordinates.map((c) => ({
        latitude: Number(c.latitude) || 0,
        longitude: Number(c.longitude) || 0
    }));

    const zone = new FoodZone({
        name,
        zoneName: body.zoneName && body.zoneName.trim() ? body.zoneName.trim() : name,
        country: (body.country && body.country.trim()) || 'India',
        serviceLocation: (body.serviceLocation && body.serviceLocation.trim()) || name,
        unit: body.unit === 'miles' ? 'miles' : 'kilometer',
        coordinates: normalized,
        isActive: body.isActive !== false
    });
    await zone.save();
    return { zone: zone.toObject() };
}

export async function updateZone(id, body) {
    const zone = await FoodZone.findById(id);
    if (!zone) return null;

    if (body.name !== undefined) zone.name = String(body.name).trim();
    if (body.zoneName !== undefined) zone.zoneName = String(body.zoneName).trim();
    if (body.country !== undefined) zone.country = String(body.country).trim();
    if (body.serviceLocation !== undefined) zone.serviceLocation = String(body.serviceLocation).trim();
    if (body.unit !== undefined) zone.unit = body.unit === 'miles' ? 'miles' : 'kilometer';
    if (body.isActive !== undefined) zone.isActive = body.isActive !== false;
    if (Array.isArray(body.coordinates) && body.coordinates.length >= 3) {
        zone.coordinates = body.coordinates.map((c) => ({
            latitude: Number(c.latitude) || 0,
            longitude: Number(c.longitude) || 0
        }));
    }
    if (zone.name) zone.serviceLocation = zone.serviceLocation || zone.name;

    await zone.save();
    return { zone: zone.toObject() };
}

export async function deleteZone(id) {
    const zone = await FoodZone.findByIdAndDelete(id);
    return zone ? { id } : null;
}

// ----- Withdrawals (admin) -----








/**
 */


/**
 * Fetch cash limit settlement (deposit) transactions
 */
export async function getCashLimitSettlements(query = {}) {
    const limit = parseInt(query.limit, 10) || 20;
    const page = parseInt(query.page, 10) || 1;
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.search) {
        // Search by razorpay ID or find partner IDs to search by partner
        if (query.search.startsWith('pay_')) {
            filter.razorpayPaymentId = query.search;
        }
    }

    const [deposits, total] = await Promise.all([

            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),

    ]);

    const transactions = deposits.map((d) => ({
        id: d._id,
        createdAt: d.createdAt,
        amount: Number(d.amount || 0),
        status: d.status,
        razorpayPaymentId: d.razorpayPaymentId || '-'
    }));

    return { 
        transactions, 
        pagination: { 
            total, 
            page, 
            limit, 
            pages: Math.ceil(total / limit) || 1 
        } 
    };
}

export async function getSidebarBadges() {
    try {
        const [
            pendingRestaurants,
            pendingFoods,
            pendingAddons,
            pendingOrders,
            pendingOfflinePayments,
            pendingRestaurantWithdrawals,
            openUserSupportTickets,

            pendingEarningAddons,
            pendingSafetyReports,
            pendingEmergencyHelp,
            pendingRestaurantComplaints
        ] = await Promise.all([
            FoodRestaurant.countDocuments({ status: 'pending' }),
            0,
            FoodItem.countDocuments({ status: 'pending' }),
            FoodAddon.countDocuments({ status: 'pending' }),
            FoodOrder.countDocuments({ orderStatus: 'pending' }),
            FoodOrder.countDocuments({ paymentMethod: 'offline_payment', orderStatus: 'pending' }),
            FoodRestaurantWithdrawal.countDocuments({ status: 'pending' }),

            FoodSupportTicket.countDocuments({ status: 'open', userId: { $exists: true }, restaurantId: { $exists: false } }),

            FoodEarningAddonHistory.countDocuments({ status: 'pending' }),
            FoodSafetyEmergencyReport.countDocuments({ status: 'pending' }),

            FoodSupportTicket.countDocuments({ status: 'open', restaurantId: { $exists: true } })
        ]);

        return {
            restaurants: pendingRestaurants,
            foods: pendingFoods + pendingAddons,
            foodApprovals: pendingFoods,
            orders: pendingOrders,
            offlinePayments: pendingOfflinePayments,
            restaurantWithdrawals: pendingRestaurantWithdrawals,
            userSupportTickets: openUserSupportTickets,

            earningAddons: pendingEarningAddons,
            safetyReports: pendingSafetyReports,
            emergencyHelp: pendingEmergencyHelp,
            restaurantComplaints: pendingRestaurantComplaints
        };
    } catch (error) {
        console.error('Error fetching sidebar badges:', error);
        return {};
    }
}

