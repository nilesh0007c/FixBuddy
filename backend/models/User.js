const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['user','provider','admin'], default: 'user' },
  phone: { type: String, default: '' },
  city: { type: String, default: '' },
  location: {
    city: String,
    state: String,
    pincode: String
  },
  // ADD THESE FIELDS to your existing User schema (backend/models/User.js)
// Find your userSchema and add these fields:

// ── Account status fields (add to schema)
isActive:  { type: Boolean, default: true, index: true },
isBanned:  { type: Boolean, default: false, index: true },
bannedAt:  { type: Date },
banReason: { type: String, maxlength: 1000 },
bannedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

// Reactivation
reactivatedAt: { type: Date },
reactivatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

// ── Password reset OTP fields
passwordResetOTP:       { type: String },    // bcrypt-hashed OTP
passwordResetExpires:   { type: Date },      // expires in 10 minutes
passwordResetAttempts:  { type: Number, default: 0 },
passwordResetLockedUntil: { type: Date },    // lockout after 3 failed attempts

// Password validation (add to pre-save hook)
// userSchema.pre('save', async function(next) {
//   if (this.isModified('password')) {
//     this.password = await bcrypt.hash(this.password, 12);
//   }
//   next();
// });


}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);