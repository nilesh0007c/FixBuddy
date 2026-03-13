'use strict';
// backend/middlewares/chatbotUpload.js
//
// Multer configuration for chatbot image/file uploads.
// Files are stored in memory (no disk writes) so we can pass
// them directly to the Claude vision API as base64.

const multer = require('multer');

const ALLOWED_MIME = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Please upload JPEG, PNG, WEBP, or GIF.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

module.exports = upload;