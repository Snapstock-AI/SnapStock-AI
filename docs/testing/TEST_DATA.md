# Test data

| Data | Where | Notes |
|------|-------|-------|
| `snapstock_test` | PostgreSQL | Jest database suite. Dropped and recreated (schema `public`) from the migrations on every run |
| `snapstock_e2e_test` | PostgreSQL | Playwright and performance runs; recreated before each run |
| Developer database (`inventory_db`) | - | Never touched. Every tool refuses a database name not ending in `_test` |
| Tenants / users | created per test with random suffixes (`server/tests/db/helpers.ts`, `e2e/support/helpers.ts`) | test password `Fresh2024`, throw-away JWT secrets |
| Fake AI + capturing SMTP | `e2e/support/test-doubles.mjs` | controllable up/down/slow; canned 3-apple result |
| Uploaded images | synthetic bytes with a JPEG signature (`SAMPLE_JPEG`, k6 payload) | real photos only for the real AI: `SAMPLE_IMAGE` |
| Capacity seed | `tests/performance/tools/seed.mjs --capacity` | 100 businesses, 500 users, 50 000 scans, 500 000 detections |
| `.generated/`, `reports/`, `temp/` | ignored | seed credentials, k6/Playwright/coverage/AI reports, Grad-CAM images |

Never committed: `.env`, tokens, model weights, datasets, generated reports, screenshots.
