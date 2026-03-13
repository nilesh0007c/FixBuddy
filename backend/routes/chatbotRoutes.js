'use strict';
// backend/routes/chatbotRoutes.js

const router = require('express').Router();
const ctrl   = require('../controllers/chatbotController');
const { protect, optionalAuth } = require('../middlewares/auth');
const { authorize }             = require('../middlewares/authorize');
const { chatbotLimiter }        = require('../middlewares/rateLimiter');
const { validate }              = require('../middlewares/validate');
const Joi = require('joi');

// multer is optional — missing package returns a 503 instead of crashing
// the whole router at require-time (which would make ALL routes 404)
let upload = null;
try {
  upload = require('../middlewares/chatbotUpload');
} catch (_) {
  console.warn('[chatbotRoutes] multer not found — run: npm install multer');
}

const requireUpload = (req, res, next) => {
  if (!upload) {
    return res.status(503).json({
      success: false,
      message: 'Image upload unavailable — run "npm install multer" on the server.',
    });
  }
  return upload.single('image')(req, res, next);
};

const chatSchema = Joi.object({
  message:   Joi.string().min(1).max(1000).required(),
  sessionId: Joi.string().uuid().optional(),
});

// ── All fixed-string routes BEFORE the /:sessionId wildcard ──────────

router.post('/chat',           chatbotLimiter, optionalAuth, validate(chatSchema), ctrl.chat);
router.post('/analyze-image',  chatbotLimiter, optionalAuth, requireUpload, ctrl.analyzeImage);
router.post('/providers',      chatbotLimiter, optionalAuth, ctrl.getProviders);
router.post('/rate',           protect, ctrl.rateSession);
router.get('/history/:sessionId', protect, ctrl.getHistory);

router.get('/admin/sessions',         protect, authorize('admin'), ctrl.adminGetSessions);
router.post('/admin/knowledge',       protect, authorize('admin'), ctrl.adminCreateKnowledge);
router.put('/admin/knowledge/:id',    protect, authorize('admin'), ctrl.adminUpdateKnowledge);
router.delete('/admin/knowledge/:id', protect, authorize('admin'), ctrl.adminDeleteKnowledge);

// Wildcard LAST — must come after all static routes
router.post('/:sessionId/escalate',  chatbotLimiter, optionalAuth, ctrl.escalate);

module.exports = router;