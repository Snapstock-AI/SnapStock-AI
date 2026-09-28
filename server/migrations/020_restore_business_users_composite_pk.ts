import type { Client } from "pg";

/**
 * Migration 015 incorrectly made user_id the sole primary key, which blocks
 * multi-workspace (invite accept + create second business). Restore the
 * composite PK (business_id, user_id) from the original schema.
 */
export async function up(client: Client): Promise<void> {
  await client.query(`
    ALTER TABLE business_users
      DROP CONSTRAINT IF EXISTS business_users_pkey;

    ALTER TABLE business_users
      ADD CONSTRAINT business_users_pkey
      PRIMARY KEY (business_id, user_id);

    CREATE INDEX IF NOT EXISTS idx_business_users_user
      ON business_users(user_id);
  `);
}

export async function down(client: Client): Promise<void> {
  await client.query(`
    DROP INDEX IF EXISTS idx_business_users_user;

    ALTER TABLE business_users
      DROP CONSTRAINT IF EXISTS business_users_pkey;

    ALTER TABLE business_users
      ADD CONSTRAINT business_users_pkey
      PRIMARY KEY (user_id);
  `);
}
