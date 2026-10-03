// NFR-PERF-001 - dashboard retrieval: average < 2 s, maximum <= 5 s.
// Run against a seeded database; use `npm run seed:capacity` first to measure at SRS capacity (NFR-PERF-003).
import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, THRESHOLDS, trendStats } from '../config.js';
import { authHeaders, loginAll, track } from '../lib/common.js';

export const options = {
  summaryTrendStats: trendStats,
  vus: 5,
  duration: '20s',
  thresholds: {
    'http_req_duration{name:dashboard}': [`avg<${THRESHOLDS.dashboardAvgMs}`, `max<=${THRESHOLDS.dashboardMaxMs}`],
    'http_req_duration{name:inventory}': [`avg<${THRESHOLDS.dashboardAvgMs}`, `max<=${THRESHOLDS.dashboardMaxMs}`],
    checks: ['rate==1'],
  },
};

export function setup() {
  return loginAll(10);
}

export default function (users) {
  const user = users[(__VU - 1) % users.length];
  const headers = authHeaders(user.token);
  for (const name of ['dashboard', 'inventory']) {
    const res = track(http.get(`${BASE_URL}/businesses/${user.businessId}/${name}`, { headers, tags: { name } }));
    check(res, { [`${name} 200`]: (r) => r.status === 200 });
  }
}
