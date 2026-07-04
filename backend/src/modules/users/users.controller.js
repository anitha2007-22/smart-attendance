const asyncHandler = require('../../utils/asyncHandler');
const { success, paginationMeta } = require('../../utils/apiResponse');
const { getPagination, getSort } = require('../../utils/queryHelpers');
const service = require('./users.service');

const STUDENT_SORT = ['id', 'roll_no', 'semester', 'batch_year', 'name'];
const FACULTY_SORT = ['id', 'employee_code', 'name'];

// ---- Students ----
const getStudents = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req);
  const { sortBy, sortOrder } = getSort(req, STUDENT_SORT, 'roll_no');
  const { rows, total } = await service.listStudents({
    search: req.query.search,
    department_id: req.query.department_id,
    semester: req.query.semester,
    limit,
    offset,
    sortBy,
    sortOrder,
  });
  return success(res, 200, 'Students fetched', rows, paginationMeta(page, limit, total));
});

const getStudent = asyncHandler(async (req, res) => {
  const student = await service.getStudentById(req.params.id);
  return success(res, 200, 'Student fetched', student);
});

const createStudent = asyncHandler(async (req, res) => {
  const student = await service.createStudent(req.body);
  return success(res, 201, 'Student created', student);
});

const updateStudent = asyncHandler(async (req, res) => {
  const student = await service.updateStudent(req.params.id, req.body);
  return success(res, 200, 'Student updated', student);
});

const deleteStudent = asyncHandler(async (req, res) => {
  await service.deleteStudent(req.params.id);
  return success(res, 200, 'Student deleted');
});

// ---- Faculty ----
const getFacultyList = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req);
  const { sortBy, sortOrder } = getSort(req, FACULTY_SORT, 'employee_code');
  const { rows, total } = await service.listFaculty({
    search: req.query.search,
    department_id: req.query.department_id,
    limit,
    offset,
    sortBy,
    sortOrder,
  });
  return success(res, 200, 'Faculty fetched', rows, paginationMeta(page, limit, total));
});

const getFacultyOne = asyncHandler(async (req, res) => {
  const faculty = await service.getFacultyById(req.params.id);
  return success(res, 200, 'Faculty fetched', faculty);
});

const createFaculty = asyncHandler(async (req, res) => {
  const faculty = await service.createFaculty(req.body);
  return success(res, 201, 'Faculty created', faculty);
});

const updateFaculty = asyncHandler(async (req, res) => {
  const faculty = await service.updateFaculty(req.params.id, req.body);
  return success(res, 200, 'Faculty updated', faculty);
});

const deleteFaculty = asyncHandler(async (req, res) => {
  await service.deleteFaculty(req.params.id);
  return success(res, 200, 'Faculty deleted');
});

module.exports = {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getFacultyList,
  getFacultyOne,
  createFaculty,
  updateFaculty,
  deleteFaculty,
};