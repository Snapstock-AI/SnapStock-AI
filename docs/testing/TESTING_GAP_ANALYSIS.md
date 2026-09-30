# Testing Gap Analysis

Baseline audit of the repository at branch `dev` (commit `600b67948`), taken **before** the testing work in this
series. Requirement IDs come from [docs/srs.md](../srs.md). "Existing test" lists only what was found in the
repository; "Status" describes test coverage, not whether the feature works.

Audit date: 2026-09-24. Environment: Windows 11, Node v22.17.0, Python 3.12.1, Docker Desktop (Postgres 16 running).

## 1. Baseline (measured, not assumed)

| Suite | Framework | Result at audit time |
|-------|-----------|----------------------|
| `server/tests` (9 suites) | Jest 30 + ts-jest + Supertest | 52 passed / 0 failed |
| `client/tests` (2 files) | Vitest 4 + Testing Library + jsdom | **12 of 15 failed** (stale tests, see below) |
| `ai-service/tests` | pytest + FastAPI TestClient | 118 passed / 0 failed |

The 12 client failures were test defects, not app defects: the page under test now renders router `<Link>`s, fetches
shelves and scan history on mount, and exposes an editable freshness selector, none of which the tests accounted for.
In addition, this machine exports `NODE_ENV=production`, which makes React load a build without `act()`. Both were
fixed in commit `600b67948` (client now 15/15).

## 2. Tooling inventory

| Area | Installed | Not installed |
|------|-----------|---------------|
| Backend | Jest, ts-jest, Supertest | coverage config, JUnit reporter |
| Frontend | Vitest, Testing Library, jest-dom, user-event, jsdom | coverage provider, Playwright/Cypress, axe-core |
| AI service | pytest, pytest-cov, pytest-mock, httpx | eval dataset, mAP tooling |
| Load | none (`k6` not installed locally) | k6 |
| CI | GitHub Actions: `server-ci.yml` (jest), `ai-service-ci.yml`; image builds | client CI job, E2E, security jobs |

Existing test style in the backend: route tests mock the service layer and the session repository, so they exercise
Express wiring, middleware and controllers but **not** SQL. No test touches a real database.

## 3. Verified application facts that shape the tests

These were read from source; several are SRS gaps that tests must report, not hide.

| Fact | Evidence | SRS impact |
|------|----------|-----------|
| Helmet is **not** applied (`helmet` is a dependency, never imported) | `server/src/app.ts` | NFR-SEC-001.2 not met |
| CORS is `cors()` with no origin whitelist | `server/src/app.ts` | NFR-SEC-001.3 not met |
| No `/api/admin` routes; only `SYSTEM_ADMIN`/`BUSINESS_USER` system roles exist | `server/src/entities/User.ts`, routes | FR-ADMIN-001..003, NFR-SEC-003.4 not implemented |
| No `/health` DB or AI probe; `/health` returns a static body | `server/src/app.ts` | FR-HEALTH-001/002 partly implemented |
| multer configured with memory storage, **no size or MIME limit** | `detection.routes.ts` | NFR-SEC-004.3 / NFR-SEC-006 not met at the router |
| No rate limiting in the server | grep for `rate`/`limit` | FR-AUTH-004 A3 (resend limit) unverified |
| Zod used only in `business.types.ts` | grep | NFR-SEC-004.1 partial |
| bcrypt cost 10 hard-coded; JWT secret from `process.env.JWT_SECRET` | `auth.service.ts` | NFR-SEC-002.1/2 met (testable) |
| Route prefix is `/auth`, `/detection`, `/businesses`, `/shelves` (SRS says `/api/...`) | `app.ts` | wording differs; tests use actual paths |
| Controller errors from analyze return HTTP 400 for every failure, including AI outage | `detection.controller.ts` | FR-HEALTH-002 wants a controlled, distinguishable error |
| Controller logs `req.user` and body fields with `console.log` | `detection.controller.ts` | NFR-SEC-005.2 (no tokens in logs) needs checking |

## 4. Gap table

Status values: **Covered** (meaningful test exists), **Partial**, **None** (no test), **Blocked** (feature absent, so a
test can only document the gap).

| Area | Requirement | Existing test | Missing test | Tool | Automated / Manual | Status |
|------|-------------|---------------|--------------|------|--------------------|--------|
| Auth | FR-AUTH-001 Registration | `auth.service.test.ts`, `auth.integration.test.ts` (mocked) | weak-password, duplicate email at route level; DB-level unique constraint | Jest, Supertest | Automated | Partial |
| Auth | FR-AUTH-002 Login | service + route tests | unverified / suspended account paths, generic error text | Jest | Automated | Partial |
| Auth | FR-AUTH-003 Logout | route test | session revoked then token rejected | Jest | Automated | Partial |
| Auth | FR-AUTH-004 Email verification | route test | expiry, single use, resend rate limit | Jest | Automated | Partial |
| Auth | FR-AUTH-005 Password reset | route test | one-time use, expiry, no enumeration | Jest | Automated | Partial |
| Auth | FR-AUTH-006 JWT enforcement | `auth.middleware.test.ts` | expired, bad signature, malformed | Jest | Automated | Partial |
| Tenant | FR-TENANT-001/002 Onboarding, invite | `invitation.service.test.ts` | route level, cross-tenant invite | Jest | Automated | Partial |
| Tenant | FR-TENANT-003 RBAC | none | OWNER vs EMPLOYEE on business/shelf routes; ADMIN absent | Jest | Automated | None / Blocked (ADMIN) |
| Scan | FR-SCAN-001..003 capture, preview, compress | none | client component tests | Vitest | Automated | None |
| Scan | FR-SCAN-004/005 upload, persistence | detection service/controller/repo unit tests | missing file, bad type, oversize, AI down/timeout, scan FAILED state | Jest | Automated | Partial |
| Detection | FR-DET-001..004 | `ai-service/tests/unit/detection`, api tests | confidence filtering boundary, persistence in DB | pytest, Jest | Automated | Partial |
| Freshness | FR-FRESH-001..003 | `ai-service/tests/unit/freshness`, `client detection.test.ts` | review flag threshold at route level | pytest, Vitest | Automated | Partial |
| Inventory | FR-INV-001/002 | `inventory.utils.test.ts` | atomic update + rollback against real DB, pagination | Jest + Postgres | Automated | Partial |
| Inventory | FR-INV-003/004 Manual adjust, catalog | none | routes appear not to exist | Jest | Automated | Blocked (verify) |
| Alerts | FR-ALERT-001..004 | none | generation, read state, tenant scoping | Jest + Postgres | Automated | None |
| Analytics | FR-ANALYTICS-001..003 | none | dashboard service unit tests | Jest | Automated | None |
| Admin | FR-ADMIN-001..003 | none | feature absent | Jest | Automated | Blocked |
| Settings | FR-SETTINGS-001 | none | profile update route + client page | Jest, Vitest | Automated | None |
| Health | FR-HEALTH-001 | `ai-service/tests/api/test_health.py` (AI only) | backend `/health` contract, DB-down | Supertest | Automated | Partial |
| Health | FR-HEALTH-002 Degraded mode | none | AI down → scan FAILED, other routes OK | Jest, Playwright | Automated | None |
| Data | NFR-REL-003 Transactions, no partial writes | none | rollback on real Postgres | Jest + Postgres | Automated | None |
| Data | Constraints / FK / unique / migrations | none | migration apply + constraint tests | Jest + Postgres | Automated | None |
| Security | NFR-SEC-001 Helmet/CORS/HTTPS | none | header assertions (expected to FAIL today) | Supertest | Automated | Blocked (defect) |
| Security | NFR-SEC-002 bcrypt≥10, JWT env, expiry 24h | partial in auth.service tests | assert cost and TTL constants | Jest | Automated | Partial |
| Security | NFR-SEC-003 Tenant isolation / IDOR | none | cross-business ids on every tenant route | Jest, Postgres | Automated | None |
| Security | NFR-SEC-004/006 Validation, upload safety | none | oversize/MIME/unknown fields | Supertest | Automated | None |
| Security | NFR-SEC-005.3 Dependency audit | none | `npm audit`, `pip-audit` | npm, pip-audit | Automated | None |
| Security | Secrets not committed | none | repo secret scan | script/gitleaks | Automated | None |
| E2E | Registration→login, scan, degraded, admin | none | full browser journeys | Playwright | Automated | None |
| A11y | NFR-USE-006 | none | axe on each page, keyboard, 360px | Playwright + axe-core | Automated (baseline) | None |
| A11y | NFR-USE-003/004 touch ≥44px, colour+text status | none | measured in browser | Playwright | Automated | None |
| Perf | NFR-PERF-001 response time | none | login, upload, inference, dashboard, health | k6 | Automated, env-dependent | None |
| Perf | NFR-PERF-002 concurrency 10 scans / 50 reads | none | k6 scenarios | k6 | Automated, env-dependent | None |
| Perf | NFR-PERF-003 capacity | none | seeded volume run | k6 + seed | Automated, env-dependent | None |
| Perf | NFR-PERF-004 idle RSS <512 MB | none | RSS sampler | Node script | Automated, env-dependent | None |
| AI | NFR-REL-004 mAP@0.5 ≥0.70, macro-F1 ≥0.75 | `ai-service/scripts/evaluate.py` (script, not a test) | reserved eval set, PASS/FAIL report | pytest + script | Automated if dataset present | None (dataset unverified) |
| AI | Model reload ≤5 min, MTTR ≤15 min | none | timed restart | Docker | Manual | None |
| Reliability | NFR-REL-001 99% availability, daily backups | none | deployed-system monitoring, restore drill | — | Manual | None |
| Usability | NFR-USE-001/002 first scan ≤5 min, ≤3 interactions | none | usability session; interaction count E2E | Manual, Playwright | Both | None |
| Usability | Real camera, poor light, blur, slow network | none | device testing | — | Manual | None |
| CI | Client tests, lint, build, E2E, security | server + AI only | client job, audit job | GitHub Actions | Automated | Partial |

## 5. Classification of requirements by how they can be verified

- **Automatable locally without services:** validators, middleware, RBAC, inventory maths, AI pre/post-processing,
  Supertest route tests with mocked services, React component tests.
- **Need PostgreSQL:** transactions/rollback, FK/unique constraints, tenant isolation at SQL level, migrations. A
  Postgres 16 container is already running locally; tests must use a separate throwaway database and never the
  developer database.
- **Need a running full stack:** Playwright E2E, accessibility scans of rendered pages, health/degraded mode end to end.
- **Need load tooling:** all NFR-PERF measurements (k6 not installed here; scripts will be provided and reported as
  NOT RUN until executed).
- **Need real model evaluation:** mAP@0.5 and macro-F1; require a reserved validation set that has not been verified to
  exist in the repository.
- **Manual only:** real-device camera behaviour, lighting/blur/angle robustness, browser compatibility, usability
  timings, backup restoration, container-restart MTTR, availability.

## 6. Consequences for the plan

1. Tests for Helmet, CORS whitelisting, upload limits, admin routes and rate limiting will **fail or be marked Blocked**
   against the current code. They are recorded as defects with BUG FOUND / ROOT CAUSE / FIX / TEST entries; only
   small, low-risk fixes (e.g. mounting Helmet, adding a multer size/MIME limit) are considered for production code.
   Missing features (admin API) are reported as PARTIAL/FAIL in the results, not built.
2. No performance, accuracy or availability figure will be recorded unless it was measured on this machine; otherwise
   the result is NOT RUN with the reason.
