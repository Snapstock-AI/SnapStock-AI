/**
 * Authorization, tenant isolation and error hygiene over real HTTP + real PostgreSQL.
 * SRS: FR-TENANT-003 (A1 wrong role -> 403, A2 cross-tenant -> 403), NFR-SEC-003 (no IDOR),
 * NFR-SEC-004 (validation), NFR-SEC-005 (no internals in errors).
 *
 * Every request carries a genuine JWT backed by a session row, so the auth middleware runs unmodified.
 */
import jwt from "jsonwebtoken";
import request from "supertest";
import { randomUUID } from "crypto";

import app from "../../src/app";
import { AppDataSource } from "../../src/config/data-source";
import { AuthRepository } from "../../src/modules/auth/auth.repository";
import { pool, createTenant, Tenant } from "./helpers";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

async function tokenFor(userId: string, email: string) {
  const session = await AuthRepository.createSession(userId, randomUUID(), new Date(Date.now() + 3600_000));
  return jwt.sign(
    { userId, email, system_role: "BUSINESS_USER", sessionId: session.id, businessId: null },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" },
  );
}

async function ownerToken(tenant: Tenant) {
  const { rows } = await pool.query("SELECT email FROM users WHERE id = $1", [tenant.ownerId]);
  return tokenFor(tenant.ownerId, rows[0].email);
}

async function employeeToken(tenant: Tenant) {
  const tag = randomUUID().slice(0, 8);
  const { rows: [user] } = await pool.query(
    "INSERT INTO users (full_name, email, password_hash, email_verified) VALUES ('Employee', $1, 'x', TRUE) RETURNING id",
    [`employee-${tag}@example.test`],
  );
  await pool.query("INSERT INTO business_users (business_id, user_id, role) VALUES ($1, $2, 'EMPLOYEE')", [tenant.businessId, user.id]);
  return tokenFor(user.id, `employee-${tag}@example.test`);
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

let a: Tenant;
let b: Tenant;
let tokenA: string;
let tokenB: string;

beforeAll(async () => {
  await AppDataSource.initialize();
  a = await createTenant();
  b = await createTenant();
  tokenA = await ownerToken(a);
  tokenB = await ownerToken(b);
});

afterAll(async () => {
  await AppDataSource.destroy();
  await pool.end();
});

describe("cross-tenant access is refused with 403 and leaks nothing (both directions)", () => {
  const readEndpoints = (victim: () => Tenant) => [
    ["shelves", () => `/shelves?businessId=${victim().businessId}`],
    ["dashboard", () => `/businesses/${victim().businessId}/dashboard`],
    ["inventory", () => `/businesses/${victim().businessId}/inventory`],
    ["alerts", () => `/businesses/${victim().businessId}/alerts`],
    ["analytics", () => `/businesses/${victim().businessId}/analytics`],
    ["employees", () => `/businesses/${victim().businessId}/employees`],
    ["invitations", () => `/businesses/${victim().businessId}/invitations`],
    ["scan history", () => `/detection/history?businessId=${victim().businessId}`],
  ] as const;

  describe.each([
    ["A reads B", () => tokenA, () => b],
    ["B reads A", () => tokenB, () => a],
  ])("%s", (_label, token, victim) => {
    it.each(readEndpoints(victim))("GET %s -> 403", async (_name, path) => {
      const res = await request(app).get(path()).set(bearer(token()));

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ success: false });
      expect(res.text).not.toContain(victim().businessId);
      expect(res.text).not.toContain(victim().shelfId);
    });
  });

  it("A cannot create a shelf in B's business", async () => {
    const res = await request(app).post("/shelves").set(bearer(tokenA)).send({ businessId: b.businessId, name: "Injected" });

    expect(res.status).toBe(403);
    const { rowCount } = await pool.query("SELECT 1 FROM shelves WHERE business_id = $1 AND name = 'Injected'", [b.businessId]);
    expect(rowCount).toBe(0);
  });

  it("A cannot rename or delete B's shelf by id", async () => {
    const put = await request(app).put(`/shelves/${b.shelfId}`).set(bearer(tokenA)).send({ name: "Hijacked" });
    const del = await request(app).delete(`/shelves/${b.shelfId}`).set(bearer(tokenA));

    expect(put.status).toBe(403);
    expect(del.status).toBe(403);
    const { rows } = await pool.query("SELECT name, deleted_at FROM shelves WHERE id = $1", [b.shelfId]);
    expect(rows[0]).toMatchObject({ name: "Shelf 1", deleted_at: null });
  });

  it("A cannot update or delete B's business", async () => {
    const patch = await request(app).patch(`/businesses/${b.businessId}`).set(bearer(tokenA)).send({ business_name: "Hijacked" });
    const del = await request(app).delete(`/businesses/${b.businessId}`).set(bearer(tokenA));

    expect(patch.status).toBe(403);
    expect(del.status).toBe(403);
    const { rowCount } = await pool.query("SELECT 1 FROM businesses WHERE id = $1 AND business_name <> 'Hijacked'", [b.businessId]);
    expect(rowCount).toBe(1);
  });

  it("A cannot submit a scan into B's business, and no scan row is created", async () => {
    const res = await request(app)
      .post("/detection/analyze")
      .set(bearer(tokenA))
      .field("businessId", b.businessId)
      .field("shelfId", b.shelfId)
      .attach("file", JPEG, "shelf.jpg");

    expect(res.status).toBe(403);
    const { rowCount } = await pool.query("SELECT 1 FROM scans WHERE business_id = $1", [b.businessId]);
    expect(rowCount).toBe(0);
  });
});

describe("role-based access inside one business (FR-TENANT-003)", () => {
  it("an EMPLOYEE is denied OWNER-only operations with 403", async () => {
    const token = await employeeToken(a);

    for (const call of [
      request(app).patch(`/businesses/${a.businessId}`).set(bearer(token)).send({ business_name: "Renamed" }),
      request(app).delete(`/businesses/${a.businessId}`).set(bearer(token)),
      request(app).get(`/businesses/${a.businessId}/employees`).set(bearer(token)),
      request(app).get(`/businesses/${a.businessId}/invitations`).set(bearer(token)),
      request(app).post(`/businesses/${a.businessId}/invitations`).set(bearer(token)).send({ email: "x@example.test" }),
    ]) {
      expect((await call).status).toBe(403);
    }
    const { rowCount } = await pool.query("SELECT 1 FROM businesses WHERE id = $1 AND business_name NOT LIKE 'Renamed'", [a.businessId]);
    expect(rowCount).toBe(1);
  });

  it("an EMPLOYEE can perform operational reads in their own business", async () => {
    const token = await employeeToken(a);

    expect((await request(app).get(`/businesses/${a.businessId}/dashboard`).set(bearer(token))).status).toBe(200);
    expect((await request(app).get(`/shelves?businessId=${a.businessId}`).set(bearer(token))).status).toBe(200);
  });

  it("the OWNER can read their employee list", async () => {
    const res = await request(app).get(`/businesses/${a.businessId}/employees`).set(bearer(tokenA));

    expect(res.status).toBe(200);
  });
});

describe("manipulated identifiers and malformed input (NFR-SEC-004/005)", () => {
  it.each([
    ["not-a-uuid"],
    ["1' OR '1'='1"],
    ["00000000-0000-0000-0000-000000000000"],
    ["../../etc/passwd"],
    ["%00"],
  ])("businessId %j yields a controlled 4xx with no database internals", async (badId) => {
    const res = await request(app).get(`/businesses/${encodeURIComponent(badId)}/dashboard`).set(bearer(tokenA));

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.text).not.toMatch(/invalid input syntax|uuid|pg_|QueryFailed|syntax error|relation "|\.ts:\d+/i);
  });

  it("a SQL-injection payload in a query parameter neither errors out nor widens the result", async () => {
    const res = await request(app)
      .get("/shelves")
      .query({ businessId: `${a.businessId}' OR '1'='1` })
      .set(bearer(tokenA));

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.text).not.toContain(b.shelfId);
  });

  it("a shelf id that is not a UUID is rejected without leaking driver errors", async () => {
    const res = await request(app).put("/shelves/not-a-uuid").set(bearer(tokenA)).send({ name: "x" });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.text).not.toMatch(/invalid input syntax|uuid/i);
  });

  it("extra body fields cannot override tenant ownership when creating a shelf", async () => {
    const res = await request(app)
      .post("/shelves")
      .set(bearer(tokenA))
      .send({ businessId: a.businessId, name: "Mass assignment", business_id: b.businessId, id: randomUUID(), deleted_at: null });

    expect(res.status).toBeLessThan(300);
    const { rows } = await pool.query("SELECT business_id FROM shelves WHERE name = 'Mass assignment'");
    expect(rows).toEqual([{ business_id: a.businessId }]);
  });

  it("no response ever contains a password hash", async () => {
    const paths = [`/businesses/mine`, `/businesses/${a.businessId}/employees`, `/businesses/${a.businessId}/dashboard`];
    for (const path of paths) {
      const res = await request(app).get(path).set(bearer(tokenA));
      expect(res.text).not.toMatch(/password_hash|\$2[aby]\$/);
    }
  });
});
