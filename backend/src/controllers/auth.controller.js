const { v4: uuidv4 } = require('uuid');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const User = require('../models/User');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateOpaqueToken,
  hashToken,
} = require('../utils/tokens');
const { safeGet, safeSet, safeDel } = require('../config/redis');
const env = require('../config/env');
const logger = require('../config/logger');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

const REFRESH_COOKIE_NAME = 'refreshToken';
const refreshRedisKey = (jti) => `refresh:${jti}`;

function refreshCookieOptions() {
  return {
    httpOnly: true,
    // Cross-site cookies (frontend on vercel.app, backend on
    // onrender.com are different origins) REQUIRE sameSite:'none', and
    // browsers require secure:true for any sameSite:'none' cookie.
    // In local dev, frontend and backend are still different ports
    // (different origins to the browser) but both plain HTTP, where
    // sameSite:'none' without secure would be silently rejected by the
    // browser — so dev uses 'lax' over plain HTTP instead.
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

async function issueTokenPair(user) {
  const jti = uuidv4();
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, jti);

  // Store only a hash of the refresh token server-side, keyed by jti,
  // so a leaked Redis dump doesn't itself hand out valid sessions.
  const stored = await safeSet(refreshRedisKey(jti), hashToken(refreshToken), 7 * 24 * 60 * 60);
  if (!stored) {
    // Redis is required for refresh-session tracking; without it we
    // cannot safely support rotation/revocation, so we degrade to
    // access-token-only (short-lived) rather than pretending refresh
    // works when it can't be revoked.
    logger.warn('[Auth] Redis unavailable — refresh token will not be revocable this session');
  }

  return { accessToken, refreshToken };
}

// POST /auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create({ name, email: email.toLowerCase(), password });

  const verificationToken = generateOpaqueToken();
  user.emailVerificationTokenHash = hashToken(verificationToken);
  user.emailVerificationExpires = new Date(Date.now() + env.emailVerificationExpiresHours * 60 * 60 * 1000);
  await user.save();

  // Real transactional email if SMTP is configured; otherwise this
  // logs the link to the console (see emailService.js) so local dev
  // keeps working without any SMTP setup.
  const verifyUrl = `${env.clientUrl}/verify-email?token=${verificationToken}&uid=${user._id}`;
  await sendVerificationEmail(user, verifyUrl);

  const { accessToken, refreshToken } = await issueTokenPair(user);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());

  return new ApiResponse(
    201,
    { user: user.toPublicJSON(), accessToken },
    'Registration successful'
  ).send(res);
});

// POST /auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const { accessToken, refreshToken } = await issueTokenPair(user);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());

  return new ApiResponse(200, { user: user.toPublicJSON(), accessToken }, 'Login successful').send(res);
});

// POST /auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
  if (!token) throw ApiError.unauthorized('Refresh token missing');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const storedHash = await safeGet(refreshRedisKey(payload.jti));
  if (storedHash === null || storedHash !== hashToken(token)) {
    throw ApiError.unauthorized('Refresh token has been revoked or reused');
  }

  const user = await User.findById(payload.sub);
  if (!user || (user.tokenVersion || 0) !== (payload.tokenVersion || 0)) {
    throw ApiError.unauthorized('Session no longer valid');
  }

  // Rotate: invalidate the old refresh token, issue a brand new pair.
  await safeDel(refreshRedisKey(payload.jti));
  const { accessToken, refreshToken } = await issueTokenPair(user);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());

  return new ApiResponse(200, { accessToken }, 'Token refreshed').send(res);
});

// POST /auth/logout
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await safeDel(refreshRedisKey(payload.jti));
    } catch {
      // token already invalid/expired — nothing to revoke
    }
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth', secure: env.isProduction, sameSite: env.isProduction ? 'none' : 'lax' });
  return new ApiResponse(200, null, 'Logged out').send(res);
});

// GET /auth/me
const me = asyncHandler(async (req, res) => {
  return new ApiResponse(200, { user: req.user.toPublicJSON() }).send(res);
});

// POST /auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1; // invalidates all existing sessions
  await user.save();

  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth', secure: env.isProduction, sameSite: env.isProduction ? 'none' : 'lax' });
  return new ApiResponse(200, null, 'Password changed. Please log in again.').send(res);
});

// POST /auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  // Always respond identically whether or not the account exists, to
  // avoid leaking which emails are registered.
  if (user) {
    const resetToken = generateOpaqueToken();
    user.passwordResetTokenHash = hashToken(resetToken);
    user.passwordResetExpires = new Date(Date.now() + env.resetTokenExpiresMin * 60 * 1000);
    await user.save();

    const resetUrl = `${env.clientUrl}/reset-password?token=${resetToken}&uid=${user._id}`;
    await sendPasswordResetEmail(user, resetUrl);
  }

  return new ApiResponse(200, null, 'If that email is registered, a reset link has been sent.').send(res);
});

// POST /auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { uid, token, newPassword } = req.body;

  const user = await User.findById(uid).select('+passwordResetTokenHash +passwordResetExpires');
  if (
    !user ||
    !user.passwordResetTokenHash ||
    user.passwordResetTokenHash !== hashToken(token) ||
    !user.passwordResetExpires ||
    user.passwordResetExpires.getTime() < Date.now()
  ) {
    throw ApiError.badRequest('Reset link is invalid or has expired');
  }

  user.password = newPassword;
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  return new ApiResponse(200, null, 'Password reset successful. Please log in.').send(res);
});

// POST /auth/verify-email
const verifyEmail = asyncHandler(async (req, res) => {
  const { uid, token } = req.body;

  const user = await User.findById(uid).select('+emailVerificationTokenHash +emailVerificationExpires');
  if (
    !user ||
    !user.emailVerificationTokenHash ||
    user.emailVerificationTokenHash !== hashToken(token) ||
    !user.emailVerificationExpires ||
    user.emailVerificationExpires.getTime() < Date.now()
  ) {
    throw ApiError.badRequest('Verification link is invalid or has expired');
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpires = null;
  await user.save();

  return new ApiResponse(200, null, 'Email verified successfully').send(res);
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
};
