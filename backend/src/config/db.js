const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

let isConnected = false;

async function connectDB(retries = 10, delayMs = 3000) {
  mongoose.set('strictQuery', true);

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await mongoose.connect(env.mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      isConnected = true;
      logger.info(`[MongoDB] Connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
      return;
    } catch (err) {
      logger.error(`[MongoDB] Connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) {
        logger.error('[MongoDB] All connection attempts exhausted. Exiting.');
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  logger.warn('[MongoDB] Disconnected');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  logger.info('[MongoDB] Reconnected');
});

function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isDbConnected };
