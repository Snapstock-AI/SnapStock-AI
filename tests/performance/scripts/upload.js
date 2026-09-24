// NFR-PERF-001 - compressed image (< 2 MB) upload: average < 3 s, maximum <= 8 s.
// The request runs the whole scan pipeline. With the local fake AI this is upload + validation + persistence
// + inventory transaction; with a real AI service inference time is included, so use ai-inference.js for that.
import { check } from 'k6';
import { THRESHOLDS, trendStats } from '../config.js';
import { loginAll, scan } from '../lib/common.js';

export const options = {
  summaryTrendStats: trendStats,
  vus: 1,
  iterations: 15,
  thresholds: {
    'http_req_duration{name:upload}': [`avg<${THRESHOLDS.uploadAvgMs}`, `max<=${THRESHOLDS.uploadMaxMs}`],
    checks: ['rate==1'],
  },
};

export function setup() {
  return loginAll(1);
}

export default function (users) {
  const res = scan(users[0], 'STOCK_IN', 'upload');
  check(res, { 'scan 200': (r) => r.status === 200 });
}
