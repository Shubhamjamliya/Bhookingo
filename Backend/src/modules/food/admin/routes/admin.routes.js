import express from 'express';
import { AuthError } from '../../../../core/auth/errors.js';
import * as adminController from '../controllers/admin.controller.js';
import * as foodApprovalController from '../controllers/foodApproval.controller.js';
import * as addonsApprovalController from '../controllers/addonsApproval.controller.js';
import * as businessSettingsController from '../controllers/businessSettings.controller.js';
import * as feedbackExperienceController from '../controllers/feedbackExperience.controller.js';
import * as notificationBroadcastController from '../controllers/notificationBroadcast.controller.js';
import * as diningAdminController from '../../dining/controllers/diningAdmin.controller.js';
import * as orderController from '../../orders/controllers/order.controller.js';
import { getAdminPageController, upsertAdminPageController } from '../controllers/pageContent.controller.js';
import * as systemConfigController from '../controllers/systemConfig.controller.js';
import {
    importHighwaysController,
    listHighwaysController,
    getHighwayByIdController,
    deleteHighwayController,
    toggleHighwayStatusController,
    getHighwaySettingsController,
    updateHighwaySettingsController,
    createHighwayController,
    updateHighwayController
} from '../controllers/highway.controller.js';
import { upload } from '../../../../middleware/upload.js';

const router = express.Router();

// ----- Public Business Settings (No Admin Required) -----
router.get('/business-settings/public', businessSettingsController.getBusinessSettings);

const requireAdmin = (req, _res, next) => {
    const user = req.user;
    if (!user || user.role !== 'ADMIN') {
        return next(new AuthError('Admin access required'));
    }
    return next();
};

router.use(requireAdmin);

// ----- Broadcast Notifications -----
router.post('/notifications/broadcast', notificationBroadcastController.createBroadcastNotificationController);
router.get('/notifications/broadcast', notificationBroadcastController.getBroadcastNotificationsController);
router.delete('/notifications/broadcast/:id', notificationBroadcastController.deleteBroadcastNotificationController);

// ----- Customers -----
router.get('/customers', adminController.getCustomers);
router.get('/customers/:id', adminController.getCustomerById);
router.patch('/customers/:id/status', adminController.updateCustomerStatus);

// ----- Safety / Emergency Reports -----
router.get('/safety-emergency-reports', adminController.getSafetyEmergencyReports);
router.put('/safety-emergency-reports/:id/status', adminController.updateSafetyEmergencyStatus);
router.put('/safety-emergency-reports/:id/priority', adminController.updateSafetyEmergencyPriority);
router.delete('/safety-emergency-reports/:id', adminController.deleteSafetyEmergencyReport);

// ----- Support Tickets (users) -----
router.get('/support-tickets', adminController.getSupportTicketsController);
router.patch('/support-tickets/:id', adminController.updateSupportTicketController);
router.get('/global-search', adminController.globalSearch);
router.get('/restaurants/complaints', adminController.getRestaurantComplaints);
router.patch('/restaurants/complaints/:id', adminController.updateRestaurantComplaint);

// ----- Restaurants -----
router.get('/restaurants', adminController.getRestaurants);
router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/reports/restaurants', adminController.getRestaurantReport);
router.get('/reports/transactions', adminController.getTransactionReport);
router.get('/reports/tax', adminController.getTaxReport);
router.get('/reports/tax/:id', adminController.getTaxReportDetail);
router.get('/restaurants/pending', adminController.getPendingRestaurants);
router.get('/restaurants/reviews', adminController.getRestaurantReviews);
router.get('/restaurants/:id', adminController.getRestaurantById);
router.get('/restaurants/:id/analytics', adminController.getRestaurantAnalytics);
router.get('/restaurants/:id/menu', adminController.getRestaurantMenuById);
router.post('/restaurants', adminController.createRestaurant);
router.patch('/restaurants/:id', adminController.updateRestaurantById);
router.patch('/restaurants/:id/status', adminController.updateRestaurantStatus);
router.patch('/restaurants/:id/location', adminController.updateRestaurantLocation);
router.patch('/restaurants/:id/menu', adminController.updateRestaurantMenuById);
router.patch('/restaurants/:id/approve', adminController.approveRestaurant);
router.patch('/restaurants/:id/reject', adminController.rejectRestaurant);
router.delete('/restaurants/:id', adminController.deleteRestaurant);

// ----- Restaurant Commission -----
router.get('/restaurant-commissions/bootstrap', adminController.getRestaurantCommissionBootstrap);
router.get('/restaurant-commissions', adminController.getRestaurantCommissions);
router.post('/restaurant-commissions', adminController.createRestaurantCommission);
router.get('/restaurant-commissions/:id', adminController.getRestaurantCommissionById);
router.patch('/restaurant-commissions/:id', adminController.updateRestaurantCommission);
router.delete('/restaurant-commissions/:id', adminController.deleteRestaurantCommission);
router.patch('/restaurant-commissions/:id/toggle', adminController.toggleRestaurantCommissionStatus);

// ----- Categories -----
router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);
router.patch('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);
router.patch('/categories/:id/toggle', adminController.toggleCategoryStatus);
router.patch('/categories/:id/approve', adminController.approveCategory);
router.patch('/categories/:id/reject', adminController.rejectCategory);
router.patch('/categories/:id/make-global', adminController.makeCategoryGlobal);

// ----- Restaurant Add-ons Approval -----
router.get('/addons', addonsApprovalController.getRestaurantAddons);
router.patch('/addons/:id', addonsApprovalController.updateRestaurantAddon);
router.patch('/addons/:id/approve', addonsApprovalController.approveRestaurantAddon);
router.patch('/addons/:id/reject', addonsApprovalController.rejectRestaurantAddon);

// ----- Foods -----
router.get('/foods', adminController.getFoods);
router.post('/foods', adminController.createFood);
router.patch('/foods/:id', adminController.updateFood);
router.delete('/foods/:id', adminController.deleteFood);
// Food approval queue (pending items created by restaurants)
router.get('/foods/pending-approvals', foodApprovalController.getPendingFoodApprovals);
router.patch('/foods/:id/approve', foodApprovalController.approveFoodItemController);
router.patch('/foods/:id/reject', foodApprovalController.rejectFoodItemController);

// ----- Offers & Coupons -----
router.get('/offers', adminController.getAllOffers);
router.post('/offers', adminController.createAdminOffer);
router.patch('/offers/:id/cart-visibility', adminController.updateAdminOfferCartVisibility);
router.delete('/offers/:id', adminController.deleteAdminOffer);

// ----- Feedback Experience (Admin) -----
router.get('/feedback-experiences', feedbackExperienceController.getFeedbackExperiences);
router.delete('/feedback-experiences/:id', feedbackExperienceController.deleteFeedbackExperience);

// ----- Fee Settings -----
router.get('/fee-settings', adminController.getFeeSettings);
router.put('/fee-settings', adminController.createOrUpdateFeeSettings);

// ----- Referral Settings -----
router.get('/referral-settings', adminController.getReferralSettings);
router.put('/referral-settings', adminController.createOrUpdateReferralSettings);

// ----- Business Settings -----
router.get('/business-settings/public', businessSettingsController.getBusinessSettings); // Public endpoint
router.get('/business-settings', businessSettingsController.getBusinessSettings);
router.patch('/business-settings', upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 }
]), businessSettingsController.updateBusinessSettings);


// ----- Archived / Deleted Accounts -----
router.get('/archived-accounts', adminController.getArchivedAccounts);





router.get('/contact-messages', adminController.getContactMessages);

// ----- Highways (replaces Zones) -----
router.post('/highways/import', upload.single('geojson'), importHighwaysController);
router.post('/highways', createHighwayController);
router.get('/highways', listHighwaysController);
router.get('/highway-settings', getHighwaySettingsController);
router.patch('/highway-settings', updateHighwaySettingsController);
router.get('/highways/:id', getHighwayByIdController);
router.put('/highways/:id', updateHighwayController);
router.delete('/highways/:id', deleteHighwayController);
router.patch('/highways/:id/toggle', toggleHighwayStatusController);

// ----- Dining -----
router.get('/dining/categories', diningAdminController.getDiningCategories);
router.post('/dining/categories', diningAdminController.createDiningCategory);
router.patch('/dining/categories/:id', diningAdminController.updateDiningCategory);
router.delete('/dining/categories/:id', diningAdminController.deleteDiningCategory);
router.get('/dining/restaurants', diningAdminController.getDiningRestaurants);
router.patch('/dining/restaurants/:restaurantId', diningAdminController.updateDiningRestaurant);
router.get('/dining/requests', diningAdminController.listAllDiningRequests);
router.patch('/dining/requests/:id/approve', diningAdminController.approveDiningRequest);
router.patch('/dining/requests/:id/reject', diningAdminController.rejectDiningRequest);

// ----- Orders -----
router.get('/orders', orderController.listOrdersAdminController);
router.get('/orders/:orderId', orderController.getOrderByIdAdminController);
router.delete('/orders/:orderId', orderController.deleteOrderAdminController);

// ----- CMS Pages (About + legal) -----
router.get('/pages-social-media/:key', getAdminPageController);
router.put('/pages-social-media/:key', upsertAdminPageController);

router.get('/sidebar-badges', adminController.getSidebarBadges);
router.get('/notifications/fssai-expired', adminController.getExpiredFssaiNotifications);

// ----- Customization Settings -----
router.get('/customization-settings', systemConfigController.getCustomizationSettings);
router.patch('/customization-settings', systemConfigController.updateCustomizationSettings);
router.get('/customization-settings/takeaway-cod', systemConfigController.getTakeawayCodStatus);

export default router;
