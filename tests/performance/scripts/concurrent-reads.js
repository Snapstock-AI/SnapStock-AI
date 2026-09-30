// NFR-PERF-002 - at least 50 concurrent authenticated read requests without failure.
import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, LOAD, trendStats } from '../config.js';
import { authHeaders, loginAll, track } from '../lib/common.js';

export const options = {
  summaryTrendStats: trendStats,
  scenarios: {
    reads: { executor: 'constant-vus', vus: LOAD.readConcurrency, duration: `${LOAD.readDurationSec}s` },
  },
  thresholds: {
    http_req_failed: ['rate==0'],
    status_5xx: ['count==0'],
    status_other: ['count==0'],
    checks: ['rate==1'],
  },
};

export function setup() {
  return loginAll(20);
}

export default function (users) {
  const user = users[(__VU - 1) % users.length];
  const headers = authHeaders(user.token);
  const paths = [
    `/businesses/${user.businessId}/dashboard`,
    `/businesses/${user.businessId}/inventory`,
    `/businesses/${user.businessId}/alerts`,
    `/shelves?businessId=${user.businessId}`,
    `/businesses/mine`,
  ];
  const path = paths[(__ITER + __VU) % paths.length];
  const res = track(http.get(`${BASE_URL}${path}`, { headers, tags: { name: 'read' } }));
  check(res, { 'read 200': (r) => r.status === 200 });
}
