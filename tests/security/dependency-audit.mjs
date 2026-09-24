// Dependency vulnerability review. SRS NFR-SEC-005.3: dependencies reviewed for known critical vulnerabilities.
//   node tests/security/dependency-audit.mjs [--strict]     (--strict exits 1 on high/critical)
// Uses `npm audit` (needs network access to the npm registry) and `pip-audit` when installed.
// Writes tests/security/reports/dependency-audit.json. Anything that cannot run is NOT RUN with the reason.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const strict = process.argv.includes('--strict');
const results = [];

for (const dir of ['server', 'client', 'e2e', 'tests/performance']) {
  const cwd = path.join(root, dir);
  if (!fs.existsSync(path.join(cwd, 'package-lock.json'))) continue;
  const run = spawnSync('npm', ['audit', '--json', '--omit=dev'], { cwd, shell: true, encoding: 'utf8', maxBuffer: 1 << 26 });
  try {
    const report = JSON.parse(run.stdout);
    if (report.error) throw new Error(report.error.summary || 'npm audit error');
    const v = report.metadata.vulnerabilities;
    results.push({ target: `${dir} (npm, production deps)`, status: v.high + v.critical > 0 ? 'FAIL' : 'PASS', vulnerabilities: v });
  } catch (error) {
    results.push({ target: `${dir} (npm, production deps)`, status: 'NOT RUN', reason: `npm audit failed: ${error.message}` });
  }
}

const req = path.join(root, 'ai-service/requirements.txt');
const pip = spawnSync('python', ['-m', 'pip_audit', '-r', req, '-f', 'json', '--progress-spinner', 'off'], { encoding: 'utf8', maxBuffer: 1 << 26 });
if (pip.status === null || /No module named pip_audit/.test(pip.stderr || '')) {
  results.push({ target: 'ai-service (pip)', status: 'NOT RUN', reason: 'pip-audit not installed (pip install pip-audit)' });
} else {
  try {
    const deps = JSON.parse(pip.stdout).dependencies || [];
    const vulnerable = deps.filter((d) => d.vulns?.length);
    results.push({ target: 'ai-service (pip)', status: vulnerable.length ? 'FAIL' : 'PASS', vulnerablePackages: vulnerable.map((d) => `${d.name} ${d.version}: ${d.vulns.map((x) => x.id).join(', ')}`) });
  } catch {
    results.push({ target: 'ai-service (pip)', status: 'NOT RUN', reason: `pip-audit produced no JSON: ${(pip.stderr || '').slice(0, 200)}` });
  }
}

fs.mkdirSync(path.join(here, 'reports'), { recursive: true });
fs.writeFileSync(path.join(here, 'reports/dependency-audit.json'), JSON.stringify({ date: new Date().toISOString(), results }, null, 2));
for (const r of results) console.log(`${r.status.padEnd(8)} ${r.target} ${JSON.stringify(r.vulnerabilities ?? r.vulnerablePackages ?? r.reason ?? '')}`);
process.exit(strict && results.some((r) => r.status === 'FAIL') ? 1 : 0);
