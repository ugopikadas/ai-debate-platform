const express = require('express');
const router = express.Router();
const { dbHelpers, collections } = require('../firebase/config');

let logger;
try {
  logger = require('../utils/logger');
} catch (error) {
  logger = { info: console.log, error: console.error, warn: console.warn };
}

router.get('/', async (req, res) => {
  try {
    logger.info('Attempting to fetch debates from collection:', collections.DEBATES);
    const debates = await dbHelpers.queryDocs(collections.DEBATES);
    logger.info('Successfully fetched debates:', debates.length);

    // Return response in the format expected by frontend
    res.json({
      success: true,
      data: debates,
      pagination: {
        total: debates.length,
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0
      }
    });
  } catch (error) {
    logger.error('Error fetching debates:', error);
    logger.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });

    // Handle case where collection doesn't exist yet (Firestore returns NOT_FOUND)
    if (error.code === 5 || error.message.includes('NOT_FOUND')) {
      logger.info('Debates collection does not exist yet, returning empty array');
      return res.json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          limit: parseInt(req.query.limit) || 20,
          offset: parseInt(req.query.offset) || 0
        }
      });
    }

    res.status(500).json({ success: false, message: 'Failed to fetch debates', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { motion, type, participants } = req.body;

    logger.info('Attempting to create debate with data:', { motion, type, participants });

    const debate = {
      motion,
      type: type || 'oxford',
      participants: [], // Always start with empty participants
      status: 'preparing',
      currentPhase: 'preparation',
      createdBy: req.user?.uid || 'anonymous',
      hasAIParticipant: false,
      createdAt: new Date().toISOString()
    };

    logger.info('Creating debate document in Firestore...');
    const debateId = await dbHelpers.createDoc(collections.DEBATES, debate);
    logger.info('Successfully created debate with ID:', debateId);

    res.status(201).json({
      success: true,
      data: { ...debate, id: debateId }
    });
  } catch (error) {
    logger.error('Error creating debate:', error);
    logger.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    // Provide more specific error messages
    let errorMessage = 'Failed to create debate';
    if (error.code === 5) {
      errorMessage = 'Database not found. Please ensure Firestore database is created in Firebase Console.';
    } else if (error.code === 7) {
      errorMessage = 'Permission denied. Please check Firestore security rules.';
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      code: error.code
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const debate = await dbHelpers.getDoc(collections.DEBATES, req.params.id);
    if (!debate) {
      return res.status(404).json({ success: false, message: 'Debate not found' });
    }
    res.json({ success: true, data: debate });
  } catch (error) {
    logger.error('Error fetching debate:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch debate' });
  }
});

// Join debate route
router.post('/:id/join', async (req, res) => {
  try {
    const { role, userId } = req.body; // Accept userId from frontend
    const debateId = req.params.id;
    const participantId = userId || req.user?.uid || `user_${Date.now()}`;

    logger.info(`User ${participantId} attempting to join debate ${debateId} as ${role}`);

    // Get current debate
    const debate = await dbHelpers.getDoc(collections.DEBATES, debateId);
    if (!debate) {
      return res.status(404).json({ success: false, message: 'Debate not found' });
    }

    // Check if user is already a participant
    const existingParticipant = debate.participants?.find(p => p.id === participantId);
    if (existingParticipant) {
      logger.info(`User ${participantId} already joined, returning existing data`);
      return res.json({
        success: true,
        data: debate,
        message: 'Already a participant'
      });
    }

    // Check if role is already taken
    const roleExists = debate.participants?.find(p => p.role === role);
    if (roleExists) {
      return res.status(400).json({ success: false, message: `Role ${role} is already taken` });
    }

    // Add participant
    const participants = debate.participants || [];
    participants.push({
      id: participantId,
      role: role,
      name: 'Human', // Default name
      joinedAt: new Date().toISOString()
    });

    // Update debate status if we have enough participants
    let updateData = { participants };
    if (participants.length >= 2) {
      updateData.status = 'active';
      updateData.currentPhase = 'debate';
    }

    await dbHelpers.updateDoc(collections.DEBATES, debateId, updateData);

    logger.info(`User ${participantId} successfully joined debate ${debateId} as ${role}`);

    res.json({
      success: true,
      data: { ...debate, ...updateData }
    });
  } catch (error) {
    logger.error('Error joining debate:', error);
    res.status(500).json({ success: false, message: 'Failed to join debate' });
  }
});

// Delete debate route
router.delete('/:id', async (req, res) => {
  try {
    const debateId = req.params.id;
    const userId = req.user?.uid || 'anonymous';

    logger.info(`User ${userId} attempting to delete debate ${debateId}`);

    // Get current debate to check ownership
    const debate = await dbHelpers.getDoc(collections.DEBATES, debateId);
    if (!debate) {
      return res.status(404).json({ success: false, message: 'Debate not found' });
    }

    // Check if user is the creator (for now, allow anyone to delete for testing)
    // if (debate.createdBy !== userId) {
    //   return res.status(403).json({ success: false, message: 'Only the creator can delete this debate' });
    // }

    // Delete related messages first
    try {
      const messages = await dbHelpers.queryDocs(collections.MESSAGES, [
        { field: 'debateId', operator: '==', value: debateId }
      ]);

      for (const message of messages) {
        await dbHelpers.deleteDoc(collections.MESSAGES, message.id);
      }
      logger.info(`Deleted ${messages.length} messages for debate ${debateId}`);
    } catch (error) {
      logger.warn('Error deleting messages:', error);
    }

    // Delete the debate
    await dbHelpers.deleteDoc(collections.DEBATES, debateId);

    logger.info(`Successfully deleted debate ${debateId}`);

    res.json({
      success: true,
      message: 'Debate deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting debate:', error);
    res.status(500).json({ success: false, message: 'Failed to delete debate' });
  }
});

module.exports = router;
