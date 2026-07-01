import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  await client.query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  `);
}