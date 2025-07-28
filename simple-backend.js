// Simple backend server for AI Debate Platform
console.log('🚀 Starting AI Debate Platform Backend...');

try {
  const express = require('express');
  const cors = require('cors');
  const { createServer } = require('http');
  const { Server } = require('socket.io');
  
  const app = express();
  const server = createServer(app);
  const PORT = process.env.PORT || 5000;
  
  // Basic middleware
  app.use(cors({
    origin: "http://localhost:3002",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  }));
  
  app.use(express.json());
  
  // Socket.IO setup
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3002",
      methods: ["GET", "POST"]
    }
  });
  
  // Basic routes
  app.get('/', (req, res) => {
    res.json({ 
      message: 'AI Debate Platform API is running!',
      status: 'success',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });
  
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  });
  
  // Socket connection handling
  io.on('connection', (socket) => {
    console.log('👤 User connected:', socket.id);
    
    socket.on('disconnect', () => {
      console.log('👋 User disconnected:', socket.id);
    });
  });
  
  // Start server
  server.listen(PORT, () => {
    console.log(`✅ Backend server running on http://localhost:${PORT}`);
    console.log(`🌐 Frontend should be at http://localhost:3002`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔌 WebSocket server ready for connections`);
  });
  
} catch (error) {
  console.error('❌ Failed to start backend:', error.message);
  process.exit(1);
}
