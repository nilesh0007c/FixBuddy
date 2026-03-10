'use strict';
// backend/models/Message.js

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    chatId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Chat',
      required: true,
      index:    true,
    },
    sender: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    content: {
      type:    String,
      default: '',
      trim:    true,
    },
    type: {
      type:    String,
      enum:    ['text', 'image', 'video', 'audio', 'file', 'document'],
      default: 'text',
    },
    attachment: {
      url:          { type: String,  default: null },
      originalName: { type: String,  default: null },
      mimetype:     { type: String,  default: null },
      size:         { type: Number,  default: null },
      fileType:     { type: String,  default: null },
    },
    replyTo: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'Message',
      default: null,
    },
    status: {
      delivered:  { type: Boolean, default: false },
      deliveredAt:{ type: Date,    default: null  },
      seen:       { type: Boolean, default: false },
      seenAt:     { type: Date,    default: null  },
    },
    isDeleted:  { type: Boolean, default: false },
    deletedAt:  { type: Date,    default: null  },
    deletedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isFlagged:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

MessageSchema.index({ chatId: 1, createdAt: 1 });
MessageSchema.index({ sender: 1 });

module.exports = mongoose.models.Message || mongoose.model('Message', MessageSchema);