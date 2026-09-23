# SnapStock-AI — Interview Guide: OOP, Gang of Four Patterns & Database Normalization

**Purpose:** One document to rehearse for interviews / evaluations. Every claim includes **evidence (file + code idea)**, **reason**, and a **spoken answer**. Be honest about what is GoF vs enterprise patterns, and what is implemented vs designed.

**Project:** SnapStock-AI  
**Stack:** React · Express · TypeORM · PostgreSQL · FastAPI · YOLOv8 · MobileNet

---

## How to use this in an interview

1. Start with the **one-sentence pitch** for the topic they asked.
2. Show **where in the repo** (open the file if screen-sharing).
3. Say **why** you chose it.
4. If asked “Is this Gang of Four?” — answer precisely (see Section 2).
5. End with a **limitation** if relevant (shows maturity).

---

## Quick map (say this first if they ask “do you use OOP / patterns / normalization?”)

| Topic | Honest answer |
|-------|----------------|
| **OOP** | Yes — classes, encapsulation, abstraction, composition, limited inheritance |
| **Gang of Four** | Some — Facade, Proxy, Singleton-style model cache; Chain-of-Responsibility-style middleware |
| **Enterprise patterns** | Yes — Repository, Service Layer, DTO, layered modules (not GoF, but important) |
| **DB normalization** | Yes — current schema is roughly **3NF** (users, businesses, memberships, tokens) |

---

# Part A — OOP Concepts

## A1. Classes and Objects

### What it is
A **class** is a blueprint; an **object** (or class used as a namespace of behavior) groups data and operations.

### Evidence
- `server/src/modules/auth/auth.service.ts` → `export class AuthService`
- `server/src/modules/auth/auth.repository.ts` → `export class AuthRepository`
- `server/src/entities/User.ts` → `@Entity("users") export class User`
- `server/src/modules/detection/detection.service.ts` → `export class DetectionService`

### Reason
Groups related behavior (login rules, DB access, persistence shape) so the codebase stays navigable as features grow.

### Interview answer
> “Our backend uses TypeScript classes for services, repositories, controllers, and TypeORM entities. For example, `AuthService` owns login/register workflows and `User` maps to the `users` table.”

### What to open
`auth.service.ts` → show `login()` method.

---

## A2. Encapsulation

### What it is
Hide internal details; expose only what callers need.

### Evidence
**Password hashing is not in the controller** — only in the service:

```ts
// auth.service.ts (register)
const password_hash = await bcrypt.hash(data.password, 10);
const user = await AuthRepository.createUser({ ...data, password_hash });
```

**SQL/TypeORM is not in the service** — only in the repository:

```ts
// auth.repository.ts
return AppDataSource.getRepository(User).findOne({ where: { email }, ... });
```

**SMTP details** are inside `server/src/shared/utils/email.ts`, not scattered in controllers.

### Reason
If we change hash cost, JWT claims, or DB queries, we change one place — not every HTTP handler.

### Interview answer
> “Encapsulation is why controllers don’t call bcrypt or SQL. Controllers adapt HTTP; services hold business rules; repositories talk to PostgreSQL. That keeps secrets and persistence details hidden behind clear APIs.”

### Limitation (honest)
Some services use `static` methods rather than injected instances — still encapsulation of *logic location*, not full DI.

---

## A3. Abstraction

### What it is
Work with simplified interfaces instead of low-level details.

### Evidence

**DTOs** — `server/src/modules/auth/auth.types.ts`:

```ts
export interface RegisterDTO {
  full_name: string;
  email: string;
  password: string;
  ...
}
```

**AI response schemas** — `ai-service/app/analysis/schemas.py` (`FruitAnalysis`, `AnalysisResponse`).

**Client API helper** — `client/src/lib/api.ts` `apiRequest<T>()` hides `fetch`, status checks, and error parsing.

### Reason
Client, Express, and AI can evolve internals as long as contracts stay stable.

### Interview answer
> “We abstract payloads with DTOs and Pydantic models, and abstract HTTP with `apiRequest`. The UI doesn’t need to know TypeORM or YOLO internals—only the JSON contract.”

---

## A4. Inheritance (limited)

### What it is
A type extends another type / base class.

### Evidence
```ts
// auth.middleware.ts
export interface AuthRequest extends Request {
  user?: any;
}
```

```python
# ai-service/app/common/exceptions.py
class InvalidDetectionImageError(ValueError):
    ...
```

Pydantic models subclass `BaseModel`.

### Reason
Reuse framework types (`Request`, `BaseModel`, `ValueError`) without rewriting them.

### Interview answer
> “We use inheritance sparingly—mainly to extend Express `Request` for JWT payload and for custom exceptions. We prefer composition for business features.”

### Why “sparingly” is a good answer
Deep inheritance trees become brittle; composition is easier to change in a prototype.

---

## A5. Composition

### What it is
Build complex behavior by combining smaller parts.

### Evidence

**AI pipeline composition** — `ai-service/app/analysis/service.py`:

```python
detection_result = detect_fruits(...)
prediction = predict_crop(freshness_model, fruit.crop)
```

**Backend module composition:** Routes → Controller → Service → Repository.

**React:** `AuthProvider` wraps the app; pages compose layout + forms + hooks.

### Reason
Detection and freshness can change independently; analysis only orchestrates them.

### Interview answer
> “Our `/analyze` path composes YOLO detection and MobileNet freshness. That’s composition over inheritance—we don’t subclass a giant ‘VisionModel’ class.”

---

## A6. Polymorphism (practical)

### What it is
Same interface, different concrete behavior/data shapes.

### Evidence
- Controllers share the Express handler signature `(req, res)`.
- Different DTOs (`LoginDTO` vs `RegisterDTO`) passed into service methods.
- Different Pydantic response models for `/detect`, `/predict`, `/analyze`.

### Interview answer
> “We don’t use heavy interface hierarchies, but we do use polymorphic contracts—shared HTTP handler shapes and typed DTOs/schemas for different operations.”

---

## A7. Single Responsibility Principle (SOLID – SRP)

### Evidence by layer

| File | Responsibility |
|------|----------------|
| `auth.routes.ts` | Map URLs to handlers |
| `auth.controller.ts` | HTTP in/out |
| `auth.service.ts` | Business rules |
| `auth.repository.ts` | Persistence |
| `User.ts` | Entity mapping |

### Interview answer
> “Each auth file has one job. If login validation changes, I open the service—not the repository or route file.”

---

# Part B — Gang of Four Design Patterns

## Important disclaimer (say this if they ask “which GoF patterns?”)

> “We use a few Gang of Four patterns where they fit—**Facade**, **Proxy**, and a **Singleton-like** shared model instance. We also use enterprise patterns like **Repository** and **Service Layer**, which are not part of the original GoF 23. I won’t claim Factory/Observer/Adapter unless we actually implemented them.”

---

## B1. Facade (GoF — Structural) ✅ Strong

### Intent
Provide a simple interface to a complex subsystem.

### Evidence
**Entry:** `POST /analyze` → `ai-service/app/analysis/routes.py` → `analyze_image()` in `analysis/service.py`.

The caller (Express) only posts an image and gets JSON. Internally:

1. YOLO detect  
2. Crop each box  
3. MobileNet freshness per crop  
4. Aggregate counts  

```python
# analysis/service.py
detection_result = detect_fruits(...)
prediction = predict_crop(freshness_model, fruit.crop)
return AnalysisResponse(total_count=..., counts=..., detections=...)
```

### Reason
Express and React should not know crop padding, YOLO thresholds, or TensorFlow preprocessing.

### Interview answer
> “`/analyze` is a Facade. One endpoint hides a multi-step vision pipeline. That keeps the Node gateway simple and lets us swap model internals without changing the client contract.”

### Show in interview
Open `analysis/service.py` and walk the loop over detections.

---

## B2. Proxy / Gateway (GoF — Structural) ✅ Strong

### Intent
A surrogate controls access to another object/service.

### Evidence
`server/src/modules/detection/detection.service.ts`:

```ts
const response = await axios.post(
  `${process.env.AI_SERVICE_URL}/analyze`,
  formData,
  { headers: { ...formData.getHeaders() } }
);
return response.data;
```

Client → Express → AI. Client never calls port 8000 directly.

### Reason
- Central place for future auth, logging, persistence, rate limits  
- AI stays private / not browser-exposed  
- Matches security architecture (trusted boundary = Express)

### Interview answer
> “DetectionService is a Proxy/Gateway to the AI microservice. The browser only talks to Express. That protects the AI service and lets us add scan persistence later without changing the React upload code much.”

### Related (not GoF name but say it)
This is also an **API Gateway-style** boundary for one capability (AI).

---

## B3. Singleton / Shared Instance (GoF — Creational) ✅ Reasonable

### Intent
Ensure a costly resource has one shared instance.

### Evidence
- `ai-service/app/main.py` lifespan loads models into `app.state.detection_model` / `freshness_model`
- `get_detection_model()` uses `@lru_cache(maxsize=1)` in `detection/model_loader.py`
- Thread lock `_inference_lock` in `detector.py` around YOLO predict

### Reason
Loading YOLO/MobileNet every request would destroy latency and memory.

### Interview answer
> “We load ML models once at startup and cache the loader with `lru_cache`. That’s a Singleton-style shared instance for expensive resources—not a textbook lazy singleton class, but the same intent.”

### Honest nuance
Prefer saying **“Singleton-style / cached shared instance”** rather than “classic GoF Singleton with private constructor.”

---

## B4. Chain of Responsibility (GoF — Behavioral) ⚠️ Partial

### Intent
Pass a request along a chain of handlers until one handles it.

### Evidence
`server/src/shared/middleware/auth.middleware.ts`:

```ts
// verify JWT → attach req.user → next()
// or return 401
```

Express middleware pipeline is Chain of Responsibility-style.

### Honest status
Middleware is **implemented** but **not yet applied** to `/detection/analyze`. Mention that if asked about security completeness.

### Interview answer
> “JWT auth middleware is Chain of Responsibility-style: validate token, then call `next()`, or stop with 401. We’ve written it; wiring it onto all protected routes is remaining work.”

---

## B5. Strategy (GoF — Behavioral) ⚠️ Informal / weak claim

### Evidence
Separate modules:
- `app/detection/` (YOLO)
- `app/freshness/` (MobileNet)

### Interview answer (careful)
> “Detection and freshness are separated so we can replace either algorithm. It’s Strategy-*like* modular separation; we didn’t define a formal Strategy interface hierarchy yet.”

**Do not** claim a full Strategy pattern with interchangeable strategy objects unless you show that interface.

---

## B6. Template Method (GoF — Behavioral) ⚠️ Informal

### Evidence
Controllers share the same structure:

```ts
try {
  const result = await SomeService.method(...);
  return res.status(200).json({ success: true, data: result });
} catch (error: any) {
  return res.status(400).json({ success: false, message: error.message });
}
```

### Interview answer
> “Controllers follow a repeated response template—success envelope vs error envelope—so the React client can handle APIs uniformly.”

---

# Part C — Enterprise Patterns (Not GoF — but interview gold)

## C1. Repository Pattern ✅

### Evidence
`AuthRepository` methods: `createUser`, `findByEmail`, `saveEmailToken`, `updatePassword`, …

### Reason
Services stay free of TypeORM details.

### Interview answer
> “Repository isolates persistence. `AuthService.login` asks `AuthRepository.findByEmail`—it doesn’t write SQL.”

---

## C2. Service Layer ✅

### Evidence
`AuthService.register/login/...`, `DetectionService.analyze`, `analyze_image` in Python.

### Reason
Business workflows live in one place (verify email before JWT, hash before save, etc.).

---

## C3. DTO ✅

### Evidence
`auth.types.ts` interfaces; Pydantic models; client `DetectionResult` type.

### Reason
Stable contracts across process boundaries.

---

## C4. Layered / Modular Monolith + Microservice ✅

### Evidence
```
server/src/modules/auth/
server/src/modules/detection/
ai-service/   ← separate process
```

### Interview answer
> “Express is a modular monolith—feature modules in one deployable API. AI is a microservice because Python/ML doesn’t belong inside Node.”

---

## C5. Provider / Context (React) ✅

### Evidence
`client/src/context/AuthContext.tsx` — `AuthProvider`, `useAuth()`.

### Interview answer
> “Auth state is provided via React Context so dashboard pages don’t prop-drill the JWT.”

---

## C6. Guard / Protected Route ✅

### Evidence
`client/src/components/ProtectedRoute.tsx` — redirect to `/login` if not authenticated.

### Honest note
Client-side only; server must also enforce JWT on APIs.

---

# Part D — Database Normalization

## D1. What normalization means (10-second version)

> “Normalization reduces redundancy and update anomalies by structuring tables so each fact is stored once, with relationships via keys.”

We target roughly **3NF** for implemented / migrated tables.

---

## D2. First Normal Form (1NF)

### Rule
Atomic columns; no repeating groups.

### Evidence
`users` columns are single values (`email`, `full_name`, `password_hash`) — not a list of businesses inside one user row.

**Migration:** `server/migrations/001_create_users_table.ts`

### Interview answer
> “Each attribute holds one value. We don’t store multiple shop names in one column.”

---

## D3. Second Normal Form (2NF)

### Rule
No partial dependency on a composite key.

### Evidence
`business_users` has composite PK `(business_id, user_id)` and stores `role` that depends on **both** keys (membership), not on user alone or business alone.

User profile fields stay in `users`; business fields stay in `businesses`.

**Migration:** `server/migrations/003_create_business_users_table.ts`

```sql
PRIMARY KEY (business_id, user_id),
FOREIGN KEY (business_id) REFERENCES businesses(id),
FOREIGN KEY (user_id) REFERENCES users(id)
```

### Interview answer
> “Membership is an association table. Role belongs to the user–business pair. User names aren’t duplicated into every membership row.”

---

## D4. Third Normal Form (3NF)

### Rule
Non-key attributes depend only on the key — not transitively through another non-key.

### Evidence
- Business address lives in `businesses`, not copied into `users`
- Verification tokens live in `email_verification_tokens` with `user_id` FK — not many token columns on `users`
- Password reset tokens similarly separated

**Migrations:**
- `002_create_businesses_table.ts`
- `006_create_email_verification_tokens_table.ts`
- `008_create_password_reset_tokens_table.ts`

### Interview answer
> “We separate entities that change independently. Token expiry isn’t a user attribute repeated for every token history—it’s its own table keyed by user.”

---

## D5. Integrity mechanisms that support normalization

| Mechanism | Evidence | Why |
|-----------|----------|-----|
| Primary keys | UUID PKs | Unique identity |
| Foreign keys | `business_users`, tokens, invitations | Referential integrity |
| Unique constraints | `users.email`, invitation token, `(business_name, address)` | Prevent duplicate facts |
| Enums | `OWNER`/`EMPLOYEE`, invitation status | Controlled domains |
| Indexes | FKs and tokens indexed | Performance without denormalizing |

---

## D6. ER sketch (for whiteboard)

```
users 1───< business_users >───1 businesses
  │
  ├──< email_verification_tokens
  ├──< password_reset_tokens
  └──< employee_invitations (also FK → businesses)
```

### Interview answer
> “Many-to-many between users and businesses is resolved with `business_users`. That’s classic normalized multi-tenant membership.”

---

## D7. What is NOT fully in DB yet (say if asked)

Designed / UI-mocked but **not** fully migrated as first-class tables yet:

- `scans`, `detections`, `shelves`, `inventory`, `alerts`

So: **normalization applies strongly to auth + business schema we created**; inventory domain is next.

---

## D8. Possible future denormalization (advanced point)

Bounding boxes may be stored as JSONB for practicality. That is a **controlled denormalization** for nested geometry—not a failure of 3NF on core relational entities.

---

# Part E — End-to-End Story (combine all three)

Use this when they say: “Walk me through how a feature shows OOP, patterns, and DB design.”

### Example: Login

1. **React** `AuthContext.login` → `apiRequest('/auth/login')` — abstraction + Context  
2. **Route** → **Controller** → **Service** — layered OOP / SRP  
3. **Service** uses bcrypt + JWT — encapsulation  
4. **Repository** loads `User` entity — Repository pattern + ORM mapping  
5. **DB** `users` table with unique email — normalized identity store  
6. Token returned; **ProtectedRoute** guards dashboard — Guard pattern  

### Example: Shelf scan

1. Client uploads image  
2. **DetectionController/Service** — OOP layers + **Proxy** to AI  
3. AI **Facade** `/analyze` composes detect + freshness — Facade + composition  
4. Models loaded once — Singleton-style  
5. (Future) persist detections in normalized `scans` / `detections` tables  

---

# Part F — Questions they might ask + model answers

### “Is Repository a Gang of Four pattern?”
> “No. Repository is an enterprise/DDD data-access pattern. GoF focuses on 23 classic patterns. We use both.”

### “Why not put SQL in the service?”
> “That breaks SRP and encapsulation. Services would mix business rules with persistence and become hard to test.”

### “Why separate AI as a microservice?”
> “Different stack (Python/TF/YOLO), heavy CPU, independent deploy/restart. Express stays the trusted boundary—that’s also why DetectionService is a Proxy.”

### “Are you in 3NF?”
> “For users, businesses, memberships, and tokens—yes, toward 3NF. Inventory/scan tables are designed but not fully implemented yet.”

### “Show me inheritance.”
> Open `AuthRequest extends Request` and exception classes. Then say we prefer composition for features.

### “What’s one pattern you want to add next?”
> “Apply auth middleware (Chain of Responsibility) on all protected routes, and persist scan results into normalized detection tables.”

---

# Part G — Files to keep bookmarked for screen share

| Topic | File |
|-------|------|
| Encapsulation / Service | `server/src/modules/auth/auth.service.ts` |
| Repository | `server/src/modules/auth/auth.repository.ts` |
| Entity / OOP mapping | `server/src/entities/User.ts` |
| DTO | `server/src/modules/auth/auth.types.ts` |
| Middleware / CoR | `server/src/shared/middleware/auth.middleware.ts` |
| Proxy | `server/src/modules/detection/detection.service.ts` |
| Facade | `ai-service/app/analysis/service.py` |
| Singleton-style | `ai-service/app/main.py`, `detection/model_loader.py` |
| Context | `client/src/context/AuthContext.tsx` |
| Guard | `client/src/components/ProtectedRoute.tsx` |
| 3NF membership | `server/migrations/003_create_business_users_table.ts` |
| Token separation | `server/migrations/006_create_email_verification_tokens_table.ts` |

---

# Part H — One-minute closing pitch

> “SnapStock-AI uses OOP to structure the Express auth and detection modules—classes, encapsulation, and composition. For design patterns, the strongest GoF examples are the AI **Facade** (`/analyze`) and the Express **Proxy** to the AI service, plus a **shared model instance** for YOLO/MobileNet. Alongside that we use enterprise patterns like **Repository** and **Service Layer**. Our PostgreSQL schema for users, businesses, memberships, and tokens is normalized toward **3NF** with foreign keys and association tables. We’re honest about gaps—JWT middleware wiring and full scan persistence are next—but the foundations are already visible in code.”

---

## Related docs

- `docs/DESIGN-PATTERNS-AND-OOP.md` — broader pattern catalog  
- `docs/MID-EVALUATION-GUIDE.md` — what’s built vs remaining  
- `docs/software-architecture-document.md` — full architecture  

---

*Keep this file updated when inventory/scan tables and JWT wiring land—add new evidence instead of claiming unfinished work.*
