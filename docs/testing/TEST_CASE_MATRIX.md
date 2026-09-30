# Test case matrix (SRS traceability)

Result legend: PASS = automated evidence from the run in [TEST_RESULTS.md](TEST_RESULTS.md); PARTIAL = some behaviour
verified, rest missing or defective; FAIL = tested and not met; NOT RUN = needs data, hardware or a deployment;
NOT IMPLEMENTED = feature absent from the code. Paths are relative to the repository root. "Auto" = automated.

| SRS requirement | Test file(s) | Tool | Auto/Manual | Result | Evidence / note |
|-----------------|--------------|------|-------------|--------|-----------------|
| FR-AUTH-001 Registration | `server/tests/unit/auth/auth.register.test.ts`, `server/tests/db/auth.db.test.ts`, `e2e/tests/auth.spec.ts` | Jest, Postgres, Playwright | Auto | PARTIAL | password policy, hash cost >= 10, lowercase email, duplicate rejected PASS. Business is not created in the same transaction (created at onboarding); TD-01 SMTP failure; duplicate returns 400 not 409 |
| FR-AUTH-002 Login | `auth.service.test.ts`, `auth.db.test.ts`, `e2e/tests/auth.spec.ts`, `a11y.spec.ts` | same | Auto | PASS | unverified blocked, generic error, 2 fields + 1 button; 400 vs 401 status (TD-09) |
| FR-AUTH-003 Logout | `auth.db.test.ts`, `e2e/tests/auth.spec.ts` | same | Auto | PASS | token rejected server-side after logout |
| FR-AUTH-004 Email verification | `auth.register.test.ts`, `auth.db.test.ts`, E2E | same | Auto | PARTIAL | expiry, single use PASS; resend rate limit NOT IMPLEMENTED (TD-07) |
| FR-AUTH-005 Password reset | `auth.register.test.ts`, `auth.db.test.ts` | Jest, Postgres | Auto | PASS | one-time, expiry, no enumeration, sessions revoked |
| FR-AUTH-006 JWT enforcement | `auth.jwt.test.ts`, `auth.middleware.test.ts`, `auth.db.test.ts` | Jest | Auto | PASS | expired, bad signature, alg=none, malformed, revoked session |
| FR-TENANT-001 Onboarding | `e2e/tests/auth.spec.ts` | Playwright | Auto | PARTIAL | onboarding tested; not atomic with registration |
| FR-TENANT-002 Invite employee | `server/tests/unit/business/invitation.service.test.ts` | Jest | Auto | PARTIAL | service only; employee invite HTTP flow not tested end-to-end |
| FR-TENANT-003 RBAC | `rbac.tenant.test.ts`, `server/tests/db/api-security.db.test.ts` | Jest, Supertest+Postgres | Auto | PARTIAL | OWNER/EMPLOYEE 403 PASS; ADMIN NOT IMPLEMENTED; TD-02 |
| FR-SCAN-001/002 Capture, preview | `e2e/tests/scan.spec.ts`, `client/tests/unit/ScansPage.test.tsx` | Playwright, Vitest | Auto (upload); Manual (real camera) | PARTIAL | camera path needs a device: MANUAL M-01 |
| FR-SCAN-003 Client compression | none | - | - | NOT IMPLEMENTED | TD-08 |
| FR-SCAN-004 Upload/orchestration | `scan-upload.validation.test.ts`, `degraded-mode.test.ts`, `detection.service.test.ts`, `inventory.transaction.db.test.ts`, E2E scan | Jest, Postgres, Playwright | Auto | PASS | A1 validation 400, A2 AI failure FAILED + retry, A3 rollback |
| FR-SCAN-005 Scan persistence | `schema.db.test.ts`, `inventory.transaction.db.test.ts` | Postgres | Auto | PASS | |
| FR-DET-001..004 Detection | `ai-service/tests/unit/detection`, `tests/api/test_detect_route.py`, `server/tests/unit/detection` | pytest, Jest | Auto | PARTIAL | logic PASS with mocked YOLO; accuracy NOT RUN |
| FR-FRESH-001/002 Classification | `ai-service/tests/unit/freshness`, `test_predict_route.py`, `client/tests/unit/detection.test.ts` | pytest, Vitest | Auto | PARTIAL | model is binary good/bad, SRS asks 3 classes (Medium mapped in backend enum) |
| FR-FRESH-003 Manual correction | `tenant-isolation.db.test.ts`, E2E scan (selector labelled) | Postgres | Auto | PARTIAL | authorisation tested; edit UI flow not E2E-tested |
| FR-INV-001 Inventory listing | `dashboard.db.test.ts`, `e2e/tests/workspace.spec.ts` | Postgres, Playwright | Auto | PASS | BUG-06 fixed |
| FR-INV-002 Auto-update inventory | `inventory.transaction.db.test.ts`, E2E scan | Postgres, Playwright | Auto | PASS | in/out, rollback, concurrency |
| FR-INV-003/004 Manual adjust, catalog | none | - | - | NOT IMPLEMENTED | TD-08 |
| FR-ALERT-001 Low stock | `inventory.transaction.db.test.ts`, `dashboard.db.test.ts`, E2E alerts | Postgres, Playwright | Auto | PASS | |
| FR-ALERT-002 Spoilage alerts | `dashboard.db.test.ts` (executes queries) | Postgres | Auto | PARTIAL | generation rule not asserted |
| FR-ALERT-003/004 Filter, read state | none | - | - | NOT IMPLEMENTED | TD-08 |
| FR-ANALYTICS-001..003 | `dashboard.db.test.ts` (getAnalytics executes) | Postgres | Auto | PARTIAL | trend maths not asserted |
| FR-ADMIN-001..003 | E2E `test.fixme` | Playwright | - | NOT IMPLEMENTED | TD-05 |
| FR-SETTINGS-001 | `e2e/tests/workspace.spec.ts`, `auth` unit | Playwright | Auto | PASS | profile name, thresholds |
| FR-HEALTH-001 Health endpoints | `http-security.test.ts`, perf `health.js`, `ai-service/tests/api/test_health.py` | Supertest, k6, pytest | Auto | PARTIAL | static backend health (TD-06) |
| FR-HEALTH-002 Degraded mode | `degraded-mode.test.ts`, `e2e/tests/scan.spec.ts`, `test_model_availability.py` | Jest, Playwright, pytest | Auto | PASS | AI_UNAVAILABLE, FAILED scan, other pages usable, retry |
| NFR-USE-001 First scan <= 5 min | none | - | Manual | NOT RUN | M-10 |
| NFR-USE-002 Interaction budget, login fields | `e2e/tests/auth.spec.ts` (login fields) | Playwright | Auto+Manual | PARTIAL | camera <= 3 interactions: M-02 |
| NFR-USE-003 Responsive, touch targets | `e2e/tests/a11y.spec.ts` | Playwright | Auto | PASS | 360/1024 px no scroll, scan controls >= 44 px. Other pages' targets not measured |
| NFR-USE-004 Colour semantics | `a11y.spec.ts` (text labels) | Playwright | Auto+Manual | PARTIAL | text present; colours themselves M-07 |
| NFR-USE-005 Error feedback | `scan.spec.ts`, `client/tests/unit/api.test.ts` | Playwright, Vitest | Auto | PARTIAL | confirmations for irreversible actions not tested |
| NFR-USE-006 Accessibility baseline | `a11y.spec.ts` | Playwright + axe | Auto+Manual | PASS (automated baseline) | manual screen-reader review M-08 |
| NFR-REL-001 Availability 99 % | none | - | Manual | NOT RUN | M-14 |
| NFR-REL-002 MTTR / reload | none | - | Manual | NOT RUN | M-15 |
| NFR-REL-003 Data integrity | `inventory.transaction.db.test.ts`, `schema.db.test.ts` | Postgres | Auto | PASS | |
| NFR-REL-004 mAP / macro F1 | `ai-service/evaluation` | Python | Auto if data | NOT RUN | DATASET REQUIRED / leakage |
| NFR-PERF-001 Response times | `tests/performance/scripts/*` | k6 | Auto | PASS | see TEST_RESULTS; not measured on the reference deployment |
| NFR-PERF-002 Concurrency | `concurrent-scan.js`, `concurrent-reads.js` | k6 | Auto | PASS | 10 scans / 50 reads; 20 and 50 scans NOT RUN |
| NFR-PERF-003 Capacity | `tools/seed.mjs --capacity`, `dashboard.js` | k6 | Auto | PASS | 500 000 detections seeded |
| NFR-PERF-004 Resources | `tools/resource-usage.mjs` | Node | Auto | PASS | API idle 88.8 MB max; AI observed ~1 GB |
| NFR-SEC-001 HTTPS/Helmet/CORS | `http-security.test.ts` | Supertest | Auto | PARTIAL | Helmet, CORS PASS; HTTPS is a deployment property: M-16 |
| NFR-SEC-002 bcrypt, JWT env, 24 h, tokens | `auth.register.test.ts`, `auth.jwt.test.ts`, `secrets-scan.mjs` | Jest, script | Auto | PASS | |
| NFR-SEC-003 Tenant isolation, RBAC | `tenant-isolation.db.test.ts`, `api-security.db.test.ts`, `rbac.tenant.test.ts` | Postgres | Auto | PARTIAL | `/api/admin` NOT IMPLEMENTED |
| NFR-SEC-004 Input validation | `scan-upload.validation.test.ts`, `api-security.db.test.ts` | Supertest | Auto | PARTIAL | Zod only on business input (TD); unknown fields ignored |
| NFR-SEC-005 OWASP controls, no leaks, audit | `http-security.test.ts`, `api-security.db.test.ts`, `dependency-audit.mjs` | Jest, script | Auto | PARTIAL | TD-03, TD-10; security logging of auth failures not tested |
| NFR-SEC-006 Upload safety | `scan-upload.validation.test.ts` | Supertest | Auto | PARTIAL | type/size/signature PASS; random names/storage: files are not stored (memory only) |
| NFR-SUP-001..004 Maintainability | CI workflows, docs | GitHub Actions | Auto | NOT RUN | CI not executed |
