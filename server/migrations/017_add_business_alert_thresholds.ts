import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  await client.query(`
    ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS freshness_alert_threshold INTEGER NOT NULL DEFAULT 65,
      ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 25;
  `);
}
