import { resolveTestDatabaseUrl } from "../../server/tests/db/env";

export const ports = { api: 5100, web: 5273, ai: 8899, smtp: 2525 };

export const urls = {
  api: `http://127.0.0.1:${ports.api}`,
  web: `http://127.0.0.1:${ports.web}`,
  ai: `http://127.0.0.1:${ports.ai}`,
};

/** Dedicated database so E2E never shares state with the Jest database tests or the developer database. */
export function e2eDatabaseUrl(): string {
  const url = new URL(resolveTestDatabaseUrl());
  url.pathname = "/snapstock_e2e_test";
  return url.toString();
}
