const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const {
  createBooking,
  getMyBookings,
  getProviderBookings,
  updateBookingStatus,
  cancelBooking,
} = require('../controllers/bookingController');

// Customer routes
router.post  ('/',                    protect, authorize('user'),              createBooking);
router.get   ('/my-bookings',         protect, authorize('user'),              getMyBookings);
router.put   ('/:id/cancel',          protect, authorize('user'),              cancelBooking);

// Provider routes
router.get   ('/provider-bookings',   protect, authorize('provider'),          getProviderBookings);

// Unified status update — used by provider dashboard for accept / reject / complete
// body: { status: 'accepted' | 'rejected' | 'completed', billAmount?: number }
router.put   ('/:id/status',          protect, authorize('provider', 'admin'), updateBookingStatus);

// Convenience aliases so ProviderDashboard can call them semantically
router.put   ('/:id/accept',          protect, authorize('provider', 'admin'), (req, res, next) => {
  req.body.status = 'accepted';
  return updateBookingStatus(req, res, next);
});

router.put   ('/:id/reject',          protect, authorize('provider', 'admin'), (req, res, next) => {
  req.body.status = 'rejected';
  return updateBookingStatus(req, res, next);
});

router.put   ('/:id/complete',        protect, authorize('provider', 'admin'), (req, res, next) => {
  req.body.status    = 'completed';
  // ProviderDashboard sends { billedAmount } — normalise to billAmount
  if (req.body.billedAmount && !req.body.billAmount) {
    req.body.billAmount = req.body.billedAmount;
  }
  return updateBookingStatus(req, res, next);
});

module.exports = router;