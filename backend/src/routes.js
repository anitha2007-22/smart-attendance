const express = require('express');
const router = express.Router();

const authRoutes = require('./modules/auth/auth.routes');
const departmentRoutes = require('./modules/departments/departments.routes');
const subjectRoutes = require('./modules/subjects/subjects.routes');
const studentRoutes = require('./modules/users/students.routes');
const facultyRoutes = require('./modules/users/faculty.routes');
const timetableRoutes = require('./modules/timetable/timetable.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');
const leaveRoutes = require('./modules/leave/leave.routes');
const notificationRoutes = require('./modules/notifications/notifications.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const reportsRoutes = require('./modules/reports/reports.routes');

router.use('/auth', authRoutes);
router.use('/departments', departmentRoutes);
router.use('/subjects', subjectRoutes);
router.use('/admin/students', studentRoutes);
router.use('/admin/faculty', facultyRoutes);
router.use('/timetable', timetableRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leave', leaveRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reports', reportsRoutes);

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is healthy', timestamp: new Date().toISOString() });
});

module.exports = router;