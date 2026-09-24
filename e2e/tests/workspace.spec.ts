import { expect, test, type APIRequestContext } from "@playwright/test";
import { urls } from "../support/env";
import { SAMPLE_JPEG, createVendor, setAiMode, signInBrowser, sql, type Account } from "../support/helpers";

async function scanViaApi(request: APIRequestContext, vendor: Account, mode: "STOCK_IN" | "STOCK_OUT" = "STOCK_IN") {
  const response = await request.post(`${urls.api}/detection/analyze`, {
    headers: { Authorization: `Bearer ${vendor.token}` },
    multipart: {
      file: SAMPLE_JPEG,
      businessId: vendor.businessId,
      shelfId: vendor.shelfId,
      scanMode: mode,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

test.beforeEach(async ({ request }) => {
  await setAiMode(request, "up");
});

// E2E-06: FR-INV-001
test.describe("inventory browsing", () => {
  test("shows an empty state before any scan and a product table after one", async ({ page, request }) => {
    const vendor = await createVendor(request);
    await signInBrowser(page, vendor);

    await page.goto("/dashboard/inventory");
    await expect(page.getByText("No inventory yet")).toBeVisible();

    await scanViaApi(request, vendor);
    await page.reload();

    const table = page.getByRole("table");
    await expect(table).toBeVisible();
    await expect(table.getByRole("row", { name: /apple/i })).toContainText("13");
    await expect(table.getByRole("row", { name: /apple/i })).toContainText("2 / 0 / 1");
  });

  test("another business's inventory is never shown", async ({ page, request }) => {
    const a = await createVendor(request);
    const b = await createVendor(request);
    await scanViaApi(request, a);
    await signInBrowser(page, b);

    await page.goto("/dashboard/inventory");

    await expect(page.getByText("No inventory yet")).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
  });
});

// E2E-07: FR-ALERT-001
test.describe("alerts", () => {
  test("a new business sees only the 'needs a scan' prompt, never a stock or spoilage alert", async ({ page, request }) => {
    const vendor = await createVendor(request);
    await signInBrowser(page, vendor);

    await page.goto("/dashboard/alerts");

    await expect(page.getByText(/needs a scan/i)).toBeVisible();
    await expect(page.getByText(/Low stock:/)).toHaveCount(0);
  });

  test("a low-stock alert appears after a scan leaves a product under the threshold", async ({ page, request }) => {
    const vendor = await createVendor(request); // stock 10, default threshold 25
    await scanViaApi(request, vendor, "STOCK_OUT"); // 10 - 3 = 7
    await signInBrowser(page, vendor);

    await page.goto("/dashboard/alerts");

    await expect(page.getByText(/low stock/i).first()).toBeVisible();
    await expect(page.getByText(/apple/i).first()).toBeVisible();
    const [alert] = await sql<{ type: string; active: boolean }>(
      "SELECT type, active FROM alerts WHERE business_id = $1",
      [vendor.businessId],
    );
    expect(alert).toMatchObject({ type: "LOW_STOCK", active: true });
  });
});

// E2E-08: FR-SETTINGS-001
test.describe("settings and profile", () => {
  test("the owner can change their display name and it persists across reload", async ({ page, request }) => {
    const vendor = await createVendor(request);
    await signInBrowser(page, vendor);
    await page.goto("/dashboard/settings");

    await page.getByRole("button", { name: "Edit" }).first().click();
    await page.locator("#profile-name").fill("Renamed Vendor");
    await page.getByRole("button", { name: "Save profile" }).click();

    await expect(page.getByTestId("user-menu")).toContainText("Renamed Vendor");
    await page.reload();
    await expect(page.getByTestId("user-menu")).toContainText("Renamed Vendor");
    const [row] = await sql<{ full_name: string }>("SELECT full_name FROM users WHERE email = $1", [vendor.email]);
    expect(row.full_name).toBe("Renamed Vendor");
  });

  test("the owner can change the low-stock threshold and it is stored for their business only", async ({ page, request }) => {
    const vendor = await createVendor(request);
    const other = await createVendor(request);
    await signInBrowser(page, vendor);
    await page.goto("/dashboard/settings");

    await page.getByLabel("Low stock threshold (count)").fill("5");
    await page.getByRole("button", { name: "Save thresholds" }).click();

    await expect(page.getByRole("button", { name: "Save thresholds" })).toBeEnabled();
    const rows = await sql<{ id: string; low_stock_threshold: number }>(
      "SELECT id, low_stock_threshold FROM businesses WHERE id = ANY($1)",
      [[vendor.businessId, other.businessId]],
    );
    expect(rows.find((r) => r.id === vendor.businessId)!.low_stock_threshold).toBe(5);
    expect(rows.find((r) => r.id === other.businessId)!.low_stock_threshold).toBe(25);
  });
});

// E2E-09 / E2E-10: FR-ADMIN-001..003, FR-TENANT-003
test.describe("administration", () => {
  test.fixme("admin signs in and reaches the admin dashboard (FR-ADMIN-002/003) — NOT IMPLEMENTED: no /admin route or API exists", async () => {});

  test.fixme("a vendor who opens the admin area is denied (FR-TENANT-003) — NOT IMPLEMENTED: no admin area exists to protect", async () => {});
});
