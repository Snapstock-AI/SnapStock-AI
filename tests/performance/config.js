// Central configuration for every k6 script. All values can be overridden with `-e NAME=value`
// (or environment variables when using tools/run.mjs). Defaults are the SRS targets.
//
// SRS references: NFR-PERF-001 (response time), NFR-PERF-002 (concurrency), NFR-PERF-003 (capacity),
// NFR-PERF-004 (resource utilisation).

const num = (name, fallback) => (__ENV[name] !== undefined ? Number(__ENV[name]) : fallback);

export const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:5100';
export const AI_URL = __ENV.AI_URL || 'http://127.0.0.1:8899';
export const SEED_FILE = __ENV.SEED_FILE || '../.generated/seed.json';

// Milliseconds. "avg" thresholds use the SRS "average" wording, "max" the SRS "maximum".
export const THRESHOLDS = {
  authAvgMs: num('T_AUTH_AVG_MS', 2000), // login / registration average < 2 s
  authMaxMs: num('T_AUTH_MAX_MS', 5000), // maximum <= 5 s
  uploadAvgMs: num('T_UPLOAD_AVG_MS', 3000), // compressed (<2 MB) upload average < 3 s
  uploadMaxMs: num('T_UPLOAD_MAX_MS', 8000), // maximum <= 8 s
  inferenceAvgMs: num('T_INFERENCE_AVG_MS', 5000), // AI inference average < 5 s
  inferenceMaxMs: num('T_INFERENCE_MAX_MS', 15000), // maximum <= 15 s
  dashboardAvgMs: num('T_DASHBOARD_AVG_MS', 2000), // dashboard retrieval average < 2 s
  dashboardMaxMs: num('T_DASHBOARD_MAX_MS', 5000), // maximum <= 5 s
  healthAvgMs: num('T_HEALTH_AVG_MS', 500), // health endpoint average < 500 ms
};

export const LOAD = {
  scanConcurrency: num('SCAN_CONCURRENCY', 10), // SRS minimum 10; try 20 and 50 on capable hardware
  readConcurrency: num('READ_CONCURRENCY', 50), // SRS minimum 50
  readDurationSec: num('READ_DURATION_SEC', 30),
  uploadBytes: num('UPLOAD_BYTES', 1_500_000), // < 2 MB, like a client-compressed photo
};

export const trendStats = ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'];
