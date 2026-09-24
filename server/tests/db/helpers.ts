import { randomUUID } from "crypto";
import { Pool } from "pg";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export interface Tenant {
  businessId: string;
  ownerId: string;
  shelfId: string;
  productId: string;
  productName: string;
}

/** Inserts an isolated tenant (business + OWNER + shelf + product). Every id is unique per call. */
export async function createTenant(
  options: { quantity?: number; lowStockThreshold?: number } = {},
): Promise<Tenant> {
  const tag = randomUUID().slice(0, 8);
  const {
    rows: [user],
  } = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, email_verified)
     VALUES ($1, $2, 'x', TRUE) RETURNING id`,
    [`Owner ${tag}`, `owner-${tag}@example.test`],
  );
  const {
    rows: [business],
  } = await pool.query(
    `INSERT INTO businesses (business_name, business_email, address, contact_number, low_stock_threshold)
     VALUES ($1, $2, $3, '0771234567', $4) RETURNING id`,
    [`Store ${tag}`, `store-${tag}@example.test`, `Address ${tag}`, options.lowStockThreshold ?? 25],
  );
  await pool.query(
    `INSERT INTO business_users (business_id, user_id, role) VALUES ($1, $2, 'OWNER')`,
    [business.id, user.id],
  );
  const {
    rows: [shelf],
  } = await pool.query(
    `INSERT INTO shelves (business_id, name) VALUES ($1, 'Shelf 1') RETURNING id`,
    [business.id],
  );
  const productName = "apple";
  const {
    rows: [product],
  } = await pool.query(
    `INSERT INTO products (business_id, name, quantity, low_stock_threshold)
     VALUES ($1, $2, $3, 0) RETURNING id`,
    [business.id, productName, options.quantity ?? 10],
  );
  return {
    businessId: business.id,
    ownerId: user.id,
    shelfId: shelf.id,
    productId: product.id,
    productName,
  };
}

export async function createScanWithDetections(
  tenant: Tenant,
  detected: number,
  mode: "STOCK_IN" | "STOCK_OUT" = "STOCK_IN",
) {
  const {
    rows: [scan],
  } = await pool.query(
    `INSERT INTO scans (business_id, shelf_id, user_id, status, scan_mode)
     VALUES ($1, $2, $3, 'PROCESSING', $4) RETURNING id`,
    [tenant.businessId, tenant.shelfId, tenant.ownerId, mode],
  );
  for (let i = 0; i < detected; i++) {
    await pool.query(
      `INSERT INTO detections (scan_id, product_label, product_id, confidence, freshness, freshness_confidence)
       VALUES ($1, $2, $3, 0.9, 'Fresh', 0.8)`,
      [scan.id, tenant.productName, tenant.productId],
    );
  }
  return scan.id as string;
}

export async function quantityOf(productId: string): Promise<number> {
  const { rows } = await pool.query("SELECT quantity FROM products WHERE id = $1", [productId]);
  return rows[0].quantity;
}

export async function scanStatus(scanId: string): Promise<string> {
  const { rows } = await pool.query("SELECT status FROM scans WHERE id = $1", [scanId]);
  return rows[0].status;
}

export async function pgErrorCode(action: Promise<unknown>): Promise<string | undefined> {
  try {
    await action;
    return undefined;
  } catch (error) {
    return (error as { code?: string }).code;
  }
}
