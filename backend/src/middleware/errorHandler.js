const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const env = require('../config/env');

// 404 handler for unmatched routes.
function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  // Normalize known non-ApiError failures into the same response shape.
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    error = ApiError.badRequest('Validation failed', errors);
  } else if (err.code === 11000) {
    // Mongo duplicate key
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = ApiError.conflict(`${field} already in use`);
  } else if (err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  } else if (!(err instanceof ApiError)) {
    logger.error(err.stack || err.message);
    error = ApiError.internal(env.nodeEnv === 'production' ? 'Internal server error' : err.message);
  }

  if (error.statusCode >= 500) {
    logger.error(`[${req.method} ${req.originalUrl}] ${error.message}`);
  }

  const body = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors || [],
  };

  // Never leak stack traces in production responses.
  if (env.nodeEnv !== 'production' && err.stack) {
    body.stack = err.stack;
  }

  res.status(error.statusCode).json(body);
}

module.exports = { notFoundHandler, errorHandler };
