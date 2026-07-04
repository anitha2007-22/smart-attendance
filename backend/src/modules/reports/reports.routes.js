const express = require('express');
const router = express.Router();

const controller = require('./reports.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/rbac.middleware');
const validate = require('../../middleware/validate.middleware');
const { param } = require('express-validator');
const { ROLES } = require('../../config/constants');

router.use(authenticate, authorize(ROLES.ADMIN, ROLES.FACULTY));

router.get('/summary/pdf', controller.summaryPdf);
router.get('/summary/excel', controller.summaryExcel);
router.get(
  '/session/:sessionId/pdf',
  validate([param('sessionId').isInt()]),
  controller.sessionPdf
);
router.get(
  '/session/:sessionId/excel',
  validate([param('sessionId').isInt()]),
  controller.sessionExcel
);

module.exports = router;