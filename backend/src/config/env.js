require('dotenv').config();

// Variables that MUST be present for the app to run safely in ANY
// environment. We fail loudly and immediately rather than falling
// back to insecure defaults (e.g. a hardcoded JWT secret).
const REQUIRED_VARS = ['MONGO_URI', 'REDIS_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

// Additional variables required specifically in production, where a
// silently-wrong default (e.g. CLIENT_URL falling back to localhost)
// would break CORS/cookies/email links for every real user.
const REQUIRED_IN_PRODUCTION = ['CLIENT_URL', 'CORS_ORIGINS'];

function requireEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key] || process.env[key].trim() === '');
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    missing.push(...REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key] || process.env[key].trim() === ''));
  }

  if (missing.length > 0) {
    // Intentionally use console here — this fires before winston/logger
    // is guaranteed to be configured, and the process is about to die.
    console.error('\n[FATAL] Missing required environment variables:');
    [...new Set(missing)].forEach((key) => console.error(`  - ${key}`));
    console.error('\nCopy backend/.env.example to backend/.env and fill in real values.\n');
    process.exit(1);
  }

  if (isProd && (process.env.JWT_ACCESS_SECRET.includes('CHANGE_ME') || process.env.JWT_REFRESH_SECRET.includes('CHANGE_ME'))) {
    console.error('[FATAL] Refusing to start in production with placeholder JWT secrets.');
    process.exit(1);
  }

  if (isProd && !process.env.SMTP_HOST) {
    // Not fatal — the app still runs — but silently falling back to
    // console-logged reset/verification links in production means
    // real users can never actually receive them. Surface this loudly.
    console.warn('[WARN] No SMTP_HOST configured in production. Password reset and email verification links will NOT be delivered to users — see docs/DEPLOYMENT.md.');
  }

  if (isProd && (process.env.STORAGE_DRIVER || 'local') === 'local') {
    console.warn('[WARN] STORAGE_DRIVER=local in production. Most free hosting (e.g. Render free tier) has an EPHEMERAL filesystem — uploaded files will be lost on every restart/redeploy. Configure S3-compatible storage — see docs/DEPLOYMENT.md.');
  }
}

requireEnv();

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT, 10) || 5000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // Comma-separated list of allowed frontend origins, e.g.
  // "https://buildflow.vercel.app,https://buildflow-git-staging.vercel.app"
  // Falls back to clientUrl alone if unset (fine for local dev).
  corsOrigins: (process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  mongoUri: process.env.MONGO_URI,
  redisUrl: process.env.REDIS_URL,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  resetTokenExpiresMin: parseInt(process.env.RESET_TOKEN_EXPIRES_MIN, 10) || 30,
  emailVerificationExpiresHours: parseInt(process.env.EMAIL_VERIFICATION_EXPIRES_HOURS, 10) || 24,

  authRateLimit: {
    windowMin: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MIN, 10) || 15,
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 10,
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587/STARTTLS
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'BuildFlow <no-reply@buildflow.local>',
  },

  uploads: {
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
    dir: process.env.UPLOAD_DIR || '/app/uploads',
  },

  // Local disk storage is fine for self-hosted Docker deployments with
  // a real volume. On ephemeral-filesystem free hosting (Render free
  // tier, etc.) switch to 's3' and point it at any S3-compatible
  // bucket (AWS S3, Cloudflare R2, Backblaze B2) — see docs/DEPLOYMENT.md.
  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    s3: {
      bucket: process.env.S3_BUCKET || '',
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined, // set for R2/B2; leave unset for real AWS S3
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    },
  },

  cache: {
    membershipTtl: parseInt(process.env.CACHE_MEMBERSHIP_TTL, 10) || 300,
    dashboardTtl: parseInt(process.env.CACHE_DASHBOARD_TTL, 10) || 60,
  },
};
