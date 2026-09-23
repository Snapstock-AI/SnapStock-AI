# SnapStock-AI — Auth Code as a Story

**Purpose:** Teach authentication from zero by walking **this project’s real files**, in order. No prior auth knowledge needed.

**Companion doc:** `docs/AUTHENTICATION-GUIDE.md` (interview / evidence style).  
**This doc:** where to open files, what each layer means, and *why* it exists.

**Project:** SnapStock-AI  
**Stack:** React · Express · TypeORM · PostgreSQL · JWT · bcrypt · nodemailer  

---

## How to use this

1. Read **Chapter 0** once (plain-English ideas).
2. Open the files in the order of the chapters (don’t jump to JWT first).
3. After each chapter, ask yourself: *“What problem did this file solve?”*
4. Only then skim `AUTHENTICATION-GUIDE.md` for interview wording.

---

## Chapter 0 — What “auth” even means (no code yet)

Imagine a shop with a locked door.

| Everyday idea | Auth word | In SnapStock-AI |
|---------------|-----------|-----------------|
| Do I know who you are? | **Authentication** | Login with email + password |
| Are you allowed to do this? | **Authorization** | `system_role` + `requireRoles` (light use) |
| Your badge for today | **Access token (JWT)** | Short-lived proof in `Authorization: Bearer …` |
| Your long pass that can mint a new badge | **Refresh token** | Stored in DB `sessions` table |
| “This badge is cancelled” | **Session revoke** | Logout / password reset sets `revoked_at` |
| Prove the email is yours | **Email verification** | One-time token emailed, then `email_verified = true` |

**One sentence to remember:**

> The server must never trust the browser. The browser *claims* “I am Alice”; the server *checks* password, then issues tokens, then *re-checks* those tokens on every protected request.

If you only remember that, the rest of the code will make sense.

---

## Chapter 1 — Where to begin (the map)

**Start here, not in JWT math.**

Auth is a **vertical slice** (same pattern as detection):

```text
HTTP request
    → auth.routes.ts          “which URL?”
        → auth.controller.ts  “HTTP in/out only”
            → auth.service.ts “business rules”
                → auth.repository.ts “talk to PostgreSQL”
```

Plus two “shared” pieces:

| File | Role |
|------|------|
| `server/src/app.ts` | Mounts the module at `/auth` |
| `server/src/shared/middleware/auth.middleware.ts` | Bouncer for protected routes |
| `client/src/lib/auth.ts` (+ AuthContext) | Browser stores tokens and sends Bearer |

**Why this order?**  
Routes tell you *what exists*. Controller shows *shape of responses*. Service holds *real decisions*. Repository is *boring SQL*. Middleware is *the door guard*. Client is *how the UI remembers login*.

**Open these in order:**

1. `server/src/app.ts` — find `app.use("/auth", authRoutes)`
2. `server/src/modules/auth/auth.routes.ts`
3. `server/src/modules/auth/auth.controller.ts`
4. `server/src/modules/auth/auth.service.ts`
5. `server/src/modules/auth/auth.repository.ts`
6. `server/src/shared/middleware/auth.middleware.ts`
7. `client/src/lib/auth.ts`

---

## Chapter 2 — The front door (`auth.routes.ts`)

**File:** `server/src/modules/auth/auth.routes.ts`

This file is a **table of contents for URLs**. Almost no logic.

```text
POST /auth/register              → create account
POST /auth/login                 → get tokens
POST /auth/logout                → needs authMiddleware first
POST /auth/refresh               → new tokens from refresh token
GET  /auth/verify-email?token=   → click link from email
POST /auth/resend-verification
POST /auth/forgot-password
POST /auth/reset-password
```

**Why middleware only on logout?**  
Register/login/forgot must work *before* you have a token. Logout must prove *which session* to kill — so `authMiddleware` runs first and puts `sessionId` on `req.user`.

**Story beat:**  
> “If I don’t know the URLs, I don’t know the product surface. Routes are the menu; service is the kitchen.”

---

## Chapter 3 — The thin waiter (`auth.controller.ts`)

**File:** `server/src/modules/auth/auth.controller.ts`

Every method looks like the same story:

1. Call `AuthService.something(req.body)` (or query / `req.user`).
2. On success → `res.status(…).<json>({ success: true, data })`.
3. On failure → catch → `{ success: false, message }`.

**What the controller does *not* do:**  
Hash passwords, sign JWTs, write SQL, send email.

**Why?**  
HTTP details (status codes, JSON envelope) stay separate from business rules. You can unit-test the service without Express.

**Story beat:**  
> “Controller is a waiter: takes the order, brings the plate, never cooks.”

---

## Chapter 4 — The kitchen (`auth.service.ts`) — read this slowly

**File:** `server/src/modules/auth/auth.service.ts`

This is where auth *actually happens*. Walk it as **user journeys**, not as a list of functions.

### Journey A — “I’m new” (register)

1. Check email not already used (`findByEmail`).
2. **Hash** password with bcrypt (`bcrypt.hash(password, 10)`).  
   - Never store `"mypassword"` in the DB — store a slow one-way hash.
3. Create user row.
4. Create a **random email token** (crypto), save it with expiry (~1 hour).
5. Email the link.
6. Return success message — user is **not fully usable until verified**.

**Why verify email?**  
Anyone can type `admin@yourshop.com`. The link proves they own the inbox.

### Journey B — “Let me in” (login)

1. Find user by email. If missing → `"Invalid credentials"` (same message if password wrong — don’t leak which part failed).
2. `bcrypt.compare(plainPassword, password_hash)`.
3. If `email_verified` is false → reject.
4. Call `createSessionTokens`:
   - Random **refresh token** (48 bytes hex).
   - Insert **session** row (expires in 7 days).
   - Sign **access JWT** (1 day) containing `userId`, `email`, `system_role`, `sessionId`.
5. Return `{ token, refreshToken, user }` to the client.

**Why two tokens?**

| Token | Lifetime | Purpose |
|-------|----------|---------|
| Access JWT | ~1 day | Sent on every API call; middleware checks it |
| Refresh | ~7 days | Used only on `/auth/refresh` to get a new pair |

**Why put `sessionId` inside the JWT?**  
A pure JWT cannot be cancelled until it expires. We bind it to a DB session so logout / reset can **revoke** access early.

### Journey C — “I’m done” (logout)

1. Middleware already verified the access token and set `req.user.sessionId`.
2. Service calls `revokeSession(sessionId)` → sets `revoked_at`.
3. Client clears `localStorage`.

**Important honesty:**  
The JWT string may still *decode* until expiry, but middleware loads the session and rejects revoked ones. That is the whole point of session binding.

### Journey D — “My access token expired” (refresh)

1. Client sends `refreshToken` in the body (not the access JWT).
2. Find **active** session by that refresh token.
3. **Revoke** the old session.
4. Create a **new** session + new token pair (rotation).

**Why rotate?**  
If a stolen refresh token is used once, the real user refreshes and the thief’s token dies (or races fail). Rotation limits damage.

### Journey E — “I forgot my password”

1. `forgotPassword`: always return a **generic** message (“If an account exists…”), even if email unknown — don’t confirm who has accounts.
2. Save reset token + email link.
3. `resetPassword`: validate token → hash new password → **revoke all sessions** for that user.

**Why revoke all sessions?**  
Old phones/browsers must not keep working after a password change.

---

## Chapter 5 — The pantry (`auth.repository.ts`)

**File:** `server/src/modules/auth/auth.repository.ts`

Only database operations: find user, create user, save tokens, create/revoke sessions, etc.

**Why separate?**  
Service says *what should happen*; repository says *how to persist*. Swapping TypeORM details later doesn’t rewrite bcrypt/JWT rules.

**Tables you’ll meet (conceptually):**

| Table | Holds |
|-------|--------|
| `users` | email, `password_hash`, `email_verified`, `system_role` |
| `email_verification_tokens` | one-time verify links |
| `password_reset_tokens` | one-time reset links |
| `sessions` | refresh token, expiry, `revoked_at` |

---

## Chapter 6 — The bouncer (`auth.middleware.ts`)

**File:** `server/src/shared/middleware/auth.middleware.ts`

Used on routes that must not be public (e.g. `POST /auth/logout`, `POST /detection/analyze`).

**What it checks, in order:**

1. Header `Authorization` exists.
2. Format is `Bearer <token>`.
3. `jwt.verify` with `JWT_SECRET` (signature + expiry).
4. Payload has `sessionId`.
5. DB: session exists, not revoked, not past `expires_at`.
6. Attach `req.user` and call `next()`.

If any step fails → **401**.

`requireRoles("ADMIN", …)` is a second gate: **403 Forbidden** if role doesn’t match (authorization after authentication).

**Story beat:**  
> “Middleware is the security guard between the door and the room. Controllers assume `req.user` is already trustworthy.”

---

## Chapter 7 — The phone in your pocket (client)

**Files:** `client/src/lib/auth.ts`, Auth context, `client/src/lib/api.ts`

Typical client story after login:

1. Save `token` + `refreshToken` (+ user) in `localStorage`.
2. On API calls, set `Authorization: Bearer <token>`.
3. If a call gets 401, try `/auth/refresh`, store new tokens, retry.
4. On logout, call `/auth/logout`, then clear storage.

**Why localStorage?**  
Simple for a student/demo app. Real production often prefers httpOnly cookies to reduce XSS token theft — know that as a limitation.

---

## Chapter 8 — One full movie (login → analyze → logout)

Read this once with the files open:

```text
1. User submits email/password on React login form
2. POST /auth/login
3. AuthService: bcrypt compare → email verified? → createSessionTokens
4. Client stores token + refreshToken
5. User uploads shelf photo → POST /detection/analyze
6. authMiddleware: verify JWT → load session → OK
7. Detection controller runs (user is known via req.user)
8. User clicks logout → POST /auth/logout (Bearer)
9. Middleware OK → AuthService.revokeSession
10. Client clears tokens
11. Same old JWT sent again → middleware finds revoked session → 401
```

That movie *is* the auth system.

---

## Chapter 9 — Reading order cheat sheet (print this)

| Step | Open | Ask yourself |
|------|------|----------------|
| 1 | `app.ts` | Where is `/auth` mounted? |
| 2 | `auth.routes.ts` | Which routes are public vs guarded? |
| 3 | `auth.controller.ts` | Does any method cook business logic? (No.) |
| 4 | `auth.service.ts` → `register` | Where is the password hashed? |
| 5 | `auth.service.ts` → `login` + `createSessionTokens` | Why both JWT and refresh? |
| 6 | `auth.middleware.ts` | Why check DB after JWT verify? |
| 7 | `auth.service.ts` → `logout` / `refresh` / `resetPassword` | How do we kill old access? |
| 8 | Client `auth.ts` / `api.ts` | Where do tokens live in the browser? |

---

## Chapter 10 — Tiny glossary (keep nearby)

| Term | Plain meaning |
|------|----------------|
| **bcrypt** | Slow password hasher; stores hash, not password |
| **JWT** | Signed blob the server can verify without looking up the password again |
| **Bearer** | “Here’s my token in the Authorization header” |
| **Session (ours)** | DB row that can revoke a JWT early |
| **Rotation** | Kill old refresh, issue new one |
| **401** | Not authenticated (who are you?) |
| **403** | Authenticated but not allowed (wrong role) |

---

## Chapter 11 — Honest limitations (say these out loud)

- Password complexity rules are still light.
- Tokens in `localStorage` are XSS-sensitive.
- Business/tenant authorization is thinner than full multi-tenant RBAC.
- Access JWT lifetime is 1 day — fine for demo; production often uses shorter access + refresh.

---

## What to say if someone asks “explain auth in this project”

> “We don’t invent a special pattern. Request hits Express routes, controller stays thin, AuthService hashes with bcrypt, creates a DB session and a JWT that includes sessionId, and authMiddleware re-checks that session on protected routes. Logout and password reset revoke sessions so stolen or old tokens stop working even before the JWT expires.”

Then point at `auth.service.ts` and `auth.middleware.ts`.

---

## Next steps after this story

1. Trace **one** happy path in the debugger or with Postman: register → verify → login → analyze → logout.
2. Read `docs/AUTHENTICATION-GUIDE.md` sections 6–8 for interview phrasing.
3. Skim unit tests under `server/tests/unit/auth/` — tests are another “story” of expected behavior.
