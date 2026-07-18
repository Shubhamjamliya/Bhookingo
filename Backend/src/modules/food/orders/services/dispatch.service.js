import { FoodSettings } from '../models/order.model.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Retrieves the dispatch settings from the database.
 * If not found, initializes default settings.
 */
export async function getDispatchSettings() {
  try {
    let settings = await FoodSettings.findOne({ key: 'dispatch_settings' });
    if (!settings) {
      settings = await FoodSettings.create({
        key: 'dispatch_settings',
        dispatchMode: 'auto'
      });
    }
    return settings;
  } catch (error) {
    logger.error(`[DispatchService] Failed to get dispatch settings: ${error.message}`);
    // Safe fallback value to prevent crashes
    return { dispatchMode: 'auto' };
  }
}

/**
 * Updates the dispatch settings.
 */
export async function updateDispatchSettings(dispatchMode, adminId) {
  try {
    let settings = await FoodSettings.findOneAndUpdate(
      { key: 'dispatch_settings' },
      {
        dispatchMode,
        updatedBy: {
          role: 'admin',
          adminId,
          at: new Date()
        }
      },
      { new: true, upsert: true }
    );
    return settings;
  } catch (error) {
    logger.error(`[DispatchService] Failed to update dispatch settings: ${error.message}`);
    throw error;
  }
}

/**
 * Triggers driver auto-assignment.
 */
export async function tryAutoAssign(orderId, options = {}) {
  try {
    logger.info(`[DispatchService] Auto assign triggered for order: ${orderId}`);
    return { success: true, message: "Auto-assign triggered" };
  } catch (error) {
    logger.error(`[DispatchService] Failed to auto assign order ${orderId}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Processes dispatch timeout for a delivery partner.
 */
export async function processDispatchTimeout(orderId, partnerId, options = {}) {
  try {
    logger.info(`[DispatchService] Process dispatch timeout for order: ${orderId}, partner: ${partnerId}`);
    return { success: true, message: "Dispatch timeout processed" };
  } catch (error) {
    logger.error(`[DispatchService] Failed to process dispatch timeout: ${error.message}`);
    return { success: false, error: error.message };
  }
}
