// Demo Backend Server for AI Debate Platform
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');

console.log('🚀 Starting AI Debate Platform Demo Backend...');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors({
  origin: ["http://localhost:3002", "http://localhost:3001"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));

app.use(express.json());

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3002", "http://localhost:3001"],
    methods: ["GET", "POST"]
  }
});

// Demo data
const demoDebates = [
  {
    id: 'demo-1',
    title: 'AI vs Human Intelligence',
    topic: 'Should AI replace human decision-making in critical areas?',
    status: 'active',
    participants: ['Alice', 'Bob'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'demo-2', 
    title: 'Climate Change Solutions',
    topic: 'What is the most effective approach to combat climate change?',
    status: 'completed',
    participants: ['Charlie', 'Diana'],
    createdAt: new Date().toISOString()
  }
];

// Basic routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'AI Debate Platform Demo API is running!',
    status: 'success',
    timestamp: new Date().toISOString(),
    version: '1.0.0-demo',
    mode: 'demo'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    mode: 'demo'
  });
});

// API routes
app.get('/api/debates', (req, res) => {
  res.json({
    success: true,
    data: demoDebates,
    count: demoDebates.length
  });
});

app.post('/api/debates', (req, res) => {
  const newDebate = {
    id: `demo-${Date.now()}`,
    title: req.body.title || 'New Debate',
    topic: req.body.topic || 'Demo topic',
    status: 'active',
    participants: [],
    createdAt: new Date().toISOString()
  };
  
  demoDebates.push(newDebate);
  
  res.json({
    success: true,
    data: newDebate,
    message: 'Debate created successfully (demo mode)'
  });
});

app.get('/api/debates/:id', (req, res) => {
  const debate = demoDebates.find(d => d.id === req.params.id);
  if (debate) {
    res.json({
      success: true,
      data: debate
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'Debate not found'
    });
  }
});

// User routes
app.get('/api/users/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 'demo-user',
      name: 'Demo User',
      email: 'demo@example.com',
      stats: {
        totalDebates: 5,
        wins: 3,
        rating: 1250
      }
    }
  });
});

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: '1', name: 'Alice Johnson', rating: 1450, wins: 12, totalDebates: 18 },
      { id: '2', name: 'Bob Smith', rating: 1380, wins: 10, totalDebates: 15 },
      { id: '3', name: 'Charlie Brown', rating: 1320, wins: 8, totalDebates: 12 },
      { id: '4', name: 'Diana Prince', rating: 1280, wins: 7, totalDebates: 11 },
      { id: '5', name: 'Demo User', rating: 1250, wins: 3, totalDebates: 5 }
    ]
  });
});

// Analytics
app.get('/api/analytics/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      totalDebates: 25,
      activeDebates: 3,
      completedDebates: 22,
      totalUsers: 150,
      averageRating: 1285,
      recentActivity: [
        { type: 'debate_created', message: 'New debate: AI Ethics', timestamp: new Date().toISOString() },
        { type: 'user_joined', message: 'Alice joined the platform', timestamp: new Date().toISOString() }
      ]
    }
  });
});

// Socket connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  
  socket.emit('welcome', {
    message: 'Connected to AI Debate Platform Demo',
    mode: 'demo'
  });
  
  socket.on('join_debate', (debateId) => {
    socket.join(debateId);
    socket.emit('joined_debate', { debateId, mode: 'demo' });
    console.log(`User ${socket.id} joined debate ${debateId}`);
  });
  
  socket.on('send_message', (data) => {
    socket.to(data.debateId).emit('new_message', {
      ...data,
      timestamp: new Date().toISOString(),
      mode: 'demo'
    });
  });
  
  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error (demo mode)',
    error: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found (demo mode)'
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`✅ Demo Backend server running on http://localhost:${PORT}`);
  console.log(`🌐 Frontend should be at http://localhost:3002`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket server ready for connections`);
  console.log(`🎭 Running in DEMO MODE - AI features simulated`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
