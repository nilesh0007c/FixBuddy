const logger = require("../config/logger");

/**
 * Global Error Handling Middleware
 * Must be registered AFTER all routes
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  /* ===============================
     🔎 Log Error (Winston / Custom)
  =============================== */
  logger?.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.originalUrl,
    body: req.body,
    user: req.user?._id || null,
  });

  /* ===============================
     🟡 Mongoose Errors
  =============================== */

  // Invalid ObjectId
  if (err.name === "CastError") {
    statusCode = 404;
    message = "Resource not found";
  }

  // Validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(". ");
  }

  // Duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    statusCode = 409;
    message = `${field} already exists`;
  }

  /* ===============================
     🔐 JWT Errors
  =============================== */

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  /* ===============================
     📤 Final Response
  =============================== */

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
    }),
  });
};

module.exports = errorHandler;