const express = require('express');
const router = express.Router();

const controller = require('./auth.controller');
const validate = require('../../middleware/validate.middleware');
const authenticate = require('../../middleware/auth.middleware');
const { authLimiter } = require('../../middleware/rateLimiter.middleware');
const { loginRules, refreshRules, changePasswordRules } = require('./auth.validation');

router.post('/login', authLimiter, validate(loginRules), controller.login);
router.post('/refresh', validate(refreshRules), controller.refresh);
router.post('/logout', authenticate, validate(refreshRules), controller.logout);
router.get('/me', authenticate, controller.me);
router.patch(
  '/change-password',
  authenticate,
  validate(changePasswordRules),
  controller.changePassword
);

module.exports = router;