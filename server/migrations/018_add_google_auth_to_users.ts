import { Client } from "pg";

export async function up(client: Client): Promise<void> {
  await client.query(`
    ALTER TABLE users
      ALTER COLUMN password_hash DROP NOT NULL;

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
  `);
}
