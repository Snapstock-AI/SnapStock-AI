# SnapStock-AI
## Software Architecture Document

**Document Identifier:** SAD-SNAPSTOCK-AI-1.1  
**Version:** 1.1  
**Date:** 25 July 2026  
**Status:** Progress Review 1 Submission Draft  

**Project Title:** AI-Powered Automated Inventory and Freshness Monitoring System for Small-Scale Retailers  

**Prepared by:**

| Name | Index No. |
|------|-----------|
| ABEYWARDANA S.M. | 230011P |
| ANDRAHENNADI N.J. | 230042K |
| ATHTHANAYAKE A.M.R.N | 230062V |

**Mentor:** Mr. Kavinda Rajapaksha  
**PID:** 5  

**Organization:** University of Moratuwa — Undergraduate Project  

---

## Revision History

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 25 Jul 2026 | 1.0 | Initial architecture document with ASCII diagrams | SnapStock-AI Team |
| 25 Jul 2026 | 1.1 | Comprehensive RUP SAD rewrite: expanded definitions, full use-case realizations, detailed 4+1 views, class/sequence/activity/deployment/data diagrams, quality scenarios, IEEE references | SnapStock-AI Team |

**Diagram Tool Note:** All diagrams in this document are produced as **ASCII art** for version control friendliness and print clarity. Future revisions may regenerate equivalent figures using **draw.io** or **PlantUML** while preserving the same semantics. Font guidance for tool-based redraws: black text, ≥12 pt, white fill, compact layout, “in line with text” placement with captions of the form `Figure N. <caption>`.

---

## Table of Contents

1. [Introduction](#1-introduction)  
   1.1 [Purpose](#11-purpose)  
   1.2 [Scope](#12-scope)  
   1.3 [Definitions, Acronyms, and Abbreviations](#13-definitions-acronyms-and-abbreviations)  
   1.4 [References](#14-references)  
   1.5 [Overview](#15-overview)  
2. [Architectural Representation](#2-architectural-representation)  
3. [Architectural Goals and Constraints](#3-architectural-goals-and-constraints)  
4. [Use-Case View](#4-use-case-view)  
5. [Logical View](#5-logical-view)  
6. [Process View](#6-process-view)  
7. [Deployment View](#7-deployment-view)  
8. [Implementation View](#8-implementation-view)  
9. [Data View](#9-data-view)  
10. [Size and Performance](#10-size-and-performance)  
11. [Quality](#11-quality)  
12. [References (IEEE Style)](#12-references-ieee-style)  

---

## 1. Introduction

### 1.1 Purpose

This Software Architecture Document (SAD) provides a comprehensive architectural overview of **SnapStock-AI**, using multiple architectural views to depict different aspects of the system. It captures and conveys the significant architectural decisions that have been made — including microservice separation of the AI inference pipeline, multi-tenant data isolation by `business_id`, JWT-based authentication with role-based access control (OWNER / EMPLOYEE / ADMIN), and a Docker Compose–based local runtime for PostgreSQL and pgAdmin.

The SAD sits between the Software Requirements Specification (SRS) and detailed design/implementation artifacts. It is intended to:

- Guide developers when implementing modules, APIs, and persistence boundaries.  
- Inform testers about integration points, failure modes, and performance-sensitive paths.  
- Support supervisors and evaluators during Progress Review 1 (August 2026) design walkthroughs.  
- Provide DevOps-oriented node, port, and container mapping for local and production topologies.  

**Intended audiences and expected usage:**

| Audience | Expected usage of this SAD |
|----------|----------------------------|
| Client / Server / AI developers | Module boundaries, class responsibilities, forbidden dependencies |
| Testers / QA | Use-case realizations, sequence paths, error postconditions |
| Mentor / Evaluators | Architectural rationale, ADR tables, quality scenarios |
| DevOps / Demo operators | Deployment diagrams, ports, volumes, health endpoints |
| Future maintainers | Layer rules, data model, tenant isolation strategy |

### 1.2 Scope

This document applies to the **complete SnapStock-AI system** as an academic prototype SaaS platform for small-scale retailers managing perishable produce (fruits and vegetables). It covers the following deployable and logical units:

| Unit | Path / Identity | Technology |
|------|-----------------|------------|
| Web / mobile client | `client/` | React 19, TypeScript, Vite, Tailwind CSS, React Router |
| REST API backend | `server/` | Node.js, Express, TypeORM, PostgreSQL, JWT, Zod, Helmet |
| AI microservice | `ai-service/` | Python 3, FastAPI, YOLOv8 (detection), MobileNetV3/CNN (freshness) |
| Relational database | Docker service `postgres` | PostgreSQL 16 |
| DB admin UI | Docker service `pgadmin` | pgAdmin 4 |

**In architectural scope:**

- Multi-tenant registration, authentication, and password reset.  
- Camera / gallery capture, scan submission, AI detection and freshness classification.  
- Inventory views, alerts, analytics, employee invitation, vendor administration.  
- Local Docker Compose deployment and a target production topology.  
- Persistent data model, indexing, tenant isolation, and image storage strategy.  

**Out of architectural scope (explicitly deferred):**

- Physical IoT sensors, smart scales, or edge GPU appliances.  
- Automatic procurement, supply-chain ERP integration, or accounting/tax modules.  
- Certified food-safety inspection or legal compliance tooling.  
- Production-grade multi-region HA, auto-scaling Kubernetes, or paid commercial ML APIs.  

This SAD covers architecture through the final prototype submission (**03 October 2026**). Implementation maturity may lag the architecture in earlier sprints; where APIs are planned but not yet coded, the document states the intended design.

### 1.3 Definitions, Acronyms, and Abbreviations

The following glossary defines terms required to interpret this SAD. Terms are listed alphabetically.

| Term / Acronym | Definition |
|----------------|------------|
| **4+1 View Model** | Philippe Kruchten’s architectural description method comprising Logical, Process, Development (Implementation), Physical (Deployment), and Scenarios (Use-Case) views. |
| **ADR** | Architecture Decision Record — a short table or note capturing a significant decision, alternatives, and rationale. |
| **AI Service** | The FastAPI microservice (`ai-service/`) that hosts YOLOv8 detection and MobileNetV3/CNN freshness models. |
| **Alert** | A persisted notification for low stock, spoilage, or related threshold breach, scoped by `business_id`. |
| **API** | Application Programming Interface — here, primarily HTTP/JSON REST endpoints. |
| **Bounding Box** | Axis-aligned rectangle `(x1, y1, x2, y2)` returned by the detector for a product instance. |
| **Business** | A tenant organization (retail shop) stored in `businesses`; primary isolation key is `business_id`. |
| **Business User** | A `users` row with `system_role = BUSINESS_USER`, linked to a business via `business_users`. |
| **CNN** | Convolutional Neural Network used for image classification (freshness). |
| **Confidence Score** | Floating-point value in `[0.0, 1.0]` indicating model certainty for a detection or class. |
| **Container** | An isolated runtime unit (e.g., Docker image instance) hosting a process and its dependencies. |
| **C4 Model** | Context, Containers, Components, Code — a hierarchical software architecture notation; used here in ASCII form for Context and Container levels. |
| **Detection** | A single AI-identified product instance or aggregated label group from a scan, stored in `detections`. |
| **DFD** | Data Flow Diagram — process-oriented view of data movement (Level 0 context, Level 1 decomposition). |
| **EMPLOYEE** | Business-scoped role with operational access but without ownership privileges (e.g., may not delete business). |
| **Express** | Node.js web framework used by `server/` for routing, middleware, and REST handlers. |
| **FastAPI** | Python ASGI web framework used by `ai-service/` for inference HTTP APIs. |
| **Freshness Score** | Classification label: `Fresh`, `Medium`, or `Spoiled`, optionally with confidence. |
| **Inference** | Executing a trained ML model on new input (an uploaded produce image) to produce predictions. |
| **JWT** | JSON Web Token (RFC 7519) used for stateless authentication between client and server. |
| **mAP** | Mean Average Precision — detection quality metric (target mAP@0.5 ≥ 0.70 on validation). |
| **Microservice** | Independently deployable service with its own process, API, and lifecycle (here: AI service). |
| **MobileNetV3** | Lightweight CNN architecture selected for freshness classification latency on CPU. |
| **Multi-tenancy** | SaaS pattern where multiple businesses share one application instance with logical data isolation. |
| **OWNER** | Business-scoped role created at registration; may invite employees and manage business settings. |
| **ORM** | Object-Relational Mapping — TypeORM maps TypeScript entities to PostgreSQL tables. |
| **pgAdmin** | Web UI for PostgreSQL administration, exposed locally on port 5050. |
| **PostgreSQL** | Relational database engine storing users, tenants, inventory, scans, detections, and alerts. |
| **RBAC** | Role-Based Access Control — authorization by system role (ADMIN) and business role (OWNER/EMPLOYEE). |
| **REST** | Representational State Transfer — resource-oriented HTTP API style. |
| **RUP** | Rational Unified Process — process framework providing the SAD template structure followed herein. |
| **SaaS** | Software as a Service — multi-tenant hosted application model. |
| **SAD** | Software Architecture Document (this document). |
| **Scan** | One image-capture submission session that produces detections, inventory updates, and optional alerts. |
| **SRS** | Software Requirements Specification — external behavior and NFR source for this architecture. |
| **SYSTEM_ADMIN / ADMIN** | Platform administrator with cross-tenant management capabilities (vendor suspend, analytics). |
| **Tenant** | Synonym for an isolated business account identified by `business_id`. |
| **TypeORM** | TypeScript ORM used in `server/` for entities, repositories, and migrations. |
| **Vendor** | End-user retailer (OWNER or EMPLOYEE) operating a produce business on the platform. |
| **Vite** | Frontend build tool and dev server for the React client (default port 5173). |
| **YOLO / YOLOv8** | “You Only Look Once” real-time object detector (Ultralytics YOLOv8) used for produce detection and counting. |
| **Zod** | TypeScript schema validation library used on Express request bodies and query parameters. |

### 1.4 References

The following documents and standards are referenced by this SAD. Full IEEE-style bibliographic entries appear in [Section 12](#12-references-ieee-style). Short forms used inline:

| Short Ref | Document / Source |
|-----------|-------------------|
| [SRS] | SnapStock-AI Software Requirements Specification v1.0 |
| [FEAS] | SnapStock-AI Feasibility Report |
| [PROP] | SnapStock-AI Project Proposal |
| [PMP] | SnapStock-AI Project Management Plan |
| [RUP-SAD] | RUP Software Architecture Document Template (course PDF) |
| [KRUCHTEN] | P. Kruchten, “The 4+1 View Model of Architecture,” *IEEE Software*, 1995 |
| [IEEE830] | IEEE Std 830-1998, Recommended Practice for Software Requirements Specifications |
| [YOLODOC] | Ultralytics YOLOv8 Documentation |
| [FASTAPI] | FastAPI Documentation |
| [PGDOC] | PostgreSQL 16 Documentation |

**Diagram tools used:** ASCII art (primary). Planned alternatives: draw.io, PlantUML.

### 1.5 Overview

The remainder of this document is organized as follows:

- **Section 2** explains how architecture is represented using the 4+1 model plus Data and Implementation elaborations, and presents a system-level overview diagram.  
- **Section 3** states architectural goals, constraints, and ADR-style decision tables.  
- **Section 4** presents the Use-Case View: a detailed use-case diagram and full realizations for ten architecturally significant use cases.  
- **Section 5** presents the Logical View: subsystems, packages, a full class diagram, and class descriptions.  
- **Section 6** presents the Process View: activity diagrams (scan pipeline, alert generation) and multi-lifeline sequence diagrams.  
- **Section 7** presents the Deployment View for local Docker and production, including ports and volumes.  
- **Section 8** presents the Implementation View: layers, package tree, component dependencies, and forbidden edges.  
- **Section 9** presents the Data View: ER diagram, table schemas, indexing, tenant isolation, and image storage.  
- **Section 10** discusses size and performance.  
- **Section 11** presents quality attribute scenarios and architectural mechanisms.  
- **Section 12** lists references in IEEE style.  

---

## 2. Architectural Representation

### 2.1 What “Architecture” Means for SnapStock-AI

For SnapStock-AI, software architecture is the set of **structurally significant elements** (client SPA, Express API, FastAPI AI service, PostgreSQL), their **externally visible properties** (REST contracts, JWT claims, inference latency), and the **relationships** among them (who may call whom, how tenants are isolated, where models live). Architecture excludes fine-grained UI pixel layout and individual training hyperparameter experiments, except where they constrain deployable shape (e.g., model size, CPU-only inference).

### 2.2 Views Used (RUP 4+1 Extended)

SnapStock-AI adopts Kruchten’s **4+1 View Model** [KRUCHTEN], extended with an explicit **Data View** (optional in RUP but essential for multi-tenant SaaS) and a detailed **Implementation View** (Development view).

```
+======================================================================================+
|                    FIGURE 1. ARCHITECTURAL VIEWS OVERVIEW (4+1 + DATA)                |
+======================================================================================+
|                                                                                      |
|                          +----------------------------------+                        |
|                          |     USE-CASE VIEW (Scenarios)    |                        |
|                          |  Register, Login, Scan, Alerts,  |                        |
|                          |  Inventory, Analytics, Admin...  |                        |
|                          +----------------+-----------------+                        |
|                                           |                                          |
|            drives / validates             |                                          |
|      +------------------------------------+------------------------------------+     |
|      |                    |                    |                    |          |     |
|      v                    v                    v                    v          v     |
| +-----------+      +-------------+      +-------------+      +----------+ +-------+ |
| | LOGICAL   |      | PROCESS     |      | DEPLOYMENT  |      | IMPLEMENT| | DATA  | |
| | VIEW      |      | VIEW        |      | VIEW        |      | VIEW     | | VIEW  | |
| |-----------|      |-------------|      |-------------|      |----------| |-------| |
| | Subsys,   |      | Threads,    |      | Nodes,      |      | Layers,  | | ER,   | |
| | packages, |      | activities, |      | containers, |      | packages,| | tables| |
| | classes   |      | sequences   |      | ports, nets |      | deps     | | indexes| |
| +-----------+      +-------------+      +-------------+      +----------+ +-------+ |
|                                                                                      |
|  Legend: Scenarios are the "+1" that stitch the other views into end-to-end stories. |
+======================================================================================+
```

**Figure 1** shows that use-case scenarios are the integrating “+1” view. Each other view answers a different stakeholder question: *what is the structure?* (Logical), *how does it run and communicate?* (Process), *where does it run?* (Deployment), *how is source organized?* (Implementation), and *how is data shaped and isolated?* (Data).

### 2.3 Model Elements per View

| View | Primary model elements | Diagram types in this SAD |
|------|------------------------|---------------------------|
| Use-Case | Actors, use cases, associations, include/extend | Use-case diagram; realization tables |
| Logical | Subsystems, packages, classes, associations | Layered architecture; package; class |
| Process | Processes, threads, messages, activities | Activity; sequence (6–8 lifelines) |
| Deployment | Nodes, containers, artifacts, communication paths | Local Docker; production |
| Implementation | Layers, components, source packages | Package tree; dependency; forbidden edges |
| Data | Tables, keys, indexes, storage artifacts | ER; DFD L0/L1; tenant isolation flow |

### 2.4 System Context Diagram (C4 Level 1)

```
+======================================================================================+
|                         FIGURE 2. SYSTEM CONTEXT DIAGRAM                              |
+======================================================================================+
|                                                                                      |
|   +------------------+                                          +------------------+ |
|   | <<actor>>        |                                          | <<actor>>        | |
|   | Vendor           |                                          | System Admin     | |
|   | (OWNER/EMPLOYEE) |                                          | (ADMIN)          | |
|   +--------+---------+                                          +--------+---------+ |
|            |                                                             |           |
|            | HTTPS                                                       | HTTPS     |
|            | (browser SPA)                                               |           |
|            v                                                             v           |
|   +------------------------------------------------------------------------+         |
|   |                                                                        |         |
|   |                     SNAPSTOCK-AI SYSTEM                                |         |
|   |                                                                        |         |
|   |   Responsibilities:                                                    |         |
|   |   - Authenticate users; isolate tenants by business_id                 |         |
|   |   - Accept produce images; run detection + freshness inference         |         |
|   |   - Maintain inventory, alerts, analytics dashboards                   |         |
|   |   - Allow admin vendor management and platform analytics               |         |
|   |                                                                        |         |
|   +----+---------------------------+-----------------------------+---------+         |
|        |                           |                             |                   |
|        | SMTP (optional)           | S3 API (optional)           | Model files       |
|        v                           v                             v                   |
|   +------------+            +----------------+            +------------------+       |
|   | Email      |            | Object Storage |            | Training         |       |
|   | Provider   |            | (images)       |            | Datasets         |       |
|   | (SMTP)     |            | local/S3       |            | (Kaggle offline) |       |
|   +------------+            +----------------+            +------------------+       |
|                                                                                      |
+======================================================================================+
```

**Figure 2** places SnapStock-AI in its operational environment. Human actors interact only through HTTPS browsers. External systems include an optional SMTP provider for verification/reset emails, optional object storage for scan images, and offline training datasets that do not participate in runtime request paths.

### 2.5 Container Diagram (C4 Level 2)

```
+======================================================================================+
|                      FIGURE 3. CONTAINER / C4-STYLE DIAGRAM                           |
+======================================================================================+
|                                                                                      |
|  [Vendor/Admin Browser]                                                              |
|           |                                                                          |
|           | :5173 (dev) / :443 (prod)  HTTPS  JSON + multipart                       |
|           v                                                                          |
|  +----------------------------------+                                                |
|  | <<container>> client             |  React SPA (Vite/TS)                           |
|  | Port: 5173 (dev) / static nginx  |  Pages, AuthContext, api.ts                    |
|  +----------------+-----------------+                                                |
|                   |                                                                  |
|                   | REST /auth, /scans, /inventory, /alerts, /admin                  |
|                   | Authorization: Bearer <JWT>                                      |
|                   v                                                                  |
|  +----------------------------------+         +----------------------------------+   |
|  | <<container>> server             |         | <<container>> ai-service         |   |
|  | Express + TypeORM                |-------->| FastAPI + Uvicorn                |   |
|  | Port: 5000                       |  HTTP   | Port: 8000                       |   |
|  | Modules: auth, scan, inventory,  | /analysis,/detection,/predict              |   |
|  | alerts, analytics, admin         |         | YOLOv8 + MobileNetV3/CNN         |   |
|  +----------------+-----------------+         +----------------+-----------------+   |
|                   |                                            |                     |
|                   | TCP 5432                                   | read-only model     |
|                   v                                            v  weights on disk    |
|  +----------------------------------+         +----------------------------------+   |
|  | <<container>> postgres           |         | <<artifact>> model volumes       |   |
|  | PostgreSQL 16                    |         | yolov8*.pt, mobilenet*.pth       |   |
|  | Port: 5432                       |         +----------------------------------+   |
|  | Volume: postgres-data            |                                                |
|  +----------------+-----------------+                                                |
|                   |                                                                  |
|                   | (admin UI only)                                                  |
|                   v                                                                  |
|  +----------------------------------+                                                |
|  | <<container>> pgadmin            |  Port: 5050 -> 80                              |
|  | Volume: pgadmin-data             |                                                |
|  +----------------------------------+                                                |
|                                                                                      |
|  Rule: client MUST NOT call ai-service directly. AI MUST NOT open DB connections.    |
+======================================================================================+
```

**Figure 3** shows the four primary runtime containers plus pgAdmin. The Express server is the sole orchestrator that talks to both PostgreSQL and the AI service. This preserves authentication, tenant scoping, and transactional inventory updates in one trusted boundary.

### 2.6 Logical Layered Architecture Snapshot

```
+======================================================================================+
|                   FIGURE 4. LOGICAL LAYERED ARCHITECTURE (SNAPSHOT)                   |
+======================================================================================+
|                                                                                      |
|  +------------------------------------------------------------------------+          |
|  | L1 PRESENTATION                                                        |          |
|  |  React pages | components | AuthContext | ThemeContext | api client    |          |
|  +------------------------------------+-----------------------------------+          |
|                                       | HTTPS REST                                   |
|  +------------------------------------v-----------------------------------+          |
|  | L2 APPLICATION (Express)                                               |          |
|  |  Controllers | Services | Repositories | JWT middleware | Zod | Helmet |          |
|  +---------------+----------------------------------+---------------------+          |
|                  |                                  |                                |
|                  | HTTP inference                   | SQL / TypeORM                  |
|  +---------------v---------------+   +--------------v------------------+             |
|  | L3a AI INFERENCE              |   | L3b PERSISTENCE                 |             |
|  |  detection | freshness |      |   |  PostgreSQL + migrations        |             |
|  |  analysis pipelines           |   |  entities / indexes             |             |
|  +-------------------------------+   +---------------------------------+             |
|                                                                                      |
+======================================================================================+
```

**Figure 4** summarizes layering: presentation never reaches persistence or models directly; the application layer enforces security and orchestration; AI and data are sibling infrastructure layers under server control. Detailed package and class elaboration appears in Sections 5 and 8.

---

## 3. Architectural Goals and Constraints

### 3.1 Architectural Goals

| ID | Goal | Rationale | Measure of success |
|----|------|-----------|--------------------|
| AG-01 | **Modularity** | Three developers work in parallel on client, server, and AI | Independent folders; stable REST contracts |
| AG-02 | **Scalability of inference** | AI is CPU-heavy and must scale separately from CRUD API | AI deployable as separate container/workers |
| AG-03 | **Multi-tenant security** | Retailers must not see each other’s stock or scans | All tenant queries filtered by `business_id` from JWT context |
| AG-04 | **Maintainability** | Academic timeline + handover | TypeScript typing, migrations, clear layer rules |
| AG-05 | **Performance (scan path)** | Retailers expect near-interactive feedback | p95 AI inference < 5 s; upload of compressed image < 3 s avg |
| AG-06 | **Portability / demoability** | Reviews and demos on laptops | `docker compose up` for Postgres + pgAdmin |
| AG-07 | **Observability (basic)** | Diagnose scan failures | `/health` on server and AI; request logging with timing |
| AG-08 | **Correctability of AI** | Models err on real shop photos | Manual correction use case persists overrides |

### 3.2 Constraints

| ID | Constraint | Source | Architectural impact |
|----|------------|--------|----------------------|
| AC-01 | 14-week academic timeline (01 Jul – 03 Oct 2026) | PMP | Prototype quality; defer HA/Kubernetes |
| AC-02 | Open-source stack only | FEAS / budget | No commercial ERP or paid vision APIs |
| AC-03 | Public datasets (Fruit-360, Kaggle fresh/rotten) | PROP | Accuracy ceiling; need correction UX |
| AC-04 | No dedicated end-user GPU | SRS | Server-side inference only |
| AC-05 | Team of three | PROP | Align modules to people; minimize cross-cutting refactors |
| AC-06 | Internet required for cloud demo; local Docker for offline DB | SRS | Dual deployment topologies |
| AC-07 | YOLOv8 AGPL-3.0 license awareness | Legal | Document license; academic use |
| AC-08 | Browser camera capability assumed | SRS | `getUserMedia` + file capture fallback |
| AC-09 | PostgreSQL as system of record | Stack decision | Relational schema; TypeORM migrations |
| AC-10 | JWT auth; roles OWNER/EMPLOYEE/ADMIN | SRS | Middleware + claim/role checks |

### 3.3 Key Architectural Decisions (ADR-Style Tables)

#### ADR-001: Microservice AI Separation

| Field | Content |
|-------|---------|
| **Status** | Accepted |
| **Context** | Detection and freshness need Python ML stacks (PyTorch/Ultralytics) incompatible with Node.js runtime. |
| **Alternatives** | (A) Monolith embedding Python via child process; (B) Pure Node ONNX; (C) Separate FastAPI microservice |
| **Decision** | **(C) Separate FastAPI AI microservice** |
| **Consequences** | Independent scaling and model redeploy; extra network hop; need timeout/error contracts; AI remains DB-less |

#### ADR-002: PostgreSQL Multi-Tenant Shared Schema

| Field | Content |
|-------|---------|
| **Status** | Accepted |
| **Context** | Need isolation for many small shops with low ops overhead. |
| **Alternatives** | (A) DB-per-tenant; (B) Schema-per-tenant; (C) Shared schema + `business_id` column |
| **Decision** | **(C) Shared schema with `business_id` on tenant tables** |
| **Consequences** | Simple migrations; mandatory query filters; risk of missing `WHERE` clauses mitigated by repository conventions |

#### ADR-003: JWT Stateless Authentication

| Field | Content |
|-------|---------|
| **Status** | Accepted |
| **Context** | SPA + future mobile; horizontal API instances. |
| **Alternatives** | (A) Server sessions + Redis; (B) JWT access tokens; (C) OAuth-only third party |
| **Decision** | **(B) JWT** (bcrypt password hashes; email verification gate) |
| **Consequences** | Stateless scale-out; logout is client-side discard (+ optional denylist later); claim design must include `user_id` / role |

#### ADR-004: Detection = YOLOv8; Freshness = MobileNetV3/CNN

| Field | Content |
|-------|---------|
| **Status** | Accepted |
| **Context** | Need real-time counting and 3-class freshness on CPU. |
| **Alternatives** | Custom detector from scratch; ResNet50 freshness; cloud Vision API |
| **Decision** | **YOLOv8 + MobileNetV3/CNN** trained on public datasets |
| **Consequences** | Pipeline: detect → crop → classify → aggregate; model weight packaging required |

#### ADR-005: Client Never Calls AI Directly

| Field | Content |
|-------|---------|
| **Status** | Accepted |
| **Context** | Prevent API-key leakage, enforce authz, keep transactions consistent. |
| **Decision** | **All inference proxied through Express `server`** |
| **Consequences** | Single trust boundary; AI can stay on private network in production |

#### ADR-006: Docker Compose for Data Plane Locally

| Field | Content |
|-------|---------|
| **Status** | Accepted |
| **Context** | Reproducible Postgres for all teammates. |
| **Decision** | **Compose services: `postgres` + `pgadmin`; app processes run on host in dev** |
| **Consequences** | Ports 5432/5050; volumes `postgres-data`, `pgadmin-data`; apps use `.env` |

### 3.4 Goals–Constraints Traceability Summary

```
+======================================================================================+
|                    FIGURE 5. GOALS vs CONSTRAINTS INTERACTION                         |
+======================================================================================+
|                                                                                      |
|   AG-02 Scalability -------- conflicts with -----> AC-01 Timeline (limit HA)         |
|   AG-05 Performance -------- constrained by -----> AC-04 No user GPU                 |
|   AG-03 Tenant security ---- reinforced by ------> AC-10 JWT + roles                 |
|   AG-06 Portability -------- enabled by ---------> ADR-006 Docker Compose            |
|   AG-08 AI correctability -- mitigates ----------> AC-03 Dataset limits              |
|                                                                                      |
+======================================================================================+
```

**Figure 5** highlights tensions the architecture consciously accepts: performance and accuracy goals are bounded by academic constraints, while security and portability are actively reinforced by chosen ADRs.

---

## 4. Use-Case View

This section lists architecturally significant use cases and provides full realizations (diagrams and scenarios). Unlike the SRS (which omits use-case diagrams per course instruction), the SAD **includes** use-case diagrams and stepwise realizations as required by the RUP SAD template [RUP-SAD].

### 4.1 Actors

| Actor | Description |
|-------|-------------|
| **Vendor (OWNER)** | Business owner; registers business; invites employees; full business data access. |
| **Vendor (EMPLOYEE)** | Invited staff; can scan, view inventory/alerts; limited admin of business. |
| **System Administrator (ADMIN)** | Platform operator; manage vendors; view cross-tenant analytics. |
| **Email System** (supporting) | Delivers verification and password-reset messages. |
| **AI Service** (supporting) | Externalized inference collaborator (system-of-systems boundary inside SnapStock). |

### 4.2 Detailed Use-Case Diagram

```
+======================================================================================+
|                         FIGURE 6. DETAILED USE-CASE DIAGRAM                           |
+======================================================================================+
|                                                                                      |
|                              <<system>> SnapStock-AI                                 |
|  +-----------------------------------------------------------------------------+     |
|  |                                                                             |     |
|  |   +-------------------+     +-------------------+     +------------------+  |     |
|  |   | UC-01 Register    |     | UC-02 Login       |     | UC-10 Password   |  |     |
|  |   | Business Account  |     |                   |     | Reset            |  |     |
|  |   +---------+---------+     +---------+---------+     +--------+---------+  |     |
|  |             ^                         ^                        ^            |     |
|  |             |                         |                        |            |     |
|  |   +---------+-------------------------+------------------------+----+       |     |
|  |   |                                                                 |       |     |
|  |   |  +-------------------+   +-------------------+                  |       |     |
|  |   |  | UC-03 Capture &   |   | UC-04 View        |                  |       |     |
|  |   |  | Scan Produce      |   | Inventory         |                  |       |     |
|  |   |  +---------+---------+   +---------+---------+                  |       |     |
|  |   |            | <<include>>           ^                            |       |     |
|  |   |            v                       |                            |       |     |
|  |   |  +-------------------+             | uses results               |       |     |
|  |   |  | (AI Detection &   |-------------+                            |       |     |
|  |   |  |  Freshness)       |                                          |       |     |
|  |   |  +-------------------+                                          |       |     |
|  |   |            |                                                    |       |     |
|  |   |            | may generate                                       |       |     |
|  |   |            v                                                    |       |     |
|  |   |  +-------------------+   +-------------------+                  |       |     |
|  |   |  | UC-05 View Alerts |   | UC-06 Correct     |                  |       |     |
|  |   |  |                   |   | Prediction        |                  |       |     |
|  |   |  +-------------------+   +-------------------+                  |       |     |
|  |   |                                                                 |       |     |
|  |   |  +-------------------+   +-------------------+                  |       |     |
|  |   |  | UC-09 Invite      |   | UC-08 View        |                  |       |     |
|  |   |  | Employee          |   | Analytics         |                  |       |     |
|  |   |  +-------------------+   +-------------------+                  |       |     |
|  |   |                                                                 |       |     |
|  |   |  +-------------------+   +-------------------+                  |       |     |
|  |   |  | UC-07 Manage      |   | (Platform         |                  |       |     |
|  |   |  | Vendors (Admin)   |   |  Analytics Admin) |                  |       |     |
|  |   |  +-------------------+   +-------------------+                  |       |     |
|  |   |                                                                             |     |
|  +---|-----------------------------------------------------------------------------+     |
|      |             |                    |                                              |
|      |             |                    |                                              |
|  +---+----+   +----+-----+        +-----+------+                                       |
|  | Vendor |   | Vendor   |        | System     |                                       |
|  | OWNER  |   | EMPLOYEE |        | Admin      |                                       |
|  +--------+   +----------+        +------------+                                       |
|                                                                                      |
|  Associations (summary):                                                             |
|  - OWNER: UC-01,02,03,04,05,06,08,09,10                                              |
|  - EMPLOYEE: UC-02,03,04,05,06,08,10 (invite typically OWNER-only)                   |
|  - ADMIN: UC-02,07,08 (platform),10                                                  |
|                                                                                      |
+======================================================================================+
```

**Figure 6** enumerates the ten primary use cases and actor associations. Capture & Scan includes an internal AI collaboration; alerts are a side effect of successful scans when thresholds fire. Admin manage-vendors is exclusive to SYSTEM_ADMIN.

### 4.3 Use-Case Realizations

#### UC-01: Register Business Account

| Field | Content |
|-------|---------|
| **Use case name** | UC-01 Register Business Account |
| **Actors** | Vendor (prospective OWNER); Email System (supporting) |
| **Description** | A new retailer creates a user account and associated business tenant, becoming OWNER of that business. |
| **Preconditions** | Email not already registered; client can reach API; SMTP configured if verification required. |
| **Main flow** | 1. Actor opens Signup page. 2. Enters full name, email, password, business name, address, contact number. 3. Client validates locally and `POST /auth/register`. 4. `AuthController` validates with Zod. 5. `AuthService` hashes password (bcrypt). 6. In a DB transaction: insert `users`, `businesses`, `business_users(role=OWNER)`. 7. Create email verification token; send email. 8. Return 201 with pending-verification status. |
| **Successful end / postcondition** | User and business exist; OWNER link created; verification email sent; user not yet granted dashboard until verified. |
| **Fail end / postcondition** | 400 validation or 409 conflict; no orphan business without user (transaction rollback). |
| **Extensions** | 4a. Duplicate email → 409. 7a. SMTP failure → account created but resend-verification offered. |

#### UC-02: Login

| Field | Content |
|-------|---------|
| **Use case name** | UC-02 Login |
| **Actors** | Vendor (OWNER/EMPLOYEE) or System Admin |
| **Description** | Authenticated access issuing a JWT for subsequent API calls. |
| **Preconditions** | Account exists; password known. |
| **Main flow** | 1. Open Login. 2. Submit email/password. 3. `POST /auth/login`. 4. Repository loads user by email. 5. bcrypt compare. 6. Optionally check `email_verified`. 7. Resolve business membership / system role. 8. Sign JWT; return token + profile. 9. Client stores JWT in `localStorage`; AuthContext updates; redirect dashboard/admin. |
| **Successful end / postcondition** | Valid JWT held by client; protected routes accessible. |
| **Fail end / postcondition** | 401 invalid credentials; 403 unverified; no token issued. |
| **Extensions** | 6a. Unverified → prompt resend verification. 4a. Soft-deleted user → treat as invalid. |

#### UC-03: Capture and Scan Produce

| Field | Content |
|-------|---------|
| **Use case name** | UC-03 Capture and Scan Produce |
| **Actors** | Vendor (OWNER or EMPLOYEE); AI Service (supporting) |
| **Description** | Capture or select a produce image; run detection and freshness; update inventory; possibly generate alerts. |
| **Preconditions** | Authenticated; `business_id` resolvable; camera or gallery available; AI service healthy. |
| **Main flow** | 1. Open Scan page. 2. Capture via camera or pick file. 3. Preview; client compresses image. 4. `POST /scans` multipart with JWT. 5. Middleware authenticates; resolves tenant. 6. Server stores image (local/S3); creates `scans` row `PENDING`. 7. Server `POST` image to AI `/analysis`. 8. AI preprocess → YOLO → crops → CNN → aggregate JSON. 9. Server writes `detections`; updates `products` quantities/freshness; sets scan `COMPLETED`. 10. Alert rules evaluated. 11. Client shows results. |
| **Successful end / postcondition** | Scan COMPLETED; detections persisted; inventory updated; alerts created if needed. |
| **Fail end / postcondition** | Scan FAILED or error response; inventory unchanged (transactional rollback or compensating mark). |
| **Extensions** | 3a. File > 10 MB → reject. 7a. AI timeout → FAILED + retry. 8a. Zero detections → empty result with guidance. |

#### UC-04: View Inventory

| Field | Content |
|-------|---------|
| **Use case name** | UC-04 View Inventory |
| **Actors** | Vendor (OWNER/EMPLOYEE) |
| **Description** | Display current stock levels, freshness summary, and last scan time per product for the tenant. |
| **Preconditions** | Authenticated; membership in a business. |
| **Main flow** | 1. Open Inventory page. 2. `GET /inventory?business_id=...` (or inferred from JWT). 3. Service queries products scoped by tenant. 4. UI renders table with search/filter. 5. Optional manual quantity adjust `PATCH /products/:id`. |
| **Successful end / postcondition** | Accurate tenant-scoped inventory displayed. |
| **Fail end / postcondition** | Error toast; no cross-tenant leakage. |
| **Extensions** | 5a. Adjust below zero → validation error. |

#### UC-05: View Alerts

| Field | Content |
|-------|---------|
| **Use case name** | UC-05 View Alerts |
| **Actors** | Vendor (OWNER/EMPLOYEE) |
| **Description** | List low-stock and spoilage alerts; mark as read. |
| **Preconditions** | Authenticated; tenant context known. |
| **Main flow** | 1. Open Alerts. 2. `GET /alerts`. 3. Filter by severity/date. 4. `PATCH /alerts/:id/read`. |
| **Successful end / postcondition** | Alerts listed; read flags updated. |
| **Fail end / postcondition** | Empty state or error; no data from other tenants. |
| **Extensions** | 2a. No alerts → empty illustration. |

#### UC-06: Correct Prediction

| Field | Content |
|-------|---------|
| **Use case name** | UC-06 Correct Prediction |
| **Actors** | Vendor (OWNER/EMPLOYEE) |
| **Description** | Override an incorrect label, count, or freshness on a detection for audit and future training. |
| **Preconditions** | Authenticated; scan/detection belongs to user’s business. |
| **Main flow** | 1. Open scan detail. 2. Select detection. 3. Submit correction payload. 4. Server validates ownership. 5. Persist correction fields / audit row. 6. Optionally recompute inventory aggregates. |
| **Successful end / postcondition** | Corrected values stored; UI reflects override. |
| **Fail end / postcondition** | 403/404; original prediction unchanged. |
| **Extensions** | 5a. Correction same as prediction → no-op success. |

#### UC-07: Manage Vendors (Admin)

| Field | Content |
|-------|---------|
| **Use case name** | UC-07 Manage Vendors |
| **Actors** | System Administrator |
| **Description** | List vendors/businesses; suspend or reactivate accounts. |
| **Preconditions** | Authenticated with `system_role = SYSTEM_ADMIN` (ADMIN). |
| **Main flow** | 1. Open Admin panel. 2. `GET /admin/vendors`. 3. Select vendor. 4. `POST /admin/vendors/:id/suspend` (or activate). 5. Persist status; subsequent vendor logins blocked if suspended. |
| **Successful end / postcondition** | Vendor status updated; audit trail recorded (if implemented). |
| **Fail end / postcondition** | 403 for non-admin; no change. |
| **Extensions** | 4a. Suspend self → forbidden. |

#### UC-08: View Analytics

| Field | Content |
|-------|---------|
| **Use case name** | UC-08 View Analytics |
| **Actors** | Vendor (tenant analytics) or Admin (platform analytics) |
| **Description** | Charts for inventory trends, freshness distribution, spoilage rates; admin sees aggregates across tenants. |
| **Preconditions** | Authenticated; role-appropriate scope. |
| **Main flow** | 1. Open Analytics. 2. Select date range. 3. `GET /analytics/...` with tenant or platform scope. 4. Render charts. |
| **Successful end / postcondition** | Charts populated from scoped queries. |
| **Fail end / postcondition** | Empty charts / error; no unauthorized aggregates. |
| **Extensions** | 3a. Export CSV (stretch) → file download. |

#### UC-09: Invite Employee

| Field | Content |
|-------|---------|
| **Use case name** | UC-09 Invite Employee |
| **Actors** | Vendor (OWNER); Email System |
| **Description** | OWNER invites a staff member with EMPLOYEE role via email invitation token. |
| **Preconditions** | OWNER authenticated; invitee email not already in same business. |
| **Main flow** | 1. Settings → Invite. 2. Enter email. 3. `POST /business/invitations`. 4. Insert `employee_invitations` row with token. 5. Email link. 6. Invitee accepts; user created or linked; `business_users` role EMPLOYEE. |
| **Successful end / postcondition** | EMPLOYEE membership active. |
| **Fail end / postcondition** | Invitation expired/revoked; no membership. |
| **Extensions** | 6a. Existing platform user → link only. 3a. Non-OWNER → 403. |

#### UC-10: Password Reset

| Field | Content |
|-------|---------|
| **Use case name** | UC-10 Password Reset |
| **Actors** | Vendor or Admin; Email System |
| **Description** | Account recovery via one-time tokenized email link. |
| **Preconditions** | Account email exists (response may be generic to avoid enumeration). |
| **Main flow** | 1. Forgot Password page. 2. Submit email. 3. Create `password_reset_tokens`. 4. Email link. 5. User opens Reset page with token. 6. Submit new password. 7. Validate token; bcrypt hash; invalidate token; optional logout-all. |
| **Successful end / postcondition** | Password updated; token consumed. |
| **Fail end / postcondition** | Expired/invalid token; password unchanged. |
| **Extensions** | 5a. Token reuse → reject. |

### 4.4 Architecturally Significant Coverage Matrix

| Use Case | Client | Server modules | AI | DB tables stressed |
|----------|--------|----------------|----|--------------------|
| UC-01 Register | Signup | auth | — | users, businesses, business_users, email tokens |
| UC-02 Login | Login | auth, middleware | — | users, business_users |
| UC-03 Scan | Scans | scan, inventory, alerts | analysis | scans, detections, products, alerts |
| UC-04 Inventory | Inventory | inventory | — | products |
| UC-05 Alerts | Alerts | alerts | — | alerts |
| UC-06 Correct | Scan detail | scan | — | detections (+ corrections) |
| UC-07 Manage Vendors | Admin | admin | — | users, businesses |
| UC-08 Analytics | Analytics | analytics | — | scans, detections, products |
| UC-09 Invite | Settings | business/invites | — | employee_invitations, business_users |
| UC-10 Reset | Forgot/Reset | auth | — | password_reset_tokens, users |

---

## 5. Logical View

### 5.1 Overview

The logical design decomposes SnapStock-AI into four subsystems: **Presentation (Client)**, **Application API (Server)**, **AI Inference**, and **Persistence**. Communication is exclusively via well-defined interfaces (REST/JSON, SQL). Figure 7 expands subsystem internals.

```
+======================================================================================+
|                    FIGURE 7. LOGICAL SUBSYSTEM DECOMPOSITION                          |
+======================================================================================+
|                                                                                      |
|  +---------------------------+                 +---------------------------+         |
|  | SUBSYSTEM: CLIENT         |                 | SUBSYSTEM: ADMIN UI       |         |
|  | (same deployable SPA)     |                 | (routes under /admin)     |         |
|  |---------------------------|                 |---------------------------|         |
|  | Landing | Auth pages      |                 | Vendor list | Suspend     |         |
|  | DashboardLayout           |                 | Platform analytics        |         |
|  | Scan | Inventory | Alerts |                 +-------------+-------------+         |
|  | Analytics | Settings      |                               |                       |
|  +-------------+-------------+                               |                       |
|                | REST + JWT                                  |                       |
|                +---------------------------------------------+                       |
|                                        |                                             |
|                                        v                                             |
|  +---------------------------------------------------------------------+             |
|  | SUBSYSTEM: SERVER (Application)                                     |             |
|  | +-------------+ +-------------+ +-------------+ +----------------+  |             |
|  | | AuthModule  | | ScanModule  | | InvModule  | | AlertsModule   |  |             |
|  | +-------------+ +-------------+ +-------------+ +----------------+  |             |
|  | +-------------+ +-------------+ +-------------+ +----------------+  |             |
|  | | AnalyticsMod| | AdminModule | | BusinessMod | | Shared/JWT/Zod |  |             |
|  | +-------------+ +-------------+ +-------------+ +----------------+  |             |
|  +---------------+-------------------------------+---------------------+             |
|                  |                               |                                   |
|                  v                               v                                   |
|  +---------------------------+     +-----------------------------------+             |
|  | SUBSYSTEM: AI SERVICE     |     | SUBSYSTEM: PERSISTENCE            |             |
|  |---------------------------|     |-----------------------------------|             |
|  | DetectionPkg (YOLOv8)     |     | TypeORM Entities                  |             |
|  | FreshnessPkg (MobileNet)  |     | Migrations 000–008+               |             |
|  | AnalysisPkg (orchestrate) |     | PostgreSQL schemas/indexes        |             |
|  +---------------------------+     +-----------------------------------+             |
|                                                                                      |
+======================================================================================+
```

**Figure 7** shows that Admin UI is logically distinct but physically part of the same React SPA. Server modules share cross-cutting JWT/Zod middleware. AI and Persistence are peers under the server.

### 5.2 Architecturally Significant Design Packages

#### 5.2.1 Client Packages (`client/src`)

```
+======================================================================================+
|                      FIGURE 8. CLIENT PACKAGE DIAGRAM (ASCII)                         |
+======================================================================================+
|                                                                                      |
|  +------------------+     uses      +------------------+                             |
|  | pages            |-------------->| components       |                             |
|  | (route screens)  |               | (layout, nav)    |                             |
|  +--------+---------+               +--------+---------+                             |
|           |                                  |                                       |
|           | uses                             | uses                                  |
|           v                                  v                                       |
|  +------------------+               +------------------+                             |
|  | context          |<--------------| lib              |                             |
|  | Auth, Theme      |   reads API   | api.ts, auth.ts  |                             |
|  +------------------+               +--------+---------+                             |
|                                              |                                       |
|                                              | HTTP                                  |
|                                              v                                       |
|                                     <<external>> server API                          |
|                                                                                      |
|  sections/ --> used by LandingPage only (marketing)                                  |
|  hooks/ --> use-theme, use-mobile                                                    |
+======================================================================================+
```

**Figure 8** enforces a simple rule: pages compose components; only `lib/api.ts` performs network I/O; contexts hold session/theme state.

| Package | Responsibility |
|---------|----------------|
| `pages/` | Route-level screens: Landing, Login, Signup, Verify, Forgot/Reset, Dashboard* |
| `components/` | DashboardLayout, Navigation, ProtectedRoute, AuthLayout, ThemeToggle |
| `context/` | AuthContext (JWT user), ThemeContext |
| `lib/` | HTTP client, auth helpers, className utils |
| `sections/` | Landing marketing blocks |
| `hooks/` | Responsive/theme helpers |

#### 5.2.2 Server Packages (`server/src`)

```
+======================================================================================+
|                      FIGURE 9. SERVER PACKAGE DIAGRAM (ASCII)                         |
+======================================================================================+
|                                                                                      |
|  modules/auth ----+                                                                  |
|  modules/scan ----+       +------------------+                                       |
|  modules/inventory+------>| shared/middleware|---- JWT verify ----+                  |
|  modules/alerts --+       | shared/utils     |                    |                  |
|  modules/analytics+       +------------------+                    v                  |
|  modules/admin ---+                                       entities/* <--> PostgreSQL |
|  modules/business-+                                             ^                    |
|         |                                                       |                    |
|         +---- controller --> service --> repository ------------+                    |
|                                                                                      |
|  config/data-source.ts  -->  AppDataSource (TypeORM)                                 |
|  migrations/            -->  versioned DDL                                           |
+======================================================================================+
```

**Figure 9** shows the uniform module vertical slice: routes → controller → service → repository → entities. Cross-cutting auth lives in `shared/middleware`.

#### 5.2.3 AI Service Packages (`ai-service/app`)

| Package | Responsibility |
|---------|----------------|
| `detection/` | Routes, YOLOv8 `detector`, model loader, Pydantic schemas |
| `freshness/` | Routes, CNN/MobileNet `predictor`, model loader, schemas |
| `analysis/` | Combined pipeline service: detect → crop → classify → aggregate |
| `config.py` / `main.py` | Settings, FastAPI app, lifespan model load, `/health` |
| `scripts/` (repo root under ai-service) | Training, evaluation, dataset tools (offline) |

### 5.3 Full Class Diagram (Domain + Application Significant Classes)

```
+======================================================================================+
|                         FIGURE 10. FULL CLASS DIAGRAM (ASCII)                         |
+======================================================================================+
|                                                                                      |
|  +--------------------------------------+      +----------------------------------+  |
|  | User                                 |      | Business                         |  |
|  +--------------------------------------+      +----------------------------------+  |
|  | id: UUID PK                          |      | id: UUID PK                      |  |
|  | full_name: string                    |      | business_name: string            |  |
|  | email: string UK                     |      | business_email: string           |  |
|  | password_hash: string                |      | address: string                  |  |
|  | nic: string? UK                      |      | contact_number: string           |  |
|  | date_of_birth: date?                 |      | status: ACTIVE|SUSPENDED         |  |
|  | email_verified: boolean              |      | created_at, updated_at           |  |
|  | system_role: SYSTEM_ADMIN|BUSINESS_USER|    | deleted_at?                      |  |
|  | created_at, updated_at, deleted_at?  |      +----------------+-----------------+  |
|  +-------------------+------------------+                       | 1                |  |
|                      | 1                                        |                  |  |
|                      |                                          |                  |  |
|                      | *                                        | *                |  |
|                      v                                          v                  |  |
|            +--------------------------------------+                                |  |
|            | BusinessUser                         |                                |  |
|            +--------------------------------------+                                |  |
|            | business_id: UUID FK --> Business    |                                |  |
|            | user_id: UUID FK --> User            |                                |  |
|            | role: OWNER | EMPLOYEE               |                                |  |
|            | created_at                           |                                |  |
|            +--------------------------------------+                                |  |
|                                                                                      |
|  +--------------------------------------+      +----------------------------------+  |
|  | Product                              |      | Scan                             |  |
|  +--------------------------------------+      +----------------------------------+  |
|  | id: UUID PK                          |      | id: UUID PK                      |  |
|  | business_id: UUID FK --> Business *--|----->| business_id: UUID FK             |  |
|  | name: string                         |      | user_id: UUID FK --> User        |  |
|  | category: string                     |      | image_url: string                |  |
|  | unit: string                         |      | status: PENDING|COMPLETED|FAILED |  |
|  | quantity: number                     |      | model_version: string?           |  |
|  | low_stock_threshold: number          |      | created_at                       |  |
|  | last_freshness: Fresh|Medium|Spoiled?|      +----------------+-----------------+  |
|  | last_scanned_at: timestamp?          |                       | 1                |  |
|  +--------------------------------------+                       |                  |  |
|                                                                 v *                |  |
|                                                    +-----------------------------+ |  |
|                                                    | Detection                   | |  |
|                                                    +-----------------------------+ |  |
|                                                    | id: UUID PK                 | |  |
|                                                    | scan_id: UUID FK            | |  |
|                                                    | product_label: string       | |  |
|                                                    | count: int                  | |  |
|                                                    | confidence: float           | |  |
|                                                    | bbox_json: json?            | |  |
|                                                    | freshness: enum             | |  |
|                                                    | freshness_confidence: float | |  |
|                                                    | corrected_label: string?    | |  |
|                                                    | corrected_freshness: enum?  | |  |
|                                                    +-----------------------------+ |  |
|                                                                                      |
|  +--------------------------------------+      +----------------------------------+  |
|  | Alert                                |      | EmployeeInvitation               |  |
|  +--------------------------------------+      +----------------------------------+  |
|  | id: UUID PK                          |      | id: UUID PK                      |  |
|  | business_id: UUID FK --> Business    |      | business_id: UUID FK             |  |
|  | product_id: UUID FK? --> Product     |      | email: string                    |  |
|  | type: LOW_STOCK|SPOILAGE|OTHER       |      | token: string UK                 |  |
|  | severity: INFO|WARN|CRITICAL         |      | status: PENDING|ACCEPTED|REVOKED |  |
|  | message: string                      |      | expires_at: timestamp            |  |
|  | read: boolean                        |      +----------------------------------+  |
|  | created_at                           |                                            |
|  +--------------------------------------+                                            |
|                                                                                      |
|  +--------------------------------------+      +----------------------------------+  |
|  | EmailVerificationToken               |      | PasswordResetToken               |  |
|  +--------------------------------------+      +----------------------------------+  |
|  | id: UUID PK                          |      | id: UUID PK                      |  |
|  | user_id: UUID FK --> User            |      | user_id: UUID FK --> User        |  |
|  | token: string UK                     |      | token: string UK                 |  |
|  | expires_at: timestamp                |      | expires_at: timestamp            |  |
|  | used_at: timestamp?                  |      | used_at: timestamp?              |  |
|  +--------------------------------------+      +----------------------------------+  |
|                                                                                      |
|  Application services (logical classes, not all persisted):                          |
|  +------------------+  +------------------+  +------------------+                    |
|  | AuthService      |  | ScanService      |  | AlertService     |                    |
|  | +register()      |  | +submitScan()    |  | +evaluateRules() |                    |
|  | +login()         |  | +correctDetection||  | +listForTenant() |                    |
|  | +resetPassword() |  | +getScan()       |  | +markRead()      |                    |
|  +------------------+  +------------------+  +------------------+                    |
|  +------------------+  +------------------+  +------------------+                    |
|  | InventoryService |  | AdminService     |  | AiClient         |                    |
|  | +listProducts()  |  | +listVendors()   |  | +analyze(image)  |                    |
|  | +adjustQty()     |  | +suspendVendor()|  |  (HTTP to FastAPI)|                    |
|  +------------------+  +------------------+  +------------------+                    |
|                                                                                      |
|  AI logical classes:                                                                 |
|  +------------------+  +------------------+  +------------------+                    |
|  | ObjectDetector   |  | FreshnessClassifier| | AnalysisOrchestrator|                 |
|  | +detect(image)   |  | +classify(crop) |  | +run(image)     |                    |
|  +------------------+  +------------------+  +------------------+                    |
|                                                                                      |
|  Cardinality notes: User 1--* BusinessUser *--1 Business; Business 1--* Product;     |
|  Business 1--* Scan; Scan 1--* Detection; Business 1--* Alert.                       |
+======================================================================================+
```

**Figure 10** is the architecturally significant class model. Persisted entities carry UUID primary keys and soft-delete where applicable. Application services encapsulate use-case orchestration; `AiClient` is the anti-corruption layer toward FastAPI.

### 5.4 Significant Class Descriptions

| Class | Responsibilities | Key operations / attributes |
|-------|------------------|-----------------------------|
| **User** | Identity, credentials, system role | `password_hash`, `system_role`, `email_verified` |
| **Business** | Tenant root | `business_name`, `status` |
| **BusinessUser** | Membership + business RBAC | `role` OWNER/EMPLOYEE |
| **Product** | Catalog + stock | `quantity`, `low_stock_threshold`, `last_freshness` |
| **Scan** | Image job record | `status`, `image_url`, `model_version` |
| **Detection** | Per-label/instance AI result + corrections | `confidence`, `freshness`, `corrected_*` |
| **Alert** | Actionable notification | `type`, `severity`, `read` |
| **EmployeeInvitation** | Onboarding token | `token`, `expires_at`, `status` |
| **EmailVerificationToken / PasswordResetToken** | Security tokens | `token`, `expires_at`, `used_at` |
| **AuthService** | Register/login/reset flows | transactional creates; JWT issue |
| **ScanService** | End-to-end scan orchestration | calls `AiClient`; persists; triggers alerts |
| **AlertService** | Rule evaluation and listing | threshold checks after inventory update |
| **InventoryService** | Product CRUD and adjustments | tenant-scoped queries |
| **AdminService** | Cross-tenant vendor ops | suspend/activate |
| **ObjectDetector** | YOLOv8 inference | returns boxes, labels, confidences |
| **FreshnessClassifier** | MobileNetV3/CNN | returns class + confidence |
| **AnalysisOrchestrator** | Pipeline composition | preprocess → detect → crop → classify → aggregate |

### 5.5 Client–Server Boundary Classes (Interface Stereotypes)

| Stereotype | Examples | Notes |
|------------|----------|-------|
| `<<UI>>` | `ScanPage`, `LoginPage`, `AlertsPage` | React function components |
| `<<Controller>>` | `AuthController`, `ScanController` | Express handlers |
| `<<Service>>` | `AuthService`, `ScanService` | Business rules |
| `<<Repository>>` | `AuthRepository`, `ScanRepository` | TypeORM queries |
| `<<Middleware>>` | `authMiddleware` | JWT + attach `req.user` |
| `<<Client>>` | `api.ts`, `AiClient` | Outbound HTTP |

---

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

## 7. Deployment View

### 7.1 Local Development Deployment (Docker Compose + Host Processes)

```
+======================================================================================+
|         FIGURE 19. DEPLOYMENT — LOCAL DOCKER + HOST APPS                              |
+======================================================================================+
|                                                                                      |
|  <<device>> Developer Workstation (Windows/Linux/macOS)                              |
|  +--------------------------------------------------------------------------------+  |
|  |                                                                                |  |
|  |  <<execution environment>> Host OS                                             |  |
|  |  +------------------+  +------------------+  +------------------+              |  |
|  |  | <<process>>      |  | <<process>>      |  | <<process>>      |              |  |
|  |  | client (Vite)    |  | server (Node)    |  | ai-service       |              |  |
|  |  | :5173            |  | :5000            |  | (Uvicorn) :8000  |              |  |
|  |  | volume: ./client |  | volume: ./server |  | ./ai-service     |              |  |
|  |  +--------+---------+  +--------+---------+  +--------+---------+              |  |
|  |           |                     |   \_______________/                          |  |
|  |           | HTTP localhost      |         HTTP localhost:8000                  |  |
|  |           +---------------------+                                              |  |
|  |                                 | TCP                                          |  |
|  |                                 v                                              |  |
|  |  <<execution environment>> Docker Engine                                       |  |
|  |  +--------------------------------------------------------------------------+  |  |
|  |  | docker-compose network: default / bridgestock-net                           |  |  |
|  |  |                                                                          |  |  |
|  |  |  +-----------------------------------+  +------------------------------+|  |  |
|  |  |  | <<container>> snapstock-postgres  |  | <<container>> snapstock-     ||  |  |
|  |  |  | image: postgres:16-alpine         |  | pgadmin                      ||  |  |
|  |  |  | host_port: ${POSTGRES_PORT:-5432} |  | image: dpage/pgadmin4        ||  |  |
|  |  |  | container_port: 5432               |  | host_port: 5050 -> 80        ||  |  |
|  |  |  | vol: postgres-data                |  | vol: pgadmin-data            ||  |  |
|  |  |  |   -> /var/lib/postgresql/data     |  |   -> /var/lib/pgadmin         ||  |  |
|  |  |  | healthcheck: pg_isready           |  | depends_on: postgres         ||  |  |
|  |  |  +-----------------------------------+  +------------------------------+|  |  |
|  |  +--------------------------------------------------------------------------+  |  |
|  +--------------------------------------------------------------------------------+  |
|                                                                                      |
|  Port map summary: 5173 client | 5000 API | 8000 AI | 5432 DB | 5050 pgAdmin         |
+======================================================================================+
```

**Figure 19** matches the repository’s `docker-compose.yml`: only Postgres and pgAdmin are containerized by default; Node and Python run on the host for fast iteration, connecting to published DB port 5432.

### 7.2 Production / Demo Cloud Deployment (Target)

```
+======================================================================================+
|              FIGURE 20. DEPLOYMENT — PRODUCTION / DEMO TARGET                         |
+======================================================================================+
|                                                                                      |
|  <<device>> Smartphone/Desktop                                                       |
|  | HTTPS :443                                                                        |
|  v                                                                                   |
|  <<node>> Edge / Load Balancer                                                       |
|  +---------------------------+                                                       |
|  | Nginx / Caddy / Cloud LB  |  TLS termination, static + reverse proxy              |
|  +-------------+-------------+                                                       |
|                |                                                                     |
|       +--------+------------------+                                                  |
|       | static /                  | /api/*                                           |
|       v                           v                                                  |
|  +--------------------+    +--------------------+     +--------------------+         |
|  | <<container>>      |    | <<container>>      |     | <<container>>      |         |
|  | client-static      |    | server:5000        |---->| ai-service:8000    |         |
|  | nginx:alpine       |    | Node Express       |     | FastAPI            |         |
|  +--------------------+    +---------+----------+     +---------+----------+         |
|                                      |                          |                    |
|                                      | TCP 5432                 | models volume      |
|                                      v                          v                    |
|                             +--------------------+     +--------------------+        |
|                             | <<container>> or   |     | <<volume>>         |        |
|                             | managed PostgreSQL |     | model-weights      |        |
|                             +--------------------+     +--------------------+        |
|                                      |                                               |
|                                      v                                               |
|                             +--------------------+                                   |
|                             | <<service>> S3/MinIO|  scan images (signed URLs)       |
|                             +--------------------+                                   |
|                                                                                      |
|  Security groups: public 443; internal 5000/8000/5432 not exposed publicly.          |
+======================================================================================+
```

**Figure 20** shows a hardened topology: TLS at the edge, private AI and DB networks, and object storage for images. pgAdmin is omitted from public production or bound to VPN/admin IP allowlists only.

### 7.3 Node Mapping (Process View → Deployment View)

| Process (Section 6) | Local node | Production node |
|---------------------|------------|-----------------|
| React client | Host :5173 | `client-static` behind Nginx |
| Express server | Host :5000 | `server` container |
| FastAPI AI | Host :8000 | `ai-service` container |
| PostgreSQL | `snapstock-postgres` :5432 | Managed DB or private container |
| pgAdmin | `snapstock-pgadmin` :5050 | VPN / admin-only (optional) |

### 7.4 Network, Ports, and Volumes

| Service | Protocol | Host port | Container port | Volume |
|---------|----------|-----------|----------------|--------|
| client (Vite) | HTTP | 5173 | n/a (host) | source bind |
| server (Express) | HTTP | 5000 | n/a (host) / 5000 | source bind; optional `uploads/` |
| ai-service | HTTP | 8000 | n/a (host) / 8000 | model weights dir |
| postgres | TCP | 5432 | 5432 | `postgres-data` → `/var/lib/postgresql/data` |
| pgadmin | HTTP | 5050 | 80 | `pgadmin-data` → `/var/lib/pgadmin` |
| Edge TLS (prod) | HTTPS | 443 | 443/80 | cert volume or managed TLS |

```
+======================================================================================+
|              FIGURE 21. NETWORK ZONES AND TRUST BOUNDARIES                            |
+======================================================================================+
|                                                                                      |
|  +---------------------------+     +---------------------------------------------+   |
|  | ZONE: PUBLIC              |     | ZONE: APPLICATION (private)                 |   |
|  | Browsers --> :443/:5173   |---->| Nginx --> server:5000 --> ai-service:8000   |   |
|  +---------------------------+     +-------------------+-------------------------+   |
|                                                        |                             |
|                                                        v                             |
|                                        +-----------------------------------------+   |
|                                        | ZONE: DATA (private)                    |   |
|                                        | PostgreSQL:5432 | object storage        |   |
|                                        +-----------------------------------------+   |
|                                                                                      |
|  Trust boundary rules:                                                               |
|  - JWT validated only in APPLICATION zone (server).                                  |
|  - AI zone accepts requests only from server (network policy / shared secret).       |
|  - DATA zone accepts connections only from server (and admin jump host).             |
+======================================================================================+
```

**Figure 21** documents network zoning: browsers never reach PostgreSQL or the AI service. In production, firewall rules enforce the same constraints that development enforces by convention.

---

## 8. Implementation View

### 8.1 Overview

The implementation model is a **monorepo** with three independently runnable application packages plus shared documentation and Compose files. Layers define inclusion rules and dependency direction.

```
+======================================================================================+
|              FIGURE 22. IMPLEMENTATION LAYERS AND RULES                               |
+======================================================================================+
|                                                                                      |
|  +========================================================================+          |
|  | LAYER L1 — PRESENTATION                                                |          |
|  | Allowed: React components, hooks, context, CSS, browser APIs           |          |
|  | Forbidden: TypeORM, SQL, filesystem secrets, direct AI HTTP            |          |
|  | Package root: client/src                                               |          |
|  +----------------------------------+-------------------------------------+          |
|                                     | depends on REST contracts only                 |
|  +----------------------------------v-------------------------------------+          |
|  | LAYER L2 — APPLICATION                                                 |          |
|  | Allowed: Express routes, services, repositories, JWT, Zod, email       |          |
|  | Forbidden: Ultralytics/PyTorch imports; UI components                  |          |
|  | Package root: server/src                                               |          |
|  +---------------+-----------------------------+--------------------------+          |
|                  |                             |                                     |
|  +---------------v---------------+  +----------v--------------------------+          |
|  | LAYER L3a — AI INFERENCE      |  | LAYER L3b — PERSISTENCE             |          |
|  | FastAPI routers, models,      |  | PostgreSQL, migrations, entities    |          |
|  | OpenCV/Pillow preprocessing   |  | No HTTP business rules here         |          |
|  | Forbidden: JWT user auth;     |  | Forbidden: ML model execution       |          |
|  |          DB drivers           |  |                                     |          |
|  +-------------------------------+  +-------------------------------------+          |
|                                                                                      |
|  Cross-cutting (docs/, docker-compose.yml, root package.json) are not runtime layers.|
+======================================================================================+
```

**Figure 22** states layer inclusion rules. The critical architectural invariant is the **acyclic dependency** L1 → L2 → {L3a, L3b} with **no edge** L1 → L3a and **no edge** L3a → L3b.

### 8.2 Package Tree (Source Layout)

```
+======================================================================================+
|              FIGURE 23. PACKAGE / DIRECTORY TREE                                      |
+======================================================================================+
|                                                                                      |
|  SnapStock-AI/                                                                       |
|  |                                                                                   |
|  +-- client/                                                                         |
|  |   +-- src/                                                                        |
|  |   |   +-- pages/            # Landing, Login, Signup, Verify, Forgot, Reset       |
|  |   |   |   +-- dashboard/    # Home, Inventory, Scans, Alerts, Analytics, Settings |
|  |   |   +-- components/       # DashboardLayout, Navigation, ProtectedRoute, ...    |
|  |   |   +-- context/          # AuthContext, ThemeContext                           |
|  |   |   +-- lib/              # api.ts, auth.ts, utils.ts                           |
|  |   |   +-- sections/         # Hero, Features, HowItWorks, Pricing, Footer         |
|  |   |   +-- hooks/            # use-theme, use-mobile                               |
|  |   |   +-- App.tsx, main.tsx                                                       |
|  |   +-- vite.config.ts, package.json, tsconfig*.json                                |
|  |                                                                                   |
|  +-- server/                                                                         |
|  |   +-- src/                                                                        |
|  |   |   +-- modules/                                                                |
|  |   |   |   +-- auth/         # routes, controller, service, repository, types     |
|  |   |   |   +-- (scan|inventory|alerts|analytics|admin|business)/  # planned slices|
|  |   |   +-- entities/         # User, EmailVerificationToken, PasswordResetToken,.. |
|  |   |   +-- shared/           # middleware/auth.middleware.ts, utils/email.ts       |
|  |   |   +-- config/           # data-source.ts, db.ts                               |
|  |   |   +-- index.ts                                                                |
|  |   +-- migrations/           # 000_enable_pgcrypto ... 008_password_reset_tokens   |
|  |   +-- scripts/              # migrate.ts, check-migrations.ts, db.ts              |
|  |                                                                                   |
|  +-- ai-service/                                                                     |
|  |   +-- app/                                                                        |
|  |   |   +-- detection/        # routes, detector, model_loader, schemas             |
|  |   |   +-- freshness/        # routes, predictor, model_loader, schemas            |
|  |   |   +-- analysis/         # routes, service, schemas                           |
|  |   |   +-- main.py, config.py                                                     |
|  |   +-- scripts/              # cnn_train, mobilenet_train, evaluate, download_model|
|  |                                                                                   |
|  +-- docs/                     # SRS, SAD, feasibility, proposal, PMP                |
|  +-- docker-compose.yml        # postgres + pgadmin                                  |
|  +-- package.json              # workspace root scripts (if any)                     |
|                                                                                      |
+======================================================================================+
```

**Figure 23** is the development-view package tree. Auth is implemented first; additional server modules follow the same vertical-slice pattern as `modules/auth/`.

### 8.3 Layers Detail

#### 8.3.1 Presentation Layer Subsystems

| Subsystem | Contents | Dependency rule |
|-----------|----------|-----------------|
| Marketing | `sections/`, LandingPage | May not call authenticated APIs without user action |
| Auth UI | Login, Signup, Verify, Forgot, Reset | Uses `lib/api` auth endpoints only |
| Vendor console | dashboard pages | All calls send JWT; ProtectedRoute gate |
| Admin console | admin routes/pages | JWT + SYSTEM_ADMIN check (client hint + server enforce) |

#### 8.3.2 Application Layer Subsystems

| Subsystem | Contents | Notes |
|-----------|----------|-------|
| Auth module | register, login, verify, reset | Owns password hashing |
| Scan module | upload, AI orchestration, corrections | Owns `AiClient` |
| Inventory module | products CRUD, adjustments | Tenant filtered |
| Alerts module | list, mark read, rule hooks | Invoked by ScanService |
| Analytics module | aggregations | Read-mostly queries |
| Admin module | vendors suspend/list | system_role gate |
| Business module | invitations, membership | OWNER gates |

#### 8.3.3 AI and Persistence Layers

AI layer subsystems mirror `detection`, `freshness`, and `analysis` packages. Persistence comprises TypeORM entities, migration scripts, and PostgreSQL indexes (Section 9).

### 8.4 Component Dependency Diagram

```
+======================================================================================+
|              FIGURE 24. COMPONENT DEPENDENCY DIAGRAM                                  |
+======================================================================================+
|                                                                                      |
|   +-------------+         REST/JSON          +--------------+                        |
|   | client SPA  | -------------------------> | server API   |                        |
|   +-------------+                            +------+-------+                        |
|                                                     |                                |
|                              +----------------------+----------------------+         |
|                              |                                             |         |
|                              v                                             v         |
|                     +----------------+                              +--------------+ |
|                     | ai-service     |                              | PostgreSQL   | |
|                     +--------+-------+                              +--------------+ |
|                              |                                                       |
|                              v                                                       |
|                     +----------------+                                               |
|                     | Model weights  |                                               |
|                     | (.pt / .pth)   |                                               |
|                     +----------------+                                               |
|                                                                                      |
|   Optional:                                                                          |
|   server --> SMTP provider                                                           |
|   server --> S3/MinIO                                                                |
|                                                                                      |
+======================================================================================+
```

**Figure 24** shows allowed runtime dependencies. Solid arrows are permitted; the forbidden set is enumerated below.

### 8.5 Forbidden Dependencies

```
+======================================================================================+
|              FIGURE 25. FORBIDDEN DEPENDENCY EDGES                                    |
+======================================================================================+
|                                                                                      |
|   client  ----X---->  ai-service     REASON: bypasses authz, leaks AI surface        |
|   client  ----X---->  PostgreSQL     REASON: credentials & tenant filters in browser |
|   ai-service --X----> PostgreSQL     REASON: AI must stay stateless & replaceable    |
|   ai-service --X----> client         REASON: no callbacks into browsers              |
|   pages/  ----X---->  TypeORM        REASON: wrong language/runtime                  |
|   freshness/ --X--> detection/routes REASON: avoid circular import; use analysis orch|
|                                                                                      |
|   Legend: ----X---->  means MUST NOT depend                                          |
+======================================================================================+
```

**Figure 25** is normative for code review. Pull requests that introduce a forbidden edge are architectural defects regardless of functional correctness.

### 8.6 Module Coding Conventions (Architecturally Relevant)

| Concern | Convention |
|---------|------------|
| Server feature slice | `routes.ts` → `controller.ts` → `service.ts` → `repository.ts` |
| Validation | Zod at controller boundary |
| Auth | `auth.middleware.ts` attaches `req.user` |
| DB changes | Forward-only migrations under `server/migrations/` |
| AI schemas | Pydantic models in each package’s `schemas.py` |
| Naming | camelCase TS; snake_case DB columns; UUID PKs |

---

## 9. Data View

### 9.1 Entity-Relationship Diagram (Detailed)

```
+======================================================================================+
|              FIGURE 26. DETAILED ER DIAGRAM (ASCII)                                   |
+======================================================================================+
|                                                                                      |
|  +------------------------+         +---------------------------+                    |
|  | users                  |         | businesses                |                    |
|  +------------------------+         +---------------------------+                    |
|  | PK id UUID             |         | PK id UUID                |                    |
|  |    full_name           |         |    business_name          |                    |
|  | UK email               |         |    business_email         |                    |
|  |    password_hash       |         |    address                |                    |
|  | UK nic?                |         |    contact_number         |                    |
|  |    date_of_birth?      |         |    status                 |                    |
|  |    email_verified      |         |    created_at/updated_at  |                    |
|  |    system_role ENUM    |         |    deleted_at?            |                    |
|  |    created_at/...      |         +-------------+-------------+                    |
|  |    deleted_at?         |                       | 1                                |
|  +-----------+------------+                       |                                  |
|              | 1                                  |                                  |
|              |                                    |                                  |
|              | *                                  | *                                |
|              v                                    v                                  |
|       +-----------------------------------------------+                              |
|       | business_users                                |                              |
|       +-----------------------------------------------+                              |
|       | PK (business_id, user_id)  OR surrogate id    |                              |
|       | FK business_id --> businesses.id              |                              |
|       | FK user_id --> users.id                       |                              |
|       |    role ENUM (OWNER, EMPLOYEE)                |                              |
|       +-----------------------------------------------+                              |
|                                                                                      |
|  businesses 1----* products                                                          |
|  +---------------------------+                                                       |
|  | products                  |                                                       |
|  +---------------------------+                                                       |
|  | PK id UUID                |                                                       |
|  | FK business_id            |                                                       |
|  |    name, category, unit   |                                                       |
|  |    quantity NUMERIC       |                                                       |
|  |    low_stock_threshold    |                                                       |
|  |    last_freshness ENUM?   |                                                       |
|  |    last_scanned_at?       |                                                       |
|  |    deleted_at?            |                                                       |
|  +---------------------------+                                                       |
|                                                                                      |
|  businesses 1----* scans  ;  users 1----* scans                                      |
|  +---------------------------+         +---------------------------+                 |
|  | scans                     | 1----*  | detections                |                 |
|  +---------------------------+         +---------------------------+                 |
|  | PK id UUID                |         | PK id UUID                |                 |
|  | FK business_id            |         | FK scan_id                |                 |
|  | FK user_id                |         |    product_label          |                 |
|  |    image_url              |         |    count INT              |                 |
|  |    status ENUM            |         |    confidence FLOAT       |                 |
|  |    model_version?         |         |    bbox_json JSONB?       |                 |
|  |    created_at             |         |    freshness ENUM         |                 |
|  +---------------------------+         |    freshness_confidence   |                 |
|                                        |    corrected_label?       |                 |
|                                        |    corrected_freshness?   |                 |
|                                        +---------------------------+                 |
|                                                                                      |
|  businesses 1----* alerts  ;  products 0..1 ----* alerts                             |
|  +---------------------------+                                                       |
|  | alerts                    |                                                       |
|  +---------------------------+                                                       |
|  | PK id UUID                |                                                       |
|  | FK business_id            |                                                       |
|  | FK product_id?            |                                                       |
|  |    type ENUM              |                                                       |
|  |    severity ENUM          |                                                       |
|  |    message TEXT           |                                                       |
|  |    read BOOLEAN           |                                                       |
|  |    created_at             |                                                       |
|  +---------------------------+                                                       |
|                                                                                      |
|  +---------------------------+   +---------------------------+                       |
|  | employee_invitations      |   | email_verification_tokens |                       |
|  +---------------------------+   +---------------------------+                       |
|  | PK id                     |   | PK id                     |                       |
|  | FK business_id            |   | FK user_id                |                       |
|  |    email                  |   | UK token                  |                       |
|  | UK token                  |   |    expires_at, used_at?   |                       |
|  |    status, expires_at     |   +---------------------------+                       |
|  +---------------------------+                                                       |
|                              +---------------------------+                           |
|                              | password_reset_tokens     |                           |
|                              +---------------------------+                           |
|                              | PK id ; FK user_id ; UK token ; expires_at; used_at?  |
|                              +---------------------------+                           |
|                                                                                      |
+======================================================================================+
```

**Figure 26** is the logical data model. Tenant-owned operational tables always carry `business_id`. Token tables reference `users` and are not tenant-listed in dashboards.

### 9.2 Table Schemas (Physical Summary)

#### 9.2.1 `users`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, default `gen_random_uuid()` |
| full_name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | UNIQUE NOT NULL |
| password_hash | TEXT | NOT NULL |
| nic | VARCHAR(15) | UNIQUE NULL |
| date_of_birth | DATE | NULL |
| email_verified | BOOLEAN | NOT NULL DEFAULT false |
| system_role | ENUM | SYSTEM_ADMIN \| BUSINESS_USER |
| created_at / updated_at | TIMESTAMP | managed by ORM |
| deleted_at | TIMESTAMP | soft delete |

#### 9.2.2 `businesses`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| business_name | VARCHAR | NOT NULL |
| business_email | VARCHAR | NULL/UNIQUE as designed |
| address | TEXT | |
| contact_number | VARCHAR | |
| status | VARCHAR/ENUM | ACTIVE \| SUSPENDED |
| timestamps / deleted_at | | |

#### 9.2.3 `business_users`

| Column | Type | Constraints |
|--------|------|-------------|
| business_id | UUID | FK → businesses |
| user_id | UUID | FK → users |
| role | ENUM | OWNER \| EMPLOYEE |
| | | UNIQUE(business_id, user_id) |

#### 9.2.4 `products`, `scans`, `detections`, `alerts`

See Figure 26 for columns. Enumerations:

- `scans.status`: `PENDING` | `COMPLETED` | `FAILED`  
- `detections.freshness` / `products.last_freshness`: `Fresh` | `Medium` | `Spoiled`  
- `alerts.type`: `LOW_STOCK` | `SPOILAGE` | `OTHER`  
- `alerts.severity`: `INFO` | `WARN` | `CRITICAL`  

#### 9.2.5 Token / Invitation Tables

Aligned with migrations `004_create_employee_invitations_table`, `006_create_email_verification_tokens_table`, `008_create_password_reset_tokens_table`: token string unique, expiry timestamp, optional `used_at`.

### 9.3 Indexing Strategy

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| PK | all | id | lookup |
| UK | users | email | login |
| IX | business_users | user_id | resolve memberships |
| IX | business_users | business_id | list members |
| IX | products | (business_id, name) | tenant catalog search |
| IX | scans | (business_id, created_at DESC) | recent scans |
| IX | scans | user_id | “my scans” |
| IX | detections | scan_id | join from scan |
| IX | alerts | (business_id, read, created_at DESC) | inbox query |
| IX | alerts | product_id | product alert history |
| UK | *_tokens | token | O(1) redeem |

```
+======================================================================================+
|              FIGURE 27. INDEX USAGE ON ALERT INBOX QUERY                              |
+======================================================================================+
|                                                                                      |
|  SELECT * FROM alerts                                                                |
|  WHERE business_id = :tenant                                                         |
|    AND read = false                                                                  |
|  ORDER BY created_at DESC                                                            |
|  LIMIT 50;                                                                           |
|                                                                                      |
|  Planned plan shape:                                                                 |
|  Index Scan using ix_alerts_business_read_created                                    |
|    Filter: business_id = $1 AND read = false                                         |
|                                                                                      |
+======================================================================================+
```

**Figure 27** illustrates why a composite index on `(business_id, read, created_at)` is preferred over a lone `business_id` index for the alerts inbox.

### 9.4 Tenant Isolation Flow

```
+======================================================================================+
|              FIGURE 28. TENANT ISOLATION FLOW                                         |
+======================================================================================+
|                                                                                      |
|  [HTTP + JWT]                                                                        |
|       |                                                                              |
|       v                                                                              |
|  +--------------------+                                                              |
|  | auth.middleware    |  verify signature, exp, load user_id                         |
|  +---------+----------+                                                              |
|            |                                                                         |
|            v                                                                         |
|  +--------------------+                                                              |
|  | Membership resolve |  SELECT business_id, role FROM business_users                |
|  |                    |  WHERE user_id = :uid AND deleted business not suspended     |
|  +---------+----------+                                                              |
|            |                                                                         |
|            v                                                                         |
|  +--------------------+                                                              |
|  | TenantContext      |  { userId, businessId, businessRole, systemRole }            |
|  +---------+----------+                                                              |
|            |                                                                         |
|            v                                                                         |
|  +--------------------+     missing filter = DEFECT                                  |
|  | Repository query   | ------------------------------------------------------------ |
|  | ... WHERE          |  WHERE business_id = :TenantContext.businessId               |
|  | business_id = ?    |                                                              |
|  +---------+----------+                                                              |
|            |                                                                         |
|            v                                                                         |
|  +--------------------+                                                              |
|  | Result set         |  never contains other tenants' rows                          |
|  +--------------------+                                                              |
|                                                                                      |
|  Admin exception path: SYSTEM_ADMIN routes may omit business_id filter but MUST      |
|  still authenticate and authorize explicitly; never reuse vendor controllers as-is.  |
+======================================================================================+
```

**Figure 28** is the normative isolation algorithm. Automated tests should attempt cross-tenant reads and expect empty/403 results.

### 9.5 Image Storage Strategy

| Phase | Storage | URL strategy | Retention |
|-------|---------|--------------|-----------|
| Local prototype | `server/uploads/` or similar filesystem | Relative/static path via API | Manual cleanup |
| Demo / production | S3-compatible (AWS S3, MinIO, R2) | Store object key in `scans.image_url`; signed GET URLs | Lifecycle rule optional |
| AI transit | In-memory / temp file in AI container | Not persisted by AI | Deleted after inference |
| Training data | Offline datasets on developer disks | Not in production DB | N/A |

```
+======================================================================================+
|              FIGURE 29. IMAGE STORAGE DATA FLOW                                       |
+======================================================================================+
|                                                                                      |
|  Client compresses image                                                             |
|       |                                                                              |
|       v                                                                              |
|  Server receives multipart ----+----> write object store / disk                      |
|                                |                                                     |
|                                +----> scans.image_url = key/path                     |
|                                |                                                     |
|                                +----> forward bytes/stream to AI /analysis           |
|                                         |                                            |
|                                         v                                            |
|                                   AI temp decode (no DB write)                       |
|                                         |                                            |
|                                         v                                            |
|                                   discard temp buffers                               |
|                                                                                      |
+======================================================================================+
```

**Figure 29** keeps the AI service free of durable image storage. The server owns retention and access control for images.

### 9.6 Data Flow Diagrams (DFD)

#### 9.6.1 Level 0 (Context)

```
+======================================================================================+
|              FIGURE 30. DFD LEVEL 0 — SYSTEM CONTEXT                                  |
+======================================================================================+
|                                                                                      |
|   Vendor --------images, credentials, corrections--------\                           |
|                                                           \                          |
|                                                            v                         |
|   Admin ---------admin commands, queries----------> [ SnapStock-AI System ]          |
|                                                            |                         |
|                                                            | verification emails     |
|                                                            v                         |
|                                                      [ Email Provider ]              |
|                                                                                      |
|   External entities: Vendor, Admin, Email Provider                                   |
|   Central process: SnapStock-AI System                                               |
|   Data stores (internal at L0): not expanded                                         |
+======================================================================================+
```

**Figure 30** is the context-level DFD. Only external entities and the system-as-process appear.

#### 9.6.2 Level 1 (Decomposition)

```
+======================================================================================+
|              FIGURE 31. DFD LEVEL 1 — MAJOR PROCESSES                                 |
+======================================================================================+
|                                                                                      |
|  Vendor                                                                          |
|    |  creds                                                                      |
|    v                                                                             |
|  +--------------------+     user records      +------------------+               |
|  | P1 Authenticate &  |<--------------------->| D1 Users &       |               |
|  |    Authorize       |     tokens            |    Tokens        |               |
|  +--------+-----------+                       +------------------+               |
|           | JWT context                                                          |
|           v                                                                      |
|  +--------------------+     memberships       +------------------+               |
|  | P2 Manage Business |<--------------------->| D2 Businesses &  |               |
|  |    & Employees     |     invitations       |    Members       |               |
|  +--------+-----------+                       +------------------+               |
|           |                                                                      |
|           | image + tenant                                                       |
|           v                                                                      |
|  +--------------------+     scan rows         +------------------+               |
|  | P3 Capture &       |---------------------->| D3 Scans &       |               |
|  |    Orchestrate Scan|     detections        |    Detections    |               |
|  +--------+-----------+                       +--------+---------+               |
|           |                                            ^                         |
|           | image bytes                                | inventory updates       |
|           v                                            |                         |
|  +--------------------+                                |                         |
|  | P4 AI Infer        |--- labels/counts/freshness ----+                         |
|  |  (detect+classify) |                                                          |
|  +--------------------+                                                          |
|           |                                                                      |
|           | stock + freshness signals                                            |
|           v                                                                      |
|  +--------------------+     products          +------------------+               |
|  | P5 Update Inventory|<--------------------->| D4 Products      |               |
|  +--------+-----------+                       +------------------+               |
|           |                                                                      |
|           v                                                                      |
|  +--------------------+     alerts            +------------------+               |
|  | P6 Generate Alerts |---------------------->| D5 Alerts        |               |
|  +--------+-----------+                       +------------------+               |
|           |                                                                      |
|           v                                                                      |
|  +--------------------+     aggregates        +------------------+               |
|  | P7 Analytics &     |<---------------------| D3, D4, D5       |               |
|  |    Admin Reporting |                       +------------------+               |
|  +--------------------+                                                          |
|                                                                                  |
|  Admin enters at P1 then primarily uses P2 (suspend) and P7 (platform reports).  |
+======================================================================================+
```

**Figure 31** decomposes the system into seven processes and five logical data stores. P4 (AI) has no data store of its own, reinforcing the DB-less AI constraint.

---

## 10. Size and Performance

### 10.1 Dimensioning Characteristics

| Characteristic | Prototype estimate | Notes |
|----------------|-------------------|-------|
| Concurrent interactive users | 10–20 | Academic demo scale |
| Concurrent scan requests | ≥ 10 | SRS throughput floor |
| Scans per vendor per day | 5–20 | Produce shops |
| Compressed image size | 200 KB – 2 MB | Client compression |
| Max upload size | 10 MB | Hard reject above |
| DB rows (prototype horizon) | < 100,000 | All tenants combined |
| YOLO + MobileNet weights | ~50–100 MB | Loaded at AI startup |
| REST endpoints (planned) | ~25–40 | Across modules |
| JWT TTL | 24 h default | Configurable |

### 10.2 Performance Targets (from SRS, architecturalized)

| Metric | Average target | Maximum / p95 | Architectural tactic |
|--------|----------------|---------------|----------------------|
| Login / register | < 2 s | 5 s | Indexed email; bcrypt cost 10 |
| Image upload (< 2 MB) | < 3 s | 8 s | Client compression; multipart |
| AI inference E2E | < 5 s | 15 s | MobileNetV3; model preload; CPU batch=1 |
| Dashboard load | < 2 s | 5 s | Indexed tenant queries; limit/offset |
| Non-AI API p95 | < 200 ms | — | Connection pool; lean controllers |
| DB query p95 | < 100 ms | — | Composite indexes (Section 9.3) |
| AI cold start | — | < 30 s | Lifespan model load |
| Client first load | < 3 s on 4G | — | Vite code split; asset minify |

### 10.3 Capacity Thoughts and Degradation

```
+======================================================================================+
|              FIGURE 32. PERFORMANCE BUDGET — SCAN PATH                                |
+======================================================================================+
|                                                                                      |
|  Total budget p95 ≈ 15 s (hard), goal 5 s                                            |
|                                                                                      |
|  |-- client compress 200ms --|-- upload 1.0s --|-- server I/O 200ms --|              |
|  |-- AI preprocess 200ms --|-- YOLO 2.0s --|-- CNN crops 1.5s --|-- agg 50ms --|     |
|  |-- DB TX 150ms --|-- JSON render 50ms --|                                          |
|                                                                                      |
|  If AI > budget: mark FAILED, show retry; do not block unrelated CRUD API workers.   |
+======================================================================================+
```

**Figure 32** allocates the scan latency budget across stages. Separating AI into its own process prevents long inferences from exhausting Node’s event loop beyond the awaited HTTP call.

### 10.4 Optimization Strategies

1. **Client-side image compression** before multipart upload.  
2. **Model preloading** in FastAPI lifespan handlers (no per-request cold load).  
3. **PostgreSQL indexes** on tenant and foreign-key columns.  
4. **TypeORM / driver connection pooling**.  
5. **Horizontal scale of AI workers** behind an internal load balancer if concurrency grows.  
6. **Pagination** on inventory, scans, alerts, and admin vendor lists.  
7. **Optional result caching** for analytics aggregates (short TTL) — future enhancement.  

### 10.5 Size of Implementation (Order-of-Magnitude)

| Area | Approx. size (prototype) |
|------|--------------------------|
| Client TS/TSX | medium SPA (tens of components) |
| Server TS | modular; auth complete early, other modules incremental |
| AI Python | small service surface; larger training scripts offline |
| Migrations | ordered SQL/TS migrations 000+ |
| Documentation | SRS + SAD + feasibility + PMP |

---

## 11. Quality

### 11.1 Quality Attribute Scenarios

Each scenario follows a stimulus–environment–response–measure pattern suitable for architecture evaluation.

#### QAS-01 Confidentiality / Tenant Isolation

| Field | Content |
|-------|---------|
| **Attribute** | Security (confidentiality) |
| **Stimulus** | Authenticated Vendor A requests `GET /inventory` while crafting `business_id` of Vendor B |
| **Environment** | Normal operation; shared schema DB |
| **Response** | Server ignores/overrides forged tenant id; uses membership-derived `business_id` |
| **Measure** | Zero rows from Tenant B; preferably 403 if mismatch explicit |
| **Mechanism** | JWT + BusinessUser resolve + repository filters (Figure 28) |

#### QAS-02 AI Failure Reliability

| Field | Content |
|-------|---------|
| **Attribute** | Reliability |
| **Stimulus** | AI service timeout or 500 during scan |
| **Environment** | Peak demo load |
| **Response** | Scan marked `FAILED`; inventory not partially updated; user sees retry |
| **Measure** | No orphan detections; stock unchanged; error within 15 s client-side |
| **Mechanism** | Transactional boundary in ScanService; circuit-friendly timeouts |

#### QAS-03 Inference Scalability

| Field | Content |
|-------|---------|
| **Attribute** | Scalability |
| **Stimulus** | 10 concurrent scan uploads |
| **Environment** | Single AI replica on CPU |
| **Response** | Requests queue/work concurrently within Uvicorn/worker capacity; CRUD still responsive |
| **Measure** | ≥ 10 concurrent scans without crash; API non-AI p95 still < 1 s |
| **Mechanism** | Process separation (ADR-001); optional extra AI workers |

#### QAS-04 Maintainability — New Alert Type

| Field | Content |
|-------|---------|
| **Attribute** | Maintainability |
| **Stimulus** | Product owner requests `NEAR_EXPIRY` alert type |
| **Environment** | Development |
| **Response** | Extend enum + AlertService rules + UI badge; no AI package change |
| **Measure** | Change localized to server alerts module + client Alerts page |
| **Mechanism** | Modular server packages (Figure 9) |

#### QAS-05 Portability — Demo on New Laptop

| Field | Content |
|-------|---------|
| **Attribute** | Portability |
| **Stimulus** | Mentor clones repo on a clean machine |
| **Environment** | Docker Desktop available |
| **Response** | `docker compose up -d` yields healthy Postgres; apps start via documented scripts |
| **Measure** | DB ready < 2 minutes; migrations apply cleanly |
| **Mechanism** | Compose volumes/healthcheck (Figure 19) |

#### QAS-06 Usability — First Scan

| Field | Content |
|-------|---------|
| **Attribute** | Usability |
| **Stimulus** | New OWNER completes signup and first scan |
| **Environment** | Mobile Chrome |
| **Response** | ≤ 3 taps from dashboard to submit; results visible |
| **Measure** | First scan ≤ 5 minutes including signup (SRS) |
| **Mechanism** | Minimal Scan UI; ProtectedRoute; clear validation errors |

#### QAS-07 Extensibility — New Produce Class

| Field | Content |
|-------|---------|
| **Attribute** | Extensibility |
| **Stimulus** | Retrain YOLO with additional vegetable class |
| **Environment** | Offline training; then model swap |
| **Response** | Replace weights; bump `model_version`; client unchanged |
| **Measure** | No SPA redeploy required for label set expansion (display is data-driven) |
| **Mechanism** | DB-less AI; version field on scans |

#### QAS-08 Integrity — Correct Prediction Audit

| Field | Content |
|-------|---------|
| **Attribute** | Data integrity / trust |
| **Stimulus** | Vendor corrects spoiled→fresh on a detection |
| **Environment** | Normal |
| **Response** | Original and corrected values retained; inventory may recompute |
| **Measure** | Correction durable; attributable to user_id |
| **Mechanism** | `corrected_*` columns / audit fields on detections |

### 11.2 Quality–Architecture Mechanism Matrix

| Attribute | Primary mechanisms |
|-----------|--------------------|
| Security | JWT, bcrypt, Helmet, Zod, RBAC, tenant filters, HTTPS (prod) |
| Reliability | Transactions, scan status enum, AI timeouts, health checks |
| Performance | Compression, MobileNetV3, indexes, pooling, model preload |
| Scalability | Stateless API, separable AI workers |
| Maintainability | Monorepo modules, migrations, layer rules |
| Portability | Docker Compose, env-based config |
| Usability | Simple scan UX, consistent freshness colors, error toasts |
| Observability | `/health`, request timing logs, model_version on scans |

### 11.3 Architecture-Level Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI accuracy on real shops | Wrong stock/freshness | Confidence thresholds; UC-06 corrections; lighting tooltips |
| Missing tenant filter | Data breach | Repository convention; code review checklist; tests |
| AI overload | Failed scans | Timeout + FAILED state; scale AI replicas |
| Secret leakage in client | Account takeover | No AI keys in SPA; JWT only; HTTPS |
| Migration drift | Env inconsistency | `check-migrations` script; ordered migrations |
| License obligations (AGPL YOLO) | Compliance | Document usage; academic context; evaluate alternatives if productizing |

### 11.4 Health and Degraded Modes

| Condition | System behavior |
|-----------|-----------------|
| Postgres down | API returns 503; client shows outage; AI unused |
| AI down | CRUD/auth works; scans fail gracefully |
| SMTP down | Registration may succeed with resend path; reset delayed |
| Object storage down | Scan reject or fallback local disk (config) |

### 11.5 Degraded-Mode State Diagram

```
+======================================================================================+
|  Figure 33. System Operational State Machine (ASCII)                                   |
+======================================================================================+
|                                                                                      |
|                         +-------------------+                                        |
|                         |     HEALTHY       |                                        |
|                         | Auth+CRUD+Scan OK |                                        |
|                         +---------+---------+                                        |
|                                   |                                                  |
|              AI timeout/5xx       |       Postgres unreachable                       |
|                     +-------------+-------------+                                    |
|                     v                           v                                    |
|           +-------------------+       +-------------------+                          |
|           |  DEGRADED_AI      |       |  UNAVAILABLE_DB   |                          |
|           | Auth+CRUD OK      |       | All write/read    |                          |
|           | Scans -> FAILED   |       | APIs return 503   |                          |
|           | Banner: AI down   |       | Banner: outage    |                          |
|           +---------+---------+       +---------+---------+                          |
|                     |                           |                                    |
|              AI recovers                 DB recovers                                 |
|                     |                           |                                    |
|                     +-------------+-------------+                                    |
|                                   v                                                  |
|                         +-------------------+                                        |
|                         |     HEALTHY       |                                        |
|                         +-------------------+                                        |
|                                                                                      |
|  Parallel: SMTP_DEGRADED -- registration succeeds; verify/reset email delayed;       |
|            resend endpoints remain available when SMTP returns.                      |
|                                                                                      |
+======================================================================================+
```

**Figure 33** formalizes degraded modes so client banners and API status codes remain consistent under partial outages. Scan failure in `DEGRADED_AI` never mutates inventory.

### 11.6 Cross-Cutting Concerns Map

```
+======================================================================================+
|  Figure 34. Cross-Cutting Concerns Across Layers (ASCII)                               |
+======================================================================================+
|                                                                                      |
|  Concern          Client              Server                 AI Service              |
|  ---------------  ------------------  ---------------------  ----------------------  |
|  AuthN            store JWT; attach   verify JWT; roles      none (trusted caller)   |
|  AuthZ            hide admin routes   RBAC + tenant filter   N/A                     |
|  Validation       form UX             Zod schemas            Pydantic schemas        |
|  Logging          console/errors      requestId + duration   model_version + ms      |
|  Errors           toast / page        problem+json style     HTTPException map       |
|  Config           VITE_* env          dotenv / process.env   pydantic Settings       |
|  Health           optional poll       GET / or /health       GET /health             |
|  CORS             browser enforce     Helmet + CORS allow    internal-only prefer    |
|  Idempotency      disable double-tap  scan status machine    pure inference          |
|                                                                                      |
+======================================================================================+
```

**Figure 34** shows where each cross-cutting concern is owned. Notably, the AI service does not authenticate end users; the server is the trust boundary.

### 11.7 Module Interaction Diagram (Server Internal)

```
+======================================================================================+
|  Figure 35. Server Module Collaboration (ASCII)                                        |
+======================================================================================+
|                                                                                      |
|                    +---------------- auth.middleware ----------------+               |
|                    |  JWT verify -> attach req.user / req.business   |               |
|                    +----------+--------------------------+-----------+               |
|                               |                          |                           |
|               +---------------v---+          +-----------v-----------+               |
|               |  auth.module      |          |  scan.module          |               |
|               |  register/login   |          |  upload orchestrate   |               |
|               |  verify/reset     |          |  call AiClient        |               |
|               +---------+---------+          |  persist detections   |               |
|                         |                    +-----+----------+------+               |
|                         |                          |          |                      |
|                         v                          v          v                      |
|               +-----------------+        +--------------+  +----------------+        |
|               | business.module |        | inventory.mod|  | alerts.module  |        |
|               | invite employee |        | update qty   |  | evaluate rules |        |
|               | OWNER binding   |        | catalog CRUD |  | upsert alerts  |        |
|               +-----------------+        +------+-------+  +--------+-------+        |
|                                                 |                   |                |
|                         +-----------------------+-------------------+                |
|                         v                                                            |
|               +-----------------+        +--------------+                            |
|               | analytics.mod   |        | admin.module |                            |
|               | aggregates read |        | suspend user |                            |
|               +-----------------+        | platform KPI |                            |
|                                          +--------------+                            |
|                                                                                      |
|  Shared: entities/, config/data-source, shared/utils/email, AiClient HTTP wrapper    |
|                                                                                      |
+======================================================================================+
```

**Figure 35** shows how scan completion fans out into inventory and alerts, while auth/business remain independent vertical slices sharing only middleware and persistence.

### 11.8 REST API Surface Map (Architectural)

```
+======================================================================================+
|  Figure 36. Planned REST Surface Grouped by Bounded Context (ASCII)                   |
+======================================================================================+
|                                                                                      |
|  /auth/*          register | login | logout | verify-email | forgot | reset          |
|       |                                                                              |
|  /business/*      me | invite-employee | members                                     |
|       |                                                                              |
|  /products/*      CRUD catalog (tenant-scoped)                                       |
|       |                                                                              |
|  /scans/*         POST multipart | GET list | GET :id | PATCH correction             |
|       |                                                                              |
|  /inventory/*     GET snapshot | PATCH manual-adjust                                 |
|       |                                                                              |
|  /alerts/*        GET list | PATCH :id/read | GET unread-count                       |
|       |                                                                              |
|  /analytics/*     inventory-trend | freshness-summary | top-products                 |
|       |                                                                              |
|  /admin/*         vendors | suspend | platform-stats     (SYSTEM_ADMIN only)         |
|       |                                                                              |
|  /health          liveness/readiness (optional aggregate of AI ping)                 |
|                                                                                      |
|  Internal (server -> AI, not public):                                                |
|    POST {AI}/analysis   |  POST {AI}/detection  |  POST {AI}/predict  |  GET /health |
|                                                                                      |
+======================================================================================+
```

**Figure 36** is the architectural API map (not OpenAPI). Public clients never call AI routes; only the server’s `AiClient` may.

---

## 12. References (IEEE Style)

[1] SnapStock-AI Team, “Software Requirements Specification,” SnapStock-AI, Ver. 1.1, Jul. 2026. [Online]. Available: `docs/srs.md`

[2] SnapStock-AI Team, “Feasibility Report,” SnapStock-AI, Jul. 2026. [Online]. Available: `docs/feasability-report.md`

[3] SnapStock-AI Team, “Project Proposal: AI-Powered Automated Inventory and Freshness Monitoring System for Small-Scale Retailers,” University of Moratuwa, Jul. 3, 2026.

[4] SnapStock-AI Team, “Project Management Plan,” SnapStock-AI, Jul. 2026. [Online]. Available: `docs/project-management`

[5] Rational Software / IBM, “Software Architecture Document (RUP Template),” course materials, 2026.

[6] P. Kruchten, “Architectural Blueprints—The 4+1 View Model of Software Architecture,” *IEEE Software*, vol. 12, no. 6, pp. 42–50, Nov. 1995, doi: 10.1109/52.469759.

[7] IEEE Computer Society, *IEEE Recommended Practice for Software Requirements Specifications*, IEEE Std 830-1998, Oct. 1998.

[8] M. Fowler, *Patterns of Enterprise Application Architecture*. Boston, MA, USA: Addison-Wesley, 2002.

[9] Ultralytics, “YOLOv8 Documentation.” [Online]. Available: https://docs.ultralytics.com/ (accessed Jul. 1, 2026).

[10] FastAPI Contributors, “FastAPI Documentation.” [Online]. Available: https://fastapi.tiangolo.com/ (accessed Jul. 1, 2026).

[11] OpenJS Foundation, “Express — Node.js web application framework.” [Online]. Available: https://expressjs.com/ (accessed Jul. 1, 2026).

[12] PostgreSQL Global Development Group, “PostgreSQL 16 Documentation.” [Online]. Available: https://www.postgresql.org/docs/16/ (accessed Jul. 1, 2026).

[13] TypeORM Contributors, “TypeORM Documentation.” [Online]. Available: https://typeorm.io/ (accessed Jul. 10, 2026).

[14] IETF, “JSON Web Token (JWT),” RFC 7519, May 2015. [Online]. Available: https://www.rfc-editor.org/rfc/rfc7519

[15] A. Nayak, “Fruit-Detection-Freshness-Analysis,” GitHub. [Online]. Available: https://github.com/anmol2nayak/Fruit-Detection-Freshness-Analysis (accessed Jun. 21, 2026).

[16] TensorFlow, “TensorFlow Documentation.” [Online]. Available: https://www.tensorflow.org/ (accessed Jun. 29, 2026).

[17] OpenCV Team, “OpenCV Documentation.” [Online]. Available: https://opencv.org/ (accessed Jun. 30, 2026).

[18] S. Newman, *Building Microservices*, 2nd ed. Sebastopol, CA, USA: O’Reilly Media, 2021.

[19] OWASP Foundation, “OWASP Top Ten.” [Online]. Available: https://owasp.org/www-project-top-ten/ (accessed Jul. 15, 2026).

[20] Docker Inc., “Docker Compose Specification.” [Online]. Available: https://docs.docker.com/compose/ (accessed Jul. 15, 2026).

[21] React Team, “React Documentation.” [Online]. Available: https://react.dev/ (accessed Jul. 15, 2026).

[22] Vite Contributors, “Vite Documentation.” [Online]. Available: https://vitejs.dev/ (accessed Jul. 15, 2026).

---

### Document Control

| Item | Value |
|------|-------|
| Title | SnapStock-AI Software Architecture Document |
| Version | 1.1 |
| Date | 25 July 2026 |
| Authors | ABEYWARDANA S.M. (230011P); ANDRAHENNADI N.J. (230042K); ATHTHANAYAKE A.M.R.N (230062V) |
| Mentor | Mr. Kavinda Rajapaksha |
| Diagram tools | ASCII art (current); draw.io / PlantUML (planned) |
| Classification | Academic project documentation |

---

*End of Software Architecture Document*