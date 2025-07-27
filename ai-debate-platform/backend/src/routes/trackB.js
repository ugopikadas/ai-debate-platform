const express = require('express');
const router = express.Router();
const DebateSessionManager = require('../agents/DebateSessionManager');
const AgentManager = require('../agents/AgentManager');
const AIAdjudicator = require('../agents/AIAdjudicator');
const logger = require('../utils/logger');

// Initialize managers
const sessionManager = new DebateSessionManager();
const agentManager = new AgentManager();
const aiAdjudicator = new AIAdjudicator();

/**
 * POST /api/trackb/session/create
 * Create a new Track B debate session
 */
router.post('/session/create', async (req, res) => {
  try {
    const { motion, format, participants, skillLevels } = req.body;
    
    // Validate required fields
    if (!motion || !format || !participants) {
      return res.status(400).json({
        error: 'Missing required fields: motion, format, participants'
      });
    }
    
    // Validate format
    if (!['BP', 'AP'].includes(format)) {
      return res.status(400).json({
        error: 'Format must be either BP (British Parliamentary) or AP (Asian Parliamentary)'
      });
    }
    
    const sessionConfig = {
      motion,
      format,
      participants,
      skillLevels: skillLevels || ['intermediate', 'intermediate', 'intermediate', 'intermediate']
    };
    
    const session = await sessionManager.createDebateSession(sessionConfig);
    
    res.status(201).json({
      success: true,
      session: {
        id: session.id,
        motion: session.motion,
        format: session.format,
        state: session.state,
        agents: Object.keys(session.agents).map(role => ({
          role,
          title: session.agents[role].roleConfig.title,
          skillLevel: session.agents[role].skillLevel,
          personality: session.agents[role].personality
        })),
        prepTimeMinutes: session.formatConfig.prepTime,
        speakingTimeMinutes: session.formatConfig.speakingTime
      }
    });
    
  } catch (error) {
    logger.error('Error creating Track B session:', error);
    res.status(500).json({
      error: 'Failed to create debate session',
      details: error.message
    });
  }
});

/**
 * POST /api/trackb/session/:sessionId/start-prep
 * Start the preparation phase
 */
router.post('/session/:sessionId/start-prep', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await sessionManager.startPreparationPhase(sessionId);
    
    res.json({
      success: true,
      ...result,
      message: 'Preparation phase started'
    });
    
  } catch (error) {
    logger.error('Error starting preparation phase:', error);
    res.status(500).json({
      error: 'Failed to start preparation phase',
      details: error.message
    });
  }
});

/**
 * POST /api/trackb/session/:sessionId/start-debate
 * Start the active debate phase
 */
router.post('/session/:sessionId/start-debate', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await sessionManager.startDebatePhase(sessionId);
    
    res.json({
      success: true,
      ...result,
      message: 'Debate phase started'
    });
    
  } catch (error) {
    logger.error('Error starting debate phase:', error);
    res.status(500).json({
      error: 'Failed to start debate phase',
      details: error.message
    });
  }
});

/**
 * POST /api/trackb/session/:sessionId/speech
 * Process a speech during the debate
 */
router.post('/session/:sessionId/speech', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { speaker, content, transcript, audioData } = req.body;
    
    if (!speaker || !content) {
      return res.status(400).json({
        error: 'Missing required fields: speaker, content'
      });
    }
    
    const speechData = {
      speaker,
      content,
      transcript: transcript || content,
      audioData: audioData || null
    };
    
    const result = await sessionManager.processSpeech(sessionId, speechData);
    
    res.json({
      success: true,
      speech: result.speech,
      realTimeFeedback: result.realTimeFeedback,
      nextSpeaker: result.nextSpeaker,
      debateComplete: result.debateComplete,
      message: result.debateComplete ? 'Speech processed - debate complete' : 'Speech processed successfully'
    });
    
  } catch (error) {
    logger.error('Error processing speech:', error);
    res.status(500).json({
      error: 'Failed to process speech',
      details: error.message
    });
  }
});

/**
 * POST /api/trackb/session/:sessionId/complete
 * Complete the debate and trigger judging
 */
router.post('/session/:sessionId/complete', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await sessionManager.completeDebate(sessionId);
    
    res.json({
      success: true,
      ...result,
      message: 'Debate completed and judged successfully'
    });
    
  } catch (error) {
    logger.error('Error completing debate:', error);
    res.status(500).json({
      error: 'Failed to complete debate',
      details: error.message
    });
  }
});

/**
 * GET /api/trackb/session/:sessionId/status
 * Get current session status
 */
router.get('/session/:sessionId/status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const status = await sessionManager.getSessionStatus(sessionId);
    
    res.json({
      success: true,
      status
    });
    
  } catch (error) {
    logger.error('Error getting session status:', error);
    res.status(500).json({
      error: 'Failed to get session status',
      details: error.message
    });
  }
});

/**
 * GET /api/trackb/session/:sessionId/judgment
 * Get the final judgment and feedback report
 */
router.get('/session/:sessionId/judgment', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { dbHelpers, collections } = require('../firebase/config');
    
    const session = await dbHelpers.getDoc(collections.DEBATE_SESSIONS, sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }
    
    if (!session.judgment) {
      return res.status(400).json({
        error: 'Debate not yet completed or judged'
      });
    }
    
    res.json({
      success: true,
      judgment: session.judgment,
      evaluationScores: session.judgment.evaluationScores,
      feedbackReport: session.judgment.feedbackReport
    });
    
  } catch (error) {
    logger.error('Error getting judgment:', error);
    res.status(500).json({
      error: 'Failed to get judgment',
      details: error.message
    });
  }
});

/**
 * POST /api/trackb/session/:sessionId/pause
 * Pause a debate session
 */
router.post('/session/:sessionId/pause', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await sessionManager.pauseSession(sessionId);
    
    res.json({
      success: true,
      ...result,
      message: 'Session paused successfully'
    });
    
  } catch (error) {
    logger.error('Error pausing session:', error);
    res.status(500).json({
      error: 'Failed to pause session',
      details: error.message
    });
  }
});

/**
 * POST /api/trackb/session/:sessionId/resume
 * Resume a paused debate session
 */
router.post('/session/:sessionId/resume', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await sessionManager.resumeSession(sessionId);
    
    res.json({
      success: true,
      ...result,
      message: 'Session resumed successfully'
    });
    
  } catch (error) {
    logger.error('Error resuming session:', error);
    res.status(500).json({
      error: 'Failed to resume session',
      details: error.message
    });
  }
});

/**
 * GET /api/trackb/formats
 * Get available debate formats and their configurations
 */
router.get('/formats', async (req, res) => {
  try {
    const formats = agentManager.debateFormats;
    
    res.json({
      success: true,
      formats: Object.keys(formats).map(key => ({
        code: key,
        name: formats[key].name,
        roles: Object.keys(formats[key].roles).map(roleKey => ({
          key: roleKey,
          title: formats[key].roles[roleKey].title,
          position: formats[key].roles[roleKey].position,
          order: formats[key].roles[roleKey].order
        })),
        speakingTime: formats[key].speakingTime,
        prepTime: formats[key].prepTime
      }))
    });
    
  } catch (error) {
    logger.error('Error getting formats:', error);
    res.status(500).json({
      error: 'Failed to get debate formats',
      details: error.message
    });
  }
});

/**
 * GET /api/trackb/skill-levels
 * Get available skill levels and their descriptions
 */
router.get('/skill-levels', async (req, res) => {
  try {
    const skillLevels = agentManager.skillLevels;
    
    res.json({
      success: true,
      skillLevels: Object.keys(skillLevels).map(key => ({
        level: key,
        ...skillLevels[key]
      }))
    });
    
  } catch (error) {
    logger.error('Error getting skill levels:', error);
    res.status(500).json({
      error: 'Failed to get skill levels',
      details: error.message
    });
  }
});

/**
 * GET /api/trackb/evaluation-criteria
 * Get Track B evaluation criteria and weights
 */
router.get('/evaluation-criteria', async (req, res) => {
  try {
    const criteria = aiAdjudicator.evaluationCriteria;
    
    res.json({
      success: true,
      evaluationCriteria: Object.keys(criteria).map(key => ({
        criterion: key,
        weight: criteria[key].weight,
        description: criteria[key].description,
        percentage: Math.round(criteria[key].weight * 100)
      }))
    });
    
  } catch (error) {
    logger.error('Error getting evaluation criteria:', error);
    res.status(500).json({
      error: 'Failed to get evaluation criteria',
      details: error.message
    });
  }
});

/**
 * POST /api/trackb/agent/generate
 * Generate a single AI agent for testing
 */
router.post('/agent/generate', async (req, res) => {
  try {
    const { motion, format, role, skillLevel } = req.body;
    
    if (!motion || !format || !role) {
      return res.status(400).json({
        error: 'Missing required fields: motion, format, role'
      });
    }
    
    const agent = await agentManager.generateAgent(
      motion, 
      format, 
      role, 
      skillLevel || 'intermediate'
    );
    
    res.json({
      success: true,
      agent: {
        id: agent.id,
        motion: agent.motion,
        format: agent.format,
        role: agent.role,
        skillLevel: agent.skillLevel,
        personality: agent.personality,
        expertise: agent.expertise,
        casePreparation: agent.casePreparation,
        strategies: agent.strategies
      }
    });
    
  } catch (error) {
    logger.error('Error generating agent:', error);
    res.status(500).json({
      error: 'Failed to generate agent',
      details: error.message
    });
  }
});

module.exports = router;
