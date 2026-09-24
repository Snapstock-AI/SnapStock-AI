import { randomUUID } from "node:crypto";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { Client } from "pg";
import { e2eDatabaseUrl, urls } from "./env";

export const PASSWORD = "Fresh2024";

export interface Account {
  email: string;
  password: string;
  token: string;
  refreshToken: string;
  user: Record<string, unknown>;
  businessId: string;
  shelfId: string;
  shelfName: string;
}

export const uniqueEmail = (prefix = "user") => `${prefix}-${randomUUID().slice(0, 8)}@example.test`;

const decodeQuotedPrintable = (text: string) =>
  text.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));

/** Reads the newest captured email for an address and returns the action link it contains. */
export async function latestMailLink(request: APIRequestContext, to: string, path: string): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const mails = (await (await request.get(`${urls.ai}/__mail`, { params: { to } })).json()) as { raw: string }[];
        for (const mail of mails.reverse()) {
          const match = decodeQuotedPrintable(mail.raw).match(new RegExp(`https?://[^\\s"'<>]+${path}\\?token=[0-9a-f]+`));
          if (match) {
            link = match[0];
            return true;
          }
        }
        return false;
      },
      { message: `no ${path} email captured for ${to}`, timeout: 15_000 },
    )
    .toBe(true);
  return link!;
}

export async function registerAndVerify(request: APIRequestContext, email = uniqueEmail()) {
  const registered = await request.post(`${urls.api}/auth/register`, {
    data: { full_name: "E2E Vendor", email, password: PASSWORD },
  });
  expect(registered.status()).toBe(201);
  const link = await latestMailLink(request, email, "verify-email");
  const token = new URL(link).searchParams.get("token")!;
  const verified = await request.get(`${urls.api}/auth/verify-email`, { params: { token } });
  expect(verified.ok()).toBe(true);
  return email;
}

export async function login(request: APIRequestContext, email: string, password = PASSWORD) {
  const response = await request.post(`${urls.api}/auth/login`, { data: { email, password } });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()).data as { token: string; refreshToken: string; user: Record<string, unknown> };
}

/** A verified vendor with a business, one shelf and one product ("apple", stock 10). */
export async function createVendor(request: APIRequestContext, options: { withBusiness?: boolean } = {}): Promise<Account> {
  const email = await registerAndVerify(request);
  let session = await login(request, email);
  let businessId = "";
  let shelfId = "";
  const shelfName = "Fruit shelf";

  if (options.withBusiness !== false) {
    const created = await request.post(`${urls.api}/businesses`, {
      headers: { Authorization: `Bearer ${session.token}` },
      data: {
        business_name: `E2E Store ${randomUUID().slice(0, 6)}`,
        business_email: email,
        address: "1 Test Street, Colombo",
        contact_number: "0771234567",
      },
    });
    expect(created.ok(), await created.text()).toBe(true);
    const body = (await created.json()).data;
    session = { token: body.token, refreshToken: body.refreshToken, user: body.user };
    businessId = body.business.id;

    const shelf = await request.post(`${urls.api}/shelves`, {
      headers: { Authorization: `Bearer ${session.token}` },
      data: { businessId, name: shelfName, category: "Fruit" },
    });
    expect(shelf.ok(), await shelf.text()).toBe(true);
    shelfId = (await shelf.json()).data.id;

    await sql("INSERT INTO products (business_id, name, quantity, low_stock_threshold) VALUES ($1, 'apple', 10, 0)", [businessId]);
  }

  return { email, password: PASSWORD, ...session, businessId, shelfId, shelfName };
}

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: e2eDatabaseUrl() });
  await client.connect();
  try {
    return (await client.query(text, params)).rows as T[];
  } finally {
    await client.end();
  }
}

/** Puts a session into the browser exactly as the app's own login would (see client/src/lib/auth.ts). */
export async function signInBrowser(page: Page, account: Pick<Account, "token" | "refreshToken" | "user">) {
  await page.addInitScript((a) => {
    // The script re-runs on every navigation; only seed a fresh browser so reloads keep app-made changes.
    if (localStorage.getItem("snapstock_token")) return;
    localStorage.setItem("snapstock_token", a.token);
    localStorage.setItem("snapstock_refresh", a.refreshToken);
    localStorage.setItem("snapstock_user", JSON.stringify(a.user));
  }, account);
}

export async function setAiMode(request: APIRequestContext, mode: "up" | "down" | "slow") {
  await request.post(`${urls.ai}/__mode`, { data: { mode } });
}

/** A valid 1x1-scaled JPEG-signature payload accepted by the server-side upload validation. */
export const SAMPLE_JPEG = {
  name: "shelf.jpg",
  mimeType: "image/jpeg",
  buffer: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.alloc(256, 7)]),
};
