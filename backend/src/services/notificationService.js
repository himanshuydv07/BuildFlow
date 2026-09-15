const Notification = require('../models/Notification');
const logger = require('../config/logger');

/**
 * Creates a notification and (if a socket.io server has been attached
 * via setSocketServer) emits it in real time to that user's room.
 * See src/app.js / src/server.js for socket wiring.
 */
let io = null;
function setSocketServer(socketServer) {
  io = socketServer;
}

async function notify({ user, type, message, entityType, entityId, projectId = null }) {
  try {
    const notification = await Notification.create({ user, type, message, entityType, entityId, projectId });

    if (io) {
      io.to(`user:${user.toString()}`).emit('notification:new', {
        id: notification._id,
        type: notification.type,
        message: notification.message,
        entityType: notification.entityType,
        entityId: notification.entityId,
        projectId: notification.projectId,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  } catch (err) {
    logger.error(`[Notification] Failed to create ${type} for user ${user}: ${err.message}`);
    return null;
  }
}

/** Convenience for notifying several users at once (e.g. all project admins). */
async function notifyMany(userIds, payload) {
  return Promise.all(userIds.map((user) => notify({ ...payload, user })));
}

/** Emits an event to everyone currently viewing a given project (real-time task/comment updates). */
function emitToProject(projectId, event, payload) {
  if (io) {
    io.to(`project:${projectId.toString()}`).emit(event, payload);
  }
}

module.exports = { notify, notifyMany, setSocketServer, emitToProject };
