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
import { DetectionService } from "../../src/modules/detection/detection.service";
import { DashboardService } from "../../src/modules/dashboard/dashboard.service";
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

describe("add to inventory only on confirmation", () => {
  const aiResult = (label: string, count: number) => ({
    image_width: 640,
    image_height: 480,
    total_count: count,
    counts: { [label]: { fresh: count, medium: 0, rotten: 0, total: count } },
    detections: Array.from({ length: count }, () => ({
      class_name: label,
      confidence: 0.9,
      bounding_box: { x1: 0, y1: 0, x2: 10, y2: 10 },
      freshness: "fresh",
      freshness_confidence: 0.8,
      freshness_confidence_percent: 80,
    })),
  });

  async function analyzedScan(tenant: Awaited<ReturnType<typeof createTenant>>, label: string, count: number, mode: "STOCK_IN" | "STOCK_OUT") {
    const scan = await DetectionRepository.createScan(tenant.businessId, tenant.shelfId, tenant.ownerId, mode);
    await DetectionService.persistAnalysis(scan.id, mode, aiResult(label, count));
    return scan.id as string;
  }

  it("analysis alone leaves stock unchanged, creates no product and is hidden from the dashboard", async () => {
    const tenant = await createTenant({ quantity: 10 });
    const scanId = await analyzedScan(tenant, "mango", 3, "STOCK_IN");

    expect(await scanStatus(scanId)).toBe("ANALYZED");
    expect(await quantityOf(tenant.productId)).toBe(10);
    const mango = await pool.query("SELECT 1 FROM products WHERE business_id = $1 AND name = 'mango'", [tenant.businessId]);
    expect(mango.rowCount).toBe(0);

    const inventory = await DashboardService.getInventory(tenant.ownerId, tenant.businessId);
    expect(inventory.hasData).toBe(false);
  });

  it("confirming adds the stock once, creating missing products for stock-in", async () => {
    const tenant = await createTenant({ quantity: 10 });
    const existing = await analyzedScan(tenant, tenant.productName, 3, "STOCK_IN");
    const created = await analyzedScan(tenant, "mango", 2, "STOCK_IN");

    const result = await DetectionService.confirmInventory(existing, tenant.ownerId);
    await DetectionService.confirmInventory(created, tenant.ownerId);

    expect(result).toMatchObject({ inventoryApplied: true, scanMode: "STOCK_IN" });
    expect(await quantityOf(tenant.productId)).toBe(13);
    expect(await scanStatus(existing)).toBe("COMPLETED");
    const mango = await pool.query("SELECT quantity FROM products WHERE business_id = $1 AND name = 'mango'", [tenant.businessId]);
    expect(mango.rows[0].quantity).toBe(2);
  });

  it("a second confirmation of the same scan is rejected and does not double the stock", async () => {
    const tenant = await createTenant({ quantity: 10 });
    const scanId = await analyzedScan(tenant, tenant.productName, 3, "STOCK_IN");

    await DetectionService.confirmInventory(scanId, tenant.ownerId);
    await expect(DetectionService.confirmInventory(scanId, tenant.ownerId)).rejects.toThrow(
      /already been added/,
    );

    expect(await quantityOf(tenant.productId)).toBe(13);
  });

  it("two simultaneous confirmations (double-click) apply the stock only once", async () => {
    const tenant = await createTenant({ quantity: 10 });
    const scanId = await analyzedScan(tenant, tenant.productName, 3, "STOCK_IN");

    const outcomes = await Promise.allSettled([
      DetectionService.confirmInventory(scanId, tenant.ownerId),
      DetectionService.confirmInventory(scanId, tenant.ownerId),
    ]);

    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    expect(await quantityOf(tenant.productId)).toBe(13);
  });

  it("two analysed photos of the same shelf only count twice if both are confirmed", async () => {
    const tenant = await createTenant({ quantity: 10 });
    const first = await analyzedScan(tenant, tenant.productName, 4, "STOCK_IN");
    await analyzedScan(tenant, tenant.productName, 4, "STOCK_IN"); // duplicate photo, never confirmed

    await DetectionService.confirmInventory(first, tenant.ownerId);

    expect(await quantityOf(tenant.productId)).toBe(14);
  });

  it("stock-out confirmation does not create products it cannot find", async () => {
    const tenant = await createTenant({ quantity: 10 });
    const scanId = await analyzedScan(tenant, "mango", 2, "STOCK_OUT");

    await expect(DetectionService.confirmInventory(scanId, tenant.ownerId)).rejects.toThrow(
      /No matching inventory products found for: mango/,
    );

    expect(await scanStatus(scanId)).toBe("ANALYZED");
    const mango = await pool.query("SELECT 1 FROM products WHERE business_id = $1 AND name = 'mango'", [tenant.businessId]);
    expect(mango.rowCount).toBe(0);
  });
});
