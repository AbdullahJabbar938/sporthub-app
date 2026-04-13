const mongoose = require('mongoose');

/**
 * Game Schema - Professional Implementation
 * Features: Validation, methods, indexing, status management
 */
const gameSchema = new mongoose.Schema(
  {
    sport: {
      type: String,
      required: [true, 'Sport is required'],
      enum: {
        values: ['football', 'basketball', 'tennis', 'volleyball', 'cricket', 'rugby', 'other'],
        message: '{VALUE} is not a supported sport',
      },
      index: true,
    },
    
    date: {
      type: Date,
      required: [true, 'Date is required'],
      validate: {
        validator: function(value) {
          return value > new Date();
        },
        message: 'Game date must be in the future',
      },
      index: true,
    },
    
    time: {
      type: String,
      required: [true, 'Time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide a valid time format (HH:MM)'],
    },
    
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Location coordinates are required'],
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
        required: [true, 'Location address is required'],
        trim: true,
        maxlength: 200,
      },
      placeId: String,
    },
    
    maxPlayers: {
      type: Number,
      required: [true, 'Maximum players is required'],
      min: [2, 'Game must allow at least 2 players'],
      max: [22, 'Game cannot exceed 22 players'],
    },
    
    currentPlayers: {
      type: Number,
      default: 1,
      min: 0,
      validate: {
        validator: function(value) {
          return value <= this.maxPlayers;
        },
        message: 'Current players cannot exceed maximum players',
      },
    },
    
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organizer is required'],
      index: true,
    },
    
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      trim: true,
      default: '',
    },
    
    status: {
      type: String,
      enum: {
        values: ['open', 'full', 'cancelled', 'completed'],
        message: '{VALUE} is not a valid status',
      },
      default: 'open',
      index: true,
    },
    
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    
    isPublic: {
      type: Boolean,
      default: true,
    },
    
    equipmentProvided: {
      type: Boolean,
      default: false,
    },
    
    skillLevelRequired: {
      type: String,
      enum: ['any', 'beginner', 'intermediate', 'advanced'],
      default: 'any',
    },
    
    ageRestriction: {
      minAge: {
        type: Number,
        min: 0,
        default: 0,
      },
      maxAge: {
        type: Number,
        max: 100,
        default: 100,
      },
    },
    
    cancellationReason: {
      type: String,
      maxlength: 200,
      default: '',
    },
    
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create geospatial index for location queries
gameSchema.index({ location: '2dsphere' });

// Create compound index for efficient queries
gameSchema.index({ date: 1, status: 1 });
gameSchema.index({ sport: 1, date: 1 });
gameSchema.index({ organizer: 1, status: 1 });

/**
 * Check if game is full
 * @returns {boolean} - True if game is full
 */
gameSchema.methods.isFull = function() {
  return this.currentPlayers >= this.maxPlayers;
};

/**
 * Check if user is organizer
 * @param {string} userId - User ID to check
 * @returns {boolean} - True if user is organizer
 */
gameSchema.methods.isOrganizer = function(userId) {
  return this.organizer.toString() === userId.toString();
};

/**
 * Check if user has joined the game
 * @param {string} userId - User ID to check
 * @returns {boolean} - True if user is a participant
 */
gameSchema.methods.hasJoined = function(userId) {
  return this.participants.some(p => p.toString() === userId.toString());
};

/**
 * Check if user can join
 * @param {string} userId - User ID to check
 * @returns {Object} - { canJoin: boolean, reason: string }
 */
gameSchema.methods.canJoin = function(userId) {
  if (this.status === 'cancelled') {
    return { canJoin: false, reason: 'This game has been cancelled' };
  }
  
  if (this.status === 'completed') {
    return { canJoin: false, reason: 'This game has already been completed' };
  }
  
  if (this.isFull()) {
    return { canJoin: false, reason: 'This game is full' };
  }
  
  if (this.isOrganizer(userId)) {
    return { canJoin: false, reason: 'You are the organizer of this game' };
  }
  
  if (this.hasJoined(userId)) {
    return { canJoin: false, reason: 'You have already joined this game' };
  }
  
  const gameDate = new Date(this.date);
  if (gameDate < new Date()) {
    return { canJoin: false, reason: 'This game has already passed' };
  }
  
  return { canJoin: true, reason: '' };
};

/**
 * Check if user can leave
 * @param {string} userId - User ID to check
 * @returns {Object} - { canLeave: boolean, reason: string }
 */
gameSchema.methods.canLeave = function(userId) {
  if (this.status === 'cancelled') {
    return { canLeave: false, reason: 'This game has been cancelled' };
  }
  
  if (this.status === 'completed') {
    return { canLeave: false, reason: 'This game has already been completed' };
  }
  
  if (this.isOrganizer(userId)) {
    return { canLeave: false, reason: 'Organizers cannot leave. Use cancel game instead.' };
  }
  
  if (!this.hasJoined(userId)) {
    return { canLeave: false, reason: 'You are not a participant in this game' };
  }
  
  const gameDate = new Date(this.date);
  const hoursBeforeGame = 2; // Can leave up to 2 hours before game
  const cutoffTime = new Date(gameDate.getTime() - hoursBeforeGame * 60 * 60 * 1000);
  
  if (new Date() > cutoffTime) {
    return { canLeave: false, reason: `Cannot leave within ${hoursBeforeGame} hours of game start` };
  }
  
  return { canLeave: true, reason: '' };
};

/**
 * Add participant to game
 * @param {string} userId - User ID to add
 * @returns {Promise<Object>} - Updated game
 */
gameSchema.methods.addParticipant = async function(userId) {
  const { canJoin, reason } = this.canJoin(userId);
  
  if (!canJoin) {
    throw new Error(reason);
  }
  
  this.participants.push(userId);
  this.currentPlayers = this.participants.length;
  
  // Update status if full
  if (this.isFull()) {
    this.status = 'full';
  }
  
  await this.save();
  return this;
};

/**
 * Remove participant from game
 * @param {string} userId - User ID to remove
 * @returns {Promise<Object>} - Updated game
 */
gameSchema.methods.removeParticipant = async function(userId) {
  const { canLeave, reason } = this.canLeave(userId);
  
  if (!canLeave) {
    throw new Error(reason);
  }
  
  this.participants = this.participants.filter(
    p => p.toString() !== userId.toString()
  );
  this.currentPlayers = this.participants.length;
  
  // Update status if no longer full
  if (this.status === 'full' && !this.isFull()) {
    this.status = 'open';
  }
  
  await this.save();
  return this;
};

/**
 * Cancel the game
 * @param {string} userId - User ID cancelling (must be organizer)
 * @param {string} reason - Reason for cancellation
 * @returns {Promise<Object>} - Updated game
 */
gameSchema.methods.cancel = async function(userId, reason = '') {
  if (!this.isOrganizer(userId)) {
    throw new Error('Only the organizer can cancel this game');
  }
  
  if (this.status === 'cancelled') {
    throw new Error('Game is already cancelled');
  }
  
  if (this.status === 'completed') {
    throw new Error('Cannot cancel a completed game');
  }
  
  this.status = 'cancelled';
  this.cancellationReason = reason;
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  
  await this.save();
  return this;
};

/**
 * Get available slots count
 * @returns {number} - Number of available slots
 */
gameSchema.methods.getAvailableSlots = function() {
  return Math.max(0, this.maxPlayers - this.currentPlayers);
};

/**
 * Get participant list with details
 * @returns {Promise<Array>} - Array of participant details
 */
gameSchema.methods.getParticipantDetails = async function() {
  await this.populate('participants', 'name skillLevel profilePicture');
  return this.participants;
};

/**
 * Check if game is upcoming (within next 24 hours)
 * @returns {boolean} - True if game starts within 24 hours
 */
gameSchema.methods.isUpcoming = function() {
  const gameDate = new Date(this.date);
  const now = new Date();
  const hoursDiff = (gameDate - now) / (1000 * 60 * 60);
  return hoursDiff > 0 && hoursDiff <= 24;
};

/**
 * Get formatted date and time
 * @returns {Object} - Formatted date and time
 */
gameSchema.methods.getFormattedDateTime = function() {
  const date = new Date(this.date);
  return {
    date: date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    time: this.time,
    full: `${date.toLocaleDateString()} at ${this.time}`,
  };
};

// Virtual for participant count
gameSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Virtual for days until game
gameSchema.virtual('daysUntil').get(function() {
  const today = new Date();
  const gameDate = new Date(this.date);
  const diffTime = gameDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for sport display name
gameSchema.virtual('sportDisplayName').get(function() {
  const sportNames = {
    football: '⚽ Football',
    basketball: '🏀 Basketball',
    tennis: '🎾 Tennis',
    volleyball: '🏐 Volleyball',
    cricket: '🏏 Cricket',
    rugby: '🏉 Rugby',
    other: '⚡ Other Sport',
  };
  return sportNames[this.sport] || this.sport;
});

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;