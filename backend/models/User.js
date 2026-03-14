"use strict";

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },

  password: {
    type: String,
    required: true,
    minlength: 6
  },

  role: {
    type: String,
    enum: ["user", "provider", "admin"],
    default: "user"
  },

  phone: {
    type: String,
    default: ""
  },

  city: {
    type: String,
    default: ""
  },

  location: {
    city: String,
    state: String,
    pincode: String
  },

  // ───── Account Status ─────
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  isBanned: {
    type: Boolean,
    default: false,
    index: true
  },

  bannedAt: Date,

  banReason: {
    type: String,
    maxlength: 1000
  },

  bannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  reactivatedAt: Date,

  reactivatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  // ───── Password Reset / OTP ─────
  passwordResetOTP: String,

  passwordResetExpires: Date,

  passwordResetAttempts: {
    type: Number,
    default: 0
  },

  passwordResetLockedUntil: Date

},
{
  timestamps: true
}
);



// ─────────────────────────────────────
// HASH PASSWORD BEFORE SAVE
// ─────────────────────────────────────

userSchema.pre("save", async function (next) {

  if (!this.isModified("password"))
    return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();

});



// ─────────────────────────────────────
// COMPARE PASSWORD (LOGIN)
// ─────────────────────────────────────

userSchema.methods.comparePassword = async function (candidatePassword) {

  return await bcrypt.compare(candidatePassword, this.password);

};



// ─────────────────────────────────────
// REMOVE PASSWORD FROM JSON RESPONSE
// ─────────────────────────────────────

userSchema.methods.toJSON = function () {

  const obj = this.toObject();
  delete obj.password;

  return obj;

};



// ─────────────────────────────────────

module.exports = mongoose.model("User", userSchema);
