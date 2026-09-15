const ActivityLog = require('../models/ActivityLog');
const logger = require('../config/logger');

/**
 * Fire-and-forget-safe audit logging. A failure here must never break
 * the primary operation (e.g. a task update shouldn't fail because the
 * audit log write failed) — but we do log the failure loudly since a
 * silent audit-log gap is itself a problem worth knowing about.
 */
async function logActivity({ projectId, actor, action, entityType, entityId, previousValue = null, newValue = null }) {
  try {
    await ActivityLog.create({ projectId, actor, action, entityType, entityId, previousValue, newValue });
  } catch (err) {
    logger.error(`[ActivityLog] Failed to record ${action} on ${entityType}:${entityId} - ${err.message}`);
  }
}

module.exports = { logActivity };
