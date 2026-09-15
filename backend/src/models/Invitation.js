const mongoose = require('mongoose');
const { ROLES } = require('./ProjectMember');

const invitationSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Invitations are sent by email so a not-yet-registered user can
    // still be invited; invitedUserId is filled in once/if that email
    // matches (or later registers) an account.
    email: { type: String, required: true, lowercase: true, trim: true },
    invitedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    role: { type: String, enum: ROLES.filter((r) => r !== 'OWNER'), required: true, default: 'MEMBER' },

    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },

    tokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Prevent duplicate ACTIVE (pending) invitations to the same email for
// the same project — application logic enforces this at write time
// since partial-uniqueness on status requires a partial index.
invitationSchema.index(
  { projectId: 1, email: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } }
);

module.exports = mongoose.model('Invitation', invitationSchema);
