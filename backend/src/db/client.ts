import { Pool } from "pg";

let pool: Pool | null = null;

/**
 * Returns the PG pool if DATABASE_URL is configured, or null for in-memory mode.
 */
export function getPool(): Pool | null {
  return pool;
}

/**
 * Initialises the PostgreSQL connection pool.
 * Returns true if a database connection was established, false if running in-memory.
 */
export async function initDatabase(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    // eslint-disable-next-line no-console
    console.log(
      "DATABASE_URL not set — running in ephemeral in-memory mode."
    );
    return false;
  }

  pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  // Verify the connection works
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    // eslint-disable-next-line no-console
    console.log("Connected to PostgreSQL database.");
    return true;
  } finally {
    client.release();
  }
}

/**
 * Gracefully shuts down the database pool.
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
