'use strict';
// backend/services/chatbotService.js

const { v4: uuidv4 } = require('uuid');
const ChatbotSession = require('../models/ChatbotSession');
const KnowledgeBase  = require('../models/ChatbotKnowledge');

/* ─────────────────────────────────────────────────────────────────────
   INTENT MAP  — keyword arrays mapped to intent labels
───────────────────────────────────────────────────────────────────── */
const INTENT_MAP = {
  booking_create:   ['book', 'booking', 'schedule', 'appointment', 'hire', 'reserve', 'order service'],
  booking_cancel:   ['cancel', 'cancellation', 'called off', 'refund', 'cancel booking'],
  booking_track:    ['track', 'status', 'where is', 'my booking', 'order status', 'pending'],
  payment:          ['pay', 'payment', 'price', 'cost', 'charge', 'invoice', 'bill', 'rupee', '₹', 'fee'],
  bargain:          ['bargain', 'negotiate', 'discount', 'offer', 'deal', 'lower price', 'reduce price'],
  provider:         ['provider', 'service provider', 'plumber', 'electrician', 'carpenter', 'cleaner', 'mechanic', 'find'],
  account:          ['account', 'login', 'sign up', 'register', 'password', 'profile', 'email', 'logout'],
  review:           ['review', 'rating', 'feedback', 'rate', 'stars', 'complaint'],
  support:          ['help', 'support', 'contact', 'human', 'agent', 'talk to someone', 'problem', 'issue'],
  greeting:         ['hi', 'hello', 'hey', 'good morning', 'good evening', 'howdy', 'what\'s up'],
  thanks:           ['thank', 'thanks', 'thank you', 'thx', 'great', 'awesome', 'perfect'],
};

/* ─────────────────────────────────────────────────────────────────────
   STATIC RESPONSE LIBRARY
───────────────────────────────────────────────────────────────────── */
const RESPONSES = {
  greeting: [
    "👋 Hello! Welcome to FixBuddy — your Smart Local Services marketplace. I'm your AI assistant. How can I help you today?",
    "Hey there! 😊 Great to see you at SLFixBubby. I can help you book services, track orders, handle payments, and more. What do you need?",
    "Hi! I'm the FixBuddy Assistant. Whether you need a plumber, electrician, or any local service — I've got you covered. What can I do for you?",
  ],
  thanks: [
    "You're very welcome! 😊 Is there anything else I can help you with?",
    "Happy to help! Let me know if you need anything else.",
    "My pleasure! 🙌 Feel free to come back if you have more questions.",
  ],
  fallback: [
    "I'm not sure I understood that completely. Could you rephrase your question? Or type 'help' to see what I can assist with.",
    "Hmm, I didn't quite catch that. Try asking about bookings, payments, providers, or account issues — I'm best at those! 🤔",
    "I want to help but I'm not sure what you're asking. Would you like me to connect you with a human agent for more complex questions?",
  ],
  booking_create: [
    "📅 **How to Book a Service:**\n\n1. Search for the service you need (plumber, electrician, etc.)\n2. Browse available providers and their ratings\n3. Click **Book Now** on your preferred provider\n4. Select your preferred date & time slot\n5. Confirm your booking and payment details\n\nYou'll receive a confirmation email instantly! Need help finding a specific service?",
  ],
  booking_cancel: [
    "❌ **Cancellation Policy:**\n\n• **Free cancellation** if cancelled 24+ hours before the appointment\n• **50% refund** for cancellations within 12–24 hours\n• **No refund** for same-day cancellations\n\nTo cancel: Go to **My Bookings** → Select the booking → Click **Cancel Booking**.\n\nRefunds are processed within 3–5 business days. Would you like help with a specific booking?",
  ],
  booking_track: [
    "🔍 **Track Your Booking:**\n\nYou can track your bookings from the **My Bookings** section in your dashboard:\n\n• **Pending** — Awaiting provider confirmation\n• **Confirmed** — Provider accepted, service scheduled\n• **In Progress** — Provider is currently working\n• **Completed** — Service done ✅\n• **Cancelled** — Booking was cancelled\n\nYou also get real-time notifications via email. Want me to help you navigate there?",
  ],
  payment: [
    "💳 **Payment Information:**\n\nWe accept:\n• Credit / Debit Cards (Visa, Mastercard, RuPay)\n• UPI (GPay, PhonePe, Paytm)\n• Net Banking\n• Wallets\n\nAll transactions are **secured with 256-bit SSL encryption**. Invoices are auto-generated and emailed after service completion.\n\nFor payment disputes, contact our support team. Is there a specific payment issue I can help with?",
  ],
  bargain: [
    "🤝 **Price Negotiation Feature:**\n\nYes! FixBudddy has a built-in **Bargaining System** — here's how it works:\n\n1. Find your service and create/view a booking\n2. Click **Negotiate Price** on the booking detail page\n3. Enter your offer amount (up to 40% off listed price)\n4. The provider can accept, counter, or reject\n5. Up to **5 rounds** of negotiation allowed\n\nOur AI also suggests fair prices to help both parties reach a deal faster! Want to know more?",
  ],
  provider: [
    "🔍 **Finding the Right Provider:**\n\nUse our smart search to filter by:\n• 📍 **Location** — within your area\n• ⭐ **Rating** — minimum star rating\n• 💰 **Price range** — set your budget\n• 🏷️ **Category** — plumber, electrician, cleaner, etc.\n• 📅 **Availability** — specific date/time\n\nAll providers are **verified and background-checked**. You can read reviews from real customers before booking. What type of service are you looking for?",
  ],
  account: [
    "👤 **Account Help:**\n\n• **Sign Up** — Click Register and enter your details\n• **Login Issues** — Use 'Forgot Password' to reset\n• **Profile** — Update name, address, and preferences from your Dashboard\n• **Notifications** — Manage email/SMS alerts in Settings\n\nFor security concerns or account deletion requests, please contact our support team directly. What specific account issue can I help with?",
  ],
  review: [
    "⭐ **Reviews & Ratings:**\n\nAfter a service is completed, you'll receive a prompt to **rate and review** the provider:\n\n• Rate from 1–5 stars\n• Write a detailed review (optional)\n• Reviews are verified — only actual customers can review\n• Providers can respond to reviews\n\nYour feedback helps other customers make informed choices! To leave a review, go to **My Bookings** → Completed → **Leave Review**.",
  ],
  support: [
    "🆘 **Need Human Support?**\n\nI can connect you with our team via:\n\n• 📧 **Email** — support@FixBuddy.com (24hr response)\n• 📞 **Phone** — +91 1800-XXX-XXXX (9AM–6PM IST)\n• 💬 **Live Chat** — Click the 'Human' button above for an agent\n\nOr describe your issue here and I'll try to resolve it first. What's the problem?",
  ],
};

/* ─────────────────────────────────────────────────────────────────────
   detectIntent  — returns intent string
───────────────────────────────────────────────────────────────────── */
function detectIntent(text) {
  const lower = text.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) return intent;
  }
  return 'unknown';
}

/* ─────────────────────────────────────────────────────────────────────
   searchKnowledgeBase  — returns best matching KB entry or null
───────────────────────────────────────────────────────────────────── */
async function searchKnowledgeBase(text) {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (!words.length) return null;

  const entry = await KnowledgeBase.findOne({
    keywords: { $in: words },
    isActive: true,
  }).sort({ usageCount: -1 });

  if (entry) {
    await KnowledgeBase.findByIdAndUpdate(entry._id, { $inc: { usageCount: 1 } });
    return entry;
  }
  return null;
}

/* ─────────────────────────────────────────────────────────────────────
   getStaticResponse  — picks a static reply based on intent
───────────────────────────────────────────────────────────────────── */
function getStaticResponse(intent) {
  const pool = RESPONSES[intent] || RESPONSES.fallback;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ─────────────────────────────────────────────────────────────────────
   buildContextSummary  — last N messages for AI context
───────────────────────────────────────────────────────────────────── */
function buildContextSummary(messages, n = 6) {
  return messages.slice(-n).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
}

/* ─────────────────────────────────────────────────────────────────────
   PUBLIC: chat
───────────────────────────────────────────────────────────────────── */
exports.chat = async ({ message, sessionId, userId }) => {
  // Get or create session
  const sid = sessionId || uuidv4();
  let session = await ChatbotSession.findOne({ sessionId: sid });

  if (!session) {
    session = await ChatbotSession.create({
      sessionId: sid,
      user: userId || null,
      messages: [{
        role:    'system',
        content: 'You are FixBuddy Assistant, a helpful AI for a local services marketplace. Help users with bookings, payments, providers, and account queries.',
      }],
    });
  }

  if (session.escalated) {
    return {
      sessionId: sid,
      reply: '🔁 Your session has been escalated to a human agent. Please expect a response shortly via email or live chat.',
      escalated: true,
      intent: 'escalated',
    };
  }

  // Add user message
  session.messages.push({ role: 'user', content: message, createdAt: new Date() });

  // Detect intent
  const intent = detectIntent(message);
  session.intent = intent;

  // Try KB first
  const kbEntry = await searchKnowledgeBase(message);
  let reply;

  if (kbEntry) {
    reply = `📚 ${kbEntry.answer}`;
  } else {
    reply = getStaticResponse(intent);
  }

  // Add assistant reply
  session.messages.push({ role: 'assistant', content: reply, createdAt: new Date() });
  await session.save();

  return {
    sessionId: sid,
    reply,
    intent,
    escalated: false,
    messageCount: session.messages.filter(m => m.role === 'user').length,
  };
};

/* ─────────────────────────────────────────────────────────────────────
   PUBLIC: escalate
───────────────────────────────────────────────────────────────────── */
exports.escalate = async ({ sessionId, userId }) => {
  const session = await ChatbotSession.findOne({ sessionId });
  if (!session) throw new Error('Session not found');

  session.escalated  = true;
  session.escalatedAt = new Date();
  if (userId) session.user = userId;

  const escalationMsg = '🔁 Your conversation has been escalated to a human support agent. We\'ll reach out via email within 2 hours. Our team operates 9AM–6PM IST, Mon–Sat.';
  session.messages.push({ role: 'assistant', content: escalationMsg, createdAt: new Date() });
  await session.save();

  return { escalated: true, message: escalationMsg };
};

/* ─────────────────────────────────────────────────────────────────────
   PUBLIC: getHistory
───────────────────────────────────────────────────────────────────── */
exports.getHistory = async ({ sessionId, userId }) => {
  const session = await ChatbotSession.findOne({ sessionId });
  if (!session) throw new Error('Session not found');

  // Only own sessions (unless admin — check in controller)
  if (session.user && session.user.toString() !== userId) {
    throw Object.assign(new Error('Access denied'), { status: 403 });
  }

  return {
    sessionId,
    messages: session.messages.filter(m => m.role !== 'system'),
    escalated: session.escalated,
    rating:    session.rating,
    createdAt: session.createdAt,
  };
};

/* ─────────────────────────────────────────────────────────────────────
   PUBLIC: rateSession
───────────────────────────────────────────────────────────────────── */
exports.rateSession = async ({ sessionId, rating, userId }) => {
  const session = await ChatbotSession.findOne({ sessionId });
  if (!session) throw new Error('Session not found');

  session.rating  = Math.min(5, Math.max(1, Math.round(rating)));
  session.ratedAt = new Date();
  await session.save();

  return { rated: true, rating: session.rating };
};

/* ─────────────────────────────────────────────────────────────────────
   ADMIN
───────────────────────────────────────────────────────────────────── */
exports.adminGetSessions = async ({ page = 1, limit = 20, escalated }) => {
  const filter = {};
  if (escalated !== undefined) filter.escalated = escalated;

  const sessions = await ChatbotSession.find(filter)
    .populate('user', 'name email')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(limit)
    .select('-messages');

  const total = await ChatbotSession.countDocuments(filter);
  return { sessions, total, page, pages: Math.ceil(total / limit) };
};

exports.createKnowledge = async (data) => KnowledgeBase.create(data);

exports.updateKnowledge = async (id, data) => {
  const entry = await KnowledgeBase.findByIdAndUpdate(id, data, { new: true });
  if (!entry) throw new Error('Knowledge entry not found');
  return entry;
};

exports.deleteKnowledge = async (id) => {
  const entry = await KnowledgeBase.findByIdAndDelete(id);
  if (!entry) throw new Error('Knowledge entry not found');
  return { deleted: true };
};