// backend/routes/authRoutes.js
'use strict';

const express    = require('express');
const rateLimit  = require('express-rate-limit');
const Joi        = require('joi');
const router     = express.Router();

const { protect }    = require('../middlewares/auth');
const { validate }   = require('../middlewares/validate');
const {
  register, login, getMe,
  forgotPassword, verifyOTP, resetPassword,
} = require('../controllers/authController');

/* ─── Rate limiters ─── */
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP requests. Try again in 15 minutes.' },
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many verification attempts.' },
});

/* ─── Validation schemas ─── */
const schemas = {
  register: Joi.object({
    name:     Joi.string().min(2).max(80).required(),
    email:    Joi.string().email().required(),
    password: Joi.string().min(6).max(100).required(),
    role:     Joi.string().valid('user', 'provider').default('user'),
    phone:    Joi.string().allow(''),
    city:     Joi.string().allow(''),
    location: Joi.object().unknown(true),
  }),

  login: Joi.object({
    email:    Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  forgot: Joi.object({
    email: Joi.string().email().required(),
  }),

  verifyOtp: Joi.object({
    email: Joi.string().email().required(),
    otp:   Joi.string().length(6).pattern(/^\d+$/).required(),
  }),

  reset: Joi.object({
    email:       Joi.string().email().required(),
    resetToken:  Joi.string().min(10).required(),
    newPassword: Joi.string().min(8).max(100).required(),
  }),
};

/* ─── Routes ─── */
router.post('/register',       validate(schemas.register), register);
router.post('/login',          validate(schemas.login),    login);
router.get ('/me',             protect,                    getMe);

router.post('/forgot-password',
  forgotLimiter,
  validate(schemas.forgot),
  forgotPassword
);

router.post('/verify-otp',
  verifyLimiter,
  validate(schemas.verifyOtp),
  verifyOTP
);

router.post('/reset-password',
  verifyLimiter,
  validate(schemas.reset),
  resetPassword
);

module.exports = router;