'use strict';
// backend/routes/chatRoutes.js

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/chatController');
const { protect } = require('../middlewares/auth');

// Every route requires a valid JWT
router.use(protect);

/* ── GET  /api/chat                      — sidebar list of all chats ── */
router.get('/', ctrl.getUserChats);

/* ── POST /api/chat/init                 — create or open existing chat ── */
router.post('/init', ctrl.initChat);

/* ── POST /api/chat/message              — send a message ── */
router.post('/message', ctrl.sendMessage);

/* ── POST /api/chat/upload               — upload file before sending ──
   uploadMiddleware runs first (multer).  Its errors are caught in the
   wrapper callback and returned as 400 instead of crashing the server. ── */
router.post(
  '/upload',
  (req, res, next) => {
    ctrl.uploadMiddleware(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  ctrl.uploadFile,
);

/* ── GET   /api/chat/:chatId/messages    — paginated message history ── */
router.get('/:chatId/messages', ctrl.getChatHistory);

/* ── PATCH /api/chat/:chatId/read        — mark messages as seen ── */
router.patch('/:chatId/read', ctrl.markRead);

/* ── DELETE /api/chat/message/:messageId — soft-delete a message ── */
router.delete('/message/:messageId', ctrl.deleteMessage);

module.exports = router;