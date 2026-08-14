import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';

export const listHighwaysController = async (_req, res, next) => {
    try {
        const restaurants = await FoodRestaurant.find({
            status: { $in: ['approved', 'pending'] }
        })
            .select('highwayName highwayRef')
            .lean();

        const seen = new Set();
        const highways = [];

        for (const restaurant of restaurants) {
            const highwayRef = String(restaurant?.highwayRef || '').trim();
            const highwayName = String(restaurant?.highwayName || '').trim();
            const key = highwayRef || highwayName;
            if (!key || seen.has(key)) continue;

            seen.add(key);
            highways.push({
                _id: key,
                ref: highwayRef || highwayName,
                name: highwayName || highwayRef,
                isActive: true,
                source: 'restaurant_labels'
            });
        }

        highways.sort((a, b) => String(a.ref || a.name).localeCompare(String(b.ref || b.name)));

        return res.status(200).json({
            success: true,
            message: 'Highways fetched successfully',
            data: {
                highways,
                zones: highways,
                total: highways.length,
                page: 1,
                totalPages: 1
            }
        });
    } catch (error) {
        next(error);
    }
};
