'use strict';
// backend/bargaining/bargainService.js
//
// TURN-BASED LOGIC:
//   lastOffer.role = 'customer'  →  provider's turn  (provider sees action panel)
//   lastOffer.role = 'provider'  →  customer's turn  (customer sees action panel)
//
// ROOT CAUSE OF BUG FIXED HERE:
//   AUTO_COUNTER_ENABLED was true. initNegotiation appended a provider auto-offer
//   immediately after the customer's first offer, making lastOffer.role='provider'
//   from the very start. So:
//     • Customer (myRole='customer'): isMyTurn = 'provider' !== 'customer' = TRUE
//     • Provider (myRole='provider'): isMyTurn = 'provider' !== 'provider' = FALSE
//   Provider could never see accept/reject/counter. Customer always had the panel.
//   
//   FIX: No auto-counter anywhere. Only auto-ACCEPT is allowed (closes the deal).
//   initNegotiation ends with lastOffer.role='customer' → provider's turn first.

const Negotiation = require('../models/Negotiation');
const Booking     = require('../models/Booking');
const { ApiError }= require('../utils/ApiError');

const MAX_DISCOUNT_PCT = 40;
const OFFER_EXPIRY_MIN = 30;
const NEGO_EXPIRY_DAYS = 3;
const MAX_ROUNDS       = 5;
const AUTO_ACCEPT_PCT  = 10; // auto-close if offer >= original * 90%

const offerExpiry = () => new Date(Date.now() + OFFER_EXPIRY_MIN * 60_000);
const negoExpiry  = () => new Date(Date.now() + NEGO_EXPIRY_DAYS * 24 * 3600_000);

/* ── computeSuggestion (pure, no DB) ── */
exports.computeSuggestion = (neg) => {
  if (!neg || neg.status !== 'open') return null;
  let customerOffer = neg.originalPrice;
  let providerOffer = neg.originalPrice;
  for (const o of neg.offers) {
    if (o.role === 'customer') customerOffer = o.amount;
    if (o.role === 'provider') providerOffer = o.amount;
  }
  const midpoint   = Math.round((customerOffer + providerOffer) / 2);
  const minAllowed = Math.ceil(neg.originalPrice * (1 - MAX_DISCOUNT_PCT / 100));
  return Math.max(minAllowed, Math.min(midpoint, neg.originalPrice - 1));
};

/* ── initNegotiation ──
   After this call: offers = [{ role:'customer' }]
   lastOffer.role = 'customer'  →  PROVIDER'S turn on the frontend.
   No auto-counter appended. Provider must manually respond.
── */
exports.initNegotiation = async ({ bookingId, customerId, initialOffer, message }) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');

  if (!['pending', 'accepted'].includes(booking.status))
    throw new ApiError(400, `Cannot negotiate on a "${booking.status}" booking`);

  if (booking.user.toString() !== customerId)
    throw new ApiError(403, 'Only the booking customer can start a negotiation');

  const existing = await Negotiation.findOne({ booking: bookingId, status: 'open' });
  if (existing) throw new ApiError(409, 'A negotiation is already open for this booking');

  const originalPrice = booking.totalAmount || booking.service?.price;
  if (!originalPrice) throw new ApiError(400, 'Booking has no listed price to negotiate');

  const minAllowed = originalPrice * (1 - MAX_DISCOUNT_PCT / 100);
  if (initialOffer >= originalPrice)
    throw new ApiError(400, 'Your offer must be lower than the original listed price');
  if (initialOffer < minAllowed)
    throw new ApiError(400, `Minimum offer is ₹${Math.ceil(minAllowed)} (max ${MAX_DISCOUNT_PCT}% off)`);

  const neg = await Negotiation.create({
    booking:        bookingId,
    customer:       customerId,
    provider:       booking.provider,
    originalPrice,
    currentOffer:   initialOffer,
    currentRound:   1,
    maxRounds:      MAX_ROUNDS,
    expiresAt:      negoExpiry(),
    lastActivityAt: new Date(),
    offers: [{
      fromUser:  customerId,
      role:      'customer',   // lastOffer.role = 'customer' → provider's turn
      amount:    initialOffer,
      message:   message || '',
      status:    'pending',
      expiresAt: offerExpiry(),
    }],
  });

  // Auto-accept if offer is within 10% of original
  const autoAcceptThreshold = originalPrice * (1 - AUTO_ACCEPT_PCT / 100);
  if (initialOffer >= autoAcceptThreshold) {
    neg.status     = 'accepted';
    neg.finalPrice = initialOffer;
    neg.lockedAt   = new Date();
    await neg.save();
    await Booking.findByIdAndUpdate(bookingId, {
      totalAmount: initialOffer, 'service.price': initialOffer,
      priceNegotiated: true, finalPrice: initialOffer,
    });
    return neg;
  }

  // No auto-counter — save and let provider respond manually
  return neg;
};

/* ── submitCounter ──
   After customer counter: lastOffer.role='customer' → provider's turn
   After provider counter: lastOffer.role='provider' → customer's turn
── */
exports.submitCounter = async ({ negotiationId, userId, role, amount, message }) => {
  const neg = await Negotiation.findById(negotiationId);
  if (!neg)                  throw new ApiError(404, 'Negotiation not found');
  if (neg.status !== 'open') throw new ApiError(400, `Negotiation is already ${neg.status}`);

  if (new Date() > neg.expiresAt) {
    neg.status = 'expired'; await neg.save();
    throw new ApiError(400, 'This negotiation has expired');
  }

  // Turn check: cannot respond to your own offer
  const lastOffer = neg.offers[neg.offers.length - 1];
  if (lastOffer?.role === role)
    throw new ApiError(400, `It is not your turn — waiting for the ${role === 'customer' ? 'provider' : 'customer'} to respond.`);

  if (neg.currentRound >= neg.maxRounds) {
    neg.status = 'expired'; await neg.save();
    throw new ApiError(400, 'Maximum negotiation rounds reached.');
  }

  const minAllowed = neg.originalPrice * (1 - MAX_DISCOUNT_PCT / 100);
  if (amount < minAllowed)
    throw new ApiError(400, `Counter-offer must be at least ₹${Math.ceil(minAllowed)}`);
  if (amount >= neg.originalPrice)
    throw new ApiError(400, 'Counter-offer must be below the original listed price');

  neg.offers.push({
    fromUser: userId, role, amount,
    message: message || '', status: 'pending', expiresAt: offerExpiry(),
  });
  neg.currentOffer   = amount;
  neg.currentRound  += 1;
  neg.lastActivityAt = new Date();

  // Auto-accept if customer's counter is close enough
  if (role === 'customer') {
    const autoAcceptThreshold = neg.originalPrice * (1 - AUTO_ACCEPT_PCT / 100);
    if (amount >= autoAcceptThreshold) {
      neg.status = 'accepted'; neg.finalPrice = amount;
      neg.lockedAt = new Date(); await neg.save();
      await Booking.findByIdAndUpdate(neg.booking, {
        totalAmount: amount, 'service.price': amount,
        priceNegotiated: true, finalPrice: amount,
      });
      return neg;
    }
  }

  return neg.save();
};

/* ── acceptOffer ── */
exports.acceptOffer = async ({ negotiationId, userId, userRole }) => {
  const neg = await Negotiation.findById(negotiationId);
  if (!neg)                  throw new ApiError(404, 'Negotiation not found');
  if (neg.status !== 'open') throw new ApiError(400, `Negotiation is already ${neg.status}`);
  if (neg.lockedAt)          throw new ApiError(400, 'Negotiation is already locked');

  const lastOffer = neg.offers[neg.offers.length - 1];
  if (lastOffer?.role === userRole)
    throw new ApiError(403, 'You cannot accept your own offer');

  neg.status = 'accepted'; neg.finalPrice = neg.currentOffer;
  neg.lockedAt = new Date(); neg.lockedBy = userId;
  await neg.save();
  await Booking.findByIdAndUpdate(neg.booking, {
    totalAmount: neg.finalPrice, 'service.price': neg.finalPrice,
    priceNegotiated: true, finalPrice: neg.finalPrice,
  });
  return neg;
};

/* ── rejectOffer ── */
exports.rejectOffer = async ({ negotiationId, userId, userRole }) => {
  const neg = await Negotiation.findById(negotiationId);
  if (!neg)                  throw new ApiError(404, 'Negotiation not found');
  if (neg.status !== 'open') throw new ApiError(400, `Negotiation is ${neg.status}`);

  const lastOffer = neg.offers[neg.offers.length - 1];
  if (lastOffer?.role === userRole)
    throw new ApiError(403, 'You cannot reject your own offer');

  neg.status = 'rejected'; neg.lastActivityAt = new Date();
  return neg.save();
};

/* ── expireOldNegotiations (cron) ── */
exports.expireOldNegotiations = async () => {
  const result = await Negotiation.updateMany(
    { status: 'open', expiresAt: { $lt: new Date() } },
    { $set: { status: 'expired' } }
  );
  return result.modifiedCount;
};