const mongoose = require('mongoose');

// This is the single most important model in the application.
// A user's permissions are ALWAYS resolved through this collection,
// scoped to a specific project — never through a global user role.
const ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];

// Ordering used for "can X manage a member with role Y" comparisons.
const ROLE_RANK = { OWNER: 4, ADMIN: 3, MEMBER: 2, VIEWER: 1 };

const projectMemberSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ROLES, required: true, default: 'MEMBER' },
    status: { type: String, enum: ['ACTIVE', 'REMOVED'], default: 'ACTIVE' },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// A user can only have ONE membership record per project. This is the
// database-level guarantee that prevents duplicate/conflicting roles.
projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });
projectMemberSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('ProjectMember', projectMemberSchema);
module.exports.ROLES = ROLES;
module.exports.ROLE_RANK = ROLE_RANK;
