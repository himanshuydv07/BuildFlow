const Redis = require('ioredis');
const env = require('./env');
const logger = require('./logger');

/**
 * BuildFlow uses Redis for (see docs/ARCHITECTURE.md "Redis Responsibilities"):
 *   1. Caching project membership lookups (authorization hot path)
 *   2. Caching dashboard/analytics aggregations
 *   3. Rate limiting auth endpoints
 *   4. Refresh-token session store (rotation + revocation)
 *   5. Short-lived password-reset / email-verification tokens
 *
 * Redis is a PERFORMANCE / SESSION layer, never the source of truth for
 * authorization decisions. If Redis is unavailable, the app must fall
 * back to hitting MongoDB directly rather than crashing or, worse,
 * silently granting access.
 */

const client = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 2,
  retryStrategy(times) {
    const delay = Math.min(times * 500, 5000);
    return delay;
  },
  lazyConnect: false,
});

let redisAvailable = false;

client.on('connect', () => {
  redisAvailable = true;
  logger.info('[Redis] Connected');
});

client.on('error', (err) => {
  if (redisAvailable) {
    logger.error(`[Redis] Error: ${err.message}`);
  }
  redisAvailable = false;
});

client.on('close', () => {
  redisAvailable = false;
});

function isRedisAvailable() {
  return redisAvailable;
}

/**
 * Safe wrapper: never throws. Returns null on any failure so callers
 * can transparently fall back to the database.
 */
async function safeGet(key) {
  if (!redisAvailable) return null;
  try {
    return await client.get(key);
  } catch (err) {
    logger.warn(`[Redis] GET failed for ${key}: ${err.message}`);
    return null;
  }
}

async function safeSet(key, value, ttlSeconds) {
  if (!redisAvailable) return false;
  try {
    if (ttlSeconds) {
      await client.set(key, value, 'EX', ttlSeconds);
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (err) {
    logger.warn(`[Redis] SET failed for ${key}: ${err.message}`);
    return false;
  }
}

async function safeDel(keyOrPattern) {
  if (!redisAvailable) return false;
  try {
    await client.del(keyOrPattern);
    return true;
  } catch (err) {
    logger.warn(`[Redis] DEL failed for ${keyOrPattern}: ${err.message}`);
    return false;
  }
}

async function safeDelByPrefix(prefix) {
  if (!redisAvailable) return false;
  try {
    const stream = client.scanStream({ match: `${prefix}*`, count: 100 });
    const keysToDelete = [];
    for await (const keys of stream) {
      if (keys.length) keysToDelete.push(...keys);
    }
    if (keysToDelete.length) await client.del(keysToDelete);
    return true;
  } catch (err) {
    logger.warn(`[Redis] DEL by prefix failed for ${prefix}: ${err.message}`);
    return false;
  }
}

module.exports = {
  client,
  isRedisAvailable,
  safeGet,
  safeSet,
  safeDel,
  safeDelByPrefix,
};
