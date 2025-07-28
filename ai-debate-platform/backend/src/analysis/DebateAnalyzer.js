const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

let logger;
try {
  logger = require('../utils/logger');
} catch (error) {
  logger = { info: console.log, error: console.error, warn: console.warn };
}

class DebateAnalyzer {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  async generateRealTimeFeedback(message, debateContext, debateHistory) {
    try {
      logger.info(`Generating real-time feedback for message: ${message.content.substring(0, 50)}...`);

      // Try to use AI for analysis, fall back to simple analysis if it fails
      let analysis;
      try {
        analysis = await this.generateAIAnalysis(message, debateContext, debateHistory);
      } catch (aiError) {
        logger.warn('AI analysis failed, using fallback:', aiError.message);
        analysis = this.generateFallbackAnalysis(message, debateContext);
      }

      return {
        type: 'real_time_feedback',
        messageId: message.id,
        ...analysis,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error generating real-time feedback:', error);
      return {
        type: 'error_feedback',
        messageId: message.id,
        error: 'Failed to generate feedback',
        timestamp: new Date().toISOString()
      };
    }
  }

  async generateAIAnalysis(message, debateContext, debateHistory) {
    const recentContext = debateHistory.slice(-3).map(msg =>
      `${msg.speakerRole}: ${msg.content}`
    ).join('\n');

    const prompt = `You are an expert debate coach providing real-time feedback. Analyze the argument and provide constructive feedback.

Return JSON with:
- argumentStrength: {score: 0-1, factors: [string array]}
- rhetoricalDevices: [string array]
- suggestions: [string array of 2-3 specific tips]
- overallScore: 0-1
- feedback: {quickTips: [string array of 1-2 key tips]}

Be encouraging but constructive.

Motion: "${debateContext.motion}"
Speaker Role: ${debateContext.role}

Recent Context:
${recentContext}

Current Argument: "${message.content}"

Analyze this argument and provide feedback in JSON format.`;

    try {
      // Try Gemini first
      const model = this.gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text().trim();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in Gemini response');

    } catch (geminiError) {
      logger.warn(`Gemini analysis failed, trying OpenAI: ${geminiError.message}`);

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are an expert debate coach providing real-time feedback. Analyze the argument and provide constructive feedback.

            Return JSON with:
            - argumentStrength: {score: 0-1, factors: [string array]}
            - rhetoricalDevices: [string array]
            - suggestions: [string array of 2-3 specific tips]
            - overallScore: 0-1
            - feedback: {quickTips: [string array of 1-2 key tips]}

            Be encouraging but constructive.`
          },
          {
            role: "user",
            content: `Motion: "${debateContext.motion}"
            Speaker Role: ${debateContext.role}

            Recent Context:
            ${recentContext}

            Current Argument: "${message.content}"

            Analyze this argument and provide feedback.`
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content);
    }
  }

  generateFallbackAnalysis(message, debateContext) {
    const wordCount = message.content.split(' ').length;
    const score = Math.min(wordCount / 50, 1);

    const suggestions = [
      'Consider providing more evidence to support your argument',
      'Try to address potential counterarguments',
      'Use specific examples to strengthen your point'
    ];

    return {
      argumentStrength: {
        score: score,
        factors: ['clarity', 'evidence', 'logic']
      },
      rhetoricalDevices: ['logos'],
      suggestions: suggestions,
      overallScore: score,
      feedback: {
        quickTips: suggestions.slice(0, 2)
      }
    };
  }

  async generateComprehensiveAnalysis(userMessages, debateContext, allMessages) {
    try {
      logger.info(`Generating comprehensive analysis for ${userMessages.length} messages`);

      // Combine all user messages for analysis
      const combinedContent = userMessages.map(msg => msg.content).join('\n\n');
      const recentContext = allMessages.slice(-10).map(msg =>
        `${msg.speakerRole}: ${msg.content}`
      ).join('\n');

      const prompt = `You are an expert debate coach providing comprehensive final analysis. Analyze the participant's overall performance.

Return JSON with:
- overallScore: 0-1 (overall debate performance)
- argumentStrength: {score: 0-1, factors: [string array]}
- rhetoricalDevices: [string array of devices used]
- strengths: [string array of 3-5 key strengths]
- improvements: [string array of 3-5 areas for improvement]
- keyArguments: [string array of 3-5 most effective arguments]
- consistency: 0-1 (how consistent their position was)
- persuasiveness: 0-1 (how persuasive their arguments were)
- engagement: 0-1 (how well they engaged with opponent's points)

Motion: "${debateContext.motion}"
Speaker Role: ${debateContext.role}

Recent Debate Context:
${recentContext}

Participant's Complete Arguments:
${combinedContent}

Provide comprehensive analysis focusing on argument quality, rhetorical skill, and debate effectiveness.`;

      try {
        // Try Gemini first
        const model = this.gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text().trim();

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('No JSON found in Gemini response');

      } catch (geminiError) {
        logger.warn(`Gemini comprehensive analysis failed, trying OpenAI: ${geminiError.message}`);

        const response = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You are an expert debate coach providing comprehensive final analysis. Return JSON with detailed performance metrics.`
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.3
        });

        return JSON.parse(response.choices[0].message.content);
      }

    } catch (error) {
      logger.error('Error generating comprehensive analysis:', error);

      // Enhanced fallback analysis
      return {
        overallScore: 0.6,
        argumentStrength: { score: 0.6, factors: ['clarity', 'structure'] },
        rhetoricalDevices: ['logos'],
        strengths: ['Clear communication', 'Stayed on topic', 'Engaged with the debate'],
        improvements: ['Provide more evidence', 'Address counterarguments', 'Use more rhetorical devices'],
        keyArguments: ['Main position was clearly stated'],
        consistency: 0.7,
        persuasiveness: 0.5,
        engagement: 0.6
      };
    }
  }

  analyzeArgumentStrength(content) {
    const wordCount = content.split(' ').length;
    return {
      score: Math.min(wordCount / 50, 1),
      factors: ['clarity', 'evidence', 'logic']
    };
  }

  identifyRhetoricalDevices(content) {
    return ['ethos', 'pathos', 'logos'].filter(() => Math.random() > 0.5);
  }

  generateSuggestions(message, context) {
    return [
      'Consider providing more evidence',
      'Address potential counterarguments',
      'Use specific examples'
    ];
  }

  async analyzeOverallPerformance(debateId, participantId) {
    return {
      participantId,
      performance: {
        overallRating: 7.5,
        totalMessages: 10,
        averageArgumentStrength: 0.75,
        keyStrengths: ['logical reasoning', 'evidence use']
      }
    };
  }
}

module.exports = DebateAnalyzer;
