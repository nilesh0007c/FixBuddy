// backend/controllers/authController.js
"use strict";

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendEmail } = require("../utils/emailService");
const emailTemplates = require("../utils/emailTemplates");
const otpService = require("../utils/otpService");
const { ApiError } = require("../utils/ApiError");

/* ─── Helper: sign JWT ─── */
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

/* ─── Helper: safe email (never throws) ─── */
const safeSend = async (opts) => {
  try {
    await sendEmail(opts);
  } catch (e) {
    console.error("[EMAIL FAIL]", e.message);
  }
};

// =============================================================================
// REGISTER
// =============================================================================
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, city, phone, location } = req.body;

    if (!name || !email || !password)
      return res
        .status(400)
        .json({
          success: false,
          message: "Name, email and password are required",
        });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || "user",
      city: city || location?.city || "",
      phone: phone || "",
      location: location || {},
    });

    const token = signToken(user._id);
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// LOGIN
// =============================================================================
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password)))
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });

    if (user.isBanned)
      return res
        .status(403)
        .json({
          success: false,
          message: `Account suspended: ${user.banReason || "Contact support"}`,
        });

    const token = signToken(user._id);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        city: user.city,
      },
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// GET ME
// =============================================================================
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// =============================================================================
// STEP 1 — FORGOT PASSWORD
// POST /api/auth/forgot-password   body: { email }
// =============================================================================
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(new ApiError(400, "Email is required"));

    // Always respond with same message to prevent email enumeration
    const OK = {
      success: true,
      message: "If this email is registered, an OTP has been sent.",
    };

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(200).json(OK); // silent

    // Check lockout
    if (
      user.passwordResetLockedUntil &&
      user.passwordResetLockedUntil > new Date()
    ) {
      const mins = Math.ceil(
        (user.passwordResetLockedUntil - Date.now()) / 60000,
      );
      return next(
        new ApiError(
          429,
          `Too many failed attempts. Try again in ${mins} minute(s).`,
        ),
      );
    }

    // Generate OTP
    const { otp, hashed } = await otpService.generateOTP();

    user.passwordResetOTP = hashed;
    user.passwordResetExpires = new Date(
      Date.now() + otpService.OTP_EXPIRY_MINUTES * 60_000,
    );
    user.passwordResetAttempts = 0;
    user.passwordResetLockedUntil = undefined;
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Password Reset OTP",
      html: emailTemplates.forgotPasswordOTP({
        userName: user.name,
        otp,
        expiryMinutes: 10,
      }),
    });

    res.status(200).json(OK);
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// STEP 2 — VERIFY OTP
// POST /api/auth/verify-otp   body: { email, otp }
// =============================================================================
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return next(new ApiError(400, "Email and OTP are required"));

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.passwordResetOTP)
      return next(new ApiError(400, "Invalid or expired OTP"));

    // Lockout check
    if (
      user.passwordResetLockedUntil &&
      user.passwordResetLockedUntil > new Date()
    )
      return next(
        new ApiError(429, "Too many attempts. Account temporarily locked."),
      );

    // Expiry check
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      user.passwordResetOTP = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      return next(
        new ApiError(400, "OTP has expired. Please request a new one."),
      );
    }

    // Verify
    const valid = await otpService.verifyOTP(otp, user.passwordResetOTP);
    if (!valid) {
      user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;

      if (user.passwordResetAttempts >= otpService.MAX_ATTEMPTS) {
        user.passwordResetLockedUntil = new Date(
          Date.now() + otpService.LOCKOUT_MINUTES * 60_000,
        );
        user.passwordResetOTP = undefined;
        user.passwordResetExpires = undefined;
      }
      await user.save();

      const remaining = Math.max(
        0,
        otpService.MAX_ATTEMPTS - user.passwordResetAttempts,
      );
      return next(
        new ApiError(
          400,
          remaining > 0
            ? `Invalid OTP. ${remaining} attempt(s) remaining.`
            : `Too many failed attempts. Locked for ${otpService.LOCKOUT_MINUTES} minutes.`,
        ),
      );
    }

    // ✅ OTP valid — issue a short-lived reset token
    const { token, tokenHash } = otpService.generateResetToken();

    // Reuse passwordResetOTP field to store token hash
    user.passwordResetOTP = tokenHash;
    user.passwordResetExpires = new Date(
      Date.now() + otpService.RESET_TOKEN_EXPIRY * 60_000,
    );
    user.passwordResetAttempts = 0;
    await user.save();

    res.status(200).json({
      success: true,
      resetToken: token,
      message: "OTP verified. Use this token to reset your password.",
    });
  } catch (err) {
    next(err);
  }
};

// =============================================================================
// STEP 3 — RESET PASSWORD
// POST /api/auth/reset-password   body: { email, resetToken, newPassword }
// =============================================================================
const resetPassword = async (req, res, next) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword)
      return next(
        new ApiError(400, "email, resetToken and newPassword are required"),
      );

    // Password strength
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^]).{8,}$/;
    if (!strong.test(newPassword))
      return next(
        new ApiError(
          400,
          "Password must be at least 8 characters with uppercase, lowercase, number and special character (@$!%*?&#^).",
        ),
      );

    const tokenHash = otpService.hashToken(resetToken);
    const user = await User.findOne({
      email: email.toLowerCase(),
      passwordResetOTP: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user)
      return next(
        new ApiError(
          400,
          "Invalid or expired reset token. Please start again.",
        ),
      );

    // Set new password (pre-save hook hashes it)
    user.password = newPassword;
    user.passwordResetOTP = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetAttempts = 0;
    user.passwordResetLockedUntil = undefined;
    await user.save();

    // Send confirmation (non-fatal)
    await safeSend({
      to: user.email,
      subject: "Password Changed — LocalServe",
      html: emailTemplates.passwordResetSuccess({ userName: user.name }),
    });

    res.status(200).json({
      success: true,
      message: "Password reset successful. You can now log in.",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  verifyOTP,
  resetPassword,
};
