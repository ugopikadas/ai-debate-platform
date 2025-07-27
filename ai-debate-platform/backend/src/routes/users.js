const express = require('express');
const { dbHelpers, collections } = require('../firebase/config');
const { authenticateUser } = require('../middleware/auth');
const { validateUserUpdate, validatePagination } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// Get current user profile
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    let user = await dbHelpers.getDoc(collections.USERS, req.user.uid);
    
    // Create user profile if it doesn't exist
    if (!user) {
      user = {
        uid: req.user.uid,
        email: req.user.email,
        displayName: req.user.name || req.user.email.split('@')[0],
        photoURL: req.user.picture,
        emailVerified: req.user.emailVerified,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        debateStats: {
          totalDebates: 0,
          wins: 0,
          averageScore: 0,
          favoriteFormat: null
        },
        preferences: {
          notifications: true,
          publicProfile: false,
          preferredDebateFormat: 'oxford',
          aiDifficulty: 'intermediate'
        }
      };
      
      await dbHelpers.createDoc(collections.USERS, user);
    } else {
      // Update last login
      await dbHelpers.updateDoc(collections.USERS, req.user.uid, {
        lastLoginAt: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

// Update user profile
router.patch('/profile', authenticateUser, validateUserUpdate, async (req, res) => {
  try {
    const updates = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    await dbHelpers.updateDoc(collections.USERS, req.user.uid, updates);

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });

    logger.info(`User profile updated: ${req.user.uid}`);
  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Get user's debate history
router.get('/debates', authenticateUser, validatePagination, async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;
    
    const filters = [
      { field: 'participants', operator: 'array-contains', value: { id: req.user.uid } }
    ];
    
    if (status) {
      filters.push({ field: 'status', operator: '==', value: status });
    }

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
    logger.error('Error fetching user debates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch debate history'
    });
  }
});

// Get user statistics
router.get('/stats', authenticateUser, async (req, res) => {
  try {
    // Get all user's debates
    const debates = await dbHelpers.queryDocs(collections.DEBATES, [
      { field: 'participants', operator: 'array-contains', value: { id: req.user.uid } }
    ]);

    // Get all user's messages
    const messages = await dbHelpers.queryDocs(collections.MESSAGES, [
      { field: 'speakerId', operator: '==', value: req.user.uid }
    ]);

    // Get all user's analyses
    const analyses = await dbHelpers.queryDocs(collections.ANALYSIS, [
      { field: 'speakerId', operator: '==', value: req.user.uid }
    ]);

    // Calculate statistics
    const stats = {
      totalDebates: debates.length,
      completedDebates: debates.filter(d => d.status === 'completed').length,
      totalMessages: messages.length,
      averageMessageLength: messages.length > 0 ? 
        messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length : 0,
      debatesByFormat: debates.reduce((acc, debate) => {
        acc[debate.format] = (acc[debate.format] || 0) + 1;
        return acc;
      }, {}),
      debatesByRole: debates.reduce((acc, debate) => {
        const userParticipant = debate.participants.find(p => p.id === req.user.uid);
        if (userParticipant) {
          acc[userParticipant.role] = (acc[userParticipant.role] || 0) + 1;
        }
        return acc;
      }, {}),
      averageArgumentStrength: analyses.length > 0 ? 
        analyses
          .filter(a => a.type === 'argument_strength')
          .reduce((sum, a) => sum + (a.overallScore || 0), 0) / 
        analyses.filter(a => a.type === 'argument_strength').length : 0,
      recentActivity: debates
        .filter(d => Date.now() - new Date(d.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000) // Last 30 days
        .length
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching user statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
});

// Get public user profiles (for leaderboards, etc.)
router.get('/public', validatePagination, async (req, res) => {
  try {
    const { limit = 20, offset = 0, sortBy = 'totalDebates' } = req.query;

    // Get users with public profiles
    const users = await dbHelpers.queryDocs(collections.USERS, [
      { field: 'preferences.publicProfile', operator: '==', value: true }
    ]);

    // Sort users based on sortBy parameter
    const sortedUsers = users.sort((a, b) => {
      switch (sortBy) {
        case 'totalDebates':
          return (b.debateStats?.totalDebates || 0) - (a.debateStats?.totalDebates || 0);
        case 'averageScore':
          return (b.debateStats?.averageScore || 0) - (a.debateStats?.averageScore || 0);
        case 'wins':
          return (b.debateStats?.wins || 0) - (a.debateStats?.wins || 0);
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    // Apply pagination and remove sensitive data
    const publicUsers = sortedUsers
      .slice(offset, offset + parseInt(limit))
      .map(user => ({
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        debateStats: user.debateStats,
        createdAt: user.createdAt
      }));

    res.json({
      success: true,
      data: publicUsers,
      pagination: {
        total: users.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Error fetching public users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch public users'
    });
  }
});

// Get specific user's public profile
router.get('/:userId/public', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await dbHelpers.getDoc(collections.USERS, userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.preferences?.publicProfile) {
      return res.status(403).json({
        success: false,
        message: 'User profile is private'
      });
    }

    // Return only public information
    const publicProfile = {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      debateStats: user.debateStats,
      createdAt: user.createdAt,
      bio: user.bio
    };

    res.json({
      success: true,
      data: publicProfile
    });
  } catch (error) {
    logger.error('Error fetching public user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

// Update user debate statistics (called after debate completion)
router.patch('/stats', authenticateUser, async (req, res) => {
  try {
    const { debateResult } = req.body;
    
    const user = await dbHelpers.getDoc(collections.USERS, req.user.uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentStats = user.debateStats || {
      totalDebates: 0,
      wins: 0,
      averageScore: 0,
      favoriteFormat: null
    };

    const updatedStats = {
      totalDebates: currentStats.totalDebates + 1,
      wins: currentStats.wins + (debateResult.won ? 1 : 0),
      averageScore: ((currentStats.averageScore * currentStats.totalDebates) + debateResult.score) / 
                   (currentStats.totalDebates + 1),
      favoriteFormat: debateResult.format
    };

    await dbHelpers.updateDoc(collections.USERS, req.user.uid, {
      debateStats: updatedStats,
      updatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Statistics updated successfully',
      data: updatedStats
    });

    logger.info(`User statistics updated: ${req.user.uid}`);
  } catch (error) {
    logger.error('Error updating user statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update statistics'
    });
  }
});

// Delete user account
router.delete('/account', authenticateUser, async (req, res) => {
  try {
    const { confirmDelete } = req.body;
    
    if (!confirmDelete) {
      return res.status(400).json({
        success: false,
        message: 'Account deletion must be confirmed'
      });
    }

    // Get user's debates to check if any are active
    const userDebates = await dbHelpers.queryDocs(collections.DEBATES, [
      { field: 'participants', operator: 'array-contains', value: { id: req.user.uid } }
    ]);

    const activeDebates = userDebates.filter(d => d.status === 'active' || d.status === 'preparation');
    
    if (activeDebates.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete account while participating in active debates'
      });
    }

    // Delete user data
    await Promise.all([
      // Delete user profile
      dbHelpers.deleteDoc(collections.USERS, req.user.uid),
      
      // Delete user messages
      ...userDebates.flatMap(async (debate) => {
        const messages = await dbHelpers.queryDocs(collections.MESSAGES, [
          { field: 'debateId', operator: '==', value: debate.id },
          { field: 'speakerId', operator: '==', value: req.user.uid }
        ]);
        return messages.map(msg => dbHelpers.deleteDoc(collections.MESSAGES, msg.id));
      }),
      
      // Delete user analyses
      ...userDebates.flatMap(async (debate) => {
        const analyses = await dbHelpers.queryDocs(collections.ANALYSIS, [
          { field: 'debateId', operator: '==', value: debate.id },
          { field: 'speakerId', operator: '==', value: req.user.uid }
        ]);
        return analyses.map(analysis => dbHelpers.deleteDoc(collections.ANALYSIS, analysis.id));
      })
    ]);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

    logger.info(`User account deleted: ${req.user.uid}`);
  } catch (error) {
    logger.error('Error deleting user account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
});

module.exports = router;
