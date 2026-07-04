const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const { query } = require('../../config/db');
const service = require('./analytics.service');

const overview = asyncHandler(async (req, res) => {
  const data = await service.getOverview();
  return success(res, 200, 'Overview analytics fetched', data);
});

const daily = asyncHandler(async (req, res) => {
  const data = await service.dailyAttendance({
    days: parseInt(req.query.days, 10) || 14,
    department_id: req.query.department_id,
    subject_id: req.query.subject_id,
  });
  return success(res, 200, 'Daily attendance trend fetched', data);
});

const weekly = asyncHandler(async (req, res) => {
  const data = await service.weeklyAttendance({
    weeks: parseInt(req.query.weeks, 10) || 8,
    department_id: req.query.department_id,
  });
  return success(res, 200, 'Weekly attendance trend fetched', data);
});

const monthly = asyncHandler(async (req, res) => {
  const data = await service.monthlyAttendance({
    months: parseInt(req.query.months, 10) || 6,
    department_id: req.query.department_id,
  });
  return success(res, 200, 'Monthly attendance trend fetched', data);
});

const subjectWise = asyncHandler(async (req, res) => {
  const data = await service.subjectWiseAttendance({ department_id: req.query.department_id });
  return success(res, 200, 'Subject-wise attendance fetched', data);
});

const departmentWise = asyncHandler(async (req, res) => {
  const data = await service.departmentWiseAttendance();
  return success(res, 200, 'Department-wise attendance fetched', data);
});

const lowAttendance = asyncHandler(async (req, res) => {
  const data = await service.lowAttendanceStudents({
    threshold: req.query.threshold ? parseFloat(req.query.threshold) : undefined,
    department_id: req.query.department_id,
  });
  return success(res, 200, 'Low attendance students fetched', data);
});

// Student-facing
const myPercentage = asyncHandler(async (req, res) => {
  const studentRes = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
  const data = await service.studentAttendancePercentage(studentRes.rows[0].id, {
    subject_id: req.query.subject_id,
  });
  return success(res, 200, 'Attendance percentage fetched', data);
});

const mySubjectWise = asyncHandler(async (req, res) => {
  const studentRes = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
  const data = await service.studentSubjectWiseAttendance(studentRes.rows[0].id);
  return success(res, 200, 'Subject-wise attendance fetched', data);
});

const studentPercentageById = asyncHandler(async (req, res) => {
  const data = await service.studentAttendancePercentage(req.params.studentId, {
    subject_id: req.query.subject_id,
  });
  return success(res, 200, 'Attendance percentage fetched', data);
});

module.exports = {
  overview,
  daily,
  weekly,
  monthly,
  subjectWise,
  departmentWise,
  lowAttendance,
  myPercentage,
  mySubjectWise,
  studentPercentageById,
};