const express = require('express');
const router = express.Router();
const { debateCreationRateLimiter } = require('../middleware/rateLimiter');
const { dbHelpers, collections } = require('../firebase/config');

let logger;
try {
  logger = require('../utils/logger');
} catch (error) {
  logger = { info: console.log, error: console.error, warn: console.warn };
}

router.get('/', async (req, res) => {
  try {
    const debates = await dbHelpers.queryDocs(collections.DEBATES);
    res.json({ success: true, debates });
  } catch (error) {
    logger.error('Error fetching debates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch debates' });
  }
});

router.post('/', debateCreationRateLimiter, async (req, res) => {
  try {
    const { motion, type, participants } = req.body;

    const debate = {
      motion,
      type,
      participants: participants || [],
      status: 'preparing',
      currentPhase: 'preparation',
      createdBy: req.user?.uid || 'anonymous',
      hasAIParticipant: false
    };

    const debateId = await dbHelpers.createDoc(collections.DEBATES, debate);

    res.status(201).json({
      success: true,
      debate: { ...debate, id: debateId }
    });
  } catch (error) {
    logger.error('Error creating debate:', error);
    res.status(500).json({ success: false, message: 'Failed to create debate' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const debate = await dbHelpers.getDoc(collections.DEBATES, req.params.id);
    if (!debate) {
      return res.status(404).json({ success: false, message: 'Debate not found' });
    }
    res.json({ success: true, debate });
  } catch (error) {
    logger.error('Error fetching debate:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch debate' });
  }
});

module.exports = router;
