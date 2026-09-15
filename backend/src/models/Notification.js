const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'TASK_ASSIGNED',
  'TASK_STATUS_CHANGED',
  'MENTIONED_IN_COMMENT',
  'COMMENT_ADDED',
  'DEADLINE_APPROACHING',
  'TASK_OVERDUE',
  'MILESTONE_COMPLETED',
  'PROJECT_INVITATION',
  'ROLE_CHANGED',
  'PROJECT_UPDATE',
];

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    message: { type: String, required: true, maxlength: 300 },

    // Loosely-typed reference so one schema can point at a project,
    // task, comment, or invitation without a union of foreign keys.
    entityType: { type: String, enum: ['PROJECT', 'TASK', 'COMMENT', 'INVITATION', 'MILESTONE'], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },

    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
