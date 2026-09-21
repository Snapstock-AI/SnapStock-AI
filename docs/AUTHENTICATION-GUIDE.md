# SnapStock-AI — Authentication Guide

**Purpose:** One document to explain **how authentication works in SnapStock-AI** for mid-evaluation, demos, and interviews. Every claim includes **evidence (file + idea)**, **reason**, and a **spoken answer**. Be honest about what is implemented vs still limited.

**Project:** SnapStock-AI  
**Stack:** React · Express · TypeORM · PostgreSQL · JWT · bcrypt · nodemailer  

**Related docs:** `docs/AUTH-CODE-STORY-WALKTHROUGH.md` (beginner story / reading order), `docs/CODEGEN-INTERVIEW-PREP-SNAPSTOCK-AI.md`, `docs/DESIGN-PATTERNS-AND-OOP.md`, `docs/INTERVIEW-OOP-GOF-NORMALIZATION.md`

---

## How to use this

1. Start with the **one-sentence pitch**.
2. Open the **file** if screen-sharing.
3. Say **why** you chose that design.
4. End with one **limitation** if asked (shows maturity).

---

## Quick map (say this first)

| Topic | Honest answer |
|-------|----------------|
| **Password storage** | bcrypt hash (cost 10); never store plaintext |
| **Login token** | JWT access token (1d) with `userId`, `email`, `system_role`, `sessionId` |
| **Logout** | Revokes the **session** in DB (not just “delete token on client”) |
| **Refresh** | Refresh token stored in `sessions`; rotation on refresh |
| **Email verify / reset** | One-time tokens in DB + email links |
| **Protected APIs** | `authMiddleware` on `/auth/logout` and `/detection/analyze` |
| **Client** | `localStorage` for access + refresh; Bearer on authenticated calls |
| **Roles** | `system_role` in JWT; `requireRoles` helper exists (light use so far) |

---

## 1. One-sentence pitch

> SnapStock-AI auth is a **layered Express module**: register/login with **bcrypt**, **email verification**, **JWT access tokens bound to DB sessions**, **refresh-token rotation**, and **middleware** that blocks protected routes (including shelf analyze) unless the session is still active.

---

## 2. What is actually built

| Feature | Status | Evidence |
|---------|--------|----------|
| Register + bcrypt hash | Done | `auth.service.ts` → `register` |
| Email verification | Done | token table + `verify-email` / `resend-verification` |
| Login (verified users only) | Done | `login` checks `email_verified` |
| Access JWT + refresh session | Done | `createSessionTokens` + `sessions` table |
| Logout revokes session | Done | `logout` + `authMiddleware` |
| Refresh rotates session | Done | `POST /auth/refresh` |
| Forgot / reset password | Done | reset token + revoke all sessions |
| Protect detection analyze | Done | `detection.routes.ts` uses middleware |
| Client Bearer + refresh retry | Done | `client/src/lib/api.ts`, `auth.ts` |
| Full RBAC / business membership checks | Partial | `system_role` + `requireRoles`; business-scoped authz still thin |

---

## 3. High-level flow

```text
Browser (React)
    │  POST /auth/register | login | refresh | logout
    │  Authorization: Bearer <access JWT>
    ▼
Express Auth module
    Routes → Controller → Service → Repository → PostgreSQL
         │
         ├── users (password_hash, email_verified, system_role)
         ├── email_verification_tokens
         ├── password_reset_tokens
         └── sessions (refresh_token, expires_at, revoked_at)
```

### Login (happy path)

1. Client `POST /auth/login` with email + password.
2. Service loads user by email.
3. `bcrypt.compare` checks password.
4. Reject if email not verified.
5. Create `sessions` row with random refresh token (7 days).
6. Sign access JWT (1 day) including `sessionId`.
7. Return `{ token, refreshToken, user }`.
8. Client stores both tokens + user in `localStorage`.

### Authenticated request (e.g. analyze)

1. Client sends `Authorization: Bearer <token>`.
2. Middleware verifies JWT signature + expiry.
3. Middleware loads active session by `sessionId`.
4. If missing/expired/revoked → **401**.
5. Sets `req.user` (`id`, `userId`, `email`, `system_role`, `sessionId`).
6. Controller continues.

### Logout

1. Client calls `POST /auth/logout` with Bearer token.
2. Middleware validates session.
3. Service sets `revoked_at` on that session.
4. Client clears localStorage.
5. Old access JWT may still be cryptographically valid until expiry, but **middleware rejects it** because the session is revoked.

---

## 4. Layered module structure

Same vertical slice as detection:

```text
auth.routes.ts
    → auth.controller.ts
        → auth.service.ts
            → auth.repository.ts
                → TypeORM entities / PostgreSQL
```

| Layer | Responsibility | File |
|-------|----------------|------|
| Routes | Paths + attach middleware | `server/src/modules/auth/auth.routes.ts` |
| Controller | HTTP status + JSON envelope | `auth.controller.ts` |
| Service | Business rules (hash, JWT, email) | `auth.service.ts` |
| Repository | DB only | `auth.repository.ts` |
| Middleware | Cross-cutting authn/authz | `server/src/shared/middleware/auth.middleware.ts` |
| Client state | Tokens + React context | `client/src/lib/auth.ts`, `AuthContext.tsx` |

**Why:** Controllers stay free of bcrypt/SQL; repositories stay free of JWT/email; services stay free of `res.status`.

**Interview answer:**  
> “Auth follows our module template: routes, controller, service, repository. Login hashing and session creation live in `AuthService`; SQL lives in `AuthRepository`.”

---

## 5. REST API map

Base path: `/auth` (mounted in `server/src/app.ts`).

| Method | Path | Auth required? | What it does |
|--------|------|----------------|--------------|
| POST | `/auth/register` | No | Create user, hash password, send verify email |
| POST | `/auth/login` | No | Create session + return tokens |
| POST | `/auth/logout` | **Yes** | Revoke current session |
| POST | `/auth/refresh` | No (body has refreshToken) | Rotate session + tokens |
| GET | `/auth/verify-email?token=` | No | Mark email verified |
| POST | `/auth/resend-verification` | No | New verify token (generic message) |
| POST | `/auth/forgot-password` | No | Send reset email (generic message) |
| POST | `/auth/reset-password` | No | Set new password + revoke all sessions |

Protected product API:

| Method | Path | Auth |
|--------|------|------|
| POST | `/detection/analyze` | Bearer + active session |

Typical success shape:

```json
{
  "success": true,
  "data": { "...": "..." }
}
```

Typical error shape:

```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

---

## 6. Password storage (bcrypt)

### What we do
- Register: `bcrypt.hash(password, 10)` → store `password_hash`.
- Login: `bcrypt.compare(password, user.password_hash)`.
- Reset: hash new password the same way.

### Evidence
`server/src/modules/auth/auth.service.ts` (`register`, `login`, `resetPassword`)

### Why bcrypt
- Slow by design (cost factor) → brute-force resistant.
- Salted automatically → same password ≠ same hash.

### Interview answer
> “We never store plaintext. Registration hashes with bcrypt cost 10. Login only compares. If someone dumps the DB, they still don’t get usable passwords.”

### Limitation
> “We don’t enforce a complex password policy in code yet beyond ‘required string’ — that can be added with Zod validation.”

---

## 7. JWT access token + sessions

### Access token (JWT)
Signed with `process.env.JWT_SECRET`, TTL **1d**, payload:

- `userId`
- `email`
- `system_role`
- `sessionId`

### Refresh token
- Random 48-byte hex string.
- Stored in `sessions.refresh_token` (unique).
- Expires in **7 days**.
- Returned to client; used only on `/auth/refresh`.

### Session table
Migration: `server/migrations/016_create_sessions_table.ts`

| Column | Role |
|--------|------|
| `id` | Session PK; embedded in JWT as `sessionId` |
| `user_id` | FK → `users` |
| `refresh_token` | Opaque refresh credential |
| `expires_at` | Absolute expiry |
| `revoked_at` | Soft revoke on logout / rotation / password reset |

### Why session-bound JWT (not pure stateless JWT)
Pure JWT cannot be revoked until it expires. Binding `sessionId` and checking DB lets us:

- Invalidate on logout
- Invalidate all sessions on password reset
- Rotate on refresh

**Interview answer:**  
> “We use JWTs for API convenience, but each token carries a `sessionId`. Middleware checks the sessions table so logout and password reset actually take effect.”

### Limitation
> “Refresh tokens are stored in plaintext in DB today. Hashing them at rest would be a good hardening step. Access tokens in localStorage are XSS-sensitive; httpOnly cookies are a common upgrade.”

---

## 8. Middleware: authentication vs authorization

### Authentication (`authMiddleware`)
File: `server/src/shared/middleware/auth.middleware.ts`

Checks:

1. `Authorization` header present  
2. Format `Bearer <token>`  
3. JWT verify  
4. `sessionId` present  
5. Active session exists and not expired  

Then sets `req.user`.

### Authorization (`requireRoles`)
Same file — returns **403** if `req.user.system_role` not in allowed list.

**Interview tip:**  
> “Authentication answers *who are you?* Authorization answers *are you allowed?* Our middleware does authn; `requireRoles` is the start of authz. Business-level membership checks are still thin.”

### Where it is applied
- `POST /auth/logout` — must be logged in to revoke
- `POST /detection/analyze` — must be logged in to scan

---

## 9. Email verification & password reset

### Verify email
1. Register creates random token (1 hour).
2. Email link hits `GET /auth/verify-email?token=...`.
3. Service marks `email_verified = true`, deletes token.
4. Login blocked until verified.

### Forgot / reset password
1. Forgot always returns a **generic** message (no email enumeration).
2. Reset token stored; email sent.
3. Reset hashes new password, deletes token, **`revokeSessionsForUser`**.

**Why revoke all sessions on reset:**  
Stolen sessions must die when the password changes.

---

## 10. Client behavior

| Concern | Where | Behavior |
|---------|-------|----------|
| Store tokens | `client/src/lib/auth.ts` | `snapstock_token`, `snapstock_refresh`, `snapstock_user` |
| Login/register/logout UI state | `AuthContext.tsx` | Calls API, updates state |
| Attach Bearer | `api.ts` (`auth=true`) | Sets `Authorization` |
| Auto refresh | `api.ts` | On 401, call `/auth/refresh` once, retry |
| Detection upload | `detection.ts` / Scans page | Sends Bearer with multipart |

**Interview answer:**  
> “After login we store access and refresh tokens. Authenticated `apiRequest` sends Bearer. If we get 401, we try refresh once; if that fails we clear auth.”

---

## 11. Security checklist (honest)

| Control | Status |
|---------|--------|
| Password hashing (bcrypt) | Yes |
| Email verification before login | Yes |
| Session revocation on logout | Yes |
| Session revoke on password reset | Yes |
| Refresh token rotation | Yes |
| Generic messages on forgot/resend | Yes |
| HTTPS in production | Ops concern (assume reverse proxy) |
| Rate limiting / lockout | Not yet |
| Refresh token hashing at rest | Not yet |
| httpOnly cookie transport | Not yet (localStorage) |
| Full multi-tenant authz | Schema ahead of enforcement |

---

## 12. Testing

### Automated (preferred)

```bash
cd server
npm test
# auth only:
npx jest --testPathPatterns=auth
```

| Suite | File | Covers |
|-------|------|--------|
| Unit service | `server/tests/unit/auth/auth.service.test.ts` | login session, logout revoke, refresh rotate, reset kills sessions |
| Unit middleware | `server/tests/unit/auth/auth.middleware.test.ts` | missing/invalid token, revoked session, valid session, roles |
| Integration | `server/tests/integration/auth/auth.integration.test.ts` | login/refresh/logout HTTP + protected analyze |

### CI
`.github/workflows/server-ci.yml` runs `npm test` on PRs to `dev` and pushes to `dev` / `fix/**`.

### Manual smoke (optional)

1. Register → verify email → login → get tokens  
2. Call `/detection/analyze` with Bearer → 200/400 from business logic, not 401  
3. Logout → same analyze → **401**  
4. Login → refresh → old refresh should fail after rotation  
5. Reset password → previous access token session rejected  

---

## 13. Likely interview questions

### “How do you store passwords?”
> bcrypt hash cost 10 in `password_hash`. Compare on login. Never log or return the hash.

### “Is JWT enough for logout?”
> Not by itself. We embed `sessionId` and revoke the session row so middleware rejects the token after logout.

### “What is the difference between access and refresh tokens?”
> Access JWT is short-lived and sent on each API call. Refresh is a long opaque token used only to mint a new session pair.

### “How do you protect the AI scan endpoint?”
> `authMiddleware` is mounted before multer/controller on `POST /detection/analyze`. No Bearer or revoked session → 401.

### “Do you have RBAC?”
> We store `system_role` and have `requireRoles`. Full business membership authorization is designed in schema but not fully enforced on every domain API yet.

### “What would you improve next?”
> Rate-limit login, hash refresh tokens at rest, prefer httpOnly Secure cookies, tighten password policy, enforce business-scoped authorization on all tenant APIs.

---

## 14. Files to open in a demo

**Server**
- `server/src/modules/auth/auth.routes.ts`
- `server/src/modules/auth/auth.service.ts`
- `server/src/modules/auth/auth.repository.ts`
- `server/src/shared/middleware/auth.middleware.ts`
- `server/migrations/016_create_sessions_table.ts`
- `server/src/modules/detection/detection.routes.ts`

**Client**
- `client/src/lib/auth.ts`
- `client/src/lib/api.ts`
- `client/src/context/AuthContext.tsx`

**Tests**
- `server/tests/unit/auth/auth.service.test.ts`
- `server/tests/unit/auth/auth.middleware.test.ts`
- `server/tests/integration/auth/auth.integration.test.ts`

---

## 15. Claims to avoid

| Don’t say | Say instead |
|-----------|-------------|
| “Fully stateless JWT auth” | “JWT + server sessions for revocation” |
| “Full RBAC everywhere” | “Role claim + helper; business authz still maturing” |
| “Logout invalidates JWT cryptographically” | “Logout revokes session; middleware rejects it” |
| “Production-hardened auth” | “Solid prototype: bcrypt, verify, sessions, tests; rate limits/cookies next” |

---

## 16. Quick revision checklist

- [ ] Explain register → verify → login  
- [ ] Explain bcrypt  
- [ ] Explain JWT payload includes `sessionId`  
- [ ] Explain logout / reset revoke sessions  
- [ ] Explain refresh rotation  
- [ ] Show middleware on detection  
- [ ] Show client Bearer + refresh retry  
- [ ] Mention one limitation  
- [ ] Know how to run `npm test` for auth  

---

*Document reflects the implemented auth + session work on the SnapStock-AI server/client. Keep this file updated when auth behavior changes.*
