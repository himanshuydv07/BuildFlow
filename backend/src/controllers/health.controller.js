const mongoose = require('mongoose');
const { isDbConnected } = require('../config/db');
const { isRedisAvailable } = require('../config/redis');

// GET /healthcheck — liveness+readiness combined. Never exposes secrets,
// connection strings, or internal error detail.
function healthcheck(req, res) {
  const dbUp = isDbConnected();
  const redisUp = isRedisAvailable();

  // The API can still serve read/write requests without Redis (it just
  // degrades caching/rate-limiting), but it cannot function without
  // MongoDB. Overall status reflects that distinction.
  const status = dbUp ? 'ok' : 'degraded';

  res.status(dbUp ? 200 : 503).json({
    success: dbUp,
    statusCode: dbUp ? 200 : 503,
    message: status,
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        mongodb: dbUp ? 'up' : 'down',
        redis: redisUp ? 'up' : 'down',
      },
      mongooseState: mongoose.STATES[mongoose.connection.readyState],
    },
  });
}

module.exports = { healthcheck };
