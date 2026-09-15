const winston = require('winston');
const env = require('./env');

const logger = winston.createLogger({
  level: env.nodeEnv === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    env.nodeEnv === 'production'
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), winston.format.simple())
  ),
  transports: [new winston.transports.Console()],
});

// Fields that must never be logged, even accidentally via object dumps.
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'jwtAccessSecret',
  'jwtRefreshSecret',
  'accessToken',
  'refreshToken',
  'token',
  'smtpPass',
]);

function redact(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  for (const key of Object.keys(clone)) {
    if (SENSITIVE_KEYS.has(key)) {
      clone[key] = '[REDACTED]';
    } else if (typeof clone[key] === 'object') {
      clone[key] = redact(clone[key]);
    }
  }
  return clone;
}

module.exports = logger;
module.exports.redact = redact;
