## 6. Process View

### 6.1 Process / Thread Decomposition

| Process | Weight | Runtime | Communication |
|---------|--------|---------|---------------|
| Browser UI thread + Vite HMR (dev) | Lightweight | Chromium/WebKit | HTTPS to server |
| Node.js Express event loop | Lightweight | single-threaded + libuv | HTTP client/AI; TCP Postgres |
| Uvicorn / FastAPI worker(s) | Lightweight (scale-out) | Python ASGI | HTTP from server; disk model I/O |
| PostgreSQL server processes | Heavyweight | multi-process | TCP 5432 |
| pgAdmin (optional) | Lightweight | container | HTTP 5050 → Postgres |

### 6.2 Activity Diagram — Scan Pipeline

```
+======================================================================================+
|              FIGURE 11. ACTIVITY DIAGRAM — SCAN PIPELINE (DETAILED)                   |
+======================================================================================+
|                                                                                      |
|  [Start]                                                                             |
|     |                                                                                |
|     v                                                                                |
|  +------------------+                                                                |
|  | Open Scan UI     |                                                                |
|  +--------+---------+                                                                |
|           |                                                                          |
|           v                                                                          |
|     <>----+----<>                                                                    |
|    / Camera     \                                                                    |
|   /  available?  \                                                                   |
|   \              /                                                                   |
|    <>--+----<>--+                                                                    |
|     Yes|        |No                                                                  |
|        v        v                                                                    |
|  +----------+ +----------------+                                                     |
|  | Live     | | Pick from      |                                                     |
|  | capture  | | gallery/file   |                                                     |
|  +----+-----+ +--------+-------+                                                     |
|       |                |                                                             |
|       +--------+-------+                                                             |
|                v                                                                     |
|         +-------------+                                                              |
|         | Preview +   |                                                              |
|         | compress    |                                                              |
|         +------+------+                                                              |
|                |                                                                     |
|                v                                                                     |
|         <>-----+-----<>                                                              |
|        / Valid size &  \                                                             |
|       /  format?        \                                                            |
|       \                 /                                                            |
|        <>--+-------<>--+                                                             |
|         Yes|           |No                                                           |
|            v           v                                                             |
|  +--------------+  +--------------+                                                  |
|  | multipart    |  | Show error   |----> [End Fail]                                  |
|  | POST /scans  |  | (retry keep  |                                                  |
|  +------+-------+  |  preview)    |                                                  |
|         |          +--------------+                                                  |
|         v                                                                            |
|  +--------------+                                                                    |
|  | JWT + tenant |                                                                    |
|  | authorize    |                                                                    |
|  +------+-------+                                                                    |
|         |                                                                            |
|         v                                                                            |
|  <>-----+-----<>                                                                     |
| / AuthZ OK?     \                                                                    |
| \               /                                                                    |
|  <>--+-----<>--+                                                                     |
|   Yes|         |No --> 401/403 --> [End Fail]                                        |
|      v                                                                               |
| +--------------+                                                                     |
| | Persist image|                                                                     |
| | Scan=PENDING |                                                                     |
| +------+-------+                                                                     |
|        |                                                                             |
|        v                                                                             |
| +--------------+     timeout/5xx                                                     |
| | Call AI      |---------------------+                                               |
| | /analysis    |                     |                                               |
| +------+-------+                     v                                               |
|        |                      +--------------+                                       |
|        | success              | Mark FAILED  |--> [End Fail]                         |
|        v                      +--------------+                                       |
| +--------------+                                                                     |
| | Preprocess   |                                                                     |
| | YOLO detect  |                                                                     |
| | Crop boxes   |                                                                     |
| | CNN classify |                                                                     |
| | Aggregate    |                                                                     |
| +------+-------+                                                                     |
|        |                                                                             |
|        v                                                                             |
| +--------------+                                                                     |
| | TX: save     |                                                                     |
| | detections   |                                                                     |
| | update stock |                                                                     |
| | Scan=DONE    |                                                                     |
| +------+-------+                                                                     |
|        |                                                                             |
|        v                                                                             |
| +--------------+                                                                     |
| | Evaluate     |----- see Figure 12                                                |
| | alert rules  |                                                                     |
| +------+-------+                                                                     |
|        |                                                                             |
|        v                                                                             |
| +--------------+                                                                     |
| | Return JSON  |                                                                     |
| | Render UI    |                                                                     |
| +------+-------+                                                                     |
|        |                                                                             |
|        v                                                                             |
|      [End Success]                                                                   |
|                                                                                      |
+======================================================================================+
```

**Figure 11** details the scan pipeline with decision diamonds for camera availability, validation, authorization, and AI failure. Persistence of a PENDING scan before AI call enables failure visibility without corrupting inventory (COMPLETED only inside a successful transaction).

### 6.3 Activity Diagram — Alert Generation

```
+======================================================================================+
|              FIGURE 12. ACTIVITY DIAGRAM — ALERT GENERATION                           |
+======================================================================================+
|                                                                                      |
|  [Start: after inventory update for business B]                                      |
|           |                                                                          |
|           v                                                                          |
|  +------------------------+                                                          |
|  | Load products touched  |                                                          |
|  | by this scan           |                                                          |
|  +-----------+------------+                                                          |
|              |                                                                       |
|              v                                                                       |
|  +------------------------+                                                          |
|  | For each product P     |<-----------------------------------------+               |
|  +-----------+------------+                                          |               |
|              |                                                       |               |
|              v                                                       |               |
|       <>-----+-----<>                                                |               |
|      / qty < low_     \                                              |               |
|     /  stock_threshold \                                             |               |
|     \                  /                                             |               |
|      <>--+--------<>--+                                              |               |
|       Yes|            |No                                            |               |
|          v            |                                              |               |
|  +---------------+    |                                              |               |
|  | Upsert/create |    |                                              |               |
|  | LOW_STOCK     |    |                                              |               |
|  | alert WARN    |    |                                              |               |
|  +-------+-------+    |                                              |               |
|          |            |                                              |               |
|          +------+-----+                                              |               |
|                 v                                                    |               |
|          <>-----+-----<>                                             |               |
|         / freshness in  \                                            |               |
|        / {Medium,Spoiled}\                                           |               |
|        \                 /                                           |               |
|         <>--+-------<>--+                                            |               |
|          Yes|           |No                                          |               |
|             v           |                                            |               |
|  +----------------+     |                                            |               |
|  | Create SPOILAGE|     |                                            |               |
|  | alert; severity|     |                                            |               |
|  | by class       |     |                                            |               |
|  +--------+-------+     |                                            |               |
|           |             |                                            |               |
|           +------+------+                                            |               |
|                  v                                                   |               |
|           <>-----+-----<>                                            |               |
|          / more products?\ --Yes-------------------------------------+               |
|          \               /                                                           |
|           <>-----+------                                                                 |
|                  |No                                                                     |
|                  v                                                                       |
|           +----------------+                                                             |
|           | Commit / return|                                                             |
|           | alert ids      |                                                             |
|           +--------+-------+                                                             |
|                    |                                                                     |
|                    v                                                                     |
|                 [End]                                                                    |
|                                                                                      |
+======================================================================================+
```

**Figure 12** shows rule evaluation after inventory mutation. Low-stock and spoilage checks are independent per product; both may fire for the same item. Deduplication/upsert policy may suppress spam for repeated scans of an already-alerted product.

### 6.4 AI Inference Pipeline Diagram

```
+======================================================================================+
|              FIGURE 13. AI INFERENCE PIPELINE (IMAGE IN → RESPONSE)                   |
+======================================================================================+
|                                                                                      |
|  multipart image                                                                     |
|       |                                                                              |
|       v                                                                              |
|  +--------------------+                                                              |
|  | 1. PREPROCESS      |  decode JPEG/PNG | EXIF orient | resize max side | RGB       |
|  |    (Pillow/OpenCV) |  normalize as required by models                             |
|  +----------+---------+                                                              |
|             |                                                                        |
|             v                                                                        |
|  +--------------------+                                                              |
|  | 2. YOLO DETECT     |  Ultralytics YOLOv8                                          |
|  |    ObjectDetector  |  outputs: [label, conf, bbox] * N                            |
|  +----------+---------+                                                              |
|             |                                                                        |
|             v                                                                        |
|       <>---+---<>                                                                    |
|      / N == 0?  \                                                                    |
|      \          /                                                                    |
|       <>--+--<>--+                                                                   |
|        Yes|      |No                                                                 |
|           v      v                                                                   |
|  +-------------+ +------------------+                                                |
|  | Return empty| | 3. CROP each bbox|  padding margin; clamp to image                |
|  | detections[]| +--------+---------+                                                |
|  +-------------+          |                                                          |
|                           v                                                          |
|                  +------------------+                                                |
|                  | 4. CNN CLASSIFY  |  MobileNetV3 / custom CNN                      |
|                  | FreshnessCls.    |  Fresh | Medium | Spoiled + conf               |
|                  +--------+---------+                                                |
|                           |                                                          |
|                           v                                                          |
|                  +------------------+                                                |
|                  | 5. AGGREGATE     |  group by label; sum counts;                  |
|                  | AnalysisOrch.    |  majority/avg freshness; timings               |
|                  +--------+---------+                                                |
|                           |                                                          |
|                           v                                                          |
|                  +------------------+                                                |
|                  | 6. RESPONSE JSON |  model_version, items[], latency_ms            |
|                  +------------------+                                                |
|                                                                                      |
+======================================================================================+
```

**Figure 13** is the internal AI pipeline. Empty detections short-circuit classification. Aggregation produces API-stable structures consumed by `ScanService` without exposing raw tensors.

### 6.5 Sequence Diagram — Authentication (Login)

```
+======================================================================================+
|         FIGURE 14. SEQUENCE — LOGIN (INTERNAL OBJECTS, 7 LIFELINES)                   |
+======================================================================================+
|                                                                                      |
| Vendor   <<UI>>      AuthContext   api.ts    AuthController  AuthService  AuthRepo DB|
|  |     LoginPage         |           |             |              |          |     | |
|  |---open--------------->|           |             |              |          |     | |
|  |---submit cred-------->|           |             |              |          |     | |
|  |                       |--login()->|             |              |          |     | |
|  |                       |           |--POST /auth/login--------->|          |     | |
|  |                       |           |   {email,password}         |          |     | |
|  |                       |           |             |--login()---->|          |     | |
|  |                       |           |             |              |--findByEmail--->|
|  |                       |           |             |              |<---User row-----|
|  |                       |           |             |              |--bcrypt.compare |
|  |                       |           |             |              |--load membership|
|  |                       |           |             |              |--sign JWT       |
|  |                       |           |             |<--{token,user}|          |     | |
|  |                       |           |<--200 JSON--|              |          |     | |
|  |                       |<--setSession-------------|              |          |     | |
|  |                       |  localStorage            |              |          |     | |
|  |<--navigate dashboard--|           |             |              |          |     | |
|                                                                                      |
+======================================================================================+
```

**Figure 14** expands beyond “user vs system”: UI, context, HTTP client, controller, service, repository, and database all appear. Password comparison never leaves the service process.

### 6.6 Sequence Diagram — Scan End-to-End

```
+======================================================================================+
|         FIGURE 15. SEQUENCE — SCAN E2E (8 LIFELINES)                                  |
+======================================================================================+
|                                                                                      |
| Vendor  <<UI>>Scan  api.ts  ScanCtrl  ScanSvc  AiClient  Detector  Classifier  DB    |
|  |         |         |        |         |         |         |          |        |    |
|  |--capture|-------->|        |         |         |         |          |        |    |
|  |         |--compress        |         |         |         |          |        |    |
|  |         |--POST /scans---->|         |         |         |          |        |    |
|  |         |  +JWT   |        |         |         |         |          |        |    |
|  |         |         |--authZ>|         |         |         |          |        |    |
|  |         |         |        |--submit>|         |         |          |        |    |
|  |         |         |        |         |--INSERT scan PENDING------------------>|    |
|  |         |         |        |         |--analyze(image)->|         |          |    |
|  |         |         |        |         |         |--HTTP /analysis             |    |
|  |         |         |        |         |         |-------->|detect() |          |    |
|  |         |         |        |         |         |         |--boxes->|          |    |
|  |         |         |        |         |         |         |         |classify()|    |
|  |         |         |        |         |         |<--JSON aggregate--|          |    |
|  |         |         |        |         |<--result|         |         |          |    |
|  |         |         |        |         |--TX: detections+inventory+alerts------>|    |
|  |         |         |        |<--dto---|         |         |         |          |    |
|  |         |         |<--200--|         |         |         |         |          |    |
|  |         |<--JSON--|        |         |         |         |         |          |    |
|  |<--render results--|        |         |         |         |         |          |    |
|                                                                                      |
| Note: Detector & Classifier live inside ai-service; AiClient is server-side HTTP.    |
+======================================================================================+
```

**Figure 15** shows eight lifelines spanning UI through both AI model objects and the database. The server transaction commits only after a successful AI response (or marks FAILED without inventory mutation on error paths).

### 6.7 Sequence Diagram — Alert Check (Post-Scan)

```
+======================================================================================+
|         FIGURE 16. SEQUENCE — ALERT CHECK (6+ LIFELINES)                              |
+======================================================================================+
|                                                                                      |
| ScanService   InventoryRepo   AlertService   AlertRepo   ProductRepo   <<UI>>Alerts  |
|      |              |              |            |            |              |        |
|      |--getTouchedProducts()------>|            |            |              |        |
|      |<--products------------------|            |            |              |        |
|      |--evaluate(products)-------->|            |            |              |        |
|      |              |              |--read thresholds------>|              |        |
|      |              |              |--insert LOW_STOCK----->|              |        |
|      |              |              |--insert SPOILAGE------>|              |        |
|      |<--alertIds------------------|            |            |              |        |
|      |              |              |            |            |              |        |
|      |  (later user opens Alerts page)          |            |              |        |
|      |              |              |            |            |<--GET /alerts--------- |
|      |              |              |--list(tenant)--------->|              |        |
|      |              |              |<--rows-----------------|              |        |
|      |              |              |----------------JSON------------------>|        |
|                                                                                      |
+======================================================================================+
```

**Figure 16** separates alert *generation* (synchronous after scan) from alert *consumption* (later UI fetch), clarifying that alerts are persistent facts, not only ephemeral toasts.

### 6.8 Sequence Diagram — Admin Suspend Vendor

```
+======================================================================================+
|         FIGURE 17. SEQUENCE — ADMIN SUSPEND VENDOR (7 LIFELINES)                      |
+======================================================================================+
|                                                                                      |
| Admin  <<UI>>Admin  api.ts  authMw  AdminCtrl  AdminService  UserRepo/BizRepo  DB    |
|  |         |          |       |         |           |              |            |    |
|  |--suspend|--------->|       |         |           |              |            |    |
|  |         |--POST /admin/vendors/:id/suspend       |              |            |    |
|  |         |  +JWT--->|       |         |           |              |            |    |
|  |         |          |--verify JWT + SYSTEM_ADMIN->|              |            |    |
|  |         |          |       |--suspend()--------->|              |            |    |
|  |         |          |       |         |--load business/user----->|            |    |
|  |         |          |       |         |           |--UPDATE status=SUSPENDED-->|    |
|  |         |          |       |         |<--ok------|              |            |    |
|  |         |          |       |<--200---|           |              |            |    |
|  |         |<--ok-----|       |         |           |              |            |    |
|  |<--list refresh-----|       |         |           |              |            |    |
|                                                                                      |
| Later vendor login: AuthService checks Business.status / user flags -> 403.          |
+======================================================================================+
```

**Figure 17** emphasizes authorization middleware as a first-class lifeline. Suspension is a persistence update with subsequent login enforcement.

### 6.9 Security / Authorization Flow Diagram

```
+======================================================================================+
|              FIGURE 18. SECURITY / AUTHZ FLOW DIAGRAM                                 |
+======================================================================================+
|                                                                                      |
|  HTTP Request                                                                        |
|       |                                                                              |
|       v                                                                              |
|  +------------------+  missing/invalid     +------------------+                      |
|  | Extract Bearer   |--------------------->| 401 Unauthorized |--> return            |
|  | JWT              |                      +------------------+                      |
|  +--------+---------+                                                                |
|           | valid signature & exp                                                    |
|           v                                                                          |
|  +------------------+                                                                |
|  | Load User        |  deleted/missing ---> 401                                      |
|  +--------+---------+                                                                |
|           |                                                                          |
|           v                                                                          |
|  <>-------+--------<>                                                                |
| / route requires     \                                                               |
| \ SYSTEM_ADMIN?      /                                                               |
|  <>--+----------<>--+                                                                |
|   Yes|              |No (business route)                                             |
|      v              v                                                                |
| +----------+  +------------------+                                                   |
| | Check    |  | Resolve          |                                                   |
| | system_  |  | business_id via  |                                                   |
| | role     |  | business_users   |                                                   |
| +----+-----+  +--------+---------+                                                   |
|      |                 |                                                             |
|   deny|allow           v                                                             |
|      |         <>------+------<>                                                     |
|      |        / role permits  \                                                      |
|      |       / operation?      \                                                     |
|      |       \                 /                                                     |
|      |        <>--+-------<>--+                                                      |
|      |         Yes|           |No --> 403                                            |
|      v            v                                                                  |
| +-------------------------------+                                                    |
| | Attach req.user + tenant ctx  |                                                    |
| | Execute controller/service    |                                                    |
| | Repositories MUST filter by   |                                                    |
| | business_id for tenant data   |                                                    |
| +-------------------------------+                                                    |
|                                                                                      |
+======================================================================================+
```

**Figure 18** shows defense in depth: JWT validity, user existence, system-role gates for admin routes, business membership and role checks for tenant routes, and mandatory repository filters.

---
