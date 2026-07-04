const express = require('express');
const router = express.Router();

const controller = require('./users.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/rbac.middleware');
const validate = require('../../middleware/validate.middleware');
const { createFacultyRules, updateFacultyRules, idParamRule } = require('./users.validation');
const { ROLES } = require('../../config/constants');

router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/', controller.getFacultyList);
router.get('/:id', validate(idParamRule), controller.getFacultyOne);
router.post('/', validate(createFacultyRules), controller.createFaculty);
router.put('/:id', validate(updateFacultyRules), controller.updateFaculty);
router.delete('/:id', validate(idParamRule), controller.deleteFaculty);

module.exports = router;