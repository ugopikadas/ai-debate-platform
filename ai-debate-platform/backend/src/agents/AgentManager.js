const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { dbHelpers, collections } = require('../firebase/config');
const logger = require('../utils/logger');

class AgentManager {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    this.agentPersonalities = [
      'analytical', 'passionate', 'methodical', 'creative', 
      'logical', 'empathetic', 'aggressive', 'diplomatic'
    ];
    
    // Enhanced role system for BP and AP formats
    this.debateFormats = {
      BP: {
        name: 'British Parliamentary',
        roles: {
          'opening_government': { position: 'proposition', order: 1, title: 'Prime Minister' },
          'opening_opposition': { position: 'opposition', order: 2, title: 'Leader of Opposition' },
          'closing_government': { position: 'proposition', order: 3, title: 'Deputy Prime Minister' },
          'closing_opposition': { position: 'opposition', order: 4, title: 'Government Whip' }
        },
        speakingTime: 7, // minutes
        prepTime: 15 // minutes
      },
      AP: {
        name: 'Asian Parliamentary',
        roles: {
          'government_prime': { position: 'proposition', order: 1, title: 'Prime Minister' },
          'opposition_leader': { position: 'opposition', order: 2, title: 'Leader of Opposition' },
          'government_deputy': { position: 'proposition', order: 3, title: 'Deputy Prime Minister' },
          'opposition_deputy': { position: 'opposition', order: 4, title: 'Deputy Leader of Opposition' },
          'government_whip': { position: 'proposition', order: 5, title: 'Government Whip' },
          'opposition_whip': { position: 'opposition', order: 6, title: 'Opposition Whip' }
        },
        speakingTime: 8, // minutes
        prepTime: 30 // minutes
      }
    };
    
    // Skill levels with specific capabilities
    this.skillLevels = {
      'novice': {
        complexity: 0.3,
        vocabularyLevel: 'basic',
        argumentDepth: 'surface',
        rebuttals: 'simple',
        evidence: 'common_knowledge'
      },
      'intermediate': {
        complexity: 0.6,
        vocabularyLevel: 'moderate',
        argumentDepth: 'structured',
        rebuttals: 'targeted',
        evidence: 'researched'
      },
      'advanced': {
        complexity: 0.9,
        vocabularyLevel: 'sophisticated',
        argumentDepth: 'nuanced',
        rebuttals: 'comprehensive',
        evidence: 'expert_sources'
      }
    };
  }

  /**
   * Generate a dynamic AI agent based on debate motion, format, and role
   */
  async generateAgent(motion, format, role, skillLevel = 'intermediate') {
    try {
      if (!this.debateFormats[format]) {
        throw new Error(`Unsupported debate format: ${format}`);
      }
      
      if (!this.debateFormats[format].roles[role]) {
        throw new Error(`Invalid role ${role} for format ${format}`);
      }
      
      const formatConfig = this.debateFormats[format];
      const roleConfig = formatConfig.roles[role];
      const skillConfig = this.skillLevels[skillLevel];
      
      const personality = this.selectPersonality(motion, roleConfig.position);
      const expertise = await this.determineExpertise(motion);
      const casePreparation = await this.generateCasePreparation(motion, roleConfig, skillConfig);
      
      const agentConfig = {
        id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        motion,
        format,
        role,
        roleConfig,
        skillLevel,
        skillConfig,
        personality,
        expertise,
        casePreparation,
        systemPrompt: await this.generateSystemPrompt(motion, roleConfig, personality, expertise, skillConfig),
        strategies: await this.generateDebateStrategies(motion, roleConfig, skillConfig),
        knowledgeBase: await this.buildKnowledgeBase(motion),
        noteTracker: this.initializeNoteTracker(),
        createdAt: new Date().toISOString(),
        active: true
      };

      // Save agent to Firebase
      const agentId = await dbHelpers.createDoc(collections.AGENTS, agentConfig);
      agentConfig.id = agentId;

      logger.info(`Generated AI agent: ${agentId} for motion: ${motion} (${format} - ${role})`);
      return agentConfig;

    } catch (error) {
      logger.error('Error generating AI agent:', error);
      throw new Error('Failed to generate AI agent');
    }
  }

  /**
   * Select appropriate personality based on motion and role
   */
  selectPersonality(motion, role) {
    const motionKeywords = motion.toLowerCase();
    
    // Logic-based personality selection
    if (motionKeywords.includes('technology') || motionKeywords.includes('science')) {
      return role === 'proposition' ? 'analytical' : 'methodical';
    }
    
    if (motionKeywords.includes('social') || motionKeywords.includes('human')) {
      return role === 'proposition' ? 'empathetic' : 'passionate';
    }
    
    if (motionKeywords.includes('economic') || motionKeywords.includes('business')) {
      return role === 'proposition' ? 'logical' : 'analytical';
    }
    
    // Default random selection
    return this.agentPersonalities[Math.floor(Math.random() * this.agentPersonalities.length)];
  }

  /**
   * Determine expertise areas based on motion analysis
   */
  async determineExpertise(motion) {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert at analyzing debate motions and determining relevant expertise areas. Return a JSON array of 3-5 expertise areas."
          },
          {
            role: "user",
            content: `Analyze this debate motion and determine the key expertise areas needed: "${motion}"`
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      });

      const expertiseText = response.choices[0].message.content;
      return JSON.parse(expertiseText);
    } catch (error) {
      logger.warn('Failed to determine expertise via AI, using fallback');
      return ['general knowledge', 'critical thinking', 'argumentation'];
    }
  }

  /**
   * Generate motion-specific case preparation
   */
  async generateCasePreparation(motion, roleConfig, skillConfig) {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a debate coach preparing case materials for a ${roleConfig.title} in a debate.
            Skill level: ${skillConfig.argumentDepth}, Evidence level: ${skillConfig.evidence}
            Return a structured JSON with: mainArguments, supportingEvidence, anticipatedRebuttals, keyQuotes`
          },
          {
            role: "user",
            content: `Motion: "${motion}"
Position: ${roleConfig.position}
Role: ${roleConfig.title}

Prepare comprehensive case materials.`
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      });

      const caseData = JSON.parse(response.choices[0].message.content);
      return {
        ...caseData,
        prepTime: new Date().toISOString(),
        skillLevel: skillConfig.argumentDepth
      };
    } catch (error) {
      logger.warn('Failed to generate case preparation, using fallback');
      return {
        mainArguments: [`Primary argument for ${roleConfig.position}`, `Secondary supporting point`],
        supportingEvidence: ['Statistical data', 'Expert opinion', 'Case study'],
        anticipatedRebuttals: ['Counter-argument 1', 'Counter-argument 2'],
        keyQuotes: ['Relevant quote from authority'],
        prepTime: new Date().toISOString(),
        skillLevel: skillConfig.argumentDepth
      };
    }
  }

  /**
   * Initialize note tracking system for the agent
   */
  initializeNoteTracker() {
    return {
      flowNotes: {
        ownArguments: [],
        opponentArguments: [],
        rebuttals: [],
        clashes: []
      },
      keyPoints: [],
      strategicNotes: [],
      timeStamps: [],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Generate comprehensive system prompt for the AI agent
   */
  async generateSystemPrompt(motion, roleConfig, personality, expertise, skillConfig) {
    const personalityTraits = {
      analytical: "methodical, data-driven, and focused on logical reasoning",
      passionate: "emotionally engaging, persuasive, and inspiring",
      methodical: "systematic, thorough, and detail-oriented",
      creative: "innovative, thinking outside the box, and using analogies",
      logical: "rational, evidence-based, and structured",
      empathetic: "understanding, compassionate, and human-centered",
      aggressive: "assertive, challenging, and direct",
      diplomatic: "balanced, respectful, and consensus-building"
    };

    const skillInstructions = {
      'surface': 'Keep arguments simple and direct. Use everyday examples and common knowledge.',
      'structured': 'Organize arguments with clear structure. Use moderate complexity and some research-based evidence.',
      'nuanced': 'Develop sophisticated, multi-layered arguments. Use complex reasoning and expert-level evidence.'
    };

    const vocabularyGuidance = {
      'basic': 'Use clear, simple language accessible to general audiences.',
      'moderate': 'Use appropriate academic vocabulary while remaining accessible.',
      'sophisticated': 'Use advanced vocabulary and technical terms when appropriate.'
    };

    return `You are an AI debater participating in a ${this.debateFormats[motion.format]?.name || 'formal'} debate.

MOTION: "${motion}"
ROLE: ${roleConfig.title} (${roleConfig.position.toUpperCase()})
SPEAKING ORDER: ${roleConfig.order}
PERSONALITY: ${personality} - You are ${personalityTraits[personality]}
SKILL LEVEL: ${skillConfig.argumentDepth}
EXPERTISE: ${expertise.join(', ')}

DEBATE GUIDELINES:
1. You are arguing ${roleConfig.position === 'proposition' ? 'FOR' : 'AGAINST'} the motion
2. Use your ${personality} personality to shape your arguments
3. ${skillInstructions[skillConfig.argumentDepth]}
4. ${vocabularyGuidance[skillConfig.vocabularyLevel]}
5. Draw from your expertise in: ${expertise.join(', ')}
6. Structure arguments clearly with claim, warrant, and impact
7. Address counterarguments proactively using ${skillConfig.rebuttals} rebuttals
8. Use ${skillConfig.evidence} level evidence and examples
9. Maintain respectful but competitive tone
10. Adapt to your opponent's arguments in real-time
11. Take notes during opponent speeches for effective rebuttals

ROLE-SPECIFIC DUTIES:
${this.getRoleSpecificInstructions(roleConfig)}

RESPONSE FORMAT:
- Keep responses focused and impactful (speaking time varies by format)
- Use clear signposting and transitions
- Include specific examples and evidence appropriate to your skill level
- End with strong, memorable conclusions
- Maintain consistency with your case preparation

NOTE TAKING:
- Track opponent arguments for effective clash
- Note key evidence and sources mentioned
- Identify logical gaps in opponent reasoning
- Plan strategic responses based on debate flow

Remember: You are not just presenting information, you are actively debating to win while maintaining intellectual honesty and respect for the process. Your skill level should be evident in argument complexity and evidence quality.`;
  }

  /**
   * Get role-specific instructions based on debate format and position
   */
  getRoleSpecificInstructions(roleConfig) {
    const instructions = {
      1: "As the opening speaker, define key terms, establish the framework, and present your strongest arguments.",
      2: "Respond to the opening case, present counter-arguments, and establish your side's framework.",
      3: "Extend your side's case, respond to opposition points, and introduce new angles or examples.",
      4: "Provide final rebuttals, summarize key clashes, and explain why your side wins the debate.",
      5: "Focus on whip speech duties: summarize the debate, identify key clashes, and provide final analysis.",
      6: "Deliver final opposition summary, address all government points, and conclude why opposition wins."
    };
    
    return instructions[roleConfig.order] || "Present your arguments clearly and respond to opposition points.";
  }

  /**
   * Generate debate strategies specific to motion, role, and skill level
   */
  async generateDebateStrategies(motion, roleConfig, skillConfig) {
    try {
      const response = await this.gemini.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `Generate 5 specific debate strategies for a ${roleConfig.title} (${roleConfig.position}) in this motion: "${motion}".
      
      Context:
      - Speaking order: ${roleConfig.order}
      - Skill level: ${skillConfig.argumentDepth}
      - Evidence level: ${skillConfig.evidence}
      - Rebuttal style: ${skillConfig.rebuttals}
      
      Return as JSON array with strategy name and description tailored to this specific role and skill level.`;
      
      const result = await response.generateContent(prompt);
      const strategiesText = result.response.text();
      
      return JSON.parse(strategiesText);
    } catch (error) {
      logger.warn('Failed to generate strategies via AI, using defaults');
      return [
        { name: "Evidence-based argumentation", description: "Use credible sources and data" },
        { name: "Logical reasoning", description: "Build clear logical chains" },
        { name: "Counterargument anticipation", description: "Address opposing views proactively" },
        { name: "Emotional appeal", description: "Connect with human values and concerns" },
        { name: "Practical implications", description: "Focus on real-world consequences" }
      ];
    }
  }

  /**
   * Build knowledge base for the specific motion
   */
  async buildKnowledgeBase(motion) {
    // This would typically involve:
    // 1. Searching relevant databases
    // 2. Gathering recent news and research
    // 3. Compiling expert opinions
    // 4. Organizing by argument themes
    
    return {
      motion,
      keyTopics: await this.extractKeyTopics(motion),
      recentDevelopments: [],
      expertOpinions: [],
      statisticalData: [],
      caseStudies: [],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Extract key topics from motion for knowledge base
   */
  async extractKeyTopics(motion) {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Extract 5-7 key topics from this debate motion. Return as simple array of strings."
          },
          {
            role: "user",
            content: motion
          }
        ],
        max_tokens: 100,
        temperature: 0.5
      });

      const topicsText = response.choices[0].message.content;
      return JSON.parse(topicsText);
    } catch (error) {
      return ['main topic', 'supporting arguments', 'counterarguments', 'implications', 'evidence'];
    }
  }

  /**
   * Generate AI response during debate
   */
  async generateResponse(agentId, context, previousMessages = []) {
    try {
      const agent = await dbHelpers.getDoc(collections.AGENTS, agentId);
      if (!agent) throw new Error('Agent not found');

      const messages = [
        { role: "system", content: agent.systemPrompt },
        ...previousMessages.map(msg => ({
          role: msg.speaker === agentId ? "assistant" : "user",
          content: msg.content
        })),
        { role: "user", content: `Context: ${context}. Please provide your debate response.` }
      ];

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages,
        max_tokens: 500,
        temperature: 0.8,
        presence_penalty: 0.6
      });

      return {
        content: response.choices[0].message.content,
        agentId,
        timestamp: new Date().toISOString(),
        tokensUsed: response.usage.total_tokens
      };

    } catch (error) {
      logger.error('Error generating AI response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Update agent based on debate performance
   */
  async updateAgent(agentId, performanceData) {
    try {
      const updates = {
        lastPerformance: performanceData,
        totalDebates: (await dbHelpers.getDoc(collections.AGENTS, agentId))?.totalDebates + 1 || 1,
        lastActive: new Date().toISOString()
      };

      await dbHelpers.updateDoc(collections.AGENTS, agentId, updates);
      logger.info(`Updated agent ${agentId} with performance data`);

    } catch (error) {
      logger.error('Error updating agent:', error);
    }
  }
}

module.exports = AgentManager;
