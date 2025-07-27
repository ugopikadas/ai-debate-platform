const express = require('express');
const { dbHelpers, collections } = require('../firebase/config');
const AgentManager = require('../agents/AgentManager');
const DebateAnalyzer = require('../analysis/DebateAnalyzer');
const { authenticateUser } = require('../middleware/auth');
const { validateDebateCreation, validateDebateUpdate } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();
const agentManager = new AgentManager();
const debateAnalyzer = new DebateAnalyzer();

// Create a new debate
router.post('/', authenticateUser, validateDebateCreation, async (req, res) => {
  try {
    const {
      motion,
      description,
      format,
      timePerSpeech,
      maxParticipants,
      isPublic,
      hasAIParticipant,
      aiDifficulty
    } = req.body;

    const debate = {
      motion,
      description,
      format: format || 'oxford', // oxford, parliamentary, lincoln-douglas
      timePerSpeech: timePerSpeech || 180000, // 3 minutes default
      maxParticipants: maxParticipants || 2,
      isPublic: isPublic || false,
      hasAIParticipant: hasAIParticipant || false,
      aiDifficulty: aiDifficulty || 'intermediate',
      createdBy: req.user.uid,
      participants: [{
        id: req.user.uid,
        role: 'proposition',
        type: 'human',
        joinedAt: new Date().toISOString()
      }],
      status: 'waiting', // waiting, preparation, active, completed
      currentPhase: 'setup',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const debateId = await dbHelpers.createDoc(collections.DEBATES, debate);

    // Generate AI agent if requested
    if (hasAIParticipant) {
      try {
        const aiAgent = await agentManager.generateAgent(
          motion,
          'opposition',
          aiDifficulty
        );

        await dbHelpers.updateDoc(collections.DEBATES, debateId, {
          aiAgent,
          participants: [
            ...debate.participants,
            {
              id: aiAgent.id,
              role: 'opposition',
              type: 'ai',
              joinedAt: new Date().toISOString()
            }
          ]
        });

        debate.aiAgent = aiAgent;
      } catch (error) {
        logger.warn('Failed to generate AI agent during debate creation:', error);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: debateId,
        ...debate
      }
    });

    logger.info(`Debate created: ${debateId} by user: ${req.user.uid}`);
  } catch (error) {
    logger.error('Error creating debate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create debate'
    });
  }
});

// Get all debates (with filtering)
router.get('/', async (req, res) => {
  try {
    const {
      status,
      isPublic,
      createdBy,
      hasAIParticipant,
      limit = 20,
      offset = 0
    } = req.query;

    const filters = [];
    
    if (status) filters.push({ field: 'status', operator: '==', value: status });
    if (isPublic !== undefined) filters.push({ field: 'isPublic', operator: '==', value: isPublic === 'true' });
    if (createdBy) filters.push({ field: 'createdBy', operator: '==', value: createdBy });
    if (hasAIParticipant !== undefined) filters.push({ field: 'hasAIParticipant', operator: '==', value: hasAIParticipant === 'true' });

    const debates = await dbHelpers.queryDocs(collections.DEBATES, filters);
    
    // Sort by creation date and apply pagination
    const sortedDebates = debates
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      data: sortedDebates,
      pagination: {
        total: debates.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Error fetching debates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch debates'
    });
  }
});

// Get specific debate
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const debate = await dbHelpers.getDoc(collections.DEBATES, id);

    if (!debate) {
      return res.status(404).json({
        success: false,
        message: 'Debate not found'
      });
    }

    // Get debate messages
    const messages = await dbHelpers.queryDocs(collections.MESSAGES, [
      { field: 'debateId', operator: '==', value: id }
    ]);

    // Get debate analysis
    const analyses = await dbHelpers.queryDocs(collections.ANALYSIS, [
      { field: 'debateId', operator: '==', value: id }
    ]);

    res.json({
      success: true,
      data: {
        ...debate,
        messages: messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
        analyses: analyses.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      }
    });
  } catch (error) {
    logger.error('Error fetching debate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch debate'
    });
  }
});

// Join a debate
router.post('/:id/join', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // 'proposition' or 'opposition'

    const debate = await dbHelpers.getDoc(collections.DEBATES, id);

    if (!debate) {
      return res.status(404).json({
        success: false,
        message: 'Debate not found'
      });
    }

    if (debate.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        message: 'Cannot join debate that is not in waiting status'
      });
    }

    // Check if user is already a participant
    const existingParticipant = debate.participants.find(p => p.id === req.user.uid);
    if (existingParticipant) {
      return res.status(400).json({
        success: false,
        message: 'User is already a participant in this debate'
      });
    }

    // Check if role is available
    const roleOccupied = debate.participants.some(p => p.role === role);
    if (roleOccupied) {
      return res.status(400).json({
        success: false,
        message: `Role ${role} is already taken`
      });
    }

    // Add participant
    const updatedParticipants = [
      ...debate.participants,
      {
        id: req.user.uid,
        role,
        type: 'human',
        joinedAt: new Date().toISOString()
      }
    ];

    await dbHelpers.updateDoc(collections.DEBATES, id, {
      participants: updatedParticipants,
      status: updatedParticipants.length >= debate.maxParticipants ? 'preparation' : 'waiting'
    });

    res.json({
      success: true,
      message: 'Successfully joined debate',
      data: { role, debateId: id }
    });

    logger.info(`User ${req.user.uid} joined debate ${id} as ${role}`);
  } catch (error) {
    logger.error('Error joining debate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join debate'
    });
  }
});

// Update debate status/phase
router.patch('/:id', authenticateUser, validateDebateUpdate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const debate = await dbHelpers.getDoc(collections.DEBATES, id);

    if (!debate) {
      return res.status(404).json({
        success: false,
        message: 'Debate not found'
      });
    }

    // Check if user has permission to update (creator or participant)
    const isCreator = debate.createdBy === req.user.uid;
    const isParticipant = debate.participants.some(p => p.id === req.user.uid);

    if (!isCreator && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to update debate'
      });
    }

    await dbHelpers.updateDoc(collections.DEBATES, id, {
      ...updates,
      updatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Debate updated successfully'
    });

    logger.info(`Debate ${id} updated by user ${req.user.uid}`);
  } catch (error) {
    logger.error('Error updating debate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update debate'
    });
  }
});

// Get debate statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const debate = await dbHelpers.getDoc(collections.DEBATES, id);
    if (!debate) {
      return res.status(404).json({
        success: false,
        message: 'Debate not found'
      });
    }

    const messages = await dbHelpers.queryDocs(collections.MESSAGES, [
      { field: 'debateId', operator: '==', value: id }
    ]);

    const analyses = await dbHelpers.queryDocs(collections.ANALYSIS, [
      { field: 'debateId', operator: '==', value: id }
    ]);

    // Calculate statistics
    const stats = {
      totalMessages: messages.length,
      messagesByRole: {
        proposition: messages.filter(m => m.speakerRole === 'proposition').length,
        opposition: messages.filter(m => m.speakerRole === 'opposition').length
      },
      messagesByType: {
        human: messages.filter(m => m.speakerType === 'human').length,
        ai: messages.filter(m => m.speakerType === 'ai').length
      },
      averageMessageLength: messages.length > 0 ? 
        messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length : 0,
      totalAnalyses: analyses.length,
      debateDuration: debate.status === 'completed' && debate.completedAt ? 
        new Date(debate.completedAt) - new Date(debate.createdAt) : null
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching debate statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch debate statistics'
    });
  }
});

// Generate comprehensive debate report
router.get('/:id/report', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const debate = await dbHelpers.getDoc(collections.DEBATES, id);
    if (!debate) {
      return res.status(404).json({
        success: false,
        message: 'Debate not found'
      });
    }

    // Check if user has access to the report
    const isParticipant = debate.participants.some(p => p.id === req.user.uid);
    const isCreator = debate.createdBy === req.user.uid;

    if (!isParticipant && !isCreator && !debate.isPublic) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to debate report'
      });
    }

    // Generate comprehensive analysis for each participant
    const participantReports = await Promise.all(
      debate.participants
        .filter(p => p.type === 'human') // Only generate reports for human participants
        .map(participant => 
          debateAnalyzer.analyzeOverallPerformance(id, participant.id)
        )
    );

    const report = {
      debate: {
        id,
        motion: debate.motion,
        format: debate.format,
        duration: debate.completedAt ? 
          new Date(debate.completedAt) - new Date(debate.createdAt) : null,
        status: debate.status
      },
      participants: participantReports,
      summary: {
        winner: participantReports.length > 1 ? 
          participantReports.reduce((winner, current) => 
            current.performance.overallRating > winner.performance.overallRating ? current : winner
          ) : null,
        keyHighlights: participantReports.flatMap(p => p.performance.keyStrengths).slice(0, 5),
        totalArguments: participantReports.reduce((sum, p) => sum + p.performance.totalMessages, 0),
        averageQuality: participantReports.length > 0 ?
          participantReports.reduce((sum, p) => sum + p.performance.averageArgumentStrength, 0) / participantReports.length : 0
      },
      generatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: report
    });

    logger.info(`Debate report generated for ${id}`);
  } catch (error) {
    logger.error('Error generating debate report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate debate report'
    });
  }
});

// Delete debate (creator only)
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const debate = await dbHelpers.getDoc(collections.DEBATES, id);
    if (!debate) {
      return res.status(404).json({
        success: false,
        message: 'Debate not found'
      });
    }

    if (debate.createdBy !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: 'Only the debate creator can delete the debate'
      });
    }

    // Delete related data
    const messages = await dbHelpers.queryDocs(collections.MESSAGES, [
      { field: 'debateId', operator: '==', value: id }
    ]);

    const analyses = await dbHelpers.queryDocs(collections.ANALYSIS, [
      { field: 'debateId', operator: '==', value: id }
    ]);

    // Delete all related documents
    await Promise.all([
      ...messages.map(msg => dbHelpers.deleteDoc(collections.MESSAGES, msg.id)),
      ...analyses.map(analysis => dbHelpers.deleteDoc(collections.ANALYSIS, analysis.id)),
      dbHelpers.deleteDoc(collections.DEBATES, id)
    ]);

    res.json({
      success: true,
      message: 'Debate deleted successfully'
    });

    logger.info(`Debate ${id} deleted by user ${req.user.uid}`);
  } catch (error) {
    logger.error('Error deleting debate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete debate'
    });
  }
});

module.exports = router;
