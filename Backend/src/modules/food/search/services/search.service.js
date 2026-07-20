import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { FoodItem } from '../../admin/models/food.model.js';
import { FoodCategory } from '../../admin/models/category.model.js';
import mongoose from 'mongoose';
import { getNearbyRestaurantsPipeline } from '../../restaurant/services/restaurant.service.js';

const toFiniteNumber = (value) => {
    const n = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(n) ? n : null;
};

/**
 * Unified Search Service
 * Searches for restaurants by name and also searches for food items, 
 * returning matched restaurants with potential dish highlights.
 */
export const searchUnified = async (query = {}, options = {}) => {
    const { 
        q, 
        lat, 
        lng, 
        radiusKm = 20, 
        categoryId, 
        minRating, 
        isVeg,
        page = 1,
        limit = 20
    } = query;

    const skip = (page - 1) * limit;
    const term = String(q || '').trim();
    const regex = term ? new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    const latNum = toFiniteNumber(lat);
    const lngNum = toFiniteNumber(lng);
    let eligibleIds = null;
    let distanceMap = new Map();
    let currentHighwayId = null;

    if (latNum !== null && lngNum !== null) {
        const { pipeline, currentHighwayId: hId } = await getNearbyRestaurantsPipeline(latNum, lngNum, { status: 'approved' });
        currentHighwayId = hId;
        pipeline.push({ $project: { _id: 1, highwayId: 1, distanceMeters: 1 } });
        const eligibleDocs = await FoodRestaurant.aggregate(pipeline);
        eligibleIds = eligibleDocs.map(d => d._id);
        distanceMap = new Map(eligibleDocs.map(d => [String(d._id), d.distanceMeters]));
    }

    // 1. Initial Filter (approved status and basic conditions)
    const restaurantFilter = { status: 'approved' };
    if (eligibleIds !== null) {
        restaurantFilter._id = { $in: eligibleIds };
    }
    
    console.log(`[Search-Service] Querying with term: "${term}", categoryId: "${categoryId}", coordinates: [${latNum}, ${lngNum}]`);

    if (isVeg === 'true') {
        restaurantFilter.pureVegRestaurant = true;
    }

    if (minRating) {
        restaurantFilter.rating = { $gte: parseFloat(minRating) };
    }
    console.log(`[Search-Service] Final Restaurant Filter:`, JSON.stringify(restaurantFilter));

    let restaurantIds = new Set();
    let restaurantDetailsMap = new Map();

    // 2. Handle Category Filtering (Restaurants don't have categoryId, FoodItems do)
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
        const categoryDoc = await FoodCategory.findById(categoryId).select('name').lean();
        let categoryIdsToMatch = [new mongoose.Types.ObjectId(categoryId)];
        if (categoryDoc && categoryDoc.name) {
            const escapedName = categoryDoc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const sameNamedCategories = await FoodCategory.find({
                name: { $regex: new RegExp('^' + escapedName + '$', 'i') }
            }).select('_id').lean();
            if (sameNamedCategories.length > 0) {
                categoryIdsToMatch = sameNamedCategories.map(c => c._id);
            }
        }

        const foodItemQuery = { 
            categoryId: { $in: categoryIdsToMatch },
            approvalStatus: 'approved' 
        };
        if (eligibleIds !== null) {
            foodItemQuery.restaurantId = { $in: eligibleIds };
        }

        const catFoodItems = await FoodItem.find(foodItemQuery).select('restaurantId').lean();
        
        const catRestaurantIds = [...new Set(catFoodItems.map(f => f.restaurantId.toString()))];
        if (catRestaurantIds.length > 0) {
            restaurantFilter._id = { $in: catRestaurantIds.map(id => new mongoose.Types.ObjectId(id)) };
        } else {
            // No food items in this category -> No restaurants
            return {
                success: true,
                data: { restaurants: [], total: 0, page: parseInt(page), limit: parseInt(limit) }
            };
        }
    }

    // 3. Search Matching
    if (regex) {
        // A. Search by Restaurant Name / Cuisine
        const matchedRestaurants = await FoodRestaurant.find({
            ...restaurantFilter,
            $or: [
                { restaurantName: { $regex: regex } },
                { cuisines: { $regex: regex } }
            ]
        }).limit(limit * 2).lean();

        matchedRestaurants.forEach(r => {
            restaurantIds.add(r._id.toString());
            restaurantDetailsMap.set(r._id.toString(), { ...r, matchType: 'restaurant' });
        });

        // B. Search by Food Item Name
        const foodFilters = { approvalStatus: 'approved' };
        if (isVeg === 'true') foodFilters.foodType = 'Veg';
        if (eligibleIds !== null) {
            foodFilters.restaurantId = { $in: eligibleIds };
        }
        
        const matchedFoods = await FoodItem.find({
            ...foodFilters,
            name: { $regex: regex }
        }).limit(limit * 2).lean();

        const foodRestaurantIds = matchedFoods.map(f => f.restaurantId.toString());
        
        if (foodRestaurantIds.length > 0) {
            const unmatchedIds = foodRestaurantIds.filter(id => !restaurantIds.has(id));
            if (unmatchedIds.length > 0) {
                const rsForFoods = await FoodRestaurant.find({
                    ...restaurantFilter,
                    _id: { $in: unmatchedIds.map(id => new mongoose.Types.ObjectId(id)) }
                }).lean();

                rsForFoods.forEach(r => {
                    restaurantIds.add(r._id.toString());
                    restaurantDetailsMap.set(r._id.toString(), { 
                        ...r, 
                        matchType: 'food',
                        matchedDish: matchedFoods.find(f => f.restaurantId.toString() === r._id.toString())?.name,
                        matchedDishImage: matchedFoods.find(f => f.restaurantId.toString() === r._id.toString())?.image,
                        matchedDishId: matchedFoods.find(f => f.restaurantId.toString() === r._id.toString())?._id
                    });
                });
            }
        }
    } else {
        // No search text -> List all restaurants matching filters
        const allMatching = await FoodRestaurant.find(restaurantFilter)
            .sort({ rating: -1, createdAt: -1 })
            .limit(limit * 2)
            .lean();
            
        allMatching.forEach(r => {
            restaurantIds.add(r._id.toString());
            restaurantDetailsMap.set(r._id.toString(), r);
        });
    }

    // 4. Final Result Formatting and Sorting
    let results = Array.from(restaurantDetailsMap.values());

    // Sort: Highway priority first, then by nearest distance
    if (latNum !== null && lngNum !== null && results.length > 0) {
        results.forEach(res => {
            const distMeters = distanceMap.get(String(res._id || res.restaurantId)) ?? null;
            if (distMeters !== null) {
                res.distanceInKm = Number((distMeters / 1000).toFixed(2));
                res.distance = distMeters >= 1000 
                    ? `${(distMeters / 1000).toFixed(1)} km` 
                    : `${Math.round(distMeters)} m`;
            } else {
                res.distanceInKm = null;
                res.distance = null;
            }
        });

        results.sort((a, b) => {
            const aOnHighway = currentHighwayId && String(a.highwayId) === String(currentHighwayId) ? 1 : 0;
            const bOnHighway = currentHighwayId && String(b.highwayId) === String(currentHighwayId) ? 1 : 0;
            if (aOnHighway !== bOnHighway) {
                return bOnHighway - aOnHighway;
            }
            const aDist = distanceMap.get(String(a._id || a.restaurantId)) ?? 9999999;
            const bDist = distanceMap.get(String(b._id || b.restaurantId)) ?? 9999999;
            return aDist - bDist;
        });
    }

    const finalResult = {
        success: true,
        data: {
            restaurants: results.slice(skip, skip + limit),
            total: results.length,
            page: parseInt(page),
            limit: parseInt(limit)
        }
    };

    return finalResult;
};

/**
 * Fetch Admin-only categories
 */
export const getAdminCategories = async (query = {}) => {
    const highwayId = query.highwayId;

    let approvedCategoryIds = [];
    if (highwayId && mongoose.Types.ObjectId.isValid(highwayId)) {
        const zoneRestaurants = await FoodRestaurant.find({
            highwayId: new mongoose.Types.ObjectId(highwayId),
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
        return [];
    }

    const filter = { 
        _id: { $in: approvedCategoryIds },
        isActive: true, 
        isApproved: true,
        $and: [
            {
                $or: [
                    { restaurantId: { $exists: false } },
                    { restaurantId: null },
                    { restaurantId: { $eq: undefined } }
                ]
            }
        ]
    };

    if (highwayId && mongoose.Types.ObjectId.isValid(highwayId)) {
        filter.$and.push({
            $or: [
                { highwayId: new mongoose.Types.ObjectId(highwayId) },
                { highwayId: { $exists: false } },
                { highwayId: null }
            ]
        });
    } else {
        filter.$and.push({
            $or: [
                { highwayId: { $exists: false } },
                { highwayId: null }
            ]
        });
    }

    const list = await FoodCategory.find(filter).sort({ sortOrder: 1, name: 1 }).lean();

    // Deduplicate in memory
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

        group.sort((a, b) => {
            const aHighwayMatch = highwayId && String(a.highwayId) === String(highwayId);
            const bHighwayMatch = highwayId && String(b.highwayId) === String(highwayId);
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

    deduplicated.sort((a, b) => {
        const aOrder = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
        const bOrder = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return String(a.name || '').localeCompare(String(b.name || ''));
    });

    return deduplicated;
};
