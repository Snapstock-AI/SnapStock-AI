// Repository secret hygiene. SRS NFR-SEC-002.2: secrets shall not be committed to Git.
//   node tests/security/secrets-scan.mjs
// Scans git-tracked files only, checks .env is untracked/ignored, and that the JWT secret is read from
// the environment. Exit 1 on any finding. Heuristic (no substitute for a dedicated scanner such as gitleaks).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
const findings = [];

const tracked = git('ls-files', '-z').split('\0').filter(Boolean);
if (tracked.some((f) => /(^|\/)\.env($|\.(local|production|development))/.test(f) && !f.endsWith('.example'))) {
  findings.push('A real .env file is tracked by git');
}
try {
  git('check-ignore', '-q', '.env');
} catch {
  findings.push('.env is not git-ignored');
}

const PATTERNS = [
  ['private key block', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['AWS access key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['GitHub token', /\bgh[pousr]_[0-9A-Za-z]{36,}\b/],
  ['Slack token', /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/],
  ['hard-coded JWT secret assignment', /JWT_SECRET\s*[:=]\s*["'][^"'$<\s][^"']{5,}["']/],
  ['database URL with password', /postgres(?:ql)?:\/\/[^:\s/@]+:(?!\$|\{|<|password|postgres|example|user|xxx)[^@\s/]{4,}@(?!localhost|127\.0\.0\.1|postgres[:/])[\w.-]+/i],
];
// Test fixtures legitimately use throw-away secrets.
const ALLOW = /(^|\/)(tests?|e2e|__tests__)\/|\.example$|\.md$|package-lock\.json$|ci\.ya?ml$|-ci\.ya?ml$/;
const SKIP_EXT = /\.(png|jpe?g|gif|ico|svg|woff2?|zip|pdf|pt|h5|keras|onnx|webp|mp4)$/i;

for (const file of tracked) {
  if (SKIP_EXT.test(file) || ALLOW.test(file)) continue;
  let text;
  try {
    const buf = fs.readFileSync(path.join(root, file));
    if (buf.length > 2_000_000) continue;
    text = buf.toString('utf8');
  } catch {
    continue;
  }
  for (const [label, regex] of PATTERNS) {
    const m = text.match(regex);
    if (m) findings.push(`${file}: ${label} (${m[0].slice(0, 6)}...)`);
  }
}

// JWT secret must come from the environment, never a literal.
for (const file of ['server/src/modules/auth/auth.service.ts', 'server/src/shared/middleware/auth.middleware.ts']) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  if (!/process\.env\.JWT_SECRET/.test(src)) findings.push(`${file}: JWT secret is not read from process.env.JWT_SECRET`);
  if (/jwt\.(sign|verify)\([^)]*["'][A-Za-z0-9_-]{8,}["']\s*[,)]/.test(src)) findings.push(`${file}: literal string passed as JWT key`);
}

if (findings.length) {
  console.error('Secret scan FAILED:\n - ' + findings.join('\n - '));
  process.exit(1);
}
console.log(`Secret scan passed (${tracked.length} tracked files checked, .env ignored, JWT secret read from env).`);
