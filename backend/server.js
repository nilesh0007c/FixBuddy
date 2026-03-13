'use strict';

const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const compression = require('compression');

dotenv.config();

const connectDB = require('./config/db');
const socketAuth = require('./middlewares/socketAuth');
const chatSocketHandler = require('./chat/chatSocketHandler');
const errorHandler = require('./middlewares/errorHandler');
const { globalLimiter } = require('./middlewares/rateLimiter');
const logger = require('./config/logger');
const { initSocket } = require('./socket');

// Routes
const authRoutes = require('./routes/authRoutes');
const providerRoutes = require('./routes/providerRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const chatRoutes = require('./routes/chatRoutes');
const bargainRoutes = require('./routes/bargainRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const complaintRoutes = require('./routes/complaintRoutes');

const app = express();
const server = http.createServer(app);


// ─────────────────────────────────────
// SOCKET.IO
// ─────────────────────────────────────

const io = initSocket(server);

io.use(socketAuth);

io.on('connection', (socket) => {

  logger.info(`Socket connected: ${socket.user?._id || socket.id}`);

  chatSocketHandler(io, socket);

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.user?._id || socket.id}`);
  });

});


// ─────────────────────────────────────
// SECURITY MIDDLEWARE
// ─────────────────────────────────────

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: "*",
  methods: ["GET","POST","PUT","DELETE"],
  credentials: true
}));

app.use(compression());

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

app.use(mongoSanitize());
app.use(xss());

app.use(globalLimiter);


// ─────────────────────────────────────
// STATIC FILES
// ─────────────────────────────────────



// ─────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/bargain', bargainRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/complaints', complaintRoutes);


// ─────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    time: new Date()
  });
});


// ─────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});


// ─────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────

app.use(errorHandler);


// ─────────────────────────────────────
// START SERVER
// ─────────────────────────────────────

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {

    await connectDB();

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

  } catch (error) {

    logger.error("Server startup error:", error);
    process.exit(1);

  }
};

startServer();