const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Provider = require('../models/Provider'); // adjust path
/* ===============================
   PROTECT ROUTES (JWT Required)
================================ */
const protect = async (req, res, next) => {
  try {
    const token =
      req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/* ===============================
   ROLE-BASED AUTHORIZATION
================================ */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    next();
  };
};

/* ===============================
   OPTIONAL AUTH (Guest Allowed)
================================ */
const optionalAuth = async (req, res, next) => {
  try {
    const token =
      req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null;

    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (user) req.user = user;

    next();
  } catch (err) {
    next();
  }
};

const attachProvider = async (req, res, next) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider) {
      return res.status(403).json({ success: false, message: 'Provider profile not found.' });
    }
    req.provider = provider;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  protect,
  authorize,
  optionalAuth,
  attachProvider 
};
