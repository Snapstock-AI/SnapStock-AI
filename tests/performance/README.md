# Performance, load and resource tests

Reproducible [k6](https://k6.io) tests for the measurable targets in the SRS (NFR-PERF-001..004). k6 is not
installed on every machine, so `tools/run.mjs` uses a local `k6` binary when present and otherwise the
`grafana/k6` Docker image (`docker pull grafana/k6`). No result is ever filled in: a test that cannot run is reported
as **NOT RUN** with the reason.

| Result | Meaning |
|--------|---------|
| **PASS** | k6 ran and every threshold of the script was met |
| **FAIL** | k6 ran and at least one threshold was breached |
| **NOT RUN** | the environment could not run it (no k6/Docker, target unreachable, real AI not present, ...) |

The runner exits `0` regardless, so a slow laptop does not break local workflows. Add `--strict` (for CI on comparable
hardware) to exit `1` on any FAIL.

## Quick start (self-contained, safe)

```bash
cd tests/performance
npm install                       # only dependency: pg (used by the seeder)
npm run test:local-stack          # starts stack + seeds + runs everything + stops the stack
npm run test:resources            # API RSS idle / under load / after load
npm run test:load                 # only the two concurrency tests
```

`--with-stack` starts a private stack: the fake AI + capturing SMTP from `e2e/support/test-doubles.mjs`, the
**compiled** API (`node dist/index.js`, so memory numbers are production-like) and the database
`snapstock_e2e_test`, recreated from the migrations. It refuses any database whose name does not end in `_test`
and never touches the developer database. Reports are written to `reports/` (git-ignored).

## Scripts and SRS mapping

| Script | SRS | Threshold (default) |
|--------|-----|---------------------|
| `scripts/auth.js` | NFR-PERF-001 login + registration | avg < 2000 ms, max <= 5000 ms |
| `scripts/upload.js` | NFR-PERF-001 compressed (< 2 MB) upload | avg < 3000 ms, max <= 8000 ms |
| `scripts/ai-inference.js` | NFR-PERF-001 AI inference | avg < 5000 ms, max <= 15000 ms |
| `scripts/dashboard.js` | NFR-PERF-001 dashboard retrieval (+ NFR-PERF-003 with `--capacity`) | avg < 2000 ms, max <= 5000 ms |
| `scripts/health.js` | NFR-PERF-001 health endpoint | avg < 500 ms |
| `scripts/concurrent-scan.js` | NFR-PERF-002 >= 10 concurrent scans | no failed request, no 5xx |
| `scripts/concurrent-reads.js` | NFR-PERF-002 >= 50 concurrent authenticated reads | no failed request, no 5xx |
| `tools/resource-usage.mjs` | NFR-PERF-004 API idle RSS | < 512 MB (AI RSS: observed only, the SRS sets no limit) |

Every threshold is configurable (see `config.js`), e.g. `T_DASHBOARD_AVG_MS=1000 npm run test`.

## Concurrency levels

```bash
SCAN_CONCURRENCY=10 npm run test:load    # SRS minimum
SCAN_CONCURRENCY=20 npm run test:load
SCAN_CONCURRENCY=50 node tools/run.mjs --with-stack --only=concurrent-scan   # seed needs >= 50 vendors (default 50)
READ_CONCURRENCY=100 READ_DURATION_SEC=60 npm run test:load
```

Each run records requests/s, average, median, p95, p99 and max latency, failure rate and the HTTP status
distribution (`2xx / 4xx / 5xx / other-or-timeout`) in `reports/results.json` and `reports/results.md`.

## Capacity (NFR-PERF-003)

`npm run seed:capacity` (or `node tools/run.mjs --with-stack --capacity`) loads the SRS volume with SQL
`generate_series`: 100 businesses, 500 users, 50,000 scans and 500,000 detections, then the dashboard and read tests
measure retrieval time at that size.

## What the local numbers mean

* The API runs against a **fake AI service**. Upload numbers therefore measure upload + validation + persistence +
  the inventory transaction, **not** model inference. Inference is measured only by `ai-inference.js`, which is
  **NOT RUN** unless a real AI service with both models loaded answers `/health` (set `AI_URL`; use a real photo with
  `-e SAMPLE_IMAGE=/abs/path/shelf.jpg`, the synthetic payload is not a decodable image).
* When Docker runs k6, traffic goes through `host.docker.internal`, which adds a little latency.
* Results depend on the machine. The SRS figures describe the reference deployment; record the environment printed
  at the top of `results.md` next to any number you quote.

## Against a deployed environment

```bash
cd tests/performance
BASE_URL=https://api.example.org AI_URL=https://ai.example.org node tools/run.mjs
```

Requires `.generated/seed.json` with vendor credentials that exist in that environment (`npm run seed` targets the
local test database only - create equivalent vendors by hand or with an admin-approved script for a shared
environment, and never point a load test at a system you do not own or without permission).

## AI service memory

`node tools/resource-usage.mjs --pid=<api pid> --ai-pid=<uvicorn pid>` records the RSS of the running AI service after
model loading and reports it as **OBSERVED**; the SRS defines no AI memory ceiling, so none is invented.
