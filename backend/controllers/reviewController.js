const Review   = require('../models/Review');
const Booking  = require('../models/Booking');
const Provider = require('../models/Provider');

// @desc Add review
exports.addReview = async (req, res, next) => {
  try {
    const { providerId, bookingId, rating, comment } = req.body;

    if (!rating || !comment?.trim())
      return res.status(400).json({ success: false, message: 'Rating and comment are required' });

    // Booking must be completed and belong to user
    const booking = await Booking.findOne({
      _id: bookingId,
      user: req.user._id,
      status: 'completed',
    });
    if (!booking)
      return res.status(400).json({ success: false, message: 'You can only review completed bookings' });

    if (booking.isReviewed)
      return res.status(400).json({ success: false, message: 'You already reviewed this booking' });

    const review = await Review.create({
      user: req.user._id,
      provider: providerId,
      booking: bookingId,
      rating: Number(rating),
      comment: comment.trim(),
    });

    booking.isReviewed = true;
    await booking.save();

    await review.populate('user', 'name');

    res.status(201).json({ success: true, data: review });
  } catch (err) { next(err); }
};

// @desc Get provider reviews
exports.getProviderReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ provider: req.params.providerId })
      .populate('user', 'name')
      .sort('-createdAt');

    res.json({ success: true, count: reviews.length, reviews });
  } catch (err) { next(err); }
};