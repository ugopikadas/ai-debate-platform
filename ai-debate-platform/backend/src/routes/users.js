const express = require('express');
const router = express.Router();
const { authRateLimiter } = require('../middleware/rateLimiter');
const { dbHelpers, collections } = require('../firebase/config');
const logger = require('../utils/logger');

// Get user profile
router.get('/profile', authRateLimiter, async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await dbHelpers.getDoc(collections.USERS, userId);
    res.json({ success: true, user });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

module.exports = router;
