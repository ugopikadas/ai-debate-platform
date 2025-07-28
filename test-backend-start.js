// Simple test to start the backend server
const express = require('express');
const cors = require('cors');

console.log('🚀 Starting AI Debate Platform Backend...');

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors({
  origin: "http://localhost:3002",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));

app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'AI Debate Platform API is running!',
    status: 'success',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`🌐 Frontend should be at http://localhost:3002`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
