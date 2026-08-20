import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  await client.query(`
    
    ALTER TABLE business_users
      DROP CONSTRAINT IF EXISTS business_users_pkey;

   
    ALTER TABLE business_users
      ADD CONSTRAINT business_users_pkey
      PRIMARY KEY (user_id);

    
    DROP INDEX IF EXISTS idx_business_users_user;

 
    ALTER TABLE business_users
      DROP CONSTRAINT IF EXISTS fk_business_users_user;

 
    ALTER TABLE business_users
      ADD CONSTRAINT fk_business_users_user
      FOREIGN KEY (user_id)
      REFERENCES users(id);
  `);
}

export async function down(client: Client): Promise<void> {
  await client.query(`

    ALTER TABLE business_users
      DROP CONSTRAINT IF EXISTS fk_business_users_user;

 
    ALTER TABLE business_users
      DROP CONSTRAINT IF EXISTS business_users_pkey;

  
    ALTER TABLE business_users
      ADD CONSTRAINT business_users_pkey
      PRIMARY KEY (business_id, user_id);

    ALTER TABLE business_users
      ADD CONSTRAINT fk_business_users_user
      FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE;

  
    CREATE INDEX IF NOT EXISTS idx_business_users_user
      ON business_users(user_id);
  `);
}