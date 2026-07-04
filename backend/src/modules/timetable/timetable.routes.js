const express = require('express');
const router = express.Router();

const controller = require('./timetable.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/rbac.middleware');
const validate = require('../../middleware/validate.middleware');
const { createRules, updateRules, idParamRule } = require('./timetable.validation');
const { ROLES } = require('../../config/constants');

router.use(authenticate);

router.get('/', controller.getAll); // filterable by dept/semester/faculty/day - all roles can view
router.get('/my-schedule', authorize(ROLES.FACULTY), controller.myWeeklySchedule);
router.get('/:id', validate(idParamRule), controller.getOne);

router.post('/', authorize(ROLES.ADMIN), validate(createRules), controller.create);
router.put('/:id', authorize(ROLES.ADMIN), validate(updateRules), controller.update);
router.delete('/:id', authorize(ROLES.ADMIN), validate(idParamRule), controller.remove);

module.exports = router;