// NFR-PERF-001 - health endpoint average < 500 ms.
import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, THRESHOLDS, trendStats } from '../config.js';
import { track } from '../lib/common.js';

export const options = {
  summaryTrendStats: trendStats,
  vus: 10,
  duration: '10s',
  thresholds: {
    'http_req_duration{name:health}': [`avg<${THRESHOLDS.healthAvgMs}`],
    checks: ['rate==1'],
  },
};

export default function () {
  const res = track(http.get(`${BASE_URL}/health`, { tags: { name: 'health' } }));
  check(res, { 'health 200': (r) => r.status === 200 });
}
