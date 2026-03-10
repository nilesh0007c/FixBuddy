const rateLimit = require("express-rate-limit");

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
  });

const apiLimiter = createLimiter(
  15 * 60 * 1000,
  100,
  "Too many requests"
);

const chatLimiter = createLimiter(
  5 * 60 * 1000,
  50,
  "Too many chat requests"
);

module.exports = {
  apiLimiter,
  chatLimiter,
};