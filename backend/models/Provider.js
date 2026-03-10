const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  category:    { type: String, required: true },
  description: { type: String, default: '' },
  price:       { type: Number, required: true, min: 0 },
  priceUnit:   { type: String, enum: ['hour', 'day', 'job'], default: 'hour' },
});

const providerSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name:     { type: String, required: true },
  email:    { type: String, required: true },
  phone:    { type: String, required: true },
  bio:      { type: String, default: '' },
  services: { type: [serviceSchema], default: [] },
  location: {
    city:    { type: String, default: '' },
    state:   { type: String, default: '' },
    address: { type: String, default: '' },
    pincode: { type: String, default: '' },
  },
  latitude:  { type: Number, default: null },
  longitude: { type: Number, default: null },
  profileImage:  { type: String, default: '' },
  liveImage:     { type: String, required: true },
  idProofImage:  { type: String, required: true },
  isVerified:         { type: Boolean, default: false },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  isActive:    { type: Boolean, default: true },
  rating:      { type: Number, default: 0, min: 0, max: 5 },
  totalReviews:{ type: Number, default: 0 },
  experience:  { type: Number, default: 0 },
  hourlyRate:  { type: Number, default: 0 },
  subscription:{ type: String, enum: ['basic', 'premium'], default: 'basic' },
  availability: {
    isAvailable:  { type: Boolean, default: true },
    workingDays:  { type: [String], default: [] },
    workingHours: {
      start: { type: String, default: '09:00' },
      end:   { type: String, default: '18:00' },
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('Provider', providerSchema);