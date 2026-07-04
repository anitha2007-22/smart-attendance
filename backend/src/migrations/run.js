/**
 * Simple migration runner: executes database/schema.sql against the
 * configured PostgreSQL database. Idempotent guard via a schema_migrations
 * table so re-running doesn't attempt to recreate existing types/tables.
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
const logger = require('../utils/logger');

const SCHEMA_PATH = path.join(__dirname, '../../../database/schema.sql');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function alreadyApplied(name) {
  const res = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
  return res.rowCount > 0;
}

async function run() {
  try {
    await ensureMigrationsTable();
    const migrationName = 'initial_schema';

    if (await alreadyApplied(migrationName)) {
      logger.info('Migration "initial_schema" already applied. Skipping.');
      process.exit(0);
    }

    const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    logger.info('Applying initial schema migration...');
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [migrationName]);
    logger.info('Migration applied successfully.');
    process.exit(0);
  } catch (err) {
    logger.error(`Migration failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

run();
