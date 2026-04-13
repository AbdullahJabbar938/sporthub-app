const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * User Schema - Professional Implementation
 * Features: Password hashing, email validation, geospatial indexing, refresh tokens
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
      match: [/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'],
    },
    
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
      // index: true removed - unique creates the index automatically
    },
    
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't return password by default
    },
    
    sportsPreferences: {
      type: [String],
      enum: ['football', 'basketball', 'tennis', 'volleyball', 'cricket', 'rugby', 'other'],
      default: [],
    },
    
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
        validate: {
          validator: function(coords) {
            return coords.length === 2 && 
                   coords[0] >= -180 && coords[0] <= 180 &&
                   coords[1] >= -90 && coords[1] <= 90;
          },
          message: 'Invalid coordinates format',
        },
      },
      address: {
        type: String,
        trim: true,
        maxlength: 200,
      },
      placeId: String,
      lastUpdated: Date,
    },
    
    refreshTokens: [
      {
        token: {
          type: String,
          required: true,
        },
        expiresAt: {
          type: Date,
          required: true,
        },
        deviceInfo: {
          type: String,
          default: 'Unknown',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    
    passwordResetToken: String,
    passwordResetExpires: Date,
    
    lastLoginAt: Date,
    loginCount: {
      type: Number,
      default: 0,
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },
    
    profilePicture: {
      type: String,
      default: null,
    },
    
    bio: {
      type: String,
      maxlength: 500,
      default: '',
    },
    
    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'professional'],
      default: 'beginner',
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create geospatial index for location queries
userSchema.index({ location: '2dsphere' });

// Index for email lookups
userSchema.index({ email: 1 });

// Index for active users
userSchema.index({ isActive: 1, createdAt: -1 });

/**
 * Hash password before saving
 */
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12); // Increased rounds for better security
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Update location lastUpdated timestamp
 */
userSchema.pre('save', function(next) {
  if (this.isModified('location')) {
    this.location.lastUpdated = new Date();
  }
  next();
});

/**
 * Compare candidate password with stored hash
 * @param {string} candidatePassword - Plain text password to compare
 * @returns {Promise<boolean>} - True if passwords match
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Generate JWT access token
 * @returns {string} - JWT access token
 */
userSchema.methods.generateAccessToken = function() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { 
      id: this._id, 
      email: this.email, 
      role: this.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};

/**
 * Generate refresh token and store in database
 * @param {string} deviceInfo - Device information for tracking
 * @returns {Promise<string>} - Refresh token
 */
userSchema.methods.generateRefreshToken = async function(deviceInfo = 'Unknown') {
  const crypto = require('crypto');
  const refreshToken = crypto.randomBytes(40).toString('hex');
  
  // Calculate expiration date (default: 7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (process.env.JWT_REFRESH_EXPIRE_DAYS || 7));
  
  // Add to refresh tokens array
  this.refreshTokens.push({
    token: refreshToken,
    expiresAt,
    deviceInfo,
  });
  
  // Limit to 5 active refresh tokens per user
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
  
  await this.save();
  return refreshToken;
};

/**
 * Verify refresh token and return user if valid
 * @param {string} token - Refresh token to verify
 * @returns {Promise<Object|null>} - User if token valid, null otherwise
 */
userSchema.statics.verifyRefreshToken = async function(token) {
  const user = await this.findOne({
    'refreshTokens.token': token,
    'refreshTokens.expiresAt': { $gt: new Date() },
  });
  
  if (!user) return null;
  
  // Remove used refresh token (rotate)
  user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== token);
  await user.save();
  
  return user;
};

/**
 * Remove specific refresh token (for logout)
 * @param {string} token - Refresh token to remove
 */
userSchema.methods.removeRefreshToken = async function(token) {
  this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
  await this.save();
};

/**
 * Remove all refresh tokens (for logout from all devices)
 */
userSchema.methods.removeAllRefreshTokens = async function() {
  this.refreshTokens = [];
  await this.save();
};

/**
 * Generate email verification token
 * @returns {string} - Verification token
 */
userSchema.methods.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

/**
 * Generate password reset token
 * @returns {string} - Reset token
 */
userSchema.methods.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 1 * 60 * 60 * 1000; // 1 hour
  return token;
};

/**
 * Update last login information
 */
userSchema.methods.updateLastLogin = async function() {
  this.lastLoginAt = new Date();
  this.loginCount += 1;
  await this.save();
};

/**
 * Get public profile (without sensitive data)
 * @returns {Object} - Public user object
 */
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    sportsPreferences: this.sportsPreferences,
    location: this.location,
    role: this.role,
    bio: this.bio,
    skillLevel: this.skillLevel,
    profilePicture: this.profilePicture,
    createdAt: this.createdAt,
  };
};

/**
 * Check if location is set
 * @returns {boolean} - True if location has valid coordinates
 */
userSchema.methods.hasLocation = function() {
  return this.location && 
         this.location.coordinates && 
         this.location.coordinates[0] !== 0 && 
         this.location.coordinates[1] !== 0;
};

// Virtual for full address
userSchema.virtual('fullAddress').get(function() {
  return this.location?.address || 'Location not set';
});

// Virtual for games count (populated later)
userSchema.virtual('gamesCount', {
  ref: 'Game',
  localField: '_id',
  foreignField: 'organizer',
  count: true,
});

const User = mongoose.model('User', userSchema);

module.exports = User;