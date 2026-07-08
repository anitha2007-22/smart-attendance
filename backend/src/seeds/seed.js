/**
 * Seeds the database with demo data:
 * - 1 admin, 2 departments, 3 faculty, 3 subjects, 5 students, timetable entries
 */
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const env = require('../config/env');
const logger = require('../utils/logger');

async function hashPw(pw) {
  return bcrypt.hash(pw, env.BCRYPT_SALT_ROUNDS);
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Departments
    const deptRes = await client.query(`
      INSERT INTO departments (name, code) VALUES
        ('Computer Science & Engineering', 'CSE'),
        ('Electronics & Communication', 'ECE')
      RETURNING id, code;
    `);
    const cse = deptRes.rows.find((d) => d.code === 'CSE').id;
    const ece = deptRes.rows.find((d) => d.code === 'ECE').id;

    // Admin user
    const adminPw = await hashPw('Admin@123');
    await client.query(
      `INSERT INTO users (role, name, email, password_hash, phone)
       VALUES ('admin', 'System Administrator', 'admin@college.edu', $1, '9999900000')`,
      [adminPw]
    );

    // Faculty users
    const facultyPw = await hashPw('Faculty@123');
    const facultyUsers = [
      { name: 'Dr. Anita Sharma', email: 'anita.sharma@college.edu', dept: cse, code: 'FAC001', desig: 'Associate Professor' },
      { name: 'Prof. Ravi Kumar', email: 'ravi.kumar@college.edu', dept: cse, code: 'FAC002', desig: 'Assistant Professor' },
      { name: 'Dr. Meena Iyer', email: 'meena.iyer@college.edu', dept: ece, code: 'FAC003', desig: 'Professor' },
    ];
    const facultyIds = {};
    for (const f of facultyUsers) {
      const userRes = await client.query(
        `INSERT INTO users (role, name, email, password_hash, phone)
         VALUES ('faculty', $1, $2, $3, '9999911111') RETURNING id`,
        [f.name, f.email, facultyPw]
      );
      const facRes = await client.query(
        `INSERT INTO faculty (user_id, department_id, designation, employee_code)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [userRes.rows[0].id, f.dept, f.desig, f.code]
      );
      facultyIds[f.code] = facRes.rows[0].id;
    }

    // Subjects
    const subjects = [
      { name: 'Data Structures & Algorithms', code: 'CS201', dept: cse, sem: 3 },
      { name: 'Database Management Systems', code: 'CS301', dept: cse, sem: 5 },
      { name: 'Digital Signal Processing', code: 'EC301', dept: ece, sem: 5 },
    ];
    const subjectIds = {};
    for (const s of subjects) {
      const res = await client.query(
        `INSERT INTO subjects (name, code, department_id, semester, credits)
         VALUES ($1, $2, $3, $4, 4) RETURNING id`,
        [s.name, s.code, s.dept, s.sem]
      );
      subjectIds[s.code] = res.rows[0].id;
    }

    // Faculty-Subject assignment
    await client.query(
      `INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES
        ($1, $2), ($3, $4), ($5, $6)`,
      [
        facultyIds.FAC001, subjectIds.CS201,
        facultyIds.FAC002, subjectIds.CS301,
        facultyIds.FAC003, subjectIds.EC301,
      ]
    );

    // Timetable
    await client.query(
      `INSERT INTO timetable (subject_id, faculty_id, department_id, semester, day_of_week, start_time, end_time, room_no)
       VALUES
        ($1, $2, $3, 3, 'monday', '09:00', '10:00', 'CS-101'),
        ($4, $5, $6, 5, 'monday', '10:00', '11:00', 'CS-102'),
        ($7, $8, $9, 5, 'tuesday', '11:00', '12:00', 'EC-201')`,
      [
        subjectIds.CS201, facultyIds.FAC001, cse,
        subjectIds.CS301, facultyIds.FAC002, cse,
        subjectIds.EC301, facultyIds.FAC003, ece,
      ]
    );

    // Students
    const studentPw = await hashPw('Student@123');
    const students = [
      { name: 'Aarav ', email: 'aarav@gmail.com', roll: 'CSE21001', dept: cse, sem: 3 },
      { name: 'Diya ', email: 'diya@gmail.com', roll: 'CSE21002', dept: cse, sem: 3 },
      { name: 'Sandy', email: 'sandy123@gmail.com', roll: 'CSE21003', dept: cse, sem: 2 },
      { name: 'Sneha ', email: 'sneha@gmail.com', roll: 'ECE21001', dept: ece, sem: 4},
      { name: 'Vihaan', email: 'vihaan@gmail.com', roll: 'ECE21002', dept: ece, sem: 5 },
    ];
    for (const s of students) {
      const userRes = await client.query(
        `INSERT INTO users (role, name, email, password_hash, phone)
         VALUES ('student', $1, $2, $3, '9999922222') RETURNING id`,
        [s.name, s.email, studentPw]
      );
      await client.query(
        `INSERT INTO students (user_id, roll_no, department_id, semester, batch_year, parent_contact)
         VALUES ($1, $2, $3, $4, 2021, '9999933333')`,
        [userRes.rows[0].id, s.roll, s.dept, s.sem]
      );
    }

    await client.query('COMMIT');
    logger.info('Database seeded successfully.');
    logger.info('Demo credentials:');
    logger.info('  Admin:   admin@college.edu / Admin@123');
    logger.info('  Faculty: anita.sharma@college.edu / Faculty@123');
    logger.info('  Student: aarav.mehta@student.college.edu / Student@123');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`Seeding failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    client.release();
  }
}

seed();