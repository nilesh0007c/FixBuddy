// backend/models/Complaint.js
const mongoose = require('mongoose');

const CATEGORIES = [
  'Poor Service Quality',
  'Overcharging / Billing Issue',
  'Misbehavior / Unprofessional Conduct',
  'Late Arrival / No Show',
  'Work Not Completed',
  'Damage to Property',
  'Safety Concern',
  'Fraud / Scam',
  'Other',
];

const HIGH_PRIORITY_KEYWORDS = [
  'scam', 'fraud', 'abuse', 'threat', 'assault',
  'steal', 'stolen', 'violence', 'unsafe', 'danger',
];

const complaintSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
      index: true,
    },
    serviceRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    complaintText: {
      type: String,
      required: [true, 'Complaint description is required'],
      minlength: [20, 'Complaint must be at least 20 characters'],
      maxlength: [2000, 'Complaint cannot exceed 2000 characters'],
      trim: true,
    },
    complaintCategory: {
      type: String,
      enum: CATEGORIES,
      required: [true, 'Please select a complaint category'],
    },
    evidenceImages: [
      {
        url: { type: String, required: true },
        publicId: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ['Pending', 'Under Review', 'Resolved', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['Normal', 'High'],
      default: 'Normal',
    },
    adminReply: {
      message: { type: String, trim: true },
      repliedAt: { type: Date },
      repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    complaintAllowedUntil: {
      type: Date,
      required: true,
    },
    isWithinWindow: {
      type: Boolean,
      default: true,
    },
    resolvedAt: { type: Date },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: String,
      },
    ],
  },
  { timestamps: true }
);

// Auto-detect priority from complaint text
complaintSchema.pre('save', function (next) {
  const text = this.complaintText.toLowerCase();
  const isHighPriority = HIGH_PRIORITY_KEYWORDS.some((kw) => text.includes(kw));
  if (isHighPriority) this.priority = 'High';

  // Mark if outside window
  if (new Date() > this.complaintAllowedUntil) this.isWithinWindow = false;

  next();
});

// Static: allowed categories
complaintSchema.statics.getCategories = () => CATEGORIES;

// Virtual: time remaining in window
complaintSchema.virtual('timeRemainingMs').get(function () {
  return Math.max(0, new Date(this.complaintAllowedUntil) - new Date());
});

complaintSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Complaint', complaintSchema);