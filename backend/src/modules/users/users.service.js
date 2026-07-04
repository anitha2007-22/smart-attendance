const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query, getClient } = require('../../config/db');
const { ApiError } = require('../../utils/apiResponse');
const env = require('../../config/env');

function generateTempPassword() {
  return crypto.randomBytes(6).toString('hex') + 'A1!'; // meets basic complexity
}

// ---------------------- STUDENTS ----------------------

async function listStudents({ search, department_id, semester, limit, offset, sortBy, sortOrder }) {
  const params = [];
  const conditions = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR s.roll_no ILIKE $${params.length})`);
  }
  if (department_id) {
    params.push(department_id);
    conditions.push(`s.department_id = $${params.length}`);
  }
  if (semester) {
    params.push(semester);
    conditions.push(`s.semester = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(
    `SELECT COUNT(*)::int AS total FROM students s JOIN users u ON u.id = s.user_id ${where}`,
    params
  );

  params.push(limit, offset);
  const dataRes = await query(
    `SELECT s.id, s.roll_no, s.semester, s.batch_year, s.parent_contact,
            u.id AS user_id, u.name, u.email, u.phone, u.is_active, u.created_at,
            d.id AS department_id, d.name AS department_name
     FROM students s
     JOIN users u ON u.id = s.user_id
     JOIN departments d ON d.id = s.department_id
     ${where}
     ORDER BY ${sortBy === 'name' ? 'u.name' : 's.' + sortBy} ${sortOrder}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataRes.rows, total: countRes.rows[0].total };
}

async function getStudentById(id) {
  const res = await query(
    `SELECT s.*, u.name, u.email, u.phone, u.is_active, u.created_at,
            d.name AS department_name
     FROM students s
     JOIN users u ON u.id = s.user_id
     JOIN departments d ON d.id = s.department_id
     WHERE s.id = $1`,
    [id]
  );
  if (!res.rows[0]) throw new ApiError(404, 'Student not found');
  return res.rows[0];
}

async function createStudent(data) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const emailCheck = await client.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (emailCheck.rows[0]) throw new ApiError(409, 'A user with this email already exists');

    const rollCheck = await client.query('SELECT id FROM students WHERE roll_no = $1', [data.roll_no]);
    if (rollCheck.rows[0]) throw new ApiError(409, 'A student with this roll number already exists');

    const plainPassword = data.password || generateTempPassword();
    const passwordHash = await bcrypt.hash(plainPassword, env.BCRYPT_SALT_ROUNDS);

    const userRes = await client.query(
      `INSERT INTO users (role, name, email, password_hash, phone)
       VALUES ('student', $1, $2, $3, $4) RETURNING id`,
      [data.name, data.email, passwordHash, data.phone || null]
    );

    const studentRes = await client.query(
      `INSERT INTO students (user_id, roll_no, department_id, semester, batch_year, parent_contact)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userRes.rows[0].id, data.roll_no, data.department_id, data.semester, data.batch_year, data.parent_contact || null]
    );

    await client.query('COMMIT');
    return { ...studentRes.rows[0], temp_password: data.password ? undefined : plainPassword };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateStudent(id, fields) {
  const existing = await getStudentById(id);

  const userFields = {};
  const studentFields = {};
  const userKeys = ['name', 'phone', 'is_active'];
  const studentKeys = ['roll_no', 'department_id', 'semester', 'batch_year', 'parent_contact'];

  Object.keys(fields).forEach((k) => {
    if (userKeys.includes(k)) userFields[k] = fields[k];
    if (studentKeys.includes(k)) studentFields[k] = fields[k];
  });

  const client = await getClient();
  try {
    await client.query('BEGIN');

    if (Object.keys(userFields).length) {
      const keys = Object.keys(userFields);
      const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const values = keys.map((k) => userFields[k]);
      values.push(existing.user_id);
      await client.query(`UPDATE users SET ${setClauses} WHERE id = $${values.length}`, values);
    }

    if (Object.keys(studentFields).length) {
      const keys = Object.keys(studentFields);
      const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const values = keys.map((k) => studentFields[k]);
      values.push(id);
      await client.query(`UPDATE students SET ${setClauses} WHERE id = $${values.length}`, values);
    }

    await client.query('COMMIT');
    return getStudentById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteStudent(id) {
  const existing = await getStudentById(id);
  await query(`DELETE FROM users WHERE id = $1`, [existing.user_id]); // cascades to students
}

// ---------------------- FACULTY ----------------------

async function listFaculty({ search, department_id, limit, offset, sortBy, sortOrder }) {
  const params = [];
  const conditions = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR f.employee_code ILIKE $${params.length})`);
  }
  if (department_id) {
    params.push(department_id);
    conditions.push(`f.department_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(
    `SELECT COUNT(*)::int AS total FROM faculty f JOIN users u ON u.id = f.user_id ${where}`,
    params
  );

  params.push(limit, offset);
  const dataRes = await query(
    `SELECT f.id, f.employee_code, f.designation,
            u.id AS user_id, u.name, u.email, u.phone, u.is_active, u.created_at,
            d.id AS department_id, d.name AS department_name
     FROM faculty f
     JOIN users u ON u.id = f.user_id
     JOIN departments d ON d.id = f.department_id
     ${where}
     ORDER BY ${sortBy === 'name' ? 'u.name' : 'f.' + sortBy} ${sortOrder}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataRes.rows, total: countRes.rows[0].total };
}

async function getFacultyById(id) {
  const res = await query(
    `SELECT f.*, u.name, u.email, u.phone, u.is_active, u.created_at,
            d.name AS department_name
     FROM faculty f
     JOIN users u ON u.id = f.user_id
     JOIN departments d ON d.id = f.department_id
     WHERE f.id = $1`,
    [id]
  );
  if (!res.rows[0]) throw new ApiError(404, 'Faculty not found');
  return res.rows[0];
}

async function createFaculty(data) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const emailCheck = await client.query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (emailCheck.rows[0]) throw new ApiError(409, 'A user with this email already exists');

    const codeCheck = await client.query('SELECT id FROM faculty WHERE employee_code = $1', [data.employee_code]);
    if (codeCheck.rows[0]) throw new ApiError(409, 'A faculty member with this employee code already exists');

    const plainPassword = data.password || generateTempPassword();
    const passwordHash = await bcrypt.hash(plainPassword, env.BCRYPT_SALT_ROUNDS);

    const userRes = await client.query(
      `INSERT INTO users (role, name, email, password_hash, phone)
       VALUES ('faculty', $1, $2, $3, $4) RETURNING id`,
      [data.name, data.email, passwordHash, data.phone || null]
    );

    const facultyRes = await client.query(
      `INSERT INTO faculty (user_id, department_id, designation, employee_code)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userRes.rows[0].id, data.department_id, data.designation || null, data.employee_code]
    );

    await client.query('COMMIT');
    return { ...facultyRes.rows[0], temp_password: data.password ? undefined : plainPassword };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateFaculty(id, fields) {
  const existing = await getFacultyById(id);

  const userFields = {};
  const facultyFields = {};
  const userKeys = ['name', 'phone', 'is_active'];
  const facultyKeys = ['employee_code', 'department_id', 'designation'];

  Object.keys(fields).forEach((k) => {
    if (userKeys.includes(k)) userFields[k] = fields[k];
    if (facultyKeys.includes(k)) facultyFields[k] = fields[k];
  });

  const client = await getClient();
  try {
    await client.query('BEGIN');

    if (Object.keys(userFields).length) {
      const keys = Object.keys(userFields);
      const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const values = keys.map((k) => userFields[k]);
      values.push(existing.user_id);
      await client.query(`UPDATE users SET ${setClauses} WHERE id = $${values.length}`, values);
    }

    if (Object.keys(facultyFields).length) {
      const keys = Object.keys(facultyFields);
      const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const values = keys.map((k) => facultyFields[k]);
      values.push(id);
      await client.query(`UPDATE faculty SET ${setClauses} WHERE id = $${values.length}`, values);
    }

    await client.query('COMMIT');
    return getFacultyById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteFaculty(id) {
  const existing = await getFacultyById(id);
  await query(`DELETE FROM users WHERE id = $1`, [existing.user_id]);
}

module.exports = {
  listStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  listFaculty,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty,
};