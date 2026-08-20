import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      business_id UUID NOT NULL,

      name VARCHAR(255) NOT NULL,

      category VARCHAR(128),

      unit VARCHAR(32) NOT NULL DEFAULT 'pcs',

      low_stock_threshold INT NOT NULL DEFAULT 5,

      last_scan_at TIMESTAMPTZ,

      is_active BOOLEAN NOT NULL DEFAULT TRUE,

      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

      deleted_at TIMESTAMPTZ,

      CONSTRAINT fk_products_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id)
        ON DELETE CASCADE,

      CONSTRAINT uq_products_business_name
        UNIQUE (business_id, name),

      CONSTRAINT chk_products_low_stock_threshold
        CHECK (low_stock_threshold >= 0)
    );

    CREATE INDEX IF NOT EXISTS idx_products_business_id
      ON products(business_id);
  `);
}

export async function down(client: Client): Promise<void> {
  await client.query(`
    DROP TABLE IF EXISTS products;
  `);
}