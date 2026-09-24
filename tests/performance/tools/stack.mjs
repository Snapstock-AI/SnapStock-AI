// Starts a self-contained local stack for performance runs:
//   fake AI + capturing SMTP (e2e/support/test-doubles.mjs)  ->  compiled API (node dist/index.js)  ->  test database
// The API is the production build (not ts-node) so memory numbers are representative.
// Nothing here touches the developer database: it uses snapstock_e2e_test, recreated from the migrations.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(here, '../../..');
export const generatedDir = path.resolve(here, '../.generated');

export const ports = { api: 5100, ai: 8899, smtp: 2525 };
export const urls = { api: `http://127.0.0.1:${ports.api}`, ai: `http://127.0.0.1:${ports.ai}` };

export function databaseUrl() {
  if (process.env.PERF_DATABASE_URL) return assertTestDb(process.env.PERF_DATABASE_URL);
  const envFile = path.join(root, '.env');
  const line = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8').match(/^DATABASE_URL=(.+)$/m) : null;
  const base = process.env.DATABASE_URL || line?.[1]?.trim();
  if (!base) throw new Error('Set PERF_DATABASE_URL (a database whose name ends in _test) or DATABASE_URL in the root .env');
  const url = new URL(base.replace(/@postgres(?=[:/])/g, '@localhost'));
  url.pathname = '/snapstock_e2e_test';
  return url.toString();
}

function assertTestDb(url) {
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith('_test')) throw new Error(`Refusing to use database "${name}": performance runs need a name ending in _test`);
  return url;
}

async function waitFor(url, label, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error(`${label} did not become ready at ${url}`);
}

export async function startStack({ log = console.log } = {}) {
  const dbUrl = databaseUrl();
  process.env.TEST_DATABASE_URL = dbUrl;

  log('Recreating the performance database from migrations...');
  execFileSync('npm', ['run', 'prepare:db'], { cwd: path.join(root, 'e2e'), stdio: 'ignore', shell: true, env: { ...process.env, TEST_DATABASE_URL: dbUrl } });

  if (!process.env.PERF_SKIP_BUILD) {
    log('Building the API (tsc)...');
    execFileSync('npx', ['tsc'], { cwd: path.join(root, 'server'), stdio: 'inherit', shell: true });
  }

  const children = [];
  const spawnQuiet = (cmd, args, options) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'inherit'], ...options });
    children.push(child);
    return child;
  };

  spawnQuiet(process.execPath, [path.join(root, 'e2e/support/test-doubles.mjs')], {
    cwd: path.join(root, 'e2e'),
    env: { ...process.env, AI_PORT: String(ports.ai), SMTP_PORT: String(ports.smtp) },
  });
  await waitFor(`${urls.ai}/health`, 'fake AI service');

  const api = spawnQuiet(process.execPath, ['dist/index.js'], {
    cwd: path.join(root, 'server'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(ports.api),
      DATABASE_URL: dbUrl,
      JWT_SECRET: 'perf-only-secret',
      AI_SERVICE_URL: urls.ai,
      AI_SERVICE_TIMEOUT_MS: '30000',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(ports.smtp),
      SMTP_USER: 'noreply@snapstock.test',
      SMTP_PASS: 'perf',
      CLIENT_URL: 'http://127.0.0.1:5273',
    },
  });
  await waitFor(`${urls.api}/health`, 'API');

  fs.mkdirSync(generatedDir, { recursive: true });
  fs.writeFileSync(path.join(generatedDir, 'stack.json'), JSON.stringify({ apiPid: api.pid, startedAt: new Date().toISOString() }));
  log(`Stack ready: API pid ${api.pid} on ${urls.api}, fake AI on ${urls.ai}`);

  return {
    apiPid: api.pid,
    dbUrl,
    async stop() {
      for (const child of children) {
        try {
          if (process.platform === 'win32') execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
          else child.kill('SIGTERM');
        } catch {
          /* already gone */
        }
      }
    },
  };
}
