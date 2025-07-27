const AgentManager = require('./AgentManager');
const AIAdjudicator = require('./AIAdjudicator');
const { dbHelpers, collections } = require('../firebase/config');
const logger = require('../utils/logger');

class DebateSessionManager {
  constructor() {
    this.agentManager = new AgentManager();
    this.aiAdjudicator = new AIAdjudicator();
    
    this.sessionStates = {
      PREPARATION: 'preparation',
      ACTIVE: 'active',
      JUDGING: 'judging',
      COMPLETED: 'completed',
      PAUSED: 'paused'
    };
  }

  /**
   * Create a new debate session with Track B specifications
   */
  async createDebateSession(sessionConfig) {
    try {
      const { motion, format, participants, skillLevels } = sessionConfig;
      
      // Validate format
      if (!this.agentManager.debateFormats[format]) {
        throw new Error(`Unsupported debate format: ${format}`);
      }
      
      const formatConfig = this.agentManager.debateFormats[format];
      const roles = Object.keys(formatConfig.roles);
      
      // Generate AI agents for each role
      const agents = {};
      for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        const skillLevel = skillLevels[i] || 'intermediate';
        
        agents[role] = await this.agentManager.generateAgent(
          motion, 
          format, 
          role, 
          skillLevel
        );
      }
      
      // Create session
      const session = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        motion,
        format,
        formatConfig,
        participants,
        agents,
        state: this.sessionStates.PREPARATION,
        currentSpeaker: null,
        speechOrder: this.generateSpeechOrder(formatConfig),
        speeches: [],
        transcripts: [],
        realTimeFeedback: [],
        noteTracking: this.initializeSessionNoteTracking(),
        prepTimeRemaining: formatConfig.prepTime * 60, // Convert to seconds
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      
      // Save session to database
      const sessionId = await dbHelpers.createDoc(collections.DEBATE_SESSIONS, session);
      session.id = sessionId;
      
      logger.info(`Created debate session: ${sessionId} for motion: ${motion}`);
      return session;
      
    } catch (error) {
      logger.error('Error creating debate session:', error);
      throw new Error('Failed to create debate session');
    }
  }

  /**
   * Start the preparation phase
   */
  async startPreparationPhase(sessionId) {
    try {
      const session = await dbHelpers.getDoc(collections.DEBATE_SESSIONS, sessionId);
      if (!session) throw new Error('Session not found');
      
      // Update session state
      await dbHelpers.updateDoc(collections.DEBATE_SESSIONS, sessionId, {
        state: this.sessionStates.PREPARATION,
        prepStartTime: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      });
      
      // Notify all agents to begin case preparation
      const prepResults = {};
      for (const [role, agent] of Object.entries(session.agents)) {
        prepResults[role] = {
          casePreparation: agent.casePreparation,
          noteTracker: agent.noteTracker,
          strategies: agent.strategies
        };
      }
      
      logger.info(`Started preparation phase for session: ${sessionId}`);
      return {
        sessionId,
        state: this.sessionStates.PREPARATION,
        prepTimeMinutes: session.formatConfig.prepTime,
        prepResults
      };
      
    } catch (error) {
      logger.error('Error starting preparation phase:', error);
      throw new Error('Failed to start preparation phase');
    }
  }

  /**
   * Start the active debate phase
   */
  async startDebatePhase(sessionId) {
    try {
      const session = await dbHelpers.getDoc(collections.DEBATE_SESSIONS, sessionId);
      if (!session) throw new Error('Session not found');
      
      const firstSpeaker = session.speechOrder[0];
      
      await dbHelpers.updateDoc(collections.DEBATE_SESSIONS, sessionId, {
        state: this.sessionStates.ACTIVE,
        currentSpeaker: firstSpeaker,
        debateStartTime: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      });
      
      logger.info(`Started debate phase for session: ${sessionId}`);
      return {
        sessionId,
        state: this.sessionStates.ACTIVE,
        currentSpeaker: firstSpeaker,
        speakingTimeMinutes: session.formatConfig.speakingTime
      };
      
    } catch (error) {
      logger.error('Error starting debate phase:', error);
      throw new Error('Failed to start debate phase');
    }
  }

  /**
   * Process a speech during the debate
   */
  async processSpeech(sessionId, speechData) {
    try {
      const session = await dbHelpers.getDoc(collections.DEBATE_SESSIONS, sessionId);
      if (!session) throw new Error('Session not found');
      
      const { speaker, content, transcript, audioData } = speechData;
      
      // Create speech record
      const speech = {
        id: `speech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        speaker,
        role: this.findSpeakerRole(session, speaker),
        order: session.speeches.length + 1,
        content,
        transcript,
        audioData,
        timestamp: new Date().toISOString(),
        expectedSkillLevel: session.agents[this.findSpeakerRole(session, speaker)]?.skillLevel || 'intermediate'
      };
      
      // Generate real-time feedback
      const realTimeFeedback = await this.generateRealTimeFeedback(speech, session);
      
      // Update session with new speech
      const updatedSpeeches = [...session.speeches, speech];
      const updatedFeedback = [...session.realTimeFeedback, realTimeFeedback];
      
      // Determine next speaker
      const nextSpeaker = this.getNextSpeaker(session, speech.order);
      
      await dbHelpers.updateDoc(collections.DEBATE_SESSIONS, sessionId, {
        speeches: updatedSpeeches,
        realTimeFeedback: updatedFeedback,
        currentSpeaker: nextSpeaker,
        lastActivity: new Date().toISOString()
      });
      
      // Update agent note tracking
      await this.updateAgentNotes(session, speech, realTimeFeedback);
      
      logger.info(`Processed speech ${speech.id} in session ${sessionId}`);
      return {
        speech,
        realTimeFeedback,
        nextSpeaker,
        debateComplete: nextSpeaker === null
      };
      
    } catch (error) {
      logger.error('Error processing speech:', error);
      throw new Error('Failed to process speech');
    }
  }

  /**
   * Complete the debate and trigger judging
   */
  async completeDebate(sessionId) {
    try {
      const session = await dbHelpers.getDoc(collections.DEBATE_SESSIONS, sessionId);
      if (!session) throw new Error('Session not found');
      
      // Update session state to judging
      await dbHelpers.updateDoc(collections.DEBATE_SESSIONS, sessionId, {
        state: this.sessionStates.JUDGING,
        debateEndTime: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      });
      
      // Trigger AI adjudication
      const judgment = await this.aiAdjudicator.judgeDebateRound(session);
      
      // Update session with final results
      await dbHelpers.updateDoc(collections.DEBATE_SESSIONS, sessionId, {
        state: this.sessionStates.COMPLETED,
        judgment,
        completedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      });
      
      logger.info(`Completed debate session: ${sessionId}`);
      return {
        sessionId,
        state: this.sessionStates.COMPLETED,
        judgment,
        performanceReport: judgment.feedbackReport
      };
      
    } catch (error) {
      logger.error('Error completing debate:', error);
      throw new Error('Failed to complete debate');
    }
  }

  /**
   * Generate real-time feedback during speeches
   */
  async generateRealTimeFeedback(speech, session) {
    try {
      // Use existing DebateAnalyzer for real-time analysis
      const context = {
        motion: session.motion,
        role: speech.role,
        format: session.format,
        previousSpeeches: session.speeches
      };
      
      // This would integrate with the existing DebateAnalyzer
      const feedback = {
        speechId: speech.id,
        timestamp: new Date().toISOString(),
        argumentStrength: Math.random() * 10, // Placeholder - would use actual analysis
        clarity: Math.random() * 10,
        relevance: Math.random() * 10,
        suggestions: [
          'Strong opening argument',
          'Consider addressing opponent\'s previous point',
          'Good use of evidence'
        ]
      };
      
      return feedback;
      
    } catch (error) {
      logger.warn('Failed to generate real-time feedback');
      return {
        speechId: speech.id,
        timestamp: new Date().toISOString(),
        error: 'Feedback generation failed'
      };
    }
  }

  /**
   * Update agent note tracking based on speeches
   */
  async updateAgentNotes(session, speech, feedback) {
    try {
      const speakerRole = speech.role;
      const agent = session.agents[speakerRole];
      
      if (agent && agent.noteTracker) {
        // Update notes based on speech content and feedback
        const updatedNotes = {
          ...agent.noteTracker,
          flowNotes: {
            ...agent.noteTracker.flowNotes,
            ownArguments: speakerRole === speech.role ? 
              [...agent.noteTracker.flowNotes.ownArguments, speech.content] :
              agent.noteTracker.flowNotes.ownArguments,
            opponentArguments: speakerRole !== speech.role ?
              [...agent.noteTracker.flowNotes.opponentArguments, speech.content] :
              agent.noteTracker.flowNotes.opponentArguments
          },
          lastUpdated: new Date().toISOString()
        };
        
        // Update agent in database
        await dbHelpers.updateDoc(collections.AGENTS, agent.id, {
          noteTracker: updatedNotes
        });
      }
      
    } catch (error) {
      logger.warn('Failed to update agent notes:', error);
    }
  }

  // Helper methods
  generateSpeechOrder(formatConfig) {
    return Object.keys(formatConfig.roles).sort((a, b) => 
      formatConfig.roles[a].order - formatConfig.roles[b].order
    );
  }

  initializeSessionNoteTracking() {
    return {
      globalFlow: [],
      clashPoints: [],
      keyMoments: [],
      judgeNotes: []
    };
  }

  findSpeakerRole(session, speaker) {
    for (const [role, agent] of Object.entries(session.agents)) {
      if (agent.id === speaker || agent.role === speaker) {
        return role;
      }
    }
    return null;
  }

  getNextSpeaker(session, currentOrder) {
    const speechOrder = session.speechOrder;
    if (currentOrder >= speechOrder.length) {
      return null; // Debate complete
    }
    return speechOrder[currentOrder]; // Next speaker (0-indexed)
  }

  /**
   * Get session status and current state
   */
  async getSessionStatus(sessionId) {
    try {
      const session = await dbHelpers.getDoc(collections.DEBATE_SESSIONS, sessionId);
      if (!session) throw new Error('Session not found');
      
      return {
        id: session.id,
        motion: session.motion,
        format: session.format,
        state: session.state,
        currentSpeaker: session.currentSpeaker,
        speechesCompleted: session.speeches.length,
        totalSpeeches: session.speechOrder.length,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity
      };
      
    } catch (error) {
      logger.error('Error getting session status:', error);
      throw new Error('Failed to get session status');
    }
  }

  /**
   * Pause or resume a debate session
   */
  async pauseSession(sessionId) {
    try {
      await dbHelpers.updateDoc(collections.DEBATE_SESSIONS, sessionId, {
        state: this.sessionStates.PAUSED,
        pausedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      });
      
      return { sessionId, state: this.sessionStates.PAUSED };
      
    } catch (error) {
      logger.error('Error pausing session:', error);
      throw new Error('Failed to pause session');
    }
  }

  async resumeSession(sessionId) {
    try {
      const session = await dbHelpers.getDoc(collections.DEBATE_SESSIONS, sessionId);
      if (!session) throw new Error('Session not found');
      
      const newState = session.speeches.length === 0 ? 
        this.sessionStates.PREPARATION : 
        this.sessionStates.ACTIVE;
      
      await dbHelpers.updateDoc(collections.DEBATE_SESSIONS, sessionId, {
        state: newState,
        resumedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      });
      
      return { sessionId, state: newState };
      
    } catch (error) {
      logger.error('Error resuming session:', error);
      throw new Error('Failed to resume session');
    }
  }
}

module.exports = DebateSessionManager;
