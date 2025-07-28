const express = require('express');
const router = express.Router();
const { authRateLimiter } = require('../middleware/rateLimiter');
const { dbHelpers, collections } = require('../firebase/config');

let logger;
try {
  logger = require('../utils/logger');
} catch (error) {
  logger = { info: console.log, error: console.error, warn: console.warn };
}

router.get('/profile', authRateLimiter, async (req, res) => {
  try {
    const userId = req.user?.uid || 'anonymous';

    const user = await dbHelpers.getDoc(collections.USERS, userId);
    res.json({ success: true, user });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

module.exports = router;
