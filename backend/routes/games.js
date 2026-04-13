const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const { protect } = require('../middleware/auth');
const { validateCreateGame, validateGameId } = require('../middleware/validation');
const logger = require('../utils/logger');

// ============= CREATE GAME =============
// @desc    Create new game
// @route   POST /api/games
router.post('/', protect, validateCreateGame, async (req, res) => {
  try {
    const gameData = {
      ...req.body,
      organizer: req.user._id,
      participants: [req.user._id],
      currentPlayers: 1
    };

    const game = new Game(gameData);
    await game.save();
    await game.populate('organizer', 'name');

    logger.info(`Game created: ${game._id} by user ${req.user._id}`);

    res.status(201).json({
      success: true,
      game
    });

  } catch (error) {
    logger.error('Create game error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating game'
    });
  }
});

// ============= GET ALL GAMES =============
// @desc    Get all games (with filters)
// @route   GET /api/games
// IMPORTANT: This route MUST come before /:id
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, sport, lat, lng, radius = 10 } = req.query;
    
    let query = { 
      status: { $in: ['open', 'full'] },
      date: { $gte: new Date() }
    };
    
    if (sport && sport !== 'all') {
      query.sport = sport;
    }
    
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radius * 1000
        }
      };
    }

    const games = await Game.find(query)
      .sort({ date: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('organizer', 'name')
      .populate('participants', 'name');

    const total = await Game.countDocuments(query);

    res.json({
      success: true,
      games,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    logger.error('Get games error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching games'
    });
  }
});

// ============= GET SINGLE GAME =============
// @desc    Get single game by ID
// @route   GET /api/games/:id
// IMPORTANT: This route comes AFTER the GET / route
router.get('/:id', validateGameId, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate('organizer', 'name email sportsPreferences')
      .populate('participants', 'name skillLevel');

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    res.json({
      success: true,
      game
    });

  } catch (error) {
    logger.error('Get single game error:', error);
    
    // Handle invalid ObjectId format
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Invalid game ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error fetching game'
    });
  }
});

// ============= JOIN GAME =============
// @desc    Join a game
// @route   POST /api/games/:id/join
router.post('/:id/join', protect, validateGameId, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    // Check if user can join
    if (game.isOrganizer(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You are the organizer of this game'
      });
    }
    
    if (game.isFull()) {
      return res.status(400).json({
        success: false,
        message: 'Game is full'
      });
    }
    
    if (game.hasJoined(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You have already joined this game'
      });
    }
    
    await game.addParticipant(req.user._id);
    await game.populate('organizer', 'name');
    await game.populate('participants', 'name');
    
    logger.info(`User ${req.user._id} joined game ${game._id}`);
    
    res.json({
      success: true,
      game
    });
    
  } catch (error) {
    logger.error('Join game error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error joining game'
    });
  }
});

// ============= LEAVE GAME =============
// @desc    Leave a game
// @route   DELETE /api/games/:id/leave
router.delete('/:id/leave', protect, validateGameId, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    // Check if user is participant
    if (!game.hasJoined(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You are not a participant in this game'
      });
    }
    
    // Cannot leave if you're the organizer
    if (game.isOrganizer(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'Organizers cannot leave. Use Cancel Game instead.'
      });
    }
    
    await game.removeParticipant(req.user._id);
    await game.populate('organizer', 'name');
    await game.populate('participants', 'name');
    
    logger.info(`User ${req.user._id} left game ${game._id}`);
    
    res.json({
      success: true,
      game
    });
    
  } catch (error) {
    logger.error('Leave game error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error leaving game'
    });
  }
});

// ============= CANCEL GAME =============
// @desc    Cancel a game (organizer only)
// @route   PUT /api/games/:id/cancel
router.put('/:id/cancel', protect, validateGameId, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    // Check if user is organizer
    if (!game.isOrganizer(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the organizer can cancel this game'
      });
    }
    
    if (game.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Game is already cancelled'
      });
    }
    
    game.status = 'cancelled';
    game.cancellationReason = req.body.reason || '';
    game.cancelledAt = new Date();
    game.cancelledBy = req.user._id;
    await game.save();
    
    logger.info(`Game ${game._id} cancelled by ${req.user._id}`);
    
    res.json({
      success: true,
      message: 'Game cancelled successfully',
      game
    });
    
  } catch (error) {
    logger.error('Cancel game error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error cancelling game'
    });
  }
});

module.exports = router;