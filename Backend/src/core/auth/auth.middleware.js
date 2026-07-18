import { verifyAccessToken } from './token.util.js';
import { sendError } from '../../utils/response.js';
import { FoodUser } from '../users/user.model.js';
import { FoodRefreshToken } from '../refreshTokens/refreshToken.model.js';
import mongoose from 'mongoose';

export const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'ADMIN') {
        return sendError(res, 403, 'Admin access required');
    }
    next();
};

export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
        return sendError(res, 401, 'Authentication token missing');
    }

    try {
        const decoded = verifyAccessToken(token);
        req.user = {
            userId: decoded.userId,
            role: decoded.role
        };

        // Globally enforce that the user has at least one active refresh token session.
        // If "logout from all devices" was triggered, ALL refresh tokens are deleted,
        // and this explicitly and instantly invalidates any lingering access tokens across all devices.
        const userObjectId = new mongoose.Types.ObjectId(decoded.userId);
        FoodRefreshToken.exists({ userId: userObjectId }).then((hasSession) => {
            if (!hasSession) {
                return sendError(res, 401, 'Session forcefully terminated on all devices');
            }

            if (decoded.role === 'USER') {
                // Enforce active status in real-time - deactivated users are logged out on next request.
                FoodUser.findById(decoded.userId).select('isActive').lean().then((doc) => {
                    if (!doc || doc.isActive === false) {
                        return sendError(res, 401, 'User account is deactivated');
                    }
                    next();
                }).catch(() => sendError(res, 401, 'Authentication failed'));
                return;
            }

            if (decoded.role === 'ADMIN' || decoded.role === 'SUB_ADMIN') {
                // Enforce active status and non-deleted status in real-time for sub-admins/admins
                mongoose.model('FoodAdmin').findById(decoded.userId).lean().then((doc) => {
                    if (!doc || doc.isDeleted === true) {
                        return sendError(res, 401, 'Admin account not found or deleted');
                    }
                    if (doc.status === 'suspended') {
                        return sendError(res, 401, 'Your account has been suspended. Please contact support.');
                    }
                    if (doc.status === 'inactive' || doc.isActive === false) {
                        return sendError(res, 401, 'Your account is inactive. Please contact the administrator.');
                    }
                    // Attach updated role and permissions to req.user for RBAC checking
                    req.user.role = doc.role || 'ADMIN';
                    req.user.permissions = doc.permissions || {};
                    next();
                }).catch(() => sendError(res, 401, 'Authentication failed'));
                return;
            }
            return next();
        }).catch(() => sendError(res, 401, 'Authentication failed'));
        return;
    } catch (error) {
        return sendError(res, 401, 'Invalid or expired token');
    }
};
