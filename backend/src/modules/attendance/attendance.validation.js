const { body, param } = require('express-validator');

const startSessionRules = [
  body('timetable_id').optional().isInt(),
  body('subject_id').isInt().withMessage('Valid subject is required'),
  body('department_id').isInt().withMessage('Valid department is required'),
  body('semester').isInt({ min: 1, max: 12 }),
];

const sessionIdParamRule = [param('id').isInt().withMessage('Invalid session id')];

const manualMarkRules = [
  param('id').isInt(),
  body('student_id').isInt().withMessage('Valid student is required'),
  body('status').optional().isIn(['present', 'absent', 'late']),
];

const bulkManualMarkRules = [
  param('id').isInt(),
  body('records').isArray({ min: 1 }).withMessage('records must be a non-empty array'),
  body('records.*.student_id').isInt(),
  body('records.*.status').isIn(['present', 'absent', 'late']),
];

const scanMarkRules = [
  body('qr_token').notEmpty().withMessage('QR token is required'),
];

const codeMarkRules = [
  body('code')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('Code must be exactly 6 digits')
    .isNumeric()
    .withMessage('Code must be numeric'),
];

module.exports = {
  startSessionRules,
  sessionIdParamRule,
  manualMarkRules,
  bulkManualMarkRules,
  scanMarkRules,
  codeMarkRules,
};
