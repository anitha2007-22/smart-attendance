const { query } = require('../../config/db');
const { LOW_ATTENDANCE_THRESHOLD_PERCENT } = require('../../config/constants');

// ---------------------- OVERVIEW (Admin dashboard cards) ----------------------

async function getOverview() {
  const [students, faculty, departments, subjects, todaySessions, todayAttendance] = await Promise.all([
    query(`SELECT COUNT(*)::int AS count FROM students`),
    query(`SELECT COUNT(*)::int AS count FROM faculty`),
    query(`SELECT COUNT(*)::int AS count FROM departments`),
    query(`SELECT COUNT(*)::int AS count FROM subjects`),
    query(`SELECT COUNT(*)::int AS count FROM attendance_sessions WHERE session_date = CURRENT_DATE`),
    query(`
      SELECT
        COUNT(*) FILTER (WHERE ar.status IN ('present','late'))::int AS present,
        COUNT(*)::int AS total
      FROM attendance_records ar
      JOIN attendance_sessions s ON s.id = ar.session_id
      WHERE s.session_date = CURRENT_DATE
    `),
  ]);

  const present = todayAttendance.rows[0].present;
  const total = todayAttendance.rows[0].total;
  const todayPercentage = total > 0 ? Math.round((present / total) * 10000) / 100 : 0;

  return {
    totalStudents: students.rows[0].count,
    totalFaculty: faculty.rows[0].count,
    totalDepartments: departments.rows[0].count,
    totalSubjects: subjects.rows[0].count,
    todaySessions: todaySessions.rows[0].count,
    todayAttendancePercentage: todayPercentage,
  };
}

// ---------------------- TIME-SERIES TRENDS ----------------------

async function dailyAttendance({ days = 14, department_id, subject_id } = {}) {
  const params = [days];
  const conditions = ["s.session_date >= CURRENT_DATE - ($1 || ' days')::interval"];

  if (department_id) {
    params.push(department_id);
    conditions.push(`s.department_id = $${params.length}`);
  }
  if (subject_id) {
    params.push(subject_id);
    conditions.push(`s.subject_id = $${params.length}`);
  }

  const res = await query(
    `SELECT s.session_date AS date,
            COUNT(*) FILTER (WHERE ar.status IN ('present','late'))::int AS present,
            COUNT(*) FILTER (WHERE ar.status = 'absent')::int AS absent,
            COUNT(*) FILTER (WHERE ar.status = 'late')::int AS late,
            COUNT(*)::int AS total
     FROM attendance_records ar
     JOIN attendance_sessions s ON s.id = ar.session_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY s.session_date
     ORDER BY s.session_date ASC`,
    params
  );
  return res.rows.map((r) => ({
    ...r,
    percentage: r.total > 0 ? Math.round((r.present / r.total) * 10000) / 100 : 0,
  }));
}

async function weeklyAttendance({ weeks = 8, department_id } = {}) {
  const params = [weeks];
  const conditions = ["s.session_date >= CURRENT_DATE - ($1 || ' weeks')::interval"];
  if (department_id) {
    params.push(department_id);
    conditions.push(`s.department_id = $${params.length}`);
  }

  const res = await query(
    `SELECT date_trunc('week', s.session_date)::date AS week_start,
            COUNT(*) FILTER (WHERE ar.status IN ('present','late'))::int AS present,
            COUNT(*)::int AS total
     FROM attendance_records ar
     JOIN attendance_sessions s ON s.id = ar.session_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY week_start
     ORDER BY week_start ASC`,
    params
  );
  return res.rows.map((r) => ({
    ...r,
    percentage: r.total > 0 ? Math.round((r.present / r.total) * 10000) / 100 : 0,
  }));
}

async function monthlyAttendance({ months = 6, department_id } = {}) {
  const params = [months];
  const conditions = ["s.session_date >= CURRENT_DATE - ($1 || ' months')::interval"];
  if (department_id) {
    params.push(department_id);
    conditions.push(`s.department_id = $${params.length}`);
  }

  const res = await query(
    `SELECT date_trunc('month', s.session_date)::date AS month_start,
            COUNT(*) FILTER (WHERE ar.status IN ('present','late'))::int AS present,
            COUNT(*)::int AS total
     FROM attendance_records ar
     JOIN attendance_sessions s ON s.id = ar.session_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY month_start
     ORDER BY month_start ASC`,
    params
  );
  return res.rows.map((r) => ({
    ...r,
    percentage: r.total > 0 ? Math.round((r.present / r.total) * 10000) / 100 : 0,
  }));
}

// ---------------------- SUBJECT / DEPARTMENT BREAKDOWNS ----------------------

async function subjectWiseAttendance({ department_id } = {}) {
  const params = [];
  let where = '';
  if (department_id) {
    params.push(department_id);
    where = `WHERE sub.department_id = $${params.length}`;
  }

  const res = await query(
    `SELECT sub.id AS subject_id, sub.name AS subject_name, sub.code,
            COUNT(*) FILTER (WHERE ar.status IN ('present','late'))::int AS present,
            COUNT(*)::int AS total
     FROM attendance_records ar
     JOIN attendance_sessions s ON s.id = ar.session_id
     JOIN subjects sub ON sub.id = s.subject_id
     ${where}
     GROUP BY sub.id, sub.name, sub.code
     ORDER BY sub.name`,
    params
  );
  return res.rows.map((r) => ({
    ...r,
    percentage: r.total > 0 ? Math.round((r.present / r.total) * 10000) / 100 : 0,
  }));
}

async function departmentWiseAttendance() {
  const res = await query(
    `SELECT d.id AS department_id, d.name AS department_name,
            COUNT(*) FILTER (WHERE ar.status IN ('present','late'))::int AS present,
            COUNT(*)::int AS total
     FROM attendance_records ar
     JOIN attendance_sessions s ON s.id = ar.session_id
     JOIN departments d ON d.id = s.department_id
     GROUP BY d.id, d.name
     ORDER BY d.name`
  );
  return res.rows.map((r) => ({
    ...r,
    percentage: r.total > 0 ? Math.round((r.present / r.total) * 10000) / 100 : 0,
  }));
}

// ---------------------- STUDENT-LEVEL ----------------------

async function studentAttendancePercentage(studentId, { subject_id } = {}) {
  const params = [studentId];
  let subjectFilter = '';
  if (subject_id) {
    params.push(subject_id);
    subjectFilter = `AND s.subject_id = $${params.length}`;
  }

  const res = await query(
    `SELECT
        COUNT(*) FILTER (WHERE ar.status IN ('present','late'))::int AS present,
        COUNT(*)::int AS total
     FROM attendance_records ar
     JOIN attendance_sessions s ON s.id = ar.session_id
     WHERE ar.student_id = $1 ${subjectFilter}`,
    params
  );
  const { present, total } = res.rows[0];
  return {
    present,
    total,
    percentage: total > 0 ? Math.round((present / total) * 10000) / 100 : 0,
  };
}

async function studentSubjectWiseAttendance(studentId) {
  const res = await query(
    `SELECT sub.id AS subject_id, sub.name AS subject_name, sub.code,
            COUNT(*) FILTER (WHERE ar.status IN ('present','late'))::int AS present,
            COUNT(*)::int AS total
     FROM attendance_records ar
     JOIN attendance_sessions s ON s.id = ar.session_id
     JOIN subjects sub ON sub.id = s.subject_id
     WHERE ar.student_id = $1
     GROUP BY sub.id, sub.name, sub.code
     ORDER BY sub.name`,
    [studentId]
  );
  return res.rows.map((r) => ({
    ...r,
    percentage: r.total > 0 ? Math.round((r.present / r.total) * 10000) / 100 : 0,
  }));
}

async function lowAttendanceStudents({ threshold = LOW_ATTENDANCE_THRESHOLD_PERCENT, department_id } = {}) {
  const params = [threshold];
  let deptFilter = '';
  if (department_id) {
    params.push(department_id);
    deptFilter = `AND st.department_id = $${params.length}`;
  }

  const res = await query(
    `SELECT st.id AS student_id, st.roll_no, u.name, d.name AS department_name,
            COUNT(*) FILTER (WHERE ar.status IN ('present','late'))::int AS present,
            COUNT(*)::int AS total,
            ROUND(
              (COUNT(*) FILTER (WHERE ar.status IN ('present','late'))::numeric
               / NULLIF(COUNT(*), 0)) * 100, 2
            ) AS percentage
     FROM attendance_records ar
     JOIN students st ON st.id = ar.student_id
     JOIN users u ON u.id = st.user_id
     JOIN departments d ON d.id = st.department_id
     WHERE 1=1 ${deptFilter}
     GROUP BY st.id, st.roll_no, u.name, d.name
     HAVING (COUNT(*) FILTER (WHERE ar.status IN ('present','late'))::numeric
             / NULLIF(COUNT(*), 0)) * 100 < $1
     ORDER BY percentage ASC`,
    params
  );
  return res.rows;
}

module.exports = {
  getOverview,
  dailyAttendance,
  weeklyAttendance,
  monthlyAttendance,
  subjectWiseAttendance,
  departmentWiseAttendance,
  studentAttendancePercentage,
  studentSubjectWiseAttendance,
  lowAttendanceStudents,
};