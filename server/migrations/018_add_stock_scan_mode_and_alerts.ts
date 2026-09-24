import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  await client.query(`
    ALTER TABLE scans
      ADD COLUMN IF NOT EXISTS scan_mode VARCHAR(16) NOT NULL DEFAULT 'STOCK_IN';

    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5;

    UPDATE products p
    SET quantity = counts.total
    FROM (
      SELECT d.product_id, COUNT(*)::int AS total
      FROM detections d
      INNER JOIN scans s ON s.id = d.scan_id AND s.status = 'COMPLETED'
      WHERE d.product_id IS NOT NULL
      GROUP BY d.product_id
    ) counts
    WHERE p.id = counts.product_id AND p.quantity = 0;

    CREATE TABLE IF NOT EXISTS alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      type VARCHAR(32) NOT NULL,
      message TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS uq_active_product_alert
      ON alerts(business_id, product_id, type) WHERE active = TRUE;
  `);
}

export async function down(client: Client): Promise<void> {
  await client.query(`DROP TABLE IF EXISTS alerts;`);
  await client.query(`ALTER TABLE scans DROP COLUMN IF EXISTS scan_mode;`);
  await client.query(`ALTER TABLE products DROP COLUMN IF EXISTS quantity;`);
  await client.query(`ALTER TABLE products DROP COLUMN IF EXISTS low_stock_threshold;`);
}