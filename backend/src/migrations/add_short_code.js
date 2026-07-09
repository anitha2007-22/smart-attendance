const { pool } = require('../config/db');
const logger = require('../utils/logger');

async function run() {
  try {
    await pool.query(`
      ALTER TABLE attendance_sessions
      ADD COLUMN IF NOT EXISTS active_short_code VARCHAR(6);
    `);
    logger.info('Migration: active_short_code column added successfully.');
    process.exit(0);
  } catch (err) {
    logger.error(`Migration failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

run();