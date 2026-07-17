import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  await client.query(`
    ALTER TABLE users
    ALTER COLUMN date_of_birth DROP NOT NULL;
  `);
}
