const express  = require('express');
const router   = express.Router();
const { upload, validateFileSize } = require("../middlewares/upload");
const { protect, authorize } = require('../middlewares/auth');
const {
  registerProvider,
  getProviders,
  getProvider,
  getMyProfile,
  updateProvider,
} = require('../controllers/providerController');

router.get('/',             getProviders);
router.get('/my-profile',   protect, authorize('provider'), getMyProfile);
router.get('/:id',          getProvider);

router.post(
  "/register",
  protect,
  upload.fields([
    { name: "liveImage", maxCount: 1 },
    { name: "idProofImage", maxCount: 1 }
  ]),
  validateFileSize,
  registerProvider
);
router.put('/my-profile',   protect, authorize('provider'),
  upload.single('profileImage'),
  updateProvider
);

module.exports = router;