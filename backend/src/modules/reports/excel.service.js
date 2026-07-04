const ExcelJS = require('exceljs');
const { query } = require('../../config/db');

function styleHeaderRow(row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A56DB' } };
  row.alignment = { vertical: 'middle', horizontal: 'center' };
  row.height = 22;
}

/**
 * Generates a student-wise attendance summary Excel workbook, streamed to res.
 */
async function generateAttendanceSummaryExcel(res, { department_id, semester } = {}) {
  const params = [];
  const conditions = [];
  if (department_id) {
    params.push(department_id);
    conditions.push(`st.department_id = $${params.length}`);
  }
  if (semester) {
    params.push(semester);
    conditions.push(`st.semester = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataRes = await query(
    `SELECT st.roll_no, u.name, d.name AS department_name, st.semester,
            COUNT(ar.*) FILTER (WHERE ar.status IN ('present','late'))::int AS present,
            COUNT(ar.*) FILTER (WHERE ar.status = 'absent')::int AS absent,
            COUNT(ar.*) FILTER (WHERE ar.status = 'late')::int AS late,
            COUNT(ar.*)::int AS total
     FROM students st
     JOIN users u ON u.id = st.user_id
     JOIN departments d ON d.id = st.department_id
     LEFT JOIN attendance_records ar ON ar.student_id = st.id
     ${where}
     GROUP BY st.id, st.roll_no, u.name, d.name, st.semester
     ORDER BY st.roll_no`,
    params
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Smart Attendance Monitoring System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Attendance Summary');
  sheet.columns = [
    { header: 'Roll No', key: 'roll_no', width: 15 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Department', key: 'department_name', width: 25 },
    { header: 'Semester', key: 'semester', width: 12 },
    { header: 'Present', key: 'present', width: 12 },
    { header: 'Absent', key: 'absent', width: 12 },
    { header: 'Late', key: 'late', width: 10 },
    { header: 'Total Sessions', key: 'total', width: 15 },
    { header: 'Percentage', key: 'percentage', width: 14 },
  ];
  styleHeaderRow(sheet.getRow(1));

  dataRes.rows.forEach((r) => {
    const percentage = r.total > 0 ? Number(((r.present / r.total) * 100).toFixed(2)) : 0;
    const row = sheet.addRow({ ...r, percentage: `${percentage}%` });
    if (percentage < 75) {
      row.getCell('percentage').font = { color: { argb: 'FFDC2626' }, bold: true };
    }
  });

  sheet.autoFilter = { from: 'A1', to: 'I1' };

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename="attendance-summary-report.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
}

/**
 * Generates a single session's attendance sheet as Excel.
 */
async function generateSessionAttendanceExcel(res, sessionId) {
  const sessionRes = await query(
    `SELECT s.*, sub.name AS subject_name, sub.code, u.name AS faculty_name
     FROM attendance_sessions s
     JOIN subjects sub ON sub.id = s.subject_id
     JOIN faculty f ON f.id = s.faculty_id
     JOIN users u ON u.id = f.user_id
     WHERE s.id = $1`,
    [sessionId]
  );
  const session = sessionRes.rows[0];

  const recordsRes = await query(
    `SELECT st.roll_no, u.name, ar.status, ar.method, ar.trust_score, ar.trust_level, ar.marked_at
     FROM attendance_records ar
     JOIN students st ON st.id = ar.student_id
     JOIN users u ON u.id = st.user_id
     WHERE ar.session_id = $1
     ORDER BY st.roll_no`,
    [sessionId]
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`Session ${sessionId}`);

  sheet.mergeCells('A1:F1');
  sheet.getCell('A1').value = `${session.subject_name} (${session.code}) - ${session.faculty_name}`;
  sheet.getCell('A1').font = { bold: true, size: 14 };

  sheet.getRow(3).values = ['Roll No', 'Name', 'Status', 'Method', 'Trust Score', 'Trust Level'];
  styleHeaderRow(sheet.getRow(3));
  sheet.columns = [
    { key: 'roll_no', width: 15 },
    { key: 'name', width: 25 },
    { key: 'status', width: 12 },
    { key: 'method', width: 12 },
    { key: 'trust_score', width: 14 },
    { key: 'trust_level', width: 14 },
  ];

  recordsRes.rows.forEach((r) => {
    sheet.addRow([
      r.roll_no,
      r.name,
      r.status.toUpperCase(),
      r.method.toUpperCase(),
      r.trust_score,
      r.trust_level.toUpperCase(),
    ]);
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="session-${sessionId}-attendance.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { generateAttendanceSummaryExcel, generateSessionAttendanceExcel };