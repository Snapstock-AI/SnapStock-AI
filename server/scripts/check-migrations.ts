import path from "path";
import { Client } from "pg";
import dotenv from "dotenv";
import { createDbConfig } from "./db";
import { getMigrationFiles, getPendingMigrations } from "./migration-utils";

dotenv.config({ path: path.join(__dirname, "../../.env") });

async function checkMigrations(): Promise<void> {
  const migrationFiles = getMigrationFiles();

  if (migrationFiles.length === 0) {
    return;
  }

  const client = new Client(createDbConfig());

  try {
    await client.connect();
    const pending = await getPendingMigrations(client);

    if (pending.length === 0) {
      return;
    }

    console.error("\nDatabase migrations are out of date.\n");
    console.error("Pending migration(s):");
    pending.forEach((file) => console.error(`  - ${file}`));
    console.error("\nRun migrations before starting the server:");
    console.error("  npm run migration\n");
    process.exit(1);
  } catch (error) {
    console.error("\nCould not verify database migrations.");
    console.error(error instanceof Error ? error.message : error);
    console.error("\nMake sure Postgres is running, then run:");
    console.error("  npm run migration\n");
    process.exit(1);
  } finally {
    await client.end();
  }
}

void checkMigrations();
