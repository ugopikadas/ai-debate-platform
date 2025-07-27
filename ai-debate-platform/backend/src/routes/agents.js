const express = require('express');
const router = express.Router();
const { aiGenerationRateLimiter } = require('../middleware/rateLimiter');
const AgentManager = require('../agents/AgentManager');
const logger = require('../utils/logger');

const agentManager = new AgentManager();

// Generate AI agent
router.post('/generate', aiGenerationRateLimiter, async (req, res) => {
  try {
    const { motion, role, difficulty } = req.body;

    const agent = await agentManager.generateAgent(motion, role, difficulty);

    res.status(201).json({
      success: true,
      agent: {
        id: agent.id,
        personality: agent.personality,
        expertise: agent.expertise,
        role: agent.role
      }
    });
  } catch (error) {
    logger.error('Error generating AI agent:', error);
    res.status(500).json({ success: false, message: 'Failed to generate AI agent' });
  }
});

module.exports = router;
