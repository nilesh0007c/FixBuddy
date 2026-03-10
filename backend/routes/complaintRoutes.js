// backend/routes/complaintRoutes.js
const express    = require('express');
const multer     = require('multer');
const path       = require('path');
const router     = express.Router();

const {
  createComplaint,
  getUserComplaints,
  getProviderComplaints,
  adminGetComplaints,
  adminReplyComplaint,
  uploadEvidence,
  getComplaintWindow,
} = require('../controllers/complaintController');

const { protect ,authorize ,attachProvider } = require('../middlewares/auth');


/* ── Multer (temp disk storage before Cloudinary) ── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/temp/'),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const ext     = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime    = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Only image files are allowed.'));
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 }, // max 5 MB, 5 files
});

/* ══════════════════════════════════════════
   ROUTES
══════════════════════════════════════════ */

// User routes
router.post(
  '/create',
  protect,
  authorize('user'),
  upload.array('evidence', 5),
  createComplaint
);

router.get(
  '/user',
  protect,
  authorize('user'),
  getUserComplaints
);

router.get(
  '/window/:bookingId',
  protect,
  authorize('user'),
  getComplaintWindow
);

// Evidence upload (standalone — used for pre-upload before form submit)
router.post(
  '/upload-evidence',
  protect,
  authorize('user'),
  upload.array('images', 5),
  uploadEvidence
);

// Provider routes
router.get(
  '/provider',
  protect,
  authorize('provider'),
  attachProvider,
  getProviderComplaints
);

// Admin routes
router.get(
  '/admin',
  protect,
  authorize('admin'),
  adminGetComplaints
);

router.put(
  '/admin-reply/:id',
  protect,
  authorize('admin'),
  adminReplyComplaint
);

module.exports = router;

/* ── Register in app.js ──────────────────────────────
   const complaintRoutes = require('./routes/complaintRoutes');
   app.use('/api/complaints', complaintRoutes);
─────────────────────────────────────────────────── */