import { PERMISSION_REGISTRY } from "../../../config/permissions.registry";

/**
 * Maps a given URL pathname to the required module-level permission
 * @param {string} path - The frontend URL path (e.g. '/admin/food/categories')
 * @returns {Object|null} - The mapped permission object { module, action } or null
 */
export function getRequiredPermissionForPath(path) {
  const cleanPath = path.split('?')[0].replace(/\/$/, '');

  if (cleanPath === '/admin/food' || cleanPath === '/admin/food/') {
    return { module: 'dashboard', action: 'view' };
  }
  if (cleanPath === '/admin/food/point-of-sale') {
    return { module: 'orders', action: 'view' };
  }
  if (cleanPath === '/admin/food/food-approval') {
    return { module: 'restaurants', action: 'approve' };
  }
  if (cleanPath.startsWith('/admin/food/foods') || cleanPath.startsWith('/admin/food/addons')) {
    return { module: 'restaurants', action: 'view' };
  }
  if (cleanPath.startsWith('/admin/food/categories')) {
    return { module: 'settings', action: 'view' };
  }
  if (cleanPath === '/admin/food/restaurants') {
    return { module: 'restaurants', action: 'view' };
  }
  if (cleanPath === '/admin/food/restaurants/joining-request') {
    return { module: 'restaurants', action: 'view' };
  }
  if (cleanPath === '/admin/food/restaurants/commission') {
    return { module: 'restaurants', action: 'view' };
  }
  if (cleanPath === '/admin/food/restaurants/reviews') {
    return { module: 'restaurants', action: 'reviews' };
  }
  if (cleanPath === '/admin/food/restaurants/complaints') {
    return { module: 'settings', action: 'view' };
  }

  if (cleanPath.startsWith('/admin/food/orders') || cleanPath.startsWith('/admin/food/order-refunds')) {
    return { module: 'orders', action: 'view' };
  }

  if (cleanPath.startsWith('/admin/food/coupons')) {
    return { module: 'coupons', action: 'view' };
  }
  if (cleanPath.startsWith('/admin/food/referral-settings')) {
    return { module: 'settings', action: 'view' };
  }
  if (cleanPath.startsWith('/admin/food/customers')) {
    return { module: 'users', action: 'view' };
  }
  if (cleanPath.startsWith('/admin/food/support-tickets') || cleanPath.startsWith('/admin/food/contact-messages') || cleanPath.startsWith('/admin/food/safety-emergency-reports')) {
    return { module: 'settings', action: 'view' };
  }

  if (cleanPath.startsWith('/admin/food/transaction-report') ||
      cleanPath.startsWith('/admin/food/order-report') ||
      cleanPath.startsWith('/admin/food/tax-report') ||
      cleanPath.startsWith('/admin/food/restaurant-report') ||
      cleanPath.startsWith('/admin/food/customer-report')) {
    return { module: 'reports', action: 'view' };
  }

  if (cleanPath.startsWith('/admin/food/restaurant-withdraws')) {
    return { module: 'restaurants', action: 'withdrawals' };
  }
  if (cleanPath.startsWith('/admin/food/hero-banner-management') || cleanPath.startsWith('/admin/food/dining-management')) {
    return { module: 'settings', action: 'view' };
  }
  if (cleanPath.startsWith('/admin/food/dining-list') || cleanPath.startsWith('/admin/food/dining-requests')) {
    return { module: 'restaurants', action: 'view' };
  }

  if (cleanPath.startsWith('/admin/food/broadcast-notification')) {
    return { module: 'notifications', action: 'view' };
  }

  if (cleanPath.startsWith('/admin/food/business-setup') ||
      cleanPath.startsWith('/admin/food/customization-settings') ||
      cleanPath.startsWith('/admin/food/driving-mode-settings') ||
      cleanPath.startsWith('/admin/food/pages-social-media')) {
    return { module: 'settings', action: 'view' };
  }

  if (cleanPath.startsWith('/admin/food/archived-accounts')) {
    return { module: 'users', action: 'view' };
  }
  if (cleanPath.startsWith('/admin/food/sub-admins')) {
    return { module: 'subAdmins', action: 'view' };
  }

  return null; // Route is open by default
}

/**
 * Checks if the current user has permission to access the given frontend path
 * @param {Object} user - The current logged in admin user object
 * @param {string} path - The target URL path
 * @returns {boolean} - True if access is permitted
 */
export function hasPathPermission(user, path) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true; // Super Admin always bypasses all checks

  const reqPerm = getRequiredPermissionForPath(path);
  if (!reqPerm) return true; // No permission rules mapped, let it through

  const permissions = user.permissions || {};
  const modulePerms = permissions[reqPerm.module] || {};
  return modulePerms[reqPerm.action] === true;
}

/**
 * Checks if the user has permission to perform a specific action inside a module
 * @param {Object} user - The current logged in admin user object
 * @param {string} module - The target module name (e.g. 'orders')
 * @param {string} action - The action name (e.g. 'cancel')
 * @returns {boolean} - True if permitted
 */
export function hasModulePermission(user, module, action) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true; // Super Admin always bypasses all checks

  const permissions = user.permissions || {};
  const modulePerms = permissions[module] || {};
  return modulePerms[action] === true;
}
