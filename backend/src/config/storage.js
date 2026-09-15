const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const env = require('./env');
const logger = require('./logger');

/**
 * Storage abstraction (spec section 59: "keep storage behind an
 * abstraction so it can later use S3/object storage").
 *
 * STORAGE_DRIVER=local  → multer.diskStorage on the container's own
 *   filesystem. Fine for self-hosted Docker with a real volume. WRONG
 *   for Render's free tier (and most PaaS free tiers), which wipe the
 *   filesystem on every restart/redeploy.
 *
 * STORAGE_DRIVER=s3     → any S3-compatible bucket: AWS S3, Cloudflare
 *   R2 (free 10GB), Backblaze B2. Set S3_ENDPOINT for R2/B2; leave it
 *   unset for real AWS S3.
 */

let s3Client = null;
function getS3Client() {
  if (s3Client) return s3Client;
  // Lazy-required so the AWS SDK is only loaded (and only needs to be
  // installed) when S3 mode is actually used.
  const { S3Client } = require('@aws-sdk/client-s3');
  s3Client = new S3Client({
    region: env.storage.s3.region,
    endpoint: env.storage.s3.endpoint,
    forcePathStyle: env.storage.s3.forcePathStyle,
    credentials: {
      accessKeyId: env.storage.s3.accessKeyId,
      secretAccessKey: env.storage.s3.secretAccessKey,
    },
  });
  return s3Client;
}

function buildMulterStorage() {
  if (env.storage.driver === 's3') {
    const multerS3 = require('multer-s3');
    return multerS3({
      s3: getS3Client(),
      bucket: env.storage.s3.bucket,
      key: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${uuidv4()}${ext}`);
      },
    });
  }

  if (!fs.existsSync(env.uploads.dir)) {
    fs.mkdirSync(env.uploads.dir, { recursive: true });
  }
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, env.uploads.dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

/** Normalizes the stored filename regardless of driver (multer-s3 uses `.key`, disk uses `.filename`). */
function storedNameFrom(multerFile) {
  return multerFile.key || multerFile.filename;
}

/**
 * Returns a URL the client can be redirected to for download (S3:
 * short-lived presigned URL), or null for local storage, meaning the
 * caller should stream the file from disk itself.
 */
async function getDownloadUrl(storedName) {
  if (env.storage.driver !== 's3') return null;
  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
  const command = new GetObjectCommand({ Bucket: env.storage.s3.bucket, Key: storedName });
  return getSignedUrl(getS3Client(), command, { expiresIn: 300 });
}

async function deleteStoredFile(storedName) {
  if (env.storage.driver === 's3') {
    try {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      await getS3Client().send(new DeleteObjectCommand({ Bucket: env.storage.s3.bucket, Key: storedName }));
    } catch (err) {
      logger.warn(`[Storage] Failed to delete S3 object ${storedName}: ${err.message}`);
    }
    return;
  }
  fs.unlink(path.join(env.uploads.dir, storedName), () => {}); // best-effort; DB record removal is authoritative
}

module.exports = { buildMulterStorage, storedNameFrom, getDownloadUrl, deleteStoredFile };
