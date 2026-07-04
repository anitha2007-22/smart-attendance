module.exports = {
  ROLES: {
    ADMIN: 'admin',
    FACULTY: 'faculty',
    STUDENT: 'student',
  },

  ATTENDANCE_STATUS: {
    PRESENT: 'present',
    ABSENT: 'absent',
    LATE: 'late',
  },

  ATTENDANCE_METHOD: {
    QR: 'qr',
    MANUAL: 'manual',
  },

  SESSION_STATUS: {
    ACTIVE: 'active',
    CLOSED: 'closed',
  },

  TRUST_LEVEL: {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
  },

  LEAVE_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  },

  NOTIFICATION_TYPE: {
    LOW_ATTENDANCE: 'low_attendance',
    ATTENDANCE_SHORTAGE: 'attendance_shortage',
    LEAVE_APPROVED: 'leave_approved',
    LEAVE_REJECTED: 'leave_rejected',
    SESSION_STARTED: 'session_started',
    GENERAL: 'general',
  },

  TRUST_SCORE_WEIGHTS: {
    QR_VALID: 50,
    TIME_WINDOW_VALID: 30,
    NO_DUPLICATE: 20,
  },

  TRUST_LEVEL_THRESHOLDS: {
    HIGH: 80,
    MEDIUM: 50, // 50-79 = medium, below 50 = low
  },

  LOW_ATTENDANCE_THRESHOLD_PERCENT: 75,
};