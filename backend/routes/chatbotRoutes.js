// backend/routes/chatbotRoutes.js  — COMPLETE
const router      = require('express').Router();
const ctrl        = require('../controllers/chatbotController');
const { protect, optionalAuth } = require('../middlewares/auth');
const { authorize }             = require('../middlewares/authorize');
const { chatbotLimiter }        = require('../middlewares/rateLimiter');
const { validate }              = require('../middlewares/validate');
const Joi = require('joi');

const chatSchema = Joi.object({
  message:   Joi.string().min(1).max(1000).required(),
  sessionId: Joi.string().uuid().optional()
});

// Public (guest + logged in)
router.post('/chat',            chatbotLimiter, optionalAuth, validate(chatSchema), ctrl.chat);
router.post('/:sessionId/escalate', chatbotLimiter, optionalAuth, ctrl.escalate);
router.get('/history/:sessionId',   protect, ctrl.getHistory);
router.post('/rate',            protect, ctrl.rateSession);

// Admin only
router.get('/admin/sessions',   protect, authorize('admin'), ctrl.adminGetSessions);
router.post('/admin/knowledge', protect, authorize('admin'), ctrl.adminCreateKnowledge);
router.put('/admin/knowledge/:id', protect, authorize('admin'), ctrl.adminUpdateKnowledge);
router.delete('/admin/knowledge/:id', protect, authorize('admin'), ctrl.adminDeleteKnowledge);

module.exports = router;
