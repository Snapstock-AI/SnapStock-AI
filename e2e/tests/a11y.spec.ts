/**
 * Accessibility BASELINE audit (axe-core WCAG 2.0/2.1 A + AA rules) and responsive checks.
 * SRS: NFR-USE-003 (360 px mobile, >= 1024 px desktop), NFR-USE-006 (accessibility baseline).
 *
 * This is an automated baseline, not a WCAG conformance claim: axe finds roughly a third of
 * real-world issues, and manual screen-reader/keyboard review is listed in MANUAL_TEST_PLAN.md.
 *
 * Every violation is reported. Known, triaged violations are listed in KNOWN_A11Y below with the
 * rule id, so the suite stays green only for issues that are documented; any NEW violation fails.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_JPEG, createVendor, setAiMode, signInBrowser, type Account } from "../support/helpers";
import { urls } from "../support/env";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** Rule ids observed on the current UI and accepted for now, keyed by page. See docs/testing/ACCESSIBILITY_TESTING.md. */
const KNOWN_A11Y: Record<string, string[]> = {};

/**
 * Purely decorative elements axe cannot recognise as decoration. WCAG 1.4.3 exempts pure decoration, so they are
 * excluded by exact selector (never a whole page) and each exclusion is justified here.
 *  - landing: the large 25%-opacity step numerals ("01", "02", ...) in "How it works", already aria-hidden.
 */
const DECORATIVE: Record<string, string[]> = {
  landing: ['[aria-hidden="true"].text-4xl'],
};

async function audit(page: Page, name: string) {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  for (const selector of DECORATIVE[name] ?? []) builder = builder.exclude(selector);
  const results = await builder.analyze();
  const known = new Set(KNOWN_A11Y[name] ?? []);
  const fresh = results.violations.filter((v) => !known.has(v.id));
  const summary = fresh.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(" ")}`);
  expect(summary, `axe violations on ${name}`).toEqual([]);
}

let vendor: Account;
test.beforeAll(async ({ request }) => {
  vendor = await createVendor(request);
  await setAiMode(request, "up");
});

test.describe("axe audit: public pages @a11y", () => {
  for (const [name, path] of [
    ["login", "/login"],
    ["signup", "/signup"],
    ["forgot-password", "/forgot-password"],
    ["landing", "/"],
  ] as const) {
    test(`${name}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await audit(page, name);
    });
  }
});

test.describe("axe audit: signed-in pages @a11y", () => {
  for (const [name, path] of [
    ["dashboard", "/dashboard"],
    ["scans", "/dashboard/scans"],
    ["inventory", "/dashboard/inventory"],
    ["alerts", "/dashboard/alerts"],
    ["shelves", "/dashboard/shelves"],
    ["analytics", "/dashboard/analytics"],
    ["settings", "/dashboard/settings"],
  ] as const) {
    test(`${name}`, async ({ page }) => {
      await signInBrowser(page, vendor);
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await audit(page, name);
    });
  }

  test("scan result view (after an analysis)", async ({ page, request }) => {
    await signInBrowser(page, vendor);
    await page.goto("/dashboard/scans");
    await page.getByLabel("Select a Shelf").selectOption({ label: `${vendor.shelfName} (Fruit)` });
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_JPEG);
    await page.getByRole("button", { name: "Analyze" }).click();
    await expect(page.getByText("Scan Result")).toBeVisible();
    void request;
    await audit(page, "scan-result");
  });
});

test.describe("keyboard and form semantics @a11y", () => {
  test("login form can be completed and submitted with the keyboard alone", async ({ page, request }) => {
    const account = await createVendor(request);
    await page.goto("/login");

    await page.getByLabel("Email").focus();
    await page.keyboard.type(account.email);
    await page.keyboard.press("Tab"); // "Forgot password?" link sits between the two fields
    await page.keyboard.press("Tab");
    await page.keyboard.type(account.password);
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("login tab order is email -> password -> sign in (logical order)", async ({ page }) => {
    await page.goto("/login");
    const order: string[] = [];
    await page.getByLabel("Email").focus();
    for (let i = 0; i < 4; i++) {
      order.push(await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return el?.id || el?.textContent?.trim() || el?.tagName || "";
      }));
      await page.keyboard.press("Tab");
    }
    const email = order.indexOf("email");
    const password = order.indexOf("password");
    const submit = order.findIndex((o) => /sign in/i.test(o));
    expect(email).toBeGreaterThanOrEqual(0);
    expect(password).toBeGreaterThan(email);
    expect(submit).toBeGreaterThan(password);
  });

  test("every input and select on the main pages has an accessible name", async ({ page }) => {
    await signInBrowser(page, vendor);
    for (const path of ["/login", "/signup", "/dashboard/scans", "/dashboard/settings"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const unnamed = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>("input:not([type=hidden]):not([type=file]), select, textarea"))
          .filter((el) => el.offsetParent !== null)
          .filter((el) => {
            const labelled = (el as HTMLInputElement).labels?.length || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
            return !labelled;
          })
          .map((el) => `${el.tagName.toLowerCase()}#${el.id || "(no id)"}[placeholder=${el.getAttribute("placeholder") ?? ""}]`),
      );
      expect(unnamed, `unlabelled controls on ${path}`).toEqual([]);
    }
  });

  test("buttons and links have discernible text or an aria-label", async ({ page }) => {
    await signInBrowser(page, vendor);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    const nameless = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>("button, a[href]"))
        .filter((el) => el.offsetParent !== null)
        .filter((el) => !(el.textContent?.trim() || el.getAttribute("aria-label") || el.getAttribute("title") || el.querySelector("img[alt]")))
        .map((el) => `${el.tagName.toLowerCase()} ${el.className.toString().slice(0, 40)}`),
    );
    expect(nameless).toEqual([]);
  });
});

test.describe("responsive layout @a11y", () => {
  for (const viewport of [
    { name: "360px phone", width: 360, height: 740 },
    { name: "1024px desktop", width: 1024, height: 768 },
  ]) {
    test(`no horizontal page scroll at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await signInBrowser(page, vendor);
      for (const path of ["/login", "/dashboard", "/dashboard/scans", "/dashboard/inventory", "/dashboard/settings"]) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${path} overflows horizontally by ${overflow}px at ${viewport.width}px`).toBeLessThanOrEqual(0);
      }
    });
  }

  // NFR-USE-003: touch targets >= 44 x 44 CSS px on the primary scan controls
  test("primary scan controls are at least 44x44 px on a 360px phone", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await signInBrowser(page, vendor);
    await page.goto("/dashboard/scans");
    await page.waitForLoadState("networkidle");

    const small: string[] = [];
    for (const name of ["Open Camera", "Add Stock", "Remove Stock"]) {
      const box = await page.getByRole("button", { name }).first().boundingBox();
      if (!box || box.width < 44 || box.height < 44) small.push(`${name}: ${box?.width}x${box?.height}`);
    }
    const shelf = await page.getByLabel("Select a Shelf").boundingBox();
    if (!shelf || shelf.height < 44) small.push(`shelf select: ${shelf?.width}x${shelf?.height}`);

    expect(small, "controls under 44x44 CSS px").toEqual([]);
  });

  // NFR-USE-004: colour must not be the only indicator
  test("freshness status is conveyed as text, not colour alone", async ({ page, request }) => {
    await signInBrowser(page, vendor);
    await page.goto("/dashboard/scans");
    await page.getByLabel("Select a Shelf").selectOption({ label: `${vendor.shelfName} (Fruit)` });
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_JPEG);
    await page.getByRole("button", { name: "Analyze" }).click();
    await expect(page.getByText("Scan Result")).toBeVisible();
    void request;

    await expect(page.getByText("Fresh", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Rotten", { exact: true }).first()).toBeVisible();
  });

  test("the API origin used by the audit is the local test stack", async () => {
    expect(urls.api).toContain("127.0.0.1");
  });
});
