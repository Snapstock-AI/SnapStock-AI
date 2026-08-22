import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS shelves (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      business_id UUID NOT NULL,

      name VARCHAR(100) NOT NULL,

      category VARCHAR(100),

      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

      deleted_at TIMESTAMPTZ,

      CONSTRAINT fk_shelves_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id)
        ON DELETE CASCADE
        );

      CREATE UNIQUE INDEX IF NOT EXISTS uq_shelves_business_name_active
  ON shelves(business_id, name)
  WHERE deleted_at IS NULL;

    CREATE INDEX IF NOT EXISTS idx_shelves_business_id
      ON shelves(business_id);
  `);
}

export async function down(client: Client): Promise<void> {
  await client.query(`
    DROP TABLE IF EXISTS shelves;
  `);
}