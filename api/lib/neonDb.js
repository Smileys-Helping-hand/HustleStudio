// Neon PostgreSQL Database Connection
// Uses pooled connections for optimal performance

import pkg from 'pg';
const { Pool } = pkg;

let pool = null;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.VITE_NEON_CONNECTION_STRING;

    if (!connectionString) {
      throw new Error('DATABASE_URL or VITE_NEON_CONNECTION_STRING environment variable is not set');
    }

    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('[Neon DB] Pool error:', err);
      pool = null; // Reset pool on error
    });
  }

  return pool;
}

export async function query(sql, params = []) {
  const conn = getPool();
  try {
    const result = await conn.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('[Neon DB] Query error:', { sql, error: error.message });
    throw error;
  }
}

export async function queryOne(sql, params = []) {
  const results = await query(sql, params);
  return results.length > 0 ? results[0] : null;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export default { getPool, query, queryOne, closePool };
