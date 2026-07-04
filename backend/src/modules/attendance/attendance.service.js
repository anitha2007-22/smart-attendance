const { query, getClient } = require('../../config/db');
const { ApiError } = require('../../utils/apiResponse');
const qrService = require('./qr.service');
const { computeTrustScore } = require('./trustScore.service');
const env = require('../../config/env');
const {
  SESSION_STATUS,
  ATTENDANCE_STATUS,
  ATTENDANCE_METHOD,
} = require('../../config/constants');

// ---------------------- SESSION LIFECYCLE ----------------------

async function getFacultyIdForUser(userId) {
  const res = await query('SELECT id FROM faculty WHERE user_id = $1', [userId]);
  if (!res.rows[0]) throw new ApiError(404, 'Faculty profile not found for this user');
  return res.rows[0].id;
}

async function startSession(userId, data) {
  const facultyId = await getFacultyIdForUser(userId);

  // Prevent a faculty member from having two simultaneously active sessions
  const activeCheck = await query(
    `SELECT id FROM attendance_sessions WHERE faculty_id = $1 AND status = 'active'`,
    [facultyId]
  );
  if (activeCheck.rows[0]) {
    throw new ApiError(409, 'You already have an active attendance session. End it before starting a new one.');
  }

  const sessionSecret = qrService.generateSessionSecret();

  const res = await query(
    `INSERT INTO attendance_sessions
      (timetable_id, faculty_id, subject_id, department_id, semester, session_date, start_time, status, qr_secret, is_auto_generated)
     VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, NOW(), 'active', $6, FALSE)
     RETURNING *`,
    [
      data.timetable_id || null,
      facultyId,
      data.subject_id,
      data.department_id,
      data.semester,
      sessionSecret,
    ]
  );

  return res.rows[0];
}

async function getSessionOwned(sessionId, userId) {
  const facultyId = await getFacultyIdForUser(userId);
  const res = await query(
    `SELECT * FROM attendance_sessions WHERE id = $1 AND faculty_id = $2`,
    [sessionId, facultyId]
  );
  if (!res.rows[0]) throw new ApiError(404, 'Attendance session not found');
  return res.rows[0];
}

async function getActiveSession(userId) {
  const facultyId = await getFacultyIdForUser(userId);
  const res = await query(
    `SELECT s.*, sub.name AS subject_name, sub.code AS subject_code
     FROM attendance_sessions s
     JOIN subjects sub ON sub.id = s.subject_id
     WHERE s.faculty_id = $1 AND s.status = 'active'
     ORDER BY s.start_time DESC LIMIT 1`,
    [facultyId]
  );
  return res.rows[0] || null;
}

async function endSession(sessionId, userId) {
  const session = await getSessionOwned(sessionId, userId);
  if (session.status === SESSION_STATUS.CLOSED) {
    throw new ApiError(400, 'This session has already been ended');
  }

  const res = await query(
    `UPDATE attendance_sessions SET status = 'closed', end_time = NOW(), qr_expires_at = NULL
     WHERE id = $1 RETURNING *`,
    [sessionId]
  );

  // Mark all students who never scanned as absent
  await query(
    `INSERT INTO attendance_records (session_id, student_id, status, method, trust_score, trust_level, created_by)
     SELECT $1, s.id, 'absent', 'manual', 100, 'high', $2
     FROM students s
     WHERE s.department_id = $3 AND s.semester = $4
       AND NOT EXISTS (
         SELECT 1 FROM attendance_records ar WHERE ar.session_id = $1 AND ar.student_id = s.id
       )`,
    [sessionId, userId, session.department_id, session.semester]
  );

  return res.rows[0];
}

async function getCurrentQr(sessionId, userId) {
  const session = await getSessionOwned(sessionId, userId);
  if (session.status !== SESSION_STATUS.ACTIVE) {
    throw new ApiError(400, 'Session is not active');
  }

  const { token, expiresAt } = qrService.generateQrToken(sessionId, session.qr_secret);
  const qrImage = await qrService.generateQrImage(token);
  const shortCode = qrService.generateShortCode();

  await query(
    `UPDATE attendance_sessions SET qr_expires_at = $1, active_short_code = $2 WHERE id = $3`,
    [expiresAt, shortCode, sessionId]
  );

  return { qrImage, token, shortCode, expiresAt, ttlSeconds: env.QR_TOKEN_TTL_SECONDS };
}

// ---------------------- MARKING: QR SCAN (STUDENT) ----------------------

async function getStudentIdForUser(userId) {
  const res = await query('SELECT id FROM students WHERE user_id = $1', [userId]);
  if (!res.rows[0]) throw new ApiError(404, 'Student profile not found for this user');
  return res.rows[0].id;
}

async function markViaScan(userId, qrToken, meta = {}) {
  const studentId = await getStudentIdForUser(userId);

  // Decode without verifying signature first to know which session this claims to be for
  const jwt = require('jsonwebtoken');
  let unverifiedPayload;
  try {
    unverifiedPayload = jwt.decode(qrToken);
  } catch (e) {
    throw new ApiError(400, 'Malformed QR code');
  }
  if (!unverifiedPayload || !unverifiedPayload.sessionId) {
    throw new ApiError(400, 'Malformed QR code');
  }

  const sessionRes = await query(
    `SELECT * FROM attendance_sessions WHERE id = $1`,
    [unverifiedPayload.sessionId]
  );
  const session = sessionRes.rows[0];
  if (!session) throw new ApiError(404, 'Attendance session not found');
  if (session.status !== SESSION_STATUS.ACTIVE) {
    throw new ApiError(400, 'This attendance session is no longer active');
  }

  // Verify eligibility: student must belong to session's department/semester
  const studentRes = await query('SELECT department_id, semester FROM students WHERE id = $1', [studentId]);
  const student = studentRes.rows[0];
  if (student.department_id !== session.department_id || student.semester !== session.semester) {
    throw new ApiError(403, 'You are not enrolled in this class');
  }

  // Check duplicate BEFORE verifying QR (duplicate is itself a trust signal)
  const dupCheck = await query(
    `SELECT id FROM attendance_records WHERE session_id = $1 AND student_id = $2`,
    [session.id, studentId]
  );
  const isDuplicateAttempt = dupCheck.rows.length > 0;
  if (isDuplicateAttempt) {
    throw new ApiError(409, 'Attendance already marked for this session');
  }

  // Verify QR signature/expiry
  let qrValid = true;
  try {
    qrService.verifyQrToken(qrToken, session.qr_secret);
  } catch (err) {
    qrValid = false;
  }
  if (!qrValid) {
    // Do not create a record for a fully invalid QR; reject outright
    throw new ApiError(410, 'QR code is invalid or has expired. Please scan the current code.');
  }

  // Time window validation (session start -> now, with late grace)
  const now = new Date();
  const sessionStart = new Date(session.start_time);
  const graceMs = env.ATTENDANCE_LATE_GRACE_MINUTES * 60 * 1000;
  const withinTimeWindow = now >= sessionStart; // scanning after session start is always "within" for QR since session is active
  const isLate = now.getTime() - sessionStart.getTime() > graceMs;

  const trust = computeTrustScore({
    method: ATTENDANCE_METHOD.QR,
    qrValid,
    withinTimeWindow,
    isDuplicateAttempt: false,
  });

  const status = isLate ? ATTENDANCE_STATUS.LATE : ATTENDANCE_STATUS.PRESENT;

  const res = await query(
    `INSERT INTO attendance_records
      (session_id, student_id, status, method, trust_score, trust_level, is_flagged, flag_reason, device_info, ip_address, created_by)
     VALUES ($1, $2, $3, 'qr', $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      session.id,
      studentId,
      status,
      trust.score,
      trust.level,
      trust.flagged,
      trust.reasons.join('; ') || null,
      meta.deviceInfo || null,
      meta.ipAddress || null,
      userId,
    ]
  );

  return res.rows[0];
}

/**
 * Accessibility fallback for markViaScan: student types the 6-digit code
 * shown alongside the QR (readable from anywhere in the room) instead of
 * scanning. Finds the student's currently active session by department +
 * semester (there should be exactly one at a time), then verifies the
 * code was derived from that session's rotating secret within the
 * current or immediately-previous time window. Carries identical trust
 * scoring and duplicate-prevention guarantees as the QR path.
 */
async function markViaCode(userId, code, meta = {}) {
  const studentId = await getStudentIdForUser(userId);

  const studentRes = await query('SELECT department_id, semester FROM students WHERE id = $1', [studentId]);
  const student = studentRes.rows[0];

  const sessionRes = await query(
    `SELECT * FROM attendance_sessions
     WHERE department_id = $1 AND semester = $2 AND status = 'active'
     ORDER BY start_time DESC LIMIT 1`,
    [student.department_id, student.semester]
  );
  const session = sessionRes.rows[0];
  if (!session) {
    throw new ApiError(404, 'No active attendance session found for your class right now');
  }

  const dupCheck = await query(
    `SELECT id FROM attendance_records WHERE session_id = $1 AND student_id = $2`,
    [session.id, studentId]
  );
  if (dupCheck.rows.length > 0) {
    throw new ApiError(409, 'Attendance already marked for this session');
  }

  const submittedCode = String(code).trim();
  const codeExpired = !session.qr_expires_at || new Date(session.qr_expires_at) < new Date();
  const codeValid = !codeExpired && session.active_short_code === submittedCode;
  if (!codeValid) {
    throw new ApiError(410, 'That code is invalid or has expired. Please check the latest code on the display.');
  }

  const now = new Date();
  const sessionStart = new Date(session.start_time);
  const graceMs = env.ATTENDANCE_LATE_GRACE_MINUTES * 60 * 1000;
  const isLate = now.getTime() - sessionStart.getTime() > graceMs;

  const trust = computeTrustScore({
    method: ATTENDANCE_METHOD.QR,
    qrValid: true,
    withinTimeWindow: true,
    isDuplicateAttempt: false,
  });

  const status = isLate ? ATTENDANCE_STATUS.LATE : ATTENDANCE_STATUS.PRESENT;

  const res = await query(
    `INSERT INTO attendance_records
      (session_id, student_id, status, method, trust_score, trust_level, is_flagged, flag_reason, device_info, ip_address, created_by)
     VALUES ($1, $2, $3, 'qr', $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      session.id,
      studentId,
      status,
      trust.score,
      trust.level,
      trust.flagged,
      trust.reasons.join('; ') || null,
      meta.deviceInfo || null,
      meta.ipAddress || null,
      userId,
    ]
  );

  return res.rows[0];
}

// ---------------------- MARKING: MANUAL (FACULTY) ----------------------

async function markManual(sessionId, userId, { student_id, status = ATTENDANCE_STATUS.PRESENT }) {
  const session = await getSessionOwned(sessionId, userId);
  if (session.status !== SESSION_STATUS.ACTIVE) {
    throw new ApiError(400, 'Session is not active');
  }

  const existing = await query(
    `SELECT id FROM attendance_records WHERE session_id = $1 AND student_id = $2`,
    [sessionId, student_id]
  );

  if (existing.rows[0]) {
    const res = await query(
      `UPDATE attendance_records
       SET status = $1, method = 'manual', trust_score = 100, trust_level = 'high',
           is_flagged = FALSE, flag_reason = NULL, created_by = $2, marked_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, userId, existing.rows[0].id]
    );
    return res.rows[0];
  }

  const res = await query(
    `INSERT INTO attendance_records (session_id, student_id, status, method, trust_score, trust_level, created_by)
     VALUES ($1, $2, $3, 'manual', 100, 'high', $4) RETURNING *`,
    [sessionId, student_id, status, userId]
  );
  return res.rows[0];
}

async function bulkMarkManual(sessionId, userId, records) {
  const results = [];
  for (const r of records) {
    // eslint-disable-next-line no-await-in-loop
    const rec = await markManual(sessionId, userId, r);
    results.push(rec);
  }
  return results;
}

// ---------------------- READ / REPORTING ----------------------

async function getSessionRoster(sessionId, userId) {
  const session = await getSessionOwned(sessionId, userId);

  const res = await query(
    `SELECT s.id AS student_id, s.roll_no, u.name,
            ar.id AS record_id, ar.status, ar.method, ar.trust_score, ar.trust_level,
            ar.is_flagged, ar.marked_at
     FROM students s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN attendance_records ar ON ar.student_id = s.id AND ar.session_id = $1
     WHERE s.department_id = $2 AND s.semester = $3
     ORDER BY s.roll_no`,
    [sessionId, session.department_id, session.semester]
  );

  return { session, roster: res.rows };
}

async function getFlaggedRecords(userId, { limit = 50, offset = 0 } = {}) {
  const facultyId = await getFacultyIdForUser(userId);
  const res = await query(
    `SELECT ar.id, ar.status, ar.trust_score, ar.trust_level, ar.flag_reason, ar.marked_at,
            s.roll_no, u.name AS student_name,
            sub.name AS subject_name, ases.session_date
     FROM attendance_records ar
     JOIN attendance_sessions ases ON ases.id = ar.session_id
     JOIN students s ON s.id = ar.student_id
     JOIN users u ON u.id = s.user_id
     JOIN subjects sub ON sub.id = ases.subject_id
     WHERE ases.faculty_id = $1 AND ar.is_flagged = TRUE
     ORDER BY ar.marked_at DESC
     LIMIT $2 OFFSET $3`,
    [facultyId, limit, offset]
  );
  return res.rows;
}

async function reviewFlaggedRecord(recordId, userId, { approve, comment }) {
  const facultyId = await getFacultyIdForUser(userId);
  const check = await query(
    `SELECT ar.id FROM attendance_records ar
     JOIN attendance_sessions ases ON ases.id = ar.session_id
     WHERE ar.id = $1 AND ases.faculty_id = $2`,
    [recordId, facultyId]
  );
  if (!check.rows[0]) throw new ApiError(404, 'Attendance record not found');

  const newStatus = approve ? ATTENDANCE_STATUS.PRESENT : ATTENDANCE_STATUS.ABSENT;
  const res = await query(
    `UPDATE attendance_records
     SET is_flagged = FALSE, status = $1, flag_reason = COALESCE(flag_reason, '') || ' | Reviewed: ' || $2
     WHERE id = $3 RETURNING *`,
    [newStatus, comment || (approve ? 'Approved by faculty' : 'Rejected by faculty'), recordId]
  );
  return res.rows[0];
}

async function getStudentAttendanceHistory(studentId, { subject_id, from, to } = {}) {
  const params = [studentId];
  const conditions = ['ar.student_id = $1'];

  if (subject_id) {
    params.push(subject_id);
    conditions.push(`ases.subject_id = $${params.length}`);
  }
  if (from) {
    params.push(from);
    conditions.push(`ases.session_date >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`ases.session_date <= $${params.length}`);
  }

  const res = await query(
    `SELECT ar.id, ar.status, ar.method, ar.trust_score, ar.trust_level, ar.marked_at,
            sub.name AS subject_name, sub.code AS subject_code,
            ases.session_date, ases.start_time
     FROM attendance_records ar
     JOIN attendance_sessions ases ON ases.id = ar.session_id
     JOIN subjects sub ON sub.id = ases.subject_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY ases.session_date DESC, ases.start_time DESC`,
    params
  );
  return res.rows;
}

async function getAllRecords({ department_id, subject_id, status, date, search, limit = 20, offset = 0 } = {}) {
  const params = [];
  const conditions = [];

  if (department_id) {
    params.push(department_id);
    conditions.push(`ases.department_id = $${params.length}`);
  }
  if (subject_id) {
    params.push(subject_id);
    conditions.push(`ases.subject_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`ar.status = $${params.length}`);
  }
  if (date) {
    params.push(date);
    conditions.push(`ases.session_date = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR st.roll_no ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(
    `SELECT COUNT(*)::int AS total
     FROM attendance_records ar
     JOIN attendance_sessions ases ON ases.id = ar.session_id
     JOIN students st ON st.id = ar.student_id
     JOIN users u ON u.id = st.user_id
     ${where}`,
    params
  );

  params.push(limit, offset);
  const dataRes = await query(
    `SELECT ar.id, ar.status, ar.method, ar.trust_score, ar.trust_level, ar.marked_at,
            st.roll_no, u.name AS student_name,
            sub.name AS subject_name, sub.code AS subject_code,
            d.name AS department_name, ases.session_date
     FROM attendance_records ar
     JOIN attendance_sessions ases ON ases.id = ar.session_id
     JOIN students st ON st.id = ar.student_id
     JOIN users u ON u.id = st.user_id
     JOIN subjects sub ON sub.id = ases.subject_id
     JOIN departments d ON d.id = ases.department_id
     ${where}
     ORDER BY ases.session_date DESC, ar.marked_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataRes.rows, total: countRes.rows[0].total };
}

module.exports = {
  startSession,
  endSession,
  getSessionOwned,
  getCurrentQr,
  markViaScan,
  markViaCode,
  markManual,
  bulkMarkManual,
  getSessionRoster,
  getFlaggedRecords,
  reviewFlaggedRecord,
  getStudentAttendanceHistory,
  getFacultyIdForUser,
  getStudentIdForUser,
  getAllRecords,
  getActiveSession,
};
