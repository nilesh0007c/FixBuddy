const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  isActive: { type: Boolean, default: true },
  blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bookingRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }
}, { timestamps: true });

ChatSchema.index({ participants: 1 });
ChatSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Chat', ChatSchema);