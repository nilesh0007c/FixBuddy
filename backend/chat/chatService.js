'use strict';
// backend/services/chatService.js

const Chat    = require('../models/Chat');
const Message = require('../models/Message');
const path    = require('path');
const fs      = require('fs');

/* ─────────────────────────────────────────────────────────────────────
   FILE TYPE HELPERS
───────────────────────────────────────────────────────────────────── */
const IMAGE_EXTS = ['.jpg','.jpeg','.png','.gif','.webp','.svg','.bmp'];
const VIDEO_EXTS = ['.mp4','.mov','.avi','.mkv','.webm','.flv'];
const AUDIO_EXTS = ['.mp3','.wav','.ogg','.m4a','.aac','.flac','.webm'];
const DOC_EXTS   = ['.pdf','.doc','.docx','.xls','.xlsx','.ppt','.pptx','.txt','.csv','.zip','.rar','.7z'];

function getFileType(filename) {
  const ext = path.extname(filename || '').toLowerCase();
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (VIDEO_EXTS.includes(ext)) return 'video';
  if (AUDIO_EXTS.includes(ext)) return 'audio';
  if (DOC_EXTS.includes(ext))   return 'document';
  return 'file';
}

/* ─────────────────────────────────────────────────────────────────────
   ONLINE / OFFLINE  (in-memory set — replace with Redis in production)
   These are called by chatSocketHandler.js
───────────────────────────────────────────────────────────────────── */
const _onlineUsers = new Set();

exports.setUserOnline = async (userId) => {
  _onlineUsers.add(userId.toString());
};

exports.setUserOffline = async (userId) => {
  _onlineUsers.delete(userId.toString());
};

exports.isUserOnline = (userId) => _onlineUsers.has(userId.toString());

/* ─────────────────────────────────────────────────────────────────────
   ACCESS CHECK  — called by chatSocketHandler.js
───────────────────────────────────────────────────────────────────── */
exports.canUserAccessChat = async (userId, chatId) => {
  const chat = await Chat.findById(chatId).select('participants isActive');
  if (!chat || !chat.isActive) return false;
  return chat.participants.some(p => p.toString() === userId.toString());
};

/* ─────────────────────────────────────────────────────────────────────
   SAVE MESSAGE  — called by chatSocketHandler.js
───────────────────────────────────────────────────────────────────── */
exports.saveMessage = async ({ chatId, sender, content, type = 'text', replyTo = null }) => {
  const msg = await Message.create({
    chatId,
    sender,
    content: content || '',
    type,
    replyTo: replyTo || null,
  });
  await Chat.findByIdAndUpdate(chatId, { lastMessage: msg._id, updatedAt: new Date() });
  return msg;
};

/* ─────────────────────────────────────────────────────────────────────
   UPLOAD FILE  — called by chatController after multer
───────────────────────────────────────────────────────────────────── */
exports.uploadFile = async (file) => {
  if (!file) throw new Error('No file provided');
  return {
    url:          `/uploads/chat/${file.filename}`,
    originalName: file.originalname,
    mimetype:     file.mimetype,
    size:         file.size,
    fileType:     getFileType(file.originalname),
  };
};

/* ─────────────────────────────────────────────────────────────────────
   GET MESSAGES  (paginated)
───────────────────────────────────────────────────────────────────── */
exports.getMessages = async ({ chatId, page = 1, limit = 50 }) => {
  const skip = (page - 1) * limit;
  const messages = await Message.find({ chatId, isDeleted: false })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .populate('sender', 'name avatar role')
    .populate('replyTo', 'content sender');

  const total = await Message.countDocuments({ chatId, isDeleted: false });
  return { messages, total, page, pages: Math.ceil(total / limit) };
};

/* ─────────────────────────────────────────────────────────────────────
   MARK READ
───────────────────────────────────────────────────────────────────── */
exports.markRead = async ({ chatId, userId }) => {
  await Message.updateMany(
    { chatId, 'status.seen': false, sender: { $ne: userId } },
    { 'status.seen': true, 'status.seenAt': new Date() }
  );
};

/* ─────────────────────────────────────────────────────────────────────
   DELETE MESSAGE
───────────────────────────────────────────────────────────────────── */
exports.deleteMessage = async ({ messageId, userId }) => {
  const msg = await Message.findById(messageId);
  if (!msg) throw Object.assign(new Error('Message not found'), { status: 404 });
  if (msg.sender.toString() !== userId.toString())
    throw Object.assign(new Error('You can only delete your own messages'), { status: 403 });

  if (msg.attachment?.url) {
    const filePath = path.join(__dirname, '..', 'public', msg.attachment.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await msg.deleteOne();
};