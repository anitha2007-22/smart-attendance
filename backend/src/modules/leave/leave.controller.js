const asyncHandler = require('../../utils/asyncHandler');
const { success, paginationMeta } = require('../../utils/apiResponse');
const { getPagination } = require('../../utils/queryHelpers');
const service = require('./leave.service');

const apply = asyncHandler(async (req, res) => {
  const leave = await service.apply(req.user.id, req.body);
  return success(res, 201, 'Leave request submitted', leave);
});

const myRequests = asyncHandler(async (req, res) => {
  const rows = await service.myRequests(req.user.id);
  return success(res, 200, 'Your leave requests fetched', rows);
});

const pendingForFaculty = asyncHandler(async (req, res) => {
  const rows = await service.pendingForFaculty(req.user.id);
  return success(res, 200, 'Pending leave requests fetched', rows);
});

const review = asyncHandler(async (req, res) => {
  const leave = await service.review(req.params.id, req.user.id, req.body);
  return success(res, 200, `Leave request ${req.body.status}`, leave);
});

const listAll = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req);
  const { rows, total } = await service.listAll({
    status: req.query.status,
    department_id: req.query.department_id,
    limit,
    offset,
  });
  return success(res, 200, 'Leave requests fetched', rows, paginationMeta(page, limit, total));
});

module.exports = { apply, myRequests, pendingForFaculty, review, listAll };