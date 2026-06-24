import fs from "fs";
import path from "path";
import type { Client } from "pg";

export const migrationsDir = path.join(__dirname, "../migrations");

export function getMigrationFiles(): string[] {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter(
      (file) =>
        file.endsWith(".ts") &&
        !file.endsWith(".d.ts") &&
        file !== "types.ts"
    )
    .sort();
}

export async function ensureMigrationsTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function getAppliedMigrations(
  client: Client
): Promise<Set<string>> {
  await ensureMigrationsTable(client);

  const result = await client.query<{ filename: string }>(
    "SELECT filename FROM migrations ORDER BY filename"
  );

  return new Set(result.rows.map((row) => row.filename));
}

export async function getPendingMigrations(client: Client): Promise<string[]> {
  const migrationFiles = getMigrationFiles();
  const applied = await getAppliedMigrations(client);

  return migrationFiles.filter((file) => !applied.has(file));
}
