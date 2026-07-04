const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const service = require('./attendance.service');

// ---- Faculty: session lifecycle ----

const startSession = asyncHandler(async (req, res) => {
  const session = await service.startSession(req.user.id, req.body);
  return success(res, 201, 'Attendance session started', session);
});

const getActiveSession = asyncHandler(async (req, res) => {
  const session = await service.getActiveSession(req.user.id);
  return success(res, 200, 'Active session checked', session);
});

const endSession = asyncHandler(async (req, res) => {
  const session = await service.endSession(req.params.id, req.user.id);
  return success(res, 200, 'Attendance session ended', session);
});

const getQr = asyncHandler(async (req, res) => {
  const qr = await service.getCurrentQr(req.params.id, req.user.id);
  return success(res, 200, 'QR code generated', qr);
});

const getRoster = asyncHandler(async (req, res) => {
  const data = await service.getSessionRoster(req.params.id, req.user.id);
  return success(res, 200, 'Session roster fetched', data);
});

// ---- Faculty: manual marking ----

const markManual = asyncHandler(async (req, res) => {
  const record = await service.markManual(req.params.id, req.user.id, req.body);
  return success(res, 200, 'Attendance marked manually', record);
});

const bulkMarkManual = asyncHandler(async (req, res) => {
  const records = await service.bulkMarkManual(req.params.id, req.user.id, req.body.records);
  return success(res, 200, 'Bulk attendance marked', records);
});

// ---- Faculty: trust review ----

const getFlagged = asyncHandler(async (req, res) => {
  const rows = await service.getFlaggedRecords(req.user.id, {
    limit: parseInt(req.query.limit, 10) || 50,
    offset: parseInt(req.query.offset, 10) || 0,
  });
  return success(res, 200, 'Flagged records fetched', rows);
});

const reviewFlagged = asyncHandler(async (req, res) => {
  const record = await service.reviewFlaggedRecord(req.params.recordId, req.user.id, req.body);
  return success(res, 200, 'Attendance record reviewed', record);
});

// ---- Student: scan QR ----

const scanQr = asyncHandler(async (req, res) => {
  const record = await service.markViaScan(req.user.id, req.body.qr_token, {
    deviceInfo: req.headers['user-agent'],
    ipAddress: req.ip,
  });
  return success(res, 201, 'Attendance marked successfully', record);
});

const markByCode = asyncHandler(async (req, res) => {
  const record = await service.markViaCode(req.user.id, req.body.code, {
    deviceInfo: req.headers['user-agent'],
    ipAddress: req.ip,
  });
  return success(res, 201, 'Attendance marked successfully', record);
});

// ---- Student: history ----

const myHistory = asyncHandler(async (req, res) => {
  const studentId = await service.getStudentIdForUser(req.user.id);
  const rows = await service.getStudentAttendanceHistory(studentId, {
    subject_id: req.query.subject_id,
    from: req.query.from,
    to: req.query.to,
  });
  return success(res, 200, 'Attendance history fetched', rows);
});

const studentHistoryById = asyncHandler(async (req, res) => {
  const rows = await service.getStudentAttendanceHistory(req.params.studentId, {
    subject_id: req.query.subject_id,
    from: req.query.from,
    to: req.query.to,
  });
  return success(res, 200, 'Attendance history fetched', rows);
});

const getAllRecords = asyncHandler(async (req, res) => {
  const { getPagination } = require('../../utils/queryHelpers');
  const { paginationMeta } = require('../../utils/apiResponse');
  const { page, limit, offset } = getPagination(req);

  const { rows, total } = await service.getAllRecords({
    department_id: req.query.department_id,
    subject_id: req.query.subject_id,
    status: req.query.status,
    date: req.query.date,
    search: req.query.search,
    limit,
    offset,
  });
  return success(res, 200, 'Attendance records fetched', rows, paginationMeta(page, limit, total));
});

module.exports = {
  startSession,
  endSession,
  getQr,
  getRoster,
  markManual,
  bulkMarkManual,
  getFlagged,
  reviewFlagged,
  scanQr,
  markByCode,
  myHistory,
  studentHistoryById,
  getAllRecords,
  getActiveSession,
};
