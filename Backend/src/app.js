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

app.set('trust proxy', 1);
app.use(requestIdMiddleware);

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

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } },
    hsts: config.nodeEnv === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const allowedOrigins = new Set(config.corsOrigins);

app.use(cors({
    origin(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.has(origin) || localhostPattern.test(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
}));
// app.use(morgan('dev'));
app.use(express.json({
    limit: '15mb',
    verify: (req, res, buf) => {
        if (req.originalUrl && req.originalUrl.includes('/webhook/razorpay')) {
            req.rawBody = buf;
        }
    }
}));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

app.use((req, _res, next) => {
    req.body = mongoSanitize(req.body);
    req.query = mongoSanitize(req.query);
    req.params = mongoSanitize(req.params);
    next();
});
app.use(xssClean());

const storageRoot = path.resolve(config.storageDir);
app.use('/uploads', express.static(storageRoot));
app.use('/images', express.static(storageRoot));

app.use('/api', apiRateLimiter);
// app.use('/api', responseTimeLogger);

app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
        const baseUrl = config.baseUrl;

        const transformMediaUrls = (obj) => {
            if (!obj) return obj;

            if (typeof obj === 'string') {
                if (obj.startsWith('/uploads/') || obj.startsWith('/images/')) {
                    return `${baseUrl}${obj}`;
                }
                if (obj.includes('localhost:5000/uploads/') && baseUrl !== 'http://localhost:5000') {
                    return obj.replace(/https?:\/\/localhost:5000\/uploads\//g, `${baseUrl}/uploads/`);
                }
                if (obj.includes('localhost:5000/images/') && baseUrl !== 'http://localhost:5000') {
                    return obj.replace(/https?:\/\/localhost:5000\/images\//g, `${baseUrl}/images/`);
                }
                return obj;
            }

            if (Array.isArray(obj)) {
                return obj.map(transformMediaUrls);
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
                    newObj[key] = transformMediaUrls(doc[key]);
                }
                return newObj;
            }

            return obj;
        };

        const transformedBody = transformMediaUrls(body);
        return originalJson.call(this, transformedBody);
    };
    next();
});

app.use('/api', routes);
app.use(errorHandler);

export default app;
