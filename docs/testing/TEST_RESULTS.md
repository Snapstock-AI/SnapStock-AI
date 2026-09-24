# Test results

Run date: 2026-09-24/25. Environment: Windows 11, 12 CPUs, 15.6 GB RAM, Node v22.17.0, Python 3.12.1, Docker Desktop
(PostgreSQL 16, k6 v2.3.0 via `grafana/k6`), Chromium (Playwright). Local machine, not the reference deployment.
CI workflows were written but have **not been executed** (no push was made).

## Automated suites

| Area | Tests | Passed | Failed | Skipped / not run | Notes |
|------|------:|-------:|-------:|-------------------|-------|
| Backend unit + route (Jest) | 135 | 135 | 0 | 0 | 15 suites; includes 3 `it.failing` known-defect assertions (TD-01, TD-02, TD-03) that pass while the defect exists. Coverage: lines 49.1 %, branches 35.5 % |
| Backend database (real PostgreSQL) | 79 | 79 | 0 | 0 | 6 suites: migrations/constraints, transactions + rollback, tenant isolation, auth flows, dashboard SQL, HTTP authorization/IDOR |
| Client unit (Vitest) | 31 | 31 | 0 | 0 | lines 13.8 % - only lib/api, auth, detection, ScansPage, ProtectedRoute are unit tested |
| AI service (pytest) | 134 | 134 | 0 | 0 | 118 existing + 5 model-availability + 11 evaluation-framework; coverage 99 % of `app/` |
| E2E + accessibility (Playwright, desktop 1280 + mobile 360) | 62 | 60 | 0 | 2 `fixme` | admin journeys E2E-09/10: feature not implemented. One full `npm test` run: 60 passed, 2 skipped; not repeated, so flakiness is only lightly checked |
| Secret scan | 1 | 1 | 0 | 0 | 870 tracked files, `.env` ignored, JWT secret from env |

## Non-functional measurements (this machine)

| Requirement | Result | Measured |
|-------------|--------|----------|
| Health avg < 500 ms | **PASS** | avg 4.4 ms, p99 11.7 ms, 2205 req/s |
| Login / registration avg < 2 s, max <= 5 s | **PASS** | login avg 115 ms, max 350 ms; register avg 311 ms, max 485 ms |
| Dashboard avg < 2 s, max <= 5 s | **PASS** | avg 39 ms (functional seed); **at SRS capacity** (100 businesses, 500 users, 50 000 scans, 500 000 detections) avg 165 ms, max 374 ms |
| Upload (1.5 MB) avg < 3 s, max <= 8 s | **PASS** (upload + persistence only, fake AI) | avg 110 ms, max 239 ms |
| AI inference avg < 5 s, max <= 15 s | **PASS** (real models, 1 photo, 10 requests, CPU) | avg 3.0 s, p95 8.2 s, max 12.7 s. First request is slow (warm-up); max is within 2.3 s of the limit, so treat as marginal |
| >= 10 concurrent scans without failure | **PASS** at 10 | 40 requests, all 2xx, avg 349 ms, p95 752 ms. 20 and 50 **NOT RUN** |
| >= 50 concurrent reads without failure | **PASS** | 5957 requests, all 2xx, avg 253 ms, p95 626 ms; at capacity volume 2502 requests all 2xx, avg 610 ms, p95 1351 ms |
| API idle RSS < 512 MB | **PASS** | idle max 88.8 MB; under load peak 141.7 MB; after load mean 112 MB (informational growth +38 MB after one load) |
| AI RSS after model load | **OBSERVED** (no SRS limit) | about 1014 MB working set after loading both models and 10 inferences |
| 100 enterprises / 500 users / 50 000 scans / 500 000 detections | **PASS** (seeded and queried) | see dashboard row |
| mAP@0.5 >= 0.70 | **NOT RUN** | no labelled detection validation set (DATASET REQUIRED) |
| Freshness macro F1 >= 0.75 | **NOT RUN** | local test split leaks into train/val (2698 duplicates) and is 2-class; evaluation refused to score |
| Daily backups, 99 % availability, MTTR <= 15 min, model reload <= 5 min | **NOT RUN** | need a deployment; see MANUAL_TEST_PLAN |
| `npm audit` / `pip-audit` | **FAIL / NOT RUN** | server 3 high + 3 moderate, client 4 high; pip-audit not installed |

## Result by test area

| Area | Status |
|------|--------|
| Unit | PASS (client coverage low) |
| Integration | PASS |
| API | PASS |
| Database / integrity / rollback | PASS |
| E2E | PASS, admin NOT RUN (not implemented) |
| Accessibility baseline | PASS for axe A/AA rules on 12 pages at 360 and 1280 px after fixes; not a WCAG conformance claim; manual review pending |
| Performance / load | PASS at the levels listed; 20/50 concurrent scans NOT RUN |
| Security | PASS for implemented controls; open defects TD-02, TD-03, TD-07, TD-10 |
| AI evaluation | NOT RUN (data) |
| Degraded mode | PASS (integration + E2E) |
| Error handling | PASS except TD-03/TD-04 |
| Reliability (availability, backups) | NOT RUN |

Per-requirement status is in [TEST_CASE_MATRIX.md](TEST_CASE_MATRIX.md).
