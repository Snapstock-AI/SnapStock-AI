import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  // Create business status enum
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'business_status'
      ) THEN
        CREATE TYPE business_status AS ENUM (
          'ACTIVE',
          'SUSPENDED'
        );
      END IF;
    END $$;
  `);

  // Add status column
  await client.query(`
    ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS status business_status
    NOT NULL DEFAULT 'ACTIVE';
  `);
}
