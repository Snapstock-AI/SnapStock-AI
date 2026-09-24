/**
 * Schema, constraint and migration correctness against a real PostgreSQL.
 * SRS: NFR-REL-003 (data integrity), NFR-SEC-003 (tenant scoping), FR-SCAN-005, FR-DET-004.
 */
import { randomUUID } from "crypto";
import { getMigrationFiles } from "../../scripts/migration-utils";
import { createTenant, pgErrorCode, pool } from "./helpers";

const UNIQUE_VIOLATION = "23505";
const FK_VIOLATION = "23503";
const CHECK_VIOLATION = "23514";
const INVALID_ENUM = "22P02";

afterAll(() => pool.end());

async function newScan(tenant: Awaited<ReturnType<typeof createTenant>>) {
  const { rows } = await pool.query(
    "INSERT INTO scans (business_id, shelf_id, user_id) VALUES ($1, $2, $3) RETURNING id",
    [tenant.businessId, tenant.shelfId, tenant.ownerId],
  );
  return rows[0].id as string;
}

describe("migrations", () => {
  it("applied every migration file exactly once, in order", async () => {
    const { rows } = await pool.query("SELECT filename FROM migrations ORDER BY id");

    expect(rows.map((r) => r.filename)).toEqual(getMigrationFiles());
  });

  it("created the tenant-owned tables with a business_id column", async () => {
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.columns
       WHERE table_schema = 'public' AND column_name = 'business_id'`,
    );

    expect(rows.map((r) => r.table_name)).toEqual(
      expect.arrayContaining(["alerts", "business_users", "products", "scans", "shelves"]),
    );
  });
});

describe("constraints", () => {
  it("rejects a second user with the same email", async () => {
    const tenant = await createTenant();
    const { rows } = await pool.query("SELECT email FROM users WHERE id = $1", [tenant.ownerId]);

    const code = await pgErrorCode(
      pool.query("INSERT INTO users (full_name, email) VALUES ('Dup', $1)", [rows[0].email]),
    );

    expect(code).toBe(UNIQUE_VIOLATION);
  });

  it("rejects a duplicate product name inside one business but allows it in another", async () => {
    const a = await createTenant();
    const b = await createTenant();

    const duplicate = await pgErrorCode(
      pool.query("INSERT INTO products (business_id, name) VALUES ($1, $2)", [a.businessId, a.productName]),
    );
    const otherTenant = await pgErrorCode(
      pool.query("INSERT INTO products (business_id, name) VALUES ($1, 'pear')", [b.businessId]),
    );

    expect(duplicate).toBe(UNIQUE_VIOLATION);
    expect(otherTenant).toBeUndefined();
  });

  it("rejects a scan that points at a shelf that does not exist (foreign key)", async () => {
    const tenant = await createTenant();

    const code = await pgErrorCode(
      pool.query("INSERT INTO scans (business_id, shelf_id, user_id) VALUES ($1, $2, $3)", [
        tenant.businessId,
        randomUUID(),
        tenant.ownerId,
      ]),
    );

    expect(code).toBe(FK_VIOLATION);
  });

  it("rejects detection confidence outside 0..1", async () => {
    const scanId = await newScan(await createTenant());

    const code = await pgErrorCode(
      pool.query("INSERT INTO detections (scan_id, product_label, confidence) VALUES ($1, 'apple', 1.5)", [
        scanId,
      ]),
    );

    expect(code).toBe(CHECK_VIOLATION);
  });

  it("rejects an unknown freshness class", async () => {
    const scanId = await newScan(await createTenant());

    const code = await pgErrorCode(
      pool.query(
        "INSERT INTO detections (scan_id, product_label, confidence, freshness) VALUES ($1, 'apple', 0.9, 'Rotten')",
        [scanId],
      ),
    );

    expect(code).toBe(INVALID_ENUM);
  });

  it("cascades: deleting a scan removes its detections; deleting a business removes its products and shelves", async () => {
    const tenant = await createTenant();
    const scanId = await newScan(tenant);
    await pool.query("INSERT INTO detections (scan_id, product_label, confidence) VALUES ($1, 'apple', 0.9)", [
      scanId,
    ]);

    await pool.query("DELETE FROM scans WHERE id = $1", [scanId]);
    const detections = await pool.query("SELECT 1 FROM detections WHERE scan_id = $1", [scanId]);
    expect(detections.rowCount).toBe(0);

    await pool.query("DELETE FROM businesses WHERE id = $1", [tenant.businessId]);
    const products = await pool.query("SELECT 1 FROM products WHERE business_id = $1", [tenant.businessId]);
    const shelves = await pool.query("SELECT 1 FROM shelves WHERE business_id = $1", [tenant.businessId]);
    expect(products.rowCount).toBe(0);
    expect(shelves.rowCount).toBe(0);
  });
});
