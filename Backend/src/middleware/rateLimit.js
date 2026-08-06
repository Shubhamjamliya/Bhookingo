import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

// Global bypass if RATE_LIMIT_ENABLED is explicitly false
const skipRateLimiter = (req, res, next) => {
    if (!config.rateLimitEnabled) {
        return next();
    }
    return false;
};

// 1. Auth Rate Limiter (Category A)
// Protects authentication endpoints (login, OTP) from brute force attacks.
export const authRateLimiter = (req, res, next) => {
    if (!config.rateLimitEnabled) return next();
    
    return rateLimit({
        windowMs: config.authRateLimitWindowMinutes * 60 * 1000,
        max: config.nodeEnv === 'development' ? Math.max(config.authRateLimitMax, 100) : config.authRateLimitMax,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            message: 'Too many authentication attempts. Please try again later.'
        }
    })(req, res, next);
};

// 2. Private Rate Limiter (Category C)
// Protects authenticated endpoints. Groups limits by User ID + Client IP to prevent shared NAT blocking.
export const privateRateLimiter = (req, res, next) => {
    if (!config.rateLimitEnabled) return next();
    
    return rateLimit({
        windowMs: config.rateLimitWindowMinutes * 60 * 1000,
        max: config.nodeEnv === 'development' ? config.rateLimitDevMax : config.rateLimitMax,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => {
            // Combine User ID and the Real Client IP detected by Trust Proxy
            const userId = req.user?.userId || 'anonymous';
            const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
            return `${userId}:${clientIp}`;
        },
        message: {
            success: false,
            message: 'Too many requests. Please try again later.'
        }
    })(req, res, next);
};
