import mongoose from 'mongoose';
import * as adminService from '../services/admin.service.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { validateCategoryListQuery, validateCategoryRejectDto, validateCategoryUpsertDto } from '../validators/category.validator.js';
import { validateCreateOfferDto, validateUpdateOfferCartVisibilityDto } from '../validators/offer.validator.js';
import { validateCheckCompletionsDto, validateEarningAddonHistoryActionDto, validateEarningAddonUpsertDto, validateToggleEarningAddonStatusDto } from '../validators/earningAddon.validator.js';
import { validateFeeSettingsUpsertDto } from '../validators/feeSettings.validator.js';
import { validateReferralSettingsUpsertDto } from '../validators/referralSettings.validator.js';

// ----- Customers / Users -----
export async function getCustomers(req, res, next) {
    try {
        const data = await adminService.getCustomers(req.query || {});
        res.status(200).json({ success: true, message: 'Customers fetched successfully', data });
    } catch (error) {
        next(error);
    }
}

export async function getCustomerById(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid customer id' });
        }
        const customer = await adminService.getCustomerById(id);
        if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
        res.status(200).json({ success: true, message: 'Customer fetched successfully', data: { user: customer, customer } });
    } catch (error) {
        next(error);
    }
}

export async function updateCustomerStatus(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid customer id' });
        }
        const isActive = req.body?.isActive;
        const updated = await adminService.updateCustomerStatus(id, isActive);
        if (!updated) return res.status(404).json({ success: false, message: 'Customer not found' });
        res.status(200).json({ success: true, message: 'Customer status updated successfully', data: { user: updated, customer: updated } });
    } catch (error) {
        next(error);
    }
}

// ----- Safety / Emergency Reports -----
export async function getSafetyEmergencyReports(req, res, next) {
    try {
        const data = await adminService.getSafetyEmergencyReports(req.query || {});
        res.status(200).json({ success: true, message: 'Safety emergency reports fetched successfully', data });
    } catch (error) {
        next(error);
    }
}

export async function updateSafetyEmergencyStatus(req, res, next) {
    try {
        const { id } = req.params;
        const updated = await adminService.updateSafetyEmergencyStatus(id, req.body?.status);
        if (!updated) return res.status(404).json({ success: false, message: 'Report not found' });
        res.status(200).json({ success: true, message: 'Status updated successfully', data: { report: updated } });
    } catch (error) {
        next(error);
    }
}

export async function updateSafetyEmergencyPriority(req, res, next) {
    try {
        const { id } = req.params;
        const updated = await adminService.updateSafetyEmergencyPriority(id, req.body?.priority);
        if (!updated) return res.status(404).json({ success: false, message: 'Report not found' });
        res.status(200).json({ success: true, message: 'Priority updated successfully', data: { report: updated } });
    } catch (error) {
        next(error);
    }
}

export async function deleteSafetyEmergencyReport(req, res, next) {
    try {
        const { id } = req.params;
        const deleted = await adminService.deleteSafetyEmergencyReport(id);
        if (!deleted) return res.status(404).json({ success: false, message: 'Report not found' });
        res.status(200).json({ success: true, message: 'Safety emergency report deleted successfully', data: { report: deleted } });
    } catch (error) {
        next(error);
    }
}

export async function updateRestaurantComplaint(req, res, next) {
    try {
        const { id } = req.params;
        const { status, adminResponse } = req.body;
        const updated = await adminService.updateRestaurantComplaint(id, { status, adminResponse });
        res.status(200).json({ success: true, message: 'Complaint updated successfully', data: { complaint: updated } });
    } catch (error) {
        next(error);
    }
}

// ----- Restaurants -----
export async function getRestaurantComplaints(req, res, next) {
    try {
        const data = await adminService.getRestaurantComplaints(req.query || {});
        res.status(200).json({ success: true, message: 'Restaurant complaints fetched successfully', data });
    } catch (error) {
        next(error);
    }
}

export async function globalSearch(req, res, next) {
    try {
        const { query } = req.query;
        const data = await adminService.globalSearch(query);
        res.status(200).json({
            success: true,
            message: 'Global search results fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function getRestaurants(req, res, next) {
    try {
        const data = await adminService.getRestaurants(req.query);
        res.status(200).json({
            success: true,
            message: 'Restaurants fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function getRestaurantReport(req, res, next) {
    try {
        const data = await adminService.getRestaurantReport(req.query || {});
        res.status(200).json({
            success: true,
            message: 'Restaurant report fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function getDashboardStats(req, res, next) {
    try {
        const data = await adminService.getDashboardStats(req.query || {});
        res.status(200).json({
            success: true,
            message: 'Dashboard stats fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function getArchivedAccounts(req, res, next) {
    try {
        const data = await adminService.getArchivedAccounts();
        res.status(200).json({
            success: true,
            message: 'Archived accounts fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function getTransactionReport(req, res, next) {
    try {
        const data = await adminService.getTransactionReport(req.query || {});
        res.status(200).json({
            success: true,
            message: 'Transaction report fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function getTaxReport(req, res, next) {
    try {
        const data = await adminService.getTaxReport(req.query || {});
        res.status(200).json({
            success: true,
            message: 'Tax report fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function getTaxReportDetail(req, res, next) {
    try {
        const { id } = req.params;
        const data = await adminService.getTaxReportDetail(id, req.query || {});
        res.status(200).json({
            success: true,
            message: 'Tax report detail fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function getRestaurantReviews(req, res, next) {
    try {
        const data = await adminService.getRestaurantReviews(req.query);
        res.status(200).json({
            success: true,
            message: 'Restaurant reviews fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function getRestaurantById(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid restaurant id' });
        }
        const restaurant = await adminService.getRestaurantById(id);
        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }
        res.status(200).json({
            success: true,
            message: 'Restaurant fetched successfully',
            data: restaurant
        });
    } catch (error) {
        next(error);
    }
}

export async function getRestaurantAnalytics(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid restaurant id' });
        }
        const data = await adminService.getRestaurantAnalytics(id);
        if (!data) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }
        res.status(200).json({
            success: true,
            message: 'Restaurant analytics fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function getRestaurantMenuById(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid restaurant id' });
        }
        const menu = await adminService.getRestaurantMenuById(id);
        if (!menu) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }
        res.status(200).json({ success: true, message: 'Menu fetched successfully', data: { menu } });
    } catch (error) {
        next(error);
    }
}



export async function updateRestaurantMenuById(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid restaurant id' });
        }
        const menu = await adminService.updateRestaurantMenuById(id, req.body || {});
        if (!menu) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }
        res.status(200).json({ success: true, message: 'Menu updated successfully', data: { menu } });
    } catch (error) {
        next(error);
    }
}

export async function updateRestaurantById(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid restaurant id' });
        }
        const updated = await adminService.updateRestaurantById(id, req.body || {});
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }
        res.status(200).json({ success: true, message: 'Restaurant updated successfully', data: { restaurant: updated } });
    } catch (error) {
        next(error);
    }
}

export async function updateRestaurantStatus(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid restaurant id' });
        }
        const updated = await adminService.updateRestaurantStatus(id, req.body || {});
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }
        res.status(200).json({ success: true, message: 'Restaurant status updated successfully', data: { restaurant: updated } });
    } catch (error) {
        next(error);
    }
}

export async function updateRestaurantLocation(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid restaurant id' });
        }
        const updated = await adminService.updateRestaurantLocation(id, req.body || {});
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Restaurant not found' });
        }
        res.status(200).json({ success: true, message: 'Restaurant location updated successfully', data: { restaurant: updated } });
    } catch (error) {
        next(error);
    }
}

// ----- Foods -----
export async function getFoods(req, res, next) {
    try {
        const data = await adminService.getFoods(req.query || {});
        res.status(200).json({ success: true, message: 'Foods fetched successfully', data });
    } catch (error) {
        next(error);
    }
}

export async function createFood(req, res, next) {
    try {
        const created = await adminService.createFood(req.body || {});
        res.status(201).json({ success: true, message: 'Food created successfully', data: { food: created } });
    } catch (error) {
        next(error);
    }
}

export async function updateFood(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid food id' });
        }
        const updated = await adminService.updateFood(id, req.body || {});
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Food not found' });
        }
        res.status(200).json({ success: true, message: 'Food updated successfully', data: { food: updated } });
    } catch (error) {
        next(error);
    }
}

export async function deleteFood(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid food id' });
        }
        const result = await adminService.deleteFood(id);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Food not found' });
        }
        res.status(200).json({ success: true, message: 'Food deleted successfully', data: result });
    } catch (error) {
        next(error);
    }
}

// ----- Categories -----
export async function getCategories(req, res, next) {
    try {
        const query = validateCategoryListQuery(req.query || {});
        const data = await adminService.getCategories(query);
        res.status(200).json({ success: true, message: 'Categories fetched successfully', data });
    } catch (error) {
        next(error);
    }
}

export async function createCategory(req, res, next) {
    try {
        const body = validateCategoryUpsertDto(req.body || {});
        const created = await adminService.createCategory(body);
        res.status(201).json({ success: true, message: 'Category created successfully', data: { category: created } });
    } catch (error) {
        next(error);
    }
}

export async function updateCategory(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid category id' });
        }
        const body = validateCategoryUpsertDto(req.body || {});
        const updated = await adminService.updateCategory(id, body);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.status(200).json({ success: true, message: 'Category updated successfully', data: { category: updated } });
    } catch (error) {
        next(error);
    }
}

export async function deleteCategory(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid category id' });
        }
        const result = await adminService.deleteCategory(id);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.status(200).json({ success: true, message: 'Category deleted successfully', data: result });
    } catch (error) {
        next(error);
    }
}

export async function toggleCategoryStatus(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid category id' });
        }
        const updated = await adminService.toggleCategoryStatus(id);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.status(200).json({ success: true, message: 'Category status updated successfully', data: { category: updated } });
    } catch (error) {
        next(error);
    }
}

export async function approveCategory(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid category id' });
        }
        const updated = await adminService.approveCategory(id);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Category not found or already approved' });
        }
        res.status(200).json({ success: true, message: 'Category approved successfully', data: { category: updated } });
    } catch (error) {
        next(error);
    }
}

export async function rejectCategory(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid category id' });
        }
        const body = validateCategoryRejectDto(req.body || {});
        const updated = await adminService.rejectCategory(id, body.reason);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.status(200).json({ success: true, message: 'Category rejected successfully', data: { category: updated } });
    } catch (error) {
        next(error);
    }
}

export async function makeCategoryGlobal(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid category id' });
        }
        const updated = await adminService.makeCategoryGlobal(id);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.status(200).json({ success: true, message: 'Category is now global', data: { category: updated } });
    } catch (error) {
        next(error);
    }
}

// ----- Offers & Coupons -----
export async function getAllOffers(req, res, next) {
    try {
        const data = await adminService.getAllOffers(req.query || {});
        res.status(200).json({ success: true, message: 'Offers fetched successfully', data });
    } catch (error) {
        next(error);
    }
}

export async function createAdminOffer(req, res, next) {
    try {
        const body = validateCreateOfferDto(req.body || {});
        const created = await adminService.createAdminOffer(body);
        res.status(201).json({ success: true, message: 'Offer created successfully', data: { offer: created } });
    } catch (error) {
        next(error);
    }
}

export async function updateAdminOfferCartVisibility(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid offer id' });
        }
        const body = validateUpdateOfferCartVisibilityDto(req.body || {});
        const updated = await adminService.updateAdminOfferCartVisibility(id, body.itemId, body.showInCart);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Offer not found' });
        }
        res.status(200).json({ success: true, message: 'Offer updated successfully', data: { offer: updated } });
    } catch (error) {
        next(error);
    }
}

export async function deleteAdminOffer(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid offer id' });
        }
        const result = await adminService.deleteAdminOffer(id);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Offer not found' });
        }
        res.status(200).json({ success: true, message: 'Offer deleted successfully', data: result });
    } catch (error) {
        next(error);
    }
}

export async function getSupportTicketsController(req, res, next) {
    try {
        const data = await adminService.getSupportTickets(req.query || {});
        res.status(200).json({ success: true, message: 'Support tickets fetched successfully', data });
    } catch (error) {
        next(error);
    }
}

export async function updateSupportTicketController(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid ticket id' });
        }
        const updated = await adminService.updateSupportTicket(id, req.body || {});
        if (!updated) return res.status(404).json({ success: false, message: 'Ticket not found' });
        res.status(200).json({ success: true, message: 'Support ticket updated successfully', data: { ticket: updated } });
    } catch (error) {
        next(error);
    }
}

export async function getPendingRestaurants(req, res, next) {
    try {
        const pending = await adminService.getPendingRestaurants();
        res.status(200).json({
            success: true,
            message: 'Pending restaurants fetched successfully',
            data: pending
        });
    } catch (error) {
        next(error);
    }
}







// ----- Earning Addon (admin) -----












export async function creditEarningToWallet(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid history id' });
        }
        const { notes } = validateEarningAddonHistoryActionDto(req.body || {});
        const updated = await adminService.creditEarningAddonHistory(id, notes);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'History record not found' });
        }
        res.status(200).json({ success: true, message: 'Earning credited successfully', data: { history: updated } });
    } catch (error) {
        next(error);
    }
}





// ----- Restaurant Commission (admin) -----
export async function getRestaurantCommissions(req, res, next) {
    try {
        const data = await adminService.getRestaurantCommissions();
        res.status(200).json({ success: true, message: 'Restaurant commissions fetched successfully', data });
    } catch (error) {
        next(error);
    }
}

export async function getRestaurantCommissionBootstrap(req, res, next) {
    try {
        const data = await adminService.getRestaurantCommissionBootstrap();
        res.status(200).json({ success: true, message: 'Restaurant commission bootstrap fetched successfully', data });
    } catch (error) {
        next(error);
    }
}

export async function getRestaurantCommissionById(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid commission id' });
        }
        const commission = await adminService.getRestaurantCommissionById(id);
        if (!commission) {
            return res.status(404).json({ success: false, message: 'Commission not found' });
        }
        res.status(200).json({ success: true, message: 'Commission fetched successfully', data: { commission } });
    } catch (error) {
        next(error);
    }
}

export async function createRestaurantCommission(req, res, next) {
    try {
        const body = validateRestaurantCommissionUpsertDto(req.body || {});
        const created = await adminService.createRestaurantCommission(body);
        res.status(201).json({ success: true, message: 'Commission created successfully', data: { commission: created } });
    } catch (error) {
        next(error);
    }
}

export async function updateRestaurantCommission(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid commission id' });
        }
        const body = validateRestaurantCommissionUpsertDto(req.body || {});
        const updated = await adminService.updateRestaurantCommission(id, body);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Commission not found' });
        }
        res.status(200).json({ success: true, message: 'Commission updated successfully', data: { commission: updated } });
    } catch (error) {
        next(error);
    }
}

export async function deleteRestaurantCommission(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid commission id' });
        }
        const result = await adminService.deleteRestaurantCommission(id);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Commission not found' });
        }
        res.status(200).json({ success: true, message: 'Commission deleted successfully', data: result });
    } catch (error) {
        next(error);
    }
}

export async function toggleRestaurantCommissionStatus(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid commission id' });
        }
        const updated = await adminService.toggleRestaurantCommissionStatus(id);
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Commission not found' });
        }
        res.status(200).json({ success: true, message: 'Status updated successfully', data: { commission: updated } });
    } catch (error) {
        next(error);
    }
}











// ----- Fee Settings (admin) -----
export async function getFeeSettings(req, res, next) {
    try {
        const data = await adminService.getFeeSettings();
        res.status(200).json({ success: true, message: 'Fee settings fetched successfully', data });
    } catch (error) {
        next(error);
    }
}

export async function createOrUpdateFeeSettings(req, res, next) {
    try {
        const body = validateFeeSettingsUpsertDto(req.body || {});
        const feeSettings = await adminService.upsertFeeSettings(body);
        res.status(200).json({ success: true, message: 'Fee settings saved successfully', data: { feeSettings } });
    } catch (error) {
        next(error);
    }
}

// ----- Referral Settings (admin) -----
export async function getReferralSettings(req, res, next) {
    try {
        const data = await adminService.getReferralSettings();
        res.status(200).json({ success: true, message: 'Referral settings fetched successfully', data });
    } catch (error) {
        next(error);
    }
}

export async function createOrUpdateReferralSettings(req, res, next) {
    try {
        const body = validateReferralSettingsUpsertDto(req.body || {});
        const referralSettings = await adminService.upsertReferralSettings(body);
        res.status(200).json({ success: true, message: 'Referral settings saved successfully', data: { referralSettings } });
    } catch (error) {
        next(error);
    }
}





export async function getEmergencyHelp(req, res, next) {
    try {
        res.status(200).json({ success: true, message: 'Emergency help fetched successfully', data });
    } catch (error) {
        next(error);
    }
}

export async function createOrUpdateEmergencyHelp(req, res, next) {
    try {
        res.status(200).json({ success: true, message: 'Emergency help saved successfully', data });
    } catch (error) {
        next(error);
    }
}

export async function approveRestaurant(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid restaurant id'
            });
        }
        const restaurant = await adminService.approveRestaurant(id);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Restaurant approved successfully',
            data: restaurant
        });
    } catch (error) {
        next(error);
    }
}

export async function createRestaurant(req, res, next) {
    try {
        const restaurant = await adminService.createRestaurantByAdmin(req.body || {});
        res.status(201).json({
            success: true,
            message: 'Restaurant created successfully',
            data: restaurant
        });
    } catch (error) {
        if (error.highwayCheck === false) {
            return res.status(400).json({
                success: false,
                message: 'Restaurant location is not within the allowed National Highway range.',
                highwayCheck: false,
                nearestHighway: error.nearestHighway,
                distance: error.distance,
                status: 'OUT_OF_SERVICE'
            });
        }
        next(error);
    }
}

export async function rejectRestaurant(req, res, next) {
    try {
        const { id } = req.params;
        const { reason } = req.body || {};
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid restaurant id'
            });
        }
        const restaurant = await adminService.rejectRestaurant(id, reason);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Restaurant rejected successfully',
            data: restaurant
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteRestaurant(req, res, next) {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid restaurant id'
            });
        }
        const result = await adminService.deleteRestaurant(id);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Restaurant and all associated data deleted successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
}




// ----- Support tickets -----
export async function getSupportTicketStats(req, res, next) {
    try {
        const data = await adminService.getSupportTicketStats();
        res.status(200).json({
            success: true,
            message: 'Support ticket stats fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function getSupportTickets(req, res, next) {
    try {
        res.status(200).json({
            success: true,
            message: 'Support tickets fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function updateSupportTicket(req, res, next) {
    try {
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Support ticket not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Support ticket updated successfully',
            data: ticket
        });
    } catch (error) {
        next(error);
    }
}





export async function getContactMessages(req, res, next) {
    try {
        const data = await adminService.getContactMessages(req.query);
        res.status(200).json({
            success: true,
            message: 'Contact messages fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}







// ----- Zones -----
export async function getZones(req, res, next) {
    try {
        const data = await adminService.getZones(req.query);
        res.status(200).json({
            success: true,
            message: 'Zones fetched successfully',
            data
        });
    } catch (error) {
        next(error);
    }
}

export async function getZoneById(req, res, next) {
    try {
        const zone = await adminService.getZoneById(req.params.id);
        if (!zone) {
            return res.status(404).json({
                success: false,
                message: 'Zone not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Zone fetched successfully',
            data: { zone }
        });
    } catch (error) {
        next(error);
    }
}

export async function createZone(req, res, next) {
    try {
        const result = await adminService.createZone(req.body || {});
        if (result.error) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }
        res.status(201).json({
            success: true,
            message: 'Zone created successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
}

export async function updateZone(req, res, next) {
    try {
        const result = await adminService.updateZone(req.params.id, req.body || {});
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Zone not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Zone updated successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteZone(req, res, next) {
    try {
        const result = await adminService.deleteZone(req.params.id);
        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Zone not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Zone deleted successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
}

export async function processRefund(req, res, next) {
    try {
        const { orderId } = req.params;
        const { refundAmount } = req.body;
        if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: 'Invalid order id' });
        }

        // This is a stub for the actual refund logic.
        // We will assume adminService.processRefund exists and handles the refund.
        const updated = await adminService.processRefund(orderId, refundAmount);

        // Let's add the push notification here if we have access to the user ID
        // First we need to get the order to find the user ID
        const order = await mongoose.model('FoodOrder').findById(orderId).lean();

        if (order && order.userId) {
            const { notifyOwnersSafely } = await import('../../notifications/firebase.service.js');
            await notifyOwnersSafely(
                [{ ownerType: 'USER', ownerId: order.userId }],
                {
                    title: 'Refund Processed! 💸',
                    body: `Your refund of ₹${refundAmount || order.totalAmount || order.total || 0} for Order #${order.orderId} has been processed successfully.`,
                    image: 'https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png',
                    data: {
                        type: 'refund_processed',
                        orderId: String(order.orderId),
                        orderMongoId: String(order._id)
                    }
                }
            );
        }

        res.status(200).json({ success: true, message: 'Refund processed successfully', data: updated });
    } catch (error) {
        next(error);
    }
}










export async function getCashLimitSettlements(req, res, next) {
    try {
        const data = await adminService.getCashLimitSettlements(req.query || {});
        res.status(200).json({ success: true, message: 'Cash limit settlements fetched successfully', data });
    } catch (error) {
        next(error);
    }
}

export async function getSidebarBadges(req, res, next) {
    try {
        const counts = await adminService.getSidebarBadges();
        res.status(200).json({ success: true, counts });
    } catch (error) {
        next(error);
    }
}

export async function getExpiredFssaiNotifications(req, res, next) {
    try {
        const { listExpiredFssaiRestaurants } = await import('../../restaurant/services/fssaiExpiry.service.js');
        const items = await listExpiredFssaiRestaurants();
        res.status(200).json({
            success: true,
            message: 'Expired FSSAI notifications fetched successfully',
            data: { items }
        });
    } catch (error) {
        next(error);
    }
}

// ----- Withdrawals (admin) -----

export async function getWithdrawalRequests(req, res, next) {
    try {
        const { status, search, page, limit } = req.query;
        const requests = await adminService.getWithdrawalRequests({ status, search, page, limit });
        res.status(200).json({ success: true, data: { requests } });
    } catch (error) {
        next(error);
    }
}

export async function approveWithdrawalRequest(req, res, next) {
    try {
        const withdrawal = await adminService.approveWithdrawalRequest(req.params.id);
        res.status(200).json({ success: true, message: 'Withdrawal approved successfully', data: withdrawal });
    } catch (error) {
        next(error);
    }
}

export async function rejectWithdrawalRequest(req, res, next) {
    try {
        const { rejectionReason } = req.body;
        const withdrawal = await adminService.rejectWithdrawalRequest(req.params.id, rejectionReason);
        res.status(200).json({ success: true, message: 'Withdrawal rejected successfully', data: withdrawal });
    } catch (error) {
        next(error);
    }
}

export async function listSubAdmins(req, res, next) {
    try {
        const { search, status, roleTitle, sortBy, sortOrder, page, limit } = req.query;
        const result = await adminService.listSubAdmins({ search, status, roleTitle, sortBy, sortOrder, page, limit });
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}

export async function getSubAdminById(req, res, next) {
    try {
        const subAdmin = await adminService.getSubAdminById(req.params.id);
        if (!subAdmin) {
            return res.status(404).json({ success: false, message: 'Sub-Admin not found' });
        }
        res.status(200).json({ success: true, data: { subAdmin } });
    } catch (error) {
        next(error);
    }
}

export async function createSubAdmin(req, res, next) {
    try {
        const creator = req.user;
        const creatorDoc = await mongoose.model('FoodAdmin').findById(creator.userId).lean();
        if (!creatorDoc) {
            return res.status(401).json({ success: false, message: 'Creator not found' });
        }
        const clientIp = req.ip || req.connection.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';

        const result = await adminService.createSubAdmin(req.body, creatorDoc, clientIp, userAgent);
        res.status(201).json({ success: true, message: 'Sub-Admin created successfully', data: result });
    } catch (error) {
        next(error);
    }
}

export async function updateSubAdmin(req, res, next) {
    try {
        const updater = req.user;
        const updaterDoc = await mongoose.model('FoodAdmin').findById(updater.userId).lean();
        if (!updaterDoc) {
            return res.status(401).json({ success: false, message: 'Updater not found' });
        }
        const clientIp = req.ip || req.connection.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';

        const result = await adminService.updateSubAdmin(req.params.id, req.body, updaterDoc, clientIp, userAgent);
        res.status(200).json({ success: true, message: 'Sub-Admin updated successfully', data: result });
    } catch (error) {
        next(error);
    }
}

export async function deleteSubAdmin(req, res, next) {
    try {
        const deleter = req.user;
        const deleterDoc = await mongoose.model('FoodAdmin').findById(deleter.userId).lean();
        if (!deleterDoc) {
            return res.status(401).json({ success: false, message: 'Deleter not found' });
        }
        const clientIp = req.ip || req.connection.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';

        const result = await adminService.deleteSubAdmin(req.params.id, deleterDoc, clientIp, userAgent);
        res.status(200).json({ success: true, message: 'Sub-Admin soft deleted successfully', data: result });
    } catch (error) {
        next(error);
    }
}

export async function resetSubAdminPassword(req, res, next) {
    try {
        const updater = req.user;
        const updaterDoc = await mongoose.model('FoodAdmin').findById(updater.userId).lean();
        if (!updaterDoc) {
            return res.status(401).json({ success: false, message: 'Updater not found' });
        }
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ success: false, message: 'New password is required' });
        }
        const clientIp = req.ip || req.connection.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';

        const result = await adminService.resetSubAdminPassword(req.params.id, password, updaterDoc, clientIp, userAgent);
        res.status(200).json({ success: true, message: 'Password reset successfully', data: result });
    } catch (error) {
        next(error);
    }
}

export async function listAuditLogs(req, res, next) {
    try {
        const result = await adminService.listAuditLogs(req.query);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}

export async function getRecoverySettings(req, res, next) {
    try {
        const adminId = req.user.userId;
        const result = await adminService.getRecoverySettings(adminId);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}

export async function requestRecoveryVerify(req, res, next) {
    try {
        const adminId = req.user.userId;
        const { type, value } = req.body;
        const result = await adminService.requestRecoveryVerify(adminId, type, value);
        res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        next(error);
    }
}

export async function confirmRecoveryVerify(req, res, next) {
    try {
        const adminId = req.user.userId;
        // Find admin user document to retrieve their email
        const adminDoc = await mongoose.model('FoodAdmin').findById(adminId).lean();
        const adminEmail = adminDoc ? adminDoc.email : '';
        const { type, value, otp } = req.body;
        const clientIp = req.ip || req.connection.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';

        const result = await adminService.confirmRecoveryVerify(adminId, adminEmail, type, value, otp, clientIp, userAgent);
        res.status(200).json({ success: true, message: 'Recovery details verified and updated successfully' });
    } catch (error) {
        next(error);
    }
}

export async function resolveMapsLink(req, res, next) {
    try {
        const { url } = req.body;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ success: false, message: 'URL is required' });
        }

        let currentUrl = url.trim();
        if (!/^https?:\/\//i.test(currentUrl)) {
            currentUrl = 'https://' + currentUrl;
        }

        const allowedHosts = [
            'google.com',
            'www.google.com',
            'maps.google.com',
            'maps.app.goo.gl',
            'goo.gl',
            'google.co.in',
            'www.google.co.in'
        ];

        const isAllowedHost = (urlStr) => {
            try {
                const u = new URL(urlStr);
                const host = u.hostname.toLowerCase();
                return allowedHosts.some(allowed => host === allowed || host.endsWith('.' + allowed));
            } catch (e) {
                return false;
            }
        };

        if (!isAllowedHost(currentUrl)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Google Maps link. Please enter a valid Google Maps URL.'
            });
        }

        let redirectsCount = 0;
        const maxRedirects = 5;

        while (redirectsCount < maxRedirects) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            try {
                const response = await fetch(currentUrl, {
                    method: 'GET',
                    redirect: 'manual',
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                });

                clearTimeout(timeout);

                if (response.status >= 300 && response.status < 400) {
                    const location = response.headers.get('location');
                    if (!location) {
                        break;
                    }
                    currentUrl = new URL(location, currentUrl).toString();
                    redirectsCount++;

                    if (!isAllowedHost(currentUrl)) {
                        return res.status(400).json({
                            success: false,
                            message: 'URL redirected to an unauthorized external domain.'
                        });
                    }
                } else {
                    break;
                }
            } catch (err) {
                clearTimeout(timeout);
                if (err.name === 'AbortError') {
                    return res.status(408).json({
                        success: false,
                        message: 'Request timed out while resolving the Google Maps link.'
                    });
                }
                throw err;
            }
        }

        res.status(200).json({
            success: true,
            url: currentUrl
        });
    } catch (error) {
        next(error);
    }
}

