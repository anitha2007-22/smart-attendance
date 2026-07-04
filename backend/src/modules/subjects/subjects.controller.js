const asyncHandler = require('../../utils/asyncHandler');
const { success, paginationMeta } = require('../../utils/apiResponse');
const { getPagination, getSort } = require('../../utils/queryHelpers');
const service = require('./subjects.service');

const ALLOWED_SORT = ['id', 'name', 'code', 'semester', 'created_at'];

const getAll = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req);
  const { sortBy, sortOrder } = getSort(req, ALLOWED_SORT, 'name');
  const { rows, total } = await service.list({
    search: req.query.search,
    department_id: req.query.department_id,
    semester: req.query.semester,
    limit,
    offset,
    sortBy,
    sortOrder,
  });
  return success(res, 200, 'Subjects fetched', rows, paginationMeta(page, limit, total));
});

const getOne = asyncHandler(async (req, res) => {
  const subject = await service.getById(req.params.id);
  return success(res, 200, 'Subject fetched', subject);
});

const create = asyncHandler(async (req, res) => {
  const subject = await service.create(req.body);
  return success(res, 201, 'Subject created', subject);
});

const update = asyncHandler(async (req, res) => {
  const subject = await service.update(req.params.id, req.body);
  return success(res, 200, 'Subject updated', subject);
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  return success(res, 200, 'Subject deleted');
});

const assignFaculty = asyncHandler(async (req, res) => {
  const result = await service.assignFaculty(req.params.id, req.body.faculty_id);
  return success(res, 200, 'Faculty assigned to subject', result);
});

const unassignFaculty = asyncHandler(async (req, res) => {
  await service.unassignFaculty(req.params.id, req.params.facultyId);
  return success(res, 200, 'Faculty unassigned from subject');
});

const getAssignedFaculty = asyncHandler(async (req, res) => {
  const rows = await service.getAssignedFaculty(req.params.id);
  return success(res, 200, 'Assigned faculty fetched', rows);
});

module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove,
  assignFaculty,
  unassignFaculty,
  getAssignedFaculty,
};