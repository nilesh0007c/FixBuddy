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
// PUBLIC — no auth required
// ─────────────────────────────────────────────────────────────

// GET /api/providers
// Used by: ServicesPage, search
router.get('/', getProviders);

// ─────────────────────────────────────────────────────────────
// PRIVATE — named routes MUST come before /:id wildcard
// ─────────────────────────────────────────────────────────────

// POST /api/providers/register
// Used by: ProviderRegister.jsx
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
// Used by: ProviderProfilePage.jsx (private dashboard profile)
router.get(
  '/profile',
  protect,
  authorize('provider'),
  getMyProfile
);

// PUT /api/providers/profile
// Used by: ProviderProfilePage.jsx — both quick availability toggle & full edit save
router.put(
  '/profile',
  protect,
  authorize('provider'),
  upload.single('profileImage'),
  updateProvider
);

// ─────────────────────────────────────────────────────────────
// PUBLIC WILDCARD — must be last
// ─────────────────────────────────────────────────────────────

// GET /api/providers/:id
// Used by: PublicProviderPage.jsx (view any provider + booking)
router.get('/:id', getProvider);

module.exports = router;