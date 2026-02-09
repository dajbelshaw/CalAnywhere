import fs from "fs";
import path from "path";
import { getPool } from "./client";

/**
 * Simple migration runner.
 * Reads numbered .sql files from the migrations directory and applies them in order.
 * Tracks applied migrations in a _migrations table.
 */
export async function runMigrations(): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  // Create migrations tracking table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Find migration files
  const migrationsDir = path.join(__dirname, "migrations");

  if (!fs.existsSync(migrationsDir)) {
    // eslint-disable-next-line no-console
    console.log("No migrations directory found — skipping.");
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No migration files found.");
    return;
  }

  // Get already-applied migrations
  const { rows } = await pool.query("SELECT name FROM _migrations ORDER BY name");
  const applied = new Set(rows.map((r: { name: string }) => r.name));

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      count++;
      // eslint-disable-next-line no-console
      console.log(`  Applied migration: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(
        `Migration ${file} failed: ${err instanceof Error ? err.message : err}`
      );
    } finally {
      client.release();
    }
  }

  if (count === 0) {
    // eslint-disable-next-line no-console
    console.log("All migrations already applied.");
  } else {
    // eslint-disable-next-line no-console
    console.log(`Applied ${count} migration(s).`);
  }
}
