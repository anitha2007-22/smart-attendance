const { query } = require('../../config/db');
const { ApiError } = require('../../utils/apiResponse');

const BASE_SELECT = `
  SELECT t.id, t.day_of_week, t.start_time, t.end_time, t.room_no, t.semester,
         sub.id AS subject_id, sub.name AS subject_name, sub.code AS subject_code,
         f.id AS faculty_id, u.name AS faculty_name,
         d.id AS department_id, d.name AS department_name
  FROM timetable t
  JOIN subjects sub ON sub.id = t.subject_id
  JOIN faculty f ON f.id = t.faculty_id
  JOIN users u ON u.id = f.user_id
  JOIN departments d ON d.id = t.department_id
`;

async function list({ department_id, semester, faculty_id, day_of_week }) {
  const params = [];
  const conditions = [];

  if (department_id) {
    params.push(department_id);
    conditions.push(`t.department_id = $${params.length}`);
  }
  if (semester) {
    params.push(semester);
    conditions.push(`t.semester = $${params.length}`);
  }
  if (faculty_id) {
    params.push(faculty_id);
    conditions.push(`t.faculty_id = $${params.length}`);
  }
  if (day_of_week) {
    params.push(day_of_week);
    conditions.push(`t.day_of_week = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await query(
    `${BASE_SELECT} ${where} ORDER BY
      array_position(ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], t.day_of_week::text),
      t.start_time`,
    params
  );
  return res.rows;
}

async function getById(id) {
  const res = await query(`${BASE_SELECT} WHERE t.id = $1`, [id]);
  if (!res.rows[0]) throw new ApiError(404, 'Timetable entry not found');
  return res.rows[0];
}

async function checkOverlap({ faculty_id, day_of_week, start_time, end_time, excludeId }) {
  const params = [faculty_id, day_of_week, end_time, start_time];
  let sql = `
    SELECT id FROM timetable
    WHERE faculty_id = $1 AND day_of_week = $2
      AND start_time < $3 AND end_time > $4
  `;
  if (excludeId) {
    params.push(excludeId);
    sql += ` AND id != $${params.length}`;
  }
  const res = await query(sql, params);
  return res.rows.length > 0;
}

async function create(data) {
  const overlap = await checkOverlap(data);
  if (overlap) {
    throw new ApiError(409, 'This faculty member already has a class scheduled at this time');
  }

  const res = await query(
    `INSERT INTO timetable (subject_id, faculty_id, department_id, semester, day_of_week, start_time, end_time, room_no)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      data.subject_id,
      data.faculty_id,
      data.department_id,
      data.semester,
      data.day_of_week,
      data.start_time,
      data.end_time,
      data.room_no || null,
    ]
  );
  return getById(res.rows[0].id);
}

async function update(id, fields) {
  const existing = await getById(id);

  if (fields.faculty_id || fields.day_of_week || fields.start_time || fields.end_time) {
    const overlap = await checkOverlap({
      faculty_id: fields.faculty_id || existing.faculty_id,
      day_of_week: fields.day_of_week || existing.day_of_week,
      start_time: fields.start_time || existing.start_time,
      end_time: fields.end_time || existing.end_time,
      excludeId: id,
    });
    if (overlap) {
      throw new ApiError(409, 'This faculty member already has a class scheduled at this time');
    }
  }

  const keys = Object.keys(fields);
  if (keys.length === 0) throw new ApiError(400, 'No fields to update');

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map((k) => fields[k]);
  values.push(id);

  await query(`UPDATE timetable SET ${setClauses} WHERE id = $${values.length}`, values);
  return getById(id);
}

async function remove(id) {
  await getById(id);
  await query(`DELETE FROM timetable WHERE id = $1`, [id]);
}

async function getFacultyWeeklySchedule(facultyId) {
  return list({ faculty_id: facultyId });
}

module.exports = { list, getById, create, update, remove, getFacultyWeeklySchedule };