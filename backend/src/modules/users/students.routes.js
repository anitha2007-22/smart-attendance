const express = require('express');
const router = express.Router();

const controller = require('./users.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/rbac.middleware');
const validate = require('../../middleware/validate.middleware');
const { createStudentRules, updateStudentRules, idParamRule } = require('./users.validation');
const { ROLES } = require('../../config/constants');

router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/', controller.getStudents);
router.get('/:id', validate(idParamRule), controller.getStudent);
router.post('/', validate(createStudentRules), controller.createStudent);
router.put('/:id', validate(updateStudentRules), controller.updateStudent);
router.delete('/:id', validate(idParamRule), controller.deleteStudent);

module.exports = router;