const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// Uses in-memory store by default (fine for a single backend replica).
// For multi-instance deployments, plug in rate-limit-redis with the
// existing ioredis client from config/redis.js.
const authLimiter = rateLimit({
  windowMs: env.authRateLimit.windowMin * 60 * 1000,
  max: env.authRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many attempts. Please try again later.',
    errors: [],
  },
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, generalLimiter };
