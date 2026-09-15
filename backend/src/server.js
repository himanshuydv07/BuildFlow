const http = require('http');
const env = require('./config/env');
const logger = require('./config/logger');
const { connectDB } = require('./config/db');
const app = require('./app');
const { initSocketServer } = require('./services/socket');
const { setSocketServer } = require('./services/notificationService');
const { startRecurringTaskJob } = require('./services/recurringTaskJob');

async function start() {
  await connectDB();

  const httpServer = http.createServer(app);
  const io = initSocketServer(httpServer);
  setSocketServer(io);
  startRecurringTaskJob();

  httpServer.listen(env.port, () => {
    logger.info(`[Server] BuildFlow API listening on port ${env.port} (${env.nodeEnv})`);
    logger.info(`[Server] API base: ${env.apiPrefix}`);
  });

  const shutdown = (signal) => {
    logger.info(`[Server] Received ${signal}, shutting down gracefully...`);
    httpServer.close(() => {
      logger.info('[Server] HTTP server closed');
      process.exit(0);
    });
    // Force-exit if graceful shutdown hangs.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error(`[UnhandledRejection] ${reason}`);
  });
  process.on('uncaughtException', (err) => {
    logger.error(`[UncaughtException] ${err.stack || err.message}`);
    process.exit(1);
  });
}

start().catch((err) => {
  logger.error(`[Server] Failed to start: ${err.stack || err.message}`);
  process.exit(1);
});
