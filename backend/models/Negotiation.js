'use strict';

const mongoose = require('mongoose');

/* ─── Sub-schema: single offer in the history ─── */
const offerSchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role:     { type: String, enum: ['customer', 'provider'], required: true },
    amount:   { type: Number, required: true, min: 0 },
    message:  { type: String, default: '', maxlength: 300 },
    status:   {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired'],
      default: 'pending',
    },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

/* ─── Main negotiation schema ─── */
const negotiationSchema = new mongoose.Schema(
  {
    booking:  {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Booking',
      required: true,
      index:    true,
    },
    customer: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    provider: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Provider',
      required: true,
      index:    true,
    },

    originalPrice: { type: Number, required: true, min: 0 },
    currentOffer:  { type: Number, required: true, min: 0 },
    finalPrice:    { type: Number, min: 0 },

    status: {
      type:    String,
      enum:    ['open', 'accepted', 'rejected', 'expired'],
      default: 'open',
      index:   true,
    },

    currentRound:  { type: Number, default: 1, min: 1 },
    maxRounds:     { type: Number, default: 5 },

    expiresAt:      { type: Date, required: true, index: true },
    lastActivityAt: { type: Date },

    // Set when deal is locked (accepted or rejected)
    lockedAt: { type: Date },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Flattened offer history
    offers: { type: [offerSchema], default: [] },
  },
  { timestamps: true }
);

/* ─── Compound indexes for common queries ─── */
negotiationSchema.index({ booking: 1, status: 1 });
negotiationSchema.index({ customer: 1, status: 1 });
negotiationSchema.index({ provider: 1, status: 1 });
negotiationSchema.index({ status: 1, expiresAt: 1 }); // for cron expiry job

module.exports = mongoose.model('Negotiation', negotiationSchema);