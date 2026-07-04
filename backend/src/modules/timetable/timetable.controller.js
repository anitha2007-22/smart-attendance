const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./timetable.service');

const getAll = asyncHandler(async (req, res) => {
  const rows = await service.list({
    department_id: req.query.department_id,
    semester: req.query.semester,
    faculty_id: req.query.faculty_id,
    day_of_week: req.query.day_of_week,
  });
  return success(res, 200, 'Timetable fetched', rows);
});

const getOne = asyncHandler(async (req, res) => {
  const entry = await service.getById(req.params.id);
  return success(res, 200, 'Timetable entry fetched', entry);
});

const create = asyncHandler(async (req, res) => {
  const entry = await service.create(req.body);
  return success(res, 201, 'Timetable entry created', entry);
});

const update = asyncHandler(async (req, res) => {
  const entry = await service.update(req.params.id, req.body);
  return success(res, 200, 'Timetable entry updated', entry);
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  return success(res, 200, 'Timetable entry deleted');
});

const myWeeklySchedule = asyncHandler(async (req, res) => {
  const { query } = require('../../config/db');
  const facRes = await query('SELECT id FROM faculty WHERE user_id = $1', [req.user.id]);
  if (!facRes.rows[0]) return success(res, 200, 'No faculty profile found', []);
  const rows = await service.getFacultyWeeklySchedule(facRes.rows[0].id);
  return success(res, 200, 'Weekly schedule fetched', rows);
});

module.exports = { getAll, getOne, create, update, remove, myWeeklySchedule };