// backend/controllers/complaintController.js
const Complaint = require('../models/Complaint');
const Booking   = require('../models/Booking');
const User      = require('../models/User');
const { sendEmail } = require('../utils/emailService');
const { getIO } = require('../socket');
const templates = require('../utils/emailTemplates');

/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */
const COMPLAINT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const sendJson = (res, code, data) => res.status(code).json(data);
const err = (res, code, message) => sendJson(res, code, { success: false, message });

/* ═══════════════════════════════════════════════════════
   1. CREATE COMPLAINT
      POST /api/complaints/create
      Auth: user
═══════════════════════════════════════════════════════ */
exports.createComplaint = async (req, res) => {
  try {
    const io = getIO(); // ✅ called INSIDE the function, not at module level
    const { serviceRequestId, complaintText, complaintCategory } = req.body;
    const userId = req.user._id;

    // Validate booking exists and belongs to user
    const booking = await Booking.findOne({ _id: serviceRequestId, user: userId })
      .populate('provider');
    if (!booking)
      return err(res, 404, 'Booking not found or does not belong to you.');

    // Booking must be accepted or completed
    if (!['accepted', 'completed'].includes(booking.status))
      return err(res, 400, 'Complaints can only be filed for accepted or completed bookings.');

    // Check 1-hour window
    const windowStart    = booking.acceptedAt || booking.updatedAt;
    const allowedUntil   = new Date(new Date(windowStart).getTime() + COMPLAINT_WINDOW_MS);
    if (new Date() > allowedUntil)
      return err(res, 403, 'The 1-hour complaint window has expired for this booking.');

    // Prevent duplicate complaints
    const existing = await Complaint.findOne({ serviceRequestId, userId });
    if (existing)
      return err(res, 409, 'You have already filed a complaint for this booking.');

    // ✅ Handle evidence images WITHOUT cloudinary — store buffer as base64 or just filenames
    const evidenceImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        evidenceImages.push({
          url:          `/uploads/complaints/${file.filename}`, // served as static file
          originalName: file.originalname,
          mimetype:     file.mimetype,
          size:         file.size,
        });
      }
    }

    const complaint = await Complaint.create({
      userId,
      providerId:            booking.provider._id,
      serviceRequestId:      booking._id,
      complaintText,
      complaintCategory,
      evidenceImages,
      complaintAllowedUntil: allowedUntil,
      statusHistory: [{ status: 'Pending', changedBy: userId, note: 'Complaint created' }],
    });

    // Notify admin via socket
    if (io) io.to('admin_room').emit('new_complaint', { complaintId: complaint._id });

    // Confirmation email
    if (sendEmail) {
      await sendEmail({
        to:      req.user.email,
        subject: 'Complaint Submitted – LocalServe',
        text:    `Your complaint (ID: ${complaint._id}) has been received. We will review it within 24 hours.`,
      }).catch(console.error);
    }

    sendJson(res, 201, { success: true, message: 'Complaint submitted successfully.', data: complaint });
  } catch (e) {
    console.error('[createComplaint]', e);
    err(res, 500, 'Server error. Please try again.');
  }
};

/* ═══════════════════════════════════════════════════════
   2. GET USER COMPLAINTS
      GET /api/complaints/user
      Auth: user
═══════════════════════════════════════════════════════ */
exports.getUserComplaints = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { userId: req.user._id };
    if (status && status !== 'all') filter.status = status;

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate('serviceRequestId', 'scheduledDate totalAmount service')
        .populate({ path: 'providerId', populate: { path: 'user', select: 'name email' } })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    sendJson(res, 200, {
      success: true,
      data: complaints,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error('[getUserComplaints]', e);
    err(res, 500, 'Server error.');
  }
};

/* ═══════════════════════════════════════════════════════
   3. GET PROVIDER COMPLAINTS
      GET /api/complaints/provider
      Auth: provider
═══════════════════════════════════════════════════════ */
exports.getProviderComplaints = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { providerId: req.provider._id };
    if (status && status !== 'all') filter.status = status;

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate('userId', 'name email avatar')
        .populate('serviceRequestId', 'scheduledDate totalAmount service')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    const allCount      = await Complaint.countDocuments({ providerId: req.provider._id });
    const resolvedCount = await Complaint.countDocuments({ providerId: req.provider._id, status: 'Resolved' });
    const reputationScore = allCount > 0
      ? Math.round(((allCount - resolvedCount) / allCount) * 100)
      : 100;

    sendJson(res, 200, {
      success: true,
      data: complaints,
      reputationScore,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error('[getProviderComplaints]', e);
    err(res, 500, 'Server error.');
  }
};

/* ═══════════════════════════════════════════════════════
   4. ADMIN — GET ALL COMPLAINTS
      GET /api/complaints/admin
      Auth: admin
═══════════════════════════════════════════════════════ */
exports.adminGetComplaints = async (req, res) => {
  try {
    const { status, priority, search, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (status   && status   !== 'all') filter.status   = status;
    if (priority && priority !== 'all') filter.priority = priority;

    let complaints = await Complaint.find(filter)
      .populate('userId',           'name email avatar')
      .populate('serviceRequestId', 'scheduledDate totalAmount')
      .populate({ path: 'providerId', populate: { path: 'user', select: 'name email' } })
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    if (search) {
      const q = search.toLowerCase();
      complaints = complaints.filter(
        (c) =>
          c.userId?.name?.toLowerCase().includes(q) ||
          c.complaintText?.toLowerCase().includes(q) ||
          c.complaintCategory?.toLowerCase().includes(q)
      );
    }

    const total     = complaints.length;
    const paginated = complaints.slice((page - 1) * limit, page * limit);

    const analytics = await Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    sendJson(res, 200, {
      success: true,
      data: paginated,
      analytics,
      pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error('[adminGetComplaints]', e);
    err(res, 500, 'Server error.');
  }
};

/* ═══════════════════════════════════════════════════════
   5. ADMIN — REPLY & UPDATE STATUS
      PUT /api/complaints/admin-reply/:id
      Auth: admin
═══════════════════════════════════════════════════════ */
exports.adminReplyComplaint = async (req, res) => {
  try {
    const io = getIO(); // ✅ called INSIDE the function
    const { message, status } = req.body;
    const { id }              = req.params;

    const complaint = await Complaint.findById(id).populate('userId', 'name email');
    if (!complaint) return err(res, 404, 'Complaint not found.');

    const validStatuses = ['Pending', 'Under Review', 'Resolved', 'Rejected'];
    if (status && !validStatuses.includes(status))
      return err(res, 400, 'Invalid status value.');

    if (message) {
      complaint.adminReply = {
        message,
        repliedAt: new Date(),
        repliedBy: req.user._id,
      };
    }
    if (status) {
      complaint.statusHistory.push({
        status,
        changedBy: req.user._id,
        note: message || 'Status updated by admin',
      });
      complaint.status = status;
      if (status === 'Resolved') complaint.resolvedAt = new Date();
    }

    await complaint.save();

    // Notify user via socket
    if (io) {
      io.to(`user_${complaint.userId._id}`).emit('complaint_updated', {
        complaintId: complaint._id,
        status:      complaint.status,
        adminReply:  complaint.adminReply,
      });
    }

    // Email notification
    if (sendEmail && complaint.userId?.email) {
      await sendEmail({
        to:      complaint.userId.email,
        subject: `Complaint Update – ${complaint.status}`,
        html:    templates.complaintStatusUpdate({
          userName:     complaint.userId.name,
          status:       complaint.status,
          adminMessage: message || 'No message provided.',
          complaintId:  complaint._id,
        }),
      }).catch(console.error);
    }

    sendJson(res, 200, { success: true, message: 'Complaint updated successfully.', data: complaint });
  } catch (e) {
    console.error('[adminReplyComplaint]', e);
    err(res, 500, 'Server error.');
  }
};

/* ═══════════════════════════════════════════════════════
   6. UPLOAD EVIDENCE IMAGES (local disk, no Cloudinary)
      POST /api/complaints/upload-evidence
      Auth: user
═══════════════════════════════════════════════════════ */
exports.uploadEvidence = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return err(res, 400, 'No images uploaded.');

    // ✅ multer diskStorage saves files locally; just return their paths
    const images = req.files.map((file) => ({
      url:          `/uploads/complaints/${file.filename}`,
      originalName: file.originalname,
      mimetype:     file.mimetype,
      size:         file.size,
    }));

    sendJson(res, 200, { success: true, images });
  } catch (e) {
    console.error('[uploadEvidence]', e);
    err(res, 500, 'Image upload failed.');
  }
};

/* ═══════════════════════════════════════════════════════
   7. GET COMPLAINT WINDOW INFO
      GET /api/complaints/window/:bookingId
      Auth: user
═══════════════════════════════════════════════════════ */
exports.getComplaintWindow = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.bookingId, user: req.user._id });
    if (!booking) return err(res, 404, 'Booking not found.');

    if (!['accepted', 'completed'].includes(booking.status))
      return sendJson(res, 200, { available: false, reason: 'Booking not yet accepted.' });

    const windowStart  = booking.acceptedAt || booking.updatedAt;
    const allowedUntil = new Date(new Date(windowStart).getTime() + COMPLAINT_WINDOW_MS);
    const available    = new Date() < allowedUntil;

    const existing = await Complaint.findOne({ serviceRequestId: booking._id, userId: req.user._id });

    sendJson(res, 200, {
      available:   available && !existing,
      allowedUntil,
      alreadyFiled: !!existing,
      existingId:   existing?._id,
    });
  } catch (e) {
    console.error('[getComplaintWindow]', e);
    err(res, 500, 'Server error.');
  }
};