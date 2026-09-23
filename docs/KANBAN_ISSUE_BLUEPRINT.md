# SnapStock AI - GitHub Project Backlog Blueprint

Use this file as a source-of-truth backlog to seed GitHub Issues, Milestones, and your Kanban board.

## How to Use With GitHub Copilot

1. Open this file in GitHub.
2. Ask Copilot Chat:
   - `Create milestones from the Milestones section.`
   - `Create labels from the Labels section.`
   - `Create one issue per item in the Epics and Sprint Backlog sections, preserving title, body, labels, and dependencies.`
   - `Add issue links and parent-child references in issue bodies.`
3. Add all created issues to your GitHub Project board.
4. Map status using the workflow in the `Kanban Workflow` section.

---

## Project Context

**Project Title:** AI-Powered Automated Inventory and Freshness Monitoring System for Small-Scale Retailers

**Current Repository Structure**
- `client/`: React + Vite + TypeScript frontend
- `server/`: Express + TypeScript + PostgreSQL API
- `ai-service/`: Python AI microservice
- `server/migrations/`: schema and data migrations

**In-Scope Product Goals**
- Mobile/web camera-based scan flow
- Inventory counting
- Freshness classification (`Fresh`, `Medium`, `Spoiled`)
- Multi-tenant business support
- Dashboard with alerts and analytics

**Out-of-Scope (for now)**
- IoT sensor/smart scale integration
- External supply-chain procurement automation
- Full accounting/tax modules

---

## Kanban Workflow

Use these columns:
1. `Backlog`
2. `Ready`
3. `In Progress`
4. `In Review`
5. `Blocked`
6. `Done`

### Definition of Done (DoD)
- Code merged to default branch
- Basic tests/manual validation completed
- No critical lint/runtime errors
- Docs updated if behavior changed
- Issue acceptance criteria checked

---

## Labels (Create First)

### Type
- `type:feature`
- `type:bug`
- `type:chore`
- `type:docs`
- `type:research`
- `type:test`

### Area
- `area:client`
- `area:server`
- `area:ai-service`
- `area:database`
- `area:devops`
- `area:security`
- `area:analytics`

### Priority
- `priority:P0`
- `priority:P1`
- `priority:P2`
- `priority:P3`

### Status/Meta
- `blocked`
- `good first issue`
- `needs decision`
- `tech debt`

---

## Milestones

1. `M1 - Foundation and Auth` (2 weeks)
2. `M2 - Inventory Scan Pipeline` (2 weeks)
3. `M3 - Freshness AI Integration` (2 weeks)
4. `M4 - Alerts, Analytics, and Hardening` (2 weeks)
5. `M5 - Final Demo and Documentation` (1 week)

---

## Epics

> Create these as issues with prefix `[EPIC]`.

### [EPIC] Multi-tenant authentication and user onboarding
**Goal:** secure signup/login, business association, and role-based access.
**Labels:** `type:feature`, `area:server`, `area:client`, `priority:P0`
**Milestone:** `M1 - Foundation and Auth`

### [EPIC] Inventory capture and product detection pipeline
**Goal:** capture images and generate item counts from scans.
**Labels:** `type:feature`, `area:ai-service`, `area:server`, `area:client`, `priority:P0`
**Milestone:** `M2 - Inventory Scan Pipeline`

### [EPIC] Freshness scoring and spoilage risk detection
**Goal:** classify produce freshness and track quality over time.
**Labels:** `type:feature`, `area:ai-service`, `area:analytics`, `priority:P0`
**Milestone:** `M3 - Freshness AI Integration`

### [EPIC] Dashboard alerts and insights
**Goal:** surface low-stock/spoilage alerts and trend analytics.
**Labels:** `type:feature`, `area:client`, `area:server`, `area:analytics`, `priority:P1`
**Milestone:** `M4 - Alerts, Analytics, and Hardening`

### [EPIC] Production readiness and final defense package
**Goal:** improve reliability, docs, and demo readiness.
**Labels:** `type:chore`, `area:devops`, `area:docs`, `priority:P1`
**Milestone:** `M5 - Final Demo and Documentation`

---

## Sprint Backlog (Issue Templates)

Copy each issue block into GitHub Issues.

---

### [M1] Implement signup API validation with Zod
**Labels:** `type:feature`, `area:server`, `priority:P0`
**Milestone:** `M1 - Foundation and Auth`
**Parent Epic:** `[EPIC] Multi-tenant authentication and user onboarding`
**Estimate:** 3 points

**Description**
Add request validation for register/login endpoints using Zod and return consistent error payloads.

**Acceptance Criteria**
- Register payload validates required fields.
- Clear message for invalid email/password formats.
- Controller returns standardized error response.
- Invalid payload test cases documented.

**Tasks**
- [ ] Create schemas in auth module.
- [ ] Plug schema validation into controller/service boundary.
- [ ] Add validation error mapper.
- [ ] Add minimal tests/manual curl cases.

---

### [M1] Connect client Signup page to `/auth/register`
**Labels:** `type:feature`, `area:client`, `area:server`, `priority:P0`
**Milestone:** `M1 - Foundation and Auth`
**Parent Epic:** `[EPIC] Multi-tenant authentication and user onboarding`
**Estimate:** 5 points
**Depends on:** `Implement signup API validation with Zod`

**Description**
Replace placeholder signup behavior with real API call and success/error UX.

**Acceptance Criteria**
- Signup form submits via API.
- Loading and error states shown.
- Success route/message implemented.
- Form field names align with backend DTO.

**Tasks**
- [ ] Add API helper in client.
- [ ] Implement controlled form state.
- [ ] Handle API success/error.
- [ ] Add basic client-side validation.

---

### [M1] Resolve user schema mismatch (`date_of_birth` optional vs DB not null)
**Labels:** `type:bug`, `area:database`, `area:server`, `priority:P0`
**Milestone:** `M1 - Foundation and Auth`
**Parent Epic:** `[EPIC] Multi-tenant authentication and user onboarding`
**Estimate:** 2 points

**Description**
Align database migration, DTO typing, and frontend form so registration cannot fail due to schema mismatch.

**Acceptance Criteria**
- Single agreed contract for `date_of_birth`.
- Migration and DTO consistency verified.
- Signup path works end-to-end.

**Tasks**
- [ ] Decide nullable vs required.
- [ ] Update migration strategy safely.
- [ ] Update DTO and frontend field behavior.

---

### [M1] Implement login client flow and token persistence
**Labels:** `type:feature`, `area:client`, `area:server`, `priority:P0`
**Milestone:** `M1 - Foundation and Auth`
**Parent Epic:** `[EPIC] Multi-tenant authentication and user onboarding`
**Estimate:** 5 points
**Depends on:** `Connect client Signup page to /auth/register`

**Description**
Wire login form to API, store JWT securely (localStorage/session strategy), and protect private routes.

**Acceptance Criteria**
- Login calls `/auth/login`.
- Auth token stored and reused for protected calls.
- Unauthenticated users redirected from dashboard pages.
- Logout clears auth state.

---

### [M1] Implement email verification UX flow
**Labels:** `type:feature`, `area:client`, `area:server`, `priority:P1`
**Milestone:** `M1 - Foundation and Auth`
**Parent Epic:** `[EPIC] Multi-tenant authentication and user onboarding`
**Estimate:** 3 points

**Description**
Support verify-email landing behavior and clear user messaging for expired/invalid tokens.

**Acceptance Criteria**
- Verify endpoint responses mapped to user-friendly UI.
- "Resend verification" path planned or implemented.
- Login blocked for unverified users with actionable messaging.

---

### [M1] Create business and business_user records at onboarding
**Labels:** `type:feature`, `area:server`, `area:database`, `priority:P1`
**Milestone:** `M1 - Foundation and Auth`
**Parent Epic:** `[EPIC] Multi-tenant authentication and user onboarding`
**Estimate:** 5 points

**Description**
On registration, create default business profile and OWNER relationship.

**Acceptance Criteria**
- New user has associated business record.
- Entry exists in `business_users` with `OWNER` role.
- Transaction rollback on partial failure.

---

### [M2] Design scan upload API contract (`image + metadata`)
**Labels:** `type:feature`, `area:server`, `area:ai-service`, `priority:P0`
**Milestone:** `M2 - Inventory Scan Pipeline`
**Parent Epic:** `[EPIC] Inventory capture and product detection pipeline`
**Estimate:** 3 points

**Description**
Define payloads and response shape for scan requests/results used by client and AI service.

**Acceptance Criteria**
- OpenAPI-style markdown contract documented.
- Request/response examples included.
- Error codes for invalid image and model failure defined.

---

### [M2] Implement image upload handling in server
**Labels:** `type:feature`, `area:server`, `priority:P0`
**Milestone:** `M2 - Inventory Scan Pipeline`
**Parent Epic:** `[EPIC] Inventory capture and product detection pipeline`
**Estimate:** 5 points
**Depends on:** `Design scan upload API contract (image + metadata)`

**Description**
Accept image uploads, validate type/size, and forward to AI service.

**Acceptance Criteria**
- API endpoint accepts multipart image uploads.
- Invalid formats rejected cleanly.
- Request tracing ID included in logs.

---

### [M2] Build client scan capture screen (camera/file input)
**Labels:** `type:feature`, `area:client`, `priority:P0`
**Milestone:** `M2 - Inventory Scan Pipeline`
**Parent Epic:** `[EPIC] Inventory capture and product detection pipeline`
**Estimate:** 5 points

**Description**
Add UI for taking/selecting produce images and submitting scans.

**Acceptance Criteria**
- User can select/take image.
- Preview shown before submit.
- Upload progress and failure states shown.

---

### [M2] Persist scan results and inventory snapshots
**Labels:** `type:feature`, `area:database`, `area:server`, `priority:P0`
**Milestone:** `M2 - Inventory Scan Pipeline`
**Parent Epic:** `[EPIC] Inventory capture and product detection pipeline`
**Estimate:** 8 points

**Description**
Add schema for scans and per-item detections, then store each processed result.

**Acceptance Criteria**
- New migrations for scans + detections tables.
- Each scan linked to business/user and timestamp.
- Inventory snapshot query available.

---

### [M3] Baseline freshness classifier training notebook
**Labels:** `type:research`, `area:ai-service`, `priority:P0`
**Milestone:** `M3 - Freshness AI Integration`
**Parent Epic:** `[EPIC] Freshness scoring and spoilage risk detection`
**Estimate:** 8 points

**Description**
Train baseline model on selected public dataset and document metrics.

**Acceptance Criteria**
- Dataset split strategy documented.
- Precision/Recall/F1 reported.
- Confusion matrix saved.

---

### [M3] Expose AI inference endpoint in `ai-service`
**Labels:** `type:feature`, `area:ai-service`, `priority:P0`
**Milestone:** `M3 - Freshness AI Integration`
**Parent Epic:** `[EPIC] Freshness scoring and spoilage risk detection`
**Estimate:** 5 points
**Depends on:** `Baseline freshness classifier training notebook`

**Description**
Serve model inference endpoint that returns class and confidence.

**Acceptance Criteria**
- Endpoint accepts image input.
- Returns standardized freshness class + confidence.
- Handles invalid inputs/timeouts.

---

### [M3] Integrate AI freshness endpoint with server scan pipeline
**Labels:** `type:feature`, `area:server`, `area:ai-service`, `priority:P0`
**Milestone:** `M3 - Freshness AI Integration`
**Parent Epic:** `[EPIC] Freshness scoring and spoilage risk detection`
**Estimate:** 5 points
**Depends on:** `Expose AI inference endpoint in ai-service`

**Description**
Server should call AI microservice during scan processing and store freshness outputs.

**Acceptance Criteria**
- Server retries/fails gracefully on AI errors.
- Freshness result persisted in DB.
- Client receives enriched scan response.

---

### [M4] Implement alerts engine (low stock + near spoilage)
**Labels:** `type:feature`, `area:analytics`, `area:server`, `priority:P1`
**Milestone:** `M4 - Alerts, Analytics, and Hardening`
**Parent Epic:** `[EPIC] Dashboard alerts and insights`
**Estimate:** 8 points

**Description**
Generate alerts from inventory levels and freshness trend rules.

**Acceptance Criteria**
- Threshold-based low-stock alerts.
- Freshness deterioration alert logic.
- Alerts query endpoint with filters.

---

### [M4] Build dashboard cards/charts for inventory and freshness trends
**Labels:** `type:feature`, `area:client`, `area:analytics`, `priority:P1`
**Milestone:** `M4 - Alerts, Analytics, and Hardening`
**Parent Epic:** `[EPIC] Dashboard alerts and insights`
**Estimate:** 8 points
**Depends on:** `Implement alerts engine (low stock + near spoilage)`

**Description**
Display trend summaries and actionable insight panels.

**Acceptance Criteria**
- Key metrics load from API.
- Alerts list integrated in dashboard.
- Empty/loading/error states handled.

---

### [M4] Security hardening pass (auth middleware, secrets, CORS)
**Labels:** `type:chore`, `area:security`, `area:server`, `priority:P1`
**Milestone:** `M4 - Alerts, Analytics, and Hardening`
**Parent Epic:** `[EPIC] Dashboard alerts and insights`
**Estimate:** 3 points

**Description**
Harden auth and API security defaults suitable for demo/prototype.

**Acceptance Criteria**
- Protected routes require JWT middleware.
- Production-safe CORS configuration strategy documented.
- Secrets no longer logged/exposed.

---

### [M5] End-to-end demo script and sample dataset scenario
**Labels:** `type:docs`, `area:docs`, `priority:P1`
**Milestone:** `M5 - Final Demo and Documentation`
**Parent Epic:** `[EPIC] Production readiness and final defense package`
**Estimate:** 3 points

**Description**
Create a reproducible demo flow: signup -> scan -> freshness -> alert -> dashboard.

**Acceptance Criteria**
- Script includes exact setup steps.
- Demo data and expected outcomes provided.
- Time-boxed 5-10 minute run-through validated.

---

### [M5] Technical report package (architecture, metrics, limitations, future work)
**Labels:** `type:docs`, `area:docs`, `area:ai-service`, `priority:P1`
**Milestone:** `M5 - Final Demo and Documentation`
**Parent Epic:** `[EPIC] Production readiness and final defense package`
**Estimate:** 5 points

**Description**
Prepare final academic/technical deliverable with architecture diagrams and model evaluation.

**Acceptance Criteria**
- Includes precision/recall and model assumptions.
- Includes scope boundaries and risk discussion.
- Includes future enhancement roadmap.

---

## Optional Automation Prompts for Copilot

Use these one by one in GitHub Copilot Chat:

1. `Read KANBAN_ISSUE_BLUEPRINT.md and create all labels listed under Labels.`
2. `Create milestones with due dates at 2-week intervals starting next Monday.`
3. `Create all [EPIC] issues first, then create Sprint Backlog issues and link each to its Parent Epic in issue body.`
4. `Add checklist items from each issue body as task lists.`
5. `Assign priority labels and add every issue to the GitHub Project board in Backlog column.`

---

## Suggested First 7 Issues To Start This Week

1. `[M1] Implement signup API validation with Zod`
2. `[M1] Resolve user schema mismatch (date_of_birth optional vs DB not null)`
3. `[M1] Connect client Signup page to /auth/register`
4. `[M1] Implement login client flow and token persistence`
5. `[M1] Create business and business_user records at onboarding`
6. `[M2] Design scan upload API contract (image + metadata)`
7. `[M2] Implement image upload handling in server`

