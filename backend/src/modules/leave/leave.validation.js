const { body, param } = require('express-validator');

const applyRules = [
  body('from_date').isISO8601().withMessage('Valid from_date is required'),
  body('to_date').isISO8601().withMessage('Valid to_date is required'),
  body('reason').trim().notEmpty().withMessage('Reason is required').isLength({ max: 1000 }),
];

const reviewRules = [
  param('id').isInt(),
  body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  body('review_comment').optional().trim().isLength({ max: 500 }),
];

const idParamRule = [param('id').isInt().withMessage('Invalid leave request id')];

module.exports = { applyRules, reviewRules, idParamRule };