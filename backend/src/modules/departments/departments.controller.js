const asyncHandler = require('../../utils/asyncHandler');
const { success, paginationMeta } = require('../../utils/apiResponse');
const { getPagination, getSort } = require('../../utils/queryHelpers');
const service = require('./departments.service');

const ALLOWED_SORT = ['id', 'name', 'code', 'created_at'];

const getAll = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req);
  const { sortBy, sortOrder } = getSort(req, ALLOWED_SORT, 'name');
  const { rows, total } = await service.list({
    search: req.query.search,
    limit,
    offset,
    sortBy,
    sortOrder,
  });
  return success(res, 200, 'Departments fetched', rows, paginationMeta(page, limit, total));
});

const getOne = asyncHandler(async (req, res) => {
  const dept = await service.getById(req.params.id);
  return success(res, 200, 'Department fetched', dept);
});

const create = asyncHandler(async (req, res) => {
  const dept = await service.create(req.body);
  return success(res, 201, 'Department created', dept);
});

const update = asyncHandler(async (req, res) => {
  const dept = await service.update(req.params.id, req.body);
  return success(res, 200, 'Department updated', dept);
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id);
  return success(res, 200, 'Department deleted');
});

module.exports = { getAll, getOne, create, update, remove };