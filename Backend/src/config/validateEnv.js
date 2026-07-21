import { config } from './env.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

/**
 * Validates required environment configuration on startup.
 * Logs clear errors and exits if critical variables are missing.
 */
export const validateConfig = () => {
    const missing = [];

    if (!config.mongodbUri) {
        missing.push('MONGO_URI or MONGODB_URI');
    }
    if (!config.jwtAccessSecret) {
        missing.push('JWT_ACCESS_SECRET or JWT_SECRET');
    }
    if (!config.jwtRefreshSecret) {
        missing.push('JWT_REFRESH_SECRET');
    }
    if (config.redisEnabled && !config.redisUrl) {
        missing.push('REDIS_URL (required when REDIS_ENABLED=true)');
    }
    if (config.bullmqEnabled && !config.redisEnabled) {
        missing.push('REDIS_ENABLED=true (required when BULLMQ_ENABLED=true)');
    }

    if (missing.length > 0) {
        logger.error(`Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }

    // Storage Directory verification, auto-creation and write permissions validation
    const storageDir = config.storageDir;
    try {
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }

        // Output resolved Storage Directory in exact layout requested
        console.log('\nStorage Directory:');
        console.log(storageDir.replace(/\\/g, '/')); // Normalize slashes for console/log readability
        console.log('');

        // Verify write access by writing a temporary file
        const testFile = path.join(storageDir, `.write-test-${Date.now()}.tmp`);
        fs.writeFileSync(testFile, 'test', 'utf8');
        fs.unlinkSync(testFile);
    } catch (err) {
        logger.error(`FATAL: Storage directory "${storageDir}" cannot be read or written to: ${err.message}`);
        process.exit(1);
    }
};
