// backend/middlewares/upload.js
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// ─── Cloudinary Config ────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Allowed MIME types ───────────────────────────────────────
const ALLOWED_TYPES = {
  image:    ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video:    ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  document: [
    'application/pdf', 'text/plain', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
};

const ALL_ALLOWED = Object.values(ALLOWED_TYPES).flat();

const SIZE_LIMITS = {
  image:    5  * 1024 * 1024,
  video:    50 * 1024 * 1024,
  document: 10 * 1024 * 1024,
  audio:    10 * 1024 * 1024,
};

function getFileCategory(mime) {
  for (const [cat, mimes] of Object.entries(ALLOWED_TYPES)) {
    if (mimes.includes(mime)) return cat;
  }
  return null;
}

// ─── Cloudinary Storage ───────────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isImage = ALLOWED_TYPES.image.includes(file.mimetype);
    return {
      folder: 'fixbuddy/providers',
      resource_type: isImage ? 'image' : 'raw',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'mp4'],
      transformation: isImage ? [{ quality: 'auto', fetch_format: 'auto' }] : [],
    };
  },
});

// ─── File Filter ──────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  if (!ALL_ALLOWED.includes(file.mimetype)) {
    return cb(
      new Error(`File type '${file.mimetype}' is not allowed.`),
      false
    );
  }
  cb(null, true);
};

// ─── Multer Instance ──────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 5,
  },
});

// ─── Post-upload Size Validator ───────────────────────────────
const validateFileSize = (req, res, next) => {
  if (!req.file && !req.files) return next();

  const files = req.file
    ? [req.file]
    : Array.isArray(req.files)
    ? req.files
    : Object.values(req.files).flat();

  for (const file of files) {
    const cat   = getFileCategory(file.mimetype);
    const limit = SIZE_LIMITS[cat] || SIZE_LIMITS.document;
    if (file.size > limit) {
      const mb = (limit / 1024 / 1024).toFixed(0);
      return res.status(400).json({
        success: false,
        message: `${cat} files must be under ${mb}MB`,
      });
    }
    file.category = cat;
  }
  next();
};

module.exports = { upload, validateFileSize, getFileCategory, cloudinary };