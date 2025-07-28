const express = require('express');
const router = express.Router();
const { dbHelpers, collections } = require('../firebase/config');

let logger;
try {
  logger = require('../utils/logger');
} catch (error) {
  logger = { info: console.log, error: console.error, warn: console.warn };
}

router.get('/profile', async (req, res) => {
  try {
    const userId = req.user?.uid || 'anonymous';

    const user = await dbHelpers.getDoc(collections.USERS, userId);
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

// Get user statistics
router.get('/stats', async (req, res) => {
  try {
    // For now, return mock stats since we don't have real data yet
    const stats = {
      totalDebates: 0,
      wonDebates: 0,
      averageScore: 0,
      totalSpeechTime: 0,
      favoriteTopics: [],
      recentActivity: []
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// Get user's debates
router.get('/debates', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // For now, return empty array since we don't have real data yet
    const debates = [];

    res.json({
      success: true,
      data: debates,
      pagination: {
        total: 0,
        limit: limit,
        offset: 0
      }
    });
  } catch (error) {
    logger.error('Error fetching user debates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch debates' });
  }
});

module.exports = router;
