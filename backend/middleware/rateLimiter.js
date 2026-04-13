const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const logger = require('../utils/logger');

// Redis client for distributed rate limiting (optional, falls back to memory if not configured)
let redisClient = null;
let store = null;

// Initialize Redis if URL is provided (for production)
if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL);
    store = new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: 'rl:',
    });
    logger.info('Redis rate limiter store initialized');
  } catch (error) {
    logger.warn('Redis connection failed, falling back to memory store', error);
  }
}

// ============= CONFIGURATION FROM ENVIRONMENT =============

// General API rate limiter configuration
const API_WINDOW_MS = parseInt(process.env.RATE_LIMIT_API_WINDOW_MS) || 15 * 60 * 1000; // Default: 15 minutes
const API_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_API_MAX) || 100; // Default: 100 requests

// Authentication rate limiter configuration
const AUTH_WINDOW_MS = parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 15 * 60 * 1000; // Default: 15 minutes
const AUTH_MAX_ATTEMPTS = parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 5; // Default: 5 attempts

// Game creation rate limiter configuration
const GAME_WINDOW_MS = parseInt(process.env.RATE_LIMIT_GAME_WINDOW_MS) || 15 * 60 * 1000; // Default: 15 minutes
const GAME_MAX_CREATIONS = parseInt(process.env.RATE_LIMIT_GAME_MAX) || 10; // Default: 10 games

// Development mode: increase limits for testing
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

// Adjust limits for development/testing
const finalApiMax = (isDevelopment || isTest) ? 1000 : API_MAX_REQUESTS;
const finalAuthMax = (isDevelopment || isTest) ? 50 : AUTH_MAX_ATTEMPTS;
const finalGameMax = (isDevelopment || isTest) ? 100 : GAME_MAX_CREATIONS;
const finalWindowMs = (isDevelopment || isTest) ? 60 * 1000 : API_WINDOW_MS; // 1 minute in dev

/**
 * General API rate limiter - applies to all routes
 * Protects against DDoS attacks and excessive usage
 */
const apiLimiter = rateLimit({
  windowMs: finalWindowMs,
  max: finalApiMax,
  store: store, // Use Redis store if available, otherwise memory store
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: `Too many requests. Please try again after ${Math.ceil(finalWindowMs / 60000)} minutes.`,
    retryAfter: Math.ceil(finalWindowMs / 1000),
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP address
    return req.user?.id || req.ip;
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for ${req.user?.id || req.ip} on ${req.method} ${req.path}`);
    res.status(429).json(options.message);
  },
});

/**
 * Authentication rate limiter - stricter limits for auth endpoints
 * Prevents brute force attacks on login/register
 */
const authLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max: finalAuthMax,
  store: store,
  message: {
    success: false,
    error: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: `Too many authentication attempts. Please try again after ${Math.ceil(AUTH_WINDOW_MS / 60000)} minutes.`,
    retryAfter: Math.ceil(AUTH_WINDOW_MS / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  skipFailedRequests: false,
  keyGenerator: (req) => {
    // Use email if provided, otherwise IP address
    return req.body?.email || req.ip;
  },
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit exceeded for ${req.body?.email || req.ip}`);
    res.status(429).json(options.message);
  },
});

/**
 * Game creation rate limiter - prevents spam
 * Limits how many games a user can create in a time window
 */
const gameCreationLimiter = rateLimit({
  windowMs: GAME_WINDOW_MS,
  max: finalGameMax,
  store: store,
  message: {
    success: false,
    error: 'GAME_CREATION_LIMIT_EXCEEDED',
    message: `Too many games created. Please try again after ${Math.ceil(GAME_WINDOW_MS / 60000)} minutes.`,
    retryAfter: Math.ceil(GAME_WINDOW_MS / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: true, // Only count successful game creations
  keyGenerator: (req) => {
    // Use user ID (must be authenticated)
    return req.user?.id || req.ip;
  },
  handler: (req, res, next, options) => {
    logger.warn(`Game creation rate limit exceeded for user ${req.user?.id || req.ip}`);
    res.status(429).json(options.message);
  },
});

/**
 * Strict limiter for password reset endpoints
 * Prevents abuse of password reset functionality
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  store: store,
  message: {
    success: false,
    error: 'PASSWORD_RESET_LIMIT_EXCEEDED',
    message: 'Too many password reset attempts. Please try again in 1 hour.',
    retryAfter: 3600,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.body?.email || req.ip,
});

/**
 * Strict limiter for email verification
 * Prevents abuse of email verification endpoint
 */
const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  store: store,
  message: {
    success: false,
    error: 'EMAIL_VERIFICATION_LIMIT_EXCEEDED',
    message: 'Too many verification attempts. Please try again later.',
    retryAfter: 3600,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

/**
 * Skip rate limiting for health checks and certain paths
 */
const skipRateLimit = (req) => {
  const skipPaths = ['/health', '/metrics', '/favicon.ico'];
  return skipPaths.includes(req.path);
};

// Create a wrapper that skips certain paths
const apiLimiterWithSkip = (req, res, next) => {
  if (skipRateLimit(req)) {
    return next();
  }
  return apiLimiter(req, res, next);
};

module.exports = {
  apiLimiter: apiLimiterWithSkip,
  authLimiter,
  gameCreationLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
  // Export raw limiters for advanced use cases
  rawApiLimiter: apiLimiter,
};