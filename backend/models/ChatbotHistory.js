// backend/models/ChatbotHistory.js  — ENHANCED VERSION
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role:      { type: String, enum: ['user','assistant','system'], required: true },
  content:   { type: String, required: true, maxlength: 4000 },
  intent:    { type: String },                        // classified intent
  confidence:{ type: Number, min: 0, max: 1 },        // AI confidence score
  timestamp: { type: Date, default: Date.now },
  tokensUsed:{ type: Number, default: 0 }
}, { _id: false });

const ChatbotHistorySchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  sessionId:  { type: String, required: true, unique: true, index: true },
  messages:   [MessageSchema],
  language:   { type: String, default: 'en' },
  totalTokensUsed: { type: Number, default: 0 },
  resolved:   { type: Boolean, default: false, index: true },

  // NEW: Escalation support
  escalated:  { type: Boolean, default: false },
  escalatedAt:{ type: Date },
  assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // NEW: Guest tracking
  guestIp:    { type: String },
  userAgent:  { type: String },

  // NEW: Quality tracking
  rating:     { type: Number, min: 1, max: 5 },
  feedback:   { type: String, maxlength: 500 },
  closedAt:   { type: Date },
  closedBy:   { type: String, enum: ['user','admin','timeout','resolved'] }
}, { timestamps: true });

// Indexes for admin dashboard queries
ChatbotHistorySchema.index({ user: 1, createdAt: -1 });
ChatbotHistorySchema.index({ escalated: 1, resolved: 1 });
ChatbotHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('ChatbotHistory', ChatbotHistorySchema);
