// backend/controllers/bargainController.js
'use strict';

const bargainService = require('../bargaining/bargainService');
const Negotiation    = require('../models/Negotiation');
const Booking        = require('../models/Booking');
const Provider       = require('../models/Provider');
const { ApiError }   = require('../utils/ApiError');

/* ═══════════════════════════════════════════════════════════════════
   resolveRole  — THE BUG WAS HERE

   PROBLEM:
   getNegotiation() populates the `customer` field:
     .populate('customer', 'name avatar email')
   So `neg.customer` is a full User object, NOT a plain ObjectId.

   The old code did:
     neg.customer.toString() === userId
   When `neg.customer` is an object, .toString() returns "[object Object]"
   which NEVER matches the userId string → resolveRole always returned null
   → every request to GET /bargain/:id returned 403 Forbidden.

   FIX:
   Safely extract the string ID from either a populated object or a raw
   ObjectId using:  (obj?._id ?? obj)?.toString()
   This works whether the field is:
     • a populated Mongoose document  → uses ._id
     • a plain ObjectId               → coerces directly
     • a string                       → coerces directly
═══════════════════════════════════════════════════════════════════ */
const resolveRole = async (userId, neg) => {
  // Safely get string ID from either a populated object or a raw ObjectId
  const toId = (val) => (val?._id ?? val)?.toString();

  if (toId(neg.customer) === userId) return 'customer';

  const prov = await Provider.findOne({ user: userId }).select('_id');
  if (prov && toId(neg.provider) === prov._id.toString()) return 'provider';

  return null;
};

/* ═══════════════════════════════════════════════════════════════════
   POST /api/bargain/init
   Customer initiates a negotiation (pending OR accepted booking)
═══════════════════════════════════════════════════════════════════ */
exports.initNegotiation = async (req, res, next) => {
  try {
    const neg = await bargainService.initNegotiation({
      bookingId:    req.body.bookingId,
      customerId:   req.user.id,
      initialOffer: Number(req.body.initialOffer),
      message:      req.body.message || '',
    });
    res.status(201).json({ success: true, data: neg });
  } catch (err) { next(err); }
};

/* ═══════════════════════════════════════════════════════════════════
   POST /api/bargain/:id/counter
═══════════════════════════════════════════════════════════════════ */
exports.submitCounter = async (req, res, next) => {
  try {
    const neg  = await Negotiation.findById(req.params.id);
    if (!neg) return next(new ApiError(404, 'Negotiation not found'));

    const role = await resolveRole(req.user.id, neg);
    if (!role) return next(new ApiError(403, 'You are not a participant in this negotiation'));

    const updated = await bargainService.submitCounter({
      negotiationId: req.params.id,
      userId:        req.user.id,
      role,
      amount:        Number(req.body.amount),
      message:       req.body.message || '',
    });

    req.io?.to(`user_${(updated.customer?._id ?? updated.customer)}`).emit('negotiation:counter', {
      negotiationId: updated._id,
      amount:        Number(req.body.amount),
      role,
    });
    req.io?.to(`provider_${(updated.provider?._id ?? updated.provider)}`).emit('negotiation:counter', {
      negotiationId: updated._id,
      amount:        Number(req.body.amount),
      role,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (err) { next(err); }
};

/* ═══════════════════════════════════════════════════════════════════
   POST /api/bargain/:id/accept
═══════════════════════════════════════════════════════════════════ */
exports.acceptOffer = async (req, res, next) => {
  try {
    const neg = await Negotiation.findById(req.params.id);
    if (!neg) return next(new ApiError(404, 'Negotiation not found'));

    const userRole = await resolveRole(req.user.id, neg);
    if (!userRole) return next(new ApiError(403, 'Access denied'));

    const updated = await bargainService.acceptOffer({
      negotiationId: req.params.id,
      userId:        req.user.id,
      userRole,
    });

    req.io?.to(`user_${(updated.customer?._id ?? updated.customer)}`).emit('negotiation:accepted', {
      negotiationId: updated._id,
      finalPrice:    updated.finalPrice,
    });
    req.io?.to(`provider_${(updated.provider?._id ?? updated.provider)}`).emit('negotiation:accepted', {
      negotiationId: updated._id,
      finalPrice:    updated.finalPrice,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (err) { next(err); }
};

/* ═══════════════════════════════════════════════════════════════════
   POST /api/bargain/:id/reject
═══════════════════════════════════════════════════════════════════ */
exports.rejectOffer = async (req, res, next) => {
  try {
    const neg = await Negotiation.findById(req.params.id);
    if (!neg) return next(new ApiError(404, 'Negotiation not found'));

    const userRole = await resolveRole(req.user.id, neg);
    if (!userRole) return next(new ApiError(403, 'Access denied'));

    const updated = await bargainService.rejectOffer({
      negotiationId: req.params.id,
      userId:        req.user.id,
      userRole,
    });

    req.io?.to(`user_${(updated.customer?._id ?? updated.customer)}`).emit('negotiation:rejected', { negotiationId: updated._id });
    req.io?.to(`provider_${(updated.provider?._id ?? updated.provider)}`).emit('negotiation:rejected', { negotiationId: updated._id });

    res.status(200).json({ success: true, data: updated });
  } catch (err) { next(err); }
};

/* ═══════════════════════════════════════════════════════════════════
   GET /api/bargain/:id/suggest
═══════════════════════════════════════════════════════════════════ */
exports.getSuggestion = async (req, res, next) => {
  try {
    const neg = await Negotiation.findById(req.params.id);
    if (!neg) return next(new ApiError(404, 'Negotiation not found'));

    const role = await resolveRole(req.user.id, neg);
    if (!role) return next(new ApiError(403, 'Access denied'));

    const suggested = bargainService.computeSuggestion(neg);
    res.json({ success: true, suggested });
  } catch (err) { next(err); }
};

/* ═══════════════════════════════════════════════════════════════════
   GET /api/bargain/:id
   Fetch negotiation by its own ID — uses populated `customer` field
═══════════════════════════════════════════════════════════════════ */
exports.getNegotiation = async (req, res, next) => {
  try {
    const neg = await Negotiation.findById(req.params.id)
      .populate('customer',        'name avatar email')
      .populate('provider',        'name')
      .populate('offers.fromUser', 'name avatar');

    if (!neg) return next(new ApiError(404, 'Negotiation not found'));

    // resolveRole now handles populated objects correctly (the original bug fix)
    const role = await resolveRole(req.user.id, neg);
    if (!role && req.user.role !== 'admin')
      return next(new ApiError(403, 'Access denied'));

    res.json({ success: true, data: neg });
  } catch (err) { next(err); }
};

/* ═══════════════════════════════════════════════════════════════════
   GET /api/bargain/booking/:bookingId
   Fetch the negotiation for a given booking
═══════════════════════════════════════════════════════════════════ */
exports.getByBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) return next(new ApiError(404, 'Booking not found'));

    const isCustomer = booking.user.toString() === req.user.id;
    let isProvider   = false;

    if (!isCustomer) {
      const prov = await Provider.findOne({ user: req.user.id }).select('_id');
      isProvider  = prov && booking.provider.toString() === prov._id.toString();
    }

    if (!isCustomer && !isProvider && req.user.role !== 'admin')
      return next(new ApiError(403, 'Access denied'));

    const neg = await Negotiation
      .findOne({ booking: bookingId })
      .populate('customer',        'name avatar email')
      .populate('provider',        'name')
      .populate('offers.fromUser', 'name avatar')
      .sort('-createdAt');

    res.json({ success: true, data: neg || null });
  } catch (err) { next(err); }
};