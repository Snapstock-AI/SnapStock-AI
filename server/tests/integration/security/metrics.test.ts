import request from "supertest";
import type { Express } from "express";

jest.mock("../../../src/modules/auth/auth.repository", () => ({
  AuthRepository: { findActiveSessionById: jest.fn() },
}));

function loadApp(env: Record<string, string | undefined> = {}): Express {
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

describe("GET /metrics", () => {
  it("exposes Prometheus text when no METRICS_TOKEN is set", async () => {
    const app = loadApp({ METRICS_TOKEN: undefined, NODE_ENV: "test" });
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/snapstock_http_requests_total|process_cpu/);
  });

  it("rejects scrapes without the bearer token when METRICS_TOKEN is set", async () => {
    const previous = process.env.METRICS_TOKEN;
    process.env.METRICS_TOKEN = "secret-metrics";
    try {
      const app = loadApp({ METRICS_TOKEN: "secret-metrics", NODE_ENV: "test" });
      // Handler reads the token at request time from process.env.
      process.env.METRICS_TOKEN = "secret-metrics";

      const denied = await request(app).get("/metrics");
      expect(denied.status).toBe(401);

      const ok = await request(app)
        .get("/metrics")
        .set("Authorization", "Bearer secret-metrics");
      expect(ok.status).toBe(200);
      expect(ok.text).toMatch(/# HELP/);
    } finally {
      if (previous === undefined) delete process.env.METRICS_TOKEN;
      else process.env.METRICS_TOKEN = previous;
    }
  });
});
