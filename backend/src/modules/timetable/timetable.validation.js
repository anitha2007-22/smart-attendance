const { body, param } = require('express-validator');

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const createRules = [
  body('subject_id').isInt().withMessage('Valid subject is required'),
  body('faculty_id').isInt().withMessage('Valid faculty is required'),
  body('department_id').isInt().withMessage('Valid department is required'),
  body('semester').isInt({ min: 1, max: 12 }),
  body('day_of_week').isIn(DAYS).withMessage('Invalid day of week'),
  body('start_time').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('start_time must be HH:MM'),
  body('end_time').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('end_time must be HH:MM'),
  body('room_no').optional().trim().isLength({ max: 30 }),
];

const updateRules = [
  param('id').isInt(),
  body('subject_id').optional().isInt(),
  body('faculty_id').optional().isInt(),
  body('department_id').optional().isInt(),
  body('semester').optional().isInt({ min: 1, max: 12 }),
  body('day_of_week').optional().isIn(DAYS),
  body('start_time').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('end_time').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
  body('room_no').optional().trim().isLength({ max: 30 }),
];

const idParamRule = [param('id').isInt().withMessage('Invalid timetable id')];

module.exports = { createRules, updateRules, idParamRule };