import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  // Create system role enum
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'user_system_role'
      ) THEN
        CREATE TYPE user_system_role AS ENUM (
          'SYSTEM_ADMIN',
          'BUSINESS_USER'
        );
      END IF;
    END $$;
  `);

  // Add system_role column
  await client.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS system_role user_system_role
    NOT NULL DEFAULT 'BUSINESS_USER';
  `);
}