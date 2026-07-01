import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS businesses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      business_name VARCHAR(150) NOT NULL,

      business_email VARCHAR(255) NOT NULL,

      address TEXT NOT NULL,

      contact_number VARCHAR(20) NOT NULL,

      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      deleted_at TIMESTAMP,

      CONSTRAINT unique_business_name_address
      UNIQUE (business_name, address)
    );
  `);
}