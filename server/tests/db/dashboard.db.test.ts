/**
 * Dashboard, inventory, analytics and alert reads against real SQL.
 * SRS: FR-INV-001, FR-ANALYTICS-001, FR-ALERT-001, NFR-PERF-001 (dashboard retrieval).
 * Mock-based tests cannot catch a query that the database rejects; these can.
 */
import { AppDataSource } from "../../src/config/data-source";
import { DashboardService } from "../../src/modules/dashboard/dashboard.service";
import { DetectionRepository } from "../../src/modules/detection/detection.repository";
import { createScanWithDetections, createTenant, pool } from "./helpers";

beforeAll(async () => {
  await AppDataSource.initialize();
});
afterAll(async () => {
  await AppDataSource.destroy();
  await pool.end();
});

describe("DashboardService.getInventory (FR-INV-001)", () => {
  it("returns hasData=false with no error for a business that has not scanned yet", async () => {
    const tenant = await createTenant();

    const inventory = await DashboardService.getInventory(tenant.ownerId, tenant.businessId);

    expect(inventory).toMatchObject({ hasData: false, items: [] });
  });

  it("lists each scanned product with its current stock and freshness counts", async () => {
    const tenant = await createTenant({ quantity: 10, lowStockThreshold: 25 });
    const scanId = await createScanWithDetections(tenant, 3, "STOCK_IN");
    await DetectionRepository.applyInventoryChange(scanId, tenant.businessId, "STOCK_IN");

    const inventory = await DashboardService.getInventory(tenant.ownerId, tenant.businessId);

    expect(inventory.hasData).toBe(true);
    expect(inventory.items).toHaveLength(1);
    expect(inventory.items[0]).toMatchObject({
      product: "apple",
      stock: 13,
      fresh: 3,
      ripe: 0,
      spoiled: 0,
      lowStock: true, // 13 < default threshold 25
    });
  });

  it("only includes completed scans", async () => {
    const tenant = await createTenant();
    await createScanWithDetections(tenant, 2); // left in PROCESSING

    const inventory = await DashboardService.getInventory(tenant.ownerId, tenant.businessId);

    expect(inventory.hasData).toBe(false);
  });
});

describe("other dashboard reads execute against PostgreSQL", () => {
  it("getDashboard, getAnalytics and getAlerts succeed for a business with data", async () => {
    const tenant = await createTenant({ quantity: 10, lowStockThreshold: 25 });
    const scanId = await createScanWithDetections(tenant, 3, "STOCK_OUT");
    await DetectionRepository.applyInventoryChange(scanId, tenant.businessId, "STOCK_OUT");

    await expect(DashboardService.getDashboard(tenant.ownerId, tenant.businessId)).resolves.toBeDefined();
    await expect(DashboardService.getAnalytics(tenant.ownerId, tenant.businessId, 7)).resolves.toBeDefined();
    const alerts = await DashboardService.getAlerts(tenant.ownerId, tenant.businessId);
    expect(alerts.alerts.some((a) => /low stock/i.test(`${a.title} ${a.message}`))).toBe(true);
  });

  it("getDashboard, getAnalytics and getAlerts succeed for an empty business", async () => {
    const tenant = await createTenant();

    await expect(DashboardService.getDashboard(tenant.ownerId, tenant.businessId)).resolves.toBeDefined();
    await expect(DashboardService.getAnalytics(tenant.ownerId, tenant.businessId, 7)).resolves.toBeDefined();
    await expect(DashboardService.getAlerts(tenant.ownerId, tenant.businessId)).resolves.toBeDefined();
  });
});
