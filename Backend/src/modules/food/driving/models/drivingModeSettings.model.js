import mongoose from 'mongoose';

const foodDrivingModeSettingsSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true, default: 'driving_mode_settings' },
        enabled: { type: Boolean, default: true },
        enableLiveSimulation: { type: Boolean, default: false },
        normalModeDiscoveryRadiusKm: { type: Number, default: 100 },
        highwayEntryRadiusMeters: { type: Number, default: 2000 },
        googleRouteSearchRadiusKm: { type: Number, default: 1 },
        googleRouteForwardRangeKm: { type: Number, default: 100 },
        googleRouteBackwardBufferKm: { type: Number, default: 0.5 },
        showAllRouteRestaurants: { type: Boolean, default: false },
        updatedBy: {
            role: { type: String },
            adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
            at: { type: Date, default: Date.now }
        }
    },
    {
        timestamps: true,
        collection: 'food_driving_mode_settings'
    }
);

export const FoodDrivingModeSettings = mongoose.model('FoodDrivingModeSettings', foodDrivingModeSettingsSchema);
