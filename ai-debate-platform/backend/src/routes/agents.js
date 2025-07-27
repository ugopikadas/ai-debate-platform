const express = require('express');
const { dbHelpers, collections } = require('../firebase/config');
const AgentManager = require('../agents/AgentManager');
const { authenticateUser } = require('../middleware/auth');
const { validateAgentGeneration } = require('../middleware/validation');
const { aiGenerationRateLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

const router = express.Router();
const agentManager = new AgentManager();

// Generate a new AI agent
router.post('/generate', authenticateUser, aiGenerationRateLimiter, validateAgentGeneration, async (req, res) => {
  try {
    const { motion, role, difficulty, personality } = req.body;

    const agent = await agentManager.generateAgent(motion, role, difficulty);

    res.status(201).json({
      success: true,
      data: {
        id: agent.id,
        motion: agent.motion,
        role: agent.role,
        personality: agent.personality,
        expertise: agent.expertise,
        difficulty: agent.difficulty,
        createdAt: agent.createdAt
      }
    });

    logger.info(`AI agent generated: ${agent.id} for motion: ${motion}`);
  } catch (error) {
    logger.error('Error generating AI agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI agent'
    });
  }
});

// Get agent details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await dbHelpers.getDoc(collections.AGENTS, id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Return public agent information (excluding system prompt)
    const publicAgent = {
      id: agent.id,
      motion: agent.motion,
      role: agent.role,
      personality: agent.personality,
      expertise: agent.expertise,
      difficulty: agent.difficulty,
      strategies: agent.strategies,
      createdAt: agent.createdAt,
      active: agent.active,
      totalDebates: agent.totalDebates || 0
    };

    res.json({
      success: true,
      data: publicAgent
    });
  } catch (error) {
    logger.error('Error fetching agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent'
    });
  }
});

// Get all agents (with filtering)
router.get('/', async (req, res) => {
  try {
    const { 
      active, 
      difficulty, 
      personality, 
      role,
      limit = 20, 
      offset = 0 
    } = req.query;

    const filters = [];
    
    if (active !== undefined) filters.push({ field: 'active', operator: '==', value: active === 'true' });
    if (difficulty) filters.push({ field: 'difficulty', operator: '==', value: difficulty });
    if (personality) filters.push({ field: 'personality', operator: '==', value: personality });
    if (role) filters.push({ field: 'role', operator: '==', value: role });

    const agents = await dbHelpers.queryDocs(collections.AGENTS, filters);
    
    // Sort by creation date and apply pagination
    const sortedAgents = agents
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(offset, offset + parseInt(limit))
      .map(agent => ({
        id: agent.id,
        motion: agent.motion,
        role: agent.role,
        personality: agent.personality,
        expertise: agent.expertise,
        difficulty: agent.difficulty,
        createdAt: agent.createdAt,
        active: agent.active,
        totalDebates: agent.totalDebates || 0
      }));

    res.json({
      success: true,
      data: sortedAgents,
      pagination: {
        total: agents.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agents'
    });
  }
});

// Update agent status
router.patch('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const agent = await dbHelpers.getDoc(collections.AGENTS, id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    await dbHelpers.updateDoc(collections.AGENTS, id, {
      active: active !== undefined ? active : agent.active,
      updatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Agent updated successfully'
    });

    logger.info(`Agent ${id} updated by user ${req.user.uid}`);
  } catch (error) {
    logger.error('Error updating agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update agent'
    });
  }
});

// Get agent performance statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const agent = await dbHelpers.getDoc(collections.AGENTS, id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Get debates where this agent participated
    const debates = await dbHelpers.queryDocs(collections.DEBATES, [
      { field: 'aiAgent.id', operator: '==', value: id }
    ]);

    // Get agent's messages
    const messages = await dbHelpers.queryDocs(collections.MESSAGES, [
      { field: 'speakerId', operator: '==', value: id }
    ]);

    // Get agent's analyses
    const analyses = await dbHelpers.queryDocs(collections.ANALYSIS, [
      { field: 'speakerId', operator: '==', value: id }
    ]);

    const stats = {
      totalDebates: debates.length,
      completedDebates: debates.filter(d => d.status === 'completed').length,
      totalMessages: messages.length,
      averageMessageLength: messages.length > 0 ? 
        messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length : 0,
      averageArgumentStrength: analyses.length > 0 ? 
        analyses
          .filter(a => a.type === 'argument_strength')
          .reduce((sum, a) => sum + (a.overallScore || 0), 0) / 
        analyses.filter(a => a.type === 'argument_strength').length : 0,
      winRate: debates.length > 0 ? 
        debates.filter(d => d.winner?.id === id).length / debates.filter(d => d.status === 'completed').length : 0,
      lastActive: agent.lastActive || agent.createdAt
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching agent statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent statistics'
    });
  }
});

// Generate agent response (for testing purposes)
router.post('/:id/respond', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { context, previousMessages = [] } = req.body;

    const agent = await dbHelpers.getDoc(collections.AGENTS, id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    if (!agent.active) {
      return res.status(400).json({
        success: false,
        message: 'Agent is not active'
      });
    }

    const response = await agentManager.generateResponse(id, context, previousMessages);

    res.json({
      success: true,
      data: response
    });

    logger.info(`Agent ${id} generated response for test`);
  } catch (error) {
    logger.error('Error generating agent response:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate agent response'
    });
  }
});

// Delete agent
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const agent = await dbHelpers.getDoc(collections.AGENTS, id);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // Check if agent is being used in any active debates
    const activeDebates = await dbHelpers.queryDocs(collections.DEBATES, [
      { field: 'aiAgent.id', operator: '==', value: id },
      { field: 'status', operator: 'in', value: ['waiting', 'preparation', 'active'] }
    ]);

    if (activeDebates.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete agent that is participating in active debates'
      });
    }

    await dbHelpers.deleteDoc(collections.AGENTS, id);

    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });

    logger.info(`Agent ${id} deleted by user ${req.user.uid}`);
  } catch (error) {
    logger.error('Error deleting agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete agent'
    });
  }
});

module.exports = router;
