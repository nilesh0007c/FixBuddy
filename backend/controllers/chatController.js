'use strict';
// backend/controllers/chatController.js

const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const Chat     = require('../models/Chat');
const Message  = require('../models/Message');
const { ApiError } = require('../utils/ApiError');

/* ─────────────────────────────────────────────────────────────────────
   MULTER setup
───────────────────────────────────────────────────────────────────── */
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'chat');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIMES = new Set([
  'image/jpeg','image/png','image/gif','image/webp','image/svg+xml','image/bmp',
  'video/mp4','video/quicktime','video/x-msvideo','video/webm','video/x-matroska',
  'audio/mpeg','audio/wav','audio/ogg','audio/mp4','audio/aac','audio/webm','audio/x-m4a',
  'application/pdf','text/plain','text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip','application/x-rar-compressed','application/x-7z-compressed',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const uid = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, uid + path.extname(file.originalname));
  },
});

const _multer = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) return cb(null, true);
    cb(new Error(`File type "${file.mimetype}" is not allowed`), false);
  },
});

exports.uploadMiddleware = _multer.single('file');

/* ─────────────────────────────────────────────────────────────────────
   HELPER — verify user is a participant
───────────────────────────────────────────────────────────────────── */
async function requireChatAccess(chatId, userId, next) {
  const chat = await Chat.findById(chatId);
  if (!chat)                                      { next(new ApiError(404, 'Chat not found'));  return null; }
  if (!chat.participants.map(p => p.toString()).includes(userId))
                                                  { next(new ApiError(403, 'Access denied'));   return null; }
  return chat;
}

/* ─────────────────────────────────────────────────────────────────────
   GET /api/chat  — sidebar list
───────────────────────────────────────────────────────────────────── */
exports.getUserChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ participants: req.user.id, isActive: true })
      .populate('participants', 'name email avatar role')
      .populate({
        path: 'lastMessage',
        select: 'content type createdAt sender',
        populate: { path: 'sender', select: 'name' },
      })
      .sort('-updatedAt');
    res.json({ success: true, data: chats });
  } catch (err) { next(err); }
};

/* ─────────────────────────────────────────────────────────────────────
   POST /api/chat/init  — create or open existing 1-on-1 chat
───────────────────────────────────────────────────────────────────── */
exports.initChat = async (req, res, next) => {
  try {
    const { providerId, bookingRef } = req.body;
    if (!providerId) return next(new ApiError(400, 'providerId is required'));

    const sorted = [req.user.id, providerId].sort();
    let chat = await Chat.findOne({ participants: { $all: sorted, $size: 2 }, isActive: true });

    if (!chat) {
      chat = await Chat.create({ participants: sorted, bookingRef: bookingRef || null });
    }

    await chat.populate('participants', 'name email avatar role');
    res.status(200).json({ success: true, data: chat });
  } catch (err) { next(err); }
};

/* ─────────────────────────────────────────────────────────────────────
   GET /api/chat/:chatId/messages  — paginated history
───────────────────────────────────────────────────────────────────── */
exports.getChatHistory = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const page  = Math.max(1,   parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);

    const chat = await requireChatAccess(chatId, req.user.id, next);
    if (!chat) return;

    const messages = await Message.find({ chatId, isDeleted: false })
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sender',  'name avatar')
      .populate('replyTo', 'content sender');

    res.status(200).json({ success: true, data: messages, page, limit });
  } catch (err) { next(err); }
};

/* ─────────────────────────────────────────────────────────────────────
   POST /api/chat/upload  — file upload (multer must run first)
───────────────────────────────────────────────────────────────────── */

exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) return next(new ApiError(400, 'No file uploaded'));

    const mime     = req.file.mimetype || '';
    let fileType   = 'document';
    if (mime.startsWith('image/')) fileType = 'image';
    else if (mime.startsWith('video/')) fileType = 'video';
    else if (mime.startsWith('audio/')) fileType = 'audio';

    // Build the URL that the browser can fetch directly.
    // REACT_APP_API_URL (e.g. "http://localhost:5000") must be set in frontend .env
    // If not set we fall back to req host.
    const origin   = process.env.CLIENT_ORIGIN
                  || `${req.protocol}://${req.get('host')}`;
    const relPath  = `/uploads/chat/${req.file.filename}`;
    const fullUrl  = `${origin}${relPath}`;

    console.log('[upload] saved file →', req.file.path);
    console.log('[upload] serving at →', fullUrl);

    res.status(200).json({
      success:      true,
      url:          relPath,    // relative  (frontend prepends SOCKET_URL)
      fullUrl,                  // absolute  (frontend can use directly)
      originalName: req.file.originalname,
      fileName:     req.file.originalname,
      fileSize:     req.file.size,
      size:         req.file.size,
      mimetype:     mime,
      mimeType:     mime,
      fileType,
      type:         fileType,
    });
  } catch (err) {
    const fs   = require('fs');
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(err);
  }
};

/* ─────────────────────────────────────────────────────────────────────
   POST /api/chat/message  — send message
───────────────────────────────────────────────────────────────────── */
exports.sendMessage = async (req, res, next) => {
  try {
    const { chatId, content, type = 'text', replyTo, attachment } = req.body;
    if (!chatId)               return next(new ApiError(400, 'chatId is required'));
    if (!content && !attachment) return next(new ApiError(400, 'content or attachment required'));

    const chat = await requireChatAccess(chatId, req.user.id, next);
    if (!chat) return;

    const msg = await Message.create({
      chatId,                       // ← uses chatId field (matches new model)
      sender:     req.user.id,
      content:    content || '',
      type,
      replyTo:    replyTo    || null,
      attachment: attachment || null,
    });

    await Chat.findByIdAndUpdate(chatId, { lastMessage: msg._id, updatedAt: new Date() });

    const populated = await msg.populate([
      { path: 'sender', select: 'name avatar' },
      { path: 'replyTo', select: 'content sender' },
    ]);

    const io = req.app.get('io');
    if (io) io.to(`chat:${chatId}`).emit('chat:new_message', populated);

    res.status(201).json({ success: true, data: populated });
  } catch (err) { next(err); }
};

/* ─────────────────────────────────────────────────────────────────────
   PATCH /api/chat/:chatId/read
───────────────────────────────────────────────────────────────────── */
exports.markRead = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    await Message.updateMany(
      { chatId, 'status.seen': false, sender: { $ne: req.user.id } },
      { 'status.seen': true, 'status.seenAt': new Date() }
    );
    res.json({ success: true });
  } catch (err) { next(err); }
};

/* ─────────────────────────────────────────────────────────────────────
   DELETE /api/chat/message/:messageId  — soft-delete
───────────────────────────────────────────────────────────────────── */
exports.deleteMessage = async (req, res, next) => {
  try {
    const msg = await Message.findById(req.params.messageId);
    if (!msg) return next(new ApiError(404, 'Message not found'));
    if (msg.sender.toString() !== req.user.id)
      return next(new ApiError(403, 'You can only delete your own messages'));

    msg.isDeleted = true;
    msg.deletedAt = new Date();
    msg.deletedBy = req.user.id;
    await msg.save();

    const io = req.app.get('io');
    if (io) io.to(`chat:${msg.chatId}`).emit('chat:message_deleted', { messageId: msg._id });

    res.json({ success: true });
  } catch (err) { next(err); }
};

/* ─────────────────────────────────────────────────────────────────────
   Admin
───────────────────────────────────────────────────────────────────── */
exports.adminGetFlagged = async (req, res, next) => {
  try {
    const messages = await Message.find({ isFlagged: true, isDeleted: false })
      .populate('sender', 'name email').sort('-createdAt').limit(50);
    res.json({ success: true, data: messages });
  } catch (err) { next(err); }
};

exports.adminDeleteMessage = async (req, res, next) => {
  try {
    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date(), deletedBy: req.user.id },
      { new: true }
    );
    if (!msg) return next(new ApiError(404, 'Message not found'));
    res.json({ success: true });
  } catch (err) { next(err); }
};