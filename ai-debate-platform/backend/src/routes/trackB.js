const express = require('express');
const router = express.Router();
const { debateCreationRateLimiter } = require('../middleware/rateLimiter');

let logger;
try {
  logger = require('../utils/logger');
} catch (error) {
  logger = { info: console.log, error: console.error, warn: console.warn };
}

router.post('/create-session', debateCreationRateLimiter, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Track B session created successfully'
    });
  } catch (error) {
    logger.error('Error creating Track B session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Track B session'
    });
  }
});

module.exports = router;
