/**
 * db/index.js
 * PostgreSQL connection pool and schema initialization.
 * Uses the `pg` library's Pool for connection reuse.
 */
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Create a connection pool using environment variables
export const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'urlshortener',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'sisam123',
  max:      20,          // max pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Initialize database schema.
 * Creates tables if they don't exist and adds required indexes.
 */
export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // urls table — stores original URL and 6-char alias
    await client.query(`
      CREATE TABLE IF NOT EXISTS urls (
        id           SERIAL PRIMARY KEY,
        alias        VARCHAR(10)  NOT NULL UNIQUE,
        original_url TEXT         NOT NULL,
        created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);

    // Index on alias for fast lookups during redirect
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_urls_alias ON urls(alias);
    `);

    // clicks table — one row per click event, FK to urls.alias
    await client.query(`
      CREATE TABLE IF NOT EXISTS clicks (
        id         SERIAL PRIMARY KEY,
        alias      VARCHAR(10)  NOT NULL REFERENCES urls(alias) ON DELETE CASCADE,
        clicked_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);

    // Index for fast analytics GROUP BY date queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_clicks_alias_time ON clicks(alias, clicked_at);
    `);

    await client.query('COMMIT');
    console.log('[DB] Schema initialized successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DB] Schema initialization failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}