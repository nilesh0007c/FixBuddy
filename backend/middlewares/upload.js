// backend/middlewares/upload.js  — PRODUCTION GRADE (replaces current broken version)
const multer  = require('multer');
const crypto  = require('crypto');
const path    = require('path');

// ─── Allowed MIME types by category ─────────────────────────────────────────
const ALLOWED_TYPES = {
  image:    ['image/jpeg','image/png','image/gif','image/webp'],
  video:    ['video/mp4','video/quicktime','video/x-msvideo','video/webm'],
  document: ['application/pdf','text/plain','application/msword',
             'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
             'application/vnd.ms-excel',
             'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  audio:    ['audio/mpeg','audio/wav','audio/ogg','audio/webm']
};

const ALL_ALLOWED = Object.values(ALLOWED_TYPES).flat();

// ─── Size limits by type ─────────────────────────────────────────────────────
const SIZE_LIMITS = {
  image:    5  * 1024 * 1024,  //  5 MB
  video:    50 * 1024 * 1024,  // 50 MB
  document: 10 * 1024 * 1024,  // 10 MB
  audio:    10 * 1024 * 1024   // 10 MB
};

function getFileCategory(mime) {
  for (const [cat, mimes] of Object.entries(ALLOWED_TYPES)) {
    if (mimes.includes(mime)) return cat;
  }
  return null;
}

// ─── Memory storage (files go to cloud, not disk) ───────────────────────────
const storage = multer.memoryStorage();

// ─── File filter ─────────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  if (!ALL_ALLOWED.includes(file.mimetype)) {
    return cb(new Error(
      `File type '${file.mimetype}' is not allowed. ` +
      `Allowed: images, videos, documents, audio.`
    ), false);
  }
  cb(null, true);
};

// ─── Multer instance ─────────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,  // global max 50MB (individual checks below)
    files: 5
  }
});

// ─── Post-upload size validator ──────────────────────────────────────────────
const validateFileSize = (req, res, next) => {
  if (!req.file && !req.files) return next();

  const files = req.file
    ? [req.file]
    : Array.isArray(req.files) ? req.files : Object.values(req.files).flat();

  for (const file of files) {
    const cat   = getFileCategory(file.mimetype);
    const limit = SIZE_LIMITS[cat] || SIZE_LIMITS.document;
    if (file.size > limit) {
      const mb = (limit / 1024 / 1024).toFixed(0);
      return res.status(400).json({
        success: false,
        message: `${cat} files must be under ${mb}MB`
      });
    }
    // Attach category for downstream use
    file.category = cat;
  }
  next();
};

module.exports = { upload, validateFileSize, getFileCategory };
