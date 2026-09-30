import type { Client } from "pg";

/**
 * Store every alert kind (low stock, spoilage, freshness risk, stale shelf)
 * in the alerts table so they can be resolved by the business owner.
 *
 * dedupe_key identifies "the same alert" across syncs, e.g.
 *   low_stock:<product_id>, spoilage:<shelf_id>:<label>, stale_shelf:<shelf_id>
 * Only one active alert may exist per key.
 */
export async function up(client: Client): Promise<void> {
  await client.query(`
    ALTER TABLE alerts
      ADD COLUMN IF NOT EXISTS shelf_id UUID REFERENCES shelves(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS severity VARCHAR(16) NOT NULL DEFAULT 'warning',
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS dedupe_key VARCHAR(255),
      ADD COLUMN IF NOT EXISTS evidence_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id) ON DELETE SET NULL;

    UPDATE alerts a
    SET dedupe_key = 'low_stock:' || a.product_id,
        title = COALESCE(a.title, 'Low stock: ' || p.name),
        evidence_at = COALESCE(a.evidence_at, a.updated_at)
    FROM products p
    WHERE p.id = a.product_id
      AND a.type = 'LOW_STOCK'
      AND a.dedupe_key IS NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_active_alert_key
      ON alerts(business_id, dedupe_key)
      WHERE active = TRUE AND dedupe_key IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_alerts_business_key_resolved
      ON alerts(business_id, dedupe_key, resolved_at DESC)
      WHERE active = FALSE;
  `);
}

export async function down(client: Client): Promise<void> {
  await client.query(`
    DROP INDEX IF EXISTS idx_alerts_business_key_resolved;
    DROP INDEX IF EXISTS uq_active_alert_key;
    DELETE FROM alerts WHERE type <> 'LOW_STOCK';
    ALTER TABLE alerts
      DROP COLUMN IF EXISTS resolved_by,
      DROP COLUMN IF EXISTS evidence_at,
      DROP COLUMN IF EXISTS dedupe_key,
      DROP COLUMN IF EXISTS title,
      DROP COLUMN IF EXISTS severity,
      DROP COLUMN IF EXISTS shelf_id;
  `);
}
