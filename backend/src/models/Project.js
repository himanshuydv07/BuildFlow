const mongoose = require('mongoose');

const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'];
const PROJECT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 2000 },

    // ownerId is denormalized for fast reads, but the OWNER role in
    // ProjectMember remains the authoritative source of truth used by
    // authorization middleware. Ownership transfer updates both.
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    status: { type: String, enum: PROJECT_STATUSES, default: 'PLANNING' },
    priority: { type: String, enum: PROJECT_PRIORITIES, default: 'MEDIUM' },

    startDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },

    tags: [{ type: String, trim: true, maxlength: 30 }],
    icon: { type: String, default: '📁' },
    color: { type: String, default: '#6366F1' },

    isArchived: { type: Boolean, default: false },

    // KANBAN (default) keeps the simple board; SCRUM enables the
    // backlog/sprint/epic UI on top of the same underlying Task model.
    workflow: { type: String, enum: ['KANBAN', 'SCRUM'], default: 'KANBAN' },

    // Populated from a template at creation time (see services/templates.js).
    // Purely informational — does not change behavior after creation.
    templateKey: { type: String, default: null },

    // Denormalized member count avoids an extra query on every project
    // card in the workspace list. Kept in sync by membershipService.
    memberCount: { type: Number, default: 1 },
  },
  { timestamps: true }
);

projectSchema.index({ ownerId: 1, isArchived: 1 });
projectSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Project', projectSchema);
module.exports.PROJECT_STATUSES = PROJECT_STATUSES;
module.exports.PROJECT_PRIORITIES = PROJECT_PRIORITIES;
