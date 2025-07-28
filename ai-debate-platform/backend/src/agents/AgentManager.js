const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

let logger;
try {
  logger = require('../utils/logger');
} catch (error) {
  logger = { info: console.log, error: console.error, warn: console.warn };
}

class AgentManager {
  constructor() {
    this.agents = new Map();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  async generateAgent(motion, role, difficulty = 'medium') {
    try {
      const agentId = uuidv4();

      const agent = {
        id: agentId,
        motion,
        role,
        difficulty,
        personality: {
          traits: ['analytical', 'persuasive', 'well-informed'],
          style: 'formal',
          aggressiveness: difficulty === 'hard' ? 'high' : 'medium'
        },
        expertise: {
          domains: ['general knowledge', 'debate tactics'],
          level: 'expert'
        },
        createdAt: new Date().toISOString()
      };

      this.agents.set(agentId, agent);
      logger.info(`Generated AI agent ${agentId} for ${role} on motion: ${motion}`);
      return agent;
    } catch (error) {
      logger.error('Error generating AI agent:', error);
      throw error;
    }
  }

  // Method to ensure agent exists and is properly initialized
  getOrCreateAgent(agentId, agentData) {
    let agent = this.agents.get(agentId);
    if (!agent && agentData) {
      agent = {
        id: agentId,
        motion: agentData.motion,
        role: agentData.role,
        difficulty: agentData.difficulty || 'medium',
        personality: agentData.personality || {
          traits: ['analytical', 'persuasive', 'well-informed'],
          style: 'formal'
        },
        expertise: agentData.expertise || {
          domains: ['general knowledge', 'debate tactics'],
          level: 'expert'
        }
      };
      this.agents.set(agentId, agent);
      logger.info(`Reconstructed AI agent ${agentId} from data`);
    }
    return agent;
  }

  async generateResponse(agentId, context, debateHistory) {
    try {
      logger.info(`Generating response for agent ${agentId}`);
      logger.info(`Context:`, context);
      logger.info(`Debate history length: ${debateHistory?.length || 0}`);

      let agent = this.agents.get(agentId);

      // If agent not found in memory, try to reconstruct from context
      if (!agent && context && typeof context === 'object') {
        logger.info(`Reconstructing agent ${agentId} from context`);
        agent = {
          id: agentId,
          motion: context.motion || 'Unknown motion',
          role: context.role || 'proposition',
          personality: {
            traits: ['analytical', 'persuasive', 'well-informed'],
            style: 'formal'
          },
          expertise: {
            domains: ['general knowledge', 'debate tactics'],
            level: 'expert'
          }
        };
        // Store for future use
        this.agents.set(agentId, agent);
      }

      if (!agent) {
        logger.error(`Agent ${agentId} not found and cannot be reconstructed`);
        throw new Error('Agent not found and cannot be reconstructed');
      }

      logger.info(`Using agent: ${agent.role} on motion: ${agent.motion}`);

      // Build conversation context from debate history
      const recentMessages = debateHistory.slice(-5); // Last 5 messages for context
      const conversationContext = recentMessages.map(msg =>
        `${msg.speakerRole}: ${msg.content}`
      ).join('\n\n');

      // Determine the opposing role for context
      const opposingRole = agent.role === 'proposition' ? 'opposition' : 'proposition';

      // Get the last human message to respond to
      const lastHumanMessage = recentMessages
        .filter(msg => msg.speakerType === 'human')
        .pop();

      const systemPrompt = `You are an AI debate participant taking the ${agent.role} position on the motion: "${agent.motion}".

Your personality traits: ${agent.personality.traits.join(', ')}
Your style: ${agent.personality.style}
Your expertise: ${agent.expertise.domains.join(', ')}

Rules:
1. Stay in character as a ${agent.role} debater
2. Provide substantive arguments that advance your position
3. Respond directly to the opponent's points when relevant
4. Keep responses concise but impactful (2-4 sentences)
5. Use evidence, logic, and persuasive techniques
6. Maintain a ${agent.personality.style} tone
7. Do not repeat previous arguments exactly

Current debate context:
${conversationContext}`;

      const userPrompt = lastHumanMessage
        ? `The ${opposingRole} just argued: "${lastHumanMessage.content}"\n\nProvide a strong ${agent.role} response that addresses their points and advances your position.`
        : `Provide a strong opening argument for the ${agent.role} position on this motion.`;

      logger.info(`Calling AI API for agent ${agentId}`);
      logger.info(`System prompt: ${systemPrompt.substring(0, 100)}...`);
      logger.info(`User prompt: ${userPrompt.substring(0, 100)}...`);

      // Try Gemini first, fallback to OpenAI if needed
      let aiContent;
      try {
        const model = this.gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `${systemPrompt}\n\nUser: ${userPrompt}`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        aiContent = response.text().trim();

        logger.info(`Gemini API response received: ${aiContent.substring(0, 100)}...`);
      } catch (geminiError) {
        logger.warn(`Gemini API failed, trying OpenAI: ${geminiError.message}`);

        try {
          const response = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: userPrompt
              }
            ],
            max_tokens: 200,
            temperature: 0.7,
            presence_penalty: 0.6, // Encourage new content
            frequency_penalty: 0.3  // Reduce repetition
          });

          aiContent = response.choices[0].message.content.trim();
          logger.info(`OpenAI API response received: ${aiContent.substring(0, 100)}...`);
        } catch (openaiError) {
          logger.warn(`Both AI APIs failed, using enhanced fallback`);
          throw openaiError; // This will trigger the fallback system
        }
      }

      logger.info(`OpenAI API response received: ${aiContent.substring(0, 100)}...`);

      return {
        content: aiContent,
        agentId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error generating AI response:', error);
      logger.error('Error details:', error.message);

      // Enhanced fallback response system
      const agent = this.agents.get(agentId);
      const lastHumanMessage = debateHistory
        .filter(msg => msg.speakerType === 'human')
        .pop();

      let fallbackContent;

      if (lastHumanMessage && agent) {
        // Generate contextual fallback based on the motion and last message
        const motionKeywords = agent.motion.toLowerCase().split(' ');
        const messageKeywords = lastHumanMessage.content.toLowerCase().split(' ');

        // Find common themes
        const commonWords = motionKeywords.filter(word =>
          messageKeywords.includes(word) && word.length > 3
        );

        const contextualResponses = {
          proposition: [
            `I believe this motion is essential because ${commonWords.length > 0 ? commonWords[0] : 'the issue'} requires immediate attention.`,
            `The benefits of this approach far outweigh any concerns, especially regarding ${commonWords.length > 0 ? commonWords[0] : 'the core issue'}.`,
            `We cannot ignore the positive impact this will have on ${commonWords.length > 0 ? commonWords[0] : 'society'}.`,
            `This motion addresses fundamental problems that current systems fail to solve.`
          ],
          opposition: [
            `I must challenge this position because the risks associated with ${commonWords.length > 0 ? commonWords[0] : 'this approach'} are too significant.`,
            `While the proposition raises valid points, the potential negative consequences of ${commonWords.length > 0 ? commonWords[0] : 'this motion'} cannot be overlooked.`,
            `There are serious flaws in this reasoning, particularly regarding ${commonWords.length > 0 ? commonWords[0] : 'the implementation'}.`,
            `Alternative solutions would be more effective than what this motion proposes.`
          ]
        };

        const responses = contextualResponses[agent.role] || contextualResponses.opposition;
        fallbackContent = responses[Math.floor(Math.random() * responses.length)];
      } else {
        // Basic fallback if no context available
        const basicResponses = {
          proposition: "I strongly support this motion and believe it will bring significant benefits.",
          opposition: "I must respectfully disagree with this motion for several important reasons."
        };
        fallbackContent = basicResponses[agent?.role] || basicResponses.opposition;
      }

      return {
        content: fallbackContent,
        agentId,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = AgentManager;
