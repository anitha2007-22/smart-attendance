const express = require('express');
const router = express.Router();

const controller = require('./attendance.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/rbac.middleware');
const validate = require('../../middleware/validate.middleware');
const { ROLES } = require('../../config/constants');
const { param, body } = require('express-validator');
const {
  startSessionRules,
  sessionIdParamRule,
  manualMarkRules,
  bulkManualMarkRules,
  scanMarkRules,
  codeMarkRules,
} = require('./attendance.validation');

router.use(authenticate);

// ---- Faculty: session lifecycle ----
router.get('/sessions/active', authorize(ROLES.FACULTY), controller.getActiveSession);
router.post(
  '/sessions/start',
  authorize(ROLES.FACULTY),
  validate(startSessionRules),
  controller.startSession
);
router.post(
  '/sessions/:id/end',
  authorize(ROLES.FACULTY),
  validate(sessionIdParamRule),
  controller.endSession
);
router.get(
  '/sessions/:id/qr',
  authorize(ROLES.FACULTY),
  validate(sessionIdParamRule),
  controller.getQr
);
router.get(
  '/sessions/:id/roster',
  authorize(ROLES.FACULTY),
  validate(sessionIdParamRule),
  controller.getRoster
);

// ---- Faculty: manual marking ----
router.post(
  '/sessions/:id/mark-manual',
  authorize(ROLES.FACULTY),
  validate(manualMarkRules),
  controller.markManual
);
router.post(
  '/sessions/:id/mark-manual-bulk',
  authorize(ROLES.FACULTY),
  validate(bulkManualMarkRules),
  controller.bulkMarkManual
);

// ---- Faculty: trust score review ----
router.get('/flagged', authorize(ROLES.FACULTY), controller.getFlagged);
router.patch(
  '/flagged/:recordId/review',
  authorize(ROLES.FACULTY),
  validate([param('recordId').isInt(), body('approve').isBoolean(), body('comment').optional().isString()]),
  controller.reviewFlagged
);

// ---- Student: scan + history ----
router.post('/scan', authorize(ROLES.STUDENT), validate(scanMarkRules), controller.scanQr);
router.post('/mark-by-code', authorize(ROLES.STUDENT), validate(codeMarkRules), controller.markByCode);
router.get('/my-history', authorize(ROLES.STUDENT), controller.myHistory);

// ---- Admin: browse all attendance records ----
router.get('/records', authorize(ROLES.ADMIN), controller.getAllRecords);

// ---- Faculty/Admin: view a specific student's history ----
router.get(
  '/students/:studentId/history',
  authorize(ROLES.FACULTY, ROLES.ADMIN),
  validate([param('studentId').isInt()]),
  controller.studentHistoryById
);

module.exports = router;
