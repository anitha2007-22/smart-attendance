const cron = require('node-cron');
const { query } = require('../config/db');
const qrService = require('../modules/attendance/qr.service');
const logger = require('../utils/logger');
const notificationsService = require('../modules/notifications/notifications.service');
const { NOTIFICATION_TYPE } = require('../config/constants');

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Runs every minute. For each timetable entry whose start_time matches the
 * current time (within the same minute) on today's day-of-week, and which
 * doesn't already have a session created for today, auto-creates an
 * 'active' attendance session and notifies enrolled students.
 */
async function autoCreateSessions() {
  const now = new Date();
  const todayName = DAY_NAMES[now.getDay()];
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${hh}:${mm}`;

  try {
    const timetableRes = await query(
      `SELECT * FROM timetable WHERE day_of_week = $1 AND start_time = $2`,
      [todayName, currentTime]
    );

    for (const tt of timetableRes.rows) {
      // eslint-disable-next-line no-await-in-loop
      const existing = await query(
        `SELECT id FROM attendance_sessions WHERE timetable_id = $1 AND session_date = CURRENT_DATE`,
        [tt.id]
      );
      if (existing.rows[0]) continue; // eslint-disable-line no-continue

      const sessionSecret = qrService.generateSessionSecret();
      // eslint-disable-next-line no-await-in-loop
      const sessionRes = await query(
        `INSERT INTO attendance_sessions
          (timetable_id, faculty_id, subject_id, department_id, semester, session_date, start_time, status, qr_secret, is_auto_generated)
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, NOW(), 'active', $6, TRUE)
         RETURNING id`,
        [tt.id, tt.faculty_id, tt.subject_id, tt.department_id, tt.semester, sessionSecret]
      );

      logger.info(`Auto-created attendance session ${sessionRes.rows[0].id} for timetable ${tt.id}`);

      // Notify enrolled students
      // eslint-disable-next-line no-await-in-loop
      const studentsRes = await query(
        `SELECT u.id AS user_id FROM students s JOIN users u ON u.id = s.user_id
         WHERE s.department_id = $1 AND s.semester = $2`,
        [tt.department_id, tt.semester]
      );
      // eslint-disable-next-line no-await-in-loop
      const subjectRes = await query(`SELECT name FROM subjects WHERE id = $1`, [tt.subject_id]);
      const subjectName = subjectRes.rows[0]?.name || 'class';

      if (studentsRes.rows.length) {
        // eslint-disable-next-line no-await-in-loop
        await notificationsService.createBulk(
          studentsRes.rows.map((s) => ({
            userId: s.user_id,
            title: 'Attendance Session Started',
            message: `Attendance for ${subjectName} has started. Scan the QR code displayed by your faculty to mark your presence.`,
            type: NOTIFICATION_TYPE.SESSION_STARTED,
          }))
        );
      }
    }
  } catch (err) {
    logger.error(`autoCreateSessions cron failed: ${err.message}`);
  }
}

/**
 * Runs every minute. Closes any auto-generated session whose linked
 * timetable entry's end_time has passed, for today's date. This is the
 * real "automatic end" tied to the actual class schedule — distinct from
 * the 3-hour stale-session safety net in notification.cron.js, which only
 * catches sessions faculty forgot about entirely (including manually
 * started ones with no timetable link).
 */
async function autoCloseScheduledSessions() {
  const now = new Date();
  const todayName = DAY_NAMES[now.getDay()];
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${hh}:${mm}`;

  try {
    const dueRes = await query(
      `SELECT s.id, s.department_id, s.semester
       FROM attendance_sessions s
       JOIN timetable t ON t.id = s.timetable_id
       WHERE s.status = 'active'
         AND s.session_date = CURRENT_DATE
         AND t.day_of_week = $1
         AND t.end_time <= $2`,
      [todayName, currentTime]
    );

    for (const session of dueRes.rows) {
      // eslint-disable-next-line no-await-in-loop
      await query(
        `UPDATE attendance_sessions SET status = 'closed', end_time = NOW(), qr_expires_at = NULL WHERE id = $1`,
        [session.id]
      );
      // Mark any student who never scanned as absent
      // eslint-disable-next-line no-await-in-loop
      await query(
        `INSERT INTO attendance_records (session_id, student_id, status, method, trust_score, trust_level)
         SELECT $1, s.id, 'absent', 'manual', 100, 'high'
         FROM students s
         WHERE s.department_id = $2 AND s.semester = $3
           AND NOT EXISTS (SELECT 1 FROM attendance_records ar WHERE ar.session_id = $1 AND ar.student_id = s.id)`,
        [session.id, session.department_id, session.semester]
      );
      logger.info(`Auto-closed session ${session.id} at scheduled class end time`);
    }
  } catch (err) {
    logger.error(`autoCloseScheduledSessions cron failed: ${err.message}`);
  }
}

function schedule() {
  // Runs every minute
  cron.schedule('* * * * *', autoCreateSessions);
  cron.schedule('* * * * *', autoCloseScheduledSessions);
  logger.info('Cron job scheduled: auto-create attendance sessions from timetable (every minute)');
  logger.info('Cron job scheduled: auto-close sessions at scheduled class end time (every minute)');
}

module.exports = { schedule, autoCreateSessions, autoCloseScheduledSessions };
