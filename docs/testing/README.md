# SnapStock-AI testing

| Document | Purpose |
|----------|---------|
| [TESTING_STRATEGY.md](TESTING_STRATEGY.md) | Test pyramid, tools, what each level covers |
| [TESTING_GAP_ANALYSIS.md](TESTING_GAP_ANALYSIS.md) | Audit taken **before** this work (baseline) |
| [TEST_CASE_MATRIX.md](TEST_CASE_MATRIX.md) | SRS requirement -> tests -> tool -> result -> evidence |
| [TEST_RESULTS.md](TEST_RESULTS.md) | Measured results of the latest full run |
| [DEFECTS.md](DEFECTS.md) | Bugs found and fixed, and known open defects |
| [MANUAL_TEST_PLAN.md](MANUAL_TEST_PLAN.md) | Checks that need a person, a device or a deployment (none executed yet) |
| [API_TESTING.md](API_TESTING.md), [PERFORMANCE_TESTING.md](PERFORMANCE_TESTING.md), [SECURITY_TESTING.md](SECURITY_TESTING.md), [ACCESSIBILITY_TESTING.md](ACCESSIBILITY_TESTING.md), [AI_MODEL_EVALUATION.md](AI_MODEL_EVALUATION.md) | Per-area detail |
| [TEST_DATA.md](TEST_DATA.md) | Databases, fixtures, fakes and what is never committed |

## Commands

Windows note: some shells export `NODE_ENV=production`, which makes `npm install` skip dev dependencies. Install with
`NODE_ENV=development npm ci --include=dev`.

| What | Directory | Command |
|------|-----------|---------|
| Backend unit + route tests | `server` | `JWT_SECRET=x npm test` (`test:unit`, `test:integration`, `test:coverage`, `test:ci` for JUnit) |
| Backend database tests (real PostgreSQL, throw-away `snapstock_test`) | `server` | `npm run test:db` |
| Frontend unit tests | `client` | `npm run test:unit` / `npm run test:coverage` |
| AI service tests | `ai-service` | `venv/Scripts/python -m pytest` (Linux/mac: `venv/bin/python`) |
| Browser E2E + degraded mode + accessibility | `e2e` | `npm run install:browsers` once, then `npm test` (`test:e2e`, `test:a11y`) |
| Performance / load / memory | `tests/performance` | `npm install`, then `npm run test:local-stack`, `npm run test:load`, `npm run test:resources` |
| Secret scan / dependency audit | repo root | `node tests/security/secrets-scan.mjs`, `node tests/security/dependency-audit.mjs` |
| AI model evaluation | `ai-service` | `python -m evaluation.evaluate_freshness`, `python -m evaluation.evaluate_detection --data x.yaml` |

Database tests and E2E need a reachable PostgreSQL (Docker `postgres:16` works). The database is taken from
`TEST_DATABASE_URL`, or derived from `DATABASE_URL` in the root `.env` with the database name replaced; the name must
end in `_test` or the suite refuses to run.
