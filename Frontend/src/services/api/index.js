/**
 * API layer - auth connected to new backend; rest stubbed for UI compatibility.
 */

import apiClient from "./axios.js";
import { API_ENDPOINTS } from "./config.js";
import * as authService from "./auth.js";

const stub = () =>
  Promise.resolve({
    data: { success: false, message: "Backend not connected", data: null },
    status: 200,
    statusText: "OK",
    headers: {},
    config: {},
  });

/** Search API - unified search for user app */
export const searchAPI = {
  unifiedSearch: (params = {}) =>
    apiClient.get("/food/search/unified", { params }),
  getAdminCategories: (params = {}) =>
    apiClient.get("/food/search/categories/admin", { params }),
};

const createStubAPI = () =>
  new Proxy(
    {},
    {
      get(_, prop) {
        return () => stub();
      },
    },
  );

export default apiClient;
export { API_ENDPOINTS };

// Stub for non-auth endpoints so we don't hit backend for unimplemented routes (avoids 404s and extra calls).
// Auth is done via authAPI/authService which use apiClient directly.
const emptyDataStub = () =>
  Promise.resolve({
    data: { success: false, data: null },
    status: 200,
    statusText: "OK",
    headers: {},
    config: {},
  });

export const api = {
  get: (_url, _config) => emptyDataStub(),
  post: (_url, _data, _config) => emptyDataStub(),
  put: (_url, _data, _config) => emptyDataStub(),
  patch: (_url, _data, _config) => emptyDataStub(),
  delete: (_url, _config) => emptyDataStub(),
};

/** Single in-flight + short cache for user /auth/me - avoids duplicate calls. */
let userMeInFlight = null;
let userMeCached = null;
let userMeCacheTime = 0;
const USER_ME_CACHE_MS = 3000;

const getUserMeOnce = () => {
  const now = Date.now();
  if (userMeCached && now - userMeCacheTime < USER_ME_CACHE_MS) {
    return Promise.resolve(userMeCached);
  }
  if (!userMeInFlight) {
    userMeInFlight = authService
      .getMe("user")
      .then((res) => {
        userMeCached = res;
        userMeCacheTime = Date.now();
        return res;
      })
      .finally(() => {
        userMeInFlight = null;
      });
  }
  return userMeInFlight;
};

/** Auth API - user OTP + admin login via new backend */
export const authAPI = {
  sendOTP: (phone, _purpose = "login", _email = null) => {
    if (!phone) return Promise.reject(new Error("Phone is required"));
    return authService.requestUserOtp(phone);
  },
  verifyOTP: (
    phone,
    otp,
    _purpose,
    _name,
    _email,
    _role,
    _password,
    _referralCode,
    fcmToken = null,
    platform = "web",
    _token = null,
    confirmAction = null,
  ) => {
    if (!phone || !otp)
      return Promise.reject(new Error("Phone and OTP are required"));
    return authService.verifyUserOtp(
      phone,
      otp,
      _referralCode,
      _name,
      fcmToken,
      platform,
      confirmAction,
    );
  },
  googleLogin: (payload) => authService.googleLogin(payload),
  getCurrentUser: () => getUserMeOnce(),
  refreshToken: (token) => authService.refreshToken(token),
  logout: (refreshToken, fcmToken = null, platform = "web") => {
    const token =
      refreshToken ||
      (typeof localStorage !== "undefined"
        ? localStorage.getItem("user_refreshToken")
        : null);
    return authService.logout(token, fcmToken, platform);
  },
  logoutFromAllDevices: (module = "user") => authService.logoutFromAllDevices(module),
  deleteAccount: (module = "user") => authService.deleteAccount(module),
  checkBalance: (module = "user") => authService.checkAccountBalance(module),
};

export const supportAPI = {
  createTicket: (body) =>
    apiClient.post("/food/user/support/ticket", body ?? {}, {
      contextModule: "user",
    }),
  getMyTickets: (params = {}) =>
    apiClient.get("/food/user/support/my-tickets", {
      params,
      contextModule: "user",
    }),
  getSupportTicketsAdmin: (params = {}) =>
    apiClient.get("/food/admin/support-tickets", {
      params,
      contextModule: "admin",
    }),
  updateSupportTicketAdmin: (id, body = {}) =>
    apiClient.patch(`/food/admin/support-tickets/${String(id)}`, body ?? {}, {
      contextModule: "admin",
    }),
};

export const notificationAPI = {
  getInbox: (params = {}, config = {}) =>
    apiClient.get("/food/notifications/inbox", {
      params,
      ...config,
    }),
  markAsRead: (id, config = {}) =>
    apiClient.patch(`/food/notifications/${String(id)}/read`, {}, config),
  dismiss: (id, config = {}) =>
    apiClient.delete(`/food/notifications/${String(id)}`, config),
  dismissAll: (config = {}) =>
    apiClient.delete("/food/notifications/inbox/all", config),
};

/** Admin API - new backend only (GET /auth/me, PATCH /auth/admin/profile, POST /auth/admin/change-password) */
export const adminAPI = {
  listSubAdmins: (params) =>
    apiClient.get("/food/admin/sub-admins", { params, contextModule: "admin" }),
  getSubAdminById: (id) =>
    apiClient.get(`/food/admin/sub-admins/${id}`, { contextModule: "admin" }),
  createSubAdmin: (body) =>
    apiClient.post("/food/admin/sub-admins", body, { contextModule: "admin" }),
  updateSubAdmin: (id, body) =>
    apiClient.patch(`/food/admin/sub-admins/${id}`, body, { contextModule: "admin" }),
  deleteSubAdmin: (id) =>
    apiClient.delete(`/food/admin/sub-admins/${id}`, { contextModule: "admin" }),
  resetSubAdminPassword: (id, password) =>
    apiClient.post(`/food/admin/sub-admins/${id}/reset-password`, { password }, { contextModule: "admin" }),
  listSubAdminAuditLogs: (params) =>
    apiClient.get("/food/admin/sub-admins/audit-logs", { params, contextModule: "admin" }),
  getSidebarBadges: () =>
    apiClient.get("/food/admin/sidebar-badges", { contextModule: "admin" }),
  getDrivingModeSettings: () =>
    apiClient.get("/food/admin/driving-mode/settings", { contextModule: "admin" }),
  updateDrivingModeSettings: (body) =>
    apiClient.patch("/food/admin/driving-mode/settings", body, { contextModule: "admin" }),
  login: (email, password) => authService.adminLogin(email, password),
  requestForgotPasswordOtp: (email, phone) =>
    apiClient.post("/auth/admin/forgot-password/request-otp", {
      email: String(email || "").trim().toLowerCase(),
      phone: String(phone || "").trim()
    }),
  verifyForgotPasswordOtp: (email, otp) =>
    apiClient.post("/auth/admin/forgot-password/verify-otp", {
      email: String(email || "").trim().toLowerCase(),
      otp: String(otp || "").replace(/\D/g, "")
    }),
  resetPasswordWithOtp: (resetToken, newPassword) =>
    apiClient.post("/auth/admin/forgot-password/reset", {
      resetToken: String(resetToken || ""),
      newPassword: String(newPassword || "")
    }),
  getRecoverySettings: () =>
    apiClient.get("/food/admin/recovery-settings", { contextModule: "admin" }),
  requestRecoveryVerify: (type, value) =>
    apiClient.post("/food/admin/recovery-settings/request-verify", { type, value }, { contextModule: "admin" }),
  confirmRecoveryVerify: (type, value, otp) =>
    apiClient.post("/food/admin/recovery-settings/confirm-verify", { type, value, otp }, { contextModule: "admin" }),
  /** Raw /auth/me for admin (e.g. navbar). For Profile & Settings use getAdminProfile. */
  getCurrentAdmin: () => authService.getMe("admin"),
  /** Single API for admin profile: GET /auth/me, returns { data: { admin } }. Use on Profile & Settings only. */
  getAdminProfile: () =>
    authService.getMe("admin").then((res) => {
      const user =
        res?.data?.data?.user ??
        res?.data?.user ??
        res?.data?.data ??
        res?.data;
      return { data: { data: { admin: user }, admin: user } };
    }),
  /** PATCH /auth/admin/profile. Body: name?, phone?, profileImage? */
  updateAdminProfile: (body) =>
    apiClient.patch("/auth/admin/profile", body ?? {}, {
      contextModule: "admin",
    }),
  /** POST /auth/admin/change-password */
  changePassword: (currentPassword, newPassword) =>
    apiClient.post(
      "/auth/admin/change-password",
      { currentPassword, newPassword },
      { contextModule: "admin" },
    ),
  logout: (refreshToken) => {
    const token =
      refreshToken ||
      (typeof localStorage !== "undefined"
        ? localStorage.getItem("admin_refreshToken")
        : null);
    const fcmToken = typeof localStorage !== "undefined" ? localStorage.getItem("fcm_web_registered_token_admin") : null;
    return authService.logout(token, fcmToken, "web");
  },
  // Restaurant approvals and join requests
  getPendingRestaurants: () =>
    apiClient.get("/food/admin/restaurants/pending", {
      contextModule: "admin",
    }),
  /** List restaurant complaints (admin). */
  getRestaurantComplaints: (params = {}) =>
    apiClient.get("/food/admin/restaurants/complaints", {
      params,
      contextModule: "admin",
    }),
  updateRestaurantComplaint: (id, body) =>
    apiClient.patch(`/food/admin/restaurants/complaints/${id}`, body, {
      contextModule: "admin",
    }),
  /** Global universal search (admin). */
  globalSearch: (query) =>
    apiClient.get("/food/admin/global-search", {
      params: { query },
      contextModule: "admin",
    }),
  approveRestaurant: (id) =>
    apiClient.patch(
      `/food/admin/restaurants/${id}/approve`,
      {},
      {
        contextModule: "admin",
      },
    ),
  rejectRestaurant: (id, reason) =>
    apiClient.patch(
      `/food/admin/restaurants/${id}/reject`,
      { reason },
      { contextModule: "admin" },
    ),



  getContactMessages: (params = {}) =>
    apiClient.get("/food/admin/contact-messages", {
      params,
      contextModule: "admin",
    }),
  getArchivedAccounts: () =>
    apiClient.get("/food/admin/archived-accounts", {
      contextModule: "admin",
    }),
  /** Dashboard summary stats (admin home) */
  getDashboardStats: (params = {}) =>
    apiClient.get("/food/admin/dashboard-stats", {
      params,
      contextModule: "admin",
    }),
  /** List restaurant withdrawal requests (admin). */
  getWithdrawalRequests: (params = {}) =>
    apiClient.get("/food/admin/withdrawals", {
      params,
      contextModule: "admin",
    }),
  /** Approve a withdrawal request. */
  approveWithdrawalRequest: (id) =>
    apiClient.patch(`/food/admin/withdrawals/${id}/approve`, {}, {
      contextModule: "admin",
    }),
  /** Reject a withdrawal request. */
  rejectWithdrawalRequest: (id, rejectionReason) =>
    apiClient.patch(`/food/admin/withdrawals/${id}/reject`, { rejectionReason }, {
      contextModule: "admin",
    }),



  getExpiredFssaiNotifications: (params = {}) =>
    apiClient.get("/food/admin/notifications/fssai-expired", {
      params,
      contextModule: "admin",
    }),
  // Customization Settings
  getCustomizationSettings: () =>
    apiClient.get("/food/admin/customization-settings", { contextModule: "admin" }),
  updateCustomizationSettings: (data) =>
    apiClient.patch("/food/admin/customization-settings", data, { contextModule: "admin" }),
  getTakeawayCodStatus: () =>
    apiClient.get("/food/admin/customization-settings/takeaway-cod", { contextModule: "admin" }),

  createBroadcastNotification: (body = {}) =>
    apiClient.post("/food/admin/notifications/broadcast", body ?? {}, {
      contextModule: "admin",
    }),
  getBroadcastNotifications: (params = {}) =>
    apiClient.get("/food/admin/notifications/broadcast", {
      params,
      contextModule: "admin",
    }),
  deleteBroadcastNotification: (id) =>
    apiClient.delete(`/food/admin/notifications/broadcast/${String(id)}`, {
      contextModule: "admin",
    }),
  /** List restaurants for admin. Requires admin auth. */
  getRestaurants: (params = {}, config = {}) =>
    apiClient.get("/food/admin/restaurants", {
      params: { limit: 1000, ...params },
      contextModule: "admin",
      ...config,
    }),
  getRestaurantReviews: (params = {}) =>
    apiClient.get("/food/admin/restaurants/reviews", {
      params: { page: 1, limit: 1000, ...params },
      contextModule: "admin",
    }),
  /** Categories (admin) */
  getCategories: (params = {}) =>
    apiClient.get("/food/admin/categories", { params, contextModule: "admin" }),
  /** Dining categories (admin) */
  getDiningCategories: (params = {}) =>
    apiClient.get("/food/admin/dining/categories", {
      params,
      contextModule: "admin",
    }),
  createDiningCategory: (body) =>
    apiClient.post("/food/admin/dining/categories", body ?? {}, {
      contextModule: "admin",
    }),
  updateDiningCategory: (id, body) =>
    apiClient.patch(`/food/admin/dining/categories/${String(id)}`, body ?? {}, {
      contextModule: "admin",
    }),
  deleteDiningCategory: (id) =>
    apiClient.delete(`/food/admin/dining/categories/${String(id)}`, {
      contextModule: "admin",
    }),
  getDiningRestaurants: (params = {}) =>
    apiClient.get("/food/admin/dining/restaurants", {
      params,
      contextModule: "admin",
    }),
  updateRestaurantDiningSettings: (restaurantId, body) =>
    apiClient.patch(
      `/food/admin/dining/restaurants/${String(restaurantId)}`,
      body ?? {},
      { contextModule: "admin" },
    ),
  getDiningRequests: (params = {}) =>
    apiClient.get("/food/admin/dining/requests", {
      params,
      contextModule: "admin",
    }),
  approveDiningRequest: (id) =>
    apiClient.patch(`/food/admin/dining/requests/${String(id)}/approve`, {}, {
      contextModule: "admin",
    }),
  rejectDiningRequest: (id, reason) =>
    apiClient.patch(`/food/admin/dining/requests/${String(id)}/reject`, { reason }, {
      contextModule: "admin",
    }),
  createCategory: (body) =>
    apiClient.post("/food/admin/categories", body ?? {}, {
      contextModule: "admin",
    }),
  updateCategory: (id, body) =>
    apiClient.patch(`/food/admin/categories/${id}`, body ?? {}, {
      contextModule: "admin",
    }),
  deleteCategory: (id) =>
    apiClient.delete(`/food/admin/categories/${id}`, {
      contextModule: "admin",
    }),
  approveCategory: (id) =>
    apiClient.patch(
      `/food/admin/categories/${String(id)}/approve`,
      {},
      { contextModule: "admin" },
    ),
  rejectCategory: (id, reason) =>
    apiClient.patch(
      `/food/admin/categories/${String(id)}/reject`,
      { reason: String(reason || "").trim() },
      { contextModule: "admin" },
    ),
  makeCategoryGlobal: (id) =>
    apiClient.patch(
      `/food/admin/categories/${String(id)}/make-global`,
      {},
      { contextModule: "admin" },
    ),
  toggleCategoryStatus: (id) =>
    apiClient.patch(
      `/food/admin/categories/${id}/toggle`,
      {},
      { contextModule: "admin" },
    ),
  /** Get single restaurant by id (full details for View Details modal). */
  getRestaurantById: (id) =>
    apiClient.get(`/food/admin/restaurants/${id}`, { contextModule: "admin" }),
  /** Get restaurant analytics for POS. */
  getRestaurantAnalytics: (id) =>
    apiClient.get(`/food/admin/restaurants/${id}/analytics`, {
      contextModule: "admin",
    }),
  /** Update restaurant basic details (admin). */
  updateRestaurant: (id, body) =>
    apiClient.patch(`/food/admin/restaurants/${String(id)}`, body ?? {}, {
      contextModule: "admin",
    }),
  deleteRestaurant: (id) =>
    apiClient.delete(`/food/admin/restaurants/${id}`, { contextModule: "admin" }),
  /** Update restaurant status (admin). Body: { status: boolean } */
  updateRestaurantStatus: (id, status) =>
    apiClient.patch(
      `/food/admin/restaurants/${String(id)}/status`,
      { status: status !== false },
      { contextModule: "admin" },
    ),
  /** Update restaurant location (admin). Body includes lat/lng + address fields. */
  updateRestaurantLocation: (id, body) =>
    apiClient.patch(
      `/food/admin/restaurants/${String(id)}/location`,
      body ?? {},
      { contextModule: "admin" },
    ),
  /** Restaurant menu (admin) */
  getRestaurantMenuById: (id, config = {}) =>
    apiClient.get(`/food/admin/restaurants/${id}/menu`, {
      contextModule: "admin",
      ...config,
    }),
  updateRestaurantMenuById: (id, body) =>
    apiClient.patch(`/food/admin/restaurants/${id}/menu`, body ?? {}, {
      contextModule: "admin",
    }),
  /** Foods (admin) - separate collection */
  getFoods: (params = {}) =>
    apiClient.get("/food/admin/foods", { params, contextModule: "admin" }),
  createFood: (body) =>
    apiClient.post("/food/admin/foods", body ?? {}, { contextModule: "admin" }),
  updateFood: (id, body) =>
    apiClient.patch(`/food/admin/foods/${id}`, body ?? {}, {
      contextModule: "admin",
    }),
  deleteFood: (id) =>
    apiClient.delete(`/food/admin/foods/${id}`, { contextModule: "admin" }),
  /** Food approvals (admin) - pending items created by restaurants */
  getPendingFoodApprovals: (params = {}) =>
    apiClient.get("/food/admin/foods/pending-approvals", {
      params,
      contextModule: "admin",
    }),
  approveFoodItem: (id) =>
    apiClient.patch(
      `/food/admin/foods/${String(id)}/approve`,
      {},
      { contextModule: "admin" },
    ),
  rejectFoodItem: (id, reason) =>
    apiClient.patch(
      `/food/admin/foods/${String(id)}/reject`,
      { reason: String(reason || "").trim() },
      { contextModule: "admin" },
    ),
  /** Customers (admin) */
  getCustomers: (params = {}) =>
    apiClient.get("/food/admin/customers", { params, contextModule: "admin" }),
  getCustomerById: (id) =>
    apiClient.get(`/food/admin/customers/${String(id)}`, {
      contextModule: "admin",
    }),
  updateCustomerStatus: (id, isActive) =>
    apiClient.patch(
      `/food/admin/customers/${String(id)}/status`,
      { isActive: isActive !== false },
      { contextModule: "admin" },
    ),
  /** Orders (admin) – list, get by id, manage orders */
  getOrders: (params = {}) =>
    apiClient.get("/food/admin/orders", {
      params: { limit: 50, page: 1, ...params },
      contextModule: "admin",
    }),
  getOrderById: (orderId) =>
    apiClient.get(`/food/admin/orders/${String(orderId)}`, {
      contextModule: "admin",
    }),
  deleteOrder: (orderId) =>
    apiClient.delete(`/food/admin/orders/${String(orderId)}`, {
      contextModule: "admin",
    }),
  acceptOrder: (orderId) =>
    apiClient.patch(`/food/admin/orders/${String(orderId)}/accept`, {}, {
      contextModule: "admin",
    }),
  rejectOrder: (orderId, reason = "") =>
    apiClient.patch(`/food/admin/orders/${String(orderId)}/reject`, { reason }, {
      contextModule: "admin",
    }),
  /** Dispatch settings – auto vs manual assign (global) */
  /** Create restaurant (admin). Single API: POST /food/admin/restaurants. Body: JSON with image URLs. */
  createRestaurant: (body) =>
    apiClient.post("/food/admin/restaurants", body ?? {}, {
      contextModule: "admin",
    }),
  resolveMapsLink: (body) =>
    apiClient.post("/food/admin/resolve-maps-link", body ?? {}, {
      contextModule: "admin",
    }),

  // ── Highway APIs (replaces Zone APIs) ────────────────────────────────────
  /** List all cached national highways. */
  getHighways: (params = {}) =>
    apiClient.get("/food/admin/highways", {
      params: { limit: 500, ...params },
      contextModule: "admin",
    }).then((res) => {
      if (res.data?.success && res.data.data && Array.isArray(res.data.data.highways)) {
        res.data.data.zones = res.data.data.highways;
      }
      return res;
    }),
  getZones: (params = {}) =>
    apiClient.get("/food/admin/highways", {
      params: { limit: 500, ...params },
      contextModule: "admin",
    }).then((res) => {
      if (res.data?.success && res.data.data && Array.isArray(res.data.data.highways)) {
        res.data.data.zones = res.data.data.highways;
      }
      return res;
    }),
  getHighwayById: (id) =>
    apiClient.get(`/food/admin/highways/${String(id)}`, { contextModule: "admin" }),
  /** Create a manual highway */
  createHighway: (body) =>
    apiClient.post("/food/admin/highways", body, { contextModule: "admin" }),
  /** Update a manual highway */
  updateHighway: (id, body) =>
    apiClient.put(`/food/admin/highways/${String(id)}`, body, { contextModule: "admin" }),
  /** Bulk import National Highways from GeoJSON file upload. */
  importHighways: (file, { onUploadProgress } = {}) => {
    if (!file) {
      return Promise.reject(new Error('GeoJSON file is required'))
    }
    const formData = new FormData()
    formData.append('geojson', file)
    return apiClient.post("/food/admin/highways/import", formData, {
      contextModule: "admin",
      timeout: 600000,
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (!onUploadProgress) return
        if (event.total) {
          onUploadProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)))
        } else {
          onUploadProgress(0)
        }
      },
    })
  },
  /** Delete a highway record. */
  deleteHighway: (id) =>
    apiClient.delete(`/food/admin/highways/${String(id)}`, { contextModule: "admin" }),
  /** Toggle highway active/inactive. */
  toggleHighwayStatus: (id) =>
    apiClient.patch(`/food/admin/highways/${String(id)}/toggle`, {}, { contextModule: "admin" }),
  /** Get the distance threshold setting. */
  getHighwaySettings: () =>
    apiClient.get("/food/admin/highway-settings", { contextModule: "admin" }),
  /** Update the distance threshold setting. */
  updateHighwaySettings: (body) =>
    apiClient.patch("/food/admin/highway-settings", body ?? {}, { contextModule: "admin" }),
  getRestaurantReport: (params = {}) =>
    apiClient.get("/food/admin/reports/restaurants", {
      params: { page: 1, limit: 1000, ...params },
      contextModule: "admin",
    }),
  getTransactionReport: (params = {}) =>
    apiClient.get("/food/admin/reports/transactions", {
      params: { page: 1, limit: 1000, ...params },
      contextModule: "admin",
    }),
  getTaxReport: (params = {}) =>
    apiClient.get("/food/admin/reports/tax", {
      params: { page: 1, limit: 1000, ...params },
      contextModule: "admin",
    }),
  getTaxReportDetail: (id, params = {}) =>
    apiClient.get(`/food/admin/reports/tax/${id}`, {
      params,
      contextModule: "admin",
    }),
  /** Get single zone by id */
  getZoneById: (id) =>
    apiClient.get(`/food/admin/zones/${id}`, { contextModule: "admin" }),
  /** Create zone. Body: name, zoneName?, country?, unit?, coordinates, isActive? */
  createZone: (body) =>
    apiClient.post("/food/admin/zones", body ?? {}, { contextModule: "admin" }),
  /** Update zone. Body: name?, zoneName?, country?, unit?, coordinates?, isActive? */
  updateZone: (id, body) =>
    apiClient.patch(`/food/admin/zones/${id}`, body ?? {}, {
      contextModule: "admin",
    }),
  /** Delete zone */
  deleteZone: (id) =>
    apiClient.delete(`/food/admin/zones/${id}`, { contextModule: "admin" }),

  /** Feedback Experience (admin) */
  getFeedbackExperiences: (params = {}) =>
    apiClient.get(API_ENDPOINTS.ADMIN.FEEDBACK_EXPERIENCE, {
      params,
      contextModule: "admin",
    }),
  deleteFeedbackExperience: (id) =>
    apiClient.delete(`${API_ENDPOINTS.ADMIN.FEEDBACK_EXPERIENCE}/${id}`, {
      contextModule: "admin",
    }),

  /** Public env variables (safe subset). Used for runtime keys like Google Maps. */
  // getPublicEnvVariables removed: rely on import.meta.env instead.

  /** Public categories (user app) - zone-aware */
  getPublicCategories: (params = {}, config = {}) =>
    apiClient.get("/food/restaurant/categories/public", {
      params: params ?? {},
      ...config,
    }),

  /** Offers & Coupons (admin) */
  getAllOffers: (params = {}) =>
    apiClient.get("/food/admin/offers", { params, contextModule: "admin" }),
  createAdminOffer: (body) =>
    apiClient.post("/food/admin/offers", body ?? {}, {
      contextModule: "admin",
    }),
  updateAdminOfferCartVisibility: (offerId, itemId, showInCart) =>
    apiClient.patch(
      `/food/admin/offers/${String(offerId)}/cart-visibility`,
      { itemId: String(itemId), showInCart: Boolean(showInCart) },
      { contextModule: "admin" },
    ),
  deleteAdminOffer: (offerId) =>
    apiClient.delete(`/food/admin/offers/${String(offerId)}`, {
      contextModule: "admin",
    }),
  getRestaurantCommissionBootstrap: () =>
    apiClient.get("/food/admin/restaurant-commissions/bootstrap", {
      contextModule: "admin",
    }),
  getRestaurantCommissions: (params = {}) =>
    apiClient.get("/food/admin/restaurant-commissions", {
      params,
      contextModule: "admin",
    }),
  createRestaurantCommission: (body) =>
    apiClient.post("/food/admin/restaurant-commissions", body ?? {}, {
      contextModule: "admin",
    }),
  getRestaurantCommissionById: (id) =>
    apiClient.get(`/food/admin/restaurant-commissions/${String(id)}`, {
      contextModule: "admin",
    }),
  updateRestaurantCommission: (id, body) =>
    apiClient.patch(
      `/food/admin/restaurant-commissions/${String(id)}`,
      body ?? {},
      { contextModule: "admin" },
    ),
  deleteRestaurantCommission: (id) =>
    apiClient.delete(`/food/admin/restaurant-commissions/${String(id)}`, {
      contextModule: "admin",
    }),
  toggleRestaurantCommissionStatus: (id) =>
    apiClient.patch(
      `/food/admin/restaurant-commissions/${String(id)}/toggle`,
      {},
      { contextModule: "admin" },
    ),
  /** Backward-compatible alias used in UI */
  getApprovedRestaurants: (params = {}) =>
    apiClient.get("/food/admin/restaurants", {
      params: { status: "approved", limit: 1000, ...params },
      contextModule: "admin",
    }),


  /** Fee Settings (admin) */
  getFeeSettings: () =>
    apiClient.get("/food/admin/fee-settings", { contextModule: "admin" }),
  createOrUpdateFeeSettings: (body) =>
    apiClient.put("/food/admin/fee-settings", body ?? {}, {
      contextModule: "admin",
    }),

  /** Referral Settings (admin) */
  getReferralSettings: () =>
    apiClient.get("/food/admin/referral-settings", { contextModule: "admin" }),
  createOrUpdateReferralSettings: (body) =>
    apiClient.put("/food/admin/referral-settings", body ?? {}, {
      contextModule: "admin",
    }),

  /** Safety / Emergency Reports (admin) */
  getSafetyEmergencyReports: (params) =>
    apiClient.get("/food/admin/safety-emergency-reports", {
      params: params ?? {},
      contextModule: "admin",
    }),
  updateSafetyEmergencyStatus: (id, status) =>
    apiClient.put(
      `/food/admin/safety-emergency-reports/${String(id)}/status`,
      { status: String(status) },
      { contextModule: "admin" },
    ),
  updateSafetyEmergencyPriority: (id, priority) =>
    apiClient.put(
      `/food/admin/safety-emergency-reports/${String(id)}/priority`,
      { priority: String(priority) },
      { contextModule: "admin" },
    ),
  deleteSafetyEmergencyReport: (id) =>
    apiClient.delete(`/food/admin/safety-emergency-reports/${String(id)}`, {
      contextModule: "admin",
    }),

  /** Restaurant add-ons approval (admin) */
  getRestaurantAddons: (params = {}) =>
    apiClient.get("/food/admin/addons", {
      params: params ?? {},
      contextModule: "admin",
    }),
  updateRestaurantAddon: (id, body) =>
    apiClient.patch(
      `/food/admin/addons/${String(id)}`,
      body ?? {},
      { contextModule: "admin" },
    ),
  approveRestaurantAddon: (id) =>
    apiClient.patch(
      `/food/admin/addons/${String(id)}/approve`,
      {},
      { contextModule: "admin" },
    ),
  rejectRestaurantAddon: (id, reason) =>
    apiClient.patch(
      `/food/admin/addons/${String(id)}/reject`,
      { reason: String(reason || "").trim() },
      { contextModule: "admin" },
    ),
  /** Business Settings (admin) */
  getBusinessSettings: () =>
    apiClient.get(API_ENDPOINTS.ADMIN.BUSINESS_SETTINGS, {
      contextModule: "admin",
    }),
  updateBusinessSettings: (data, files = {}) => {
    const formData = new FormData();
    // Add JSON data
    formData.append("data", JSON.stringify(data));
    // Add files
    if (files.logo) formData.append("logo", files.logo);
    if (files.favicon) formData.append("favicon", files.favicon);

    return apiClient.patch(API_ENDPOINTS.ADMIN.BUSINESS_SETTINGS, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      contextModule: "admin",
    });
  },
};

/** Restaurant API - OTP login via new backend; no email/password. */
export const restaurantAPI = {
  sendOTP: (phone, _purpose = "login") => {
    if (!phone) return Promise.reject(new Error("Phone is required"));
    return authService.requestRestaurantOtp(phone);
  },
  verifyOTP: (phone, otp, _purpose, _name, _email, fcmToken = null, platform = "web", confirmAction = null) => {
    if (!phone || !otp)
      return Promise.reject(new Error("Phone and OTP are required"));
    return authService.verifyRestaurantOtp(phone, otp, fcmToken, platform, confirmAction);
  },
  getMe: () => authService.getMe("restaurant"),
  /** Restaurant dashboard: fetch current restaurant profile (deduped + short-cached). */
  getCurrentRestaurant: () => getRestaurantCurrentOnce(),
  /** Force-refresh current restaurant profile bypassing the short-lived cache. */
  refreshCurrentRestaurant: () => {
    restaurantCurrentCached = null;
    restaurantCurrentCacheTime = 0;
    restaurantCurrentInFlight = null;
    return getRestaurantCurrentOnce();
  },
  /** Finance dashboard for `hub-finance`. */
  getFinance: (params = {}) =>
    apiClient.get("/food/restaurant/finance", {
      contextModule: "restaurant",
      params: params || {},
    }),
  /** Fetch restaurant by owner (stub for missing backend endpoint). */
  getRestaurantByOwner: () =>
    Promise.resolve({
      data: {
        success: true,
        data: {
          restaurant: {
            name: "Your Restaurant",
            restaurantId: "REST000001",
            address: "Your address",
          },
        },
      },
    }),
  /** Submit a real withdrawal request to the backend. */
  createWithdrawalRequest: (amount) =>
    apiClient.post("/food/restaurant/withdraw", { amount: Number(amount) }, {
      contextModule: "restaurant"
    }),
  /** List withdrawal history for current restaurant. */
  getWithdrawalHistory: () =>
    apiClient.get("/food/restaurant/withdrawals", {
      contextModule: "restaurant"
    }),
  /** Update restaurant profile fields (name/cuisines/location/menuImages). */
  updateProfile: (body) =>
    apiClient
      .patch("/food/restaurant/profile", body ?? {}, {
        contextModule: "restaurant",
      })
      .then((res) => {
        // Keep cache coherent to avoid an immediate refetch storm.
        restaurantCurrentCached = res;
        restaurantCurrentCacheTime = Date.now();
        return res;
      }),
  updateDiningSettings: (body) =>
    apiClient
      .patch("/food/restaurant/dining-settings", body ?? {}, {
        contextModule: "restaurant",
      })
      .then((res) => {
        restaurantCurrentCached = res;
        restaurantCurrentCacheTime = Date.now();
        return res;
      }),
  updateTakeawaySettings: (body) =>
    apiClient
      .patch("/food/restaurant/takeaway-settings", body ?? {}, {
        contextModule: "restaurant",
      })
      .then((res) => {
        restaurantCurrentCached = res;
        restaurantCurrentCacheTime = Date.now();
        return res;
      }),
  requestDiningUpdate: (body) =>
    apiClient.post("/food/restaurant/dining-settings/request", body ?? {}, {
      contextModule: "restaurant",
    }),
  getPendingDiningRequest: () =>
    apiClient.get("/food/restaurant/dining-settings/pending", {
      contextModule: "restaurant",
    }),
  /** PATCH /food/restaurant/availability. Body: { isAcceptingOrders: boolean } */
  updateAcceptingOrders: (isAcceptingOrders) =>
    apiClient
      .patch(
        "/food/restaurant/availability",
        { isAcceptingOrders: Boolean(isAcceptingOrders) },
        { contextModule: "restaurant" },
      )
      .then((res) => {
        // Keep cache coherent to avoid an immediate refetch storm.
        restaurantCurrentCached = res;
        restaurantCurrentCacheTime = Date.now();
        return res;
      }),
  /** Upload and set restaurant profile image (multipart). Field name: file */
  uploadProfileImage: (file) => {
    if (!file) return Promise.reject(new Error("File is required"));
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("/food/restaurant/profile/profile-image", formData, {
      contextModule: "restaurant",
    });
  },
  /** Upload a menu/cover image (multipart). Does not auto-attach; use updateProfile(menuImages) after. */
  uploadMenuImage: (file) => {
    if (!file) return Promise.reject(new Error("File is required"));
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("/food/restaurant/profile/menu-image", formData, {
      contextModule: "restaurant",
    });
  },
  uploadCoverImages: (files = []) => {
    const normalizedFiles = Array.from(files || []).filter(Boolean);
    if (normalizedFiles.length === 0) {
      return Promise.reject(new Error("At least one file is required"));
    }
    const formData = new FormData();
    normalizedFiles.forEach((file) => formData.append("files", file));
    return apiClient.post("/food/restaurant/profile/cover-images", formData, {
      contextModule: "restaurant",
    });
  },
  uploadMenuImages: (files = []) => {
    const normalizedFiles = Array.from(files || []).filter(Boolean);
    if (normalizedFiles.length === 0) {
      return Promise.reject(new Error("At least one file is required"));
    }
    const formData = new FormData();
    normalizedFiles.forEach((file) => formData.append("files", file));
    return apiClient.post("/food/restaurant/profile/menu-images", formData, {
      contextModule: "restaurant",
    });
  },
  /** Public Offers for users (global/selected restaurant) */
  getPublicOffers: () => apiClient.get("/food/restaurant/offers"),
  /** Backward-compat helper used by Cart: returns coupons array for an item by adapting public offers */
  getCouponsByItemIdPublic: (restaurantId, _itemId) =>
    apiClient.get("/food/restaurant/offers").then((res) => {
      const list = res?.data?.data?.allOffers || res?.data?.allOffers || [];
      const now = Date.now();
      const coupons = list
        .filter((o) => {
          // Guard: respect selected restaurant scope
          if (String(o?.restaurantScope) === "selected") {
            if (!restaurantId) return false;
            return String(o.restaurantId || "") === String(restaurantId || "");
          }
          return true;
        })
        .map((o) => {
          const isPct = o.discountType === "percentage";
          return {
            couponCode: o.couponCode,
            discountType: o.discountType,
            discountPercentage: isPct ? Number(o.discountValue) || 0 : 0,
            originalPrice: 0,
            discountedPrice: 0,
            minOrderValue: Number(o.minOrderValue || 0),
            minOrder: Number(o.minOrderValue || 0),
            maxDiscount: o.maxDiscount != null ? Number(o.maxDiscount) : null,
            customerGroup: o.customerScope || "all",
            isGlobalCoupon: true,
            endDate: o.endDate || null,
            showInCart: o.showInCart !== false,
            _ts: now,
          };
        });
      return { data: { success: true, data: { coupons } } };
    }),
  /** Categories (restaurant dashboard) */
  getCategories: (params = {}) =>
    // Compact payload for item creation forms (id + name only).
    apiClient.get("/food/restaurant/categories", {
      params: { compact: true, limit: 1000, ...params },
      contextModule: "restaurant",
    }),
  // For MenuCategoriesPage compatibility
  getAllCategories: (params = {}) =>
    apiClient.get("/food/restaurant/categories", {
      params: {
        includeInactive: true,
        withCounts: true,
        limit: 1000,
        ...params,
      },
      contextModule: "restaurant",
    }),
  createCategory: (body) =>
    apiClient.post("/food/restaurant/categories", body ?? {}, {
      contextModule: "restaurant",
    }),
  updateCategory: (id, body) =>
    apiClient.patch(`/food/restaurant/categories/${String(id)}`, body ?? {}, {
      contextModule: "restaurant",
    }),
  deleteCategory: (id) =>
    apiClient.delete(`/food/restaurant/categories/${String(id)}`, {
      contextModule: "restaurant",
    }),
  /** Menu (restaurant dashboard) */
  getMenu: (params = {}) =>
    apiClient.get("/food/restaurant/menu", {
      params,
      contextModule: "restaurant",
    }),
  /** Orders (restaurant dashboard) */
  getOrders: (params = {}) =>
    apiClient.get("/food/restaurant/orders", {
      params: { limit: 50, page: 1, ...params },
      contextModule: "restaurant",
    }),
  getOrderById: (orderId) =>
    apiClient.get(`/food/restaurant/orders/${String(orderId)}`, {
      contextModule: "restaurant",
    }),
  updateMenu: (body) =>
    apiClient.patch("/food/restaurant/menu", body ?? {}, {
      contextModule: "restaurant",
    }),
  saveFcmToken: (token, platform = "web") => {
    if (!token) return Promise.reject(new Error("FCM token is required"));
    const path =
      platform === "mobile" ? "/fcm-tokens/mobile/save" : "/fcm-tokens/save";
    return apiClient.post(
      path,
      { token: String(token), platform },
      { contextModule: "restaurant" },
    );
  },
  removeFcmToken: (token, platform = "web") => {
    if (!token) return Promise.reject(new Error("FCM token is required"));
    return apiClient.delete(
      `/fcm-tokens/remove/${encodeURIComponent(String(token))}`,
      {
        data: { token: String(token), platform },
        contextModule: "restaurant",
      },
    );
  },
  /** Outlet timings (restaurant dashboard) */
  getOutletTimings: () =>
    apiClient.get("/food/restaurant/outlet-timings", {
      contextModule: "restaurant",
    }),
  saveOutletTimings: (outletTimings) =>
    apiClient.put(
      "/food/restaurant/outlet-timings",
      { outletTimings: outletTimings || {} },
      { contextModule: "restaurant" },
    ),
  /** Foods (restaurant) - stored in food_items collection */
  createFood: (body) =>
    apiClient.post("/food/restaurant/foods", body ?? {}, {
      contextModule: "restaurant",
    }),
  updateFood: (id, body) =>
    apiClient.patch(`/food/restaurant/foods/${String(id)}`, body ?? {}, {
      contextModule: "restaurant",
    }),
  /** Orders (restaurant dashboard) */
  getOrders: (() => {
    // Single-flight de-dupe to avoid duplicate GETs in React StrictMode / double-mount.
    let inFlight = null;
    let inFlightKey = "";
    let cache = null;
    let cacheKey = "";
    let cacheAt = 0;
    const CACHE_MS = 800;

    const buildKey = (p = {}) => JSON.stringify({ limit: 50, page: 1, ...p });

    return (params = {}) => {
      const key = buildKey(params);
      const now = Date.now();

      if (cache && cacheKey === key && now - cacheAt < CACHE_MS) {
        return Promise.resolve(cache);
      }

      if (inFlight && inFlightKey === key) return inFlight;

      inFlightKey = key;
      inFlight = apiClient
        .get("/food/restaurant/orders", {
          params: { limit: 50, page: 1, ...params },
          contextModule: "restaurant",
        })
        .then((res) => {
          // Backend paginated shape: { data: { data: [...], meta: {...} } }
          // Normalize to { data: { data: { orders: [...], meta } } } for restaurant UI pages.
          const payload = res?.data?.data || {};
          const rowsRaw = Array.isArray(payload.data) ? payload.data : [];

          // Normalize backend order fields to match existing restaurant UI expectations.
          // UI historically uses: order.status, order.address, order.total, order.paymentMethod
          const normalizeStatus = (s) => {
            const v = String(s || "").toLowerCase();
            // Backend: created -> treat as confirmed/new in UI
            if (v === "created") return "confirmed";
            // Backend: ready_for_pickup -> ready
            if (v === "ready_for_pickup") return "ready";
            // Backend: picked_up -> completed (restaurant handed over)
            if (v === "picked_up") return "completed";
            if (v.includes("cancel")) return "cancelled";
            return v || "confirmed";
          };

          const rows = rowsRaw.map((o) => {
            const status = normalizeStatus(o.orderStatus || o.status);
            const address = o.address;
            const total = o.pricing?.total ?? o.total ?? 0;
            const paymentMethod = o.payment?.method || o.paymentMethod || null;
            return { ...o, status, address, total, paymentMethod };
          });
          const meta = payload.meta || {};
          const normalized = {
            ...res,
            data: {
              ...res.data,
              data: { orders: rows, meta },
            },
          };

          cache = normalized;
          cacheKey = key;
          cacheAt = Date.now();
          return normalized;
        })
        .finally(() => {
          inFlight = null;
          inFlightKey = "";
        });

      return inFlight;
    };
  })(),
  updateOrderStatus: (orderId, body) => {
    const raw = body ?? {};
    const outgoing = { ...raw };

    // Translate UI-friendly statuses to backend enum values.
    const normalizeOutgoingStatus = (s) => {
      const v = String(s || "")
        .toLowerCase()
        .trim();
      if (!v) return v;
      if (v === "ready") return "ready_for_pickup";
      if (v === "completed") return "picked_up";
      if (v === "cancelled") return "cancelled_by_restaurant";
      return v;
    };

    if (outgoing.orderStatus) {
      outgoing.orderStatus = normalizeOutgoingStatus(outgoing.orderStatus);
    }

    return apiClient.patch(
      `/food/restaurant/orders/${String(orderId)}/status`,
      outgoing,
      { contextModule: "restaurant" },
    );
  },
  verifyOtp: (orderId, otp) =>
    apiClient.post(`/food/orders/${String(orderId)}/verify-otp`, { otp }, { contextModule: "restaurant" }),
  /**
   * Accept an incoming order (restaurant).
   * UI expects this to move order into "preparing" bucket.
   * Backend supports PATCH /food/restaurant/orders/:orderId/status with { orderStatus }.
   */
  acceptOrder: async (orderId, _prepTimeMins = null) => {
    try {
      return await restaurantAPI.updateOrderStatus(orderId, {
        orderStatus: "preparing",
      });
    } catch (error) {
      const statusCode = Number(error?.response?.status || 0);
      if (statusCode === 400) {
        // Compatibility fallback: some backends treat "confirmed" as accept action.
        return restaurantAPI.updateOrderStatus(orderId, {
          orderStatus: "confirmed",
        });
      }
      throw error;
    }
  },
  /**
   * Reject/cancel order by restaurant.
   * Backend orderStatus enum: cancelled_by_restaurant.
   */
  rejectOrder: (orderId, reason = "") =>
    restaurantAPI.updateOrderStatus(orderId, {
      orderStatus: "cancelled_by_restaurant",
      note: reason,
    }),
  /** Mark order ready (restaurant handoff). */
  markOrderReady: (orderId) =>
    restaurantAPI.updateOrderStatus(orderId, {
      orderStatus: "ready_for_pickup",
    }),
  /**
   * Get a single order by id for restaurant screens.
   * Prefer direct endpoint; fallback to list+filter for backward compatibility.
   */
  getOrderById: async (orderId) => {
    return await apiClient.get(`/food/restaurant/orders/${String(orderId)}`, {
      contextModule: "restaurant",
    });
  },
  /** Add-ons (restaurant) - approval handled by admin */
  getAddons: (params = {}) =>
    apiClient.get("/food/restaurant/addons", {
      // Backend validator enforces limit <= 100
      params: { limit: 100, page: 1, ...params },
      contextModule: "restaurant",
    }),
  addAddon: (body) =>
    apiClient.post("/food/restaurant/addons", body ?? {}, {
      contextModule: "restaurant",
    }),
  updateAddon: (id, body) =>
    apiClient.patch(`/food/restaurant/addons/${String(id)}`, body ?? {}, {
      contextModule: "restaurant",
    }),
  deleteAddon: (id) =>
    apiClient.delete(`/food/restaurant/addons/${String(id)}`, {
      contextModule: "restaurant",
    }),
  logout: (refreshToken) => {
    restaurantCurrentInFlight = null;
    restaurantCurrentCached = null;
    restaurantCurrentCacheTime = 0;
    const token =
      refreshToken ||
      (typeof localStorage !== "undefined"
        ? localStorage.getItem("restaurant_refreshToken")
        : null);
    const fcmToken = typeof localStorage !== "undefined" ? localStorage.getItem("fcm_web_registered_token_restaurant") : null;
    return authService.logout(token, fcmToken, "web");
  },
  /** Backend has no email/password login; use phone OTP only. */
  login: (_email, _password) =>
    Promise.reject(new Error("Please use phone number and OTP to sign in.")),
  /**
   * Register a restaurant (multipart FormData).
   * Backend: POST /v1/food/restaurant/register (path relative to baseURL /api/v1)
   */
  register: (formData) => {
    if (!formData || !(formData instanceof FormData)) {
      return Promise.reject(new Error("FormData is required"));
    }
    return apiClient.post("/food/restaurant/register", formData);
  },
  /** Public: list approved restaurants for user app */
  getRestaurants: (params = {}, config = {}) =>
    getPublicRestaurantsOnce(params, config),
  /** Public: list restaurants with dishes under ₹250 */
  getRestaurantsUnder250: (params = {}, config = {}) =>
    getPublicRestaurantsUnder250Once(params, config),
  /** Public: get single approved restaurant by id or slug */
  getRestaurantById: (id, config = {}) =>
    apiClient.get(`/food/restaurant/restaurants/${String(id)}`, { ...config }),
  /** Public: get approved menu by restaurant id or slug */
  getMenuByRestaurantId: (id, config = {}) =>
    getPublicRestaurantMenuOnce(id, config),
  /** Public: get outlet timings by restaurant id */
  getOutletTimingsByRestaurantId: (id, config = {}) =>
    getPublicRestaurantOutletTimingsOnce(id, config),
  /** Public (user app): approved add-ons by restaurant id/slug */
  getAddonsByRestaurantId: (id, config = {}) =>
    apiClient.get(`/food/restaurant/restaurants/${String(id)}/addons`, {
      ...config,
    }),
  getPublicOffers: (params = {}, config = {}) =>
    apiClient.get("/food/restaurant/offers", { params, ...config }),
  /** Resend pickup notification (restaurant dashboard) */
  resendPickupNotification: (orderId) =>
    apiClient.post(`/food/restaurant/orders/${String(orderId)}/resend-notification`, {}, {
      contextModule: "restaurant",
    }),
  /** List restaurant complaints (for current restaurant dashboard) */
  getComplaints: (params = {}) =>
    apiClient.get("/food/restaurant/complaints", {
      params,
      contextModule: "restaurant",
    }),
  /** Restaurant support tickets */
  createSupportTicket: (body = {}) =>
    apiClient.post("/food/restaurant/support/tickets", body ?? {}, {
      contextModule: "restaurant",
    }),
  getSupportTickets: (params = {}) =>
    apiClient.get("/food/restaurant/support/tickets", {
      params,
      contextModule: "restaurant",
    }),
  /** DELETE /food/restaurant/account - permanently delete restaurant account */
  deleteAccount: () =>
    apiClient.delete("/food/restaurant/account", { contextModule: "restaurant" }),
};

function stableStringify(value) {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

function createInFlightCache({ ttlMs }) {
  const inFlight = new Map();
  const cached = new Map(); // key -> { t, v }

  const getCached = (key) => {
    const hit = cached.get(key);
    if (!hit) return null;
    if (Date.now() - hit.t > ttlMs) {
      cached.delete(key);
      return null;
    }
    return hit.v;
  };

  const getOrCreate = (key, factory) => {
    const cachedValue = getCached(key);
    if (cachedValue) return Promise.resolve(cachedValue);
    if (inFlight.has(key)) return inFlight.get(key);
    const p = Promise.resolve()
      .then(factory)
      .then((res) => {
        cached.set(key, { t: Date.now(), v: res });
        return res;
      })
      .finally(() => {
        inFlight.delete(key);
      });
    inFlight.set(key, p);
    return p;
  };

  return { getOrCreate };
}

// Public user-app endpoints can be called by multiple components/effects on refresh (and React StrictMode in dev).
// A small in-flight + short TTL cache collapses duplicate requests without changing functionality.
const publicRestaurantsCache = createInFlightCache({ ttlMs: 3000 });
const publicRestaurantsUnder250Cache = createInFlightCache({ ttlMs: 3000 });
const publicRestaurantMenuCache = createInFlightCache({ ttlMs: 3000 });
const publicRestaurantOutletTimingsCache = createInFlightCache({ ttlMs: 3000 });
const publicGenericGetCache = createInFlightCache({ ttlMs: 3000 });

export const publicGetOnce = (url, config = {}) => {
  const safeUrl = typeof url === "string" ? url.trim() : "";
  const { noCache, params, ...axiosConfig } = config || {};
  if (!safeUrl) return Promise.reject(new Error("url is required"));

  if (noCache) {
    return apiClient.get(safeUrl, { params, ...axiosConfig });
  }

  const keyParams =
    params && typeof params === "object" ? { ...params } : params;
  if (keyParams && typeof keyParams === "object") {
    // `_ts` is used as a cache-buster in some call sites; ignore it for dedupe purposes.
    delete keyParams._ts;
  }

  const key = `GET:${safeUrl}:${stableStringify(keyParams)}`;
  return publicGenericGetCache.getOrCreate(key, () =>
    apiClient.get(safeUrl, { params, ...axiosConfig }),
  );
};

const getPublicRestaurantsUnder250Once = (params = {}, config = {}) => {
  const { noCache, ...axiosConfig } = config || {};
  if (noCache) {
    return apiClient.get("/food/restaurant/under-250", {
      params: params ?? {},
      ...axiosConfig,
    });
  }
  const keyParams = params ?? {};
  if (keyParams && typeof keyParams === "object") {
    delete keyParams._ts;
  }
  const key = `under-250:${stableStringify(keyParams)}`;
  return publicRestaurantsUnder250Cache.getOrCreate(key, () =>
    apiClient.get("/food/restaurant/under-250", {
      params: params ?? {},
      ...axiosConfig,
    }),
  );
};

const getPublicRestaurantsOnce = (params = {}, config = {}) => {
  const { noCache, ...axiosConfig } = config || {};
  if (noCache) {
    return apiClient.get("/food/restaurant/restaurants", {
      params: { limit: 40, ...params },
      ...axiosConfig,
    });
  }
  const keyParams = { limit: 40, ...params };
  // `_ts` is an explicit cache-buster in many call sites; ignore it for dedupe purposes.
  if (keyParams && typeof keyParams === "object") {
    delete keyParams._ts;
  }
  const key = `restaurants:${stableStringify(keyParams)}`;
  return publicRestaurantsCache.getOrCreate(key, () =>
    apiClient.get("/food/restaurant/restaurants", {
      params: { limit: 40, ...params },
      ...axiosConfig,
    }),
  );
};

const getPublicRestaurantMenuOnce = (id, config = {}) => {
  const safeId = String(id || "").trim();
  const { noCache, ...axiosConfig } = config || {};
  if (!safeId) {
    return Promise.resolve({
      data: { success: false, data: null },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    });
  }
  if (noCache) {
    return apiClient.get(`/food/restaurant/restaurants/${safeId}/menu`, {
      ...axiosConfig,
    });
  }
  const key = `menu:${safeId}`;
  return publicRestaurantMenuCache.getOrCreate(key, () =>
    apiClient.get(`/food/restaurant/restaurants/${safeId}/menu`, {
      ...axiosConfig,
    }),
  );
};

const getPublicRestaurantOutletTimingsOnce = (id, config = {}) => {
  const safeId = String(id || "").trim();
  const { noCache, ...axiosConfig } = config || {};
  if (!safeId) {
    return Promise.resolve({
      data: { success: false, data: null },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    });
  }
  if (noCache) {
    return apiClient.get(
      `/food/restaurant/restaurants/${safeId}/outlet-timings`,
      { ...axiosConfig },
    );
  }
  const key = `outletTimings:${safeId}`;
  return publicRestaurantOutletTimingsCache.getOrCreate(key, () =>
    apiClient.get(`/food/restaurant/restaurants/${safeId}/outlet-timings`, {
      ...axiosConfig,
    }),
  );
};

/** Single in-flight + short cache for restaurant /food/restaurant/current - prevents request storms. */
let restaurantCurrentInFlight = null;
let restaurantCurrentCached = null;
let restaurantCurrentCacheTime = 0;
const RESTAURANT_CURRENT_CACHE_MS = 3000;

const getRestaurantCurrentOnce = () => {
  const now = Date.now();
  if (
    restaurantCurrentCached &&
    now - restaurantCurrentCacheTime < RESTAURANT_CURRENT_CACHE_MS
  ) {
    return Promise.resolve(restaurantCurrentCached);
  }
  if (!restaurantCurrentInFlight) {
    restaurantCurrentInFlight = apiClient
      .get("/food/restaurant/current", { contextModule: "restaurant" })
      .then((res) => {
        restaurantCurrentCached = res;
        restaurantCurrentCacheTime = Date.now();
        return res;
      })
      .finally(() => {
        restaurantCurrentInFlight = null;
      });
  }
  return restaurantCurrentInFlight;
};

export const userAPI = {
  getCustomizationSettings: () =>
    apiClient.get("/food/public/customization-settings"),
  getDrivingModeSettings: () =>
    apiClient.get("/food/driving-mode/settings", { contextModule: "user" }),
  getRestaurantsAhead: (params, config = {}) =>
    apiClient.get("/food/driving-mode/restaurants", { params, contextModule: "user", ...config }),
  /** Get current user profile (Bearer USER). */
  getProfile: () =>
    getUserMeOnce().then((res) => {
      const user =
        res?.data?.data?.user ??
        res?.data?.user ??
        res?.data?.data ??
        res?.data;
      return { ...res, data: { ...res.data, data: { user } } };
    }),
  /** PATCH /food/user/profile (Bearer USER) */
  updateProfile: (body) =>
    apiClient.patch("/food/user/profile", body ?? {}, {
      contextModule: "user",
    }),
  /** Upload and set user profile image (multipart). Field name: file */
  uploadProfileImage: (file) => {
    if (!file) return Promise.reject(new Error("File is required"));
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post("/food/user/profile/profile-image", formData, {
      contextModule: "user",
    });
  },
  /** GET /food/user/wallet (Bearer USER). Deduped + short-cached. */
  getWallet: (() => {
    let inFlight = null;
    let cached = null;
    let cacheTime = 0;
    const CACHE_MS = 3000;
    return () => {
      const now = Date.now();
      if (cached && now - cacheTime < CACHE_MS) return Promise.resolve(cached);
      if (!inFlight) {
        inFlight = apiClient
          .get("/food/user/wallet", { contextModule: "user" })
          .then((res) => {
            cached = res;
            cacheTime = Date.now();
            return res;
          })
          .finally(() => {
            inFlight = null;
          });
      }
      return inFlight;
    };
  })(),
  /** GET /food/user/referrals/stats (Bearer USER) */
  getReferralStats: () =>
    apiClient.get("/food/user/referrals/stats", { contextModule: "user" }),
  /** GET /food/user/referrals/details (Bearer USER) */
  getReferralDetails: () =>
    apiClient.get("/food/user/referrals/details", { contextModule: "user" }),
  /** POST /food/user/wallet/topup/order (Bearer USER). Body: { amount } */
  createWalletTopupOrder: (amount) =>
    apiClient.post(
      "/food/user/wallet/topup/order",
      { amount: Number(amount) },
      { contextModule: "user" },
    ),
  /** POST /food/user/wallet/topup/verify (Bearer USER) */
  verifyWalletTopupPayment: (body) =>
    apiClient.post("/food/user/wallet/topup/verify", body ?? {}, {
      contextModule: "user",
    }),
  /** GET /food/user/addresses (Bearer USER). Deduped + short-cached. */
  getAddresses: (() => {
    let inFlight = null;
    let cached = null;
    let cacheTime = 0;
    const CACHE_MS = 3000;
    return () => {
      const now = Date.now();
      if (cached && now - cacheTime < CACHE_MS) return Promise.resolve(cached);
      if (!inFlight) {
        inFlight = apiClient
          .get("/food/user/addresses", { contextModule: "user" })
          .then((res) => {
            cached = res;
            cacheTime = Date.now();
            return res;
          })
          .finally(() => {
            inFlight = null;
          });
      }
      return inFlight;
    };
  })(),
  /** POST /food/user/addresses (Bearer USER) */
  addAddress: (body) =>
    apiClient.post("/food/user/addresses", body ?? {}, {
      contextModule: "user",
    }),
  /** PATCH /food/user/addresses/:id (Bearer USER) */
  updateAddress: (id, body) =>
    apiClient.patch(`/food/user/addresses/${String(id)}`, body ?? {}, {
      contextModule: "user",
    }),
  /** DELETE /food/user/addresses/:id (Bearer USER) */
  deleteAddress: (id) =>
    apiClient.delete(`/food/user/addresses/${String(id)}`, {
      contextModule: "user",
    }),
  /** PATCH /food/user/addresses/:id/default (Bearer USER) */
  setDefaultAddress: (id) =>
    apiClient.patch(
      `/food/user/addresses/${String(id)}/default`,
      {},
      { contextModule: "user" },
    ),
  /** POST /food/user/safety-emergency-reports (Bearer USER) */
  createSafetyEmergencyReport: (message) =>
    apiClient.post(
      "/food/user/safety-emergency-reports",
      { message: String(message || "") },
      { contextModule: "user" },
    ),
  /** GET /food/user/safety-emergency-reports (Bearer USER) */
  getMySafetyEmergencyReports: (params) =>
    apiClient.get("/food/user/safety-emergency-reports", {
      params: params ?? {},
      contextModule: "user",
    }),
  /**
   * Legacy UI compatibility: update "current user location".
   * We already persist the user's selected location in localStorage in the UI.
   * Keep this as a no-op success so existing flows don't break.
   */
  updateLocation: (_payload) =>
    Promise.resolve({
      data: { success: true, message: "Location saved (client)", data: null },
    }),
  saveFcmToken: (token, options = {}) => {
    if (!token) return Promise.reject(new Error("FCM token is required"));
    const platform = options?.platform === "mobile" ? "mobile" : "web";
    const path =
      platform === "mobile" ? "/fcm-tokens/mobile/save" : "/fcm-tokens/save";
    return apiClient.post(
      path,
      { token: String(token), platform },
      { contextModule: "user" },
    );
  },
  removeFcmToken: (token, options = {}) => {
    if (!token) return Promise.reject(new Error("FCM token is required"));
    const platform = options?.platform === "mobile" ? "mobile" : "web";
    return apiClient.delete(
      `/fcm-tokens/remove/${encodeURIComponent(String(token))}`,
      {
        data: { token: String(token), platform },
        contextModule: "user",
      },
    );
  },
  testFcmNotification: (options = {}) => {
    const platform = options?.platform === "mobile" ? "mobile" : "web";
    return apiClient.post("/fcm-tokens/test", { platform }, { contextModule: "user" });
  },
  /** DELETE /food/user/account - permanently delete user account */
  deleteAccount: () =>
    apiClient.delete("/food/user/account", { contextModule: "user" }),
};
export const locationAPI = createStubAPI();
/** Highway API – replaces the zone-based service area detection. */
export const highwayAPI = {
  /** Detect nearest highway for a lat/lng point. Replaces detectZone. */
  detectHighway: (lat, lng) =>
    apiClient.get("/food/highways/detect", {
      params: { lat, lng },
    }),
  /** List active highways (for displays). */
  getPublicHighways: (params = {}, config = {}) =>
    apiClient.get("/food/highways/public", { params: params ?? {}, ...config }),
  /** Get nearby highways for map rendering. */
  getNearbyHighways: (params = {}, config = {}) =>
    apiClient.get("/food/highways/nearby", { params: params ?? {}, ...config }),
};


export const uploadAPI = {
  /**
   * Upload a single image file to the backend (Cloudinary-backed).
   * @param {File|Blob} file
   * @param {{ folder?: string }} options
   */
  uploadMedia: (file, options = {}) => {
    if (!file) {
      return Promise.reject(new Error("File is required for upload"));
    }

    const formData = new FormData();
    formData.append("file", file);
    if (options.folder) {
      formData.append("folder", options.folder);
    }

    return apiClient.post("/uploads/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
/** Order API (user app – Bearer USER token). Minimal calls: single create/verify, list/details cached by caller. */
export const orderAPI = {
  calculateOrder: (payload) =>
    apiClient.post("/food/orders/calculate", payload ?? {}, {
      contextModule: "user",
    }),
  createOrder: (payload) =>
    apiClient.post("/food/orders", payload ?? {}, { contextModule: "user" }),
  verifyPayment: (body) =>
    apiClient.post("/food/orders/verify-payment", body ?? {}, {
      contextModule: "user",
    }),
  verifyOtp: (orderId, otp) =>
    apiClient.post(`/food/orders/${String(orderId)}/verify-otp`, { otp }, { contextModule: "user" }),
  getOrders: (params = {}) =>
    apiClient
      .get("/food/orders", {
        params: { limit: 20, page: 1, ...params },
        contextModule: "user",
      })
      .then((res) => {
        const payload = res?.data?.data;

        // Normalize backend paginated shape:
        // { data: { data: [...], meta: { total, page, limit, totalPages } } }
        // into UI-friendly:
        // { data: { orders: [...], pagination: { total, page, limit, pages } } }
        if (
          payload &&
          typeof payload === "object" &&
          Array.isArray(payload.data) &&
          payload.meta &&
          typeof payload.meta === "object"
        ) {
          const meta = payload.meta;
          return {
            ...res,
            data: {
              ...res.data,
              data: {
                ...payload,
                orders: payload.data,
                pagination: {
                  total: Number(meta.total || 0),
                  page: Number(meta.page || 1),
                  limit: Number(meta.limit || params.limit || 20),
                  pages: Number(meta.totalPages || 1),
                },
              },
            },
          };
        }

        return res;
      }),
  getOrderDetails: (() => {
    const inFlight = new Map();
    const cache = new Map();
    /** Dedupes overlapping calls (StrictMode, poll + socket) without hiding fresh data for long. */
    const CACHE_MS = 800;

    return (orderId, options = {}) => {
      const key = String(orderId ?? "").trim();
      if (!key) {
        return Promise.reject(new Error("orderId required"));
      }

      const force = options.force === true;
      const now = Date.now();
      if (!force) {
        const hit = cache.get(key);
        if (hit && now - hit.at < CACHE_MS) {
          return Promise.resolve(hit.res);
        }
      }

      const pending = inFlight.get(key);
      if (pending) return pending;

      const p = apiClient
        .get(`/food/orders/${key}`, { contextModule: "user" })
        .then((res) => {
          cache.set(key, { at: Date.now(), res });
          return res;
        })
        .finally(() => {
          inFlight.delete(key);
        });

      inFlight.set(key, p);
      return p;
    };
  })(),
  cancelOrder: (orderId, body = {}) =>
    apiClient.patch(`/food/orders/${String(orderId)}/cancel`, body ?? {}, {
      contextModule: "user",
    }),
  updateOrderInstructions: (orderId, instructions) =>
    apiClient.patch(`/food/orders/${String(orderId)}/instructions`, { instructions }, {
      contextModule: "user",
    }),
  submitOrderRatings: (orderId, body = {}) =>
    apiClient.patch(`/food/orders/${String(orderId)}/ratings`, body ?? {}, { contextModule: "user" }),
  /** Submit a complaint for an order (user). */
  submitComplaint: (payload) =>
    apiClient.post(
      "/food/user/support/ticket",
      {
        type: "order",
        orderId: payload.orderId,
        issueType: payload.complaintType,
        description: payload.subject ? `${payload.subject}: ${payload.description}` : payload.description,
      },
      { contextModule: "user" }
    ),
};

const DINING_BOOKINGS_STORAGE_KEY = "food_dining_bookings_v1";
const safeJsonParse = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const getStoredBookings = () => {
  if (typeof localStorage === "undefined") return [];
  const parsed = safeJsonParse(
    localStorage.getItem(DINING_BOOKINGS_STORAGE_KEY) || "[]",
    [],
  );
  return Array.isArray(parsed) ? parsed : [];
};

const saveStoredBookings = (bookings) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    DINING_BOOKINGS_STORAGE_KEY,
    JSON.stringify(Array.isArray(bookings) ? bookings : []),
  );
};

const getStoredModuleUser = (module) => {
  if (typeof localStorage === "undefined") return null;
  const parsed = safeJsonParse(
    localStorage.getItem(`${module}_user`) || "null",
    null,
  );
  return parsed && typeof parsed === "object" ? parsed : null;
};

const normalizeName = (restaurant) =>
  restaurant?.name || restaurant?.restaurantName || "Restaurant";

const normalizeRestaurantShape = (restaurant) => {
  if (!restaurant || typeof restaurant !== "object") return null;
  return {
    _id: restaurant?._id || restaurant?.id || null,
    id: restaurant?.id || restaurant?._id || null,
    restaurantId: restaurant?.restaurantId || restaurant?._id || restaurant?.id || null,
    restaurantNameNormalized:
      restaurant?.restaurantNameNormalized || restaurant?.slug || "",
    slug: restaurant?.slug || "",
    name: normalizeName(restaurant),
    restaurantName: restaurant?.restaurantName || normalizeName(restaurant),
    profileImage: restaurant?.profileImage || null,
    coverImages: Array.isArray(restaurant?.coverImages)
      ? restaurant.coverImages
      : [],
    menuImages: Array.isArray(restaurant?.menuImages) ? restaurant.menuImages : [],
    image:
      restaurant?.coverImages?.[0]?.url ||
      restaurant?.coverImages?.[0] ||
      restaurant?.menuImages?.[0]?.url ||
      restaurant?.menuImages?.[0] ||
      restaurant?.image ||
      restaurant?.profileImage?.url ||
      (typeof restaurant?.profileImage === "string"
        ? restaurant.profileImage
        : ""),
    location: restaurant?.location || null,
  };
};

const collectRestaurantBookingKeys = (candidate) => {
  if (!candidate) return [];

  const raw =
    typeof candidate === "object"
      ? candidate
      : { _id: candidate, id: candidate, restaurantId: candidate };

  // Pull values from current object and nested restaurant object
  const values = [
    raw?._id,
    raw?.id,
    raw?.restaurantId,
    raw?.slug,
    raw?.name,
    raw?.restaurantName,
    raw?.restaurantNameNormalized,

    // Check nested restaurant object if it exists
    raw?.restaurant?._id,
    raw?.restaurant?.id,
    raw?.restaurant?.restaurantId,
    raw?.restaurant?.slug,
    raw?.restaurant?.name,
    raw?.restaurant?.restaurantName,
    raw?.restaurant?.restaurantNameNormalized,

    // Check restaurantRef if it exists
    raw?.restaurantRef?._id,
    raw?.restaurantRef?.id,
    raw?.restaurantRef?.restaurantId,
    raw?.restaurantRef?.slug,
    raw?.restaurantRef?.name,
  ];

  return Array.from(
    new Set(
      values
        .map((value) => {
          if (value === null || value === undefined) return "";
          if (typeof value === "object") return value._id || value.id || "";
          // Case-insensitive matching for local dev robustness
          return String(value).trim().toLowerCase();
        })
        .filter(Boolean),
    ),
  );
};

const buildLocalBookingId = () =>
  `dbook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const buildDisplayBookingId = () => `TB${Date.now().toString().slice(-8)}`;

const getCurrentUserForBookings = async () => {
  const storedUser = getStoredModuleUser("user");
  if (storedUser) return storedUser;

  try {
    const me = await getUserMeOnce();
    return me?.data?.data?.user || me?.data?.user || me?.data?.data || null;
  } catch {
    return null;
  }
};

const normalizeBookingUser = (candidate) => {
  if (!candidate || typeof candidate !== "object") return null;
  const name = String(candidate?.name || candidate?.fullName || "").trim();
  const phone = String(
    candidate?.phone || candidate?.mobile || candidate?.phoneNumber || "",
  ).trim();
  const email = String(candidate?.email || "").trim();

  return {
    _id: candidate?._id || candidate?.id || null,
    id: candidate?.id || candidate?._id || null,
    name,
    phone,
    email,
  };
};

const byLatest = (a, b) =>
  new Date(b?.createdAt || b?.date || 0).getTime() -
  new Date(a?.createdAt || a?.date || 0).getTime();

export const diningAPI = {
  getCategories: (params = {}) =>
    apiClient.get("/food/dining/categories/public", { params }),
  getRestaurants: (params = {}) =>
    apiClient.get("/food/dining/restaurants/public", { params }),
  getHeroBanners: () => apiClient.get("/food/hero-banners/dining/public"),
  getRestaurantBySlug: (slug) =>
    apiClient.get(`/food/restaurant/restaurants/${String(slug)}`),
  getOfferBanners: () => Promise.resolve({ data: { success: true, data: [] } }),
  getStories: () => Promise.resolve({ data: { success: true, data: [] } }),
  getBankOffers: () => Promise.resolve({ data: { success: true, data: [] } }),
  getBookings: () => apiClient.get("/food/dining/bookings", {
    contextModule: 'user'
  }),
  getRestaurantBookings: (restaurantRef) => {
    const idOrSlug = restaurantRef?._id || restaurantRef?.id || restaurantRef?.restaurantId || (typeof restaurantRef === 'string' ? restaurantRef : '');
    const isRestaurantPortal = typeof window !== 'undefined' && window.location.pathname.includes('/restaurant');
    return apiClient.get(`/food/dining/bookings/by-restaurant/${idOrSlug}`, {
      contextModule: isRestaurantPortal ? 'restaurant' : 'user'
    });
  },
  updateBookingStatusRestaurant: (bookingId, status) =>
    apiClient.patch(`/food/dining/bookings/${bookingId}/status`, { status }, {
      contextModule: 'restaurant'
    }),
  createReview: (payload = {}) => {
    const bookingId = payload?.bookingId;
    return apiClient.post(`/food/dining/bookings/${bookingId}/review`, {
      rating: payload?.rating,
      comment: payload?.comment
    }, {
      contextModule: 'user'
    });
  },
  createBooking: (payload = {}) =>
    apiClient.post("/food/dining/bookings", payload, {
      contextModule: 'user'
    }),
};
export const heroBannerAPI = createStubAPI();
export const publicAPI = createStubAPI();
