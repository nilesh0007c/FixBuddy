const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  provider: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Provider', 
    required: true,
    index: true
  },
  service: {
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    price: { type: Number, min: 0 },
    priceUnit: { type: String, trim: true }
  },
  scheduledDate: { type: Date, required: true },
  scheduledTime: { type: String, required: true },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    pincode: { type: String, trim: true }
  },
  notes: { type: String, default: '', trim: true },
  totalAmount: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'completed', 'rejected', 'cancelled'],
    default: 'pending',
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'refunded'],
    default: 'unpaid'
  },
  isReviewed: { type: Boolean, default: false }
}, { timestamps: true });

bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ provider: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);