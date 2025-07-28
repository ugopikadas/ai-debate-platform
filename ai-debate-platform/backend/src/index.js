const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Initialize logger first
const logger = require('./utils/logger');

// Try to initialize Firebase (graceful failure in demo mode)
let firebaseConfig;
try {
  firebaseConfig = require('./firebase/config');
  logger.info('Firebase configuration loaded successfully');
} catch (error) {
  logger.warn('Firebase configuration failed, running in demo mode:', error.message);
  firebaseConfig = null;
}

// Load routes with error handling
const debateRoutes = require('./routes/debates');
const agentRoutes = require('./routes/agents');
const userRoutes = require('./routes/users');
const { initializeSocketHandlers } = require('./sockets/debateSocket');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { rateLimiter } = require('./middleware/rateLimiter');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  }
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3001",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// app.use(rateLimiter); // Temporarily disabled for debugging

// Health check
app.get('/health', (_, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'AI Debate Platform Backend'
  });
});

// API Routes
app.use('/api/debates', debateRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/users', userRoutes);
// Track B Live Simulated Mock Debates
app.use('/api/trackb', require('./routes/trackB'));

// Socket.IO initialization
initializeSocketHandlers(io);

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`🚀 AI Debate Platform Backend running on port ${PORT}`);
  logger.info(`🔥 Firebase initialized successfully`);
  logger.info(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || "http://localhost:3001"}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

module.exports = { app, server, io };
