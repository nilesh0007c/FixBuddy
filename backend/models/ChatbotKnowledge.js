'use strict';
// backend/models/KnowledgeBase.js

const mongoose = require('mongoose');

const KnowledgeBaseSchema = new mongoose.Schema({
  question:  { type: String, required: true, trim: true },
  answer:    { type: String, required: true, trim: true },
  keywords:  [{ type: String, lowercase: true, trim: true }],
  category:  {
    type: String,
    enum: ['booking', 'payment', 'provider', 'account', 'general', 'cancellation', 'support'],
    default: 'general',
  },
  isActive:  { type: Boolean, default: true },
  usageCount:{ type: Number, default: 0 },
}, { timestamps: true });

KnowledgeBaseSchema.index({ keywords: 1 });
KnowledgeBaseSchema.index({ category: 1 });

module.exports = mongoose.model('KnowledgeBase', KnowledgeBaseSchema);