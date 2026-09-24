# Security testing (local stack only, non-destructive)

| Area | Test | Status |
|------|------|--------|
| Authentication | missing / expired / malformed / wrong-signature / `alg=none` JWT, revoked session (`auth.jwt.test.ts`, `auth.db.test.ts`) | PASS |
| Authorization | OWNER vs EMPLOYEE 403 over HTTP (`api-security.db.test.ts`) | PASS; ADMIN not implemented |
| Tenant isolation / IDOR | both directions on 8 read endpoints and shelf/business/scan writes, manipulated UUIDs (`api-security.db.test.ts`, `tenant-isolation.db.test.ts`) | PASS |
| Input validation | malformed JSON, invalid ids, SQL-injection strings, mass assignment, oversize/disguised/executable uploads | PASS |
| HTTP security | Helmet headers, CORS whitelist, no wildcard in production (`http-security.test.ts`) | PASS (HTTPS itself is manual M-16) |
| Secrets | `tests/security/secrets-scan.mjs`: `.env` untracked and ignored, no key/token patterns, JWT secret from env | PASS |
| Passwords | bcrypt cost >= 10, no plaintext, no hash in responses | PASS |
| Dependencies | `tests/security/dependency-audit.mjs` | FAIL: server 3 high + 3 moderate, client 4 high; pip-audit NOT RUN |
| Rate limiting | not implemented (TD-07); no test can pass | OPEN |
| Security logging | not tested; the analyze controller logs request bodies and `req.user` with `console.log` (no tokens or passwords observed) | OPEN |

Nothing was run against any external system.
