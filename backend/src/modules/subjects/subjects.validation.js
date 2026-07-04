const { body, param } = require('express-validator');

const createRules = [
  body('name').trim().notEmpty().withMessage('Subject name is required').isLength({ max: 150 }),
  body('code').trim().notEmpty().withMessage('Subject code is required').isLength({ max: 30 }).toUpperCase(),
  body('department_id').isInt().withMessage('Valid department is required'),
  body('semester').isInt({ min: 1, max: 12 }).withMessage('Semester must be between 1 and 12'),
  body('credits').optional().isInt({ min: 1, max: 10 }),
];

const updateRules = [
  param('id').isInt(),
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('code').optional().trim().notEmpty().isLength({ max: 30 }).toUpperCase(),
  body('department_id').optional().isInt(),
  body('semester').optional().isInt({ min: 1, max: 12 }),
  body('credits').optional().isInt({ min: 1, max: 10 }),
];

const idParamRule = [param('id').isInt().withMessage('Invalid subject id')];

module.exports = { createRules, updateRules, idParamRule };