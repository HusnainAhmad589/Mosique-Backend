'use strict';

const { body, query, param, validationResult } = require('express-validator');

const validateResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

const createSongValidation = [
  body('title').trim().notEmpty().withMessage('Song title is required').isLength({ max: 150 }).withMessage('Title too long'),
  body('categoryId').isInt({ min: 1 }).withMessage('Valid category ID is required'),
  body('albumId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid album ID'),
  body('scheduledAt').optional({ nullable: true }).isISO8601().withMessage('Invalid ISO date string for scheduledAt'),
  validateResult
];

const updateSongStatusValidation = [
  param('id').isInt({ min: 1 }).withMessage('Invalid song ID'),
  body('status').isIn(['draft', 'pending_review', 'scheduled', 'published', 'archived']).withMessage('Invalid song status'),
  validateResult
];

const createAlbumValidation = [
  body('title').trim().notEmpty().withMessage('Album title is required').isLength({ max: 150 }),
  body('genre').optional().trim().isLength({ max: 50 }),
  validateResult
];

const catalogQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['newest', 'popular', 'title', 'oldest']).withMessage('Invalid sortBy parameter'),
  validateResult
];

module.exports = {
  createSongValidation,
  updateSongStatusValidation,
  createAlbumValidation,
  catalogQueryValidation
};
