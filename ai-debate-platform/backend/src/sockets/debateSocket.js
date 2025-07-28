const AgentManager = require('../agents/AgentManager');
const DebateAnalyzer = require('../analysis/DebateAnalyzer');
const { dbHelpers, collections } = require('../firebase/config');
const logger = require('../utils/logger');
const timingConfig = require('../../config/debate-timing');

const agentManager = new AgentManager();
const debateAnalyzer = new DebateAnalyzer();

function initializeSocketHandlers(io) {
  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.id}`);

    // Join debate room
    socket.on('join_debate', async (data) => {
      try {
        const { debateId, userId, userRole } = data;

        // Check if user is already in the room to prevent duplicate joins
        if (socket.debateId === debateId && socket.userId === userId) {
          logger.info(`User ${userId} already in debate ${debateId}`);
          return;
        }

        socket.join(debateId);
        socket.debateId = debateId;
        socket.userId = userId;
        socket.userRole = userRole;

        // Notify others in the room
        socket.to(debateId).emit('user_joined', {
          userId,
          userRole,
          timestamp: new Date().toISOString()
        });

        // Send current debate state
        const debate = await dbHelpers.getDoc(collections.DEBATES, debateId);
        const messages = await dbHelpers.queryDocs(collections.MESSAGES, [
          { field: 'debateId', operator: '==', value: debateId }
        ]);

        socket.emit('debate_state', {
          debate,
          messages: messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        });

        logger.info(`User ${userId} joined debate ${debateId}`);
      } catch (error) {
        logger.error('Error joining debate:', error);
        socket.emit('error', { message: 'Failed to join debate' });
      }
    });

    // Handle new debate message
    socket.on('send_message', async (data) => {
      try {
        const { debateId, content, speakerType } = data;
        const timestamp = new Date().toISOString();

        const message = {
          debateId,
          content,
          speakerId: socket.userId,
          speakerType, // 'human' or 'ai'
          speakerRole: socket.userRole, // 'proposition' or 'opposition'
          timestamp,
          processed: false
        };

        // Save message to database
        const messageId = await dbHelpers.createDoc(collections.MESSAGES, message);
        message.id = messageId;

        // Broadcast message to all participants
        io.to(debateId).emit('new_message', message);

        // Get debate context and history for analysis
        const debate = await dbHelpers.getDoc(collections.DEBATES, debateId);
        const debateHistory = await dbHelpers.queryDocs(collections.MESSAGES, [
          { field: 'debateId', operator: '==', value: debateId }
        ]);

        // Generate real-time analysis
        const analysis = await debateAnalyzer.generateRealTimeFeedback(
          message,
          { motion: debate.motion, role: socket.userRole },
          debateHistory
        );

        logger.info(`Generated analysis for message ${messageId}:`, analysis);

        // Send analysis to all participants
        io.to(debateId).emit('real_time_analysis', analysis);

        // Update and broadcast leaderboard data
        if (speakerType === 'human' && analysis.overallScore) {
          await updateDebateLeaderboard(debateId, socket.userId, analysis, io);
        }

        // If this is a human message and there's an AI opponent, generate AI response
        if (speakerType === 'human' && debate.hasAIParticipant) {
          logger.info(`Triggering AI response for debate ${debateId}`);
          await handleAIResponse(debateId, debate, debateHistory, io);
        }

        // Mark message as processed
        await dbHelpers.updateDoc(collections.MESSAGES, messageId, { processed: true });

        // Update user stats for dashboard
        if (speakerType === 'human') {
          await updateUserStats(socket.userId, {
            totalMessages: 1,
            lastActivity: new Date().toISOString()
          });

          // Broadcast updated stats to user's other sessions
          socket.broadcast.emit('user_stats_updated', {
            userId: socket.userId,
            timestamp: new Date().toISOString()
          });
        }

        logger.info(`Message processed for debate ${debateId}`);
      } catch (error) {
        logger.error('Error processing message:', error);
        socket.emit('error', { message: 'Failed to process message' });
      }
    });

    // Handle AI agent generation request
    socket.on('generate_ai_agent', async (data) => {
      try {
        const { debateId, motion, role, difficulty } = data;

        socket.emit('agent_generation_started', { 
          message: 'Generating AI agent...' 
        });

        const agent = await agentManager.generateAgent(motion, role, difficulty);

        // Get current debate to update participants
        const debate = await dbHelpers.getDoc(collections.DEBATES, debateId);
        const participants = debate.participants || [];

        // Add AI participant
        participants.push({
          id: agent.id || `ai_${Date.now()}`,
          role: role,
          name: 'AI Agent',
          type: 'ai',
          joinedAt: new Date().toISOString()
        });

        // Update debate with AI agent and participant
        const updateData = {
          aiAgent: agent,
          hasAIParticipant: true,
          participants: participants
        };

        // If we now have 2+ participants, make debate active
        if (participants.length >= 2) {
          updateData.status = 'active';
        }

        await dbHelpers.updateDoc(collections.DEBATES, debateId, updateData);

        const updatedDebate = { ...debate, ...updateData };

        io.to(debateId).emit('ai_agent_generated', {
          agent: {
            id: agent.id,
            personality: agent.personality,
            expertise: agent.expertise,
            role: agent.role
          },
          debate: updatedDebate
        });

        // Also emit debate_updated to ensure all clients get the updated state
        io.to(debateId).emit('debate_updated', updatedDebate);

        logger.info(`AI agent generated for debate ${debateId}`);
      } catch (error) {
        logger.error('Error generating AI agent:', error);
        socket.emit('error', { message: 'Failed to generate AI agent' });
      }
    });

    // Handle debate phase changes
    socket.on('change_phase', async (data) => {
      try {
        const { debateId, phase } = data;

        await dbHelpers.updateDoc(collections.DEBATES, debateId, {
          currentPhase: phase,
          phaseChangedAt: new Date().toISOString()
        });

        io.to(debateId).emit('phase_changed', {
          phase,
          timestamp: new Date().toISOString()
        });

        // Handle phase-specific logic
        switch (phase) {
          case 'preparation':
            await handlePreparationPhase(debateId, io);
            break;
          case 'debate':
            await handleDebatePhase(debateId, io);
            break;
          case 'evaluation':
            await handleEvaluationPhase(debateId, io);
            break;
          case 'completed':
            await handleDebateCompletion(debateId, io);
            break;
        }

        logger.info(`Debate ${debateId} phase changed to ${phase}`);
      } catch (error) {
        logger.error('Error changing debate phase:', error);
        socket.emit('error', { message: 'Failed to change debate phase' });
      }
    });

    // Handle manual debate ending
    socket.on('end_debate', async (data) => {
      try {
        const { debateId } = data;

        logger.info(`Manually ending debate ${debateId} by user ${socket.userId}`);

        // Update debate status to completed
        await dbHelpers.updateDoc(collections.DEBATES, debateId, {
          currentPhase: 'completed',
          status: 'completed',
          endedAt: new Date().toISOString(),
          endedBy: socket.userId
        });

        // Generate final analysis and results
        await handleDebateCompletion(debateId, io);

      } catch (error) {
        logger.error('Error ending debate:', error);
        socket.emit('error', { message: 'Failed to end debate' });
      }
    });

    // Handle real-time feedback requests
    socket.on('request_feedback', async (data) => {
      try {
        const { debateId, messageId } = data;

        const message = await dbHelpers.getDoc(collections.MESSAGES, messageId);
        const debate = await dbHelpers.getDoc(collections.DEBATES, debateId);
        const debateHistory = await dbHelpers.queryDocs(collections.MESSAGES, [
          { field: 'debateId', operator: '==', value: debateId }
        ]);

        const feedback = await debateAnalyzer.generateRealTimeFeedback(
          message,
          { motion: debate.motion, role: message.speakerRole },
          debateHistory
        );

        socket.emit('feedback_generated', feedback);
      } catch (error) {
        logger.error('Error generating feedback:', error);
        socket.emit('error', { message: 'Failed to generate feedback' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      socket.to(data.debateId).emit('user_typing', {
        userId: socket.userId,
        typing: true
      });
    });

    socket.on('typing_stop', (data) => {
      socket.to(data.debateId).emit('user_typing', {
        userId: socket.userId,
        typing: false
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      if (socket.debateId) {
        socket.to(socket.debateId).emit('user_left', {
          userId: socket.userId,
          timestamp: new Date().toISOString()
        });
      }
      logger.info(`User disconnected: ${socket.id}`);
    });
  });
}

// Helper function to handle AI responses
async function handleAIResponse(debateId, debate, debateHistory, io) {
  try {
    if (!debate.aiAgent) return;

    // Ensure AI agent is properly initialized in AgentManager
    agentManager.getOrCreateAgent(debate.aiAgent.id, debate.aiAgent);

    // Add a small delay to make AI response feel more natural
    setTimeout(async () => {
      try {
        // Generate AI response
        const aiResponse = await agentManager.generateResponse(
          debate.aiAgent.id,
          {
            motion: debate.motion,
            role: debate.aiAgent.role,
            debateId: debateId
          },
          debateHistory.slice(-5) // Last 5 messages for context
        );

        const aiMessage = {
          debateId,
          content: aiResponse.content,
          speakerId: debate.aiAgent.id,
          speakerType: 'ai',
          speakerRole: debate.aiAgent.role,
          timestamp: new Date().toISOString(),
          processed: true
        };

        // Save AI message
        const messageId = await dbHelpers.createDoc(collections.MESSAGES, aiMessage);
        aiMessage.id = messageId;

        // Broadcast AI message
        io.to(debateId).emit('new_message', aiMessage);

        // Generate analysis for AI message
        const analysis = await debateAnalyzer.generateRealTimeFeedback(
          aiMessage,
          { motion: debate.motion, role: debate.aiAgent.role },
          [...debateHistory, aiMessage]
        );

        io.to(debateId).emit('real_time_analysis', analysis);

      } catch (error) {
        logger.error('Error generating AI response:', error);
      }
    }, 2000 + Math.random() * 3000); // 2-5 second delay

  } catch (error) {
    logger.error('Error in handleAIResponse:', error);
  }
}

// Phase-specific handlers
async function handlePreparationPhase(debateId, io) {
  const debate = await dbHelpers.getDoc(collections.DEBATES, debateId);
  const defaultTiming = timingConfig.getConfig('defaults');
  const prepTime = debate.prepTime || defaultTiming.prepTime;

  // Send preparation tips and resources
  io.to(debateId).emit('preparation_resources', {
    tips: [
      'Research key arguments for your position',
      'Anticipate counterarguments',
      'Prepare evidence and examples',
      'Practice your opening statement'
    ],
    timeLimit: prepTime,
    startTime: new Date().toISOString()
  });

  // Set automatic transition to debate phase
  setTimeout(async () => {
    try {
      const currentDebate = await dbHelpers.getDoc(collections.DEBATES, debateId);
      if (currentDebate && currentDebate.currentPhase === 'preparation') {
        logger.info(`Auto-transitioning debate ${debateId} from preparation to debate phase`);

        await dbHelpers.updateDoc(collections.DEBATES, debateId, {
          currentPhase: 'debate',
          phaseChangedAt: new Date().toISOString(),
          debateStartTime: new Date().toISOString()
        });

        io.to(debateId).emit('phase_changed', {
          phase: 'debate',
          timestamp: new Date().toISOString(),
          automatic: true
        });

        // Start debate phase
        await handleDebatePhase(debateId, io);
      }
    } catch (error) {
      logger.error('Error in auto-transition from preparation:', error);
    }
  }, prepTime);
}

async function handleDebatePhase(debateId, io) {
  // Start debate timer and send speaking order
  const debate = await dbHelpers.getDoc(collections.DEBATES, debateId);
  const timePerSpeech = debate.timePerSpeech || 180000; // 3 minutes
  const speakingOrder = debate.speakingOrder || ['proposition', 'opposition'];

  // Update debate with current speaker
  await dbHelpers.updateDoc(collections.DEBATES, debateId, {
    currentSpeaker: speakingOrder[0],
    speechStartTime: new Date().toISOString(),
    speechNumber: 1,
    totalSpeeches: speakingOrder.length * 2 // Each side speaks twice
  });

  io.to(debateId).emit('debate_started', {
    speakingOrder,
    timePerSpeech,
    currentSpeaker: speakingOrder[0],
    speechNumber: 1,
    totalSpeeches: speakingOrder.length * 2
  });

  // Start automated speech timing
  startSpeechTimer(debateId, speakingOrder[0], timePerSpeech, 1, io);
}

async function handleEvaluationPhase(debateId, io) {
  try {
    // Generate comprehensive analysis for all participants
    const debate = await dbHelpers.getDoc(collections.DEBATES, debateId);
    const participants = debate.participants || [];

    const evaluations = await Promise.all(
      participants.map(participant =>
        debateAnalyzer.analyzeOverallPerformance(debateId, participant.id)
      )
    );

    io.to(debateId).emit('final_evaluation', {
      evaluations,
      winner: determineWinner(evaluations),
      summary: generateDebateSummary(evaluations)
    });

  } catch (error) {
    logger.error('Error in evaluation phase:', error);
  }
}

async function handleDebateCompletion(debateId, io) {
  try {
    logger.info(`Completing debate ${debateId}`);

    // Get debate data
    const debate = await dbHelpers.getDoc(collections.DEBATES, debateId);
    const messages = await dbHelpers.queryDocs(collections.MESSAGES, [
      { field: 'debateId', operator: '==', value: debateId }
    ]);

    // Generate comprehensive final analysis
    const finalAnalysis = await generateFinalAnalysis(debate, messages);

    // Update final leaderboard with comprehensive stats
    const finalLeaderboard = await generateFinalLeaderboard(debate, messages, finalAnalysis);

    // Update user global stats
    await updateGlobalUserStats(debate, finalLeaderboard);

    // Save final results to debate
    await dbHelpers.updateDoc(collections.DEBATES, debateId, {
      finalAnalysis,
      finalLeaderboard,
      completedAt: new Date().toISOString(),
      duration: calculateDebateDuration(debate)
    });

    // Broadcast completion results
    io.to(debateId).emit('debate_completed', {
      debateId,
      finalAnalysis,
      finalLeaderboard,
      winner: determineWinner(finalLeaderboard),
      summary: generateDebateSummary(finalAnalysis),
      timestamp: new Date().toISOString()
    });

    logger.info(`Successfully completed debate ${debateId}`);

  } catch (error) {
    logger.error('Error completing debate:', error);
    io.to(debateId).emit('error', { message: 'Failed to complete debate analysis' });
  }
}

function determineWinner(evaluations) {
  if (evaluations.length < 2) return null;
  
  return evaluations.reduce((winner, current) => 
    current.performance.overallRating > winner.performance.overallRating ? current : winner
  );
}

function generateDebateSummary(evaluations) {
  return {
    totalArguments: evaluations.reduce((sum, e) => sum + e.performance.totalMessages, 0),
    averageQuality: evaluations.reduce((sum, e) => sum + e.performance.averageArgumentStrength, 0) / evaluations.length,
    keyHighlights: evaluations.flatMap(e => e.performance.keyStrengths).slice(0, 5)
  };
}

// Automated speech timer function
async function startSpeechTimer(debateId, currentSpeaker, timePerSpeech, speechNumber, io) {
  logger.info(`Starting speech timer for ${currentSpeaker}, speech ${speechNumber}`);

  // Send timer start event
  io.to(debateId).emit('speech_timer_start', {
    speaker: currentSpeaker,
    timeRemaining: timePerSpeech,
    speechNumber
  });

  // Set timer for speech duration
  setTimeout(async () => {
    try {
      const debate = await dbHelpers.getDoc(collections.DEBATES, debateId);
      if (!debate || debate.currentPhase !== 'debate') return;

      const speakingOrder = debate.speakingOrder || ['proposition', 'opposition'];
      const totalSpeeches = speakingOrder.length * 2;

      // Notify time's up
      io.to(debateId).emit('speech_time_up', {
        speaker: currentSpeaker,
        speechNumber
      });

      // Move to next speaker or end debate
      if (speechNumber >= totalSpeeches) {
        // All speeches completed, move to evaluation
        logger.info(`All speeches completed for debate ${debateId}, moving to evaluation`);

        await dbHelpers.updateDoc(collections.DEBATES, debateId, {
          currentPhase: 'evaluation',
          phaseChangedAt: new Date().toISOString()
        });

        io.to(debateId).emit('phase_changed', {
          phase: 'evaluation',
          timestamp: new Date().toISOString(),
          automatic: true
        });

        await handleEvaluationPhase(debateId, io);
      } else {
        // Move to next speaker
        const nextSpeakerIndex = speechNumber % speakingOrder.length;
        const nextSpeaker = speakingOrder[nextSpeakerIndex];
        const nextSpeechNumber = speechNumber + 1;

        await dbHelpers.updateDoc(collections.DEBATES, debateId, {
          currentSpeaker: nextSpeaker,
          speechStartTime: new Date().toISOString(),
          speechNumber: nextSpeechNumber
        });

        io.to(debateId).emit('speaker_changed', {
          currentSpeaker: nextSpeaker,
          speechNumber: nextSpeechNumber,
          totalSpeeches,
          automatic: true
        });

        // Start timer for next speech
        setTimeout(() => {
          startSpeechTimer(debateId, nextSpeaker, timePerSpeech, nextSpeechNumber, io);
        }, 5000); // 5 second break between speakers
      }
    } catch (error) {
      logger.error('Error in speech timer:', error);
    }
  }, timePerSpeech);
}

// Helper function to update user statistics
async function updateUserStats(userId, updates) {
  try {
    const userStatsRef = `users/${userId}/stats`;
    const currentStats = await dbHelpers.getDoc('users', `${userId}/stats`) || {
      totalDebates: 0,
      totalMessages: 0,
      averageArgumentStrength: 0,
      lastActivity: new Date().toISOString()
    };

    const updatedStats = {
      ...currentStats,
      totalMessages: (currentStats.totalMessages || 0) + (updates.totalMessages || 0),
      lastActivity: updates.lastActivity || currentStats.lastActivity
    };

    await dbHelpers.updateDoc('users', `${userId}/stats`, updatedStats);
    logger.info(`Updated stats for user ${userId}`);
  } catch (error) {
    logger.error('Error updating user stats:', error);
  }
}

// Helper functions for debate completion
async function generateFinalAnalysis(debate, messages) {
  try {
    const humanMessages = messages.filter(msg => msg.speakerType === 'human');
    const participants = debate.participants || [];

    const participantAnalysis = {};

    for (const participant of participants) {
      const userMessages = humanMessages.filter(msg =>
        msg.speakerId === participant.id || msg.userId === participant.id
      );

      if (userMessages.length > 0) {
        // Generate comprehensive analysis using AI
        const analysis = await debateAnalyzer.generateComprehensiveAnalysis(
          userMessages,
          { motion: debate.motion, role: participant.role },
          messages
        );

        participantAnalysis[participant.id] = {
          ...analysis,
          messageCount: userMessages.length,
          participantInfo: participant,
          averageScore: analysis.overallScore || 0,
          strengths: analysis.strengths || [],
          improvements: analysis.improvements || [],
          keyArguments: analysis.keyArguments || []
        };
      }
    }

    return {
      participantAnalysis,
      debateQuality: calculateDebateQuality(participantAnalysis),
      totalMessages: humanMessages.length,
      duration: calculateDebateDuration(debate),
      motion: debate.motion,
      completedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Error generating final analysis:', error);
    return { error: 'Failed to generate final analysis' };
  }
}

async function generateFinalLeaderboard(debate, messages, finalAnalysis) {
  try {
    const leaderboard = debate.leaderboard || {};
    const participantAnalysis = finalAnalysis.participantAnalysis || {};

    // Enhance leaderboard with final analysis data
    const finalLeaderboard = {};

    for (const [participantId, stats] of Object.entries(leaderboard)) {
      const analysis = participantAnalysis[participantId];
      const participant = debate.participants?.find(p => p.id === participantId);

      finalLeaderboard[participantId] = {
        ...stats,
        finalScore: analysis?.overallScore || stats.averageScore,
        rank: 0, // Will be calculated after sorting
        participant: participant,
        strengths: analysis?.strengths || [],
        improvements: analysis?.improvements || [],
        keyArguments: analysis?.keyArguments || [],
        badges: generateParticipantBadges(stats, analysis),
        performanceGrade: calculatePerformanceGrade(stats.averageScore),
        improvement: calculateImprovement(stats.recentScores)
      };
    }

    // Calculate final rankings
    const sortedParticipants = Object.entries(finalLeaderboard)
      .sort(([,a], [,b]) => b.finalScore - a.finalScore);

    sortedParticipants.forEach(([participantId, stats], index) => {
      finalLeaderboard[participantId].rank = index + 1;
    });

    return finalLeaderboard;

  } catch (error) {
    logger.error('Error generating final leaderboard:', error);
    return {};
  }
}

async function updateGlobalUserStats(debate, finalLeaderboard) {
  try {
    for (const [participantId, stats] of Object.entries(finalLeaderboard)) {
      if (stats.participant?.type === 'human') {
        await updateUserStats(participantId, {
          totalDebates: 1,
          totalMessages: stats.totalMessages,
          lastActivity: new Date().toISOString(),
          averageScore: stats.finalScore,
          bestScore: stats.bestScore,
          debatesWon: stats.rank === 1 ? 1 : 0,
          debatesCompleted: 1
        });
      }
    }
  } catch (error) {
    logger.error('Error updating global user stats:', error);
  }
}

function calculateDebateQuality(participantAnalysis) {
  const scores = Object.values(participantAnalysis).map(p => p.averageScore || 0);
  return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
}

function calculateDebateDuration(debate) {
  const start = new Date(debate.createdAt);
  const end = new Date();
  return Math.round((end - start) / 1000 / 60); // Duration in minutes
}

function generateParticipantBadges(stats, analysis) {
  const badges = [];

  if (stats.averageScore > 0.8) badges.push('🌟 Excellent Debater');
  if (stats.totalMessages >= 10) badges.push('💬 Active Participant');
  if (stats.bestScore === 1.0) badges.push('🎯 Perfect Score');
  if (analysis?.rhetoricalDevices?.length > 5) badges.push('🎭 Rhetorical Master');
  if (stats.rank === 1) badges.push('🏆 Debate Winner');

  return badges;
}

function calculatePerformanceGrade(averageScore) {
  if (averageScore >= 0.9) return 'A+';
  if (averageScore >= 0.8) return 'A';
  if (averageScore >= 0.7) return 'B+';
  if (averageScore >= 0.6) return 'B';
  if (averageScore >= 0.5) return 'C+';
  if (averageScore >= 0.4) return 'C';
  return 'D';
}

function calculateImprovement(recentScores) {
  if (!recentScores || recentScores.length < 2) return 0;
  const first = recentScores[0];
  const last = recentScores[recentScores.length - 1];
  return last - first;
}

function determineWinner(leaderboard) {
  const participants = Object.entries(leaderboard);
  if (participants.length === 0) return null;

  const winner = participants.reduce((best, [id, stats]) =>
    stats.finalScore > best.stats.finalScore ? { id, stats } : best,
    { id: participants[0][0], stats: participants[0][1] }
  );

  return {
    participantId: winner.id,
    participant: winner.stats.participant,
    finalScore: winner.stats.finalScore,
    rank: 1
  };
}

function generateDebateSummary(finalAnalysis) {
  const participantCount = Object.keys(finalAnalysis.participantAnalysis || {}).length;
  const avgQuality = finalAnalysis.debateQuality || 0;

  return {
    participantCount,
    totalMessages: finalAnalysis.totalMessages || 0,
    duration: finalAnalysis.duration || 0,
    averageQuality: avgQuality,
    qualityRating: avgQuality > 0.8 ? 'Excellent' : avgQuality > 0.6 ? 'Good' : avgQuality > 0.4 ? 'Fair' : 'Needs Improvement',
    motion: finalAnalysis.motion
  };
}

// Helper function to update debate leaderboard
async function updateDebateLeaderboard(debateId, userId, analysis, io) {
  try {
    // Get current debate leaderboard data
    const debate = await dbHelpers.getDoc(collections.DEBATES, debateId);
    const leaderboard = debate.leaderboard || {};

    // Update user's stats in the leaderboard
    const userStats = leaderboard[userId] || {
      totalMessages: 0,
      totalScore: 0,
      averageScore: 0,
      bestScore: 0,
      recentScores: [],
      argumentStrength: 0,
      rhetoricalDevices: []
    };

    const newScore = analysis.overallScore || 0;
    const newRecentScores = [...userStats.recentScores, newScore].slice(-5);
    const newTotalMessages = userStats.totalMessages + 1;
    const newTotalScore = userStats.totalScore + newScore;
    const newAverageScore = newTotalScore / newTotalMessages;

    leaderboard[userId] = {
      ...userStats,
      totalMessages: newTotalMessages,
      totalScore: newTotalScore,
      averageScore: newAverageScore,
      bestScore: Math.max(userStats.bestScore, newScore),
      recentScores: newRecentScores,
      argumentStrength: analysis.argumentStrength?.score || userStats.argumentStrength,
      rhetoricalDevices: analysis.rhetoricalDevices || userStats.rhetoricalDevices,
      lastUpdated: new Date().toISOString()
    };

    // Update debate with new leaderboard
    await dbHelpers.updateDoc(collections.DEBATES, debateId, { leaderboard });

    // Broadcast leaderboard update to all participants
    io.to(debateId).emit('leaderboard_updated', {
      leaderboard,
      updatedUserId: userId,
      timestamp: new Date().toISOString()
    });

    logger.info(`Updated leaderboard for debate ${debateId}, user ${userId}`);
  } catch (error) {
    logger.error('Error updating debate leaderboard:', error);
  }
}

module.exports = { initializeSocketHandlers };
