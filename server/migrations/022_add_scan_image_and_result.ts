import type { Client } from "pg";

/**
 * Event-driven scan analysis: a scan now references its uploaded S3 object and keeps the
 * final analysis summary (counts, detections, inventory changes) so the client can fetch
 * it from GET /detection/status/:scanId after the asynchronous pipeline finishes.
 */
export async function up(client: Client): Promise<void> {
  await client.query(`
    ALTER TABLE scans
      ADD COLUMN IF NOT EXISTS image_key TEXT,
      ADD COLUMN IF NOT EXISTS image_content_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS image_original_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS result_json JSONB;
  `);
}

export async function down(client: Client): Promise<void> {
  await client.query(`
    ALTER TABLE scans
      DROP COLUMN IF EXISTS result_json,
      DROP COLUMN IF EXISTS image_original_name,
      DROP COLUMN IF EXISTS image_content_type,
      DROP COLUMN IF EXISTS image_key;
  `);
}
