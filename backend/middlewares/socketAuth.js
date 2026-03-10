const jwt  = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token ||
                  socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) return next(new Error('Authentication required'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password');
    if (!user) return next(new Error('User not found'));

    socket.user = user;
    socket.join(`user:${user._id}`); // Personal notification room
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
};