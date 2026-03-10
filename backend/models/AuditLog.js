// backend/models/AuditLog.js  — NEW
const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  action:     { type: String, required: true, index: true },
  // e.g. 'USER_BANNED', 'USER_REACTIVATED', 'PROVIDER_VERIFIED',
  //       'PROVIDER_REJECTED', 'KNOWLEDGE_CREATED', etc.

  performedBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User',
                required: true, index: true },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User',
                index: true },
  targetModel:{ type: String },    // 'User' | 'Provider' | etc.
  targetId:   { type: mongoose.Schema.Types.ObjectId },

  reason:     { type: String, maxlength: 1000 },
  metadata:   { type: mongoose.Schema.Types.Mixed }, // extra data
  ipAddress:  { type: String },
  userAgent:  { type: String }
}, { timestamps: true });

AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ performedBy: 1, createdAt: -1 });
AuditLogSchema.index({ targetUser: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
