import path from "path";
import { Client } from "pg";
import dotenv from "dotenv";
import { createDbConfig } from "./db";

/**
 * Idempotent fix for production login:
 * ensures users.must_change_password exists and records migration 019.
 */
dotenv.config({ path: path.join(__dirname, "../../.env") });

const MIGRATION_FILE = "019_add_temporary_password_flag.ts";

async function main() {
  const client = new Client(createDbConfig());
  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    const existing = await client.query(
      `SELECT 1 FROM migrations WHERE filename = $1`,
      [MIGRATION_FILE],
    );
    if (existing.rowCount === 0) {
      await client.query(`INSERT INTO migrations (filename) VALUES ($1)`, [
        MIGRATION_FILE,
      ]);
    }

    await client.query("COMMIT");
    console.log(
      `Ensured users.must_change_password and recorded ${MIGRATION_FILE}.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  console.error(
    "Failed to ensure must_change_password:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
