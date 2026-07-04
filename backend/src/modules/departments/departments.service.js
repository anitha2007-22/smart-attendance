const { query } = require('../../config/db');
const { ApiError } = require('../../utils/apiResponse');

async function list({ search, limit, offset, sortBy, sortOrder }) {
  const params = [];
  let where = '';
  if (search) {
    params.push(`%${search}%`);
    where = `WHERE d.name ILIKE $${params.length} OR d.code ILIKE $${params.length}`;
  }

  const countRes = await query(`SELECT COUNT(*)::int AS total FROM departments d ${where}`, params);

  params.push(limit, offset);
  const dataRes = await query(
    `SELECT d.id, d.name, d.code, d.created_at,
            (SELECT COUNT(*)::int FROM students s WHERE s.department_id = d.id) AS student_count,
            (SELECT COUNT(*)::int FROM faculty f WHERE f.department_id = d.id) AS faculty_count
     FROM departments d
     ${where}
     ORDER BY d.${sortBy} ${sortOrder}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataRes.rows, total: countRes.rows[0].total };
}

async function getById(id) {
  const res = await query(`SELECT * FROM departments WHERE id = $1`, [id]);
  if (!res.rows[0]) throw new ApiError(404, 'Department not found');
  return res.rows[0];
}

async function create({ name, code }) {
  const res = await query(
    `INSERT INTO departments (name, code) VALUES ($1, $2) RETURNING *`,
    [name, code]
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
    `UPDATE departments SET ${setClauses} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return res.rows[0];
}

async function remove(id) {
  await getById(id);
  await query(`DELETE FROM departments WHERE id = $1`, [id]);
}

module.exports = { list, getById, create, update, remove };