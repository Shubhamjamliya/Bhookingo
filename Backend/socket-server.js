import http from 'http';
import express from 'express';
import { config } from './src/config/env.js';
import { validateConfig } from './src/config/validateEnv.js';
import { connectDB, disconnectDB } from './src/config/db.js';
import { initSocket } from './src/config/socket.js';
import { logger } from './src/utils/logger.js';
import { initializeFirebaseRealtime } from './src/config/firebase.js';

let server = null;

const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received, starting graceful shutdown of Socket Server`);
    if (!server) {
        process.exit(0);
        return;
    }
    server.close(async () => {
        try {
            await disconnectDB();
            logger.info('Socket Server graceful shutdown complete');
            process.exit(0);
        } catch (err) {
            logger.error(`Socket Server shutdown error: ${err.message}`);
            process.exit(1);
        }
    });
    setTimeout(() => {
        logger.error('Socket Server shutdown timeout, forcing exit');
        process.exit(1);
    }, 10000);
};

const startSocketServer = async () => {
    try {
        validateConfig();
        initializeFirebaseRealtime();

        // Database connection is required for auth token verification if it fetches users
        await connectDB();

        const app = express();
        
        // Healthcheck route for the socket server
        app.get('/health', (req, res) => res.json({ status: 'ok', service: 'socket-server' }));

        const httpServer = http.createServer(app);

        // Initialize Socket.IO with Redis Adapter
        await initSocket(httpServer);

        const port = config.socketPort || 5001;

        server = httpServer.listen(port, config.host, () => {
            logger.info(`Dedicated Socket Server running in ${config.nodeEnv} mode on ${config.host}:${port}`);
        });

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

        server.on('error', (err) => {
            logger.error(`Socket Server Error: ${err.message}`);
            process.exit(1);
        });

        process.on('unhandledRejection', (err) => {
            logger.error(`Unhandled Rejection in Socket Server: ${err?.message || err}`);
        });

        process.on('uncaughtException', (err) => {
            logger.error(`Uncaught Exception in Socket Server: ${err?.message || err}`);
        });

    } catch (error) {
        logger.error(`Error starting Socket Server: ${error.message}`);
        process.exit(1);
    }
};

startSocketServer();
