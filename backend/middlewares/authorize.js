const { ApiError } = require('../utils/ApiError');
const Booking      = require('../models/Booking');
const Provider     = require('../models/Provider');

// ── Permission definitions ────────────────────────────────────────────────
const PERMISSIONS = {
  admin:    ['*'],
  provider: [
    'read:own-bookings', 'update:own-bookings',
    'write:own-services', 'read:own-conversations',
    'write:own-profile'
  ],
  user: [
    'read:own-bookings', 'write:own-bookings',
    'read:own-conversations', 'write:own-profile'
  ]
};

// ── Role guard ────────────────────────────────────────────────────────────
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, 'Not authenticated'));
  if (!roles.includes(req.user.role))
    return next(new ApiError(403, 'Insufficient permissions'));
  next();
};

// ── Permission guard ──────────────────────────────────────────────────────
const hasPermission = (permission) => (req, res, next) => {
  const perms = PERMISSIONS[req.user?.role] || [];
  if (perms.includes('*') || perms.includes(permission)) return next();
  next(new ApiError(403, 'Insufficient permissions'));
};

// ── Ownership guard: booking belongs to this user/provider ────────────────
const ownBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id || req.params.bookingId);
    if (!booking) return next(new ApiError(404, 'Booking not found'));

    const userId = req.user._id.toString();
    const isOwner    = booking.user?.toString() === userId;
    const isAdmin    = req.user.role === 'admin';

    // Provider: check if they own this booking via their profile
    let isProvider = false;
    if (req.user.role === 'provider') {
      const prov = await Provider.findOne({ user: userId });
      isProvider = prov && booking.provider?.toString() === prov._id.toString();
    }

    if (!isOwner && !isProvider && !isAdmin)
      return next(new ApiError(403, 'You do not have access to this booking'));

    req.booking = booking;   // attach for downstream use
    next();
  } catch (err) { next(err); }
};

module.exports = { authorize, hasPermission, ownBooking };
