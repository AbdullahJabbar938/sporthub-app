const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import middleware
const {
  apiLimiter,
  authLimiter,
  gameCreationLimiter,
  passwordResetLimiter,
  emailVerificationLimiter
} = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const profileRoutes = require('./routes/profile');

// Import logger
const logger = require('./utils/logger');

const app = express();

// ============= SECURITY MIDDLEWARE =============

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://maps.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https://maps.googleapis.com', 'https://maps.gstatic.com'],
      connectSrc: ["'self'", 'https://api.sporthub.app'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Compression - Gzip responses
app.use(compression());

// ============= CORS CONFIGURATION =============
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// ============= BODY PARSING =============
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============= RATE LIMITING =============

// Apply general rate limiter to ALL API routes
app.use('/api/', apiLimiter);

// Apply stricter limits to authentication routes (prevents brute force attacks)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Apply limit to password reset (prevents abuse)
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);

// Apply limit to email verification
app.use('/api/auth/verify-email', emailVerificationLimiter);

// Apply limit to game creation (prevents spam)
app.use('/api/games', gameCreationLimiter);

// ============= API ROUTES =============
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/users', profileRoutes);

// ============= HEALTH CHECK =============
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============= 404 HANDLER =============
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`
  });
});

// ============= GLOBAL ERROR HANDLER =============
app.use(errorHandler);

// ============= DATABASE CONNECTION & SERVER START =============
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGODB_URI, {
    retryWrites: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
    .then(() => {
      logger.info('✅ MongoDB connected successfully');
      
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT}`);
        logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`📍 API URL: http://localhost:${PORT}/api`);
        logger.info(`❤️  Health check: http://localhost:${PORT}/health`);
        
        // Log rate limiting configuration
        if (process.env.NODE_ENV === 'development') {
          logger.info('🔧 Development mode: Rate limits increased for testing');
        } else {
          logger.info('🛡️ Production mode: Standard rate limits applied');
        }
      });
    })
    .catch((err) => {
      logger.error('❌ MongoDB connection error:', err);
      process.exit(1);
    });
}

module.exports = app;