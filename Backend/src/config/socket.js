import { Server } from 'socket.io';
import { config } from './env.js';
import { logger } from '../utils/logger.js';
import { verifyAccessToken } from '../core/auth/token.util.js';
import { getFirebaseDB } from './firebase.js';

let io = null;



function getTokenFromHandshake(socket) {
    const authToken = socket?.handshake?.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) return authToken.trim();
    const header = socket?.handshake?.headers?.authorization || socket?.handshake?.headers?.Authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) return header.substring(7).trim();
    const queryToken = socket?.handshake?.query?.token;
    if (typeof queryToken === 'string' && queryToken.trim()) return queryToken.trim();
    return null;
}

function maskToken(token) {
    if (!token || typeof token !== 'string') return null;
    const trimmed = token.trim();
    if (!trimmed) return null;
    return `${trimmed.slice(0, 12)}...${trimmed.slice(-6)}`;
}

const roomNames = {
    restaurant: (id) => `restaurant:${String(id)}`,
    user: (id) => `user:${String(id)}`,

    tracking: (orderId) => `tracking:${String(orderId)}`
};

/**
 * Initializes Socket.IO with the provided HTTP server.
 * When REDIS_ENABLED=true and REDIS_URL is set, attaches Redis adapter for horizontal scaling.
 * @param {import('http').Server} server
 * @returns {Promise<Server>}
 */
export const initSocket = async (server) => {
    io = new Server(server, {
        cors: {
            origin: config.socketCorsOrigin,
            methods: ['GET', 'POST']
        }
    });

    // Socket auth middleware (Bearer token).
    io.use((socket, next) => {
        try {
            const token = getTokenFromHandshake(socket);
            if (!token) {
                logger.warn(`Socket auth failed: token missing for socket ${socket.id}`, {
                    host: socket?.handshake?.headers?.host || null,
                    userAgent: socket?.handshake?.headers?.['user-agent'] || null,
                    hasAuthToken: Boolean(socket?.handshake?.auth?.token),
                    hasAuthorizationHeader: Boolean(
                        socket?.handshake?.headers?.authorization || socket?.handshake?.headers?.Authorization
                    ),
                    hasQueryToken: Boolean(socket?.handshake?.query?.token),
                });
                return next(new Error('AUTH_MISSING'));
            }

            const decoded = verifyAccessToken(token);
            socket.user = { userId: decoded.userId, role: decoded.role };
            // logger.info(`Socket auth success: ${decoded.role}:${decoded.userId} for socket ${socket.id}`);
            return next();
        } catch (err) {
            logger.error(`Socket auth failed for socket ${socket.id}: ${err.message}`, {
                host: socket?.handshake?.headers?.host || null,
                transport: socket?.handshake?.query?.transport || null,
                tokenPreview: maskToken(getTokenFromHandshake(socket)),
                errorMessage: err.message,
                errorName: err.name || null,
            });
            return next(new Error('AUTH_INVALID'));
        }
    });

    if (config.redisEnabled && config.redisUrl) {
        try {
            const { createAdapter } = await import('@socket.io/redis-adapter');
            const { createClient } = await import('redis');
            const pubClient = createClient({ url: config.redisUrl });
            const subClient = pubClient.duplicate();
            pubClient.on('error', (err) => logger.error(`Socket.IO Redis pub client: ${err.message}`));
            subClient.on('error', (err) => logger.error(`Socket.IO Redis sub client: ${err.message}`));
            await Promise.all([pubClient.connect(), subClient.connect()]);
            io.adapter(createAdapter(pubClient, subClient));
            logger.info('Socket.IO Redis adapter attached for horizontal scaling');
        } catch (err) {
            logger.warn(`Socket.IO Redis adapter skipped (using in-memory): ${err.message}`);
        }
    }

    io.on('connection', (socket) => {
        const userId = socket.user?.userId;
        const role = socket.user?.role;
        // logger.info(`Socket client connected: ${socket.id} (${role || 'UNKNOWN'}:${userId || '-'})`);

        // Auto-join role rooms (lets us emit without a custom join).
        if (userId && role) {
            if (role === 'RESTAURANT') socket.join(roomNames.restaurant(userId));
            if (role === 'USER') socket.join(roomNames.user(userId));

        }

        // Explicit join (used by existing restaurant client hook).
        socket.on('join-restaurant', (restaurantId) => {
            if (socket.user?.role !== 'RESTAURANT') return;
            // Security: only join your own restaurant room.
            if (String(socket.user?.userId) !== String(restaurantId)) return;
            socket.join(roomNames.restaurant(restaurantId));
            socket.emit('restaurant-room-joined', { room: roomNames.restaurant(restaurantId), restaurantId: String(restaurantId) });
        });



        // ─── Live Tracking Events ───────────────────────────────────────

        // Users / restaurants subscribe to an order's real-time tracking room.
        socket.on('join-tracking', (orderId) => {
            if (!orderId) return;
            const role = socket.user?.role;
            if (role !== 'USER' && role !== 'RESTAURANT') return;
            const room = roomNames.tracking(orderId);
            socket.join(room);
            // logger.info(`Socket ${socket.id} (${role}:${userId}) joined tracking room ${room}`);
            socket.emit('tracking-room-joined', { room, orderId: String(orderId) });
        });



        // Leave tracking room on user navigation away.
        socket.on('leave-tracking', (orderId) => {
            if (!orderId) return;
            const room = roomNames.tracking(orderId);
            socket.leave(room);
        });

        socket.on('disconnect', () => {
            // logger.info(`Socket client disconnected: ${socket.id}`);

        });

        // 🆕 Resync State on Reconnect
        socket.on('resync', async () => {
          try {
            const { resyncState } = await import('../modules/food/orders/services/order.service.js');
            const state = await resyncState(userId, role);
            if (state.activeOrder) {
              const eventName = role === 'USER' ? 'order_state' : 'active_order';
              socket.emit(eventName, state.activeOrder);
            }
            socket.emit('resync_complete', { timestamp: Date.now() });
          } catch (err) {
            logger.error(`Resync failed for ${role}:${userId} — ${err.message}`);
          }
        });
    });

    logger.info('Socket.IO infrastructure initialized');
    return io;
};

/**
 * Returns the initialized Socket.IO instance.
 * @returns {Server | null}
 */
export const getIO = () => {
    if (!io) {
        logger.warn('Socket.IO not initialized');
    }
    return io;
};

export const rooms = roomNames;
