const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// NOTE: This model intentionally has NO global "role: admin/member" field.
// All project-level permissions come from ProjectMember. A `systemRole`
// field is reserved ONLY for platform-administration purposes (e.g.
// support staff), and defaults to 'user' — it must never be checked by
// project-authorization logic.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false },
    avatarUrl: { type: String, default: null },
    bio: { type: String, maxlength: 280, default: '' },

    systemRole: { type: String, enum: ['user', 'platform_admin'], default: 'user' },

    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false, default: null },
    emailVerificationExpires: { type: Date, select: false, default: null },

    passwordResetTokenHash: { type: String, select: false, default: null },
    passwordResetExpires: { type: Date, select: false, default: null },

    // Incrementing this immediately invalidates all previously-issued
    // refresh tokens (used on password change / "log out everywhere").
    tokenVersion: { type: Number, default: 0 },

    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatarUrl: this.avatarUrl,
    bio: this.bio,
    isEmailVerified: this.isEmailVerified,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
