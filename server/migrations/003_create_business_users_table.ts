import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  // Create business user role enum
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'business_user_role'
      ) THEN
        CREATE TYPE business_user_role AS ENUM (
          'OWNER',
          'EMPLOYEE'
        );
      END IF;
    END $$;
  `);

  // Create business_users table
  await client.query(`
    CREATE TABLE IF NOT EXISTS business_users (

      business_id UUID NOT NULL,

      user_id UUID NOT NULL,

      role business_user_role NOT NULL,

      joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      PRIMARY KEY (business_id, user_id),

      CONSTRAINT fk_business_users_business
        FOREIGN KEY (business_id)
        REFERENCES businesses(id)
        ON DELETE CASCADE,

      CONSTRAINT fk_business_users_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    );
  `);

  // Indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_business_users_business
    ON business_users(business_id);
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_business_users_user
    ON business_users(user_id);
  `);

}