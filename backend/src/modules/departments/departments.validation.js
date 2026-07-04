const { body, param } = require('express-validator');

const createRules = [
  body('name').trim().notEmpty().withMessage('Department name is required').isLength({ max: 150 }),
  body('code').trim().notEmpty().withMessage('Department code is required').isLength({ max: 20 }).toUpperCase(),
];

const updateRules = [
  param('id').isInt().withMessage('Invalid department id'),
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('code').optional().trim().notEmpty().isLength({ max: 20 }).toUpperCase(),
];

const idParamRule = [param('id').isInt().withMessage('Invalid department id')];

module.exports = { createRules, updateRules, idParamRule };