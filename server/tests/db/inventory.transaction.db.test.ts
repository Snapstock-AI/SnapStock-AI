/**
 * Transactional inventory updates against a real PostgreSQL.
 * SRS: NFR-REL-003 (transactional inventory updates, no partial writes),
 * FR-INV-002, FR-ALERT-001, FR-SCAN-004 A3.
 *
 * Failure flow proven here:
 *   BEGIN -> UPDATE products (succeeds) -> INSERT alerts (fails) -> ROLLBACK
 *   => product quantity unchanged, scan not COMPLETED, no alert row.
 */
import { AppDataSource } from "../../src/config/data-source";
import { DetectionRepository } from "../../src/modules/detection/detection.repository";
import { createScanWithDetections, createTenant, pool, quantityOf, scanStatus } from "./helpers";

beforeAll(async () => {
  await AppDataSource.initialize();
});

afterAll(async () => {
  await AppDataSource.destroy();
  await pool.end();
});

describe("DetectionRepository.applyInventoryChange", () => {
  it("STOCK_IN adds the detected count to stock and completes the scan", async () => {
    const tenant = await createTenant({ quantity: 10, lowStockThreshold: 5 });
    const scanId = await createScanWithDetections(tenant, 3, "STOCK_IN");

    const changes = await DetectionRepository.applyInventoryChange(scanId, tenant.businessId, "STOCK_IN");

    expect(await quantityOf(tenant.productId)).toBe(13);
    expect(await scanStatus(scanId)).toBe("COMPLETED");
    expect(changes).toEqual([
      expect.objectContaining({ productId: tenant.productId, detected: 3, currentQuantity: 10, quantity: 13 }),
    ]);
  });

  it("STOCK_OUT subtracts the detected count", async () => {
    const tenant = await createTenant({ quantity: 10, lowStockThreshold: 5 });
    const scanId = await createScanWithDetections(tenant, 4, "STOCK_OUT");

    await DetectionRepository.applyInventoryChange(scanId, tenant.businessId, "STOCK_OUT");

    expect(await quantityOf(tenant.productId)).toBe(6);
  });

  it("creates one active LOW_STOCK alert when stock falls below the threshold, and resolves it when restocked", async () => {
    const tenant = await createTenant({ quantity: 10, lowStockThreshold: 8 });

    const out = await createScanWithDetections(tenant, 5, "STOCK_OUT");
    await DetectionRepository.applyInventoryChange(out, tenant.businessId, "STOCK_OUT");
    const low = await pool.query(
      "SELECT active, message FROM alerts WHERE product_id = $1 AND type = 'LOW_STOCK'",
      [tenant.productId],
    );
    expect(low.rows).toHaveLength(1);
    expect(low.rows[0].active).toBe(true);
    expect(low.rows[0].message).toMatch(/5 items remaining/);

    const restock = await createScanWithDetections(tenant, 10, "STOCK_IN");
    await DetectionRepository.applyInventoryChange(restock, tenant.businessId, "STOCK_IN");
    const resolved = await pool.query(
      "SELECT active, resolved_at FROM alerts WHERE product_id = $1 AND type = 'LOW_STOCK'",
      [tenant.productId],
    );
    expect(resolved.rows[0].active).toBe(false);
    expect(resolved.rows[0].resolved_at).not.toBeNull();
  });

  it("rejects a STOCK_OUT larger than stock and leaves quantity and scan status untouched", async () => {
    const tenant = await createTenant({ quantity: 2 });
    const scanId = await createScanWithDetections(tenant, 5, "STOCK_OUT");

    await expect(
      DetectionRepository.applyInventoryChange(scanId, tenant.businessId, "STOCK_OUT"),
    ).rejects.toThrow(/insufficient stock/i);

    expect(await quantityOf(tenant.productId)).toBe(2);
    expect(await scanStatus(scanId)).toBe("PROCESSING");
  });

  describe("rollback on mid-transaction failure", () => {
    const trigger = "test_fail_alert_insert";

    beforeAll(async () => {
      await pool.query(`
        CREATE OR REPLACE FUNCTION test_fail_alert_insert() RETURNS trigger AS $$
        BEGIN RAISE EXCEPTION 'simulated failure while writing alert'; END;
        $$ LANGUAGE plpgsql;
      `);
    });

    afterEach(async () => {
      await pool.query(`DROP TRIGGER IF EXISTS ${trigger} ON alerts`);
    });

    afterAll(async () => {
      await pool.query("DROP FUNCTION IF EXISTS test_fail_alert_insert()");
    });

    it("rolls the product update back when the later alert write fails: no partial inventory state remains", async () => {
      const tenant = await createTenant({ quantity: 10, lowStockThreshold: 8 });
      const scanId = await createScanWithDetections(tenant, 5, "STOCK_OUT"); // 10 -> 5, below threshold 8
      await pool.query(
        `CREATE TRIGGER ${trigger} BEFORE INSERT ON alerts FOR EACH ROW EXECUTE FUNCTION test_fail_alert_insert()`,
      );

      await expect(
        DetectionRepository.applyInventoryChange(scanId, tenant.businessId, "STOCK_OUT"),
      ).rejects.toThrow(/simulated failure/);

      expect(await quantityOf(tenant.productId)).toBe(10);
      expect(await scanStatus(scanId)).toBe("PROCESSING");
      const alerts = await pool.query("SELECT 1 FROM alerts WHERE business_id = $1", [tenant.businessId]);
      expect(alerts.rowCount).toBe(0);
    });

    it("a failing scan in one tenant does not disturb another tenant's stock", async () => {
      const failing = await createTenant({ quantity: 10, lowStockThreshold: 8 });
      const bystander = await createTenant({ quantity: 42 });
      const scanId = await createScanWithDetections(failing, 5, "STOCK_OUT");
      await pool.query(
        `CREATE TRIGGER ${trigger} BEFORE INSERT ON alerts FOR EACH ROW EXECUTE FUNCTION test_fail_alert_insert()`,
      );

      await expect(
        DetectionRepository.applyInventoryChange(scanId, failing.businessId, "STOCK_OUT"),
      ).rejects.toThrow();

      expect(await quantityOf(bystander.productId)).toBe(42);
    });
  });

  it("applies concurrent scans for the same product without losing an update (row lock)", async () => {
    const tenant = await createTenant({ quantity: 0, lowStockThreshold: 1 });
    const scans = await Promise.all(
      Array.from({ length: 5 }, () => createScanWithDetections(tenant, 2, "STOCK_IN")),
    );

    await Promise.all(
      scans.map((scanId) => DetectionRepository.applyInventoryChange(scanId, tenant.businessId, "STOCK_IN")),
    );

    expect(await quantityOf(tenant.productId)).toBe(10);
  });
});
