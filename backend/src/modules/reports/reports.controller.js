const asyncHandler = require('../../utils/asyncHandler');
const pdfService = require('./pdf.service');
const excelService = require('./excel.service');

const summaryPdf = asyncHandler(async (req, res) => {
  await pdfService.generateAttendanceSummaryPdf(res, {
    department_id: req.query.department_id,
    semester: req.query.semester,
  });
});

const summaryExcel = asyncHandler(async (req, res) => {
  await excelService.generateAttendanceSummaryExcel(res, {
    department_id: req.query.department_id,
    semester: req.query.semester,
  });
});

const sessionPdf = asyncHandler(async (req, res) => {
  await pdfService.generateSessionAttendancePdf(res, req.params.sessionId);
});

const sessionExcel = asyncHandler(async (req, res) => {
  await excelService.generateSessionAttendanceExcel(res, req.params.sessionId);
});

module.exports = { summaryPdf, summaryExcel, sessionPdf, sessionExcel };