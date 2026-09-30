// NFR-PERF-001 - AI inference: average < 5 s, maximum <= 15 s. Talks to the AI service directly.
// Requires the REAL service with both models loaded (run.mjs reports NOT RUN otherwise) and a real photo:
//   k6 run -e AI_URL=http://localhost:8000 -e SAMPLE_IMAGE=/abs/path/shelf.jpg scripts/ai-inference.js
import http from 'k6/http';
import { check } from 'k6';
import { AI_URL, THRESHOLDS, trendStats } from '../config.js';
import { imageFile, track } from '../lib/common.js';

export const options = {
  summaryTrendStats: trendStats,
  vus: 1,
  iterations: 10,
  thresholds: {
    'http_req_duration{name:inference}': [`avg<${THRESHOLDS.inferenceAvgMs}`, `max<=${THRESHOLDS.inferenceMaxMs}`],
    checks: ['rate==1'],
  },
};

export default function () {
  const res = track(http.post(`${AI_URL}/analyze`, { file: imageFile() }, { tags: { name: 'inference' }, timeout: '60s' }));
  check(res, { 'analyze 200': (r) => r.status === 200 });
}
