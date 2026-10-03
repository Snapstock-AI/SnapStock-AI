import type { Client } from "pg";

/**
 * Analysis no longer changes inventory on its own: a scan stops at ANALYZED until the
 * user confirms it with "Add to inventory", which applies the stock change and moves the
 * scan to COMPLETED. This stops two photos of the same shelf from counting stock twice.
 * Existing COMPLETED scans already changed inventory, so they need no backfill.
 */
export async function up(client: Client): Promise<void> {
  await client.query(`
    ALTER TYPE scan_status ADD VALUE IF NOT EXISTS 'ANALYZED' BEFORE 'COMPLETED';
  `);
}

export async function down(client: Client): Promise<void> {
  // Postgres cannot drop an enum value; demote unconfirmed scans so the value is unused.
  await client.query(`
    UPDATE scans SET status = 'FAILED', error_message = 'Not added to inventory.'
    WHERE status = 'ANALYZED';
  `);
}
