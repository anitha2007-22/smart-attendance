const express = require('express');
const router = express.Router();

const controller = require('./leave.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/rbac.middleware');
const validate = require('../../middleware/validate.middleware');
const { applyRules, reviewRules } = require('./leave.validation');
const { ROLES } = require('../../config/constants');

router.use(authenticate);

// Student
router.post('/', authorize(ROLES.STUDENT), validate(applyRules), controller.apply);
router.get('/my-requests', authorize(ROLES.STUDENT), controller.myRequests);

// Faculty
router.get('/pending', authorize(ROLES.FACULTY), controller.pendingForFaculty);
router.patch('/:id/review', authorize(ROLES.FACULTY), validate(reviewRules), controller.review);

// Admin
router.get('/', authorize(ROLES.ADMIN), controller.listAll);

module.exports = router;