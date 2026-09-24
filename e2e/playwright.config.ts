import { defineConfig, devices } from "@playwright/test";
import { e2eDatabaseUrl, ports, urls } from "./support/env";

const backendEnv = {
  PORT: String(ports.api),
  DATABASE_URL: e2eDatabaseUrl(),
  JWT_SECRET: "e2e-only-secret",
  AI_SERVICE_URL: urls.ai,
  AI_SERVICE_TIMEOUT_MS: "5000",
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: String(ports.smtp),
  SMTP_USER: "noreply@snapstock.test",
  SMTP_PASS: "e2e",
  CLIENT_URL: urls.web,
  NODE_ENV: "development",
};

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "reports/html", open: "never" }],
    ["junit", { outputFile: "reports/junit.xml" }],
    ["json", { outputFile: "reports/results.json" }],
  ],
  outputDir: "reports/artifacts",
  use: {
    baseURL: urls.web,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    // NFR-USE-003: usable from a 360 px wide phone
    { name: "mobile", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 740 } }, grep: /@mobile|@a11y/ },
  ],
  webServer: [
    {
      command: "node support/test-doubles.mjs",
      url: `${urls.ai}/health`,
      env: { AI_PORT: String(ports.ai), SMTP_PORT: String(ports.smtp) },
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npx ts-node src/index.ts",
      cwd: "../server",
      url: `${urls.api}/health`,
      env: backendEnv,
      reuseExistingServer: false,
      timeout: 90_000,
    },
    {
      command: `npx vite --port ${ports.web} --strictPort --host 127.0.0.1`,
      cwd: "../client",
      url: urls.web,
      env: { VITE_API_URL: urls.api, NODE_ENV: "development" },
      reuseExistingServer: false,
      timeout: 90_000,
    },
  ],
});
