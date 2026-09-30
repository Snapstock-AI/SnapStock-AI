// NFR-PERF-001 - login and registration: average < 2 s, maximum <= 5 s.
import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, THRESHOLDS, trendStats } from '../config.js';
import { login, seed, track } from '../lib/common.js';

export const options = {
  summaryTrendStats: trendStats,
  scenarios: {
    login: { executor: 'constant-vus', vus: 3, duration: '20s', exec: 'loginFlow' },
    register: { executor: 'per-vu-iterations', vus: 2, iterations: 5, exec: 'registerFlow' },
  },
  thresholds: {
    'http_req_duration{name:login}': [`avg<${THRESHOLDS.authAvgMs}`, `max<=${THRESHOLDS.authMaxMs}`],
    'http_req_duration{name:register}': [`avg<${THRESHOLDS.authAvgMs}`, `max<=${THRESHOLDS.authMaxMs}`],
    'checks{scenario:login}': ['rate==1'],
  },
};

export function loginFlow() {
  login(seed.users[(__VU + __ITER) % seed.users.length]);
}

export function registerFlow() {
  const email = `perf-${__VU}-${__ITER}-${Date.now()}@example.test`;
  const res = track(
    http.post(`${BASE_URL}/auth/register`, JSON.stringify({ full_name: 'Perf User', email, password: 'Perf2024x' }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'register' },
    }),
  );
  check(res, { 'register 201': (r) => r.status === 201 });
}
