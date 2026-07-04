const express = require('express');
const router = express.Router();

const controller = require('./notifications.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/rbac.middleware');
const validate = require('../../middleware/validate.middleware');
const { ROLES } = require('../../config/constants');
const { param, body } = require('express-validator');

router.use(authenticate);

router.get('/', controller.getMy);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', validate([param('id').isInt()]), controller.markRead);
router.delete('/:id', validate([param('id').isInt()]), controller.remove);

router.post(
  '/broadcast',
  authorize(ROLES.ADMIN),
  validate([
    body('title').trim().notEmpty(),
    body('message').trim().notEmpty(),
    body('type').optional().isIn([
      'low_attendance', 'attendance_shortage', 'leave_approved',
      'leave_rejected', 'session_started', 'general',
    ]),
    body('role').optional().isIn(['admin', 'faculty', 'student']),
    body('department_id').optional().isInt(),
  ]),
  controller.broadcast
);

module.exports = router;