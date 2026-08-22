import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  await client.query(`
    DO $$
    BEGIN
      CREATE TYPE scan_status AS ENUM (
        'PENDING',
        'PROCESSING',
        'COMPLETED',
        'FAILED'
      );
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS scans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      business_id UUID NOT NULL,

      shelf_id UUID NOT NULL,

      user_id UUID NOT NULL,

      status scan_status NOT NULL DEFAULT 'PENDING',

      error_message TEXT,

      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

      completed_at TIMESTAMPTZ,

      CONSTRAINT fk_scans_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id)
        ON DELETE CASCADE,

      CONSTRAINT fk_scans_shelf
        FOREIGN KEY (shelf_id)
        REFERENCES shelves(id),

      CONSTRAINT fk_scans_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
   
    );

    CREATE INDEX IF NOT EXISTS idx_scans_business_id
      ON scans(business_id);

    CREATE INDEX IF NOT EXISTS idx_scans_shelf_id
      ON scans(shelf_id);

    CREATE INDEX IF NOT EXISTS idx_scans_user_id
      ON scans(user_id);

    CREATE INDEX IF NOT EXISTS idx_scans_status
      ON scans(status);
  `);
}

export async function down(client: Client): Promise<void> {
  await client.query(`
    DROP TABLE IF EXISTS scans;
    DROP TYPE IF EXISTS scan_status;
  `);
}