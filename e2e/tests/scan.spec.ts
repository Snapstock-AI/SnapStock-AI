import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_JPEG, createVendor, setAiMode, signInBrowser, sql, type Account } from "../support/helpers";

async function openScanPage(page: Page, vendor: Account) {
  await signInBrowser(page, vendor);
  await page.goto("/dashboard/scans");
  await expect(page.getByRole("heading", { name: "Shelf scans" })).toBeVisible();
  await page.getByLabel("Select a Shelf").selectOption({ label: `${vendor.shelfName} (Fruit)` });
}

const stockOf = async (businessId: string) =>
  (await sql<{ quantity: number }>("SELECT quantity FROM products WHERE business_id = $1 AND name = 'apple'", [businessId]))[0].quantity;

const scanStatuses = async (businessId: string) =>
  (await sql<{ status: string }>("SELECT status FROM scans WHERE business_id = $1 ORDER BY created_at", [businessId])).map((r) => r.status);

test.beforeEach(async ({ request }) => {
  await setAiMode(request, "up");
});

test.describe("scan journey", () => {
  // E2E-03: FR-SCAN-001/002/004, FR-DET-002, FR-INV-002
  test("select shelf -> upload -> preview -> analyze -> result and inventory update", async ({ page, request }) => {
    const vendor = await createVendor(request);
    await openScanPage(page, vendor);

    await page.locator('input[type="file"]').setInputFiles(SAMPLE_JPEG);
    await expect(page.getByRole("img", { name: "Preview" })).toBeVisible();
    await page.getByRole("button", { name: "Analyze" }).click();

    await expect(page.getByText("Scan Result")).toBeVisible();
    await expect(page.getByText("Stock added")).toBeVisible();
    await expect(page.getByText("Current 10 · Detected 3 · New stock 13")).toBeVisible();

    expect(await stockOf(vendor.businessId)).toBe(13);
    expect(await scanStatuses(vendor.businessId)).toEqual(["COMPLETED"]);
    const [detections] = await sql<{ n: string }>(
      "SELECT COUNT(*) AS n FROM detections d JOIN scans s ON s.id = d.scan_id WHERE s.business_id = $1",
      [vendor.businessId],
    );
    expect(Number(detections.n)).toBe(3);
  });

  test("a user without a shelf selection is told to pick one and nothing is uploaded", async ({ page, request }) => {
    const vendor = await createVendor(request);
    await signInBrowser(page, vendor);
    await page.goto("/dashboard/scans");

    await page.getByRole("button", { name: "Open Camera" }).click();

    await expect(page.getByRole("alert")).toContainText("Please select a shelf first.");
    expect(await scanStatuses(vendor.businessId)).toEqual([]);
  });

  // E2E-04: FR-SCAN-004 A1, NFR-USE-005
  test("an unsupported file gives an understandable error, creates no scan, and a valid image can then be sent", async ({ page, request }) => {
    const vendor = await createVendor(request);
    await openScanPage(page, vendor);

    await page.locator('input[type="file"]').setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("this is not a photo"),
    });
    await page.getByRole("button", { name: "Analyze" }).click();

    await expect(page.getByRole("alert")).toContainText(/upload a JPEG, PNG or WebP image/i);
    await expect(page.getByRole("alert")).not.toContainText(/stack|Error:|multer|undefined/i);
    expect(await scanStatuses(vendor.businessId)).toEqual([]);
    expect(await stockOf(vendor.businessId)).toBe(10);

    await page.locator('input[type="file"]').setInputFiles(SAMPLE_JPEG);
    await page.getByRole("button", { name: "Analyze" }).click();
    await expect(page.getByText("Scan Result")).toBeVisible();
    expect(await stockOf(vendor.businessId)).toBe(13);
  });

  test("Remove Stock subtracts the detected items from inventory", async ({ page, request }) => {
    const vendor = await createVendor(request);
    await openScanPage(page, vendor);

    await page.getByRole("button", { name: "Remove Stock" }).click();
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_JPEG);
    await page.getByRole("button", { name: "Analyze" }).click();

    await expect(page.getByText("Stock removed")).toBeVisible();
    expect(await stockOf(vendor.businessId)).toBe(7);
  });
});

// E2E-05 (FR-HEALTH-002): AI unavailable -> controlled error -> scan FAILED -> other pages usable -> retry
test.describe("degraded mode: AI service unavailable", () => {
  test("scan fails gracefully, other pages keep working, and retry succeeds once the AI is back", async ({ page, request }) => {
    const vendor = await createVendor(request);
    await openScanPage(page, vendor);
    await setAiMode(request, "down");

    await page.locator('input[type="file"]').setInputFiles(SAMPLE_JPEG);
    await page.getByRole("button", { name: "Analyze" }).click();

    // Understandable message; no internal detail.
    const alert = page.getByRole("alert");
    await expect(alert).toContainText(/temporarily unavailable/i);
    await expect(alert).not.toContainText(/ECONN|127\.0\.0\.1|8899|503|axios/i);

    // Scan recorded as FAILED and inventory untouched.
    expect(await scanStatuses(vendor.businessId)).toEqual(["FAILED"]);
    expect(await stockOf(vendor.businessId)).toBe(10);

    // Retry is offered without re-selecting the image.
    await expect(page.getByRole("button", { name: "Analyze" })).toBeVisible();

    // Authentication, inventory, alerts and settings remain available.
    await page.goto("/dashboard/inventory");
    await expect(page.getByRole("heading", { name: "Inventory" }).first()).toBeVisible();
    await page.goto("/dashboard/alerts");
    await expect(page.getByRole("heading", { name: "Alerts" }).first()).toBeVisible();
    await page.goto("/dashboard/settings");
    await expect(page.getByRole("heading", { name: "Settings" }).first()).toBeVisible();
    await expect(page).not.toHaveURL(/login/);

    // AI recovers -> a new scan succeeds and only then changes inventory.
    await setAiMode(request, "up");
    await page.goto("/dashboard/scans");
    await page.getByLabel("Select a Shelf").selectOption({ label: `${vendor.shelfName} (Fruit)` });
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_JPEG);
    await page.getByRole("button", { name: "Analyze" }).click();
    await expect(page.getByText("Scan Result")).toBeVisible();

    expect(await scanStatuses(vendor.businessId)).toEqual(["FAILED", "COMPLETED"]);
    expect(await stockOf(vendor.businessId)).toBe(13);
  });

  test("Analyze on the same preview works as a retry after the outage", async ({ page, request }) => {
    const vendor = await createVendor(request);
    await openScanPage(page, vendor);
    await setAiMode(request, "down");
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_JPEG);
    await page.getByRole("button", { name: "Analyze" }).click();
    await expect(page.getByRole("alert")).toContainText(/temporarily unavailable/i);

    await setAiMode(request, "up");
    await page.getByRole("button", { name: "Analyze" }).click();

    await expect(page.getByText("Scan Result")).toBeVisible();
    expect(await stockOf(vendor.businessId)).toBe(13);
  });
});
