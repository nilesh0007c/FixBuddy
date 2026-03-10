'use strict';
// backend/models/ChatbotSession.js

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role:    { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true, maxlength: 4000 },
}, { _id: false, timestamps: false });

MessageSchema.add({ createdAt: { type: Date, default: Date.now } });

const ChatbotSessionSchema = new mongoose.Schema({
  sessionId:  { type: String, required: true, unique: true, index: true },
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  messages:   [MessageSchema],
  escalated:  { type: Boolean, default: false },
  escalatedAt:{ type: Date,    default: null },
  rating:     { type: Number,  min: 1, max: 5, default: null },
  ratedAt:    { type: Date,    default: null },
  intent:     { type: String,  default: '' },   // last detected intent
  metadata:   { type: Object,  default: {} },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

ChatbotSessionSchema.index({ createdAt: -1 });
ChatbotSessionSchema.index({ user: 1 });

module.exports = mongoose.model('ChatbotSession', ChatbotSessionSchema);