import path from "path";
import { createRequire } from "module";
import { Client } from "pg";
import dotenv from "dotenv";
import { createDbConfig } from "./db";
import {
  getMigrationFiles,
  getPendingMigrations,
  migrationsDir,
} from "./migration-utils";

dotenv.config({ path: path.join(__dirname, "../../.env") });

require("ts-node").register({
  project: path.join(__dirname, "../tsconfig.migrations.json"),
  transpileOnly: true,
});

const requireMigration = createRequire(__filename);

type MigrationModule = {
  up: (client: Client) => Promise<void>;
};

async function runMigrations(): Promise<void> {
  const migrationFiles = getMigrationFiles();

  if (migrationFiles.length === 0) {
    console.log("No migration files found in server/migrations.");
    return;
  }

  const client = new Client(createDbConfig());

  try {
    await client.connect();
    const pending = await getPendingMigrations(client);

    if (pending.length === 0) {
      console.log("No pending migrations.");
      return;
    }

    console.log("Connected to PostgreSQL");

    for (const file of pending) {
      const filePath = path.join(migrationsDir, file);
      const migration = requireMigration(filePath) as MigrationModule;

      if (typeof migration.up !== "function") {
        throw new Error(`${file} must export an up(client) function`);
      }

      console.log(`Running: ${file}`);

      await client.query("BEGIN");
      await migration.up(client);
      await client.query("INSERT INTO migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");

      console.log(`Completed: ${file}`);
    }

    console.log("All migrations completed successfully.");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback errors
    }

    console.error("Migration failed:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

void runMigrations();
