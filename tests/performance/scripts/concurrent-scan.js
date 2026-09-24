// NFR-PERF-002 - at least 10 concurrent scan requests without failure. Configurable: SCAN_CONCURRENCY=10|20|50.
// Every VU is a different vendor submitting a scan at the same moment, SCAN_ROUNDS times.
import { check } from 'k6';
import { LOAD, trendStats } from '../config.js';
import { loginAll, scan, seed } from '../lib/common.js';

const rounds = Number(__ENV.SCAN_ROUNDS || 3);

export const options = {
  summaryTrendStats: trendStats,
  scenarios: {
    scans: { executor: 'per-vu-iterations', vus: LOAD.scanConcurrency, iterations: rounds, maxDuration: '5m' },
  },
  thresholds: {
    // "without failure": no request may fail or time out, and every status must be 2xx
    http_req_failed: ['rate==0'],
    status_5xx: ['count==0'],
    status_other: ['count==0'],
    checks: ['rate==1'],
  },
};

export function setup() {
  if (seed.users.length < LOAD.scanConcurrency) {
    throw new Error(`seed has ${seed.users.length} users; re-run the seed with --users=${LOAD.scanConcurrency}`);
  }
  return loginAll(LOAD.scanConcurrency);
}

export default function (users) {
  const res = scan(users[(__VU - 1) % users.length], 'STOCK_IN', 'concurrent-scan');
  check(res, { 'scan 200': (r) => r.status === 200 });
}
