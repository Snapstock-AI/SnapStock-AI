# Defects found by the test work

## Fixed (each fix has a test that failed before it)

| ID | Bug found | Root cause | Fix | Proving test |
|----|-----------|-----------|-----|--------------|
| BUG-01 | Registration/reset accepted any password; email kept as typed (FR-AUTH-001) | no server-side policy | `assertPasswordPolicy` (8+ chars, letter+digit), lowercase email; signup `minLength` 6 -> 8 | `server/tests/unit/auth/auth.register.test.ts` |
| BUG-02 | No security headers; `Access-Control-Allow-Origin: *` (NFR-SEC-001) | `helmet` never mounted, bare `cors()` | `helmet()`; CORS whitelist from `CLIENT_URL`/`CORS_ORIGINS` (production with neither set denies cross-origin - **deployments must set `CLIENT_URL`**) | `server/tests/integration/security/http-security.test.ts` |
| BUG-03 | Any file of any size accepted on scan upload (NFR-SEC-004.3/006) | multer memory storage only | 10 MB limit (`MAX_UPLOAD_BYTES`), JPEG/PNG/WebP allow-list, magic-byte check, errors as 400 | `server/tests/integration/detection/scan-upload.validation.test.ts` |
| BUG-04 | AI outage returned 400 with the raw socket error (internal host/port) and the AI call had no timeout (FR-HEALTH-002) | error text passed through | `AI_SERVICE_TIMEOUT_MS` (30 s), `AiServiceUnavailableError` -> 503 `{code: AI_UNAVAILABLE}` | `.../degraded-mode.test.ts`, `e2e/tests/scan.spec.ts` |
| BUG-05 | AI `/analyze` with models not loaded -> 500 leaking `AttributeError` | unguarded `app.state` access | 503 "models not loaded" | `ai-service/tests/api/test_model_availability.py` |
| BUG-06 | **Inventory page always failed** ("missing FROM-clause entry for table product"); dashboard reused the query (FR-INV-001) | `inventoryByProduct` selected `product.quantity` without joining `products` | LEFT JOIN products | `server/tests/db/dashboard.db.test.ts`, E2E inventory test |
| BUG-07 | Verification link showed "Invalid or expired token" although verification succeeded | single-use token requested twice (StrictMode remount / double open) | request each token once | `e2e/tests/auth.spec.ts` |
| BUG-08 | After a failed scan the preview was discarded, no retry without re-selecting the file (FR-SCAN-004) | preview cleared regardless of outcome | cleared only on success | `e2e/tests/scan.spec.ts` (retry) |
| BUG-09 | Cross-tenant / wrong-role requests answered 400, malformed ids returned raw PostgreSQL text (FR-TENANT-003 A1/A2, NFR-SEC-005) | every controller answered 400 with `error.message` | `ForbiddenError` -> 403, `errorMessage()` hides driver errors | `server/tests/db/api-security.db.test.ts` |
| BUG-10 | Unnamed controls (settings inputs, freshness selects, mobile logo link, search), 40 px scan controls (NFR-USE-003/006) | missing `aria-label`, small sizes | labels added, `min-h-11` on scan controls | `e2e/tests/a11y.spec.ts` |
| TEST-01 | 12 of 15 client tests failing at baseline | tests predated the page (router links, async shelves) and `NODE_ENV=production` shell | tests repaired, vitest pins `NODE_ENV=test` | `client/tests/unit/ScansPage.test.tsx` |

## Known open defects (asserted with `it.failing`, or documented; not fixed)

| ID | Defect | SRS | Evidence |
|----|--------|-----|----------|
| TD-01 | SMTP failure aborts registration (400) instead of keeping the account | FR-AUTH-001 A3 | `auth.register.test.ts` |
| TD-02 | An EMPLOYEE can soft-delete shelves | FR-TENANT-003 | `rbac.tenant.test.ts` |
| TD-03 | Non-database internal errors (e.g. a plain `Error` from a service) are still echoed to clients | NFR-SEC-005 | `degraded-mode.test.ts` |
| TD-04 | AI service returns raw exception text on internal failure (internal-only endpoint) | NFR-SEC-005 | `test_analyze_route.py` asserts it |
| TD-05 | No `/api/admin` API or admin UI (FR-ADMIN-001..003, NFR-SEC-003.4); `SYSTEM_ADMIN` role exists but nothing uses it | FR-ADMIN | E2E `test.fixme` |
| TD-06 | Backend `/health` is static (no DB/AI probe, no degraded status) | FR-HEALTH-001 | source |
| TD-07 | No rate limiting on auth/resend endpoints | FR-AUTH-004 A3 | source |
| TD-08 | No read/unread alert state, no manual inventory adjust or catalog routes, no client image compression / upload retry | FR-ALERT-004, FR-INV-003/004, FR-SCAN-003 | source review, not tested |
| TD-09 | Login/invalid credentials answer 400 not 401; dashboard labels Medium as "Ripe" | FR-AUTH-002, FR-FRESH-001 | source |
| TD-10 | Dependency advisories: server 3 high + 3 moderate, client 4 high (production deps) | NFR-SEC-005.3 | `tests/security/dependency-audit.mjs` |
| TD-11 | Local freshness dataset test split contains 2698 images identical to train/val (evaluation refused); dataset is 2-class | NFR-REL-004 | `evaluate_freshness` |
| TD-12 | `npm run lint` in the client reports 32 errors and 6 warnings (mostly react-hooks rules; not triaged, not caused by test code but not verified against the baseline) | - | `npm run lint` |
| TD-13 | Backend upload limit (10 MB) exceeds the AI service limit (5 MB): 5-10 MB images pass the API and fail at the AI | consistency | config |
