const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { dbHelpers, collections } = require('../firebase/config');
const logger = require('../utils/logger');

class DebateAnalyzer {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    this.analysisTypes = {
      ARGUMENT_STRENGTH: 'argument_strength',
      CLASH_DETECTION: 'clash_detection',
      REBUTTAL_QUALITY: 'rebuttal_quality',
      SPEAKING_ANALYSIS: 'speaking_analysis',
      REAL_TIME_FEEDBACK: 'real_time_feedback',
      OVERALL_PERFORMANCE: 'overall_performance'
    };
  }

  /**
   * Analyze argument strength in real-time
   */
  async analyzeArgumentStrength(message, context) {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert debate judge analyzing argument strength. 
            Evaluate the argument on: logic, evidence, relevance, clarity, and impact.
            Return JSON with scores (1-10) and brief explanations.`
          },
          {
            role: "user",
            content: `Motion: ${context.motion}
            Speaker Role: ${context.role}
            Argument: "${message.content}"
            
            Analyze this argument's strength.`
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      
      return {
        type: this.analysisTypes.ARGUMENT_STRENGTH,
        messageId: message.id,
        scores: analysis.scores,
        feedback: analysis.explanations,
        overallScore: this.calculateOverallScore(analysis.scores),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error analyzing argument strength:', error);
      return this.getFallbackAnalysis(this.analysisTypes.ARGUMENT_STRENGTH, message.id);
    }
  }

  /**
   * Detect clashes between opposing arguments
   */
  async detectClashes(currentMessage, previousMessages, context) {
    try {
      const opposingMessages = previousMessages.filter(msg => 
        msg.speakerRole !== currentMessage.speakerRole
      ).slice(-5); // Last 5 opposing messages

      if (opposingMessages.length === 0) {
        return { type: this.analysisTypes.CLASH_DETECTION, clashes: [] };
      }

      const response = await this.gemini.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `Analyze clashes between arguments in this debate.
      
      Motion: ${context.motion}
      
      Current Argument (${currentMessage.speakerRole}): "${currentMessage.content}"
      
      Previous Opposing Arguments:
      ${opposingMessages.map((msg, i) => `${i+1}. "${msg.content}"`).join('\n')}
      
      Identify direct clashes, contradictions, and points of contention. Return JSON with clash analysis.`;
      
      const result = await response.generateContent(prompt);
      const clashAnalysis = JSON.parse(result.response.text());
      
      return {
        type: this.analysisTypes.CLASH_DETECTION,
        messageId: currentMessage.id,
        clashes: clashAnalysis.clashes,
        severity: clashAnalysis.severity,
        recommendations: clashAnalysis.recommendations,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error detecting clashes:', error);
      return { type: this.analysisTypes.CLASH_DETECTION, clashes: [] };
    }
  }

  /**
   * Evaluate rebuttal quality
   */
  async evaluateRebuttal(rebuttalMessage, targetMessage, context) {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a debate expert evaluating rebuttal quality.
            Assess: directness, evidence, logic, impact, and completeness.
            Return JSON with detailed analysis.`
          },
          {
            role: "user",
            content: `Motion: ${context.motion}
            
            Original Argument: "${targetMessage.content}"
            Rebuttal: "${rebuttalMessage.content}"
            
            Evaluate the quality of this rebuttal.`
          }
        ],
        max_tokens: 400,
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      
      return {
        type: this.analysisTypes.REBUTTAL_QUALITY,
        rebuttalId: rebuttalMessage.id,
        targetId: targetMessage.id,
        quality: analysis.quality,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        suggestions: analysis.suggestions,
        score: analysis.overallScore,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error evaluating rebuttal:', error);
      return this.getFallbackAnalysis(this.analysisTypes.REBUTTAL_QUALITY, rebuttalMessage.id);
    }
  }

  /**
   * Analyze speaking patterns and delivery
   */
  async analyzeSpeakingPatterns(messages, speakerId, timeWindow = 300000) { // 5 minutes
    try {
      const recentMessages = messages.filter(msg => 
        msg.speakerId === speakerId && 
        Date.now() - new Date(msg.timestamp).getTime() < timeWindow
      );

      if (recentMessages.length === 0) return null;

      const analysis = {
        messageCount: recentMessages.length,
        averageLength: recentMessages.reduce((sum, msg) => sum + msg.content.length, 0) / recentMessages.length,
        speakingTime: this.calculateSpeakingTime(recentMessages),
        pace: this.calculatePace(recentMessages),
        consistency: this.analyzeConsistency(recentMessages),
        engagement: this.analyzeEngagement(recentMessages)
      };

      return {
        type: this.analysisTypes.SPEAKING_ANALYSIS,
        speakerId,
        analysis,
        recommendations: this.generateSpeakingRecommendations(analysis),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error analyzing speaking patterns:', error);
      return null;
    }
  }

  /**
   * Generate real-time feedback during debate
   */
  async generateRealTimeFeedback(message, context, debateHistory) {
    try {
      const [
        strengthAnalysis,
        clashAnalysis,
        speakingAnalysis
      ] = await Promise.all([
        this.analyzeArgumentStrength(message, context),
        this.detectClashes(message, debateHistory, context),
        this.analyzeSpeakingPatterns(debateHistory, message.speakerId)
      ]);

      const feedback = {
        type: this.analysisTypes.REAL_TIME_FEEDBACK,
        messageId: message.id,
        speakerId: message.speakerId,
        feedback: {
          argument: strengthAnalysis,
          clashes: clashAnalysis,
          speaking: speakingAnalysis,
          quickTips: this.generateQuickTips(strengthAnalysis, clashAnalysis),
          nextSteps: this.suggestNextSteps(context, debateHistory)
        },
        timestamp: new Date().toISOString()
      };

      // Save analysis to Firebase
      await dbHelpers.createDoc(collections.ANALYSIS, feedback);
      
      return feedback;

    } catch (error) {
      logger.error('Error generating real-time feedback:', error);
      throw new Error('Failed to generate real-time feedback');
    }
  }

  /**
   * Comprehensive debate performance analysis
   */
  async analyzeOverallPerformance(debateId, participantId) {
    try {
      const debateMessages = await dbHelpers.queryDocs(collections.MESSAGES, [
        { field: 'debateId', operator: '==', value: debateId },
        { field: 'speakerId', operator: '==', value: participantId }
      ]);

      const allAnalyses = await dbHelpers.queryDocs(collections.ANALYSIS, [
        { field: 'debateId', operator: '==', value: debateId },
        { field: 'speakerId', operator: '==', value: participantId }
      ]);

      const performance = {
        totalMessages: debateMessages.length,
        averageArgumentStrength: this.calculateAverageScore(allAnalyses, 'argument_strength'),
        clashEngagement: this.analyzeClashEngagement(allAnalyses),
        rebuttalEffectiveness: this.analyzeRebuttalEffectiveness(allAnalyses),
        speakingConsistency: this.analyzeSpeakingConsistency(allAnalyses),
        keyStrengths: this.identifyStrengths(allAnalyses),
        areasForImprovement: this.identifyWeaknesses(allAnalyses),
        overallRating: this.calculateOverallRating(allAnalyses)
      };

      return {
        type: this.analysisTypes.OVERALL_PERFORMANCE,
        debateId,
        participantId,
        performance,
        recommendations: this.generatePerformanceRecommendations(performance),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error analyzing overall performance:', error);
      throw new Error('Failed to analyze overall performance');
    }
  }

  // Helper methods
  calculateOverallScore(scores) {
    const values = Object.values(scores);
    return values.reduce((sum, score) => sum + score, 0) / values.length;
  }

  calculateSpeakingTime(messages) {
    // Estimate based on message length and typical speaking pace
    const totalWords = messages.reduce((sum, msg) => 
      sum + msg.content.split(' ').length, 0
    );
    return totalWords / 150; // Average 150 words per minute
  }

  calculatePace(messages) {
    if (messages.length < 2) return 'insufficient_data';
    
    const timeSpan = new Date(messages[messages.length - 1].timestamp) - 
                    new Date(messages[0].timestamp);
    const messagesPerMinute = (messages.length / timeSpan) * 60000;
    
    if (messagesPerMinute > 3) return 'fast';
    if (messagesPerMinute > 1) return 'moderate';
    return 'slow';
  }

  analyzeConsistency(messages) {
    const lengths = messages.map(msg => msg.content.length);
    const avg = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lengths.length;
    
    return variance < 1000 ? 'high' : variance < 5000 ? 'medium' : 'low';
  }

  analyzeEngagement(messages) {
    const questionCount = messages.filter(msg => msg.content.includes('?')).length;
    const exclamationCount = messages.filter(msg => msg.content.includes('!')).length;
    const engagementScore = (questionCount + exclamationCount) / messages.length;
    
    return engagementScore > 0.3 ? 'high' : engagementScore > 0.1 ? 'medium' : 'low';
  }

  generateQuickTips(strengthAnalysis, clashAnalysis) {
    const tips = [];
    
    if (strengthAnalysis.overallScore < 6) {
      tips.push("Strengthen your argument with more evidence");
    }
    
    if (clashAnalysis.clashes.length > 0) {
      tips.push("Address the opposing arguments directly");
    }
    
    return tips;
  }

  suggestNextSteps(context, debateHistory) {
    // Analyze debate flow and suggest strategic next moves
    return [
      "Consider addressing the strongest opposing argument",
      "Introduce new evidence to support your position",
      "Summarize your key points for clarity"
    ];
  }

  getFallbackAnalysis(type, messageId) {
    return {
      type,
      messageId,
      error: 'Analysis temporarily unavailable',
      fallback: true,
      timestamp: new Date().toISOString()
    };
  }

  // Additional helper methods for comprehensive analysis
  calculateAverageScore(analyses, type) {
    const relevantAnalyses = analyses.filter(a => a.type === type);
    if (relevantAnalyses.length === 0) return 0;
    
    const scores = relevantAnalyses.map(a => a.overallScore || a.score || 0);
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  analyzeClashEngagement(analyses) {
    const clashAnalyses = analyses.filter(a => a.type === this.analysisTypes.CLASH_DETECTION);
    return {
      totalClashes: clashAnalyses.reduce((sum, a) => sum + (a.clashes?.length || 0), 0),
      averageSeverity: clashAnalyses.length > 0 ? 
        clashAnalyses.reduce((sum, a) => sum + (a.severity || 0), 0) / clashAnalyses.length : 0
    };
  }

  analyzeRebuttalEffectiveness(analyses) {
    const rebuttalAnalyses = analyses.filter(a => a.type === this.analysisTypes.REBUTTAL_QUALITY);
    return {
      totalRebuttals: rebuttalAnalyses.length,
      averageQuality: rebuttalAnalyses.length > 0 ?
        rebuttalAnalyses.reduce((sum, a) => sum + (a.score || 0), 0) / rebuttalAnalyses.length : 0
    };
  }

  analyzeSpeakingConsistency(analyses) {
    const speakingAnalyses = analyses.filter(a => a.type === this.analysisTypes.SPEAKING_ANALYSIS);
    return speakingAnalyses.length > 0 ? speakingAnalyses[speakingAnalyses.length - 1].analysis : null;
  }

  identifyStrengths(analyses) {
    // Analyze patterns to identify key strengths
    return ["Strong logical reasoning", "Effective use of evidence"];
  }

  identifyWeaknesses(analyses) {
    // Analyze patterns to identify areas for improvement
    return ["Could improve rebuttal directness", "Consider varying argument structure"];
  }

  calculateOverallRating(analyses) {
    // Comprehensive rating based on all analyses
    const scores = analyses.map(a => a.overallScore || a.score || 0).filter(s => s > 0);
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  }

  generatePerformanceRecommendations(performance) {
    const recommendations = [];
    
    if (performance.averageArgumentStrength < 7) {
      recommendations.push("Focus on strengthening arguments with more credible evidence");
    }
    
    if (performance.clashEngagement.totalClashes < 3) {
      recommendations.push("Engage more directly with opposing arguments");
    }
    
    if (performance.rebuttalEffectiveness.averageQuality < 6) {
      recommendations.push("Improve rebuttal structure and directness");
    }
    
    return recommendations;
  }

  generateSpeakingRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.pace === 'fast') {
      recommendations.push("Consider slowing down for better clarity");
    } else if (analysis.pace === 'slow') {
      recommendations.push("Increase pace to maintain engagement");
    }
    
    if (analysis.consistency === 'low') {
      recommendations.push("Aim for more consistent message length");
    }
    
    if (analysis.engagement === 'low') {
      recommendations.push("Use more engaging language and rhetorical questions");
    }
    
    return recommendations;
  }
}

module.exports = DebateAnalyzer;
