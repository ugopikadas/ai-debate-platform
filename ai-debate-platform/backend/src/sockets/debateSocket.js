const AgentManager = require('../agents/AgentManager');
const DebateAnalyzer = require('../analysis/DebateAnalyzer');
const { dbHelpers, collections } = require('../firebase/config');
const logger = require('../utils/logger');

const agentManager = new AgentManager();
const debateAnalyzer = new DebateAnalyzer();

function initializeSocketHandlers(io) {
  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.id}`);

    // Join debate room
    socket.on('join_debate', async (data) => {
      try {
        const { debateId, userId, userRole } = data;
        
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

        // Send analysis to all participants
        io.to(debateId).emit('real_time_analysis', analysis);

        // If this is a human message and there's an AI opponent, generate AI response
        if (speakerType === 'human' && debate.hasAIParticipant) {
          await handleAIResponse(debateId, debate, debateHistory, io);
        }

        // Mark message as processed
        await dbHelpers.updateDoc(collections.MESSAGES, messageId, { processed: true });

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

        // Update debate with AI agent
        await dbHelpers.updateDoc(collections.DEBATES, debateId, {
          aiAgent: agent,
          hasAIParticipant: true
        });

        io.to(debateId).emit('ai_agent_generated', {
          agent: {
            id: agent.id,
            personality: agent.personality,
            expertise: agent.expertise,
            role: agent.role
          }
        });

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
        }

        logger.info(`Debate ${debateId} phase changed to ${phase}`);
      } catch (error) {
        logger.error('Error changing debate phase:', error);
        socket.emit('error', { message: 'Failed to change debate phase' });
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

    // Add a small delay to make AI response feel more natural
    setTimeout(async () => {
      try {
        // Generate AI response
        const aiResponse = await agentManager.generateResponse(
          debate.aiAgent.id,
          `Current debate context and recent messages`,
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
  // Send preparation tips and resources
  io.to(debateId).emit('preparation_resources', {
    tips: [
      'Research key arguments for your position',
      'Anticipate counterarguments',
      'Prepare evidence and examples',
      'Practice your opening statement'
    ],
    timeLimit: 600000 // 10 minutes
  });
}

async function handleDebatePhase(debateId, io) {
  // Start debate timer and send speaking order
  const debate = await dbHelpers.getDoc(collections.DEBATES, debateId);
  
  io.to(debateId).emit('debate_started', {
    speakingOrder: debate.speakingOrder || ['proposition', 'opposition'],
    timePerSpeech: debate.timePerSpeech || 180000, // 3 minutes
    currentSpeaker: 'proposition'
  });
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

module.exports = { initializeSocketHandlers };
