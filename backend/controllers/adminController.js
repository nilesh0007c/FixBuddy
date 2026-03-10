// backend/controllers/adminController.js  — FULL PRODUCTION
const User      = require('../models/User');
const Provider  = require('../models/Provider');
const Booking   = require('../models/Booking');
const AuditLog  = require('../models/AuditLog');
const { sendEmail }      = require('../utils/emailService');
const { emailTemplates } = require('../utils/emailTemplates');
const { ApiError }       = require('../utils/ApiError');

/* ============================================================
   DASHBOARD STATS
============================================================ */
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers, totalProviders,
      pendingCount, verifiedCount, rejectedCount,
      totalBookings, bannedUsers, bannedProviders,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Provider.countDocuments(),
      Provider.countDocuments({ verificationStatus: 'pending' }),
      Provider.countDocuments({ verificationStatus: 'verified' }),
      Provider.countDocuments({ verificationStatus: 'rejected' }),
      Booking.countDocuments(),
      User.countDocuments({ isBanned: true }),
      Provider.countDocuments({ isBanned: true }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers, totalProviders,
        pendingVerifications: pendingCount,
        verifiedProviders:    verifiedCount,
        rejectedProviders:    rejectedCount,
        totalBookings,
        bannedUsers,
        bannedProviders,
      },
    });
  } catch (err) { next(err); }
};

/* ============================================================
   PROVIDER MANAGEMENT
============================================================ */
const getPendingProviders = async (req, res, next) => {
  try {
    const providers = await Provider.find({ verificationStatus: 'pending' })
      .select('name email phone location liveImage idProofImage createdAt')
      .sort('-createdAt');
    res.json({ success: true, count: providers.length, data: providers });
  } catch (err) { next(err); }
};

const verifyProvider = async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.params.id);
    if (!provider) return next(new ApiError(404, 'Provider not found'));
    provider.verificationStatus = 'verified';
    provider.isVerified = true;
    await provider.save();

    await AuditLog.create({
      action: 'PROVIDER_VERIFIED',
      performedBy: req.user._id,
      targetModel: 'Provider',
      targetId: provider._id,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Provider verified', data: provider });
  } catch (err) { next(err); }
};

const rejectProvider = async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.params.id);
    if (!provider) return next(new ApiError(404, 'Provider not found'));
    provider.verificationStatus = 'rejected';
    provider.isVerified = false;
    await provider.save();

    await AuditLog.create({
      action: 'PROVIDER_REJECTED',
      performedBy: req.user._id,
      targetModel: 'Provider',
      targetId: provider._id,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Provider rejected' });
  } catch (err) { next(err); }
};

/* ============================================================
   USER MANAGEMENT
============================================================ */
const getAllUsers = async (req, res, next) => {
  try {
    const { search, role, banned } = req.query;
    const filter = {};
    if (role)   filter.role    = role;
    if (banned) filter.isBanned = banned === 'true';
    if (search) filter.$or = [
      { name:  new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
    ];

    const users = await User.find(filter)
      .select('-password')
      .sort('-createdAt');
    res.json({ success: true, count: users.length, data: users });
  } catch (err) { next(err); }
};

/* ============================================================
   BAN USER
   - Marks user as isBanned + isActive = false
   - If user has a provider profile, also bans that
   - Creates AuditLog entry
   - Sends email notification
============================================================ */
const banUser = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim().length < 10)
      return next(new ApiError(400, 'Reason must be at least 10 characters'));

    const user = await User.findById(req.params.id);
    if (!user)                                     return next(new ApiError(404, 'User not found'));
    if (user.isBanned)                             return next(new ApiError(409, 'User is already suspended'));
    if (user.role === 'admin')                     return next(new ApiError(403, 'Cannot suspend an admin account'));
    if (user._id.toString() === req.user._id.toString())
      return next(new ApiError(400, 'You cannot suspend your own account'));

    user.isActive  = false;
    user.isBanned  = true;
    user.bannedAt  = new Date();
    user.banReason = reason.trim();
    user.bannedBy  = req.user._id;
    await user.save();

    // Also suspend their provider profile if one exists
    await Provider.updateOne({ user: user._id }, {
      isActive:  false,
      isBanned:  true,
      bannedAt:  new Date(),
      banReason: reason.trim(),
      bannedBy:  req.user._id,
    });

    // Audit log
    await AuditLog.create({
      action:      'USER_BANNED',
      performedBy: req.user._id,
      targetUser:  user._id,
      targetModel: 'User',
      targetId:    user._id,
      reason:      reason.trim(),
      ipAddress:   req.ip,
    });

    // Email notification — non-fatal
    try {
      await sendEmail({
        to:      user.email,
        subject: 'Account Suspended — LocalServe',
        html:    emailTemplates?.accountSuspended?.({ userName: user.name, reason: reason.trim() })
               || `<p>Hi ${user.name},</p><p>Your account has been suspended. Reason: ${reason.trim()}</p>`,
      });
    } catch (_) { /* email failure should not block the response */ }

    res.json({ success: true, message: `User '${user.name}' suspended successfully` });
  } catch (err) { next(err); }
};

/* ============================================================
   BAN PROVIDER
   - Marks Provider doc + linked User doc as banned
============================================================ */
const banProvider = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim().length < 10)
      return next(new ApiError(400, 'Reason must be at least 10 characters'));

    const provider = await Provider.findById(req.params.id).populate('user');
    if (!provider)          return next(new ApiError(404, 'Provider not found'));
    if (provider.isBanned)  return next(new ApiError(409, 'Provider is already suspended'));

    provider.isActive  = false;
    provider.isBanned  = true;
    provider.bannedAt  = new Date();
    provider.banReason = reason.trim();
    provider.bannedBy  = req.user._id;
    await provider.save();

    // Ban the linked user account too
    if (provider.user) {
      provider.user.isActive  = false;
      provider.user.isBanned  = true;
      provider.user.bannedAt  = new Date();
      provider.user.banReason = reason.trim();
      provider.user.bannedBy  = req.user._id;
      await provider.user.save();
    }

    await AuditLog.create({
      action:      'PROVIDER_BANNED',
      performedBy: req.user._id,
      targetUser:  provider.user?._id,
      targetModel: 'Provider',
      targetId:    provider._id,
      reason:      reason.trim(),
      ipAddress:   req.ip,
    });

    // Email notification — non-fatal
    try {
      const email = provider.email || provider.user?.email;
      if (email) {
        await sendEmail({
          to:      email,
          subject: 'Provider Account Suspended — LocalServe',
          html:    `<p>Hi ${provider.name},</p><p>Your provider account has been suspended. Reason: ${reason.trim()}</p>`,
        });
      }
    } catch (_) {}

    res.json({ success: true, message: `Provider '${provider.name}' suspended successfully` });
  } catch (err) { next(err); }
};

/* ============================================================
   REACTIVATE USER
   - Removes ban from user + their provider profile
============================================================ */
const reactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)           return next(new ApiError(404, 'User not found'));
    if (!user.isBanned)  return next(new ApiError(409, 'User is not currently suspended'));

    user.isActive       = true;
    user.isBanned       = false;
    user.reactivatedAt  = new Date();
    user.reactivatedBy  = req.user._id;
    await user.save();

    // Reactivate provider profile if exists
    await Provider.updateOne({ user: user._id }, {
      isActive:      true,
      isBanned:      false,
      reactivatedAt: new Date(),
    });

    await AuditLog.create({
      action:      'USER_REACTIVATED',
      performedBy: req.user._id,
      targetUser:  user._id,
      targetModel: 'User',
      targetId:    user._id,
      ipAddress:   req.ip,
    });

    // Notification email — non-fatal
    try {
      await sendEmail({
        to:      user.email,
        subject: 'Account Reactivated — LocalServe',
        html:    `<p>Hi ${user.name},</p><p>Your account has been reactivated. You can now log in again.</p>`,
      });
    } catch (_) {}

    res.json({ success: true, message: `User '${user.name}' reactivated successfully` });
  } catch (err) { next(err); }
};

/* ============================================================
   REACTIVATE PROVIDER
============================================================ */
const reactivateProvider = async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.params.id).populate('user');
    if (!provider)           return next(new ApiError(404, 'Provider not found'));
    if (!provider.isBanned)  return next(new ApiError(409, 'Provider is not currently suspended'));

    provider.isActive      = true;
    provider.isBanned      = false;
    provider.reactivatedAt = new Date();
    await provider.save();

    if (provider.user) {
      provider.user.isActive      = true;
      provider.user.isBanned      = false;
      provider.user.reactivatedAt = new Date();
      await provider.user.save();
    }

    await AuditLog.create({
      action:      'PROVIDER_REACTIVATED',
      performedBy: req.user._id,
      targetModel: 'Provider',
      targetId:    provider._id,
      ipAddress:   req.ip,
    });

    res.json({ success: true, message: `Provider '${provider.name}' reactivated successfully` });
  } catch (err) { next(err); }
};

/* ============================================================
   ALL PROVIDERS (for admin management view)
============================================================ */
const getAllProviders = async (req, res, next) => {
  try {
    const { search, banned, verified } = req.query;
    const filter = {};
    if (banned)   filter.isBanned = banned === 'true';
    if (verified) filter.verificationStatus = verified;
    if (search)   filter.$or = [
      { name:  new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
    ];

    const providers = await Provider.find(filter)
      .populate('user', 'name email isBanned')
      .sort('-createdAt');
    res.json({ success: true, count: providers.length, data: providers });
  } catch (err) { next(err); }
};

/* ============================================================
   ALL BOOKINGS
============================================================ */
const getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate({ path: 'provider', populate: { path: 'user', select: 'name email' } })
      .sort('-createdAt');
    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) { next(err); }
};

/* ============================================================
   AUDIT LOGS
============================================================ */
const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, action } = req.query;
    const filter = action ? { action } : {};

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('performedBy', 'name email')
        .populate('targetUser',  'name email')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ success: true, data: logs, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (err) { next(err); }
};

module.exports = {
  getDashboardStats,
  getPendingProviders,
  verifyProvider,
  rejectProvider,
  getAllUsers,
  getAllProviders,
  getAllBookings,
  banUser,
  banProvider,
  reactivateUser,
  reactivateProvider,
  getAuditLogs,
};