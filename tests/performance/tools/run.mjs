// Runs the k6 scripts and classifies every one as PASS, FAIL or NOT RUN.
//   node tools/run.mjs [--with-stack] [--only=auth,health] [--strict] [--capacity]
//
//   PASS     every SRS threshold of the script was met
//   FAIL     k6 ran and at least one threshold was breached
//   NOT RUN  the environment could not run it (k6/Docker missing, target unreachable, real AI absent, ...);
//            the reason is recorded. Nothing is ever guessed or filled in.
//
// Exit code is 0 unless --strict is given, so a slow developer laptop does not break local workflows;
// CI on comparable hardware can pass --strict.
import { spawnSync, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatedDir, startStack, urls } from './stack.mjs';
import { seed } from './seed.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const perfDir = path.resolve(here, '..');
const reportDir = path.join(perfDir, 'reports');

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const only = typeof args.only === 'string' ? args.only.split(',') : null;

const SCRIPTS = [
  { name: 'health', file: 'health.js', requirement: 'NFR-PERF-001 health avg < 500 ms' },
  { name: 'auth', file: 'auth.js', requirement: 'NFR-PERF-001 login/registration avg < 2 s, max <= 5 s' },
  { name: 'dashboard', file: 'dashboard.js', requirement: 'NFR-PERF-001 dashboard avg < 2 s, max <= 5 s' },
  { name: 'upload', file: 'upload.js', requirement: 'NFR-PERF-001 upload (<2 MB) avg < 3 s, max <= 8 s' },
  { name: 'ai-inference', file: 'ai-inference.js', requirement: 'NFR-PERF-001 inference avg < 5 s, max <= 15 s', needsRealAi: true },
  { name: 'concurrent-scan', file: 'concurrent-scan.js', requirement: 'NFR-PERF-002 >= 10 concurrent scans without failure' },
  { name: 'concurrent-reads', file: 'concurrent-reads.js', requirement: 'NFR-PERF-002 >= 50 concurrent reads without failure' },
];

function detectRunner() {
  const local = spawnSync('k6', ['version'], { shell: true, encoding: 'utf8' });
  if (local.status === 0) return { kind: 'local', label: local.stdout.trim() };
  const docker = spawnSync('docker', ['image', 'inspect', 'grafana/k6'], { shell: true, encoding: 'utf8' });
  if (docker.status === 0) return { kind: 'docker', label: 'docker grafana/k6' };
  return null;
}

async function reachable(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetch(url, { signal: AbortSignal.timeout(4000) });
    } catch {
      /* retry: a busy dev machine can miss a single probe */
    }
  }
  return null;
}

async function realAiAvailable(aiUrl) {
  const res = await reachable(`${aiUrl}/health`);
  if (!res?.ok) return { ok: false, reason: `AI service not reachable at ${aiUrl}` };
  const body = await res.json().catch(() => ({}));
  if (body.detection_model_loaded === true && body.freshness_model_loaded === true) return { ok: true };
  return { ok: false, reason: 'AI service at this address is not the real service with both models loaded (health lacks detection_model_loaded/freshness_model_loaded = true)' };
}

function runK6(runner, script, env) {
  const summaryFile = path.join(reportDir, `${script.name}.summary.json`);
  fs.rmSync(summaryFile, { force: true });
  const common = ['run', '--quiet', `--summary-export=${runner.kind === 'docker' ? '/perf/reports/' + script.name + '.summary.json' : summaryFile}`];
  const envArgs = Object.entries(env).flatMap(([k, v]) => ['-e', `${k}=${v}`]);
  let result;
  if (runner.kind === 'local') {
    result = spawnSync('k6', [...common, ...envArgs, script.file], { cwd: path.join(perfDir, 'scripts'), encoding: 'utf8', shell: true });
  } else {
    const dockerEnv = { ...env };
    for (const key of ['BASE_URL', 'AI_URL']) dockerEnv[key] = String(dockerEnv[key]).replace(/127\.0\.0\.1|localhost/, 'host.docker.internal');
    const dockerEnvArgs = Object.entries(dockerEnv).flatMap(([k, v]) => ['-e', `${k}=${v}`]);
    result = spawnSync(
      'docker',
      ['run', '--rm', '-v', `${perfDir}:/perf`, '-w', '/perf/scripts', 'grafana/k6', ...common, ...dockerEnvArgs, script.file],
      { encoding: 'utf8' },
    );
  }
  return { status: result.status, output: `${result.stdout || ''}${result.stderr || ''}`, summaryFile };
}

function readSummary(file) {
  if (!fs.existsSync(file)) return null;
  const { metrics } = JSON.parse(fs.readFileSync(file, 'utf8'));
  const num = (m, key) => (m && typeof m[key] === 'number' ? Number(m[key].toFixed(2)) : null);
  const timing = {};
  for (const [key, m] of Object.entries(metrics)) {
    const tagged = key.match(/^http_req_duration\{name:(.+)\}$/);
    if (tagged) timing[tagged[1]] = { avgMs: num(m, 'avg'), medMs: num(m, 'med'), p95Ms: num(m, 'p(95)'), p99Ms: num(m, 'p(99)'), maxMs: num(m, 'max') };
  }
  if (Object.keys(timing).length === 0 && metrics.http_req_duration) {
    const m = metrics.http_req_duration;
    timing.all = { avgMs: num(m, 'avg'), medMs: num(m, 'med'), p95Ms: num(m, 'p(95)'), p99Ms: num(m, 'p(99)'), maxMs: num(m, 'max') };
  }
  const count = (name) => metrics[name]?.count ?? metrics[name]?.value ?? 0;
  return {
    requests: metrics.http_reqs?.count ?? null,
    requestsPerSec: num(metrics.http_reqs, 'rate'),
    failedRate: num(metrics.http_req_failed, 'value') ?? num(metrics.http_req_failed, 'rate'),
    statusDistribution: { '2xx': count('status_2xx'), '4xx': count('status_4xx'), '5xx': count('status_5xx'), 'other/timeout': count('status_other') },
    timing,
    vusMax: metrics.vus_max?.max ?? metrics.vus_max?.value ?? null,
  };
}

async function main() {
  fs.mkdirSync(reportDir, { recursive: true });
  const selected = SCRIPTS.filter((s) => !only || only.includes(s.name));
  const results = [];
  const environment = {
    date: new Date().toISOString(),
    platform: `${process.platform} ${process.arch}`,
    node: process.version,
    cpus: (await import('node:os')).cpus().length,
    totalMemGB: Number(((await import('node:os')).totalmem() / 1024 ** 3).toFixed(1)),
    note: 'Numbers depend on this machine; SRS targets assume the reference deployment.',
  };

  const runner = detectRunner();
  let stack = null;
  try {
    if (args['with-stack']) {
      stack = await startStack({ log: (m) => console.log(m) });
      console.log('Seeding...');
      const seeded = await seed(stack.dbUrl);
      console.log('Seed:', seeded.counts);
    }

    const baseUrl = process.env.BASE_URL || urls.api;
    const aiUrl = process.env.AI_URL || urls.ai;
    const target = await reachable(`${baseUrl}/health`);
    const seedFile = path.join(generatedDir, 'seed.json');

    for (const script of selected) {
      const entry = { name: script.name, requirement: script.requirement, status: 'NOT RUN', reason: '' };
      results.push(entry);

      if (!runner) {
        entry.reason = 'Neither k6 nor Docker image grafana/k6 is available (install k6, or run `docker pull grafana/k6`).';
        continue;
      }
      if (!target?.ok) {
        entry.reason = `Target ${baseUrl}/health is not reachable. Start the stack, or use --with-stack.`;
        continue;
      }
      if (!fs.existsSync(seedFile)) {
        entry.reason = 'No seed file. Run `npm run seed` (or use --with-stack).';
        continue;
      }
      if (script.needsRealAi) {
        const ai = await realAiAvailable(aiUrl);
        if (!ai.ok) {
          entry.reason = ai.reason;
          continue;
        }
      }

      const env = {
        BASE_URL: baseUrl,
        AI_URL: aiUrl,
        SCAN_CONCURRENCY: process.env.SCAN_CONCURRENCY || 10,
        READ_CONCURRENCY: process.env.READ_CONCURRENCY || 50,
      };
      for (const key of Object.keys(process.env).filter((k) => /^(T_|SAMPLE_IMAGE|UPLOAD_BYTES|SCAN_ROUNDS|READ_DURATION_SEC)/.test(k))) env[key] = process.env[key];

      console.log(`Running ${script.name} (${script.requirement})...`);
      const run = runK6(runner, script, env);
      entry.k6ExitCode = run.status;
      entry.metrics = readSummary(run.summaryFile);
      if (run.status === 0) entry.status = 'PASS';
      else if (run.status === 99) entry.status = 'FAIL';
      else {
        entry.status = 'NOT RUN';
        entry.reason = `k6 could not complete (exit ${run.status}): ${run.output.trim().split('\n').slice(-4).join(' | ')}`;
      }
      if (entry.status !== 'NOT RUN') entry.reason = entry.status === 'PASS' ? 'all thresholds met' : 'threshold breached: ' + run.output.split('\n').filter((l) => /✗|thresholds on metrics|has \d+ error/i.test(l)).join(' | ').slice(0, 300);
    }
  } finally {
    await stack?.stop();
  }

  const report = { environment, runner: runner?.label ?? 'none', results };
  fs.writeFileSync(path.join(reportDir, 'results.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(reportDir, 'results.md'), toMarkdown(report));
  console.log('\n' + toMarkdown(report));

  const failed = results.some((r) => r.status === 'FAIL');
  process.exit(args.strict && failed ? 1 : 0);
}

function toMarkdown({ environment, runner, results }) {
  const rows = results.map((r) => {
    const t = r.metrics?.timing ? Object.entries(r.metrics.timing).map(([k, v]) => `${k}: avg ${v.avgMs} / p95 ${v.p95Ms} / p99 ${v.p99Ms} / max ${v.maxMs} ms`).join('<br>') : '';
    const extra = r.metrics ? `${r.metrics.requests} req, ${r.metrics.requestsPerSec} req/s, status ${JSON.stringify(r.metrics.statusDistribution)}` : '';
    return `| ${r.name} | ${r.requirement} | **${r.status}** | ${t || '-'} | ${extra || '-'} | ${r.reason || ''} |`;
  });
  return [
    `Performance run ${environment.date} - ${environment.platform}, ${environment.cpus} CPUs, ${environment.totalMemGB} GB RAM, Node ${environment.node}, runner: ${runner}`,
    '',
    '| Test | SRS requirement | Result | Latency | Throughput | Notes |',
    '|------|-----------------|--------|---------|------------|-------|',
    ...rows,
    '',
  ].join('\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
