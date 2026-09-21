# SnapStock-AI — Design Patterns and OOP Concepts

**Document purpose:** Explain the design patterns and object-oriented programming (OOP) concepts used in the **implemented** SnapStock-AI codebase so far (mid-evaluation / Progress Review scope).

**Scope:** Only what exists in code today — authentication, detection proxy, AI inference service, and React client. Planned modules (inventory persistence, alerts API, multi-tenant business APIs) are noted only as *future* extensions where relevant.

**Project:** AI-Powered Automated Inventory and Freshness Monitoring System for Small-Scale Retailers  
**Team:** ABEYWARDANA S.M. (230011P), ANDRAHENNADI N.J. (230042K), ATHTHANAYAKE A.M.R.N (230062V)  
**PID:** 5

---

## 1. Executive Summary

SnapStock-AI is built as a **multi-tier modular system**:

| Layer | Technology | Style |
|-------|------------|--------|
| Presentation | React + TypeScript | Component-based UI + Context |
| Application API | Node.js + Express + TypeORM | Layered / modular monolith |
| AI Inference | Python + FastAPI | Microservice with pipeline orchestration |
| Persistence | PostgreSQL | Entity mapping (ORM) |

The architecture intentionally applies **separation of concerns**, **layered design**, and selected Gang of Four–style patterns so each concern (HTTP, business rules, data access, ML inference, UI state) stays replaceable without rewriting the whole system.

---

## 2. High-Level Architectural Patterns

### 2.1 Multi-Tier Architecture

**What it is:** The system is split into presentation, application, AI, and data tiers that communicate over well-defined interfaces (REST/JSON, multipart upload, SQL).

**Where it appears:**

```
Browser (React)
    │  REST / multipart
    ▼
Express API (server/)
    │  HTTP FormData
    ▼
FastAPI AI (ai-service/)
    │
Express API ──SQL──► PostgreSQL
```

**Why we use it:** UI, business logic, ML models, and storage change at different rates and need different technology stacks (TypeScript vs Python/TensorFlow).

---

### 2.2 Modular Monolith (Backend) + Microservice (AI)

**What it is:**

- **Modular monolith:** One Express process, organized into feature modules (`auth`, `detection`).
- **Microservice:** One independently deployable FastAPI process for YOLO + MobileNet.

**Where it appears:**

- `server/src/modules/auth/`
- `server/src/modules/detection/`
- `ai-service/app/`

**Why we use it:** Full microservices for every feature would be overkill for a prototype. Extracting only AI keeps Node lean while allowing heavy ML dependencies and restarts in isolation.

---

### 2.3 Layered Architecture (Backend Module Vertical Slice)

Each backend feature follows the same layers:

```
Routes  →  Controller  →  Service  →  Repository  →  Entity / DB
```

| Layer | Responsibility | Example |
|-------|----------------|---------|
| Routes | HTTP path + middleware attachment | `auth.routes.ts`, `detection.routes.ts` |
| Controller | Parse request, call service, shape JSON response | `AuthController`, `DetectionController` |
| Service | Business rules (hash password, sign JWT, proxy AI) | `AuthService`, `DetectionService` |
| Repository | Database access only | `AuthRepository` |
| Entity | Persistent domain shape | `User`, `EmailVerificationToken` |

**Why we use it:** Controllers stay free of SQL; repositories stay free of JWT/email logic; services stay free of HTTP details. This supports maintainability and unit testing boundaries.

---

## 3. Design Patterns in Implemented Code

### 3.1 Repository Pattern

**Intent:** Isolate data-access logic from business logic.

**Where:** `server/src/modules/auth/auth.repository.ts`

**How:**

- `AuthRepository.createUser()`, `findByEmail()`, `saveEmailToken()`, `updatePassword()`, etc.
- Uses TypeORM repositories internally (`AppDataSource.getRepository(User)`).
- Services call `AuthRepository`, not raw SQL.

**Benefits:**

- Auth business rules can change without rewriting persistence.
- Database technology details stay in one place.

**OOP link:** Encapsulation — callers see methods, not table columns or SQL.

---

### 3.2 Service Layer Pattern

**Intent:** Centralize application/business workflows.

**Where:**

- `server/src/modules/auth/auth.service.ts` — register, login, verify, reset
- `server/src/modules/detection/detection.service.ts` — upload proxy to AI
- `ai-service/app/analysis/service.py` — orchestrate detect + classify

**Example (auth):** `AuthService.login()` checks user existence, bcrypt compare, email verification, then JWT signing — the controller only returns JSON.

**Example (AI):** `analyze_image()` calls detection, then freshness per crop, then aggregates — routers do not contain pipeline logic.

---

### 3.3 Controller / Front Controller Style (HTTP Adapters)

**Intent:** Thin HTTP adapters that translate requests into service calls.

**Where:** `AuthController`, `DetectionController`

**How:** Controllers use `try/catch`, return `{ success, data }` or `{ success, false, message }`, and delegate to services.

**Why:** Keeps Express-specific `Request`/`Response` objects out of domain logic.

---

### 3.4 Middleware Pattern (Chain of Responsibility style)

**Intent:** Cross-cutting checks run before route handlers.

**Where:** `server/src/shared/middleware/auth.middleware.ts`

**How:**

1. Read `Authorization: Bearer <token>`
2. Verify JWT
3. Attach `req.user` or return `401`
4. Call `next()`

**Note (honest mid-eval status):** Middleware is **implemented** but **not yet applied** to `/detection/analyze`. The pattern exists; wiring is remaining work.

**Why the pattern matters:** Auth checks can be reused across future protected routes without duplicating JWT code in every controller.

---

### 3.5 DTO (Data Transfer Object) Pattern

**Intent:** Define clear shapes for data crossing API boundaries.

**Where:**

- TypeScript interfaces: `server/src/modules/auth/auth.types.ts` (`RegisterDTO`, `LoginDTO`, …)
- Pydantic models: `ai-service/app/analysis/schemas.py`, `freshness/schemas.py`, `detection/schemas.py`
- Client types: `client/src/lib/detection.ts` (`DetectionResult`)

**Why:** Validates/documents contracts between client ↔ server ↔ AI without exposing internal entities.

---

### 3.6 Facade Pattern (AI Analysis Pipeline)

**Intent:** Provide a simple entry point that hides a complex subsystem.

**Where:** `ai-service/app/analysis/` — `POST /analyze`

**How:** One call (`analyze_image`) hides:

1. YOLO detection  
2. Crop extraction  
3. Per-crop MobileNet freshness  
4. Aggregation of counts and results  

The Express `DetectionService` only needs to call `/analyze` — it does not know YOLO internals.

---

### 3.7 Gateway / Proxy Pattern (Detection Module)

**Intent:** Backend acts as a gateway between clients and the AI service.

**Where:** `DetectionService.analyze()` posts multipart data to `AI_SERVICE_URL/analyze`.

**Why:**

- Clients never call AI directly.
- Future auth, tenant checks, and scan persistence can sit in Express without changing the AI API.

---

### 3.8 Singleton / Cached Instance Pattern (Model Loading)

**Intent:** Load expensive resources once and reuse them.

**Where:**

- FastAPI lifespan in `ai-service/app/main.py` stores models on `app.state`
- `@lru_cache(maxsize=1)` on `get_detection_model()` / freshness model loaders

**Why:** YOLO and MobileNet weights are large; loading per request would make latency unacceptable.

**Related:** Thread lock in `detector.py` (`_inference_lock`) protects concurrent YOLO inference — a concurrency control pattern around the shared model instance.

---

### 3.9 Strategy-like Separation (Detection vs Freshness)

**Intent:** Keep algorithms interchangeable behind clear functions/modules.

**Where:**

- `app/detection/` — object detection strategy (YOLO)
- `app/freshness/` — classification strategy (MobileNet)
- `app/analysis/` — chooses and composes both

**Why:** Models can be replaced (different YOLO weights or classifier) without rewriting the Express client contract, as long as schemas stay stable.

*Note:* This is compositional separation today (modules/functions), not a full Strategy interface hierarchy. That is appropriate for the current size of the codebase.

---

### 3.10 Dependency Injection (Lightweight / Framework-style)

**Intent:** Pass dependencies in rather than hard-coding them inside every function.

**Where:**

- FastAPI injects uploaded files and uses `request.app.state.*` models in routes
- Analysis functions accept `detection_model` and `freshness_model` as parameters
- React Context injects auth state into the component tree (`AuthProvider`)

**Why:** Easier testing and clearer dependency graphs.

---

### 3.11 Provider / Context Pattern (React)

**Intent:** Share global client state without prop drilling.

**Where:**

- `AuthContext` / `AuthProvider` — token, user, login/register/logout
- `ThemeContext` — light/dark theme

**How:** Dashboard and auth pages call `useAuth()` instead of passing token through every component.

---

### 3.12 Protected Route / Guard Pattern

**Intent:** Block unauthorized navigation.

**Where:** `client/src/components/ProtectedRoute.tsx`

**How:** If no token in auth context → redirect to `/login`; else render nested dashboard routes via `<Outlet />`.

**Honest note:** This is **client-side** guarding. Server-side JWT enforcement on APIs is still incomplete.

---

### 3.13 Template Method–like Response Shape

**Intent:** Consistent success/error envelope.

**Where:** Controllers return:

```json
{ "success": true, "data": { ... } }
```

or

```json
{ "success": false, "message": "..." }
```

Client `apiRequest()` expects this shape uniformly.

---

### 3.14 Soft Delete Pattern (Entity Design)

**Intent:** Mark rows inactive instead of hard-deleting when auditability matters.

**Where:** TypeORM `@DeleteDateColumn()` on `User` (`deleted_at`)

**Why:** Supports future account recovery / audit without losing history.

---

## 4. OOP Concepts Used

### 4.1 Encapsulation

| Example | How |
|---------|-----|
| `AuthService` | Hides bcrypt/JWT details from controllers |
| `AuthRepository` | Hides TypeORM/SQL from services |
| `email.ts` | Hides SMTP transporter setup |
| Entities | Columns private to persistence mapping; services expose only needed fields |

---

### 4.2 Abstraction

| Example | How |
|---------|-----|
| DTO interfaces | Abstract request payloads from DB columns |
| Pydantic schemas | Abstract AI response contracts |
| `apiRequest<T>()` | Abstracts `fetch` + error handling |
| `/analyze` facade | Abstracts multi-step ML pipeline |

---

### 4.3 Classes and Objects

Used heavily on the server and AI schemas:

- Classes: `AuthService`, `AuthController`, `AuthRepository`, `User`, `DetectionService`
- Objects: TypeORM entities, Pydantic model instances (`FruitAnalysis`, `PredictionResponse`)

React is more functional/component-oriented but still uses typed objects and classless modules.

---

### 4.4 Inheritance (Limited but Present)

| Example | Concept |
|---------|---------|
| `InvalidDetectionImageError(ValueError)` | Custom exception hierarchy |
| `AuthRequest extends Request` | Extend Express request with `user` |
| Pydantic `BaseModel` subclasses | Schema inheritance from framework base |

We do **not** overuse deep inheritance trees; composition is preferred (better for this codebase size).

---

### 4.5 Composition over Inheritance

| Example | How |
|---------|-----|
| Analysis pipeline | Composes detector + predictor |
| Dashboard layout | Composes nav + `<Outlet />` pages |
| Auth module | Composes controller + service + repository |

---

### 4.6 Polymorphism (Practical Forms)

| Form | Example |
|------|---------|
| Interface-based typing | `RegisterDTO`, `LoginDTO` accepted by service methods |
| Framework polymorphism | Express handlers share `(req, res)` signature |
| Schema polymorphism | Different Pydantic response models for detect / predict / analyze |

---

### 4.7 Information Hiding / Single Responsibility (SOLID – SRP)

Each file has one job:

- Routes only wire HTTP
- Controllers only adapt HTTP
- Services only apply business rules
- Repositories only persist
- AI detector only detects; predictor only classifies

This is the **Single Responsibility Principle** in practice.

---

### 4.8 Dependency Inversion (Partial)

High-level orchestration (`analyze_image`) depends on model objects passed in, not on loading them itself. Model loaders are separate.

Full interface-based DI (injecting `IDetector`) is not required yet; FastAPI lifespan + parameters are sufficient.

---

## 5. Pattern Map by Feature (What Exists Today)

### 5.1 Authentication (Fully Implemented)

| Step | Pattern / OOP idea |
|------|--------------------|
| Register | Service Layer + Repository + Entity |
| Password storage | Encapsulation (bcrypt inside service) |
| Email verify / reset | Token entities + time expiry rules |
| Login | Service Layer + JWT issuance |
| Client session | Context Provider + localStorage |
| Dashboard access | Guard / Protected Route |
| Cross-cutting JWT check | Middleware (written; wiring pending) |

### 5.2 Scan / Detection (Partially Implemented)

| Step | Pattern / OOP idea |
|------|--------------------|
| Camera / upload UI | Component composition |
| Multipart upload | Gateway from client → Express |
| Express → AI | Proxy / Gateway |
| YOLO + MobileNet | Facade (`/analyze`) + module separation |
| Model reuse | Singleton / cached instance |
| Typed results | DTOs / Pydantic schemas |

### 5.3 Not Yet Patterned in Code (Designed Only)

These appear in architecture docs but lack full implementation:

- Domain services for inventory update transactions
- Observer / event pattern for alert generation
- Factory for multi-tenant business onboarding
- Role Strategy for OWNER vs EMPLOYEE vs ADMIN enforcement

---

## 6. Why These Patterns Fit SnapStock-AI

| Goal | Pattern choice |
|------|----------------|
| Secure accounts | Layered auth + encapsulation of hashing/tokens |
| Keep AI replaceable | Facade + separate microservice + stable schemas |
| Keep UI responsive | Context for auth/theme; thin API helper |
| Academic maintainability | Same module shape for every new feature |
| Avoid over-engineering | Modular monolith first; only AI extracted |

---

## 7. Evaluation Talking Points (Short)

**“What design patterns did you use?”**

> “We use a **layered modular backend** with **Repository** and **Service** layers, **Controllers** as HTTP adapters, **Middleware** for JWT checks, **DTOs/schemas** for API contracts, a **Gateway/Proxy** from Express to the AI service, and a **Facade** analysis pipeline that combines YOLO and MobileNet. On the client we use **React Context** and a **Protected Route guard**.”

**“What OOP concepts?”**

> “**Encapsulation** of bcrypt/JWT and database access, **abstraction** via DTOs and schemas, **classes/objects** for services and entities, **composition** of detection and freshness modules, limited **inheritance** for exceptions and request typing, and **SRP** so each layer has one responsibility.”

**“Why not more patterns?”**

> “We apply patterns where they reduce coupling. We avoid deep inheritance or many microservices because this is a prototype — modular monolith plus one AI service is enough.”

---

## 8. Suggested Diagram for Reports (Text Form)

```
┌──────────────────────────────────────────────────────────┐
│ Presentation (React)                                     │
│  Components · Context (Provider) · ProtectedRoute Guard  │
│  apiRequest() / analyzeImage()  ← Adapter helpers        │
└───────────────────────────┬──────────────────────────────┘
                            │ REST / multipart
┌───────────────────────────▼──────────────────────────────┐
│ Application (Express Modular Monolith)                   │
│  Routes → Controller → Service → Repository → Entity     │
│  Middleware (JWT) · Email Utility · Detection Gateway    │
└───────────────────────────┬──────────────────────────────┘
              │             │
              │ SQL         │ HTTP /analyze
              ▼             ▼
     ┌─────────────┐  ┌────────────────────────────────────┐
     │ PostgreSQL  │  │ AI Microservice (FastAPI)          │
     │  Entities   │  │ Facade: detect → crop → classify   │
     └─────────────┘  │ Singleton model load · Schemas     │
                      └────────────────────────────────────┘
```

---

## 9. Conclusion

For the features built so far, SnapStock-AI consistently applies:

1. **Architectural patterns:** multi-tier, modular monolith + AI microservice, layered modules  
2. **GoF / enterprise patterns:** Repository, Service Layer, Middleware, DTO, Facade, Gateway/Proxy, Singleton/cache, Provider/Context, Guard  
3. **OOP pillars:** encapsulation, abstraction, composition, limited inheritance, SRP  

These choices keep authentication and AI analysis understandable for evaluation while leaving a clear path to extend inventory, alerts, and RBAC using the **same module template**.

---

## 10. Related Documents

| Document | Path |
|----------|------|
| Mid-Evaluation Guide | `docs/MID-EVALUATION-GUIDE.md` |
| Software Architecture Document | `docs/software-architecture-document.md` |
| Design document (team draft) | `docs/design.md` |
| SRS | `docs/srs.md` |

---

*Prepared for mid-evaluation / design discussion. Reflects implemented codebase only; update when inventory, alerts, and full RBAC modules are completed.*
