const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const { addReview, getProviderReviews } = require('../controllers/reviewController');

router.post('/',                          protect, authorize('user'), addReview);
router.get('/provider/:providerId',       getProviderReviews);

module.exports = router;