const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Game = require('../models/Game'); // Import Game model for dashboard endpoints
const { protect } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

/**
 * @route   GET /api/users/:id/profile
 * @desc    Get user profile by ID
 * @access  Private (user can only access their own profile)
 */
router.get('/:id/profile', protect, async (req, res) => {
  try {
    // Check if user is accessing their own profile
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your own profile'
      });
    }

    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    
    // Handle invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
});

/**
 * @route   PUT /api/users/:id/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/:id/profile', [
  protect,
  body('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('sportsPreferences').optional().isArray().withMessage('Sports preferences must be an array')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }

    // Check if user is updating their own profile
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile'
      });
    }

    const { name, sportsPreferences, bio, skillLevel } = req.body;
    
    // Build update object (only include fields that are provided)
    const updateFields = {};
    if (name) updateFields.name = name;
    if (sportsPreferences) updateFields.sportsPreferences = sportsPreferences;
    if (bio !== undefined) updateFields.bio = bio;
    if (skillLevel) updateFields.skillLevel = skillLevel;
    updateFields.updatedAt = Date.now();

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      user,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
});

/**
 * @route   PUT /api/users/:id/location
 * @desc    Update user location
 * @access  Private
 */
router.put('/:id/location', protect, async (req, res) => {
  try {
    // Check if user is updating their own profile
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own location'
      });
    }

    const { coordinates, address, placeId } = req.body;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Valid coordinates [longitude, latitude] are required'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        location: {
          type: 'Point',
          coordinates,
          address: address || '',
          placeId: placeId || ''
        },
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      user,
      message: 'Location updated successfully'
    });

  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating location'
    });
  }
});

// ============================================
// DASHBOARD ENDPOINTS
// ============================================

/**
 * @route   GET /api/users/:id/games/hosting
 * @desc    Get games hosted by user
 * @access  Private
 */
router.get('/:id/games/hosting', protect, async (req, res) => {
  try {
    // Check if user is accessing their own data
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this data'
      });
    }

    const games = await Game.find({
      organizer: req.params.id,
      date: { $gte: new Date() },
      status: { $ne: 'cancelled' }
    })
      .sort({ date: 1 })
      .populate('organizer', 'name email')
      .populate('participants', 'name email');

    res.json({
      success: true,
      games
    });

  } catch (error) {
    console.error('Get hosted games error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching hosted games'
    });
  }
});

/**
 * @route   GET /api/users/:id/games/joined
 * @desc    Get games joined by user (excluding games they organized)
 * @access  Private
 */
router.get('/:id/games/joined', protect, async (req, res) => {
  try {
    // Check if user is accessing their own data
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this data'
      });
    }

    const games = await Game.find({
      participants: req.params.id,
      organizer: { $ne: req.params.id }, // Exclude games they organized
      date: { $gte: new Date() },
      status: { $ne: 'cancelled' }
    })
      .sort({ date: 1 })
      .populate('organizer', 'name email')
      .populate('participants', 'name email');

    res.json({
      success: true,
      games
    });

  } catch (error) {
    console.error('Get joined games error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching joined games'
    });
  }
});

/**
 * @route   GET /api/users/:id/games/all
 * @desc    Get all games (both hosted and joined)
 * @access  Private
 */
router.get('/:id/games/all', protect, async (req, res) => {
  try {
    // Check if user is accessing their own data
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this data'
      });
    }

    const hostedGames = await Game.find({
      organizer: req.params.id,
      date: { $gte: new Date() },
      status: { $ne: 'cancelled' }
    })
      .sort({ date: 1 })
      .populate('organizer', 'name email')
      .populate('participants', 'name email');

    const joinedGames = await Game.find({
      participants: req.params.id,
      organizer: { $ne: req.params.id },
      date: { $gte: new Date() },
      status: { $ne: 'cancelled' }
    })
      .sort({ date: 1 })
      .populate('organizer', 'name email')
      .populate('participants', 'name email');

    res.json({
      success: true,
      hosted: hostedGames,
      joined: joinedGames
    });

  } catch (error) {
    console.error('Get all games error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching games'
    });
  }
});

module.exports = router;