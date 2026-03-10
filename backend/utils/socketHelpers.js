const redis = require('../config/redis');


// Broadcast notification to a specific user's personal room
exports.notifyUser = (io, userId, event, data) => {
  io.to(`user:${userId}`).emit(event, data);
};

// Broadcast to all participants of a chat
exports.notifyChat = (io, chatId, event, data) => {
  io.to(`chat:${chatId}`).emit(event, data);
};

// Track unread count in Redis
exports.incrementUnread = async (userId, chatId) => {
  await redis.hIncrBy(`unread:${userId}`, chatId, 1);
};

exports.clearUnread = async (userId, chatId) => {
  await redis.hDel(`unread:${userId}`, chatId);
};

exports.getUnreadCounts = async (userId) => {
  return redis.hGetAll(`unread:${userId}`);
};

// Get all connected socket IDs for a user
exports.getUserSockets = async (io, userId) => {
  const sockets = await io.in(`user:${userId}`).fetchSockets();
  return sockets.map(s => s.id);
};

// Check if any socket is connected for a user
exports.isUserConnected = async (io, userId) => {
  const sockets = await io.in(`user:${userId}`).fetchSockets();
  return sockets.length > 0;
};