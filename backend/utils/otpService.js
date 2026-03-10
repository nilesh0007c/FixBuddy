// backend/utils/otpService.js
'use strict';

const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');

const OTP_EXPIRY_MINUTES = 10;   // OTP valid for 10 min
const MAX_ATTEMPTS       = 5;    // max wrong OTP guesses before lockout
const LOCKOUT_MINUTES    = 30;   // lockout duration after too many failures
const RESET_TOKEN_EXPIRY = 15;   // reset token valid for 15 min after OTP verify

/* ─── Generate a 6-digit OTP and return plaintext + bcrypt hash ─── */
const generateOTP = async () => {
  const otp    = String(Math.floor(100000 + Math.random() * 900000));
  const hashed = await bcrypt.hash(otp, 12);
  return { otp, hashed };
};

/* ─── Verify plaintext OTP against stored hash ─── */
const verifyOTP = async (plain, hashed) => {
  if (!plain || !hashed) return false;
  return bcrypt.compare(String(plain), hashed);
};

/* ─── Generate a secure reset token (plaintext for client + sha256 for DB) ─── */
const generateResetToken = () => {
  const token     = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
};

/* ─── Hash a reset token (used when verifying the token sent by client) ─── */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

module.exports = {
  generateOTP,
  verifyOTP,
  generateResetToken,
  hashToken,
  OTP_EXPIRY_MINUTES,
  MAX_ATTEMPTS,
  LOCKOUT_MINUTES,
  RESET_TOKEN_EXPIRY,
};