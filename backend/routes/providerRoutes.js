const express = require('express');
const router  = express.Router();

const { upload, validateFileSize } = require('../middlewares/upload');
const { protect, authorize }       = require('../middlewares/auth');

const {
  registerProvider,
  getProviders,
  getProvider,
  getMyProfile,
  updateProvider,
} = require('../controllers/providerController');

// ─────────────────────────────────────────────────────────────
// Public — no auth required
// ─────────────────────────────────────────────────────────────

// GET /api/providers
router.get('/', getProviders);

// ─────────────────────────────────────────────────────────────
// Named private routes — MUST come before /:id wildcard.
// If /:id is defined first, Express captures the literal string
// "profile" or "my-profile" as an ObjectId param → cast error.
// ─────────────────────────────────────────────────────────────

// POST /api/providers/register
router.post(
  '/register',
  protect,
  upload.fields([
    { name: 'liveImage',    maxCount: 1 },
    { name: 'idProofImage', maxCount: 1 },
  ]),
  validateFileSize,
  registerProvider
);

// GET /api/providers/profile
router.get(
  '/profile',
  protect,
  authorize('provider'),
  getMyProfile
);

// PUT /api/providers/my-profile
router.put(
  '/profile',
  protect,
  authorize('provider'),
  upload.single('profileImage'),
  updateProvider
);

// ─────────────────────────────────────────────────────────────
// Wildcard — MUST be last
// ─────────────────────────────────────────────────────────────

// GET /api/providers/:id
router.get('/providers/:id', getProvider);

module.exports = router;