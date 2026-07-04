const express = require('express');
const router = express.Router();

const controller = require('./analytics.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/rbac.middleware');
const validate = require('../../middleware/validate.middleware');
const { param } = require('express-validator');
const { ROLES } = require('../../config/constants');

router.use(authenticate);

// Admin/Faculty dashboards
router.get('/overview', authorize(ROLES.ADMIN), controller.overview);
router.get('/daily', authorize(ROLES.ADMIN, ROLES.FACULTY), controller.daily);
router.get('/weekly', authorize(ROLES.ADMIN, ROLES.FACULTY), controller.weekly);
router.get('/monthly', authorize(ROLES.ADMIN, ROLES.FACULTY), controller.monthly);
router.get('/subject-wise', authorize(ROLES.ADMIN, ROLES.FACULTY), controller.subjectWise);
router.get('/department-wise', authorize(ROLES.ADMIN), controller.departmentWise);
router.get('/low-attendance', authorize(ROLES.ADMIN, ROLES.FACULTY), controller.lowAttendance);

// Student self-service
router.get('/my-percentage', authorize(ROLES.STUDENT), controller.myPercentage);
router.get('/my-subject-wise', authorize(ROLES.STUDENT), controller.mySubjectWise);

// Faculty/Admin viewing a specific student
router.get(
  '/students/:studentId/percentage',
  authorize(ROLES.ADMIN, ROLES.FACULTY),
  validate([param('studentId').isInt()]),
  controller.studentPercentageById
);

module.exports = router;