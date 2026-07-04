const PDFDocument = require('pdfkit');
const { query } = require('../../config/db');

function drawHeader(doc, title, subtitle) {
  doc
    .fillColor('#1a56db')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('Smart Attendance Monitoring System', { align: 'center' });
  doc
    .fillColor('#111827')
    .fontSize(14)
    .font('Helvetica-Bold')
    .text(title, { align: 'center' });
  if (subtitle) {
    doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text(subtitle, { align: 'center' });
  }
  doc.moveDown(1);
  doc
    .strokeColor('#e5e7eb')
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(doc.page.width - 50, doc.y)
    .stroke();
  doc.moveDown(1);
}

function drawTable(doc, headers, rows, columnWidths) {
  const startX = 50;
  let y = doc.y;
  const rowHeight = 22;

  // Header row
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');
  doc.rect(startX, y, columnWidths.reduce((a, b) => a + b, 0), rowHeight).fill('#1a56db');
  let x = startX;
  headers.forEach((h, i) => {
    doc.fillColor('#ffffff').text(h, x + 4, y + 6, { width: columnWidths[i] - 8 });
    x += columnWidths[i];
  });
  y += rowHeight;

  // Data rows
  doc.font('Helvetica').fontSize(8.5);
  rows.forEach((row, idx) => {
    if (y > doc.page.height - 80) {
      doc.addPage();
      y = 50;
    }
    if (idx % 2 === 0) {
      doc.rect(startX, y, columnWidths.reduce((a, b) => a + b, 0), rowHeight).fill('#f9fafb');
    }
    x = startX;
    row.forEach((cell, i) => {
      doc.fillColor('#111827').text(String(cell ?? ''), x + 4, y + 6, { width: columnWidths[i] - 8 });
      x += columnWidths[i];
    });
    y += rowHeight;
  });

  doc.y = y + 10;
}

/**
 * Generates a student-wise attendance summary PDF, streamed directly to res.
 */
async function generateAttendanceSummaryPdf(res, { department_id, semester } = {}) {
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

  const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="attendance-summary-report.pdf"');
  doc.pipe(res);

  drawHeader(doc, 'Attendance Summary Report', `Generated on ${new Date().toLocaleString()}`);

  const headers = ['Roll No', 'Name', 'Department', 'Semester', 'Present', 'Total', 'Percentage'];
  const widths = [90, 160, 160, 70, 70, 70, 90];
  const rows = dataRes.rows.map((r) => [
    r.roll_no,
    r.name,
    r.department_name,
    r.semester,
    r.present,
    r.total,
    r.total > 0 ? `${((r.present / r.total) * 100).toFixed(2)}%` : '0.00%',
  ]);

  drawTable(doc, headers, rows, widths);
  doc.end();
}

/**
 * Generates a single session's attendance sheet PDF.
 */
async function generateSessionAttendancePdf(res, sessionId) {
  const sessionRes = await query(
    `SELECT s.*, sub.name AS subject_name, sub.code, u.name AS faculty_name, d.name AS department_name
     FROM attendance_sessions s
     JOIN subjects sub ON sub.id = s.subject_id
     JOIN faculty f ON f.id = s.faculty_id
     JOIN users u ON u.id = f.user_id
     JOIN departments d ON d.id = s.department_id
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

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="session-${sessionId}-attendance.pdf"`);
  doc.pipe(res);

  drawHeader(
    doc,
    `${session.subject_name} (${session.code})`,
    `${session.department_name} | Faculty: ${session.faculty_name} | Date: ${new Date(session.session_date).toDateString()}`
  );

  const headers = ['Roll No', 'Name', 'Status', 'Method', 'Trust Score', 'Trust Level'];
  const widths = [90, 150, 80, 70, 80, 80];
  const rows = recordsRes.rows.map((r) => [
    r.roll_no,
    r.name,
    r.status.toUpperCase(),
    r.method.toUpperCase(),
    r.trust_score,
    r.trust_level.toUpperCase(),
  ]);

  drawTable(doc, headers, rows, widths);
  doc.end();
}

module.exports = { generateAttendanceSummaryPdf, generateSessionAttendancePdf };