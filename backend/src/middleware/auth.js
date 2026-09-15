const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/tokens');
const User = require('../models/User');

/**
 * Requires a valid, non-expired access token. Attaches req.user
 * (full Mongo document, password excluded by schema `select: false`).
 */
const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.cookies?.accessToken;

  if (!token) {
    throw ApiError.unauthorized('Authentication required');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Access token expired', [{ code: 'TOKEN_EXPIRED' }]);
    }
    throw ApiError.unauthorized('Invalid access token');
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw ApiError.unauthorized('User no longer exists');
  }

  // tokenVersion mismatch means the user changed their password or
  // logged out everywhere since this access token was issued.
  if ((user.tokenVersion || 0) !== (payload.tokenVersion || 0)) {
    throw ApiError.unauthorized('Session has been invalidated');
  }

  req.user = user;
  next();
});

/** Like requireAuth, but does not fail the request if no token is present. */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.cookies?.accessToken;
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (user && (user.tokenVersion || 0) === (payload.tokenVersion || 0)) {
      req.user = user;
    }
  } catch {
    // ignore invalid/expired token for optional auth
  }
  next();
});

module.exports = { requireAuth, optionalAuth };
