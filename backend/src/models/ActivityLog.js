const mongoose = require('mongoose');

// Immutable audit trail. Nothing in the application ever updates or
// deletes an ActivityLog document after creation — no route exposes
// that capability, including to Owners.
const activityLogSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true }, // e.g. "TASK_CREATED", "MEMBER_ROLE_CHANGED"
    entityType: { type: String, required: true }, // "PROJECT" | "TASK" | "MEMBER" | "MILESTONE" | ...
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    previousValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activityLogSchema.index({ projectId: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
