import type { Client } from "pg";

export type MigrationUp = (client: Client) => Promise<void>;
 