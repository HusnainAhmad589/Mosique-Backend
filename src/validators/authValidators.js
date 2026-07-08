const { body } = require('express-validator');

/**
 * Validation rules for POST /api/auth/register
 */
const registerValidators = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required.')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be 3–50 characters.')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 4 }).withMessage('Password must be at least 4 characters.'),

  body('display_name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Display name cannot exceed 100 characters.'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('Address cannot exceed 255 characters.'),
];

/**
 * Validation rules for POST /api/auth/login
 */
const loginValidators = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

const changePasswordValidators = [
  body('old_password')
    .notEmpty().withMessage('Old password is required.'),

  body('new_password')
    .notEmpty().withMessage('New password is required.')
    .isLength({ min: 4 }).withMessage('New password must be at least 4 characters.'),
];

const forgotPasswordValidators = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),
];

const resetPasswordValidators = [
  body('token')
    .notEmpty().withMessage('Token is required.'),

  body('new_password')
    .notEmpty().withMessage('New password is required.')
    .isLength({ min: 4 }).withMessage('New password must be at least 4 characters.'),
];

module.exports = { registerValidators, loginValidators, changePasswordValidators, forgotPasswordValidators, resetPasswordValidators };
