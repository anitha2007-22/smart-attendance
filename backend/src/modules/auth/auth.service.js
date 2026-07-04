const bcrypt = require('bcryptjs');
const { query } = require('../../config/db');
const { ApiError } = require('../../utils/apiResponse');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require('../../utils/token');
const env = require('../../config/env');

async function findUserByEmail(email) {
  const res = await query(
    `SELECT id, role, name, email, password_hash, is_active FROM users WHERE email = $1`,
    [email]
  );
  return res.rows[0] || null;
}

async function getRoleProfile(userId, role) {
  if (role === 'student') {
    const res = await query(
      `SELECT s.id AS profile_id, s.roll_no, s.semester, s.batch_year,
              s.department_id, d.name AS department_name
       FROM students s JOIN departments d ON d.id = s.department_id
       WHERE s.user_id = $1`,
      [userId]
    );
    return res.rows[0] || null;
  }
  if (role === 'faculty') {
    const res = await query(
      `SELECT f.id AS profile_id, f.designation, f.employee_code,
              f.department_id, d.name AS department_name
       FROM faculty f JOIN departments d ON d.id = f.department_id
       WHERE f.user_id = $1`,
      [userId]
    );
    return res.rows[0] || null;
  }
  return null; // admin has no extended profile
}

async function login(email, password) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.is_active) {
    throw new ApiError(403, 'Your account has been deactivated. Contact the administrator.');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const tokenPayload = { id: user.id, role: user.role, email: user.email };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store hashed refresh token for revocation support
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, hashToken(refreshToken), expiresAt]
  );

  await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]);

  const profile = await getRoleProfile(user.id, user.role);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile,
    },
  };
}

async function refreshAccessToken(refreshToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const tokenHash = hashToken(refreshToken);
  const res = await query(
    `SELECT id, revoked, expires_at FROM refresh_tokens
     WHERE user_id = $1 AND token_hash = $2`,
    [decoded.id, tokenHash]
  );

  const stored = res.rows[0];
  if (!stored || stored.revoked || new Date(stored.expires_at) < new Date()) {
    throw new ApiError(401, 'Refresh token is invalid or has been revoked');
  }

  const newAccessToken = generateAccessToken({
    id: decoded.id,
    role: decoded.role,
    email: decoded.email,
  });

  return { accessToken: newAccessToken };
}

async function logout(userId, refreshToken) {
  const tokenHash = hashToken(refreshToken);
  await query(
    `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND token_hash = $2`,
    [userId, tokenHash]
  );
}

async function getCurrentUser(userId, role) {
  const res = await query(
    `SELECT id, name, email, role, phone, avatar_url, created_at FROM users WHERE id = $1`,
    [userId]
  );
  if (!res.rows[0]) throw new ApiError(404, 'User not found');

  const profile = await getRoleProfile(userId, role);
  return { ...res.rows[0], profile };
}

async function changePassword(userId, currentPassword, newPassword) {
  const res = await query(`SELECT password_hash FROM users WHERE id = $1`, [userId]);
  const user = res.rows[0];
  if (!user) throw new ApiError(404, 'User not found');

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) throw new ApiError(401, 'Current password is incorrect');

  const newHash = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);
  await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, userId]);

  // Revoke all existing refresh tokens on password change
  await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`, [userId]);
}

module.exports = {
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,
  changePassword,
  findUserByEmail,
};