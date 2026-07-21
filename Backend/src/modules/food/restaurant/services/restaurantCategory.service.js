import mongoose from 'mongoose';
import { ValidationError } from '../../../../core/auth/errors.js';
import { FoodCategory } from '../../admin/models/category.model.js';
import { FoodItem } from '../../admin/models/food.model.js';
import { FoodRestaurant } from '../models/restaurant.model.js';
import { logger } from '../../../../utils/logger.js';
import {
    backfillLegacyCategoryWorkflow,
    GLOBAL_CATEGORY_FILTER,
    normalizeCategoryFoodTypeScope,
    serializeCategoryForResponse,
    toObjectId
} from '../../shared/categoryWorkflow.js';

const escapeRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const APPROVED_CATEGORY_FILTER = [
    { approvalStatus: 'approved' },
    { approvalStatus: { $exists: false }, isApproved: { $ne: false } }
];

const getRestaurantContext = async (restaurantId) => {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(String(restaurantId))) {
        throw new ValidationError('Invalid restaurant id');
    }

    const restaurant = await FoodRestaurant.findById(restaurantId)
        .select('highwayId pureVegRestaurant')
        .lean();
    if (!restaurant?._id) {
        throw new ValidationError('Restaurant not found');
    }

    return {
        restaurantId: toObjectId(restaurantId),
        highwayId: restaurant.highwayId ? String(restaurant.highwayId) : '',
        pureVegRestaurant: restaurant.pureVegRestaurant === true
    };
};

const applyZoneVisibilityFilter = (filterAndList, highwayIdRaw) => {
    if (highwayIdRaw && mongoose.Types.ObjectId.isValid(highwayIdRaw)) {
        filterAndList.push({
            $or: [
                { highwayId: new mongoose.Types.ObjectId(highwayIdRaw) },
                { highwayId: { $exists: false } },
                { highwayId: null }
            ]
        });
        return;
    }

    filterAndList.push({
        $or: [{ highwayId: { $exists: false } }, { highwayId: null }]
    });
};

export async function listRestaurantCategories(restaurantId, query = {}) {
    const context = await getRestaurantContext(restaurantId);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 1000, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const search = typeof query.search === 'string' ? query.search.trim() : '';
    const includeInactive = query.includeInactive === 'true' || query.includeInactive === '1';
    const withCounts = query.withCounts === 'true' || query.withCounts === '1';
    const compact = query.compact === 'true' || query.compact === '1';
    const highwayIdRaw = typeof query.highwayId === 'string' ? query.highwayId.trim() : context.highwayId;

    const filter = {};
    if (!includeInactive) filter.isActive = true;

    const visibilityFilter = compact
        ? {
            $or: [
                {
                    $and: [
                        { $or: GLOBAL_CATEGORY_FILTER },
                        { $or: APPROVED_CATEGORY_FILTER }
                    ]
                },
                {
                    restaurantId: context.restaurantId,
                    $or: APPROVED_CATEGORY_FILTER
                }
            ]
        }
        : {
            $or: [
                {
                    $and: [
                        { $or: GLOBAL_CATEGORY_FILTER },
                        { $or: APPROVED_CATEGORY_FILTER }
                    ]
                },
                { restaurantId: context.restaurantId },
                { createdByRestaurantId: context.restaurantId }
            ]
        };

    filter.$and = [visibilityFilter];
    if (search) {
        const term = escapeRegex(search.slice(0, 80));
        filter.$and.push({ name: { $regex: term, $options: 'i' } });
    }
    applyZoneVisibilityFilter(filter.$and, highwayIdRaw);

    if (compact && context.pureVegRestaurant) {
        filter.$and.push({ foodTypeScope: 'Veg' });
    }

    const queryBuilder = FoodCategory.find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
            compact
                ? 'name image type foodTypeScope approvalStatus rejectionReason highwayId restaurantId createdByRestaurantId isActive sortOrder requestedAt approvedAt rejectedAt globalizedAt'
                : 'name image type foodTypeScope approvalStatus rejectionReason highwayId restaurantId createdByRestaurantId isActive sortOrder requestedAt approvedAt rejectedAt globalizedAt createdAt updatedAt'
        );

    const [list, total] = await Promise.all([
        queryBuilder.lean(),
        FoodCategory.countDocuments(filter)
    ]);

    const statsById = await backfillLegacyCategoryWorkflow(list);
    const restaurantIds = !compact
        ? Array.from(
            new Set(
                list
                    .flatMap((category) => [category?.restaurantId, category?.createdByRestaurantId])
                    .map((value) => (value ? String(value) : ''))
                    .filter(Boolean)
            )
        )
        : [];
    const restaurants = restaurantIds.length
        ? await FoodRestaurant.find({ _id: { $in: restaurantIds } })
            .select('restaurantName ownerName ownerPhone')
            .lean()
        : [];
    const restaurantMap = new Map(restaurants.map((restaurant) => [String(restaurant._id), restaurant]));

    const hydratedList = !compact
        ? list.map((category) => ({
            ...category,
            restaurantId: category?.restaurantId ? restaurantMap.get(String(category.restaurantId)) || category.restaurantId : category.restaurantId,
            createdByRestaurantId: category?.createdByRestaurantId ? restaurantMap.get(String(category.createdByRestaurantId)) || category.createdByRestaurantId : category.createdByRestaurantId
        }))
        : list;

    const categories = hydratedList.map((category) =>
        serializeCategoryForResponse(category, {
            currentRestaurantId: restaurantId,
            includeCounts: withCounts || !compact,
            statsById
        })
    );

    return { categories, total, page, limit };
}

export async function listPublicCategories(query = {}) {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 1000, 1), 1000);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const search = typeof query.search === 'string' ? query.search.trim() : '';
    const highwayIdRaw = typeof query.highwayId === 'string' ? query.highwayId.trim() : '';

    let approvedCategoryIds = [];
    if (highwayIdRaw && mongoose.Types.ObjectId.isValid(highwayIdRaw)) {
        const zoneRestaurants = await FoodRestaurant.find({
            highwayId: new mongoose.Types.ObjectId(highwayIdRaw),
            status: 'approved'
        }).select('_id').lean();
        const zoneRestaurantIds = zoneRestaurants.map(r => r._id);
        
        approvedCategoryIds = await FoodItem.distinct('categoryId', {
            approvalStatus: 'approved',
            restaurantId: { $in: zoneRestaurantIds },
            categoryId: { $ne: null }
        });
    } else {
        approvedCategoryIds = await FoodItem.distinct('categoryId', {
            approvalStatus: 'approved',
            categoryId: { $ne: null }
        });
    }

    if (!approvedCategoryIds.length) {
        return { categories: [], total: 0, page, limit };
    }

    const filter = {
        _id: { $in: approvedCategoryIds },
        isActive: true,
        $and: [{ $or: APPROVED_CATEGORY_FILTER }]
    };

    if (search) {
        const term = escapeRegex(search.slice(0, 80));
        filter.$and.push({ name: { $regex: term, $options: 'i' } });
    }
    applyZoneVisibilityFilter(filter.$and, highwayIdRaw);

    const list = await FoodCategory.find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .select('name image type foodTypeScope highwayId sortOrder createdAt updatedAt')
        .lean();

    // Deduplicate categories by name in memory
    const groups = {};
    for (const cat of list) {
        const key = String(cat.name || '').toLowerCase().trim();
        if (!key) continue;
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(cat);
    }

    const deduplicated = [];
    for (const key of Object.keys(groups)) {
        const group = groups[key];
        if (group.length === 1) {
            deduplicated.push(group[0]);
            continue;
        }

        // Prioritize: 1. zone specific match, 2. global category, 3. has image, 4. sortOrder, 5. updatedAt
        group.sort((a, b) => {
            const aHighwayMatch = highwayIdRaw && String(a.highwayId) === String(highwayIdRaw);
            const bHighwayMatch = highwayIdRaw && String(b.highwayId) === String(highwayIdRaw);
            if (aHighwayMatch && !bHighwayMatch) return -1;
            if (!aHighwayMatch && bHighwayMatch) return 1;

            const aGlobal = !a.highwayId;
            const bGlobal = !b.highwayId;
            if (aGlobal && !bGlobal) return -1;
            if (!aGlobal && bGlobal) return 1;

            const aHasImg = !!a.image;
            const bHasImg = !!b.image;
            if (aHasImg && !bHasImg) return -1;
            if (!aHasImg && bHasImg) return 1;

            const aOrder = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
            const bOrder = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
            if (aOrder !== bOrder) return aOrder - bOrder;

            const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return bTime - aTime;
        });

        deduplicated.push(group[0]);
    }

    // Sort final list by sortOrder and then alphabetically
    deduplicated.sort((a, b) => {
        const aOrder = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
        const bOrder = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return String(a.name || '').localeCompare(String(b.name || ''));
    });

    const total = deduplicated.length;
    const paginatedList = deduplicated.slice(skip, skip + limit);

    await backfillLegacyCategoryWorkflow(paginatedList);
    const categories = paginatedList.map((category) => serializeCategoryForResponse(category));

    return { categories, total, page, limit };
}

export async function createRestaurantCategory(restaurantId, body = {}) {
    const context = await getRestaurantContext(restaurantId);

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new ValidationError('Category name is required.');
    if (name.length > 200) throw new ValidationError('Category name is too long.');

    // Duplicate check for this restaurant (case-insensitive)
    const existing = await FoodCategory.findOne({
        $or: [
            { restaurantId: context.restaurantId },
            { createdByRestaurantId: context.restaurantId }
        ],
        name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') }
    }).lean();

    if (existing) {
        throw new ValidationError('Category already exists.');
    }

    const foodTypeScopeRaw = typeof body.foodTypeScope === 'string' ? body.foodTypeScope.trim() : '';
    const defaultScope = context.pureVegRestaurant ? 'Veg' : 'Veg';
    const foodTypeScope = foodTypeScopeRaw ? normalizeCategoryFoodTypeScope(foodTypeScopeRaw, defaultScope) : defaultScope;

    if (context.pureVegRestaurant && foodTypeScope !== 'Veg') {
        throw new ValidationError('Pure veg restaurants can only create veg categories');
    }

    const doc = new FoodCategory({
        name,
        image: typeof body.image === 'string' ? body.image.trim() : '',
        type: typeof body.type === 'string' ? body.type.trim() : '',
        foodTypeScope,
        isActive: body.isActive !== false,
        sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
        restaurantId: context.restaurantId,
        createdByRestaurantId: context.restaurantId,
        approvalStatus: 'pending',
        isApproved: false,
        rejectionReason: '',
        requestedAt: new Date(),
        highwayId: context.highwayId && mongoose.Types.ObjectId.isValid(context.highwayId)
            ? new mongoose.Types.ObjectId(context.highwayId)
            : undefined
    });
    await doc.save();
    logger.info(`Category "${name}" created successfully for Restaurant ID ${context.restaurantId}`);
    return serializeCategoryForResponse(doc.toObject(), { currentRestaurantId: context.restaurantId });
}

export async function updateRestaurantCategory(restaurantId, id, body = {}) {
    const context = await getRestaurantContext(restaurantId);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid category id');
    }

    const doc = await FoodCategory.findOne({ _id: id, restaurantId: context.restaurantId });
    if (!doc) return null;

    const nextFoodTypeScope = body.foodTypeScope !== undefined
        ? normalizeCategoryFoodTypeScope(body.foodTypeScope, '')
        : normalizeCategoryFoodTypeScope(doc.foodTypeScope, 'Both');
    if (body.foodTypeScope !== undefined && !nextFoodTypeScope) {
        throw new ValidationError('Invalid category diet type');
    }
    if (context.pureVegRestaurant && nextFoodTypeScope !== 'Veg') {
        throw new ValidationError('Pure veg restaurants can only keep veg categories');
    }

    if (body.name !== undefined) {
        const name = String(body.name || '').trim();
        if (!name) throw new ValidationError('Category name is required.');
        if (name.length > 200) throw new ValidationError('Category name is too long.');

        if (name.toLowerCase() !== doc.name.toLowerCase()) {
            const existing = await FoodCategory.findOne({
                _id: { $ne: doc._id },
                $or: [
                    { restaurantId: context.restaurantId },
                    { createdByRestaurantId: context.restaurantId }
                ],
                name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') }
            }).lean();

            if (existing) {
                throw new ValidationError('Category already exists.');
            }
        }
        doc.name = name;
    }
    if (body.image !== undefined) doc.image = String(body.image || '').trim();
    if (body.type !== undefined) doc.type = String(body.type || '').trim();
    if (body.isActive !== undefined) doc.isActive = body.isActive !== false;
    if (body.sortOrder !== undefined) doc.sortOrder = Number(body.sortOrder) || 0;
    if (body.foodTypeScope !== undefined) {
        const incompatibleFoods = nextFoodTypeScope === 'Both'
            ? 0
            : await FoodItem.countDocuments({
                categoryId: doc._id,
                foodType: nextFoodTypeScope === 'Veg' ? 'Non-Veg' : 'Veg'
            });
        if (incompatibleFoods > 0) {
            throw new ValidationError(`This category already has ${incompatibleFoods} food item(s) outside the selected diet type`);
        }
        doc.foodTypeScope = nextFoodTypeScope;
    }

    doc.createdByRestaurantId = doc.createdByRestaurantId || context.restaurantId;
    doc.approvalStatus = 'pending';
    doc.isApproved = false;
    doc.rejectionReason = '';
    doc.requestedAt = new Date();
    doc.approvedAt = undefined;
    doc.rejectedAt = undefined;

    await doc.save();
    return doc.toObject();
}

export async function deleteRestaurantCategory(restaurantId, id) {
    const context = await getRestaurantContext(restaurantId);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid category id');
    }

    const category = await FoodCategory.findOne({ _id: id, restaurantId: context.restaurantId }).select('_id').lean();
    if (!category?._id) return null;

    const inUse = await FoodItem.countDocuments({ categoryId: id, restaurantId: context.restaurantId });
    if (inUse > 0) {
        throw new ValidationError('Cannot delete category while it has items');
    }

    const deleted = await FoodCategory.findOneAndDelete({ _id: id, restaurantId: context.restaurantId }).lean();
    return deleted ? { id } : null;
}
