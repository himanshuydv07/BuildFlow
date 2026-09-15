const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const env = require('./config/env');
const logger = require('./config/logger');
const apiRoutes = require('./routes');
const healthRoutes = require('./routes/health.routes');
const { generalLimiter } = require('./middleware/rateLimit');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Render, Vercel, and most PaaS providers sit behind a reverse proxy.
// Without this, Express sees the proxy's IP for every request, which
// breaks IP-based rate limiting and prevents secure cookies from being
// correctly recognized as coming over HTTPS.
app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    // Explicit allowlist, never a wildcard — this API is called with
    // credentials (cookies), and CORS forbids combining a wildcard
    // origin with credentials anyway. Supports multiple origins via
    // CORS_ORIGINS (comma-separated) for staging/preview deployments.
    origin(origin, callback) {
      // Allow non-browser requests (curl, server-to-server, health checks)
      // which send no Origin header at all.
      if (!origin) return callback(null, true);
      if (env.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev', { stream: { write: (msg) => logger.http?.(msg.trim()) || logger.info(msg.trim()) } }));
}

app.use(generalLimiter);

// Health check lives at the exact path called out in the spec, outside
// the rate limiter and without requiring authentication.
app.use(`${env.apiPrefix}/healthcheck`, healthRoutes);

app.use(env.apiPrefix, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
