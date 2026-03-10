// backend/routes/bargainRoutes.js
'use strict';

const express    = require('express');
const router     = express.Router();
const Joi        = require('joi');
const rateLimit  = require('express-rate-limit');

const { ipKeyGenerator } = require('express-rate-limit');
const { protect }         = require('../middlewares/auth');
const { validate }        = require('../middlewares/validate');
const bargainController   = require('../controllers/bargainController');

/* ─── Rate limiter: 60 bargain requests per user per 15 min ─── */
const bargainLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,

  keyGenerator: (req) => {
    if (req.user?.id) {
      return `user_${req.user.id}`; // per-user limit when logged in
    }

    // fallback to safe IP generator (IPv4 + IPv6 safe)
    return ipKeyGenerator(req);
  },

  message: {
    success: false,
    message: 'Too many requests. Please slow down.'
  }
});

/* ─── Validation schemas ─── */
const schemas = {
  init: Joi.object({
    bookingId:    Joi.string().hex().length(24).required(),
    initialOffer: Joi.number().positive().required(),
    message:      Joi.string().max(300).allow('').default(''),
  }),
  counter: Joi.object({
    amount:  Joi.number().positive().required(),
    message: Joi.string().max(300).allow('').default(''),
  }),
};

/* ─── All bargain routes require valid JWT ─── */
router.use(protect, bargainLimiter);

// ── IMPORTANT: specific string routes BEFORE :id param routes ──
router.get('/booking/:bookingId',   bargainController.getByBooking);

router.post('/init',
  validate(schemas.init),
  bargainController.initNegotiation
);

router.post('/:id/counter',
  validate(schemas.counter),
  bargainController.submitCounter
);

router.post('/:id/accept',  bargainController.acceptOffer);
router.post('/:id/reject',  bargainController.rejectOffer);
router.get ('/:id/suggest', bargainController.getSuggestion);
router.get ('/:id',         bargainController.getNegotiation);

module.exports = router;