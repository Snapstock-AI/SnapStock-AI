import { expect, test } from "@playwright/test";
import { PASSWORD, createVendor, latestMailLink, sql, uniqueEmail } from "../support/helpers";

test.describe("authentication journeys", () => {
  // E2E-01: FR-AUTH-001, FR-AUTH-004, FR-AUTH-002
  test("registration -> email verification -> login -> business onboarding -> dashboard", async ({ page, request }) => {
    const email = uniqueEmail("journey");

    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Journey Vendor");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create free account" }).click();

    await expect(page.getByText(/verify/i).first()).toBeVisible();

    // Login is refused until the email is verified.
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByRole("alert")).toContainText(/verify your email/i);

    const link = await latestMailLink(request, email, "verify-email");
    await page.goto(link);
    await expect(page.getByText(/verified/i).first()).toBeVisible();

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();

    // No business yet -> onboarding, then the dashboard.
    await expect(page).toHaveURL(/onboarding\/business|dashboard/);
    if (page.url().includes("onboarding")) {
      await page.getByLabel("Business name").fill("Journey Mart");
      await page.getByLabel("Business email").fill(email);
      await page.getByLabel("Business address").fill("12 Galle Road, Colombo");
      await page.getByLabel("Contact number").fill("0771234567");
      await page.getByRole("button", { name: /create/i }).click();
    }
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  // E2E-02: FR-AUTH-002, NFR-USE-002 (login is 2 fields + 1 button)
  test("login shows exactly the email and password fields and lands on the dashboard", async ({ page, request }) => {
    const vendor = await createVendor(request);

    await page.goto("/login");
    await expect(page.locator("form input:not([type=hidden])")).toHaveCount(2);
    await page.getByLabel("Email").fill(vendor.email);
    await page.getByLabel("Password").fill(vendor.password);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("link", { name: /inventory/i }).first()).toBeVisible();
  });

  test("wrong password shows a friendly error and no session is stored", async ({ page, request }) => {
    const vendor = await createVendor(request);

    await page.goto("/login");
    await page.getByLabel("Email").fill(vendor.email);
    await page.getByLabel("Password").fill("Wrong2024");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByRole("alert")).toContainText("Invalid credentials");
    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(() => localStorage.getItem("snapstock_token"))).toBeNull();
  });

  test("an unauthenticated visitor to the dashboard is sent to login", async ({ page }) => {
    await page.goto("/dashboard/inventory");

    await expect(page).toHaveURL(/\/login/);
  });

  // FR-AUTH-003
  test("logout ends the session: the old token is rejected by the API", async ({ page, request }) => {
    const vendor = await createVendor(request);
    await page.goto("/login");
    await page.getByLabel("Email").fill(vendor.email);
    await page.getByLabel("Password").fill(vendor.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const token = await page.evaluate(() => localStorage.getItem("snapstock_token"));

    await page.getByTestId("user-menu").click();
    await page.getByRole("menuitem", { name: "Logout" }).click();

    await expect(page).toHaveURL(/\/login|\/$/);
    const afterLogout = await request.get(`http://127.0.0.1:5100/shelves?businessId=${vendor.businessId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(afterLogout.status()).toBe(401);
  });

  test("registration stores the password only as a bcrypt hash", async ({ request }) => {
    const vendor = await createVendor(request);

    const [row] = await sql<{ password_hash: string }>("SELECT password_hash FROM users WHERE email = $1", [vendor.email]);
    expect(row.password_hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(row.password_hash).not.toContain(PASSWORD);
  });
});
