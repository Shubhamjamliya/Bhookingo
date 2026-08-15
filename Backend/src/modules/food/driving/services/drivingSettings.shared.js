import mongoose from 'mongoose';
import { FoodSystemConfig } from '../../admin/models/systemConfig.model.js';
import { ValidationError } from '../../../../core/auth/errors.js';

export const DRIVING_SETTINGS_KEY = 'driving_mode_settings';

export const DEFAULT_DRIVING_SETTINGS = {
    enabled: true,
    enableLiveSimulation: false,
    highwayEntryRadiusMeters: 2000,
    googleRouteSearchRadiusKm: 1,
    googleRouteForwardRangeKm: 100,
    googleRouteBackwardBufferKm: 0.5,
    showAllRouteRestaurants: false
};

const toFinite = (value) => {
    const numericValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
};

const normalizePositiveNumber = (value, fallback) => {
    const numericValue = toFinite(value);
    return numericValue !== null && numericValue > 0 ? numericValue : fallback;
};

const normalizeNonNegativeNumber = (value, fallback) => {
    const numericValue = toFinite(value);
    return numericValue !== null && numericValue >= 0 ? numericValue : fallback;
};

export function normalizeDrivingSettings(rawSettings = {}) {
    return {
        enabled: rawSettings.enabled !== false,
        enableLiveSimulation: rawSettings.enableLiveSimulation === true,
        highwayEntryRadiusMeters: normalizePositiveNumber(
            rawSettings.highwayEntryRadiusMeters,
            DEFAULT_DRIVING_SETTINGS.highwayEntryRadiusMeters
        ),
        googleRouteSearchRadiusKm: normalizePositiveNumber(
            rawSettings.googleRouteSearchRadiusKm,
            DEFAULT_DRIVING_SETTINGS.googleRouteSearchRadiusKm
        ),
        googleRouteForwardRangeKm: normalizePositiveNumber(
            rawSettings.googleRouteForwardRangeKm,
            DEFAULT_DRIVING_SETTINGS.googleRouteForwardRangeKm
        ),
        googleRouteBackwardBufferKm: normalizeNonNegativeNumber(
            rawSettings.googleRouteBackwardBufferKm,
            DEFAULT_DRIVING_SETTINGS.googleRouteBackwardBufferKm
        ),
        showAllRouteRestaurants: rawSettings.showAllRouteRestaurants === true
    };
}

export async function getStoredDrivingSettingsConfig() {
    try {
        const config = await FoodSystemConfig.findOne({ key: DRIVING_SETTINGS_KEY }).lean();
        return normalizeDrivingSettings(config?.value || {});
    } catch {
        return { ...DEFAULT_DRIVING_SETTINGS };
    }
}

export async function saveDrivingSettingsConfig(settings, adminId = null, options = {}) {
    const { partial = false } = options;
    const baseSettings = partial ? await getStoredDrivingSettingsConfig() : {};
    const mergedSettings = normalizeDrivingSettings({
        ...baseSettings,
        ...settings
    });

    const payload = {
        enabled: mergedSettings.enabled !== false,
        enableLiveSimulation: settings.enableLiveSimulation ?? mergedSettings.enableLiveSimulation,
        highwayEntryRadiusMeters: Number(settings.highwayEntryRadiusMeters ?? mergedSettings.highwayEntryRadiusMeters),
        googleRouteSearchRadiusKm: Number(settings.googleRouteSearchRadiusKm ?? mergedSettings.googleRouteSearchRadiusKm),
        googleRouteForwardRangeKm: Number(settings.googleRouteForwardRangeKm ?? mergedSettings.googleRouteForwardRangeKm),
        googleRouteBackwardBufferKm: Number(settings.googleRouteBackwardBufferKm ?? mergedSettings.googleRouteBackwardBufferKm),
        showAllRouteRestaurants: settings.showAllRouteRestaurants ?? mergedSettings.showAllRouteRestaurants
    };

    if (!Number.isFinite(payload.highwayEntryRadiusMeters) || payload.highwayEntryRadiusMeters <= 0) {
        throw new ValidationError('Highway entry radius must be a positive number in meters');
    }
    if (!Number.isFinite(payload.googleRouteSearchRadiusKm) || payload.googleRouteSearchRadiusKm <= 0) {
        throw new ValidationError('Google route corridor radius must be a positive number in KM');
    }
    if (!Number.isFinite(payload.googleRouteForwardRangeKm) || payload.googleRouteForwardRangeKm <= 0) {
        throw new ValidationError('Google route forward search distance must be a positive number in KM');
    }
    if (!Number.isFinite(payload.googleRouteBackwardBufferKm) || payload.googleRouteBackwardBufferKm < 0) {
        throw new ValidationError('Google route backward tolerance must be zero or a positive number in KM');
    }

    await FoodSystemConfig.findOneAndUpdate(
        { key: DRIVING_SETTINGS_KEY },
        {
            $set: {
                key: DRIVING_SETTINGS_KEY,
                value: payload,
                description: 'Driving mode validation, route corridor and map refresh configuration',
                updatedBy: adminId
                    ? { role: 'ADMIN', adminId: new mongoose.Types.ObjectId(adminId), at: new Date() }
                    : undefined
            }
        },
        { upsert: true, new: true }
    );

    return payload;
}
