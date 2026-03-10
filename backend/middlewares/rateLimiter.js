const rateLimit = require("express-rate-limit");

/* ===========================
   Global Limiter
=========================== */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: "Too many requests from this IP" },
});

/* ===========================
   API Limiter
=========================== */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

/* ===========================
   Chat Limiter
=========================== */
const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
});

/* ===========================
   Chatbot Limiter
=========================== */
const chatbotLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
});

/* ===========================
   Bargain Limiter
=========================== */
const bargainLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
});

module.exports = {
  globalLimiter,  // ✅ ADD THIS
  apiLimiter,
  chatLimiter,
  chatbotLimiter,
  bargainLimiter,
};