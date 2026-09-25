import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  await client.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
  `);
}
