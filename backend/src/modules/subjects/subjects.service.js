const { query } = require('../../config/db');
const { ApiError } = require('../../utils/apiResponse');

async function list({ search, department_id, semester, limit, offset, sortBy, sortOrder }) {
  const params = [];
  const conditions = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(s.name ILIKE $${params.length} OR s.code ILIKE $${params.length})`);
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

  const countRes = await query(`SELECT COUNT(*)::int AS total FROM subjects s ${where}`, params);

  params.push(limit, offset);
  const dataRes = await query(
    `SELECT s.id, s.name, s.code, s.semester, s.credits, s.created_at,
            d.id AS department_id, d.name AS department_name
     FROM subjects s JOIN departments d ON d.id = s.department_id
     ${where}
     ORDER BY s.${sortBy} ${sortOrder}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataRes.rows, total: countRes.rows[0].total };
}

async function getById(id) {
  const res = await query(
    `SELECT s.*, d.name AS department_name FROM subjects s
     JOIN departments d ON d.id = s.department_id WHERE s.id = $1`,
    [id]
  );
  if (!res.rows[0]) throw new ApiError(404, 'Subject not found');
  return res.rows[0];
}

async function create(data) {
  const { name, code, department_id, semester, credits = 3 } = data;
  const res = await query(
    `INSERT INTO subjects (name, code, department_id, semester, credits)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, code, department_id, semester, credits]
  );
  return res.rows[0];
}

async function update(id, fields) {
  await getById(id);
  const keys = Object.keys(fields);
  if (keys.length === 0) throw new ApiError(400, 'No fields to update');

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map((k) => fields[k]);
  values.push(id);

  const res = await query(
    `UPDATE subjects SET ${setClauses} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return res.rows[0];
}

async function remove(id) {
  await getById(id);
  await query(`DELETE FROM subjects WHERE id = $1`, [id]);
}

async function assignFaculty(subjectId, facultyId) {
  await getById(subjectId);
  const facRes = await query(`SELECT id FROM faculty WHERE id = $1`, [facultyId]);
  if (!facRes.rows[0]) throw new ApiError(404, 'Faculty not found');

  const res = await query(
    `INSERT INTO faculty_subjects (faculty_id, subject_id)
     VALUES ($1, $2)
     ON CONFLICT (faculty_id, subject_id) DO NOTHING
     RETURNING *`,
    [facultyId, subjectId]
  );
  return res.rows[0] || { faculty_id: facultyId, subject_id: subjectId, already_assigned: true };
}

async function unassignFaculty(subjectId, facultyId) {
  await query(`DELETE FROM faculty_subjects WHERE subject_id = $1 AND faculty_id = $2`, [
    subjectId,
    facultyId,
  ]);
}

async function getAssignedFaculty(subjectId) {
  const res = await query(
    `SELECT f.id AS faculty_id, u.name, u.email, f.designation
     FROM faculty_subjects fs
     JOIN faculty f ON f.id = fs.faculty_id
     JOIN users u ON u.id = f.user_id
     WHERE fs.subject_id = $1`,
    [subjectId]
  );
  return res.rows;
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  assignFaculty,
  unassignFaculty,
  getAssignedFaculty,
};