import type { Client } from "pg";

export async function up(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS test_table (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  for (const name of ["test1", "test2", "test3"]) {
    await client.query(
      `INSERT INTO test_table (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
      [name]
    );
  }
}
