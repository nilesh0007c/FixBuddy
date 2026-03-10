'use strict';
// backend/controllers/chatbotController.js
//
// FIX: Removed the broken `require('../services/chatService')` import.
// All logic is self-contained — no external service file needed.
// ─────────────────────────────────────────────────────────────────────

const { v4: uuidv4 } = require('uuid');
const { ApiError }   = require('../utils/ApiError');

/* ─────────────────────────────────────────────────────────────────────
   Lazy-load Mongoose models so this file never crashes at require-time.
   Both models are defined inline — zero extra files needed.
───────────────────────────────────────────────────────────────────── */
let _ChatbotSession, _KnowledgeBase;

function getModels() {
  if (_ChatbotSession) return { ChatbotSession: _ChatbotSession, KnowledgeBase: _KnowledgeBase };

  const mongoose = require('mongoose');

  // ── ChatbotSession ────────────────────────────────────────────────
  if (mongoose.models.ChatbotSession) {
    _ChatbotSession = mongoose.model('ChatbotSession');
  } else {
    const MsgSchema = new mongoose.Schema(
      {
        role:      { type: String, enum: ['user','assistant','system'], required: true },
        content:   { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
      { _id: false }
    );
    const SessionSchema = new mongoose.Schema(
      {
        sessionId:   { type: String, required: true, unique: true, index: true },
        user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        messages:    [MsgSchema],
        escalated:   { type: Boolean, default: false },
        escalatedAt: { type: Date,    default: null },
        rating:      { type: Number,  min: 1, max: 5, default: null },
        ratedAt:     { type: Date,    default: null },
        intent:      { type: String,  default: '' },
      },
      { timestamps: true }
    );
    _ChatbotSession = mongoose.model('ChatbotSession', SessionSchema);
  }

  // ── KnowledgeBase ─────────────────────────────────────────────────
  if (mongoose.models.KnowledgeBase) {
    _KnowledgeBase = mongoose.model('KnowledgeBase');
  } else {
    const KBSchema = new mongoose.Schema(
      {
        question:   { type: String, required: true, trim: true },
        answer:     { type: String, required: true, trim: true },
        keywords:   [{ type: String, lowercase: true, trim: true }],
        category:   {
          type: String,
          enum: ['booking','payment','provider','account','general','cancellation','support'],
          default: 'general',
        },
        isActive:   { type: Boolean, default: true },
        usageCount: { type: Number,  default: 0 },
      },
      { timestamps: true }
    );
    _KnowledgeBase = mongoose.model('KnowledgeBase', KBSchema);
  }

  return { ChatbotSession: _ChatbotSession, KnowledgeBase: _KnowledgeBase };
}

/* ─────────────────────────────────────────────────────────────────────
   INTENT DETECTION
───────────────────────────────────────────────────────────────────── */
const INTENT_MAP = {
  booking_create: ['book','booking','schedule','appointment','hire','reserve'],
  booking_cancel: ['cancel','cancellation','refund','cancel booking'],
  booking_track:  ['track','status','where is','my booking','pending','order status'],
  payment:        ['pay','payment','price','cost','charge','invoice','bill','rupee','fee'],
  bargain:        ['bargain','negotiate','discount','offer','deal','lower price'],
  provider:       ['provider','plumber','electrician','carpenter','cleaner','mechanic','find'],
  account:        ['account','login','sign up','register','password','profile','logout'],
  review:         ['review','rating','feedback','rate','stars','complaint'],
  support:        ['help','support','contact','human','agent','problem','issue'],
  greeting:       ['hi','hello','hey','good morning','good evening'],
  thanks:         ['thank','thanks','thank you','thx','great','awesome'],
};

function detectIntent(text) {
  const lower = text.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) return intent;
  }
  return 'unknown';
}

/* ─────────────────────────────────────────────────────────────────────
   STATIC RESPONSES
───────────────────────────────────────────────────────────────────── */
const RESPONSES = {
  greeting: [
    "👋 Hello! Welcome to SLS — your Smart Local Services platform. I'm your AI assistant. How can I help you today?",
    "Hey there! 😊 I can help you book services, track orders, negotiate prices, and more. What do you need?",
  ],
  thanks: [
    "You're very welcome! 😊 Is there anything else I can help you with?",
    "Happy to help! Let me know if you need anything else. 🙌",
  ],
  booking_create: [
    "📅 **How to Book a Service:**\n\n1. Search for the service you need\n2. Browse providers by rating & price\n3. Click **Book Now** on your preferred provider\n4. Select date & time\n5. Confirm booking & payment\n\nYou'll get a confirmation email instantly!",
  ],
  booking_cancel: [
    "❌ **Cancellation Policy:**\n\n• **Free cancellation** — 24+ hours before appointment\n• **50% refund** — 12–24 hours before\n• **No refund** — same-day cancellations\n\nTo cancel: **My Bookings** → Select booking → **Cancel Booking**\n\nRefunds process in 3–5 business days.",
  ],
  booking_track: [
    "🔍 **Track Your Booking:**\n\nCheck **My Bookings** in your dashboard:\n\n• **Pending** — Awaiting provider confirmation\n• **Confirmed** — Scheduled ✅\n• **In Progress** — Provider is working\n• **Completed** — Done!\n• **Cancelled** — Booking cancelled\n\nYou also get real-time email notifications.",
  ],
  payment: [
    "💳 **Payment Options:**\n\nWe accept:\n• Credit / Debit Cards (Visa, Mastercard, RuPay)\n• UPI (GPay, PhonePe, Paytm)\n• Net Banking & Wallets\n\nAll transactions are **SSL-encrypted** 🔒. Invoices are auto-generated after service completion.",
  ],
  bargain: [
    "🤝 **Price Negotiation:**\n\nSLS has a built-in bargaining system!\n\n1. Open your booking details\n2. Click **Negotiate Price**\n3. Enter your offer (up to 40% off)\n4. Provider can accept, counter, or reject\n5. Up to **5 rounds** of back-and-forth\n\nOur AI also suggests fair prices to speed up the deal! 🎯",
  ],
  provider: [
    "🔍 **Finding the Right Provider:**\n\nFilter by:\n• 📍 Location — near you\n• ⭐ Rating — minimum stars\n• 💰 Price range — your budget\n• 🏷️ Category — plumber, electrician, etc.\n• 📅 Availability — specific date/time\n\nAll providers are **verified & background-checked**. What type of service are you looking for?",
  ],
  account: [
    "👤 **Account Help:**\n\n• **Sign Up** — Click Register & fill your details\n• **Login Issues** — Use 'Forgot Password' to reset\n• **Profile** — Update info from your Dashboard\n• **Notifications** — Manage alerts in Settings\n\nFor security concerns, contact our support team.",
  ],
  review: [
    "⭐ **Reviews & Ratings:**\n\nAfter service completion:\n• Rate from 1–5 stars\n• Write a detailed review\n• Only verified customers can review\n\nGo to: **My Bookings** → Completed → **Leave Review**",
  ],
  support: [
    "🆘 **Human Support:**\n\n• 📧 Email: support@sls.com (24hr response)\n• 📞 Phone: +91 1800-XXX-XXXX (9AM–6PM IST)\n• 💬 Click 'Human' above to escalate this chat\n\nDescribe your issue and I'll try to resolve it first!",
  ],
  unknown: [
    "I'm not sure I understood that. Could you rephrase? Try asking about **bookings**, **payments**, **providers**, or **account** issues! 🤔",
    "Hmm, I didn't quite catch that. Type 'help' to see what I can assist with, or click **Human** to talk to an agent.",
  ],
};

function getStaticResponse(intent) {
  const pool = RESPONSES[intent] || RESPONSES.unknown;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function searchKnowledgeBase(text) {
  try {
    const { KnowledgeBase: KB } = getModels();
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (!words.length) return null;
    const entry = await KB.findOne({ keywords: { $in: words }, isActive: true }).sort({ usageCount: -1 });
    if (entry) {
      await KB.findByIdAndUpdate(entry._id, { $inc: { usageCount: 1 } });
      return entry;
    }
  } catch (_) { /* KB search is optional */ }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   EXPORTED ROUTE HANDLERS
   Names must match chatbotRoutes.js exactly.
═══════════════════════════════════════════════════════════════════ */

/* POST /api/chatbot/chat */
exports.chat = async (req, res, next) => {
  try {
    const { ChatbotSession: CS } = getModels();
    const { message, sessionId } = req.body;
    const userId = req.user?.id || req.user?._id || null;

    const sid = sessionId || uuidv4();
    let session = await CS.findOne({ sessionId: sid });

    if (!session) {
      session = await CS.create({
        sessionId: sid,
        user: userId,
        messages: [{
          role: 'system',
          content: 'You are SLS Assistant — a helpful AI for a local services marketplace.',
        }],
      });
    }

    if (session.escalated) {
      return res.json({
        success: true, sessionId: sid,
        reply: '🔁 Your session is with a human agent. Expect a reply via email within 2 hours.',
        escalated: true, intent: 'escalated',
      });
    }

    session.messages.push({ role: 'user', content: message, createdAt: new Date() });

    const intent = detectIntent(message);
    session.intent = intent;

    const kbEntry = await searchKnowledgeBase(message);
    const reply   = kbEntry ? `📚 ${kbEntry.answer}` : getStaticResponse(intent);

    session.messages.push({ role: 'assistant', content: reply, createdAt: new Date() });
    await session.save();

    res.json({ success: true, sessionId: sid, reply, intent, escalated: false });
  } catch (err) { next(err); }
};

/* POST /api/chatbot/:sessionId/escalate */
exports.escalate = async (req, res, next) => {
  try {
    const { ChatbotSession: CS } = getModels();
    const { sessionId } = req.params;
    const userId = req.user?.id || req.user?._id || null;

    const session = await CS.findOne({ sessionId });
    if (!session) return next(new ApiError(404, 'Session not found'));

    session.escalated   = true;
    session.escalatedAt = new Date();
    if (userId) session.user = userId;

    const msg = "🔁 Your conversation has been escalated to a human agent. We'll reply via email within 2 hours. (9AM–6PM IST, Mon–Sat)";
    session.messages.push({ role: 'assistant', content: msg, createdAt: new Date() });
    await session.save();

    res.json({ success: true, escalated: true, message: msg });
  } catch (err) { next(err); }
};

/* GET /api/chatbot/history/:sessionId */
exports.getHistory = async (req, res, next) => {
  try {
    const { ChatbotSession: CS } = getModels();
    const session = await CS.findOne({ sessionId: req.params.sessionId });
    if (!session) return next(new ApiError(404, 'Session not found'));

    const userId = (req.user?.id || req.user?._id)?.toString();
    if (session.user && session.user.toString() !== userId && req.user?.role !== 'admin')
      return next(new ApiError(403, 'Access denied'));

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        messages:  session.messages.filter(m => m.role !== 'system'),
        escalated: session.escalated,
        rating:    session.rating,
        createdAt: session.createdAt,
      },
    });
  } catch (err) { next(err); }
};

/* POST /api/chatbot/rate */
exports.rateSession = async (req, res, next) => {
  try {
    const { ChatbotSession: CS } = getModels();
    const { sessionId, rating } = req.body;
    if (!sessionId)                   return next(new ApiError(400, 'sessionId required'));
    if (!rating || rating < 1 || rating > 5) return next(new ApiError(400, 'Rating must be 1–5'));

    const session = await CS.findOne({ sessionId });
    if (!session) return next(new ApiError(404, 'Session not found'));

    session.rating  = Math.round(rating);
    session.ratedAt = new Date();
    await session.save();

    res.json({ success: true, rated: true, rating: session.rating });
  } catch (err) { next(err); }
};

/* GET /api/chatbot/admin/sessions */
exports.adminGetSessions = async (req, res, next) => {
  try {
    const { ChatbotSession: CS } = getModels();
    const page  = Math.max(1,   parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const filter = {};
    if (req.query.escalated !== undefined) filter.escalated = req.query.escalated === 'true';

    const [sessions, total] = await Promise.all([
      CS.find(filter).populate('user','name email').sort('-createdAt')
        .skip((page-1)*limit).limit(limit).select('-messages'),
      CS.countDocuments(filter),
    ]);

    res.json({ success: true, sessions, total, page, pages: Math.ceil(total/limit) });
  } catch (err) { next(err); }
};

/* POST /api/chatbot/admin/knowledge */
exports.adminCreateKnowledge = async (req, res, next) => {
  try {
    const { KnowledgeBase: KB } = getModels();
    const { question, answer, keywords = [], category = 'general' } = req.body;
    if (!question) return next(new ApiError(400, 'question required'));
    if (!answer)   return next(new ApiError(400, 'answer required'));
    const entry = await KB.create({ question, answer, keywords, category });
    res.status(201).json({ success: true, data: entry });
  } catch (err) { next(err); }
};

/* PUT /api/chatbot/admin/knowledge/:id */
exports.adminUpdateKnowledge = async (req, res, next) => {
  try {
    const { KnowledgeBase: KB } = getModels();
    const entry = await KB.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!entry) return next(new ApiError(404, 'Not found'));
    res.json({ success: true, data: entry });
  } catch (err) { next(err); }
};

/* DELETE /api/chatbot/admin/knowledge/:id */
exports.adminDeleteKnowledge = async (req, res, next) => {
  try {
    const { KnowledgeBase: KB } = getModels();
    const entry = await KB.findByIdAndDelete(req.params.id);
    if (!entry) return next(new ApiError(404, 'Not found'));
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
};