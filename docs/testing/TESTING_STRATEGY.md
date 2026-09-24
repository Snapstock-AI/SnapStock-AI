# Testing strategy

Requirements baseline: [SRS](../srs.md) and [SAD](../software-architecture-document.md). Where the application
deviates from the SRS, a test asserts the SRS behaviour; the deviation is then fixed (small, documented change) or
recorded as a known defect with an `it.failing` marker, never by weakening the test.

| Level | Scope | Tool | Location |
|-------|-------|------|----------|
| 1 Unit | validators, auth, RBAC, tenant checks, services, inventory maths, AI pre/post-processing, client lib and routing | Jest + ts-jest, Vitest + Testing Library, pytest | `server/tests/unit`, `client/tests/unit`, `ai-service/tests/unit` |
| 2 Integration | Express routes with real middleware, service wiring, upload validation, degraded mode | Jest + Supertest | `server/tests/integration` |
| 3 Database / API | real SQL: constraints, migrations, transactions and rollback, tenant isolation, dashboard queries, authenticated HTTP against PostgreSQL | Jest + pg + Supertest | `server/tests/db` |
| 4 End-to-end | real browser, real API and database; only AI and SMTP are replaced by controllable fakes | Playwright | `e2e/tests` |
| 5 Performance / load | SRS latency, concurrency, capacity, memory | k6 (local or Docker) + Node tools | `tests/performance` |
| 6 Security | headers, CORS, JWT, RBAC, IDOR, injection, upload safety, secrets, dependency audit | Jest/Supertest, scripts | `server/tests/*`, `tests/security` |
| 7 Accessibility | axe-core WCAG 2.0/2.1 A+AA rules, keyboard, labels, 360/1024 px, touch targets | Playwright + axe | `e2e/tests/a11y.spec.ts` |
| 8 AI evaluation | mAP@0.5, freshness macro F1, leakage check | Python | `ai-service/evaluation` |
| 9 Deployment / health | `/health`, degraded mode, restart, backups | automated where local, otherwise manual | see MANUAL_TEST_PLAN |

Principles

* Mocks only at true boundaries. Route tests mock services; anything about SQL, transactions or isolation runs on real
  PostgreSQL, because a mock-only suite had let a query that PostgreSQL rejects ship (see DEFECTS BUG-06).
* A single browser framework (Playwright) serves E2E and accessibility; no second tool was added.
* Nothing is reported as passed without a run. Results that need hardware, data or a deployment we do not have are
  **NOT RUN** with the reason.
* Automated accessibility is a **baseline**, not a conformance claim.
* Performance tests are not part of PR CI (hardware dependent); nightly E2E and weekly security jobs are separate.
