const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const migrationsDir = path.join(__dirname, "../migrations");

if (!fs.existsSync(migrationsDir)) {
  console.log("Migrations folder not found.");
  process.exit(0);
}

const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

if (migrationFiles.length === 0) {
  console.log("No migration files found.");
  console.log("Database was not changed.");
  process.exit(0);
}

const client = new Client({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "postgres123",
  database: process.env.POSTGRES_DB || "inventory_db",
});

async function runMigrations() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL");

    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    for (const file of migrationFiles) {
      const alreadyRun = await client.query(
        "SELECT filename FROM migrations WHERE filename = $1",
        [file]
      );

      if (alreadyRun.rows.length > 0) {
        console.log(`Skipped: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

      console.log(`Running: ${file}`);

      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO migrations (filename) VALUES ($1)",
        [file]
      );
      await client.query("COMMIT");

      console.log(`Completed: ${file}`);
    }

    console.log("All migrations completed successfully.");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error("Migration failed:");
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();