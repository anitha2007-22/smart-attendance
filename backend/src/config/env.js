require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    // eslint-disable-next-line no-console
    console.error(`[ENV ERROR] Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  API_PREFIX: process.env.API_PREFIX || '/api/v1',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:3000',

  DB_HOST: required('DB_HOST', 'localhost'),
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: required('DB_NAME', 'smart_attendance'),
  DB_USER: required('DB_USER', 'postgres'),
  DB_PASSWORD: required('DB_PASSWORD', 'postgres'),
  DB_SSL: process.env.DB_SSL === 'true',

  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

  QR_SECRET: required('QR_SECRET'),
  QR_TOKEN_TTL_SECONDS: parseInt(process.env.QR_TOKEN_TTL_SECONDS || '20', 10),
  ATTENDANCE_LATE_GRACE_MINUTES: parseInt(
    process.env.ATTENDANCE_LATE_GRACE_MINUTES || '10',
    10
  ),

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),

  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
};