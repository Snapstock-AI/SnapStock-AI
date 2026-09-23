import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  await client.query(`
    ALTER TABLE scans
      ADD COLUMN IF NOT EXISTS image_key TEXT,
      ADD COLUMN IF NOT EXISTS image_content_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS image_original_name VARCHAR(255);
  `);
}

export async function down(client: Client): Promise<void> {
  await client.query(`
    ALTER TABLE scans
      DROP COLUMN IF EXISTS image_key,
      DROP COLUMN IF EXISTS image_content_type,
      DROP COLUMN IF EXISTS image_original_name;
  `);
}