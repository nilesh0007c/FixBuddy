'use strict';
// backend/chat/chatSocketHandler.js

const Chat    = require('../models/Chat');
const Message = require('../models/Message');

module.exports = (io, socket) => {
  if (!socket.user?._id) return;

  const userId = socket.user._id.toString();

  /* ── join a single specific room (called by ChatWindow on mount) ── */
  socket.on('join_room', async (chatId) => {
    if (!chatId) return;
    try {
      const chat = await Chat.findOne({
        _id:          chatId,
        participants: userId,
        isActive:     true,
      }).select('_id');
      if (!chat) return;
      socket.join(`chat:${chatId}`);
      socket.emit('room_joined', { chatId });
    } catch (err) {
      console.error('[Socket] join_room error:', err.message);
    }
  });

  /* ── join ALL user rooms at once (sidebar / initial connect) ── */
  socket.on('chat:join_rooms', async () => {
    try {
      const chats = await Chat.find({ participants: userId, isActive: true }).select('_id');
      chats.forEach(c => socket.join(`chat:${c._id}`));
      socket.emit('chat:rooms_joined', { count: chats.length });
    } catch (err) {
      console.error('[Socket] chat:join_rooms error:', err.message);
    }
  });

  /* ── leave a room ── */
  socket.on('leave_room', (chatId) => {
    if (chatId) socket.leave(`chat:${chatId}`);
  });

  /* ── send message via socket (optional path — HTTP POST also works) ── */
  socket.on('chat:send_message', async (data, ack = () => {}) => {
    try {
      const { chatId, content, type = 'text', replyTo } = data;
      if (!chatId || !content) return ack({ error: 'chatId and content are required' });

      const chat = await Chat.findOne({ _id: chatId, participants: userId, isActive: true });
      if (!chat) return ack({ error: 'Access denied' });

      const msg = await Message.create({
        chatId, sender: userId, content, type,
        replyTo: replyTo || null,
      });
      await Chat.findByIdAndUpdate(chatId, { lastMessage: msg._id, updatedAt: new Date() });

      const populated = await msg.populate('sender', 'name avatar');

      // emit to everyone in the room (including sender's other tabs)
      io.to(`chat:${chatId}`).emit('chat:new_message', populated);
      ack({ success: true, data: populated });
    } catch (err) {
      console.error('[Socket] chat:send_message error:', err.message);
      ack({ error: err.message });
    }
  });

  /* ── typing indicators ── */
  socket.on('chat:typing_start', ({ chatId }) => {
    if (chatId) socket.to(`chat:${chatId}`).emit('chat:user_typing', { userId, chatId, isTyping: true });
  });

  socket.on('chat:typing_stop', ({ chatId }) => {
    if (chatId) socket.to(`chat:${chatId}`).emit('chat:user_typing', { userId, chatId, isTyping: false });
  });

  /* ── mark seen ── */
  socket.on('chat:mark_seen', async ({ chatId, messageIds = [] }) => {
    try {
      if (!chatId || !messageIds.length) return;
      await Message.updateMany(
        { _id: { $in: messageIds }, chatId, sender: { $ne: userId } },
        { 'status.seen': true, 'status.seenAt': new Date() }
      );
      socket.to(`chat:${chatId}`).emit('chat:messages_seen', { messageIds, seenBy: userId });
    } catch (err) {
      console.error('[Socket] mark_seen error:', err.message);
    }
  });

  /* ── disconnect ── */
  socket.on('disconnect', () => {
    socket.broadcast.emit('chat:user_offline', { userId });
  });

  /* ── broadcast online status ── */
  socket.broadcast.emit('chat:user_online', { userId });
};