const { body, param } = require('express-validator');

const createStudentRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('roll_no').trim().notEmpty().withMessage('Roll number is required'),
  body('department_id').isInt().withMessage('Valid department is required'),
  body('semester').isInt({ min: 1, max: 12 }),
  body('batch_year').isInt({ min: 2000, max: 2100 }),
  body('parent_contact').optional().trim().isLength({ max: 20 }),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const updateStudentRules = [
  param('id').isInt(),
  body('name').optional().trim().notEmpty(),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('roll_no').optional().trim().notEmpty(),
  body('department_id').optional().isInt(),
  body('semester').optional().isInt({ min: 1, max: 12 }),
  body('batch_year').optional().isInt({ min: 2000, max: 2100 }),
  body('parent_contact').optional().trim().isLength({ max: 20 }),
  body('is_active').optional().isBoolean(),
];

const createFacultyRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('employee_code').trim().notEmpty().withMessage('Employee code is required'),
  body('department_id').isInt().withMessage('Valid department is required'),
  body('designation').optional().trim().isLength({ max: 100 }),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const updateFacultyRules = [
  param('id').isInt(),
  body('name').optional().trim().notEmpty(),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('employee_code').optional().trim().notEmpty(),
  body('department_id').optional().isInt(),
  body('designation').optional().trim().isLength({ max: 100 }),
  body('is_active').optional().isBoolean(),
];

const idParamRule = [param('id').isInt().withMessage('Invalid id')];

module.exports = {
  createStudentRules,
  updateStudentRules,
  createFacultyRules,
  updateFacultyRules,
  idParamRule,
};