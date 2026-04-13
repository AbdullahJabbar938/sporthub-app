const { body, param, query, validationResult } = require('express-validator');

/**
 * Format validation errors
 */
const formatValidationErrors = (errors) => {
  return errors.array().map(err => ({
    field: err.path,
    message: err.msg,
    value: err.value,
  }));
};

/**
 * Handle validation results
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: formatValidationErrors(errors),
    });
  }
  next();
};

// ============= AUTH VALIDATION =============

/**
 * User registration validation
 */
const validateRegistration = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
  
  handleValidationErrors,
];

/**
 * User login validation
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  handleValidationErrors,
];

// ============= PROFILE VALIDATION =============

/**
 * Profile update validation
 */
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Name can only contain letters and spaces'),
  
  body('sportsPreferences')
    .optional()
    .isArray().withMessage('Sports preferences must be an array')
    .custom((value) => {
      const validSports = ['football', 'basketball', 'tennis', 'volleyball', 'cricket', 'rugby', 'other'];
      return value.every(sport => validSports.includes(sport));
    }).withMessage('Invalid sport preference'),
  
  body('bio')
    .optional()
    .isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
  
  body('skillLevel')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'professional'])
    .withMessage('Invalid skill level'),
  
  handleValidationErrors,
];

/**
 * Location update validation
 */
const validateLocationUpdate = [
  body('address')
    .trim()
    .notEmpty().withMessage('Address is required')
    .isLength({ max: 200 }).withMessage('Address cannot exceed 200 characters'),
  
  body('coordinates')
    .optional()
    .isArray().withMessage('Coordinates must be an array')
    .custom((value) => {
      return value.length === 2 && 
             value[0] >= -180 && value[0] <= 180 &&
             value[1] >= -90 && value[1] <= 90;
    }).withMessage('Invalid coordinates format'),
  
  handleValidationErrors,
];

// ============= GAME VALIDATION =============

/**
 * Game creation validation
 */
const validateCreateGame = [
  body('sport')
    .notEmpty().withMessage('Sport is required')
    .isIn(['football', 'basketball', 'tennis', 'volleyball', 'cricket', 'rugby', 'other'])
    .withMessage('Invalid sport selection'),
  
  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      const date = new Date(value);
      return date > new Date();
    }).withMessage('Game date must be in the future'),
  
  body('time')
    .notEmpty().withMessage('Time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format (HH:MM)'),
  
  body('location.address')
    .notEmpty().withMessage('Location address is required')
    .isLength({ max: 200 }).withMessage('Address cannot exceed 200 characters'),
  
  body('location.coordinates')
    .optional()
    .isArray().withMessage('Coordinates must be an array')
    .custom((value) => {
      return value.length === 2 && 
             value[0] >= -180 && value[0] <= 180 &&
             value[1] >= -90 && value[1] <= 90;
    }).withMessage('Invalid coordinates format'),
  
  body('maxPlayers')
    .notEmpty().withMessage('Maximum players is required')
    .isInt({ min: 2, max: 22 }).withMessage('Maximum players must be between 2 and 22'),
  
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  
  body('price')
    .optional()
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  
  body('skillLevelRequired')
    .optional()
    .isIn(['any', 'beginner', 'intermediate', 'advanced'])
    .withMessage('Invalid skill level'),
  
  handleValidationErrors,
];

/**
 * Game update validation
 */
const validateUpdateGame = [
  param('id')
    .isMongoId().withMessage('Invalid game ID'),
  
  body('sport')
    .optional()
    .isIn(['football', 'basketball', 'tennis', 'volleyball', 'cricket', 'rugby', 'other'])
    .withMessage('Invalid sport selection'),
  
  body('date')
    .optional()
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      const date = new Date(value);
      return date > new Date();
    }).withMessage('Game date must be in the future'),
  
  body('maxPlayers')
    .optional()
    .isInt({ min: 2, max: 22 }).withMessage('Maximum players must be between 2 and 22'),
  
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  
  handleValidationErrors,
];

/**
 * Game ID validation
 */
const validateGameId = [
  param('id')
    .isMongoId().withMessage('Invalid game ID format'),
  
  handleValidationErrors,
];

/**
 * User ID validation
 */
const validateUserId = [
  param('id')
    .isMongoId().withMessage('Invalid user ID format'),
  
  handleValidationErrors,
];

// ============= QUERY VALIDATION =============

/**
 * Browse games query validation
 */
const validateBrowseGames = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
    .toInt(),
  
  query('sport')
    .optional()
    .isIn(['football', 'basketball', 'tennis', 'volleyball', 'cricket', 'rugby', 'other', 'all'])
    .withMessage('Invalid sport filter'),
  
  query('lat')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  
  query('lng')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  
  query('radius')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Radius must be between 1 and 100 km')
    .toInt(),
  
  query('status')
    .optional()
    .isIn(['open', 'full', 'all']).withMessage('Invalid status filter'),
  
  handleValidationErrors,
];

module.exports = {
  // Auth
  validateRegistration,
  validateLogin,
  
  // Profile
  validateProfileUpdate,
  validateLocationUpdate,
  
  // Game
  validateCreateGame,
  validateUpdateGame,
  validateGameId,
  validateBrowseGames,
  
  // User
  validateUserId,
};