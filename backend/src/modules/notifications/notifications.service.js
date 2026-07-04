const { query } = require('../../config/db');
const { ApiError } = require('../../utils/apiResponse');

async function create({ userId, title, message, type = 'general' }) {
  const res = await query(
    `INSERT INTO notifications (user_id, title, message, type)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, title, message, type]
  );
  return res.rows[0];
}

async function createBulk(notifications) {
  if (!notifications.length) return [];
  const values = [];
  const placeholders = notifications
    .map((n, i) => {
      const base = i * 4;
      values.push(n.userId, n.title, n.message, n.type || 'general');
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
    })
    .join(', ');

  const res = await query(
    `INSERT INTO notifications (user_id, title, message, type) VALUES ${placeholders} RETURNING *`,
    values
  );
  return res.rows;
}

async function listForUser(userId, { limit = 20, offset = 0, unreadOnly = false }) {
  const params = [userId];
  let where = 'WHERE user_id = $1';
  if (unreadOnly) {
    where += ' AND is_read = FALSE';
  }
  params.push(limit, offset);

  const dataRes = await query(
    `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    params
  );
  const countRes = await query(
    `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_read = FALSE)::int AS unread
     FROM notifications WHERE user_id = $1`,
    [userId]
  );

  return { rows: dataRes.rows, total: countRes.rows[0].total, unread: countRes.rows[0].unread };
}

async function markRead(id, userId) {
  const res = await query(
    `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *`,
    [id, userId]
  );
  if (!res.rows[0]) throw new ApiError(404, 'Notification not found');
  return res.rows[0];
}

async function markAllRead(userId) {
  await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`, [
    userId,
  ]);
}

async function remove(id, userId) {
  const res = await query(`DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`, [
    id,
    userId,
  ]);
  if (!res.rows[0]) throw new ApiError(404, 'Notification not found');
}

// Admin: broadcast to a role or specific department
async function broadcast({ title, message, type = 'general', role, department_id }) {
  const params = [];
  const conditions = ["u.is_active = TRUE"];

  if (role) {
    params.push(role);
    conditions.push(`u.role = $${params.length}`);
  }

  let joinClause = '';
  if (department_id) {
    params.push(department_id);
    joinClause = `
      LEFT JOIN students st ON st.user_id = u.id
      LEFT JOIN faculty fa ON fa.user_id = u.id
    `;
    conditions.push(`(st.department_id = $${params.length} OR fa.department_id = $${params.length})`);
  }

  const res = await query(
    `SELECT u.id FROM users u ${joinClause} WHERE ${conditions.join(' AND ')}`,
    params
  );

  const notifications = res.rows.map((r) => ({ userId: r.id, title, message, type }));
  return createBulk(notifications);
}

module.exports = {
  create,
  createBulk,
  listForUser,
  markRead,
  markAllRead,
  remove,
  broadcast,
};