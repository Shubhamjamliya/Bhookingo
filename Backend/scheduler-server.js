import { config } from './src/config/env.js';
import { validateConfig } from './src/config/validateEnv.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import { logger } from './src/utils/logger.js';
import { expireExpiredOffers } from './src/modules/food/admin/services/admin.service.js';
import { syncExpiredFssaiNotifications } from './src/modules/food/restaurant/services/fssaiExpiry.service.js';

let expireOffersInterval = null;
let fssaiExpiryInterval = null;

const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received, starting graceful shutdown of Scheduler Server`);
    try {
        if (expireOffersInterval) clearInterval(expireOffersInterval);
        if (fssaiExpiryInterval) clearInterval(fssaiExpiryInterval);
        await disconnectDB();
        logger.info('Scheduler Server graceful shutdown complete');
        process.exit(0);
    } catch (err) {
        logger.error(`Scheduler Server shutdown error: ${err.message}`);
        process.exit(1);
    }
    setTimeout(() => {
        logger.error('Scheduler Server shutdown timeout, forcing exit');
        process.exit(1);
    }, 10000);
};

const startSchedulerServer = async () => {
    try {
        validateConfig();
        
        // Connect to Database
        await connectDB();

        logger.info(`Scheduler Server running in ${config.nodeEnv} mode`);

        // 1. Expire Offers Chron Job (Every 5 minutes)
        const runExpire = async () => {
            try {
                logger.info('Running cron job: expireExpiredOffers');
                await expireExpiredOffers();
            } catch (err) {
                logger.error(`Expire offers error: ${err.message}`);
            }
        };
        runExpire();
        expireOffersInterval = setInterval(runExpire, 5 * 60 * 1000);

        // 2. Sync FSSAI Expiry Chron Job (Every 1 hour)
        const runFssaiExpirySync = async () => {
            try {
                logger.info('Running cron job: syncExpiredFssaiNotifications');
                await syncExpiredFssaiNotifications();
            } catch (err) {
                logger.error(`FSSAI expiry sync error: ${err.message}`);
            }
        };
        runFssaiExpirySync();
        fssaiExpiryInterval = setInterval(runFssaiExpirySync, 60 * 60 * 1000);

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

        process.on('unhandledRejection', (err) => {
            logger.error(`Unhandled Rejection in Scheduler Server: ${err?.message || err}`);
        });

        process.on('uncaughtException', (err) => {
            logger.error(`Uncaught Exception in Scheduler Server: ${err?.message || err}`);
            process.exit(1);
        });

    } catch (error) {
        logger.error(`Error starting Scheduler Server: ${error.message}`);
        process.exit(1);
    }
};

startSchedulerServer();
