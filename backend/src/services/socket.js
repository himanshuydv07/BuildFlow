const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/tokens');
const logger = require('../config/logger');
const env = require('../config/env');

/**
 * Real-time layer. Genuinely event-driven (Socket.IO push), not polling.
 * Clients authenticate the socket handshake with the same short-lived
 * access token used for REST calls, then are placed in a private room
 * `user:<id>` so notificationService.notify() can push to them directly.
 *
 * If a client also wants live task/comment updates for a project they
 * are viewing, they emit "project:join" with a projectId; the server
 * verifies active membership before adding them to that room.
 */
function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = verifyAccessToken(token);
      socket.userId = payload.sub;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    logger.debug(`[Socket] User ${socket.userId} connected (${socket.id})`);

    socket.on('project:join', async (projectId) => {
      try {
        const membershipService = require('../services/membershipService');
        const membership = await membershipService.getMembership(socket.userId, projectId);
        if (membership) {
          socket.join(`project:${projectId}`);
        }
      } catch (err) {
        logger.warn(`[Socket] project:join failed: ${err.message}`);
      }
    });

    socket.on('project:leave', (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`[Socket] User ${socket.userId} disconnected (${socket.id})`);
    });
  });

  return io;
}

module.exports = { initSocketServer };
