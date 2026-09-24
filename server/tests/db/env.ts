import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const TEST_DB_NAME = "snapstock_test";

/**
 * Database used by the integration tests. It is never the developer database:
 * either TEST_DATABASE_URL is given, or the DATABASE_URL from the root .env is
 * re-pointed at a dedicated `snapstock_test` database.
 */
export function resolveTestDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return assertIsTestDatabase(process.env.TEST_DATABASE_URL);

  const envFile = path.resolve(__dirname, "../../../.env");
  const fromFile = fs.existsSync(envFile) ? dotenv.parse(fs.readFileSync(envFile)) : {};
  const base = process.env.DATABASE_URL || fromFile.DATABASE_URL;
  if (!base) {
    throw new Error("Set TEST_DATABASE_URL (or DATABASE_URL in the root .env) to run the database tests.");
  }

  const url = new URL(base.replace(/@postgres(?=[:/])/g, "@localhost"));
  url.pathname = `/${TEST_DB_NAME}`;
  return assertIsTestDatabase(url.toString());
}

export function assertIsTestDatabase(connectionString: string): string {
  const name = new URL(connectionString).pathname.replace(/^\//, "");
  if (!name.endsWith("_test")) {
    throw new Error(`Refusing to run destructive tests against database "${name}": its name must end with "_test".`);
  }
  return connectionString;
}

export function adminDatabaseUrl(testUrl: string): string {
  const url = new URL(testUrl);
  url.pathname = "/postgres";
  return url.toString();
}
