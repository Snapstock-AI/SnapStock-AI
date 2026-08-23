import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      user_id UUID NOT NULL,

      refresh_token TEXT NOT NULL UNIQUE,

      expires_at TIMESTAMP NOT NULL,

      revoked_at TIMESTAMP,

      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user
    ON sessions(user_id);
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token
    ON sessions(refresh_token);
  `);
}
