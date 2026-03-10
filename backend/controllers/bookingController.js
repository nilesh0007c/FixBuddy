'use strict';

const Booking         = require('../models/Booking');
const Provider        = require('../models/Provider');
const User            = require('../models/User');
const sendEmail       = require('../utils/sendEmail');
const generateInvoice = require('../utils/generateInvoice');
const templates       = require('../utils/emailTemplates');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (d) =>
  d
    ? new Intl.DateTimeFormat('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      }).format(new Date(d))
    : 'TBD';

/**
 * safeSendEmail — NEVER throws.
 *
 * ROOT CAUSE FIX: Previously, any SMTP error / missing address caused the entire
 * controller to throw, which meant:
 *   (a) the DB write appeared to fail from the client's perspective
 *   (b) subsequent emails in the same function were never sent
 *
 * Now each email is fully isolated. Failures are logged with enough detail to
 * debug SMTP config without breaking the API response.
 */
const safeSendEmail = async (to, subject, html, attachments) => {
  if (!to || !to.toString().includes('@')) {
    console.warn(`[EMAIL SKIPPED] invalid address: "${to}" | subject: "${subject}"`);
    return;
  }
  try {
    await sendEmail(to, subject, html, attachments);
    console.log(`[EMAIL SENT]   ✅  → ${to}  |  ${subject}`);
  } catch (err) {
    console.error(`[EMAIL FAILED] ❌  → ${to}  |  ${subject}`);
    console.error(`               reason: ${err.message}`);
  }
};


// =============================================================================
// @desc    Create Booking
// @route   POST /api/bookings
// @access  Private (Customer)
// =============================================================================
exports.createBooking = async (req, res, next) => {
  try {
    const { providerId, service, scheduledDate, scheduledTime, address, notes } = req.body;

    // ── Validate provider ─────────────────────────────────────────────────────
    const provider = await Provider.findById(providerId);
    if (!provider || !provider.isVerified) {
      return res.status(400).json({ success: false, message: 'Provider not available' });
    }
    if (!provider.availability?.isAvailable) {
      return res.status(400).json({ success: false, message: 'Provider is currently unavailable' });
    }

    // ── Create booking ────────────────────────────────────────────────────────
    const booking = await Booking.create({
      user:        req.user._id,
      provider:    providerId,
      service,
      scheduledDate,
      scheduledTime,
      address:     address || {},
      notes:       notes   || '',
      totalAmount: service?.price || 0,
      status:      'pending',
    });

    // Fetch full customer document — req.user may only have _id + name from JWT
    const customer = await User.findById(req.user._id);

    const formattedDate = formatDate(scheduledDate);
    const bookingId     = booking._id.toString();
    const serviceName   = service?.name || 'Service';
    const addressStr    = address?.street
      ? `${address.street}, ${address.city || ''}`.trim().replace(/,\s*$/, '')
      : address?.city || 'See app for details';

    // ── Email: Customer ───────────────────────────────────────────────────────
    await safeSendEmail(
      customer.email,
      `Booking Request Sent - ${serviceName}`,
      templates.bookingSubmittedCustomer({
        customerName:  customer.name,
        serviceName,
        providerName:  provider.name || 'Your Provider',
        scheduledDate: formattedDate,
        scheduledTime: scheduledTime || 'TBD',
        bookingId,
      })
    );

    // ── Email: Provider ───────────────────────────────────────────────────────
    // provider.email is a required field on Provider schema — always present.
    await safeSendEmail(
      provider.email,
      `New Booking Request - ${serviceName}`,
      templates.newBookingProvider({
        providerName:  provider.name  || 'Provider',
        customerName:  customer.name,
        customerPhone: customer.phone || 'Not provided',
        serviceName,
        scheduledDate: formattedDate,
        scheduledTime: scheduledTime  || 'TBD',
        address:       addressStr,
        bookingId,
      })
    );

    // ── Real-time notification ────────────────────────────────────────────────
    if (global.io) {
      global.io.to(`provider_${providerId}`).emit('new_booking', {
        message: `New booking from ${customer.name}`,
        booking,
      });
    }

    res.status(201).json({ success: true, data: booking });

  } catch (err) {
    next(err);
  }
};


// =============================================================================
// @desc    Get User Bookings
// @route   GET /api/bookings/my
// @access  Private (Customer)
// =============================================================================
exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate({ path: 'provider', populate: { path: 'user', select: 'name email phone' } })
      .sort('-createdAt');

    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    next(err);
  }
};


// =============================================================================
// @desc    Get Provider Bookings
// @route   GET /api/bookings/provider
// @access  Private (Provider)
// =============================================================================
exports.getProviderBookings = async (req, res, next) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id });
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider profile not found' });
    }

    const bookings = await Booking.find({ provider: provider._id })
      .populate('user', 'name email phone')
      .sort('-createdAt');

    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    next(err);
  }
};


// =============================================================================
// @desc    Update Booking Status  (accept / reject / complete)
// @route   PATCH /api/bookings/:id/status
// @access  Private (Provider)
// =============================================================================
exports.updateBookingStatus = async (req, res, next) => {
  try {
    // Must populate both:
    //  · 'user'     → customer's name, email, phone  (lives on User model)
    //  · 'provider' → provider's name, email, phone  (live directly on Provider model)
    const booking = await Booking.findById(req.params.id)
      .populate('user')
      .populate('provider');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const { status, paymentStatus, billAmount } = req.body;

    if (status)        booking.status        = status;
    if (paymentStatus) booking.paymentStatus = paymentStatus;
    if (billAmount)    booking.totalAmount   = billAmount;

    await booking.save();

    // ── Shortcuts ─────────────────────────────────────────────────────────────
    const customer      = booking.user;       // User document
    const provider      = booking.provider;   // Provider document (has own .email/.phone)
    const serviceName   = booking.service?.name || 'Service';
    const bookingId     = booking._id.toString();
    const scheduledDate = formatDate(booking.scheduledDate);
    const scheduledTime = booking.scheduledTime || '';
    const billAmount_   = booking.totalAmount;

    // ── Generate invoice for completed bookings ───────────────────────────────
    let attachments = [];
    if (booking.status === 'completed') {
      try {
        const invoicePath = await generateInvoice(booking, customer, provider);
        attachments.push({ filename: `invoice-${bookingId}.pdf`, path: invoicePath });
      } catch (invoiceErr) {
        console.error('[INVOICE FAILED]', invoiceErr.message);
      }
    }

    // ── Email matrix ──────────────────────────────────────────────────────────
    // PREVIOUSLY MISSING: only customer was emailed. Provider received nothing
    // after their own accept/reject/complete action. Now both sides are notified.
    // ─────────────────────────────────────────────────────────────────────────
    switch (booking.status) {

      case 'accepted':
        // Customer: booking confirmed
        await safeSendEmail(
          customer.email,
          `Booking Confirmed - ${serviceName}`,
          templates.bookingAcceptedCustomer({
            customerName:  customer.name,
            serviceName,
            providerName:  provider.name  || 'Your Provider',
            providerPhone: provider.phone || 'Available in app',
            scheduledDate,
            scheduledTime,
            bookingId,
          })
        );
        // Provider: receipt confirming they accepted
        await safeSendEmail(
          provider.email,
          `You Accepted a Booking - ${serviceName}`,
          templates.providerAcceptedReceipt({
            providerName:  provider.name  || 'Provider',
            customerName:  customer.name,
            customerPhone: customer.phone || 'Not provided',
            serviceName,
            scheduledDate,
            scheduledTime,
            bookingId,
          })
        );
        break;

      case 'rejected':
        // Customer: not accepted, find another provider
        await safeSendEmail(
          customer.email,
          `Booking Not Accepted - ${serviceName}`,
          templates.bookingRejectedCustomer({
            customerName: customer.name,
            serviceName,
            bookingId,
          })
        );
        // Provider: confirmation they rejected
        await safeSendEmail(
          provider.email,
          `Booking Rejected - ${serviceName}`,
          templates.providerRejectedReceipt({
            providerName: provider.name || 'Provider',
            customerName: customer.name,
            serviceName,
            bookingId,
          })
        );
        break;

      case 'completed':
        // Customer: job done + invoice attached
        await safeSendEmail(
          customer.email,
          `Service Completed - ${serviceName}`,
          templates.bookingCompletedCustomer({
            customerName: customer.name,
            serviceName,
            providerName: provider.name || 'Your Provider',
            billAmount:   billAmount_,
            bookingId,
          }),
          attachments.length > 0 ? attachments : undefined
        );
        // Provider: job summary with earnings
        await safeSendEmail(
          provider.email,
          `Job Completed - ${serviceName}`,
          templates.bookingCompletedProvider({
            providerName:  provider.name || 'Provider',
            customerName:  customer.name,
            serviceName,
            billAmount:    billAmount_,
            scheduledDate,
            bookingId,
          })
        );
        break;

      default:
        await safeSendEmail(
          customer.email,
          `Booking Update — ${booking.status}`,
          `<p>Your booking status has been updated to <strong>${booking.status}</strong>.</p>`
        );
        break;
    }

    // ── Real-time notification ────────────────────────────────────────────────
    if (global.io) {
      global.io.to(`user_${customer._id}`).emit('booking_updated', {
        bookingId: booking._id,
        status:    booking.status,
      });
    }

    res.json({
      success: true,
      message: booking.status === 'completed'
        ? 'Booking completed & invoice sent'
        : `Booking ${booking.status}`,
      data: booking,
    });

  } catch (err) {
    next(err);
  }
};


// =============================================================================
// @desc    Cancel Booking
// @route   PATCH /api/bookings/:id/cancel
// @access  Private (Customer)
// =============================================================================
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      _id:  req.params.id,
      user: req.user._id,
    })
    // BUG WAS HERE: .populate('Provider') — capital P silently skips populate
    // because Mongoose matches the schema PATH name ('provider', lowercase).
    // Result: booking.provider was always undefined → email never sent → TypeError
    .populate('provider'); // ← fixed: matches the exact path name in bookingSchema

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!['pending', 'accepted'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel this booking' });
    }

    booking.status = 'cancelled';
    await booking.save();

    const serviceName   = booking.service?.name || 'Service';
    const scheduledDate = formatDate(booking.scheduledDate);
    const bookingId     = booking._id.toString();

    // ── Email: Provider ───────────────────────────────────────────────────────
    if (booking.provider) {
      await safeSendEmail(
        booking.provider.email,
        `Booking Cancelled - ${serviceName}`,
        templates.bookingCancelledProvider({
          providerName:  booking.provider.name || 'Provider',
          customerName:  req.user.name,
          serviceName,
          scheduledDate,
          bookingId,
        })
      );
    } else {
      // Provider populate failed — means the stored provider ObjectId is stale/missing
      console.warn(`[CANCEL] booking.provider is null for booking ${bookingId} — check DB integrity`);
    }

    // ── Email: Customer (cancellation receipt) ────────────────────────────────
    await safeSendEmail(
      req.user.email,
      `Cancellation Confirmed - ${serviceName}`,
      templates.bookingCancelledCustomer({
        customerName: req.user.name,
        serviceName,
        bookingId,
      })
    );

    // ── Real-time notification ────────────────────────────────────────────────
    if (global.io && booking.provider?._id) {
      global.io.to(`provider_${booking.provider._id}`).emit('booking_cancelled', {
        bookingId,
        message: `${req.user.name} cancelled the booking for ${serviceName}`,
      });
    }

    res.json({ success: true, message: 'Booking cancelled', data: booking });

  } catch (err) {
    next(err);
  }
};