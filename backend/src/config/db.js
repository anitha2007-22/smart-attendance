const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  logger.info('New PostgreSQL client connected to pool');
});

pool.on('error', (err) => {
  logger.error(`Unexpected PostgreSQL pool error: ${err.message}`);
  process.exit(1);
});

/**
 * Execute a parameterized query safely (protects against SQL injection).
 * Always use $1, $2... placeholders — never string-concatenate user input.
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (env.NODE_ENV === 'development') {
    logger.debug(`Query executed in ${duration}ms: ${text.substring(0, 100)}`);
  }
  return res;
}

/**
 * Get a client for manual transaction control.
 * Usage:
 *   const client = await getClient();
 *   try { await client.query('BEGIN'); ... await client.query('COMMIT'); }
 *   catch (e) { await client.query('ROLLBACK'); throw e; }
 *   finally { client.release(); }
 */
async function getClient() {
  const client = await pool.connect();
  return client;
}

async function testConnection() {
  try {
    await pool.query('SELECT NOW()');
    logger.info('PostgreSQL connection successful');
  } catch (err) {
    logger.error(`PostgreSQL connection failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { pool, query, getClient, testConnection };