const express = require('express');
const router = express.Router();

const controller = require('./subjects.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/rbac.middleware');
const validate = require('../../middleware/validate.middleware');
const { createRules, updateRules, idParamRule } = require('./subjects.validation');
const { ROLES } = require('../../config/constants');
const { param, body } = require('express-validator');

router.use(authenticate);

router.get('/', controller.getAll);
router.get('/:id', validate(idParamRule), controller.getOne);
router.get('/:id/faculty', validate(idParamRule), controller.getAssignedFaculty);

router.post('/', authorize(ROLES.ADMIN), validate(createRules), controller.create);
router.put('/:id', authorize(ROLES.ADMIN), validate(updateRules), controller.update);
router.delete('/:id', authorize(ROLES.ADMIN), validate(idParamRule), controller.remove);

router.post(
  '/:id/assign-faculty',
  authorize(ROLES.ADMIN),
  validate([param('id').isInt(), body('faculty_id').isInt()]),
  controller.assignFaculty
);
router.delete(
  '/:id/faculty/:facultyId',
  authorize(ROLES.ADMIN),
  validate([param('id').isInt(), param('facultyId').isInt()]),
  controller.unassignFaculty
);

module.exports = router;