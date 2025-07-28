// Fix the rate limiter middleware
const { RateLimiterMemory } = require('rate-limiter-flexible');

// Fallback logger if main logger doesn't exist
let logger;
try {
  logger = require('../utils/logger');
} catch (error) {
  logger = {
    warn: console.warn,
    error: console.error,
    info: console.info
  };
}

// Create rate limiters for different endpoints
const rateLimiters = {
  general: new RateLimiterMemory({
    keyPrefix: 'general',
    points: 100,
    duration: 60,
    blockDuration: 60,
  }),
  auth: new RateLimiterMemory({
    keyPrefix: 'auth',
    points: 10,
    duration: 60,
    blockDuration: 300,
  }),
  debateCreation: new RateLimiterMemory({
    keyPrefix: 'debate_creation',
    points: 5,
    duration: 3600,
    blockDuration: 3600,
  }),
  aiGeneration: new RateLimiterMemory({
    keyPrefix: 'ai_generation',
    points: 10,
    duration: 3600,
    blockDuration: 1800,
  }),
  messaging: new RateLimiterMemory({
    keyPrefix: 'messaging',
    points: 60,
    duration: 60,
    blockDuration: 120,
  })
};

const rateLimiter = async (req, res, next) => {
  try {
    const key = req.user?.uid || req.ip;
    await rateLimiters.general.consume(key);
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    logger.warn(`Rate limit exceeded for ${req.user?.uid || req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: secs
    });
  }
};

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
      logger.warn(`Rate limit exceeded for ${req.user?.uid || req.ip}`);
      res.status(429).json({
        success: false,
        message: `Rate limit exceeded for ${limiterName}. Please try again later.`,
        retryAfter: secs
      });
    }
  };
}

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
