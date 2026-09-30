import { Client } from "pg";
import path from "path";
import { adminDatabaseUrl, resolveTestDatabaseUrl } from "./env";
import { getMigrationFiles, migrationsDir } from "../../scripts/migration-utils";

/** Creates the throw-away test database if needed and applies every migration to a clean schema. */
export default async function globalSetup() {
  const testUrl = resolveTestDatabaseUrl();
  const dbName = new URL(testUrl).pathname.slice(1);

  const admin = new Client({ connectionString: adminDatabaseUrl(testUrl) });
  try {
    await admin.connect();
    const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (exists.rowCount === 0) await admin.query(`CREATE DATABASE "${dbName}"`);
  } catch (error) {
    throw new Error(`Cannot reach PostgreSQL for the database tests: ${(error as Error).message}`);
  } finally {
    await admin.end();
  }

  const client = new Client({ connectionString: testUrl });
  await client.connect();
  try {
    await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await client.query(
      "CREATE TABLE migrations (id SERIAL PRIMARY KEY, filename VARCHAR(255) UNIQUE NOT NULL, executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
    );
    for (const file of getMigrationFiles()) {
      const migration = require(path.join(migrationsDir, file));
      await client.query("BEGIN");
      try {
        await migration.up(client);
        await client.query("INSERT INTO migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
      }
    }
  } finally {
    await client.end();
  }

  process.env.DATABASE_URL = testUrl;
}
