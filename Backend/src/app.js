import express from 'express';
import path from 'path';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'mongo-sanitize';
import xssClean from 'xss-clean';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { responseTimeLogger } from './middleware/responseTimeLogger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { healthCheck } from './config/health.js';
import { config } from './config/env.js';

const app = express();

// Trust first proxy (essential for express-rate-limit if behind a proxy)
app.set('trust proxy', 1);

// Request ID tracing (before other middlewares so all logs can use it)
app.use(requestIdMiddleware);

// Health endpoints (no rate limit, minimal JSON, no secrets)
app.get('/health', async (_req, res) => {
    try {
        const data = await healthCheck();
        res.status(200).json(data);
    } catch (err) {
        res.status(503).json({ status: 'DOWN', error: 'Health check failed' });
    }
});
app.get('/ready', (_req, res) => {
    res.status(200).json({ status: 'ready' });
});

// Security & parsing middlewares
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } },
    hsts: config.nodeEnv === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.use(cors({
    origin: ["http://localhost:5173"],
    credentials: true
}));
// app.use(morgan('dev'));
app.use(express.json({
    verify: (req, res, buf) => {
        // ✅ Store rawBody for signature verification (Razorpay Webhooks)
        if (req.originalUrl && req.originalUrl.includes('/webhook/razorpay')) {
            req.rawBody = buf;
        }
    }
}));
app.use(express.urlencoded({ extended: true }));

// Protect against NoSQL injection and XSS
app.use((req, _res, next) => {
    req.body = mongoSanitize(req.body);
    req.query = mongoSanitize(req.query);
    req.params = mongoSanitize(req.params);
    next();
});
app.use(xssClean());

// Serve processed images locally (useful for development)
app.use('/images', express.static(path.resolve(config.storageDir)));

// Global rate limiting for API routes
app.use('/api', apiRateLimiter);

// Optional: log API response time (method, path, status, duration) - no sensitive data
// app.use('/api', responseTimeLogger);

// Middleware to dynamically transform relative image paths in API responses to absolute URLs
app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
        const baseUrl = config.baseUrl;
        
        const transformImageUrls = (obj) => {
            if (!obj) return obj;

            if (typeof obj === 'string') {
                if (obj.startsWith('/images/')) {
                    return `${baseUrl}${obj}`;
                }
                // Also clean up any lingering localhost:5000 references if base URL is different
                if (obj.includes('localhost:5000/images/') && baseUrl !== 'http://localhost:5000') {
                    return obj.replace(/https?:\/\/localhost:5000\/images\//g, `${baseUrl}/images/`);
                }
                return obj;
            }

            if (Array.isArray(obj)) {
                return obj.map(transformImageUrls);
            }

            if (typeof obj === 'object') {
                if (obj instanceof Date) return obj;
                if (obj instanceof RegExp) return obj;
                if (mongoose.Types.ObjectId.isValid(obj)) return obj;
                if (Buffer.isBuffer(obj)) return obj;

                let doc = obj;
                if (obj.toObject && typeof obj.toObject === 'function') {
                    doc = obj.toObject();
                } else if (obj.toJSON && typeof obj.toJSON === 'function') {
                    doc = obj.toJSON();
                }
                
                const newObj = {};
                for (const key of Object.keys(doc)) {
                    newObj[key] = transformImageUrls(doc[key]);
                }
                return newObj;
            }

            return obj;
        };

        const transformedBody = transformImageUrls(body);
        return originalJson.call(this, transformedBody);
    };
    next();
});

// API Routes
app.use('/api', routes);

// Error Handling
app.use(errorHandler);

export default app;
