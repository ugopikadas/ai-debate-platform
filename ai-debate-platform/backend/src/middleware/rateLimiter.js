const { RateLimiterFlexible } = require('rate-limiter-flexible');
const logger = require('../utils/logger');

// Create rate limiters for different endpoints
const rateLimiters = {
  // General API rate limiter
  general: new RateLimiterFlexible({
    keyPrefix: 'general',
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 60 seconds if limit exceeded
  }),

  // Authentication rate limiter (stricter)
  auth: new RateLimiterFlexible({
    keyPrefix: 'auth',
    points: 10,
    duration: 60,
    blockDuration: 300, // Block for 5 minutes
  }),

  // Debate creation rate limiter
  debateCreation: new RateLimiterFlexible({
    keyPrefix: 'debate_creation',
    points: 5, // Max 5 debates per hour
    duration: 3600,
    blockDuration: 3600,
  }),

  // AI agent generation rate limiter (expensive operation)
  aiGeneration: new RateLimiterFlexible({
    keyPrefix: 'ai_generation',
    points: 10, // Max 10 AI generations per hour
    duration: 3600,
    blockDuration: 1800, // Block for 30 minutes
  }),

  // Message sending rate limiter
  messaging: new RateLimiterFlexible({
    keyPrefix: 'messaging',
    points: 60, // Max 60 messages per minute
    duration: 60,
    blockDuration: 120,
  })
};

/**
 * General rate limiter middleware
 */
const rateLimiter = async (req, res, next) => {
  try {
    const key = req.user?.uid || req.ip;
    await rateLimiters.general.consume(key);
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    
    logger.warn(`Rate limit exceeded for ${req.user?.uid || req.ip}`, {
      endpoint: req.originalUrl,
      method: req.method
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: secs
    });
  }
};

/**
 * Create specific rate limiter middleware
 */
function createRateLimiter(limiterName) {
  return async (req, res, next) => {
    try {
      const key = req.user?.uid || req.ip;
      const limiter = rateLimiters[limiterName];
      
      if (!limiter) {
        logger.error(`Rate limiter '${limiterName}' not found`);
        return next();
      }
      
      await limiter.consume(key);
      next();
    } catch (rejRes) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      res.set('Retry-After', String(secs));
      
      logger.warn(`Rate limit exceeded for ${req.user?.uid || req.ip}`, {
        limiter: limiterName,
        endpoint: req.originalUrl,
        method: req.method
      });
      
      res.status(429).json({
        success: false,
        message: `Rate limit exceeded for ${limiterName}. Please try again later.`,
        retryAfter: secs
      });
    }
  };
}

// Export specific rate limiters
const authRateLimiter = createRateLimiter('auth');
const debateCreationRateLimiter = createRateLimiter('debateCreation');
const aiGenerationRateLimiter = createRateLimiter('aiGeneration');
const messagingRateLimiter = createRateLimiter('messaging');

module.exports = {
  rateLimiter,
  authRateLimiter,
  debateCreationRateLimiter,
  aiGenerationRateLimiter,
  messagingRateLimiter,
  createRateLimiter
};
