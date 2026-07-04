const { query } = require('../../config/db');
const { ApiError } = require('../../utils/apiResponse');
const notificationsService = require('../notifications/notifications.service');
const { NOTIFICATION_TYPE } = require('../../config/constants');

async function getStudentIdForUser(userId) {
  const res = await query('SELECT id, department_id, semester FROM students WHERE user_id = $1', [userId]);
  if (!res.rows[0]) throw new ApiError(404, 'Student profile not found');
  return res.rows[0];
}

async function getFacultyIdForUser(userId) {
  const res = await query('SELECT id FROM faculty WHERE user_id = $1', [userId]);
  if (!res.rows[0]) throw new ApiError(404, 'Faculty profile not found');
  return res.rows[0].id;
}

async function apply(userId, { from_date, to_date, reason }) {
  if (new Date(to_date) < new Date(from_date)) {
    throw new ApiError(400, 'to_date cannot be before from_date');
  }
  const student = await getStudentIdForUser(userId);

  const res = await query(
    `INSERT INTO leave_requests (student_id, from_date, to_date, reason)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [student.id, from_date, to_date, reason]
  );
  return res.rows[0];
}

async function myRequests(userId) {
  const student = await getStudentIdForUser(userId);
  const res = await query(
    `SELECT lr.*, f.id AS reviewer_faculty_id, u.name AS reviewer_name
     FROM leave_requests lr
     LEFT JOIN faculty f ON f.id = lr.reviewed_by
     LEFT JOIN users u ON u.id = f.user_id
     WHERE lr.student_id = $1
     ORDER BY lr.created_at DESC`,
    [student.id]
  );
  return res.rows;
}

// Faculty sees leave requests from students in departments/semesters they teach
async function pendingForFaculty(userId) {
  const facultyId = await getFacultyIdForUser(userId);
  const res = await query(
    `SELECT DISTINCT lr.*, s.roll_no, u.name AS student_name, d.name AS department_name
     FROM leave_requests lr
     JOIN students s ON s.id = lr.student_id
     JOIN users u ON u.id = s.user_id
     JOIN departments d ON d.id = s.department_id
     WHERE lr.status = 'pending'
       AND EXISTS (
         SELECT 1 FROM timetable t
         WHERE t.faculty_id = $1 AND t.department_id = s.department_id AND t.semester = s.semester
       )
     ORDER BY lr.created_at ASC`,
    [facultyId]
  );
  return res.rows;
}

async function review(leaveId, userId, { status, review_comment }) {
  const facultyId = await getFacultyIdForUser(userId);

  const existing = await query('SELECT * FROM leave_requests WHERE id = $1', [leaveId]);
  if (!existing.rows[0]) throw new ApiError(404, 'Leave request not found');
  if (existing.rows[0].status !== 'pending') {
    throw new ApiError(400, 'This leave request has already been reviewed');
  }

  const res = await query(
    `UPDATE leave_requests
     SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_comment = $3
     WHERE id = $4 RETURNING *`,
    [status, facultyId, review_comment || null, leaveId]
  );

  // Notify the student
  const studentRes = await query(
    `SELECT u.id AS user_id, u.name FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = $1`,
    [existing.rows[0].student_id]
  );
  const student = studentRes.rows[0];

  await notificationsService.create({
    userId: student.user_id,
    title: status === 'approved' ? 'Leave Request Approved' : 'Leave Request Rejected',
    message:
      status === 'approved'
        ? `Your leave request from ${existing.rows[0].from_date.toISOString?.() || existing.rows[0].from_date} to ${existing.rows[0].to_date.toISOString?.() || existing.rows[0].to_date} has been approved.`
        : `Your leave request has been rejected.${review_comment ? ` Reason: ${review_comment}` : ''}`,
    type:
      status === 'approved' ? NOTIFICATION_TYPE.LEAVE_APPROVED : NOTIFICATION_TYPE.LEAVE_REJECTED,
  });

  return res.rows[0];
}

async function listAll({ status, department_id, limit, offset }) {
  const params = [];
  const conditions = [];

  if (status) {
    params.push(status);
    conditions.push(`lr.status = $${params.length}`);
  }
  if (department_id) {
    params.push(department_id);
    conditions.push(`s.department_id = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(
    `SELECT COUNT(*)::int AS total FROM leave_requests lr JOIN students s ON s.id = lr.student_id ${where}`,
    params
  );

  params.push(limit, offset);
  const dataRes = await query(
    `SELECT lr.*, s.roll_no, u.name AS student_name, d.name AS department_name
     FROM leave_requests lr
     JOIN students s ON s.id = lr.student_id
     JOIN users u ON u.id = s.user_id
     JOIN departments d ON d.id = s.department_id
     ${where}
     ORDER BY lr.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataRes.rows, total: countRes.rows[0].total };
}

module.exports = { apply, myRequests, pendingForFaculty, review, listAll };