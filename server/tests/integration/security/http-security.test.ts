/**
 * HTTP hardening. SRS: NFR-SEC-001 (Helmet, CORS whitelist), NFR-SEC-004 (invalid JSON),
 * NFR-SEC-005 (no stack traces / internals leaked).
 *
 * The app is loaded in isolation per test so that environment-driven config
 * (CLIENT_URL, CORS_ORIGINS, NODE_ENV) is read fresh.
 */
import request from "supertest";
import type { Express } from "express";

jest.mock("../../../src/modules/auth/auth.repository", () => ({
  AuthRepository: { findActiveSessionById: jest.fn() },
}));

const ALLOWED = "https://app.snapstock.example";
const EVIL = "https://evil.example";

function loadApp(env: Record<string, string | undefined>): Express {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k];
  let app!: Express;
  jest.isolateModules(() => {
    app = require("../../../src/app").default;
  });
  process.env = saved;
  return app;
}

describe("security headers (Helmet)", () => {
  const app = loadApp({ NODE_ENV: "test" });

  it("sets X-Content-Type-Options: nosniff", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("prevents framing of API responses", async () => {
    const res = await request(app).get("/health");
    const frameGuard = res.headers["x-frame-options"];
    const csp = res.headers["content-security-policy"] ?? "";
    expect(Boolean(frameGuard) || /frame-ancestors/.test(csp)).toBe(true);
  });

  it("does not advertise the framework via X-Powered-By", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("sends Strict-Transport-Security so HTTPS is preferred once deployed behind TLS", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["strict-transport-security"]).toMatch(/max-age=\d+/);
  });
});

describe("CORS (NFR-SEC-001.3)", () => {
  const prod = loadApp({ NODE_ENV: "production", CLIENT_URL: ALLOWED, CORS_ORIGINS: undefined });

  it("allows the configured client origin", async () => {
    const res = await request(prod).get("/health").set("Origin", ALLOWED);
    expect(res.headers["access-control-allow-origin"]).toBe(ALLOWED);
  });

  it("does not grant an unknown origin access", async () => {
    const res = await request(prod).get("/health").set("Origin", EVIL);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("never answers with a wildcard in production", async () => {
    const res = await request(prod).get("/health").set("Origin", EVIL);
    expect(res.headers["access-control-allow-origin"]).not.toBe("*");
  });

  it("refuses a pre-flight from an unknown origin", async () => {
    const res = await request(prod)
      .options("/auth/login")
      .set("Origin", EVIL)
      .set("Access-Control-Request-Method", "POST");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("accepts additional origins listed in CORS_ORIGINS", async () => {
    const app = loadApp({
      NODE_ENV: "production",
      CLIENT_URL: ALLOWED,
      CORS_ORIGINS: "https://admin.snapstock.example, https://demo.snapstock.example",
    });
    const res = await request(app).get("/health").set("Origin", "https://demo.snapstock.example");
    expect(res.headers["access-control-allow-origin"]).toBe("https://demo.snapstock.example");
  });

  it("with no whitelist configured, production denies cross-origin access instead of defaulting to wildcard", async () => {
    const app = loadApp({ NODE_ENV: "production", CLIENT_URL: undefined, CORS_ORIGINS: undefined });
    const res = await request(app).get("/health").set("Origin", ALLOWED);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("error responses (NFR-SEC-005)", () => {
  const app = loadApp({ NODE_ENV: "production", CLIENT_URL: ALLOWED });

  it("returns a controlled 4xx for malformed JSON, without a stack trace or file paths", async () => {
    const res = await request(app)
      .post("/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": "a@b.c", "password": ');

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.text).not.toMatch(/SyntaxError|node_modules|\.ts:\d+|at .+\(.+\)/);
  });

  it("returns 401 JSON, not an HTML stack page, for a protected route without a token", async () => {
    const res = await request(app).get("/shelves");
    expect(res.status).toBe(401);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toMatchObject({ success: false });
  });
});
