// backend/routes/adminRoutes.js  — FULL PRODUCTION
const express  = require('express');
const router   = express.Router();
const Joi      = require('joi');
const { protect }   = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const { validate }  = require('../middlewares/validate');
const adminCtrl     = require('../controllers/adminController');

const adminOnly = [protect, authorize('admin')];

// Validation schemas
const banSchema = Joi.object({
  reason: Joi.string().min(10).max(1000).required()
    .messages({ 'string.min': 'Reason must be at least 10 characters' }),
});

/* ── Dashboard ── */
router.get('/stats',                    ...adminOnly, adminCtrl.getDashboardStats);

/* ── Provider management ── */
router.get('/providers',                ...adminOnly, adminCtrl.getAllProviders);
router.get('/providers/pending',        ...adminOnly, adminCtrl.getPendingProviders);
router.put('/providers/:id/verify',     ...adminOnly, adminCtrl.verifyProvider);
router.put('/providers/:id/reject',     ...adminOnly, adminCtrl.rejectProvider);
router.post('/providers/:id/ban',       ...adminOnly, validate(banSchema), adminCtrl.banProvider);
router.post('/providers/:id/reactivate',...adminOnly, adminCtrl.reactivateProvider);

/* ── User management ── */
router.get('/users',                    ...adminOnly, adminCtrl.getAllUsers);
router.post('/users/:id/ban',           ...adminOnly, validate(banSchema), adminCtrl.banUser);
router.post('/users/:id/reactivate',    ...adminOnly, adminCtrl.reactivateUser);

/* ── Bookings ── */
router.get('/bookings/all',             ...adminOnly, adminCtrl.getAllBookings);

/* ── Audit logs ── */
router.get('/audit-logs',               ...adminOnly, adminCtrl.getAuditLogs);

module.exports = router;