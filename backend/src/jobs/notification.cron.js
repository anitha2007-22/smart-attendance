const cron = require('node-cron');
const { query } = require('../config/db');
const logger = require('../utils/logger');
const notificationsService = require('../modules/notifications/notifications.service');
const { NOTIFICATION_TYPE, LOW_ATTENDANCE_THRESHOLD_PERCENT } = require('../config/constants');

/**
 * Runs once daily at 18:00. Finds students whose overall attendance
 * percentage has dropped below the shortage threshold and sends them
 * (and does not spam - only once per day) a low-attendance notification.
 */
async function notifyLowAttendanceStudents() {
  try {
    const res = await query(
      `SELECT st.id AS student_id, u.id AS user_id, u.name,
              ROUND(
                (COUNT(ar.*) FILTER (WHERE ar.status IN ('present','late'))::numeric
                 / NULLIF(COUNT(ar.*), 0)) * 100, 2
              ) AS percentage
       FROM students st
       JOIN users u ON u.id = st.user_id
       LEFT JOIN attendance_records ar ON ar.student_id = st.id
       GROUP BY st.id, u.id, u.name
       HAVING (COUNT(ar.*) FILTER (WHERE ar.status IN ('present','late'))::numeric
               / NULLIF(COUNT(ar.*), 0)) * 100 < $1`,
      [LOW_ATTENDANCE_THRESHOLD_PERCENT]
    );

    if (!res.rows.length) {
      logger.info('Low-attendance cron: no students below threshold today');
      return;
    }

    const notifications = res.rows
      .filter((r) => r.percentage !== null)
      .map((r) => ({
        userId: r.user_id,
        title: 'Low Attendance Warning',
        message: `Your overall attendance is ${r.percentage}%, which is below the required ${LOW_ATTENDANCE_THRESHOLD_PERCENT}%. Please ensure regular attendance to avoid an attendance shortage.`,
        type: NOTIFICATION_TYPE.LOW_ATTENDANCE,
      }));

    await notificationsService.createBulk(notifications);
    logger.info(`Low-attendance cron: notified ${notifications.length} student(s)`);
  } catch (err) {
    logger.error(`notifyLowAttendanceStudents cron failed: ${err.message}`);
  }
}

/**
 * Runs every 15 minutes. Auto-closes any attendance session that has been
 * active for more than 3 hours (faculty forgot to end it), marking
 * unscanned students absent in the process.
 */
async function autoCloseStaleSessions() {
  try {
    const staleRes = await query(
      `SELECT id, department_id, semester FROM attendance_sessions
       WHERE status = 'active' AND start_time < NOW() - INTERVAL '3 hours'`
    );

    for (const session of staleRes.rows) {
      // eslint-disable-next-line no-await-in-loop
      await query(
        `UPDATE attendance_sessions SET status = 'closed', end_time = NOW(), qr_expires_at = NULL WHERE id = $1`,
        [session.id]
      );
      // eslint-disable-next-line no-await-in-loop
      await query(
        `INSERT INTO attendance_records (session_id, student_id, status, method, trust_score, trust_level)
         SELECT $1, s.id, 'absent', 'manual', 100, 'high'
         FROM students s
         WHERE s.department_id = $2 AND s.semester = $3
           AND NOT EXISTS (SELECT 1 FROM attendance_records ar WHERE ar.session_id = $1 AND ar.student_id = s.id)`,
        [session.id, session.department_id, session.semester]
      );
      logger.info(`Auto-closed stale attendance session ${session.id}`);
    }
  } catch (err) {
    logger.error(`autoCloseStaleSessions cron failed: ${err.message}`);
  }
}

function schedule() {
  // Every day at 18:00 server time
  cron.schedule('0 18 * * *', notifyLowAttendanceStudents);
  // Every 15 minutes
  cron.schedule('*/15 * * * *', autoCloseStaleSessions);
  logger.info('Cron jobs scheduled: low-attendance notifications (daily 18:00), stale session cleanup (every 15 min)');
}

module.exports = { schedule, notifyLowAttendanceStudents, autoCloseStaleSessions };