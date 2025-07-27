const Joi = require('joi');
const logger = require('../utils/logger');

// Validation schemas
const debateCreationSchema = Joi.object({
  motion: Joi.string().min(10).max(500).required(),
  description: Joi.string().max(1000).optional(),
  format: Joi.string().valid('oxford', 'parliamentary', 'lincoln-douglas').default('oxford'),
  timePerSpeech: Joi.number().min(60000).max(600000).default(180000), // 1-10 minutes
  maxParticipants: Joi.number().min(2).max(8).default(2),
  isPublic: Joi.boolean().default(false),
  hasAIParticipant: Joi.boolean().default(false),
  aiDifficulty: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').default('intermediate')
});

const debateUpdateSchema = Joi.object({
  status: Joi.string().valid('waiting', 'preparation', 'active', 'completed').optional(),
  currentPhase: Joi.string().valid('setup', 'preparation', 'debate', 'evaluation').optional(),
  description: Joi.string().max(1000).optional(),
  isPublic: Joi.boolean().optional()
});

const messageSchema = Joi.object({
  content: Joi.string().min(1).max(2000).required(),
  speakerType: Joi.string().valid('human', 'ai').required(),
  debateId: Joi.string().required()
});

const userUpdateSchema = Joi.object({
  displayName: Joi.string().min(2).max(50).optional(),
  bio: Joi.string().max(500).optional(),
  preferences: Joi.object({
    notifications: Joi.boolean().optional(),
    publicProfile: Joi.boolean().optional(),
    preferredDebateFormat: Joi.string().valid('oxford', 'parliamentary', 'lincoln-douglas').optional(),
    aiDifficulty: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').optional()
  }).optional()
});

const agentGenerationSchema = Joi.object({
  motion: Joi.string().min(10).max(500).required(),
  role: Joi.string().valid('proposition', 'opposition').required(),
  difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert').default('intermediate'),
  personality: Joi.string().valid('analytical', 'passionate', 'methodical', 'creative', 'logical', 'empathetic', 'aggressive', 'diplomatic').optional()
});

/**
 * Validation middleware factory
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Validation error:', errorDetails);

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorDetails
      });
    }

    // Replace the original data with validated and sanitized data
    req[property] = value;
    next();
  };
}

// Specific validation middleware
const validateDebateCreation = validate(debateCreationSchema);
const validateDebateUpdate = validate(debateUpdateSchema);
const validateMessage = validate(messageSchema);
const validateUserUpdate = validate(userUpdateSchema);
const validateAgentGeneration = validate(agentGenerationSchema);

/**
 * Custom validation for debate participation
 */
function validateDebateParticipation(req, res, next) {
  const { role } = req.body;
  
  if (!role || !['proposition', 'opposition'].includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Valid role (proposition or opposition) is required'
    });
  }
  
  next();
}

/**
 * Validate pagination parameters
 */
function validatePagination(req, res, next) {
  const { limit, offset } = req.query;
  
  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be a number between 1 and 100'
    });
  }
  
  if (offset && (isNaN(offset) || parseInt(offset) < 0)) {
    return res.status(400).json({
      success: false,
      message: 'Offset must be a non-negative number'
    });
  }
  
  next();
}

/**
 * Validate MongoDB ObjectId format
 */
function validateObjectId(paramName) {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || typeof id !== 'string' || id.length < 10) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
    }
    
    next();
  };
}

/**
 * Sanitize HTML content to prevent XSS
 */
function sanitizeContent(req, res, next) {
  if (req.body.content) {
    // Basic HTML sanitization - in production, use a library like DOMPurify
    req.body.content = req.body.content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  
  next();
}

/**
 * Rate limiting validation
 */
function validateRateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  const requests = new Map();
  
  return (req, res, next) => {
    const identifier = req.user?.uid || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [key, timestamps] of requests.entries()) {
      requests.set(key, timestamps.filter(timestamp => timestamp > windowStart));
      if (requests.get(key).length === 0) {
        requests.delete(key);
      }
    }
    
    // Check current user's requests
    const userRequests = requests.get(identifier) || [];
    
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    // Add current request
    userRequests.push(now);
    requests.set(identifier, userRequests);
    
    next();
  };
}

module.exports = {
  validate,
  validateDebateCreation,
  validateDebateUpdate,
  validateMessage,
  validateUserUpdate,
  validateAgentGeneration,
  validateDebateParticipation,
  validatePagination,
  validateObjectId,
  sanitizeContent,
  validateRateLimit
};
