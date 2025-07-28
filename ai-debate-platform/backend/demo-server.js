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
    motion: 'This house believes that AI should replace human decision-making in critical areas',
    status: 'active',
    phase: 'opening',
    currentPhase: 'debate',
    timeRemaining: 300,
    participants: [
      {
        id: 'user-1',
        name: 'Alice Johnson',
        role: 'proposition',
        type: 'human',
        avatar: null,
        joinedAt: new Date().toISOString()
      },
      {
        id: 'demo-user-google-id',
        name: 'Gopika Das',
        role: 'proposition',
        type: 'human',
        avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        joinedAt: new Date().toISOString()
      },
      {
        id: 'demo-user-id',
        name: 'Gopika Das',
        role: 'proposition',
        type: 'human',
        avatar: null,
        joinedAt: new Date().toISOString()
      },
      {
        id: 'ai-1',
        name: 'AI Debater',
        role: 'opposition',
        type: 'ai',
        avatar: null,
        joinedAt: new Date().toISOString()
      }
    ],
    messages: [
      {
        id: 'msg-1',
        speakerId: 'user-1',
        speakerName: 'Alice Johnson',
        speakerRole: 'proposition',
        speakerType: 'human',
        content: 'AI systems can process vast amounts of data and make decisions without human bias or emotional interference.',
        timestamp: new Date().toISOString(),
        phase: 'opening'
      },
      {
        id: 'msg-2',
        speakerId: 'ai-1',
        speakerName: 'AI Debater',
        speakerRole: 'opposition',
        speakerType: 'ai',
        content: 'While AI can process data efficiently, human judgment incorporates ethical considerations, empathy, and contextual understanding that AI currently lacks.',
        timestamp: new Date().toISOString(),
        phase: 'opening'
      }
    ],
    createdAt: new Date().toISOString(),
    createdBy: 'user-1'
  },
  {
    id: 'demo-2',
    title: 'Climate Change Solutions',
    topic: 'What is the most effective approach to combat climate change?',
    motion: 'This house believes that renewable energy is the most effective solution to climate change',
    status: 'active',
    phase: 'debate',
    currentPhase: 'debate',
    timeRemaining: 180,
    participants: [
      {
        id: 'user-2',
        name: 'Charlie Brown',
        role: 'proposition',
        type: 'human',
        avatar: null,
        joinedAt: new Date().toISOString()
      },
      {
        id: 'demo-user-google-id',
        name: 'Gopika Das',
        role: 'opposition',
        type: 'human',
        avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        joinedAt: new Date().toISOString()
      },
      {
        id: 'demo-user-id',
        name: 'Gopika Das',
        role: 'opposition',
        type: 'human',
        avatar: null,
        joinedAt: new Date().toISOString()
      },
      {
        id: 'user-3',
        name: 'Diana Prince',
        role: 'opposition',
        type: 'human',
        avatar: null,
        joinedAt: new Date().toISOString()
      }
    ],
    messages: [
      {
        id: 'msg-3',
        speakerId: 'user-2',
        speakerName: 'Charlie Brown',
        speakerRole: 'proposition',
        speakerType: 'human',
        content: 'Renewable energy technologies have become increasingly cost-effective and can significantly reduce carbon emissions.',
        timestamp: new Date().toISOString(),
        phase: 'opening'
      },
      {
        id: 'msg-4',
        speakerId: 'user-3',
        speakerName: 'Diana Prince',
        speakerRole: 'opposition',
        speakerType: 'human',
        content: 'While renewable energy is important, a comprehensive approach including carbon capture, policy changes, and lifestyle modifications is more effective.',
        timestamp: new Date().toISOString(),
        phase: 'rebuttal'
      }
    ],
    createdAt: new Date().toISOString(),
    createdBy: 'user-2',
    winner: 'opposition',
    finalScores: {
      proposition: 7.2,
      opposition: 8.1
    }
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
  const { limit = 20, offset = 0, status, search } = req.query;

  let filteredDebates = [...demoDebates];

  // Filter by status if provided
  if (status && status !== 'all') {
    filteredDebates = filteredDebates.filter(debate => debate.status === status);
  }

  // Filter by search term if provided
  if (search) {
    const searchLower = search.toLowerCase();
    filteredDebates = filteredDebates.filter(debate =>
      debate.title.toLowerCase().includes(searchLower) ||
      debate.topic.toLowerCase().includes(searchLower) ||
      debate.motion.toLowerCase().includes(searchLower)
    );
  }

  const total = filteredDebates.length;
  const startIndex = parseInt(offset);
  const endIndex = startIndex + parseInt(limit);
  const paginatedDebates = filteredDebates.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: paginatedDebates,
    pagination: {
      total: total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: endIndex < total
    },
    count: total
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

// Join debate with specific side
app.post('/api/debates/:id/join', (req, res) => {
  const debate = demoDebates.find(d => d.id === req.params.id);
  if (!debate) {
    return res.status(404).json({
      success: false,
      message: 'Debate not found'
    });
  }

  const { role } = req.body; // 'proposition' or 'opposition'
  // In demo mode, use the authenticated user's info or default
  const userId = req.headers.authorization ? 'authenticated-user' : 'demo-user-id';
  const userName = req.headers.authorization ? 'Gopika Das' : 'Demo User';

  // Check if role is already taken
  const existingParticipant = debate.participants.find(p => p.role === role);
  if (existingParticipant) {
    return res.status(400).json({
      success: false,
      message: `${role} side is already taken`
    });
  }

  // Add participant
  const newParticipant = {
    id: userId,
    name: userName,
    role: role,
    type: 'human',
    avatar: null,
    joinedAt: new Date().toISOString()
  };

  debate.participants.push(newParticipant);

  res.json({
    success: true,
    data: {
      debate: debate,
      participant: newParticipant
    },
    message: `Successfully joined as ${role}`
  });
});

// Post message to debate
app.post('/api/debates/:id/messages', (req, res) => {
  const debate = demoDebates.find(d => d.id === req.params.id);
  if (!debate) {
    return res.status(404).json({
      success: false,
      message: 'Debate not found'
    });
  }

  const { content, phase } = req.body;
  // In demo mode, use the authenticated user's info or default
  const userId = req.headers.authorization ? 'authenticated-user' : 'demo-user-id';
  const participant = debate.participants.find(p => p.id === userId);

  if (!participant) {
    return res.status(400).json({
      success: false,
      message: 'You must join the debate first'
    });
  }

  const newMessage = {
    id: `msg-${Date.now()}`,
    speakerId: userId,
    speakerName: participant.name,
    speakerRole: participant.role,
    speakerType: participant.type,
    content: content,
    timestamp: new Date().toISOString(),
    phase: phase || debate.phase
  };

  debate.messages.push(newMessage);

  res.json({
    success: true,
    data: newMessage,
    message: 'Message posted successfully'
  });
});

// User routes
app.get('/api/users/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 'demo-user',
      displayName: 'Demo User',
      email: 'ugopikadas2003@gmail.com',
      bio: 'Passionate debater and AI enthusiast. Love exploring complex topics and engaging in thoughtful discussions.',
      avatar: null,
      preferences: {
        notifications: true,
        emailNotifications: true,
        preferredDebateFormat: 'oxford',
        aiDifficulty: 'intermediate'
      },
      memberSince: '2024-01-15T10:30:00Z',
      lastActive: new Date().toISOString()
    }
  });
});

app.get('/api/users/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalDebates: 12,
      wins: 8,
      losses: 4,
      winRate: 66.7,
      rating: 1285,
      averageScore: 7.8,
      completedDebates: 12,
      activeDebates: 2,
      totalArguments: 156,
      averageArgumentLength: 245,
      favoriteTopics: ['Technology', 'Ethics', 'Politics'],
      recentActivity: [
        {
          type: 'debate_completed',
          title: 'AI in Healthcare',
          result: 'won',
          date: '2024-01-20T15:30:00Z',
          score: 8.5
        },
        {
          type: 'debate_joined',
          title: 'Climate Change Solutions',
          date: '2024-01-19T09:15:00Z'
        },
        {
          type: 'argument_posted',
          debate: 'Future of Work',
          date: '2024-01-18T14:22:00Z'
        }
      ]
    }
  });
});

app.patch('/api/users/profile', (req, res) => {
  // In demo mode, just return success with updated data
  const updatedProfile = {
    id: 'demo-user',
    displayName: req.body.displayName || 'Demo User',
    email: 'ugopikadas2003@gmail.com',
    bio: req.body.bio || 'Passionate debater and AI enthusiast.',
    preferences: {
      notifications: req.body.preferences?.notifications ?? true,
      emailNotifications: req.body.preferences?.emailNotifications ?? true,
      preferredDebateFormat: req.body.preferences?.preferredDebateFormat || 'oxford',
      aiDifficulty: req.body.preferences?.aiDifficulty || 'intermediate'
    },
    memberSince: '2024-01-15T10:30:00Z',
    lastActive: new Date().toISOString()
  };

  res.json({
    success: true,
    data: updatedProfile,
    message: 'Profile updated successfully (demo mode)'
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
  
  socket.on('join_debate', (data) => {
    const { debateId, role } = data; // role: 'proposition' or 'opposition'
    socket.join(debateId);
    socket.debateRole = role;
    socket.debateId = debateId;

    socket.emit('joined_debate', {
      debateId,
      role,
      mode: 'demo',
      message: `Joined as ${role}`
    });

    // Notify other participants
    socket.to(debateId).emit('participant_joined', {
      socketId: socket.id,
      role: role,
      timestamp: new Date().toISOString()
    });

    console.log(`User ${socket.id} joined debate ${debateId} as ${role}`);
  });

  socket.on('send_message', (data) => {
    const messageData = {
      ...data,
      socketId: socket.id,
      role: socket.debateRole,
      timestamp: new Date().toISOString(),
      mode: 'demo'
    };

    // Broadcast to all participants in the debate
    socket.to(data.debateId).emit('new_message', messageData);

    // Also emit back to sender for confirmation
    socket.emit('message_sent', messageData);
  });

  socket.on('change_phase', (data) => {
    const { debateId, newPhase } = data;
    socket.to(debateId).emit('phase_changed', {
      phase: newPhase,
      timestamp: new Date().toISOString(),
      changedBy: socket.debateRole
    });
  });

  socket.on('generate_ai_response', (data) => {
    const { debateId, motion, role, difficulty } = data;

    // Simulate AI response generation
    setTimeout(() => {
      const aiResponses = {
        proposition: [
          "Based on empirical evidence, this position is strongly supported by recent studies...",
          "The logical framework clearly demonstrates that...",
          "From a practical standpoint, the benefits significantly outweigh the concerns..."
        ],
        opposition: [
          "However, we must consider the counterarguments that challenge this perspective...",
          "The evidence presented fails to account for several critical factors...",
          "While the proposition makes valid points, the underlying assumptions are flawed..."
        ]
      };

      const responses = aiResponses[role] || aiResponses.opposition;
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      const aiMessage = {
        id: `ai-msg-${Date.now()}`,
        speakerId: `ai-${role}`,
        speakerName: 'AI Debater',
        speakerRole: role,
        speakerType: 'ai',
        content: randomResponse,
        timestamp: new Date().toISOString(),
        debateId: debateId
      };

      socket.to(debateId).emit('ai_message', aiMessage);
      socket.emit('ai_message', aiMessage);
    }, 2000); // 2 second delay to simulate AI thinking
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
