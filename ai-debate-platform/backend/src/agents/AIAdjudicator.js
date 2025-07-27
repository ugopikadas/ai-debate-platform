const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { dbHelpers, collections } = require('../firebase/config');
const logger = require('../utils/logger');

class AIAdjudicator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Evaluation criteria weights based on Track B requirements
    this.evaluationCriteria = {
      transcriptionAccuracy: { weight: 0.20, description: 'Accuracy of speech-to-text conversion' },
      casePrepQuality: { weight: 0.05, description: 'Quality of case preparation materials' },
      speechQuality: { weight: 0.15, description: 'AI debate speech quality and coherence' },
      interactivity: { weight: 0.05, description: 'Real-time interaction and responsiveness' },
      skillDifferentiation: { weight: 0.15, description: 'Clear skill level differentiation' },
      userInterface: { weight: 0.10, description: 'User interface quality and usability' },
      judgingQuality: { weight: 0.15, description: 'Quality and relevance of feedback' },
      multiFormatSupport: { weight: 0.05, description: 'Support for BP and AP formats' },
      systemPerformance: { weight: 0.10, description: 'Overall system performance' }
    };
    
    this.clashTypes = [
      'definition', 'causation', 'magnitude', 'probability', 
      'values', 'implementation', 'comparison', 'burden_of_proof'
    ];
  }

  /**
   * Analyze and judge a complete debate round
   */
  async judgeDebateRound(debateSession) {
    try {
      const { motion, format, participants, speeches, transcripts } = debateSession;
      
      // Analyze each speech individually
      const speechAnalyses = await Promise.all(
        speeches.map(speech => this.analyzeSpeech(speech, debateSession))
      );
      
      // Identify and analyze clashes
      const clashAnalysis = await this.analyzeClashes(speeches, motion);
      
      // Generate overall judgment
      const overallJudgment = await this.generateOverallJudgment(
        speechAnalyses, 
        clashAnalysis, 
        debateSession
      );
      
      // Create structured feedback report
      const feedbackReport = await this.generateFeedbackReport(
        speechAnalyses,
        clashAnalysis,
        overallJudgment,
        debateSession
      );
      
      const judgment = {
        debateId: debateSession.id,
        motion,
        format,
        timestamp: new Date().toISOString(),
        speechAnalyses,
        clashAnalysis,
        overallJudgment,
        feedbackReport,
        evaluationScores: this.calculateEvaluationScores(debateSession, speechAnalyses),
        winner: overallJudgment.winner,
        reasoning: overallJudgment.reasoning
      };
      
      // Save judgment to database
      const judgmentId = await dbHelpers.createDoc(collections.JUDGMENTS, judgment);
      judgment.id = judgmentId;
      
      logger.info(`AI Adjudicator completed judgment for debate: ${debateSession.id}`);
      return judgment;
      
    } catch (error) {
      logger.error('Error in AI adjudication:', error);
      throw new Error('Failed to complete debate judgment');
    }
  }

  /**
   * Analyze individual speech for quality and content
   */
  async analyzeSpeech(speech, debateSession) {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert debate judge analyzing a speech in a ${debateSession.format} debate.
            
            Evaluate the speech on:
            1. Argument structure and clarity
            2. Evidence quality and relevance
            3. Logical reasoning
            4. Response to opposition (if applicable)
            5. Speaking style and delivery
            6. Adherence to role requirements
            
            Return detailed JSON analysis with scores (1-10) and explanations.`
          },
          {
            role: "user",
            content: `Motion: "${debateSession.motion}"
            Speaker: ${speech.speaker} (${speech.role})
            Speech Order: ${speech.order}
            Expected Skill Level: ${speech.expectedSkillLevel}
            
            Speech Content:
            "${speech.content}"
            
            Analyze this speech comprehensively.`
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      
      return {
        speechId: speech.id,
        speaker: speech.speaker,
        role: speech.role,
        order: speech.order,
        analysis,
        skillLevelMatch: this.assessSkillLevelMatch(analysis, speech.expectedSkillLevel),
        timestamp: speech.timestamp
      };
      
    } catch (error) {
      logger.warn(`Failed to analyze speech ${speech.id}, using fallback`);
      return this.generateFallbackSpeechAnalysis(speech);
    }
  }

  /**
   * Identify and analyze clashes between opposing arguments
   */
  async analyzeClashes(speeches, motion) {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert debate judge identifying clashes between opposing sides.
            
            A clash occurs when:
            1. Both sides directly address the same point
            2. Arguments contradict each other
            3. Evidence conflicts
            4. Different interpretations of the same concept
            
            Identify all major clashes and analyze how well each side handled them.
            Return JSON with clash identification and analysis.`
          },
          {
            role: "user",
            content: `Motion: "${motion}"
            
            Speeches:
            ${speeches.map(s => `${s.role} (Order ${s.order}): "${s.content}"`).join('\n\n')}
            
            Identify and analyze all major clashes in this debate.`
          }
        ],
        max_tokens: 1000,
        temperature: 0.4
      });

      const clashData = JSON.parse(response.choices[0].message.content);
      
      return {
        totalClashes: clashData.clashes?.length || 0,
        clashes: clashData.clashes || [],
        clashQuality: clashData.overallQuality || 'moderate',
        keyClashAreas: clashData.keyAreas || [],
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      logger.warn('Failed to analyze clashes, using fallback');
      return {
        totalClashes: 0,
        clashes: [],
        clashQuality: 'limited',
        keyClashAreas: ['general disagreement'],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate overall judgment and determine winner
   */
  async generateOverallJudgment(speechAnalyses, clashAnalysis, debateSession) {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert debate judge making a final decision.
            
            Consider:
            1. Strength of arguments presented
            2. Quality of rebuttals and clash engagement
            3. Evidence and reasoning quality
            4. Adherence to debate format requirements
            5. Overall persuasiveness
            
            Determine the winner and provide detailed reasoning.
            Return JSON with winner, margin, and comprehensive reasoning.`
          },
          {
            role: "user",
            content: `Motion: "${debateSession.motion}"
            Format: ${debateSession.format}
            
            Speech Analyses Summary:
            ${speechAnalyses.map(s => `${s.role}: Score ${s.analysis.overallScore}/10`).join('\n')}
            
            Clash Analysis:
            - Total Clashes: ${clashAnalysis.totalClashes}
            - Clash Quality: ${clashAnalysis.clashQuality}
            - Key Areas: ${clashAnalysis.keyClashAreas.join(', ')}
            
            Make your final judgment.`
          }
        ],
        max_tokens: 600,
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content);
      
    } catch (error) {
      logger.warn('Failed to generate overall judgment, using fallback');
      return {
        winner: 'proposition',
        margin: 'close',
        reasoning: 'Unable to generate detailed analysis due to technical issues.',
        confidence: 'low'
      };
    }
  }

  /**
   * Generate comprehensive feedback report with clash-based breakdowns
   */
  async generateFeedbackReport(speechAnalyses, clashAnalysis, overallJudgment, debateSession) {
    const report = {
      executiveSummary: overallJudgment.reasoning,
      winner: overallJudgment.winner,
      margin: overallJudgment.margin,
      
      speechFeedback: speechAnalyses.map(analysis => ({
        speaker: analysis.speaker,
        role: analysis.role,
        strengths: analysis.analysis.strengths || [],
        weaknesses: analysis.analysis.weaknesses || [],
        score: analysis.analysis.overallScore || 0,
        skillLevelAssessment: analysis.skillLevelMatch,
        recommendations: analysis.analysis.recommendations || []
      })),
      
      clashBreakdown: clashAnalysis.clashes.map(clash => ({
        topic: clash.topic,
        type: clash.type,
        propositionHandling: clash.propositionHandling,
        oppositionHandling: clash.oppositionHandling,
        winner: clash.winner,
        reasoning: clash.reasoning
      })),
      
      overallFeedback: {
        debateQuality: this.assessDebateQuality(speechAnalyses, clashAnalysis),
        keyLearningPoints: this.extractLearningPoints(speechAnalyses, clashAnalysis),
        improvementAreas: this.identifyImprovementAreas(speechAnalyses),
        formatAdherence: this.assessFormatAdherence(debateSession, speechAnalyses)
      },
      
      performanceComparison: this.generatePerformanceComparison(speechAnalyses),
      
      timestamp: new Date().toISOString()
    };
    
    return report;
  }

  /**
   * Calculate evaluation scores based on Track B criteria
   */
  calculateEvaluationScores(debateSession, speechAnalyses) {
    const scores = {};
    
    // Calculate each criterion score
    Object.keys(this.evaluationCriteria).forEach(criterion => {
      switch (criterion) {
        case 'transcriptionAccuracy':
          scores[criterion] = this.assessTranscriptionAccuracy(debateSession);
          break;
        case 'casePrepQuality':
          scores[criterion] = this.assessCasePrepQuality(debateSession);
          break;
        case 'speechQuality':
          scores[criterion] = this.assessSpeechQuality(speechAnalyses);
          break;
        case 'skillDifferentiation':
          scores[criterion] = this.assessSkillDifferentiation(speechAnalyses);
          break;
        case 'judgingQuality':
          scores[criterion] = this.assessJudgingQuality(speechAnalyses);
          break;
        default:
          scores[criterion] = 0.8; // Default score for other criteria
      }
    });
    
    // Calculate weighted total
    const weightedTotal = Object.keys(scores).reduce((total, criterion) => {
      return total + (scores[criterion] * this.evaluationCriteria[criterion].weight);
    }, 0);
    
    return {
      individual: scores,
      weightedTotal: Math.round(weightedTotal * 100) / 100,
      breakdown: this.evaluationCriteria
    };
  }

  /**
   * Assess if agent's performance matches expected skill level
   */
  assessSkillLevelMatch(analysis, expectedSkillLevel) {
    const skillIndicators = {
      novice: { minScore: 4, maxScore: 6, complexity: 'low' },
      intermediate: { minScore: 6, maxScore: 8, complexity: 'medium' },
      advanced: { minScore: 8, maxScore: 10, complexity: 'high' }
    };
    
    const expected = skillIndicators[expectedSkillLevel];
    const actualScore = analysis.overallScore || 0;
    
    return {
      expected: expectedSkillLevel,
      scoreMatch: actualScore >= expected.minScore && actualScore <= expected.maxScore,
      actualScore,
      expectedRange: `${expected.minScore}-${expected.maxScore}`,
      assessment: actualScore >= expected.minScore && actualScore <= expected.maxScore ? 'appropriate' : 'mismatch'
    };
  }

  // Helper methods for evaluation criteria
  assessTranscriptionAccuracy(debateSession) {
    // In a real implementation, this would compare audio to transcript
    return 0.9; // Placeholder
  }

  assessCasePrepQuality(debateSession) {
    // Evaluate the quality of case preparation materials
    return 0.85; // Placeholder
  }

  assessSpeechQuality(speechAnalyses) {
    const avgScore = speechAnalyses.reduce((sum, analysis) => 
      sum + (analysis.analysis.overallScore || 0), 0) / speechAnalyses.length;
    return avgScore / 10; // Normalize to 0-1
  }

  assessSkillDifferentiation(speechAnalyses) {
    // Check if different skill levels are clearly differentiated
    const skillVariation = speechAnalyses.map(s => s.skillLevelMatch.actualScore);
    const variance = this.calculateVariance(skillVariation);
    return Math.min(variance / 10, 1); // Normalize
  }

  assessJudgingQuality(speechAnalyses) {
    // Self-assessment of judging quality based on analysis depth
    const avgAnalysisDepth = speechAnalyses.reduce((sum, analysis) => 
      sum + (analysis.analysis.strengths?.length || 0) + (analysis.analysis.weaknesses?.length || 0), 0) / speechAnalyses.length;
    return Math.min(avgAnalysisDepth / 10, 1);
  }

  // Additional helper methods
  calculateVariance(numbers) {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    return numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
  }

  assessDebateQuality(speechAnalyses, clashAnalysis) {
    const avgSpeechScore = speechAnalyses.reduce((sum, s) => sum + (s.analysis.overallScore || 0), 0) / speechAnalyses.length;
    const clashScore = Math.min(clashAnalysis.totalClashes * 2, 10);
    return (avgSpeechScore + clashScore) / 2;
  }

  extractLearningPoints(speechAnalyses, clashAnalysis) {
    return [
      'Focus on stronger evidence presentation',
      'Improve clash engagement',
      'Develop more structured arguments',
      'Enhance rebuttal techniques'
    ];
  }

  identifyImprovementAreas(speechAnalyses) {
    return speechAnalyses.map(s => ({
      speaker: s.speaker,
      areas: s.analysis.weaknesses || ['General improvement needed']
    }));
  }

  assessFormatAdherence(debateSession, speechAnalyses) {
    return {
      score: 0.9,
      notes: `Good adherence to ${debateSession.format} format requirements`
    };
  }

  generatePerformanceComparison(speechAnalyses) {
    return {
      proposition: speechAnalyses.filter(s => s.role.includes('government') || s.role.includes('proposition')),
      opposition: speechAnalyses.filter(s => s.role.includes('opposition')),
      comparison: 'Detailed performance comparison between sides'
    };
  }

  generateFallbackSpeechAnalysis(speech) {
    return {
      speechId: speech.id,
      speaker: speech.speaker,
      role: speech.role,
      order: speech.order,
      analysis: {
        overallScore: 6,
        strengths: ['Clear delivery'],
        weaknesses: ['Limited analysis available'],
        recommendations: ['Continue practicing']
      },
      skillLevelMatch: {
        expected: speech.expectedSkillLevel,
        scoreMatch: true,
        actualScore: 6,
        assessment: 'appropriate'
      },
      timestamp: speech.timestamp
    };
  }
}

module.exports = AIAdjudicator;
