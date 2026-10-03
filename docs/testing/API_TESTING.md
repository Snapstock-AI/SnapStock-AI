# API and database testing

API tests are automated (no Postman collection to maintain). Real paths are used (`/auth`, `/detection`, `/businesses`,
`/shelves`), not the `/api/...` prefix written in the SRS.

* **Route level** (`server/tests/integration`): Supertest against the real Express app and middleware with services
  mocked. Covers login/logout/refresh/reset wiring, JWT rejection, upload validation (type, size, signature, no file),
  degraded mode (503 `AI_UNAVAILABLE`, scan `FAILED`, health still 200), Helmet and CORS.
* **Real database** (`server/tests/db`, `npm run test:db`): runs against `snapstock_test`, recreated from all 21
  migrations before each run. Covers migrations, primary/foreign/unique/check constraints, cascades, soft deletion,
  registration/verification/login/logout/refresh/reset, inventory transaction + rollback (a trigger aborts the alert
  insert after the product UPDATE), concurrent scans, dashboard SQL, and authenticated HTTP for cross-tenant and role
  checks (both directions), manipulated ids and injection strings.
* Verified per test: status code, error schema (`{success:false,message}`), absence of stack traces / driver text /
  password hashes, and database side effects (no scan row, unchanged stock, unchanged shelf).

Not covered: pagination (no paginated endpoints exist; SRS default 20 / max 100 is unimplemented), SMTP failure paths
beyond the known defect TD-01, `GET /businesses/:id/alerts` read/unread state (not implemented).
