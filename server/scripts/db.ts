import path from "path";
import dotenv from "dotenv";
import type { ClientConfig } from "pg";

dotenv.config({ path: path.join(__dirname, "../../.env") });

function normalizeDatabaseUrl(url: string): string {
  // "postgres" is the Docker Compose service name and only resolves inside Docker.
  // Apps run locally should connect via localhost.
  return url.replace(/@postgres(?=[:/])/g, "@localhost");
}

export function createDbConfig(): ClientConfig {
  if (process.env.DATABASE_URL) {
    return { connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL) };
  }

  return {
    host: process.env.DB_HOST ,
    port: Number(process.env.POSTGRES_PORT ),
    user: process.env.POSTGRES_USER ,
    password: process.env.POSTGRES_PASSWORD ,
    database: process.env.POSTGRES_DB ,
  };
}
