import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { BASE_URL, LOAD, SEED_FILE } from '../config.js';

export const seed = JSON.parse(open(SEED_FILE));

const status2xx = new Counter('status_2xx');
const status4xx = new Counter('status_4xx');
const status5xx = new Counter('status_5xx');
const statusOther = new Counter('status_other'); // 0 = connection error / timeout

/** Records the HTTP status class so the report can show a status distribution. */
export function track(res) {
  if (res.status >= 200 && res.status < 300) status2xx.add(1);
  else if (res.status >= 400 && res.status < 500) status4xx.add(1);
  else if (res.status >= 500) status5xx.add(1);
  else statusOther.add(1);
  return res;
}

export function login(user, name = 'login') {
  const res = track(
    http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email: user.email, password: user.password }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name },
    }),
  );
  check(res, { 'login 200': (r) => r.status === 200 });
  return res.status === 200 ? res.json('data.token') : null;
}

export const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });

/** Logs in every seeded user once; call from setup(). */
export function loginAll(count = seed.users.length) {
  return seed.users.slice(0, count).map((user) => ({ ...user, token: login(user, 'setup-login') }));
}

const sampleImage = __ENV.SAMPLE_IMAGE ? open(__ENV.SAMPLE_IMAGE, 'b') : null;

/**
 * Payload for /detection/analyze. Without SAMPLE_IMAGE this is a synthetic file that starts with a
 * JPEG signature (accepted by the API's server-side validation and by the fake AI used locally).
 * A REAL AI service needs a real photo: pass -e SAMPLE_IMAGE=/path/to/shelf.jpg.
 */
export function imageFile() {
  if (sampleImage) return http.file(sampleImage, 'shelf.jpg', 'image/jpeg');
  const bytes = new Uint8Array(LOAD.uploadBytes);
  bytes.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  for (let i = 6; i < bytes.length; i += 4096) bytes[i] = (i / 4096) % 251;
  return http.file(bytes.buffer, 'shelf.jpg', 'image/jpeg');
}

export function scan(user, mode = 'STOCK_IN', name = 'scan') {
  return track(
    http.post(
      `${BASE_URL}/detection/analyze`,
      { file: imageFile(), businessId: user.businessId, shelfId: user.shelfId, scanMode: mode },
      { headers: authHeaders(user.token), tags: { name }, timeout: '60s' },
    ),
  );
}
