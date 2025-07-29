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
        id: 'ai-proposition',
        name: 'AI Agent',
        role: 'proposition',
        type: 'ai',
        avatar: null,
        joinedAt: new Date().toISOString()
      },
      {
        id: 'ai-opposition',
        name: 'AI Agent',
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
        id: 'ai-proposition-2',
        name: 'AI Agent',
        role: 'proposition',
        type: 'ai',
        avatar: null,
        joinedAt: new Date().toISOString()
      },
      {
        id: 'ai-opposition-2',
        name: 'AI Agent',
        role: 'opposition',
        type: 'ai',
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

// Scoring System
function calculateMessageScore(message, debate) {
  // Base score factors
  let score = 5.0; // Base score out of 10

  // Length factor (optimal 50-200 characters)
  const length = message.content.length;
  if (length >= 50 && length <= 200) {
    score += 1.0;
  } else if (length > 200 && length <= 300) {
    score += 0.5;
  }

  // Engagement factor (responding to previous messages)
  const recentMessages = debate.messages.slice(-3);
  const hasEngagement = recentMessages.some(msg =>
    msg.speakerRole !== message.speakerRole &&
    message.content.toLowerCase().includes('however') ||
    message.content.toLowerCase().includes('but') ||
    message.content.toLowerCase().includes('although')
  );
  if (hasEngagement) score += 1.0;

  // Argument strength indicators
  const strengthIndicators = [
    'evidence', 'data', 'study', 'research', 'statistics',
    'proven', 'demonstrates', 'shows', 'indicates', 'analysis'
  ];
  const strengthCount = strengthIndicators.filter(indicator =>
    message.content.toLowerCase().includes(indicator)
  ).length;
  score += Math.min(strengthCount * 0.5, 2.0);

  // Rhetorical devices
  const rhetoricalDevices = [
    'furthermore', 'moreover', 'therefore', 'consequently',
    'in contrast', 'on the other hand', 'for instance', 'for example'
  ];
  const rhetoricalCount = rhetoricalDevices.filter(device =>
    message.content.toLowerCase().includes(device)
  ).length;
  score += Math.min(rhetoricalCount * 0.3, 1.0);

  // Cap at 10
  return Math.min(score, 10.0);
}

function updateUserStats(userId, messageScore, role, debate) {
  // Initialize user stats if not exists
  if (!debate.userStats) debate.userStats = {};
  if (!debate.userStats[userId]) {
    debate.userStats[userId] = {
      totalMessages: 0,
      totalScore: 0,
      averageScore: 0,
      bestScore: 0,
      role: role,
      recentScores: [],
      wins: 0,
      losses: 0,
      totalDebates: 1,
      winRate: 0,
      streak: 0,
      badges: []
    };
  }

  const stats = debate.userStats[userId];
  stats.totalMessages++;
  stats.totalScore += messageScore;
  stats.averageScore = stats.totalScore / stats.totalMessages;
  stats.bestScore = Math.max(stats.bestScore, messageScore);
  stats.recentScores.push(messageScore);

  // Keep only last 10 scores
  if (stats.recentScores.length > 10) {
    stats.recentScores = stats.recentScores.slice(-10);
  }

  return stats;
}

// Global leaderboard data
let globalLeaderboard = {};

function updateGlobalLeaderboard(userId, userName, stats) {
  if (!globalLeaderboard[userId]) {
    globalLeaderboard[userId] = {
      id: userId,
      name: userName,
      totalDebates: 0,
      totalMessages: 0,
      averageScore: 0,
      bestScore: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      streak: 0,
      badges: [],
      lastActive: new Date().toISOString()
    };
  }

  const globalStats = globalLeaderboard[userId];
  globalStats.totalMessages += 1;
  globalStats.averageScore = ((globalStats.averageScore * (globalStats.totalMessages - 1)) + stats.averageScore) / globalStats.totalMessages;
  globalStats.bestScore = Math.max(globalStats.bestScore, stats.bestScore);
  globalStats.lastActive = new Date().toISOString();

  return globalStats;
}

// AI Reply Generation Function
function generateAIReply(debate, humanRole) {
  console.log('🤖 Generating AI reply for human role:', humanRole);

  // Determine AI role (opposite of human)
  const aiRole = humanRole === 'proposition' ? 'opposition' : 'proposition';

  // Find AI participant
  const aiParticipant = debate.participants.find(p => p.role === aiRole && p.type === 'ai');
  console.log('🔍 AI participant found:', !!aiParticipant, aiParticipant?.name);

  if (!aiParticipant) {
    console.log('❌ No AI participant found for role:', aiRole);
    return;
  }

  // Generate AI response based on the debate topic and recent messages
  const aiResponses = {
    proposition: [
      "AI systems demonstrate superior consistency and objectivity in decision-making processes.",
      "The data clearly supports the efficiency gains from AI implementation in critical sectors.",
      "Human bias and emotional decision-making often lead to suboptimal outcomes in high-stakes situations.",
      "AI can process vast amounts of information simultaneously, leading to more informed decisions.",
      "The track record of AI in medical diagnosis and financial analysis shows measurable improvements.",
      "Studies show AI reduces human error by up to 85% in critical decision-making scenarios.",
      "AI operates without fatigue, ensuring consistent performance in high-pressure situations."
    ],
    opposition: [
      "Human judgment incorporates ethical considerations and contextual understanding that AI lacks.",
      "The complexity of real-world situations requires human empathy and moral reasoning.",
      "AI systems are prone to algorithmic bias and can perpetuate existing inequalities.",
      "Critical decisions affecting human lives require human accountability and responsibility.",
      "The unpredictability of human creativity and intuition often leads to breakthrough solutions.",
      "AI cannot understand the nuanced social and cultural contexts that influence decision-making.",
      "Human oversight is essential to prevent AI from making decisions that lack moral consideration."
    ]
  };

  // Select a random response appropriate to the AI's role
  const responses = aiResponses[aiRole];
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];

  // Create AI message
  const aiMessage = {
    id: `msg-${Date.now()}-ai`,
    speakerId: aiParticipant.id,
    speakerName: aiParticipant.name,
    speakerRole: aiParticipant.role,
    speakerType: 'ai',
    content: randomResponse,
    timestamp: new Date().toISOString(),
    phase: 'debate'
  };

  // Add AI message to debate
  debate.messages.push(aiMessage);

  console.log(`🤖 AI (${aiRole}) replied: "${randomResponse.substring(0, 50)}..."`);
  console.log('📊 Total messages in debate:', debate.messages.length);
}

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

  const { role, userId } = req.body; // 'proposition' or 'opposition'
  // Use provided userId or generate a demo one
  const actualUserId = userId || 'demo-user-google-id';
  const userName = 'Gopika Das'; // Demo user name

  console.log('🎯 User joining debate:', { userId: actualUserId, role, userName });

  // Check if this user is already in the debate (any role)
  const existingUserIndex = debate.participants.findIndex(p => p.id === actualUserId);
  if (existingUserIndex !== -1) {
    // Update their role instead of adding duplicate
    debate.participants[existingUserIndex].role = role;
    console.log('✅ Updated existing participant role to:', role);
    return res.json({
      success: true,
      data: {
        debate: debate,
        participant: debate.participants[existingUserIndex]
      },
      message: `Successfully switched to ${role}`
    });
  }

  // Find AI agent in the requested role and replace it with human
  const aiAgentIndex = debate.participants.findIndex(p => p.role === role && p.type === 'ai');
  if (aiAgentIndex !== -1) {
    // Replace AI with human
    debate.participants[aiAgentIndex] = {
      id: actualUserId,
      name: userName,
      role: role,
      type: 'human',
      avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      joinedAt: new Date().toISOString()
    };
    console.log('🔄 Replaced AI agent with human in role:', role);
  } else {
    // No AI to replace, just add the human (shouldn't happen with our setup)
    const newParticipant = {
      id: actualUserId,
      name: userName,
      role: role,
      type: 'human',
      avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      joinedAt: new Date().toISOString()
    };
    debate.participants.push(newParticipant);
    console.log('➕ Added new human participant:', role);
  }

  // Find the participant that was just added/updated
  const currentParticipant = debate.participants.find(p => p.id === actualUserId);

  res.json({
    success: true,
    data: {
      debate: debate,
      participant: currentParticipant
    },
    message: `Successfully joined as ${role}`
  });
});

// Delete debate
app.delete('/api/debates/:id', (req, res) => {
  const debateIndex = demoDebates.findIndex(d => d.id === req.params.id);
  if (debateIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Debate not found'
    });
  }

  // Remove the debate
  demoDebates.splice(debateIndex, 1);

  res.json({
    success: true,
    message: 'Debate deleted successfully'
  });
});

// Post message to debate
app.post('/api/debates/:id/messages', (req, res) => {
  console.log('📨 Received message request:', {
    debateId: req.params.id,
    body: req.body
  });

  const debate = demoDebates.find(d => d.id === req.params.id);
  if (!debate) {
    console.log('❌ Debate not found:', req.params.id);
    return res.status(404).json({
      success: false,
      message: 'Debate not found'
    });
  }

  const { content, phase, userId } = req.body;
  // Use provided userId or try to find any demo user
  const actualUserId = userId || 'demo-user-id';
  let participant = debate.participants.find(p => p.id === actualUserId);

  console.log('🔍 Looking for participant:', {
    actualUserId,
    foundParticipant: !!participant,
    allParticipants: debate.participants.map(p => ({ id: p.id, name: p.name, role: p.role }))
  });

  // If not found, try to find any participant with the demo user name
  if (!participant) {
    participant = debate.participants.find(p => p.name === 'Gopika Das');
    console.log('🔍 Fallback search by name:', !!participant);
  }

  if (!participant) {
    console.log('❌ No participant found - user must join first');
    return res.status(400).json({
      success: false,
      message: 'You must join the debate first'
    });
  }

  const newMessage = {
    id: `msg-${Date.now()}`,
    speakerId: participant.id,
    speakerName: participant.name,
    speakerRole: participant.role,
    speakerType: participant.type,
    content: content,
    timestamp: new Date().toISOString(),
    phase: phase || debate.phase
  };

  console.log('💬 Creating message:', newMessage);
  debate.messages.push(newMessage);
  console.log('📝 Message added to debate. Total messages:', debate.messages.length);

  // Calculate score and update stats for human messages
  if (participant.type === 'human') {
    const messageScore = calculateMessageScore(newMessage, debate);
    const userStats = updateUserStats(participant.id, messageScore, participant.role, debate);
    const globalStats = updateGlobalLeaderboard(participant.id, participant.name, userStats);

    console.log('📊 Message scored:', {
      score: messageScore.toFixed(1),
      averageScore: userStats.averageScore.toFixed(1),
      totalMessages: userStats.totalMessages
    });

    // Generate AI reply
    setTimeout(() => {
      generateAIReply(debate, participant.role);
    }, 2000); // 2 second delay for realistic response time
  }

  res.json({
    success: true,
    data: newMessage,
    message: 'Message posted successfully'
  });
});

// User stats endpoint
app.get('/api/users/stats', (req, res) => {
  const userId = 'demo-user-google-id'; // Demo user ID
  const userStats = globalLeaderboard[userId];

  if (!userStats) {
    // Return default stats for new users
    return res.json({
      success: true,
      data: {
        totalDebates: 0,
        totalMessages: 0,
        averageScore: 0,
        averageArgumentStrength: 0,
        bestScore: 0,
        winRate: 0,
        streak: 0,
        debatesByFormat: {
          oxford: 0,
          parliamentary: 0,
          'lincoln-douglas': 0
        },
        recentPerformance: [],
        badges: []
      }
    });
  }

  // Calculate additional metrics
  const recentPerformance = userStats.recentScores || [];
  const debatesByFormat = {
    oxford: Math.floor(userStats.totalDebates * 0.6),
    parliamentary: Math.floor(userStats.totalDebates * 0.3),
    'lincoln-douglas': Math.floor(userStats.totalDebates * 0.1)
  };

  res.json({
    success: true,
    data: {
      totalDebates: userStats.totalDebates,
      totalMessages: userStats.totalMessages,
      averageScore: userStats.averageScore,
      averageArgumentStrength: userStats.averageScore,
      bestScore: userStats.bestScore,
      winRate: userStats.winRate,
      streak: userStats.streak,
      debatesByFormat,
      recentPerformance: recentPerformance.map((score, index) => ({
        date: new Date(Date.now() - (recentPerformance.length - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        score: score,
        debates: 1
      })),
      badges: userStats.badges || []
    }
  });
});

// Public users endpoint for leaderboard
app.get('/api/users/public', (req, res) => {
  const { sortBy = 'averageScore', limit = 50 } = req.query;

  console.log('👥 Fetching public users for leaderboard...');

  // Convert global leaderboard to public user format
  let users = Object.values(globalLeaderboard).map(user => ({
    uid: user.id,
    displayName: user.name,
    photoURL: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    debateStats: {
      totalDebates: user.totalDebates,
      averageScore: user.averageScore,
      totalMessages: user.totalMessages,
      wins: user.wins,
      losses: user.losses,
      winRate: user.winRate,
      streak: user.streak
    },
    lastActive: user.lastActive
  }));

  // Add demo users if empty
  if (users.length === 0) {
    users = [
      {
        uid: 'demo-1',
        displayName: 'Alice Johnson',
        photoURL: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        debateStats: { totalDebates: 18, averageScore: 7.8, totalMessages: 156, wins: 12, losses: 6, winRate: 0.67, streak: 3 },
        lastActive: new Date().toISOString()
      },
      {
        uid: 'demo-2',
        displayName: 'Bob Smith',
        photoURL: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        debateStats: { totalDebates: 15, averageScore: 7.2, totalMessages: 134, wins: 10, losses: 5, winRate: 0.67, streak: 1 },
        lastActive: new Date().toISOString()
      }
    ];
  }

  // Sort users
  users.sort((a, b) => {
    switch (sortBy) {
      case 'totalDebates':
        return b.debateStats.totalDebates - a.debateStats.totalDebates;
      case 'winRate':
        return b.debateStats.winRate - a.debateStats.winRate;
      case 'averageScore':
      default:
        return b.debateStats.averageScore - a.debateStats.averageScore;
    }
  });

  // Limit results
  users = users.slice(0, parseInt(limit));

  console.log('👥 Returning', users.length, 'public users');

  res.json({
    success: true,
    data: users
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
  console.log('📊 Fetching leaderboard data...');

  // Convert global leaderboard to array and sort by average score
  const leaderboardArray = Object.values(globalLeaderboard)
    .sort((a, b) => b.averageScore - a.averageScore)
    .map((user, index) => ({
      ...user,
      rank: index + 1,
      rating: Math.round(user.averageScore * 150 + 1000), // Convert to rating scale
      uid: user.id, // For frontend compatibility
      displayName: user.name,
      photoURL: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      debateStats: {
        totalDebates: user.totalDebates,
        averageScore: user.averageScore,
        totalMessages: user.totalMessages
      }
    }));

  // Add some demo users if leaderboard is empty
  if (leaderboardArray.length === 0) {
    leaderboardArray.push(
      {
        id: 'demo-1',
        uid: 'demo-1',
        name: 'Alice Johnson',
        displayName: 'Alice Johnson',
        rating: 1450,
        wins: 12,
        losses: 6,
        totalDebates: 18,
        averageScore: 7.8,
        totalMessages: 156,
        winRate: 0.67,
        streak: 3,
        rank: 1,
        photoURL: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        debateStats: { totalDebates: 18, averageScore: 7.8, totalMessages: 156 }
      },
      {
        id: 'demo-2',
        uid: 'demo-2',
        name: 'Bob Smith',
        displayName: 'Bob Smith',
        rating: 1380,
        wins: 10,
        losses: 5,
        totalDebates: 15,
        averageScore: 7.2,
        totalMessages: 134,
        winRate: 0.67,
        streak: 1,
        rank: 2,
        photoURL: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        debateStats: { totalDebates: 15, averageScore: 7.2, totalMessages: 134 }
      }
    );
  }

  console.log('📊 Returning leaderboard with', leaderboardArray.length, 'users');

  res.json({
    success: true,
    data: leaderboardArray
  });
});

// Analytics
app.get('/api/analytics/dashboard', (req, res) => {
  console.log('📈 Fetching analytics data...');

  // Calculate real-time analytics
  const totalUsers = Object.keys(globalLeaderboard).length;
  const activeDebates = demoDebates.filter(d => d.status === 'active').length;
  const completedDebates = demoDebates.filter(d => d.status === 'completed').length;
  const totalDebates = demoDebates.length;

  // Calculate average rating from global leaderboard
  const averageRating = totalUsers > 0
    ? Object.values(globalLeaderboard).reduce((sum, user) => sum + (user.averageScore * 150 + 1000), 0) / totalUsers
    : 1285;

  // Get recent activity from debate messages
  const recentActivity = [];
  demoDebates.forEach(debate => {
    if (debate.messages && debate.messages.length > 0) {
      const recentMessages = debate.messages.slice(-3);
      recentMessages.forEach(msg => {
        if (msg.speakerType === 'human') {
          recentActivity.push({
            type: 'message_sent',
            message: `${msg.speakerName} posted in "${debate.title}"`,
            timestamp: msg.timestamp,
            debateId: debate.id
          });
        }
      });
    }
  });

  // Sort by timestamp and take latest 10
  recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const latestActivity = recentActivity.slice(0, 10);

  // Add some demo activity if empty
  if (latestActivity.length === 0) {
    latestActivity.push(
      { type: 'debate_created', message: 'New debate: AI vs Human Intelligence', timestamp: new Date().toISOString() },
      { type: 'user_joined', message: 'Gopika Das joined the platform', timestamp: new Date().toISOString() }
    );
  }

  const analyticsData = {
    totalDebates,
    activeDebates,
    completedDebates,
    totalUsers: Math.max(totalUsers, 5), // Show at least 5 for demo
    averageRating: Math.round(averageRating),
    recentActivity: latestActivity,
    // Additional metrics
    totalMessages: Object.values(globalLeaderboard).reduce((sum, user) => sum + user.totalMessages, 0),
    averageScore: totalUsers > 0
      ? Object.values(globalLeaderboard).reduce((sum, user) => sum + user.averageScore, 0) / totalUsers
      : 7.5,
    topPerformer: Object.values(globalLeaderboard).sort((a, b) => b.averageScore - a.averageScore)[0]?.name || 'No data yet'
  };

  console.log('📈 Analytics data:', {
    totalUsers: analyticsData.totalUsers,
    totalDebates: analyticsData.totalDebates,
    averageScore: analyticsData.averageScore?.toFixed(1)
  });

  res.json({
    success: true,
    data: analyticsData
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
