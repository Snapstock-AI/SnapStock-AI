import { resolveTestDatabaseUrl } from "./env";

// Runs in every worker before modules load, so src/config reads the test database.
process.env.DATABASE_URL = resolveTestDatabaseUrl();
process.env.JWT_SECRET = process.env.JWT_SECRET || "db-test-secret";
