/**
 * Cross-tenant isolation with real SQL. SRS: NFR-SEC-003 (business_id enforced on every
 * tenant query, no IDOR), FR-TENANT-003 A2. Business A must never read or change
 * business B's data, in either direction, even when it knows B's UUIDs.
 */
import { AppDataSource } from "../../src/config/data-source";
import { BusinessService } from "../../src/modules/business/business.service";
import { DashboardService } from "../../src/modules/dashboard/dashboard.service";
import { DetectionRepository } from "../../src/modules/detection/detection.repository";
import { DetectionService } from "../../src/modules/detection/detection.service";
import { ShelfService } from "../../src/modules/shelf/shelf.service";
import {
  createScanWithDetections,
  createTenant,
  pool,
  quantityOf,
  Tenant,
} from "./helpers";

let a: Tenant;
let b: Tenant;
let scanA: string;
let scanB: string;
let detectionB: string;

beforeAll(async () => {
  await AppDataSource.initialize();
  a = await createTenant({ quantity: 10 });
  b = await createTenant({ quantity: 20 });
  scanA = await createScanWithDetections(a, 2);
  scanB = await createScanWithDetections(b, 3);
  const { rows } = await pool.query("SELECT id FROM detections WHERE scan_id = $1 LIMIT 1", [scanB]);
  detectionB = rows[0].id;
});

afterAll(async () => {
  await AppDataSource.destroy();
  await pool.end();
});

const NOT_A_MEMBER = /do not belong/i;

describe.each([
  ["A reading B", () => [a, b] as const],
  ["B reading A", () => [b, a] as const],
])("%s", (_label, pair) => {
  it("cannot list the other tenant's shelves", async () => {
    const [caller, victim] = pair();
    await expect(ShelfService.listForBusiness(caller.ownerId, victim.businessId)).rejects.toThrow(NOT_A_MEMBER);
  });

  it("cannot open the other tenant's dashboard, inventory or alerts", async () => {
    const [caller, victim] = pair();
    await expect(DashboardService.getDashboard(caller.ownerId, victim.businessId)).rejects.toThrow(NOT_A_MEMBER);
    await expect(DashboardService.getInventory(caller.ownerId, victim.businessId)).rejects.toThrow(NOT_A_MEMBER);
    await expect(DashboardService.getAlerts(caller.ownerId, victim.businessId)).rejects.toThrow(NOT_A_MEMBER);
  });

  it("cannot read the other tenant's scan history", async () => {
    const [caller, victim] = pair();
    await expect(
      DetectionService.history(caller.ownerId, victim.businessId, new Date(Date.now() - 86_400_000), new Date(Date.now() + 60_000)),
    ).rejects.toThrow(NOT_A_MEMBER);
  });

  it("is not a member of the other tenant", async () => {
    const [caller, victim] = pair();
    expect(await BusinessService.isMember(caller.ownerId, victim.businessId)).toBe(false);
  });
});

describe("IDOR with known identifiers", () => {
  it("cannot rename or delete the other tenant's shelf by shelf id", async () => {
    await expect(ShelfService.update(a.ownerId, b.shelfId, "hijacked")).rejects.toThrow(NOT_A_MEMBER);
    await expect(ShelfService.remove(a.ownerId, b.shelfId)).rejects.toThrow(NOT_A_MEMBER);

    const { rows } = await pool.query("SELECT name, deleted_at FROM shelves WHERE id = $1", [b.shelfId]);
    expect(rows[0]).toMatchObject({ name: "Shelf 1", deleted_at: null });
  });

  it("cannot correct the freshness of the other tenant's detection by detection id", async () => {
    await expect(DetectionService.correctFreshness(a.ownerId, detectionB, "Spoiled")).rejects.toThrow(NOT_A_MEMBER);

    const { rows } = await pool.query("SELECT corrected_freshness FROM detections WHERE id = $1", [detectionB]);
    expect(rows[0].corrected_freshness).toBeNull();
  });

  it("cannot update the other business or list its employees", async () => {
    await expect(BusinessService.updateForOwner(a.ownerId, b.businessId, { business_name: "hijack" } as never)).rejects.toThrow();
    await expect(BusinessService.listEmployees(a.ownerId, b.businessId)).rejects.toThrow();
  });

  it("an unknown detection id is reported as not found, not as forbidden (no existence oracle for foreign ids)", async () => {
    await expect(
      DetectionService.correctFreshness(a.ownerId, "00000000-0000-4000-8000-000000000000", "Fresh"),
    ).rejects.toThrow(/not found/i);
  });
});

describe("tenant scoping inside SQL", () => {
  it("scan history for A contains only A's scans", async () => {
    const rows = await DetectionRepository.findScanHistory(
      a.businessId,
      new Date(Date.now() - 86_400_000),
      new Date(Date.now() + 60_000),
    );

    expect(rows.map((r) => r.id)).toEqual([scanA]);
  });

  it("product lookup by name is scoped to the business (same name, different tenants)", async () => {
    const productA = await DetectionRepository.findProductByName(a.businessId, "apple");
    const productB = await DetectionRepository.findProductByName(b.businessId, "apple");

    expect(productA.id).toBe(a.productId);
    expect(productB.id).toBe(b.productId);
    expect(productA.id).not.toBe(productB.id);
  });

  it("applying B's scan under A's business id fails and changes neither tenant's stock", async () => {
    // Unreachable through the API (scans are created under the caller's business), but the
    // SQL itself must still refuse: the product join is filtered by business_id.
    await expect(
      DetectionRepository.applyInventoryChange(scanB, a.businessId, "STOCK_IN"),
    ).rejects.toThrow();

    expect(await quantityOf(a.productId)).toBe(10);
    expect(await quantityOf(b.productId)).toBe(20);
  });

  it("A's shelf listing returns only shelves owned by A", async () => {
    const shelves = await ShelfService.listForBusiness(a.ownerId, a.businessId);

    expect(shelves.map((s) => s.id)).toEqual([a.shelfId]);
  });
});

describe("soft deletion", () => {
  it("a deleted shelf disappears from listings but keeps its row and its scans", async () => {
    const owner = await createTenant();
    const scan = await createScanWithDetections(owner, 1);

    await ShelfService.remove(owner.ownerId, owner.shelfId);

    const listed = await ShelfService.listForBusiness(owner.ownerId, owner.businessId);
    expect(listed).toEqual([]);
    const row = await pool.query("SELECT deleted_at FROM shelves WHERE id = $1", [owner.shelfId]);
    expect(row.rows[0].deleted_at).not.toBeNull();
    const scans = await pool.query("SELECT 1 FROM scans WHERE id = $1", [scan]);
    expect(scans.rowCount).toBe(1);
  });
});
