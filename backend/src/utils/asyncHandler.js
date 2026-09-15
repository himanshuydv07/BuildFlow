/**
 * Wraps an async controller so rejected promises are forwarded to
 * Express's error-handling middleware instead of crashing the process
 * or being silently swallowed.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
