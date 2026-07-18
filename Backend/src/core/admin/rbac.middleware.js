import { sendError } from '../../utils/response.js';

/**
 * Express middleware to enforce module and action level permissions
 * @param {string} module - The target module name (e.g. 'orders')
 * @param {string} action - The target action (e.g. 'view')
 */
export const requirePermission = (module, action) => {
    return (req, res, next) => {
        if (!req.user) {
            return sendError(res, 401, 'Authentication required');
        }

        // Super Admin bypass
        if (req.user.role === 'ADMIN') {
            return next();
        }

        if (req.user.role === 'SUB_ADMIN') {
            const permissions = req.user.permissions || {};
            const modulePerms = permissions[module] || {};
            if (modulePerms[action] === true) {
                return next();
            }
        }

        return sendError(res, 403, `Access Denied: Insufficient permissions for ${module} -> ${action}`);
    };
};

/**
 * Dynamic RBAC middleware that intercepts and checks permissions based on API route mapping
 */
export const dynamicRbacMiddleware = (req, res, next) => {
    if (!req.user) {
        return sendError(res, 401, 'Authentication required');
    }

    // Super Admin bypass
    if (req.user.role === 'ADMIN') {
        return next();
    }

    const permissions = req.user.permissions || {};
    const path = req.path.toLowerCase();
    const method = req.method;

    // Helper function to check specific permission path
    const check = (module, action) => {
        const modulePerms = permissions[module] || {};
        if (modulePerms[action] === true) {
            return next();
        }
        return sendError(res, 403, `Access Denied: Insufficient permissions for ${module} -> ${action}`);
    };

    // --- Dynamic Route Mappings ---

    // 1. Dashboard Stats
    if (path.startsWith('/dashboard-stats')) {
        return check('dashboard', 'view');
    }

    // 2. Notifications
    if (path.startsWith('/notifications')) {
        if (method === 'GET') return check('notifications', 'view');
        return check('notifications', 'send');
    }

    // 3. Customers (Users)
    if (path.startsWith('/customers')) {
        if (method === 'GET') return check('users', 'view');
        if (method === 'PATCH' && path.includes('/status')) return check('users', 'suspend');
        return check('users', 'edit');
    }

    // 4. Complaints, Support Tickets, Emergency Reports
    if (path.startsWith('/support-tickets') || path.startsWith('/safety-emergency-reports') || path.startsWith('/restaurants/complaints') || path.startsWith('/contact-messages')) {
        if (method === 'GET') return check('settings', 'view');
        return check('settings', 'edit');
    }

    // 5. Restaurants & Withdrawals
    if (path.startsWith('/restaurants')) {
        if (path.startsWith('/restaurants/reviews')) {
            return check('restaurants', 'reviews');
        }
        if (path.includes('/approve')) {
            return check('restaurants', 'approve');
        }
        if (path.includes('/reject')) {
            return check('restaurants', 'reject');
        }
        if (path.includes('/status')) {
            return check('restaurants', 'suspend');
        }
        if (method === 'GET') return check('restaurants', 'view');
        return check('restaurants', 'edit');
    }

    if (path.startsWith('/restaurant-commissions')) {
        if (method === 'GET') return check('restaurants', 'view');
        return check('restaurants', 'edit');
    }

    if (path.startsWith('/withdrawals')) {
        return check('restaurants', 'withdrawals');
    }

    // 6. Categories (Settings)
    if (path.startsWith('/categories')) {
        if (method === 'GET') return check('settings', 'view');
        return check('settings', 'edit');
    }

    // 7. Foods & Add-ons (Restaurants/Settings)
    if (path.startsWith('/foods') || path.startsWith('/addons')) {
        if (path.includes('/approve') || path.includes('/reject')) {
            return check('restaurants', 'approve');
        }
        if (method === 'GET') return check('restaurants', 'view');
        return check('restaurants', 'edit');
    }

    // 8. Offers & Coupons
    if (path.startsWith('/offers') || path.startsWith('/coupons')) {
        if (method === 'GET') return check('coupons', 'view');
        if (method === 'POST') return check('coupons', 'create');
        if (method === 'DELETE') return check('coupons', 'delete');
        return check('coupons', 'edit');
    }

    // 9. Feedback experiences, fee settings, referral, driving mode, customization
    if (path.startsWith('/feedback-experiences') || path.startsWith('/fee-settings') || path.startsWith('/referral-settings') || path.startsWith('/business-settings') || path.startsWith('/driving-mode') || path.startsWith('/customization-settings') || path.startsWith('/pages-social-media')) {
        if (method === 'GET') return check('settings', 'view');
        return check('settings', 'edit');
    }

    // 10. Archived Accounts
    if (path.startsWith('/archived-accounts')) {
        return check('users', 'view');
    }

    // 11. Highways & settings
    if (path.startsWith('/highways') || path.startsWith('/highway-settings')) {
        if (method === 'GET') return check('settings', 'view');
        return check('settings', 'edit');
    }

    // 12. Dining setup
    if (path.startsWith('/dining')) {
        if (method === 'GET') return check('restaurants', 'view');
        return check('restaurants', 'edit');
    }

    // 13. Orders
    if (path.startsWith('/orders') || path.startsWith('/order-refunds')) {
        if (method === 'GET') return check('orders', 'view');
        if (path.includes('/accept') || path.includes('/reject')) return check('orders', 'edit');
        if (method === 'DELETE') return check('orders', 'cancel');
        return check('orders', 'edit');
    }

    // 14. Reports
    if (path.startsWith('/reports') || path.startsWith('/disbursement-report')) {
        if (method === 'GET') return check('reports', 'view');
        return check('reports', 'export');
    }

    // 15. Sub-Admins Management
    if (path.startsWith('/sub-admins')) {
        if (path.includes('/reset-password')) return check('subAdmins', 'reset_password');
        if (method === 'GET') return check('subAdmins', 'view');
        if (method === 'POST') return check('subAdmins', 'create');
        if (method === 'DELETE') return check('subAdmins', 'delete');
        return check('subAdmins', 'edit');
    }

    // Fallback: allow by default if not strictly matched
    return next();
};
