const multer = require('multer');
const path = require('path');
const env = require('./env');
const { buildMulterStorage } = require('./storage');

// Allowlist by MIME type. We do NOT trust the client-supplied MIME type
// alone for anything security-sensitive (it's attacker-controlled), but
// we do use it as a first filter; the extension is also checked so a
// mismatched pair (e.g. .exe renamed to .pdf with a spoofed header) is
// still rejected on the obviously-wrong-extension axis.
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
]);

const ALLOWED_EXT = new Set([
  '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.txt', '.csv',
  '.doc', '.docx', '.xls', '.xlsx', '.zip',
]);

const storage = buildMulterStorage();

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXT.has(ext) || !ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error('File type not allowed'));
  }
  // Reject filenames with path traversal characters or null bytes.
  if (/[/\\\0]/.test(file.originalname)) {
    return cb(new Error('Invalid filename'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.uploads.maxFileSizeMb * 1024 * 1024, files: 1 },
});

module.exports = { upload };
