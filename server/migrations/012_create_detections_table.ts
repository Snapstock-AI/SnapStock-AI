import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  await client.query(`
    DO $$
    BEGIN
      CREATE TYPE freshness_status AS ENUM (
        'Fresh',
        'Medium',
        'Spoiled',
        'UNKNOWN'
      );
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS detections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      scan_id UUID NOT NULL,

      product_label VARCHAR(128) NOT NULL,

      product_id UUID,

      confidence NUMERIC(5,4) NOT NULL,

      bbox_json JSONB,

      freshness freshness_status,

      freshness_confidence NUMERIC(5,4),

      needs_review BOOLEAN NOT NULL DEFAULT FALSE,

      corrected_freshness freshness_status,

      corrected_by UUID,

      corrected_at TIMESTAMPTZ,

      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_detections_scan
        FOREIGN KEY (scan_id)
        REFERENCES scans(id)
        ON DELETE CASCADE,

      CONSTRAINT fk_detections_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE SET NULL,

      CONSTRAINT fk_detections_corrected_by
        FOREIGN KEY (corrected_by)
        REFERENCES users(id)
        ON DELETE SET NULL,

      CONSTRAINT chk_detections_confidence
        CHECK (
          confidence >= 0
          AND confidence <= 1
        ),

      CONSTRAINT chk_detections_freshness_confidence
        CHECK (
          freshness_confidence IS NULL
          OR (
            freshness_confidence >= 0
            AND freshness_confidence <= 1
          )
        )
    );

    CREATE INDEX IF NOT EXISTS idx_detections_scan_id
      ON detections(scan_id);

    CREATE INDEX IF NOT EXISTS idx_detections_product_id
      ON detections(product_id);
  `);
}

export async function down(client: Client): Promise<void> {
  await client.query(`
    DROP TABLE IF EXISTS detections;
    DROP TYPE IF EXISTS freshness_status;
  `);
}