import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      full_name VARCHAR(100) NOT NULL,

      email VARCHAR(255) NOT NULL UNIQUE,

      password_hash TEXT NOT NULL,

      nic VARCHAR(15) UNIQUE,

      date_of_birth DATE NOT NULL,

      email_verified BOOLEAN NOT NULL DEFAULT FALSE,

      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      deleted_at TIMESTAMP NULL
    );
  `);
}