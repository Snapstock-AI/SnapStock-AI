# SnapStock-AI
## Software Requirements Specification
### For the Complete System

**AI-Powered Automated Inventory and Freshness Monitoring System for Small-Scale Retailers**

| Field | Value |
|-------|-------|
| **Document Title** | Software Requirements Specification (SRS) |
| **Project Name** | SnapStock-AI |
| **Version** | 1.1 |
| **Status** | Baseline for Sprint 4 submission |
| **Date** | 25 July 2026 |
| **SRS Due Date** | 09 August 2026 |
| **Project Timeline** | 01 July 2026 – 03 October 2026 (9 sprints) |
| **Mentor** | Mr. Kavinda Rajapaksha |
| **PID** | 5 |

### Prepared by

| Name | Index No. |
|------|-----------|
| ABEYWARDANA S.M. | 230011P |
| ANDRAHENNADI N.J. | 230042K |
| ATHTHANAYAKE A.M.R.N | 230062V |

**Organization:** Undergraduate Software Engineering Capstone Project

**Classification:** Academic deliverable — not a certified food-safety inspection instrument

---

## Revision History

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 25 Jul 2026 | 1.0 | Initial SRS draft aligned to proposal and feasibility | SnapStock-AI Team |
| 25 Jul 2026 | 1.1 | Comprehensive IEEE 830 / RUP expansion: detailed FR flows, NFR metrics, UI wireframe descriptions, DB schemas, API inventory, traceability, appendices | SnapStock-AI Team |

---

## Table of Contents

1. [Introduction](#1-introduction)
   - 1.1 [Purpose](#11-purpose)
   - 1.2 [Scope](#12-scope)
   - 1.3 [Definitions, Acronyms, and Abbreviations](#13-definitions-acronyms-and-abbreviations)
   - 1.4 [References](#14-references)
   - 1.5 [Overview](#15-overview)
2. [Overall Description](#2-overall-description)
   - 2.1 [Product Perspective](#21-product-perspective)
   - 2.2 [Product Functions](#22-product-functions)
   - 2.3 [User Characteristics](#23-user-characteristics)
   - 2.4 [Operating Environment](#24-operating-environment)
   - 2.5 [Constraints](#25-constraints)
   - 2.6 [Assumptions and Dependencies](#26-assumptions-and-dependencies)
   - 2.7 [Requirements Subsets and Prioritization](#27-requirements-subsets-and-prioritization)
3. [Specific Requirements](#3-specific-requirements)
   - 3.1 [Functionality](#31-functionality)
     - 3.1.1 [Authentication and Session Management](#311-authentication-and-session-management)
     - 3.1.2 [Multi-Tenant Business Management and RBAC](#312-multi-tenant-business-management-and-rbac)
     - 3.1.3 [Image Capture and Scan Submission](#313-image-capture-and-scan-submission)
     - 3.1.4 [Product Detection and Counting](#314-product-detection-and-counting)
     - 3.1.5 [Freshness Classification](#315-freshness-classification)
     - 3.1.6 [Inventory and Product Catalog](#316-inventory-and-product-catalog)
     - 3.1.7 [Alerts and Notifications](#317-alerts-and-notifications)
     - 3.1.8 [Analytics and Reporting](#318-analytics-and-reporting)
     - 3.1.9 [Admin Portal](#319-admin-portal)
     - 3.1.10 [Settings and Profile](#3110-settings-and-profile)
     - 3.1.11 [Health Checks and Degraded Modes](#3111-health-checks-and-degraded-modes)
   - 3.2 [Usability](#32-usability)
   - 3.3 [Reliability](#33-reliability)
   - 3.4 [Performance and Security](#34-performance-and-security)
   - 3.5 [Supportability](#35-supportability)
   - 3.6 [Design Constraints](#36-design-constraints)
   - 3.7 [On-line User Documentation and Help System Requirements](#37-on-line-user-documentation-and-help-system-requirements)
   - 3.8 [Purchased Components](#38-purchased-components)
   - 3.9 [Interfaces](#39-interfaces)
   - 3.10 [Database Requirements](#310-database-requirements)
   - 3.11 [Licensing, Legal, Copyright, and Other Notices](#311-licensing-legal-copyright-and-other-notices)
   - 3.12 [Applicable Standards](#312-applicable-standards)
4. [Supporting Information](#4-supporting-information)
   - 4.1 [Requirement Traceability Matrix](#41-requirement-traceability-matrix)
   - 4.2 [Appendices](#42-appendices)
     - Appendix A — Sample API JSON (**part of requirements**)
     - Appendix B — Data Dictionary (**part of requirements**)
     - Appendix C — MoSCoW Table (**part of requirements**)
     - Appendix D — Open Issues / TBD (**not part of requirements**)

---

## 1. Introduction

The introduction of this Software Requirements Specification (SRS) provides an overview of the complete requirements baseline for SnapStock-AI. It states the purpose of the document, defines product scope (including explicit inclusions and exclusions), provides a glossary of terms used throughout, lists all referenced materials in IEEE citation style, and explains how the remainder of the document is organized.

This SRS follows the structure recommended by IEEE Std 830-1998 and the Rational Unified Process (RUP) Software Requirements Specification template for natural-language requirements **without use-case modeling diagrams**. Functional behavior is elaborated through numbered shall statements, detailed main/alternate flows, business rules, and acceptance criteria suitable for design, implementation, and verification [7], [8].

### 1.1 Purpose

The purpose of this SRS is to fully describe the external behavior of **SnapStock-AI**, an AI-powered Software-as-a-Service (SaaS) platform that helps small-scale retailers manage perishable inventory (primarily fruits and vegetables) through smartphone or webcam image capture, automated product detection and counting, freshness classification, inventory dashboards, and alerting.

Specifically, this document shall:

1. Provide designers and architects with an unambiguous statement of required capabilities and constraints for producing the Software Architecture Document (SAD) and detailed design artifacts.
2. Provide developers with implementable shall-statements covering authentication, multi-tenancy, scanning, AI inference integration, inventory, alerts, analytics, administration, settings, and operational health.
3. Provide testers with measurable acceptance criteria, performance targets, reliability metrics, and defect severity definitions against which verification can be planned and executed.
4. Provide the academic mentor, evaluators, and Progress Review panels with a single authoritative requirements baseline for the period 01 July 2026 through 03 October 2026.
5. Capture non-functional requirements (usability, reliability, performance, security, supportability), design constraints, interface specifications, database requirements, and legal notices necessary for a complete description of the software.

**Intended audiences** include: the SnapStock-AI development team; the project mentor (Mr. Kavinda Rajapaksha); course supervisors and evaluators; and future maintainers who may extend the prototype after the academic delivery window.

This SRS does **not** prescribe internal algorithms beyond those needed to constrain observable behavior (for example, required freshness classes and minimum accuracy thresholds). Detailed model architecture choices appear in the Software Architecture Document [2] and related design notes.

### 1.2 Scope

#### 1.2.1 Product Identification

**Product name:** SnapStock-AI

**Full title:** AI-Powered Automated Inventory and Freshness Monitoring System for Small-Scale Retailers

**Product type:** Multi-tenant web-based SaaS prototype comprising a responsive React client, a Node.js/Express REST API, a Python FastAPI AI microservice, and a PostgreSQL database, orchestrated with Docker Compose.

#### 1.2.2 Application of this SRS

This SRS applies to the complete SnapStock-AI system as delivered for the undergraduate project, including:

- `client/` — React 19 + TypeScript + Vite + Tailwind CSS responsive web application (vendor and admin UIs in one client with role-based routing).
- `server/` — Node.js Express API with TypeORM, JWT authentication, Zod validation, Helmet, and business logic.
- `ai-service/` — Python FastAPI service hosting YOLOv8 object detection and MobileNetV3/CNN freshness classification.
- `postgres` — PostgreSQL relational store for multi-tenant domain data.
- Supporting deployment artifacts (Docker Compose, environment configuration templates, health endpoints).

#### 1.2.3 In Scope

The following capabilities are **in scope** for the 01 Jul – 03 Oct 2026 delivery:

1. User registration, login, logout, email verification, password reset, and JWT-based session management.
2. Multi-tenant business onboarding with business_id isolation and roles OWNER, EMPLOYEE, and system ADMIN.
3. Employee invitation by business owners and role-based access control (RBAC) enforcement.
4. Image capture (camera or file picker), client-side preview and compression, upload, and scan metadata persistence.
5. Server-mediated AI inference: YOLOv8 detection/counting and Fresh / Medium / Spoiled freshness classification with confidence scores.
6. Persistence of scans and detections; inventory auto-update from successful scans; manual inventory adjustment; product catalog management.
7. Low-stock and spoilage alerts with filtering and read/unread tracking.
8. Vendor analytics (charts, trends, filters); CSV/PDF export as a stretch goal.
9. Admin portal for vendor management, health visibility, and platform-level statistics.
10. User/profile settings; health-check endpoints and defined degraded-mode behavior.
11. Responsive UI for mobile browsers and desktop; documentation and help content as specified in Section 3.7.

#### 1.2.4 Out of Scope

The following are **explicitly out of scope** for this academic prototype:

1. Physical IoT sensors, RFID, barcode scanners as primary capture path, or smart scales.
2. Automatic procurement, purchase-order generation, or supplier marketplace integration.
3. End-to-end supply-chain tracking across warehouses and distributors.
4. Financial accounting, point-of-sale (POS) checkout, payroll, or tax filing modules.
5. Certified food-safety laboratory testing or regulatory inspection replacement.
6. Native iOS/Android store applications (responsive web only; PWA packaging not required).
7. Real-time multi-camera continuous video streams.
8. Full Sinhala/Tamil localization in the MVP (future-language notes under usability).
9. Enterprise SSO (SAML/OIDC federation) and multi-region active-active hosting.

#### 1.2.5 Benefits and Objectives (Context)

While Section 2 elaborates product functions, the scope is motivated by the project objectives [1], [3]: reduce manual counting errors; provide freshness visibility from ordinary smartphone images; deliver actionable low-stock and spoilage alerts; and offer small retailers data-driven inventory insights without enterprise ERP cost.

### 1.3 Definitions, Acronyms, and Abbreviations

The following glossary defines terms used in this SRS. Terms are listed alphabetically. Where a term has a project-specific meaning, that meaning prevails over general industry usage.

| Term / Acronym | Definition |
|----------------|------------|
| **Acceptance Criteria** | Checklist conditions that must be true for a requirement to be considered satisfied in verification. |
| **ADMIN** | System-level role that manages vendors and platform statistics; not limited to a single business tenant. |
| **AI Service** | The Python FastAPI microservice that performs object detection and freshness classification. |
| **Alert** | A persisted notification about low stock or spoilage/freshness deterioration for a business. |
| **API** | Application Programming Interface — here, primarily REST/JSON endpoints. |
| **bcrypt** | Password hashing algorithm used to store password hashes with a configurable cost factor. |
| **Bounding Box** | Rectangle coordinates returned by the detector indicating where an object appears in an image. |
| **business_id** | Primary tenant key isolating data belonging to one retailer business. |
| **Business Owner (OWNER)** | Vendor role with full control of a business tenant, including employee invites and catalog settings. |
| **CNN** | Convolutional Neural Network used for image classification (freshness). |
| **Confidence Score** | Numeric value in [0.0, 1.0] expressing model certainty for a detection or classification. |
| **CORS** | Cross-Origin Resource Sharing — browser security mechanism controlling which origins may call the API. |
| **CRUD** | Create, Read, Update, Delete operations on a resource. |
| **Degraded Mode** | Reduced functionality when a dependency (e.g., AI service) is unavailable. |
| **Detection** | A single AI-identified product instance or product-group result linked to a scan. |
| **Docker Compose** | Tool for defining and running multi-container Docker applications. |
| **EMPLOYEE** | Vendor role with access to operational features of one business, without ownership privileges. |
| **Express** | Node.js web application framework used for the REST API server. |
| **F1-score** | Harmonic mean of precision and recall used to evaluate classification quality. |
| **FastAPI** | Python web framework used for the AI microservice. |
| **Fresh** | Freshness class indicating produce appears suitable for sale with no significant spoilage cues. |
| **Freshness Classification** | Assignment of Fresh, Medium, or Spoiled to detected produce. |
| **Helmet** | Express middleware that sets security-related HTTP headers. |
| **Inference** | Execution of a trained ML model on new input to produce predictions. |
| **Inventory** | Current recorded stock state per product for a business, including quantity and freshness summary. |
| **JWT** | JSON Web Token (RFC 7519) used for stateless authentication [10]. |
| **Low-Stock Threshold** | Configurable quantity below which a low-stock alert is generated. |
| **mAP@0.5** | Mean Average Precision at IoU threshold 0.5 — detection quality metric. |
| **Medium** | Freshness class indicating partial quality decline; sell-soon / monitor closely. |
| **MobileNetV3** | Lightweight CNN architecture planned for freshness classification [33]. |
| **MoSCoW** | Prioritization method: Must, Should, Could, Won't (for this release). |
| **MTBF** | Mean Time Between Failures. |
| **MTTR** | Mean Time To Repair (restore service after failure). |
| **Multi-tenant** | Architecture where multiple businesses share one deployment with strict data isolation. |
| **NFR** | Non-Functional Requirement. |
| **OWNER** | See Business Owner. |
| **PostgreSQL** | Relational database management system used for persistence. |
| **Product Catalog** | Business-scoped list of tracked products with metadata and thresholds. |
| **RBAC** | Role-Based Access Control. |
| **REST** | Representational State Transfer — architectural style for HTTP APIs. |
| **SaaS** | Software as a Service. |
| **Scan** | One image capture/upload session submitted for AI analysis and inventory update. |
| **Shall** | Imperative used in requirements to denote a mandatory obligation (IEEE 830 style). |
| **Soft Delete** | Logical deletion via deleted_at rather than physical row removal. |
| **Spoiled** | Freshness class indicating produce shows clear spoilage cues and should not be sold as fresh. |
| **Sprint** | Time-boxed iteration in the project schedule (nine sprints total). |
| **Tenant** | Synonym for an isolated business account identified by business_id. |
| **TypeORM** | Object-Relational Mapper used by the Node.js server with PostgreSQL. |
| **Vendor** | Small-scale retailer user (OWNER or EMPLOYEE) of a business tenant. |
| **Vite** | Frontend build tool and development server. |
| **YOLOv8** | You Only Look Once version 8 — real-time object detection model family (Ultralytics) [20], [32]. |
| **Zod** | TypeScript-first schema validation library used on API inputs. |

*Glossary count: 52 terms.*

### 1.4 References

References are cited in IEEE style. Web resources include an accessed-on date.

#### 1.4.1 Project Documents

[1] SnapStock-AI Team, “Project Proposal: AI-Powered Automated Inventory and Freshness Monitoring System for Small-Scale Retailers,” undergraduate project proposal, PID 5, Jul 3, 2026.

[2] SnapStock-AI Team, “Software Architecture Document (SAD), SnapStock-AI,” Version 1.0, Jul. 25, 2026.

[3] SnapStock-AI Team, “Feasibility Report: SnapStockAI,” Jul. 2026.

[4] SnapStock-AI Team, “Project Management Plan,” Jul. 2026. (Document file: `docs/project-management`).

[5] SnapStock-AI Team, “Kanban Issue Blueprint,” project backlog guidance, Jul. 2026. (Document file: `docs/KANBAN_ISSUE_BLUEPRINT.md`).

[6] SnapStock-AI Team, “Project Overview Notes,” Jul. 2026. (Document file: `docs/project.md`).

#### 1.4.2 Standards and Process References

[7] IEEE, *IEEE Recommended Practice for Software Requirements Specifications*, IEEE Std 830-1998, 1998.

[8] Rational Software / IBM, “Software Requirements Specification Template (RUP),” Rational Unified Process artifact template.

[9] P. Kruchten, “The 4+1 View Model of Architecture,” *IEEE Software*, vol. 12, no. 6, pp. 42–50, Nov. 1995.

[10] M. Jones, J. Bradley, and N. Sakimura, “JSON Web Token (JWT),” RFC 7519, IETF, May 2015. [Online]. Available: https://datatracker.ietf.org/doc/html/rfc7519 (Accessed on Jul. 20, 2026).

[11] OWASP Foundation, “OWASP Top Ten,” 2021. [Online]. Available: https://owasp.org/www-project-top-ten/ (Accessed on Jul. 20, 2026).

[12] Parliament of the Democratic Socialist Republic of Sri Lanka, *Food Act, No. 26 of 1980*, as amended.

#### 1.4.3 Tools, Frameworks, and Datasets

[13] Meta Platforms, Inc., “React Documentation.” [Online]. Available: https://react.dev/ (Accessed on Jul. 15, 2026).

[14] Vite Team, “Vite Documentation.” [Online]. Available: https://vitejs.dev/ (Accessed on Jul. 15, 2026).

[15] Tailwind Labs, “Tailwind CSS Documentation.” [Online]. Available: https://tailwindcss.com/docs (Accessed on Jul. 15, 2026).

[16] OpenJS Foundation, “Express — Node.js web application framework.” [Online]. Available: https://expressjs.com/ (Accessed on Jul. 15, 2026).

[17] TypeORM, “TypeORM Documentation.” [Online]. Available: https://typeorm.io/ (Accessed on Jul. 15, 2026).

[18] PostgreSQL Global Development Group, “PostgreSQL Documentation.” [Online]. Available: https://www.postgresql.org/docs/ (Accessed on Jul. 15, 2026).

[19] S. Ramírez, “FastAPI Documentation.” [Online]. Available: https://fastapi.tiangolo.com/ (Accessed on Jul. 15, 2026).

[20] Ultralytics, “YOLOv8 Documentation.” [Online]. Available: https://docs.ultralytics.com/ (Accessed on Jul. 1, 2026).

[21] TensorFlow, “TensorFlow Documentation.” [Online]. Available: https://www.tensorflow.org/ (Accessed on Jun. 29, 2026).

[22] PyTorch Foundation, “PyTorch Documentation.” [Online]. Available: https://pytorch.org/docs/stable/index.html (Accessed on Jul. 10, 2026).

[23] OpenCV Team, “OpenCV Documentation.” [Online]. Available: https://opencv.org/ (Accessed on Jun. 30, 2026).

[24] Docker Inc., “Docker Compose Documentation.” [Online]. Available: https://docs.docker.com/compose/ (Accessed on Jul. 12, 2026).

[25] Collet, “Fruits-360 Dataset,” Kaggle. [Online]. Available: https://www.kaggle.com/datasets/moltean/fruits (Accessed on Jul. 8, 2026).

[26] Sriram, “Fruits fresh and rotten for classification,” Kaggle. [Online]. Available: https://www.kaggle.com/sriramr/fruits-fresh-and-rotten-for-classification (Accessed on Jul. 8, 2026).

#### 1.4.4 Related Systems and Research

[27] A. Nayak, “Fruit-Detection-Freshness-Analysis,” GitHub repository. [Online]. Available: https://github.com/anmol2nayak/Fruit-Detection-Freshness-Analysis (Accessed on Jun. 21, 2026).

[28] E. Yegon, “FreshHarvest,” GitHub repository. [Online]. Available: https://github.com/erickyegon/FreshHarvest (Accessed on Jun. 21, 2026).

[29] SAP, “SAP for Retail.” [Online]. Available: https://www.sap.com/industries/retail.html (Accessed on Jul. 1, 2026).

[30] Block, Inc., “Square for Retail.” [Online]. Available: https://squareup.com/us/en/retail (Accessed on Jul. 1, 2026).

[31] Afresh Technologies, “AI-Powered Fresh Food Platform.” [Online]. Available: https://www.afresh.com/platform/intelligent-inventory (Accessed on Jul. 1, 2026).

[32] J. Redmon, S. Divvala, R. Girshick, and A. Farhadi, “You Only Look Once: Unified, Real-Time Object Detection,” in *Proc. IEEE Conf. Computer Vision and Pattern Recognition (CVPR)*, 2016.

[33] A. Howard et al., “Searching for MobileNetV3,” in *Proc. IEEE/CVF Int. Conf. Computer Vision (ICCV)*, 2019.

### 1.5 Overview

The remainder of this SRS is organized as follows:

- **Section 2 — Overall Description** presents product perspective (including a context diagram and competitive comparison), product functions by module, user characteristics, operating environment, constraints, assumptions/dependencies, and MoSCoW prioritization mapped to milestones M1–M5 and sprints.
- **Section 3 — Specific Requirements** is the normative bulk of the document. It specifies functional requirements (3.1) with detailed flows and acceptance criteria; usability (3.2); reliability (3.3); performance and security (3.4); supportability (3.5); design constraints (3.6); online help (3.7); purchased/OSS components (3.8); interfaces including UI wireframe descriptions and REST endpoint inventory (3.9); database schemas (3.10); licensing and legal notices (3.11); and applicable standards (3.12).
- **Section 4 — Supporting Information** provides a traceability matrix and appendices. Each appendix explicitly states whether it is part of the requirements baseline.

**Normative language:** Requirements use “shall” for mandatory obligations, “should” for recommended but not mandatory items in this release, and “may” for optional/stretch capabilities. Priority labels Must/Should/Could align with MoSCoW (Section 2.7).

---

## 2. Overall Description

This section describes general factors that affect the product and its requirements. It does not state specific testable shall-statements (those appear in Section 3); instead it provides background that makes Section 3 easier to interpret.

### 2.1 Product Perspective

#### 2.1.1 System Context

SnapStock-AI is a **new standalone SaaS product**, not a plug-in to an existing ERP. It is designed for small produce retailers who cannot afford enterprise retail platforms or IoT sensor deployments. The product uses devices retailers already own (smartphones/webcams) and a browser-based UI.

External actors and systems interacting with SnapStock-AI include: Vendor users (OWNER/EMPLOYEE), System Administrators, SMTP email providers (transactional mail), optional object/file storage for images, and (indirectly) public ML datasets used only during offline training—not at runtime.

#### 2.1.2 Context Diagram (ASCII)

```
+------------------+         HTTPS / REST / JSON          +------------------------+
| Vendor Browser   | <----------------------------------> | Express API (Node.js)  |
| (React Client)   |         multipart image upload       | TypeORM + JWT + Zod    |
+--------+---------+                                      +----+-------------+-----+
         |                                                     |             |
         | getUserMedia / file                                 |             |
         v                                                     |             |
+--------+---------+                                      +----v-----+  +----v-----+
| Device Camera /  |                                      |PostgreSQL|  | AI Svc   |
| Image Gallery    |                                      |  (DB)    |  | FastAPI  |
+------------------+                                      +----------+  | YOLO+CNN |
                                                                        +----+-----+
+------------------+         HTTPS / REST                                    |
| Admin Browser    | <----------------------------------> (same API; RBAC)   |
| (React Admin UI) |                                                         |
+------------------+                                                         v
                                                                   Model files
                                                                   (server disk)
+------------------+
| SMTP Provider    | <---- transactional email (verify / reset) ---- (API)
+------------------+
```

#### 2.1.3 Comparison with Existing Systems

The following comparison summarizes how SnapStock-AI differentiates from representative alternatives identified in the proposal and feasibility study [1], [3], [29]–[31]:

| Dimension | SAP Retail [29] | Square for Retail [30] | Afresh [31] | SnapStock-AI (this project) |
|-----------|-----------------|------------------------|-------------|-------------------------------|
| Target user | Large enterprise retail | SMB retail with POS focus | Enterprise fresh-food ops | Small-scale produce retailers |
| Licensing / cost | High enterprise licensing | Subscription + hardware ecosystem | Enterprise contracts | Academic OSS prototype; low future SaaS cost intent |
| Setup complexity | High (ERP-class) | Medium | High | Low (browser + camera) |
| Visual freshness AI | Not built-in for stall-level smartphone scans | No AI visual inspection | Strong fresh ops AI; not small-vendor first | YOLOv8 + MobileNetV3/CNN freshness classes |
| Inventory entry | Integrated enterprise processes | Manual / barcode-centric | Enterprise integrations | Image-first counting + optional manual adjust |
| Multi-tenant SaaS for micro vendors | Enterprise tenancy models | Merchant accounts | Enterprise | Explicit `business_id` tenancy for small shops |
| IoT dependency | Often paired with enterprise hardware | Optional hardware | Often richer data sources | No IoT required |

**Positioning statement:** SnapStock-AI occupies the gap between research-only detection notebooks [27], [28] and expensive enterprise fresh-inventory platforms by packaging detection + freshness + inventory + alerts as an accessible multi-tenant web product.

#### 2.1.4 Major Interfaces (Perspective Summary)

From a product perspective, the major interface classes are: (a) human–computer interfaces in the React client; (b) REST software interfaces among client, API, and AI service; (c) hardware interfaces limited to browser camera/file APIs; (d) communications over HTTPS/HTTP within a Docker network; and (e) SMTP for email. Detailed requirements for each appear in Section 3.9.

#### 2.1.5 Boundary and Shared Services

SnapStock-AI owns the application UI, API, AI inference orchestration, and tenant data model. It does not own the SMTP provider, the end-user device OS, or the public dataset hosts. Image bytes may be stored on local disk within the Docker volume for the prototype; an S3-compatible store may be introduced later without changing functional requirements for scan submission.

### 2.2 Product Functions

Product functions are grouped by deployable module. Section 3.1 elaborates each function as detailed requirements.

#### 2.2.1 Feature Inventory by Module

| Module | Feature ID (logical) | Feature Summary | Primary Roles |
|--------|----------------------|-----------------|---------------|
| Client | F-AUTH | Register, login, logout, verify email, reset password | All users |
| Client | F-SCAN | Capture/select image, preview, compress, upload, view scan result | OWNER, EMPLOYEE |
| Client | F-INV | Inventory table, search/filter, manual adjust, catalog forms | OWNER, EMPLOYEE (catalog write: OWNER) |
| Client | F-ALERT | Alert list, severity badges, filters, mark read | OWNER, EMPLOYEE |
| Client | F-ANALYTICS | Charts, trends, date filters, export (stretch) | OWNER, EMPLOYEE, ADMIN |
| Client | F-SETTINGS | Profile, password change, business details, notification prefs | OWNER, EMPLOYEE |
| Client | F-ADMIN | Vendor list, suspend/activate, platform stats, health panels | ADMIN |
| Server | F-API-AUTH | JWT issuance/validation, bcrypt hashing, Zod validation | System |
| Server | F-API-TENANT | Business create, invite, RBAC middleware, tenant scoping | System |
| Server | F-API-SCAN | Multipart upload, scan orchestration, persistence | System |
| Server | F-API-INV | Inventory CRUD, auto-update transactions | System |
| Server | F-API-ALERT | Alert generation rules, query APIs | System |
| Server | F-API-ADMIN | Admin-only vendor and stats endpoints | System |
| Server | F-HEALTH | `/health` liveness/readiness, degraded flags | System |
| AI Service | F-DET | YOLOv8 detection, labels, boxes, counts, confidence | System |
| AI Service | F-FRESH | Fresh/Medium/Spoiled classification + confidence | System |
| AI Service | F-AI-HEALTH | Model-loaded health indicator | System |
| Database | F-DATA | Multi-tenant schemas, indexes, soft deletes | System |

#### 2.2.2 End-to-End Functional Narrative

A typical successful day for a vendor owner proceeds as follows (narrative only; normative flows are in Section 3.1): the owner registers and verifies email; completes business profile; optionally invites an employee; captures a produce image from the stall; reviews AI counts and freshness; confirms or corrects results; sees inventory and alerts update; and later reviews analytics trends to decide discounting or restocking.

#### 2.2.3 Functional Decomposition Notes

Functions are intentionally separated so that the AI microservice can evolve independently of the Express API. Inventory correctness depends on transactional updates after AI results are accepted by the server. Alerts are derived data: they are generated from inventory and freshness rules rather than entered manually as primary facts.

### 2.3 User Characteristics

#### 2.3.1 Vendor Owner (OWNER)

| Attribute | Description |
|-----------|-------------|
| **Goals** | Keep accurate stock counts; reduce spoilage waste; know when to discount or discard; invite trusted staff; configure thresholds. |
| **Domain knowledge** | High familiarity with produce quality by sight/smell; may lack formal inventory-process training. |
| **Technical skills** | Low to medium; comfortable with smartphone cameras and messaging apps; may be new to SaaS dashboards. |
| **Education / language** | Variable; English UI for MVP; future Sinhala/Tamil desirable (see 3.2). |
| **Frequency of use** | Multiple times per day during receiving and end-of-day checks. |
| **Risk tolerance** | Low tolerance for data loss; medium tolerance for occasional AI misclassification if correction is easy. |

#### 2.3.2 Vendor Employee (EMPLOYEE)

| Attribute | Description |
|-----------|-------------|
| **Goals** | Perform scans quickly; view inventory and alerts; avoid accidental business-configuration changes. |
| **Domain knowledge** | Practical stall operations; follows owner instructions. |
| **Technical skills** | Low to medium; primarily mobile browser usage. |
| **Frequency of use** | High during shift; bursty around deliveries. |
| **Permissions expectation** | Operational access without ownership controls (invite, destructive catalog delete). |

#### 2.3.3 System Administrator (ADMIN)

| Attribute | Description |
|-----------|-------------|
| **Goals** | Oversee vendor accounts; monitor platform health; review aggregate usage; suspend abusive or inactive accounts. |
| **Domain knowledge** | Platform operations; basic understanding of AI pipeline health. |
| **Technical skills** | Medium to high; comfortable with web admin consoles and interpreting status metrics. |
| **Frequency of use** | Periodic daily/weekly checks; on-demand during incidents. |

#### 2.3.4 User Diversity Considerations

Users may operate in bright outdoor markets or dim indoor stalls; the UI shall provide capture guidance (Section 3.2, 3.7) rather than assuming studio lighting. Users may share a single stall device; therefore logout and session expiry are important. Administrators are not expected to be machine-learning experts; health panels shall use plain-language status indicators.

### 2.4 Operating Environment

#### 2.4.1 Client Environment

| Item | Requirement |
|------|-------------|
| Device types | Android/iOS smartphones, tablets, Windows/macOS/Linux desktops |
| Browsers | Chrome 100+, Firefox 100+, Safari 15+, Edge 100+ |
| Display | Minimum viewport width 360 px; desktop layouts from 1024 px |
| Camera | Rear camera ≥ 5 MP recommended; webcam acceptable for demos |
| Network | Persistent connectivity for scan upload and dashboard; ≥ 1 Mbps upload recommended |

#### 2.4.2 Server / Deployment Environment

| Item | Requirement |
|------|-------------|
| Runtime | Docker Engine + Docker Compose on Linux VM or developer machines |
| Services | `client` (or static nginx), `server`, `ai-service`, `postgres` |
| Database | PostgreSQL 15+ (containerized) |
| AI compute | CPU inference acceptable for prototype; GPU optional if available |
| Clock sync | NTP-synced hosts for token expiry and audit timestamps |

#### 2.4.3 Development Environment

Developers shall use Git/GitHub for version control, Node.js LTS for client/server, Python 3.10+ for AI service, and VS Code or equivalent editors. pgAdmin and Postman (or Insomnia) are recommended for database and API debugging [4].

### 2.5 Constraints

#### 2.5.1 Schedule Constraints

| Constraint | Detail |
|------------|--------|
| Overall window | 01 Jul 2026 – 03 Oct 2026 |
| Sprint count | 9 sprints [4] |
| SRS / SAD due | 09 August 2026 |
| Progress Review 1 | 10–14 August 2026 |
| Mid evaluation | 15–30 August 2026 |
| Testing document | 27 September 2026 |
| Final resources / report | 03 October 2026 |

Schedule constraint implication: features labeled Could/Won't for this release must not block Must-priority MVP completion.

#### 2.5.2 Technology Constraints

1. Stack is mandated as React 19 + TypeScript + Vite + Tailwind; Node.js Express + TypeORM + PostgreSQL; Python FastAPI AI with YOLOv8 + MobileNetV3/CNN; Docker Compose; JWT/bcrypt/Zod/Helmet.
2. Open-source components only for the academic build (see 3.8).
3. No assumption of client-side GPU; inference is server-side.
4. Public datasets [25], [26] are the primary training sources; shop-specific fine-tuning is optional if time permits.

#### 2.5.3 Legal and Ethical Constraints

1. The product shall present itself as an inventory decision-support tool, not a statutory food inspector [12].
2. Tenant business data shall be treated as confidential and isolated.
3. Dataset and OSS license obligations shall be respected (Section 3.8, 3.11).

#### 2.5.4 Academic and Team Constraints

1. Team size is three developers; parallelization across client/server/ai-service is required.
2. Deliverables must support demo video, final report, and evaluation presentation [4].
3. Prototype quality is expected; hyperscale production hardening is out of scope, but security basics (tenant isolation, auth, validation) remain mandatory.

### 2.6 Assumptions and Dependencies

#### 2.6.1 Assumptions

1. Users possess a smartphone or computer with a camera or image gallery and a modern browser.
2. Users can obtain internet connectivity during scan upload and dashboard use.
3. Produce of interest is primarily common fruits/vegetables represented sufficiently in training data for a demonstrable prototype.
4. Lighting conditions during demos can be controlled sufficiently to showcase the pipeline.
5. SMTP credentials or a development mail sink will be available for verification/reset emails (or a documented bypass for local demo if SMTP is unavailable—see Appendix D).
6. Mentors and evaluators will assess the system using scripted demo scenarios consistent with Must features.

#### 2.6.2 Dependencies

| Dependency | Impact if unavailable |
|------------|----------------------|
| PostgreSQL service | Full outage of persistent features |
| AI microservice | Scan analysis unavailable; degraded mode applies |
| SMTP provider | Email verification/reset delayed; local demo workaround may be required |
| Ultralytics YOLO / ML frameworks | AI training and inference blocked |
| Docker / Compose | Reproducible deployment impaired |
| GitHub | Collaboration and submission packaging impaired |
| Public datasets | Baseline model training delayed |

### 2.7 Requirements Subsets and Prioritization

#### 2.7.1 MoSCoW Definitions

| Priority | Meaning for SnapStock-AI |
|----------|--------------------------|
| **Must** | Required for MVP demo and academic acceptance of core value proposition |
| **Should** | Important for a polished mid/final evaluation; implement unless schedule risk is severe |
| **Could** | Desirable stretch; implement only after Must/Should are stable |
| **Won't (this release)** | Explicitly deferred beyond 03 Oct 2026 |

#### 2.7.2 Milestone Mapping (M1–M5)

| Milestone | Target Window | Focus | Representative Must Features |
|-----------|---------------|-------|------------------------------|
| **M1** | Sprint 3–4 (to 09 Aug 2026) | Requirements & design baseline | This SRS, SAD, API/DB drafts |
| **M2** | Sprint 5 (10–23 Aug) | Skeleton prototype | Auth shell, routing, DB schema, baseline model packaging |
| **M3** | Sprint 6 (24 Aug–06 Sep) | Core AI + scan loop | Upload, detection, freshness, inventory update |
| **M4** | Sprint 7 (07–20 Sep) | Feature-complete MVP | Alerts, analytics, admin basics, RBAC hardening |
| **M5** | Sprint 8–9 (21 Sep–03 Oct) | QA, demo, final package | Testing evidence, defect closure, demo video, final report |

#### 2.7.3 Priority-to-Sprint Mapping (Summary)

| Area | Must (Sprint) | Should (Sprint) | Could / Won't |
|------|---------------|-----------------|---------------|
| Auth + JWT | 5–6 | Email polish 6–7 | Social login (Won't) |
| Tenancy + RBAC | 5–6 | Invite email UX 6–7 | Fine-grained permissions matrix (Won't) |
| Scan pipeline | 6 | Compression tuning 6–7 | Offline queue (Won't) |
| Detection/Freshness | 6–7 | Manual correction 7 | Active learning pipeline (Won't) |
| Inventory/Catalog | 6–7 | Bulk edit 7–8 | Barcode assist (Won't) |
| Alerts | 7 | Email push alerts 8 | SMS (Won't) |
| Analytics | 7 | Export CSV 8 | PDF export (Could) |
| Admin | 7 | Health deep dive 8 | Anomaly ML on usage (Won't) |

Detailed MoSCoW rows for each FR appear in Appendix C (**part of requirements** for prioritization decisions).

---

## 3. Specific Requirements

This section contains all software requirements to a level of detail sufficient to enable designers to design a system that satisfies those requirements, and testers to verify that the system satisfies those requirements [7]. Requirements are expressed in natural language with structured fields. **Use-case diagrams are not used** in this SRS per course template rules [8].

Unless otherwise noted, “the system” means the SnapStock-AI client, API server, AI service, and database acting together.

### 3.1 Functionality

Functional requirements are organized by feature area. Each requirement includes an ID, priority, description, actors, preconditions, main flow, alternate/exception flows, postconditions, inputs/outputs, business rules, and acceptance criteria.

#### 3.1.1 Authentication and Session Management

This subsection covers registration, login, logout, email verification, password reset, and JWT session handling.

##### FR-AUTH-001: Vendor Registration

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-AUTH-001 |
| **Priority** | Must |
| **Actors** | Unauthenticated prospective Vendor (future OWNER) |

**Description.** The system shall allow a new vendor to register by providing personal and business identity fields. Upon successful validation, the system shall create a user account, a business (tenant) record, and a business_users association with role OWNER inside a single database transaction so that partial registration cannot leave orphan users without a business (or vice versa).

**Preconditions.**
1. The registration endpoint is reachable.
2. The provided email is not already registered to an active user.
3. Client can render the Signup page and submit HTTPS/HTTP JSON.

**Main Flow.**
1. User opens Signup page and enters full name, email, password, password confirmation, business name, address, and contact number; accepts terms checkbox.
2. Client validates required fields and password confirmation locally, then POSTs to `/api/auth/register`.
3. Server validates payload with Zod schema (email format, password policy, non-empty business name).
4. Server hashes password with bcrypt (cost ≥ 10) and does not store plaintext.
5. Server creates `users`, `businesses`, and `business_users` (role=OWNER) in one transaction.
6. Server generates an email verification token, stores its hash/expiry, and sends a verification email via SMTP (or logs token in development mode when configured).
7. Server returns HTTP 201 with user public profile and verification-required status (JWT may be withheld until verification per FR-AUTH-004 policy).
8. Client displays success message instructing the user to verify email before full dashboard access.

**Alternate / Exception Flows.**
- A1 Duplicate email: Server returns 409 Conflict; client shows “Email already registered.” No DB writes.
- A2 Validation failure: Server returns 400 with field errors; client highlights invalid fields.
- A3 SMTP failure: User and business still created; verification email marked pending; system logs error; user may request resend.
- A4 Transaction failure: All inserts roll back; client shows retryable error.

**Postconditions.**
1. On success: user exists with email_verified=false; business exists; OWNER membership exists.
2. Password is stored only as bcrypt hash.
3. No cross-tenant association is created.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | full_name |
| Input | email |
| Input | password |
| Input | business_name |
| Input | address |
| Input | contact_number |
| Input | terms_accepted=true |
| Output | user_id |
| Output | business_id |
| Output | email_verified=false |
| Output | message |
| Output | optional verification metadata for dev |

**Business Rules.**
1. Password shall be at least 8 characters and include at least one letter and one number.
2. Email shall be stored normalized to lowercase.
3. Terms acceptance is mandatory; registration shall reject terms_accepted=false.
4. First user of a newly created business shall always be OWNER.

**Acceptance Criteria.**
- [ ] Registering with unique valid data creates user + business + OWNER link.
- [ ] Duplicate email is rejected without creating a second business.
- [ ] Password column never contains plaintext.
- [ ] Response time average < 2 s under nominal load (see PERF-001).

The system shall implement FR-AUTH-001 (Vendor Registration) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-AUTH-002: User Login

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-AUTH-002 |
| **Priority** | Must |
| **Actors** | Vendor (OWNER/EMPLOYEE), ADMIN |

**Description.** The system shall authenticate users with email and password and issue a signed JWT access token containing subject user id, system role, and active business context claims as applicable. Failed logins shall not reveal whether the email exists beyond a generic error message.

**Preconditions.**
1. User account exists.
2. Account is not suspended.
3. For vendors, email verification policy is satisfied (see FR-AUTH-004) or a temporary allow-list is active in local demo mode documented in Appendix D.

**Main Flow.**
1. User opens Login page and enters email and password.
2. Client POSTs to `/api/auth/login`.
3. Server finds user by email, verifies bcrypt hash.
4. Server checks suspension and email_verified flags.
5. Server loads business membership(s); for vendors selects primary/active business_id.
6. Server issues JWT with expiry (default 24 hours) and returns token + public profile + role + business_id.
7. Client stores token in memory and/or localStorage and redirects to Dashboard Home (or Admin home for ADMIN).

**Alternate / Exception Flows.**
- A1 Invalid credentials: 401 with generic “Invalid email or password.”
- A2 Unverified email: 403 with code EMAIL_NOT_VERIFIED; client offers resend verification.
- A3 Suspended account: 403 with code ACCOUNT_SUSPENDED.
- A4 ADMIN login: no business_id required; redirect to Admin portal.

**Postconditions.**
1. On success, client holds a valid JWT for subsequent Authorization Bearer calls.
2. Failed attempts do not create sessions.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | email |
| Input | password |
| Output | access_token (JWT) |
| Output | user profile |
| Output | system_role |
| Output | business_role |
| Output | business_id (vendors) |

**Business Rules.**
1. JWT secret shall be loaded from environment configuration, not hardcoded in source.
2. Generic auth failure messages shall be used to reduce account enumeration.
3. Only one active business context is required for MVP (multi-business switching Won't).

**Acceptance Criteria.**
- [ ] Valid credentials return JWT and redirect to role-appropriate home.
- [ ] Wrong password returns 401 without token.
- [ ] Suspended user cannot obtain a usable token.

The system shall implement FR-AUTH-002 (User Login) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-AUTH-003: Logout

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-AUTH-003 |
| **Priority** | Must |
| **Actors** | Authenticated user |

**Description.** The system shall allow an authenticated user to log out, clearing client-side token storage and returning the UI to a public/unauthenticated state. Because JWT is stateless, server-side logout for MVP shall treat logout as client token disposal; optional token denylist is Could.

**Preconditions.**
1. User is authenticated in the client.

**Main Flow.**
1. User selects Logout from the account/menu area.
2. Client removes JWT from storage and clears in-memory auth state.
3. Client navigates to Login or Landing page.
4. Subsequent API calls without token receive 401.

**Alternate / Exception Flows.**
- A1 Already logged out: Logout is idempotent; UI remains on public page.

**Postconditions.**
1. Client no longer attaches Authorization header.
2. Protected routes redirect to Login.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | Logout action |
| Output | Unauthenticated UI state |

**Business Rules.**
1. Protected pages shall not render sensitive tenant data after logout.

**Acceptance Criteria.**
- [ ] After logout, navigating to `/dashboard` redirects to login.
- [ ] Stored token is removed from localStorage/session storage keys used by the app.

The system shall implement FR-AUTH-003 (Logout) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-AUTH-004: Email Verification

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-AUTH-004 |
| **Priority** | Should |
| **Actors** | Registered user (unverified), System (SMTP) |

**Description.** The system shall support email verification via a time-limited tokenized link. Unverified vendors shall be blocked from protected dashboard features with a clear message and a resend action.

**Preconditions.**
1. User registered with email_verified=false.
2. Verification token issued.

**Main Flow.**
1. User opens verification link containing token (or pastes code if UI provides).
2. Client calls `/api/auth/verify-email` with token.
3. Server validates token hash and expiry; sets email_verified=true; invalidates token.
4. User may proceed to login (or auto-login if design chooses one-shot session).

**Alternate / Exception Flows.**
- A1 Expired token: 400; user can request resend.
- A2 Already verified: 200 idempotent success message.
- A3 Resend: `/api/auth/resend-verification` rate-limited.

**Postconditions.**
1. email_verified=true on success.
2. Old verification token unusable.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | verification_token |
| Output | verification status message |

**Business Rules.**
1. Verification tokens shall expire within ≤ 24 hours.
2. Resend shall be rate-limited (e.g., max 3 per 15 minutes per email).

**Acceptance Criteria.**
- [ ] Valid token verifies account.
- [ ] Expired token fails with actionable message.
- [ ] Unverified user cannot access inventory/scan pages.

The system shall implement FR-AUTH-004 (Email Verification) at MoSCoW priority **Should**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-AUTH-005: Password Reset

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-AUTH-005 |
| **Priority** | Should |
| **Actors** | User who forgot password, System (SMTP) |

**Description.** The system shall allow password reset through a forgot-password request that emails a time-limited reset link/token, followed by a reset form that sets a new bcrypt-hashed password.

**Preconditions.**
1. User email exists (response remains generic if not).

**Main Flow.**
1. User opens Forgot Password, enters email, submits.
2. Server always returns generic success message; if user exists, stores reset token and sends email.
3. User opens reset link, enters new password + confirmation.
4. Server validates token, updates password hash, invalidates token, optionally invalidates prior JWT by password_version claim bump.
5. User is redirected to Login.

**Alternate / Exception Flows.**
- A1 Invalid/expired token: error page with request-new-link action.
- A2 Weak password: 400 with policy message.

**Postconditions.**
1. Password hash updated on success.
2. Reset token single-use.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | email (request) |
| Input | token + new_password (reset) |
| Output | generic acknowledgment |
| Output | password update confirmation |

**Business Rules.**
1. Reset tokens expire within ≤ 1 hour.
2. Forgot-password responses shall not disclose email existence.

**Acceptance Criteria.**
- [ ] Known email receives reset mail in configured SMTP environment.
- [ ] Password can be changed with valid token and used for subsequent login.
- [ ] Old password no longer authenticates.

The system shall implement FR-AUTH-005 (Password Reset) at MoSCoW priority **Should**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-AUTH-006: JWT Session Enforcement

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-AUTH-006 |
| **Priority** | Must |
| **Actors** | System, Authenticated user |

**Description.** The system shall protect private API routes with JWT Bearer authentication. Expired, malformed, or missing tokens shall yield 401. Role and tenant claims shall be consulted by authorization middleware before business data access.

**Preconditions.**
1. JWT signing secret configured.

**Main Flow.**
1. Client attaches `Authorization: Bearer <token>` to protected requests.
2. Server middleware verifies signature and expiry.
3. Server attaches user context (user_id, roles, business_id) to request.
4. Handler executes with tenant-scoped queries.

**Alternate / Exception Flows.**
- A1 Missing/invalid token: 401.
- A2 Expired token: 401 with TOKEN_EXPIRED; client forces re-login.
- A3 Role insufficient: 403.

**Postconditions.**
1. Only authorized handlers process protected resources.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | Authorization header |
| Output | Authenticated request context or error |

**Business Rules.**
1. Default access token lifetime is 24 hours (configurable).
2. Algorithms shall be asymmetric or HMAC as configured; `none` algorithm forbidden.

**Acceptance Criteria.**
- [ ] Protected endpoint without token returns 401.
- [ ] Valid token allows access.
- [ ] Tampered token rejected.

The system shall implement FR-AUTH-006 (JWT Session Enforcement) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

#### 3.1.2 Multi-Tenant Business Management and RBAC

All inventory, scans, detections, products, and alerts are scoped by `business_id`. System ADMIN may view cross-tenant aggregates through admin APIs only.

##### FR-TENANT-001: Business Onboarding at Registration

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-TENANT-001 |
| **Priority** | Must |
| **Actors** | New Vendor OWNER, System |

**Description.** The system shall create exactly one business tenant during vendor registration (FR-AUTH-001) and bind the registering user as OWNER. Subsequent business data created by that user shall default to this business_id.

**Preconditions.**
1. Registration validation succeeded.

**Main Flow.**
1. During registration transaction, insert business row with name/address/contact.
2. Insert business_users with role OWNER.
3. Return business_id to client as part of auth/profile payloads after login.

**Alternate / Exception Flows.**
- A1 Business insert failure rolls back user creation.

**Postconditions.**
1. Tenant exists and is associated to OWNER.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | business_name |
| Input | address |
| Input | contact_number |
| Output | business_id |
| Output | business profile fields |

**Business Rules.**
1. MVP assumes one business per owner account.
2. business_id is immutable primary key (UUID recommended).

**Acceptance Criteria.**
- [ ] After registration+login, profile includes business_id.
- [ ] No vendor data exists without business_id.

The system shall implement FR-TENANT-001 (Business Onboarding at Registration) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-TENANT-002: Invite Employee

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-TENANT-002 |
| **Priority** | Should |
| **Actors** | OWNER, invited EMPLOYEE |

**Description.** The system shall allow an OWNER to invite an employee by email. On acceptance (or on create-if-new), the invitee is linked to the same business_id with role EMPLOYEE.

**Preconditions.**
1. Caller authenticated as OWNER of the business.
2. Invitee email valid.

**Main Flow.**
1. OWNER opens Settings → Team (or Employees) panel and enters invitee email + optional name.
2. Client POSTs `/api/businesses/:businessId/invites`.
3. Server authorizes OWNER, creates invite token, sends email with accept link.
4. Invitee accepts; if no account, completes lightweight registration; business_users row created with EMPLOYEE.
5. Invite marked accepted/expired accordingly.

**Alternate / Exception Flows.**
- A1 Invitee already in another business (MVP): reject or document single-business constraint.
- A2 Non-OWNER attempts invite: 403.
- A3 Expired invite: must re-invite.

**Postconditions.**
1. EMPLOYEE can log in and access that business data only.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | invitee_email |
| Input | optional display_name |
| Output | invite_id |
| Output | status |
| Output | email dispatch result |

**Business Rules.**
1. Only OWNER can invite.
2. EMPLOYEE cannot invite others in MVP.
3. Invites expire in ≤ 72 hours.

**Acceptance Criteria.**
- [ ] OWNER can create invite.
- [ ] Accepted invite yields EMPLOYEE membership.
- [ ] EMPLOYEE cannot call invite endpoint successfully.

The system shall implement FR-TENANT-002 (Invite Employee) at MoSCoW priority **Should**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-TENANT-003: RBAC Enforcement

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-TENANT-003 |
| **Priority** | Must |
| **Actors** | System, OWNER, EMPLOYEE, ADMIN |

**Description.** The system shall enforce role-based authorization on API routes and corresponding UI navigation. OWNER has full business control; EMPLOYEE has operational access; ADMIN has platform administration access and shall not be required to belong to a vendor business.

**Preconditions.**
1. Authenticated JWT with role claims.

**Main Flow.**
1. Request arrives with JWT.
2. Middleware resolves system_role and business role.
3. Route policy checks: e.g., product delete requires OWNER; scan create allows OWNER/EMPLOYEE; admin stats require ADMIN.
4. Tenant scope applies business_id filter for vendor routes.

**Alternate / Exception Flows.**
- A1 Wrong role: 403 Forbidden.
- A2 Cross-tenant business_id in path/query mismatched to token: 403.

**Postconditions.**
1. Unauthorized actions are denied without data leakage.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | JWT claims |
| Input | route + method |
| Output | allow/deny |

**Business Rules.**
1. ADMIN cannot silently read arbitrary tenant inventory via vendor endpoints without admin APIs.
2. UI shall hide unauthorized menu items but server remains authoritative.

**Acceptance Criteria.**
- [ ] EMPLOYEE denied OWNER-only endpoints.
- [ ] Vendor JWT cannot access another business_id's inventory.
- [ ] ADMIN can access `/api/admin/*` and vendors cannot.

The system shall implement FR-TENANT-003 (RBAC Enforcement) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

#### 3.1.3 Image Capture and Scan Submission

##### FR-SCAN-001: Image Capture via Camera or File Picker

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-SCAN-001 |
| **Priority** | Must |
| **Actors** | OWNER, EMPLOYEE |

**Description.** The system shall provide a Scan page enabling the user to capture an image using the device camera (where permitted) or select an image file from the gallery/filesystem.

**Preconditions.**
1. User authenticated.
2. Browser supports file input; camera permission may be requested.

**Main Flow.**
1. User navigates to Scans → New Scan (≤ 3 taps from dashboard per usability goals).
2. UI presents Capture and Upload File actions.
3. User captures or selects an image (JPEG/PNG).
4. Selected image is held in client state for preview (FR-SCAN-002).

**Alternate / Exception Flows.**
- A1 Camera permission denied: fall back to file picker with guidance message.
- A2 Unsupported file type: reject with message listing JPEG/PNG.

**Postconditions.**
1. An image blob/file is available in client for preview/compress.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | image file/blob |
| Output | local image object URL / file reference |

**Business Rules.**
1. Accepted MIME types: image/jpeg, image/png.
2. Max raw size before compression guidance: 10 MB.

**Acceptance Criteria.**
- [ ] User can select a PNG/JPEG successfully.
- [ ] Non-image files are rejected client-side.
- [ ] Camera denial still allows file upload path.

The system shall implement FR-SCAN-001 (Image Capture via Camera or File Picker) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-SCAN-002: Image Preview Before Submit

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-SCAN-002 |
| **Priority** | Must |
| **Actors** | OWNER, EMPLOYEE |

**Description.** The system shall display a visual preview of the selected/captured image before upload, with controls to retake/replace or proceed.

**Preconditions.**
1. Image selected (FR-SCAN-001).

**Main Flow.**
1. Preview panel renders the image.
2. Optional category hint dropdown shown.
3. User clicks Submit Scan or Replace Image.

**Alternate / Exception Flows.**
- A1 Replace clears previous selection and returns to capture.

**Postconditions.**
1. User explicitly confirms intent to upload via Submit.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | local image |
| Output | preview UI state |

**Business Rules.**
1. Submit remains disabled until an image is present.

**Acceptance Criteria.**
- [ ] Preview visible before upload.
- [ ] Replace works without page reload.

The system shall implement FR-SCAN-002 (Image Preview Before Submit) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-SCAN-003: Client-Side Image Compression

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-SCAN-003 |
| **Priority** | Must |
| **Actors** | Client application |

**Description.** The system shall compress images client-side before upload to reduce latency and bandwidth, targeting a compressed size suitable for prototype networks (typically ≤ 2 MB) while retaining sufficient detail for detection.

**Preconditions.**
1. Image selected.

**Main Flow.**
1. Client resizes/compresses image (e.g., max dimension and JPEG quality settings documented in design).
2. Compressed blob replaces raw upload payload.
3. UI may show approximate size.

**Alternate / Exception Flows.**
- A1 Compression failure: fall back to original if under 10 MB; else block with error.

**Postconditions.**
1. Upload payload is compressed when possible.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | raw image |
| Output | compressed image blob |

**Business Rules.**
1. Compression must not change accepted MIME to an unsupported type.

**Acceptance Criteria.**
- [ ] A large photo (>2 MB) is reduced before network send in typical cases.
- [ ] Detection still succeeds on compressed demo images.

The system shall implement FR-SCAN-003 (Client-Side Image Compression) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-SCAN-004: Scan Upload and Orchestration

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-SCAN-004 |
| **Priority** | Must |
| **Actors** | OWNER, EMPLOYEE, Server, AI Service |

**Description.** The system shall upload the image as multipart/form-data to the API, create a scan record, invoke the AI service, persist detections, update inventory, and return results to the client with progress feedback.

**Preconditions.**
1. Authenticated vendor.
2. Image ready.
3. AI service healthy or degraded mode handled.

**Main Flow.**
1. Client shows progress indicator and POSTs `/api/scans` multipart with image + metadata.
2. Server authenticates, validates file, stores image, creates scan with status PROCESSING.
3. Server calls AI service analysis endpoint with image reference/bytes.
4. AI returns detections + freshness.
5. Server persists detections, sets scan COMPLETED, updates inventory, evaluates alerts.
6. Server responds with scan summary; client navigates to result view.

**Alternate / Exception Flows.**
- A1 Validation error (type/size): 400; scan not created.
- A2 AI timeout/unavailable: scan FAILED or DEGRADED; user sees retry; inventory not corrupted.
- A3 Partial DB failure: transaction rolls back inventory update; scan marked FAILED.

**Postconditions.**
1. On success: scan COMPLETED with detections.
2. On failure: user sees error; no silent wrong inventory.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | multipart image |
| Input | optional category_hint |
| Input | business_id from token |
| Output | scan_id |
| Output | status |
| Output | detections[] |
| Output | inventory_update_summary |

**Business Rules.**
1. Scan always belongs to token business_id.
2. Only COMPLETED scans auto-update inventory.

**Acceptance Criteria.**
- [ ] Successful upload yields COMPLETED scan with ≥ 0 detections.
- [ ] Progress UI shown during wait.
- [ ] Failure path offers retry without losing selected image when still in client memory.

The system shall implement FR-SCAN-004 (Scan Upload and Orchestration) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-SCAN-005: Scan Metadata Persistence

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-SCAN-005 |
| **Priority** | Must |
| **Actors** | Server |

**Description.** Each scan shall persist metadata including business_id, user_id, image_url/path, status, timestamps, optional category hint, model version string, and error message when failed.

**Preconditions.**
1. Scan create requested.

**Main Flow.**
1. Server writes scan row with initial status.
2. After AI, updates status, model_version, completed_at.
3. Client can GET `/api/scans/:id` and list `/api/scans`.

**Alternate / Exception Flows.**
- A1 Missing image storage path: fail scan create.

**Postconditions.**
1. Audit trail of scans exists per tenant.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | metadata fields |
| Output | persisted scan record |

**Business Rules.**
1. List endpoints are tenant-scoped and paginated.

**Acceptance Criteria.**
- [ ] Scan list shows recent scans for the business only.
- [ ] Scan detail includes status and timestamps.

The system shall implement FR-SCAN-005 (Scan Metadata Persistence) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

#### 3.1.4 Product Detection and Counting

##### FR-DET-001: YOLOv8 Object Detection

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-DET-001 |
| **Priority** | Must |
| **Actors** | AI Service |

**Description.** The AI service shall run YOLOv8-based object detection on the submitted image to identify fruit/vegetable classes supported by the trained model [20], [32].

**Preconditions.**
1. Model weights loaded.
2. Image received by AI service.

**Main Flow.**
1. AI service preprocesses image (resize/normalize as required by model).
2. YOLOv8 inference produces labeled boxes.
3. Service maps labels to product labels used by inventory.

**Alternate / Exception Flows.**
- A1 No objects detected: return empty detections with COMPLETED scan and informational message.
- A2 Model not loaded: 503 from AI health; server marks degraded.

**Postconditions.**
1. Detection results returned to server as structured JSON.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | image bytes |
| Output | detections with label, bbox, confidence |

**Business Rules.**
1. Unsupported classes may be ignored or labeled unknown per model card.

**Acceptance Criteria.**
- [ ] Demo images of trained classes return non-empty detections in happy path.
- [ ] Empty scene returns empty list without crashing.

The system shall implement FR-DET-001 (YOLOv8 Object Detection) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-DET-002: Instance Counting Aggregation

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-DET-002 |
| **Priority** | Must |
| **Actors** | AI Service, Server |

**Description.** The system shall count detected instances per product label and expose both per-instance detections and aggregated counts for inventory updates.

**Preconditions.**
1. Detections available.

**Main Flow.**
1. Group detections by product_label.
2. Compute count per label.
3. Return aggregates to server for inventory delta logic.

**Alternate / Exception Flows.**
- A1 Overlapping boxes: rely on model NMS; no extra client counting.

**Postconditions.**
1. Aggregated counts available in API response.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | detections[] |
| Output | aggregates[{product_label, count}] |

**Business Rules.**
1. Counts are non-negative integers.

**Acceptance Criteria.**
- [ ] If three apples detected, aggregate count for apple is 3.

The system shall implement FR-DET-002 (Instance Counting Aggregation) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-DET-003: Detection Confidence Handling

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-DET-003 |
| **Priority** | Must |
| **Actors** | AI Service, Server, Vendor |

**Description.** Each detection shall include a confidence score in [0.0, 1.0]. Detections below a configurable minimum confidence may be filtered from inventory auto-update while still visible for review.

**Preconditions.**
1. Detections produced.

**Main Flow.**
1. AI attaches confidence per detection.
2. Server applies min_confidence threshold from configuration.
3. UI displays confidence as percentage or badge.

**Alternate / Exception Flows.**
- A1 All below threshold: inventory not auto-updated; user prompted to retry/correct.

**Postconditions.**
1. Confidence persisted with detections.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | confidence scores |
| Input | threshold config |
| Output | filtered/accepted detections |

**Business Rules.**
1. Default detection confidence threshold shall be documented (e.g., 0.40) and configurable by ADMIN/env.

**Acceptance Criteria.**
- [ ] Confidence stored in DB.
- [ ] Below-threshold detections do not silently inflate inventory.

The system shall implement FR-DET-003 (Detection Confidence Handling) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-DET-004: Persist Detections

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-DET-004 |
| **Priority** | Must |
| **Actors** | Server |

**Description.** The server shall persist each detection linked to scan_id with product_label, count or instance fields, bounding box JSON, confidence, freshness fields (from FR-FRESH-*), and timestamps.

**Preconditions.**
1. Scan row exists.
2. AI response received.

**Main Flow.**
1. Insert detection rows in same transaction as scan completion when possible.
2. Expose via scan detail API.

**Alternate / Exception Flows.**
- A1 Persistence failure marks scan FAILED.

**Postconditions.**
1. Detections queryable by scan and business.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | AI JSON |
| Output | detection rows |

**Business Rules.**
1. Detections inherit tenant via scan.business_id.

**Acceptance Criteria.**
- [ ] GET scan returns persisted detections matching AI output (within mapping rules).

The system shall implement FR-DET-004 (Persist Detections) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

#### 3.1.5 Freshness Classification

##### FR-FRESH-001: Fresh / Medium / Spoiled Classification

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-FRESH-001 |
| **Priority** | Must |
| **Actors** | AI Service |

**Description.** The AI service shall classify each detected product region (or agreed aggregation unit) into exactly one of three classes: Fresh, Medium, or Spoiled, using MobileNetV3/CNN-based models [33].

**Preconditions.**
1. Detection boxes available or whole-image fallback defined.

**Main Flow.**
1. For each detection crop/region, run freshness classifier.
2. Assign class label + freshness_confidence.
3. Return to server with detections.

**Alternate / Exception Flows.**
- A1 Classifier failure for one crop: mark that detection freshness UNKNOWN and continue others.

**Postconditions.**
1. Freshness labels available for UI color coding.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | image crops / regions |
| Output | freshness enum |
| Output | freshness_confidence |

**Business Rules.**
1. Allowed classes: Fresh, Medium, Spoiled (UNKNOWN only as exception state).
2. UI color mapping: Fresh=green, Medium=yellow, Spoiled=red (NFR-USE).

**Acceptance Criteria.**
- [ ] Happy-path demo produce returns one of the three classes.
- [ ] Class stored on detection records.

The system shall implement FR-FRESH-001 (Fresh / Medium / Spoiled Classification) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-FRESH-002: Freshness Confidence Threshold and Review Flag

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-FRESH-002 |
| **Priority** | Should |
| **Actors** | Server, Vendor |

**Description.** If freshness_confidence is below a configurable threshold, the system shall flag the detection for manual vendor review and shall not treat it as authoritative for spoilage alerts until confirmed or auto-accepted by policy.

**Preconditions.**
1. Freshness score present.

**Main Flow.**
1. Server compares freshness_confidence to threshold (e.g., 0.55).
2. If low, set needs_review=true on detection.
3. UI highlights review-needed items.

**Alternate / Exception Flows.**
- A1 High confidence: needs_review=false; alerts may generate.

**Postconditions.**
1. Review flags persisted.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | freshness_confidence |
| Input | threshold |
| Output | needs_review flag |

**Business Rules.**
1. Threshold configurable via env/admin setting.

**Acceptance Criteria.**
- [ ] Low-confidence result shows review UI state.
- [ ] High-confidence Spoiled can generate spoilage alert (FR-ALERT-002).

The system shall implement FR-FRESH-002 (Freshness Confidence Threshold and Review Flag) at MoSCoW priority **Should**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-FRESH-003: Manual Correction of AI Predictions

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-FRESH-003 |
| **Priority** | Should |
| **Actors** | OWNER, EMPLOYEE |

**Description.** Vendors shall be able to correct product label, count, and/or freshness on a detection. Corrections shall be stored for audit and potential future model improvement, without automatically retraining in MVP.

**Preconditions.**
1. Scan COMPLETED.
2. User authorized for business.

**Main Flow.**
1. User opens scan result and selects Correct on a detection.
2. UI presents editable fields: product_label, count, freshness.
3. Client PATCHes `/api/detections/:id`.
4. Server stores corrected values + corrected_by + corrected_at + previous values snapshot.
5. Server recalculates inventory contribution and alerts as needed.

**Alternate / Exception Flows.**
- A1 Invalid freshness enum: 400.
- A2 EMPLOYEE/OWNER both allowed for MVP corrections.

**Postconditions.**
1. Corrected values visible thereafter; audit fields set.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | corrected label/count/freshness |
| Output | updated detection |
| Output | optional inventory delta |

**Business Rules.**
1. Corrections are tenant-scoped.
2. Original AI values retained in audit fields/JSON.

**Acceptance Criteria.**
- [ ] Changing Spoiled→Fresh updates displayed class and color.
- [ ] Correction persisted after refresh.

The system shall implement FR-FRESH-003 (Manual Correction of AI Predictions) at MoSCoW priority **Should**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

#### 3.1.6 Inventory and Product Catalog

##### FR-INV-001: Inventory Read and Dashboard Listing

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-INV-001 |
| **Priority** | Must |
| **Actors** | OWNER, EMPLOYEE |

**Description.** The system shall maintain and display current inventory per product for the active business, including quantity, freshness distribution summary, last scan timestamp, and low-stock indicator.

**Preconditions.**
1. Authenticated vendor with business_id.

**Main Flow.**
1. User opens Inventory page.
2. Client GETs `/api/inventory?business_id=...` (business from token).
3. Server returns tenant-scoped rows.
4. UI renders searchable/filterable table.

**Alternate / Exception Flows.**
- A1 Empty catalog: empty state with CTA to add product or run scan.

**Postconditions.**
1. User sees only own business inventory.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | optional search/filter query |
| Output | inventory list |

**Business Rules.**
1. Soft-deleted products excluded by default.

**Acceptance Criteria.**
- [ ] Two tenants cannot see each other's inventory.
- [ ] Table shows quantity and freshness summary columns.

The system shall implement FR-INV-001 (Inventory Read and Dashboard Listing) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-INV-002: Auto-Update Inventory from Successful Scans

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-INV-002 |
| **Priority** | Must |
| **Actors** | Server |

**Description.** After a COMPLETED scan with accepted detections, the system shall update inventory quantities and freshness summaries transactionally. The update policy for MVP shall set counted quantity from the latest scan aggregates for matched products (documented replace semantics), unless a cumulative mode is explicitly configured later.

**Preconditions.**
1. Scan COMPLETED with accepted detections.

**Main Flow.**
1. Map product_label to product catalog entries (create stub product if missing and policy allows).
2. Update quantity and freshness stats.
3. Commit with scan status update.
4. Trigger alert evaluation.

**Alternate / Exception Flows.**
- A1 Unknown label: create inactive/pending catalog item or skip per config; log event.
- A2 Transaction error: no partial quantity write.

**Postconditions.**
1. Inventory reflects scan results per policy.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | aggregates from detections |
| Output | updated inventory rows |

**Business Rules.**
1. Only COMPLETED scans update inventory.
2. Update is tenant-scoped.

**Acceptance Criteria.**
- [ ] After scan of N items of product P, inventory for P shows N under replace policy.
- [ ] Failed scans leave previous inventory unchanged.

The system shall implement FR-INV-002 (Auto-Update Inventory from Successful Scans) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-INV-003: Manual Inventory Adjustment

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-INV-003 |
| **Priority** | Must |
| **Actors** | OWNER, EMPLOYEE |

**Description.** Vendors shall manually adjust inventory quantity when physical stock differs from AI counts (spoilage removal, sales not captured, etc.). Adjustments shall be audited with reason optional text.

**Preconditions.**
1. Product exists in business inventory/catalog.

**Main Flow.**
1. User clicks Adjust on inventory row.
2. Enters new quantity and optional note.
3. Client PATCHes `/api/inventory/:productId`.
4. Server updates quantity, writes adjustment audit, re-evaluates low-stock alerts.

**Alternate / Exception Flows.**
- A1 Negative quantity: reject.
- A2 Non-numeric: 400.

**Postconditions.**
1. Quantity updated; alert state refreshed.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | new_quantity |
| Input | optional note |
| Output | updated inventory row |

**Business Rules.**
1. Quantity shall be ≥ 0.
2. EMPLOYEE may adjust in MVP.

**Acceptance Criteria.**
- [ ] Manual set to 0 succeeds.
- [ ] Below-threshold quantity generates/keeps low-stock alert.

The system shall implement FR-INV-003 (Manual Inventory Adjustment) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-INV-004: Product Catalog Management

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-INV-004 |
| **Priority** | Must |
| **Actors** | OWNER (write), EMPLOYEE (read) |

**Description.** The system shall support product catalog CRUD (soft delete) including name, category, unit, low_stock_threshold, and active flag. OWNER can create/edit/deactivate; EMPLOYEE can view.

**Preconditions.**
1. Authenticated; OWNER for mutations.

**Main Flow.**
1. OWNER opens catalog management (Inventory → Products).
2. Creates/edits product via form.
3. Server validates and upserts `products` row with business_id.
4. Soft delete sets deleted_at / active=false.

**Alternate / Exception Flows.**
- A1 EMPLOYEE create attempt: 403.
- A2 Duplicate name in same business: 409 or merge policy documented.

**Postconditions.**
1. Catalog changes visible in inventory views.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | name |
| Input | category |
| Input | unit |
| Input | low_stock_threshold |
| Output | product entity |

**Business Rules.**
1. low_stock_threshold default e.g. 5.
2. Soft delete preferred over hard delete when scans reference product.

**Acceptance Criteria.**
- [ ] OWNER can add product.
- [ ] EMPLOYEE cannot delete product.
- [ ] Deactivated product hidden from default inventory list.

The system shall implement FR-INV-004 (Product Catalog Management) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

#### 3.1.7 Alerts and Notifications

##### FR-ALERT-001: Low-Stock Alerts

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-ALERT-001 |
| **Priority** | Must |
| **Actors** | Server, Vendor |

**Description.** The system shall generate a low-stock alert when a product quantity is below its low_stock_threshold after scan update or manual adjustment.

**Preconditions.**
1. Product has threshold configured.

**Main Flow.**
1. Inventory update commits.
2. If quantity < threshold, create or refresh LOW_STOCK alert for business/product.
3. Alert appears on Alerts page and dashboard badge count.

**Alternate / Exception Flows.**
- A1 Quantity recovers above threshold: auto-resolve or mark inactive per policy (MVP may keep historical read-only).

**Postconditions.**
1. Alert row exists with type LOW_STOCK, severity, message, read=false.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | quantity |
| Input | threshold |
| Output | alert record |

**Business Rules.**
1. Do not spam duplicate active identical alerts; upsert active alert per product/type.

**Acceptance Criteria.**
- [ ] Dropping below threshold creates alert visible to tenant users.
- [ ] Other tenants do not see the alert.

The system shall implement FR-ALERT-001 (Low-Stock Alerts) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-ALERT-002: Spoilage / Freshness Alerts

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-ALERT-002 |
| **Priority** | Must |
| **Actors** | Server, Vendor |

**Description.** The system shall generate spoilage-related alerts when accepted freshness is Medium or Spoiled (configurable), or when freshness deteriorates across consecutive scans for the same product.

**Preconditions.**
1. Completed scan with freshness labels.

**Main Flow.**
1. Evaluate detections/aggregates for Medium/Spoiled.
2. Create SPOILAGE alert with severity (Medium→WARNING, Spoiled→CRITICAL).
3. Include product name and recommended action text.

**Alternate / Exception Flows.**
- A1 needs_review=true low confidence: optionally suppress alert until correction.

**Postconditions.**
1. Alert listed in tenant alerts feed.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | freshness classes |
| Input | optional prior scan freshness |
| Output | SPOILAGE alert |

**Business Rules.**
1. CRITICAL alerts sort first in default UI ordering.

**Acceptance Criteria.**
- [ ] Spoiled detection creates critical alert in demo scenario.
- [ ] Alert message references product label.

The system shall implement FR-ALERT-002 (Spoilage / Freshness Alerts) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-ALERT-003: Alert Filtering

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-ALERT-003 |
| **Priority** | Should |
| **Actors** | OWNER, EMPLOYEE |

**Description.** The Alerts page shall support filters for severity, type, product, date range, and read status.

**Preconditions.**
1. Alerts exist or empty.

**Main Flow.**
1. User sets filter controls.
2. Client requests `/api/alerts` with query params.
3. Server returns filtered tenant alerts.

**Alternate / Exception Flows.**
- A1 Invalid date range: 400.

**Postconditions.**
1. Displayed list matches filters.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | filter query params |
| Output | filtered alerts[] |

**Business Rules.**
1. Filters combine with AND semantics.

**Acceptance Criteria.**
- [ ] Selecting severity=CRITICAL hides WARNING-only alerts.

The system shall implement FR-ALERT-003 (Alert Filtering) at MoSCoW priority **Should**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-ALERT-004: Read / Unread Alert State

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-ALERT-004 |
| **Priority** | Must |
| **Actors** | OWNER, EMPLOYEE |

**Description.** The system shall track read/unread state per alert (MVP: per alert record shared within business; per-user read state Could). Users can mark one or all visible alerts as read.

**Preconditions.**
1. Alert exists for business.

**Main Flow.**
1. User clicks Mark as Read.
2. Client PATCHes `/api/alerts/:id/read`.
3. Unread badge decrements.

**Alternate / Exception Flows.**
- A1 Mark all read endpoint for convenience.

**Postconditions.**
1. read=true persisted.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | alert_id |
| Output | updated alert |

**Business Rules.**
1. Marking read does not delete alert history.

**Acceptance Criteria.**
- [ ] Unread badge decreases after mark read.
- [ ] State persists after refresh.

The system shall implement FR-ALERT-004 (Read / Unread Alert State) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

#### 3.1.8 Analytics and Reporting

##### FR-ANALYTICS-001: Analytics Charts

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-ANALYTICS-001 |
| **Priority** | Should |
| **Actors** | OWNER, EMPLOYEE, ADMIN |

**Description.** The system shall display charts for inventory trends, freshness distribution, and top products by scan frequency using dashboard analytics widgets.

**Preconditions.**
1. Authenticated user; sufficient data or empty states.

**Main Flow.**
1. User opens Analytics page.
2. Client fetches `/api/analytics/summary` with date range.
3. UI renders chart components (bar/line/doughnut as appropriate).

**Alternate / Exception Flows.**
- A1 No data: empty-state illustration and guidance.

**Postconditions.**
1. Charts reflect tenant-scoped aggregates (vendor) or platform aggregates (admin).

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | date_from |
| Input | date_to |
| Output | series data for charts |

**Business Rules.**
1. Vendor analytics never include other tenants.

**Acceptance Criteria.**
- [ ] Freshness distribution chart renders for demo dataset.
- [ ] Admin analytics do not expose another vendor's raw inventory rows in vendor UI.

The system shall implement FR-ANALYTICS-001 (Analytics Charts) at MoSCoW priority **Should**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-ANALYTICS-002: Trend Computation

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-ANALYTICS-002 |
| **Priority** | Should |
| **Actors** | Server |

**Description.** The system shall compute time-bucketed trends (daily/weekly) for quantities and spoilage rates over the selected range.

**Preconditions.**
1. Scans/inventory history exist.

**Main Flow.**
1. Server aggregates facts by date buckets.
2. Returns arrays suitable for line charts.

**Alternate / Exception Flows.**
- A1 Range > 90 days: may downsample; document limit.

**Postconditions.**
1. Trend payload returned within performance budgets.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | range |
| Input | bucket size |
| Output | trend points |

**Business Rules.**
1. Use server timestamps in UTC; UI may localize.

**Acceptance Criteria.**
- [ ] Changing date range refetches and redraws trends.

The system shall implement FR-ANALYTICS-002 (Trend Computation) at MoSCoW priority **Should**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-ANALYTICS-003: Analytics Filters

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-ANALYTICS-003 |
| **Priority** | Should |
| **Actors** | Vendor, ADMIN |

**Description.** Analytics views shall provide date range picker and optional product/category filters.

**Preconditions.**
1. Analytics page open.

**Main Flow.**
1. User applies filters → client refetch → charts update.

**Alternate / Exception Flows.**
- A1 from > to: validation error.

**Postconditions.**
1. Visible metrics match filters.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | filters |
| Output | filtered analytics |

**Business Rules.**
1. Default range: last 7 days.

**Acceptance Criteria.**
- [ ] Filter controls exist and affect API query string.

The system shall implement FR-ANALYTICS-003 (Analytics Filters) at MoSCoW priority **Should**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-ANALYTICS-004: Export Analytics (Stretch)

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-ANALYTICS-004 |
| **Priority** | Could |
| **Actors** | OWNER, ADMIN |

**Description.** The system may export analytics tables as CSV; PDF export is an additional stretch.

**Preconditions.**
1. Analytics data loaded.

**Main Flow.**
1. User clicks Export CSV → client downloads file generated by API or client-side.

**Alternate / Exception Flows.**
- A1 Not implemented: hide button or show “coming soon” only if Could deferred.

**Postconditions.**
1. CSV contains tenant-scoped rows.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | current filters |
| Output | CSV file |

**Business Rules.**
1. Export shall not bypass RBAC.

**Acceptance Criteria.**
- [ ] If implemented, CSV opens in spreadsheet software with expected columns.

The system shall implement FR-ANALYTICS-004 (Export Analytics (Stretch)) at MoSCoW priority **Could**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

#### 3.1.9 Admin Portal

##### FR-ADMIN-001: Vendor Account Management

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-ADMIN-001 |
| **Priority** | Must |
| **Actors** | ADMIN |

**Description.** Administrators shall list vendors/businesses, view details, and suspend or reactivate vendor accounts. Suspended vendors cannot log in (FR-AUTH-002).

**Preconditions.**
1. Authenticated ADMIN.

**Main Flow.**
1. Admin opens Admin → Vendors.
2. GET `/api/admin/vendors` returns paginated list.
3. Admin selects Suspend/Activate; PATCH updates status.

**Alternate / Exception Flows.**
- A1 Non-admin: 403.
- A2 Suspend self if admin also user: prevent lockout of last admin.

**Postconditions.**
1. Vendor status persisted.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | vendor/business id |
| Input | status |
| Output | updated vendor list item |

**Business Rules.**
1. Suspension is platform-level for that user/business as designed.

**Acceptance Criteria.**
- [ ] Admin can suspend vendor.
- [ ] Suspended vendor login fails.
- [ ] Vendor role cannot access admin vendor list.

The system shall implement FR-ADMIN-001 (Vendor Account Management) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-ADMIN-002: Platform Health Visibility

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-ADMIN-002 |
| **Priority** | Should |
| **Actors** | ADMIN |

**Description.** Admin portal shall display health indicators for API, database connectivity, and AI service (model loaded, latency sample).

**Preconditions.**
1. Admin authenticated.

**Main Flow.**
1. Admin opens Health panel.
2. UI calls `/api/admin/health` which aggregates `/health` of dependencies.
3. Statuses shown as UP / DEGRADED / DOWN with timestamps.

**Alternate / Exception Flows.**
- A1 AI down: overall DEGRADED while API still UP.

**Postconditions.**
1. Admin aware of dependency state.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | none |
| Output | health aggregate JSON |

**Business Rules.**
1. Health details must not expose secrets.

**Acceptance Criteria.**
- [ ] Stopping AI container reflects DEGRADED/DOWN in admin health.

The system shall implement FR-ADMIN-002 (Platform Health Visibility) at MoSCoW priority **Should**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-ADMIN-003: Platform Statistics

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-ADMIN-003 |
| **Priority** | Should |
| **Actors** | ADMIN |

**Description.** Admin shall view aggregate stats: total businesses, users, scans (period), average inference time if logged, and alert counts.

**Preconditions.**
1. Admin authenticated.

**Main Flow.**
1. GET `/api/admin/stats`.
2. UI renders summary cards and simple charts.

**Alternate / Exception Flows.**
- A1 Empty platform: zeros with empty state.

**Postconditions.**
1. Stats visible without drilling into private inventory of a vendor beyond aggregates.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | optional period |
| Output | aggregate metrics |

**Business Rules.**
1. Aggregates only; no cross-tenant PII dumps in MVP stats.

**Acceptance Criteria.**
- [ ] Creating a new business increments business count after refresh.

The system shall implement FR-ADMIN-003 (Platform Statistics) at MoSCoW priority **Should**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

#### 3.1.10 Settings and Profile

##### FR-SETTINGS-001: Profile and Business Settings

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-SETTINGS-001 |
| **Priority** | Should |
| **Actors** | OWNER, EMPLOYEE |

**Description.** Users shall update their profile name and password; OWNER shall update business name/address/contact and notification preferences (in-app).

**Preconditions.**
1. Authenticated.

**Main Flow.**
1. User opens Settings.
2. Edits fields and saves via PATCH endpoints.
3. Password change requires current password.

**Alternate / Exception Flows.**
- A1 EMPLOYEE editing business fields: 403.
- A2 Wrong current password: 400/401.

**Postconditions.**
1. Updated fields returned on subsequent profile GET.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | profile fields |
| Input | business fields |
| Input | password change triad |
| Output | updated profile/business |

**Business Rules.**
1. Notification preferences stored per user.

**Acceptance Criteria.**
- [ ] Name change reflects in header/avatar area.
- [ ] OWNER can update business address.
- [ ] EMPLOYEE cannot update business name.

The system shall implement FR-SETTINGS-001 (Profile and Business Settings) at MoSCoW priority **Should**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

#### 3.1.11 Health Checks and Degraded Modes

##### FR-HEALTH-001: Service Health Endpoints

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-HEALTH-001 |
| **Priority** | Must |
| **Actors** | System, DevOps, ADMIN |

**Description.** Both server and AI service shall expose `/health` (and optionally `/ready`) endpoints returning JSON status, version, and dependency checks suitable for Docker healthchecks.

**Preconditions.**
1. Service process running.

**Main Flow.**
1. Caller GETs `/health`.
2. Service returns 200 with `{status:"ok", ...}` when healthy.
3. AI includes `model_loaded` boolean.

**Alternate / Exception Flows.**
- A1 DB down: server readiness fails (503).

**Postconditions.**
1. Orchestrators can detect unhealthy containers.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | HTTP GET |
| Output | health JSON |

**Business Rules.**
1. Health endpoints shall not require JWT.

**Acceptance Criteria.**
- [ ] Server `/health` returns 200 when DB up.
- [ ] AI `/health` reports model_loaded after startup.

The system shall implement FR-HEALTH-001 (Service Health Endpoints) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

##### FR-HEALTH-002: Degraded Mode Behavior

| Attribute | Value |
|-----------|-------|
| **Requirement ID** | FR-HEALTH-002 |
| **Priority** | Must |
| **Actors** | System, Vendor |

**Description.** When the AI service is unavailable, the system shall remain available for authentication, inventory viewing, alerts viewing, and settings, while scan analysis is disabled with a clear UI banner and API error code AI_UNAVAILABLE.

**Preconditions.**
1. API up; AI down.

**Main Flow.**
1. Server detects AI failure on scan.
2. Returns structured error; scan marked FAILED.
3. Client shows banner “AI analysis temporarily unavailable.”
4. Other pages continue to function.

**Alternate / Exception Flows.**
- A1 AI recovers: banner clears on next successful health/scan.

**Postconditions.**
1. No corrupted inventory from failed AI calls.

**Inputs / Outputs.**

| Direction | Data |
|-----------|------|
| Input | scan attempt during outage |
| Output | error response |
| Output | FAILED scan optional |

**Business Rules.**
1. Degraded mode must not bypass auth.

**Acceptance Criteria.**
- [ ] Inventory page works while AI stopped.
- [ ] New scan fails gracefully with message.

The system shall implement FR-HEALTH-002 (Degraded Mode Behavior) at MoSCoW priority **Must**. Verification shall exercise the main flow and at least one alternate/exception path listed above.

### 3.2 Usability

Usability requirements specify training time, task times, accessibility expectations, mobile behavior, freshness color coding, and future language notes.

##### NFR-USE-001: Training Time

1. The system shall enable a new vendor with no prior SnapStock-AI training to complete first successful scan (capture → upload → view results) within **5 minutes** of account readiness (verified + logged in), given a prepared demo produce tray and written one-page quickstart.
2. A power user (OWNER using the system daily for one week) should complete a routine scan in under **60 seconds** of interaction time (excluding AI inference wait).
3. Admin users shall become productive at suspend/activate vendor tasks within **30 minutes** of orientation.

##### NFR-USE-002: Task Time and Interaction Budget

1. The camera capture workflow shall require no more than **3 taps/clicks** from Dashboard Home to initiating scan submission (excluding OS permission dialogs).
2. Login shall be completable in ≤ 2 fields + 1 primary button (email, password, Submit).
3. Mark-as-read for a single alert shall take ≤ 2 interactions.
4. The system should match familiar mobile web patterns (bottom/side nav, clear primary CTA) comparable to common consumer apps users already know.

##### NFR-USE-003: Interface Consistency and Mobile Usability

1. The UI shall be responsive and usable at viewport widths ≥ **360 px** and on desktop ≥ **1024 px**.
2. Navigation information architecture shall remain consistent across pages: primary nav includes Dashboard, Scans, Inventory, Alerts, Analytics, Settings; Admin section visible only to ADMIN.
3. Touch targets for primary actions should be ≥ 44×44 CSS px on mobile layouts.
4. Forms shall support mobile keyboards appropriate to field types (email, tel).

##### NFR-USE-004: Freshness Color Coding and Visual Semantics

1. The system shall color-code freshness as **Fresh = green**, **Medium = yellow**, **Spoiled = red** consistently in badges, charts, and detection lists.
2. Color shall not be the only cue: text labels (Fresh/Medium/Spoiled) shall always appear with the color badge for accessibility.
3. Severity badges for alerts shall be visually distinct (e.g., CRITICAL vs WARNING).

##### NFR-USE-005: Error Feedback and Prevention

1. All form validation errors and API failures shall display user-friendly messages (not raw stack traces or SQL errors).
2. Failed uploads shall offer Retry without discarding the selected image while it remains in client memory.
3. Destructive actions (suspend vendor, deactivate product) shall require confirmation dialogs.

##### NFR-USE-006: Accessibility Baseline

1. Interactive controls shall have accessible names (label/aria-label).
2. Focus order shall follow visual order on auth and scan forms.
3. Contrast for body text on primary backgrounds should meet an approximate WCAG AA intent for the MVP theme (exact audit Could).
4. Images that convey status (icons) should have text alternatives where meaning is not adjacent.

##### NFR-USE-007: Language and Localization Notes

1. MVP UI language shall be **English**.
2. The architecture should not hard-code user-visible strings in a way that prevents future i18n.
3. Future localization for **Sinhala** and **Tamil** is desirable (Could / Won't for this release) and shall be noted in product roadmap; no Sinhala/Tamil completeness requirement for 03 Oct 2026.

### 3.3 Reliability

##### NFR-REL-001: Availability

1. The prototype deployment shall target **99% availability** during local business hours **08:00–20:00** (Asia/Colombo) for scheduled demo weeks, excluding planned maintenance.
2. Scheduled maintenance windows shall be communicated in advance to evaluators/users when on a shared demo host and should be limited to off-peak hours.
3. Health endpoints (FR-HEALTH-001) shall be used to detect downtime.

##### NFR-REL-002: MTBF and MTTR

1. Mean Time Between Failures (MTBF) for critical path services (API + DB) during a controlled demo day should exceed **8 hours** under expected academic load.
2. Mean Time To Repair (MTTR) for a failed container restart via Docker Compose shall be ≤ **15 minutes** for a knowledgeable team member with access to logs.
3. AI model reload after container restart shall complete within ≤ **5 minutes** on the demo hardware class used by the team.

##### NFR-REL-003: Data Integrity

1. Inventory and scan multi-step updates shall use database transactions to prevent partial writes.
2. The system shall not lose confirmed COMPLETED scan records due to client disconnect after server commit.
3. Database backups shall be performed at least **daily** in deployed shared environments (local-only demos may rely on volume snapshots).

##### NFR-REL-004: AI Accuracy Targets

1. Object detection shall achieve a minimum **mAP@0.5 of 0.70** on the held-out validation dataset used by the team.
2. Freshness classification shall achieve a minimum **F1-score of 0.75** macro-averaged across Fresh/Medium/Spoiled on the test set.
3. Accuracy metrics shall be reported in the testing document / final report with dataset versions cited [25], [26].
4. These metrics constrain model acceptance, not each production image in the wild.

##### NFR-REL-005: Defect Severity Definitions and Rates

1. A **Critical** defect is: complete loss of inventory data; inability for all users to authenticate; security breach of tenant isolation; or AI/API hard hang > 30 seconds without timeout/error handling on the scan path.
2. A **Significant** defect is: a primary feature unusable for a role (e.g., scans always fail) while other features work; incorrect cross-page navigation breaking core tasks; persistent wrong inventory update on successful scans.
3. A **Minor** defect is: cosmetic UI issues, non-blocking copy errors, chart alignment issues, or rare non-reproducible glitches with workaround.
4. At final evaluation freeze, there shall be **zero open Critical defects**; Significant defects shall be documented with workarounds if any remain.
5. Informational target: ≤ 5 Significant defects open at release candidate; Minor defects tracked but not release-blocking.

### 3.4 Performance and Security

Per the RUP/IEEE template structure used in this course, performance characteristics and security requirements are specified in this section. They are separated into subsections for clarity and testability.

#### 3.4.1 Performance Requirements

##### NFR-PERF-001: Response Time

1. Login and registration average response time shall be **< 2 s** and maximum **≤ 5 s** under nominal prototype load (excluding user think time and cold start).
2. Compressed image upload (< 2 MB) average transfer+accept time shall be **< 3 s** and maximum **≤ 8 s** on a ≥ 5 Mbps link to the demo server.
3. AI inference (detection + freshness) average shall be **< 5 s** and maximum **≤ 15 s** per image on the team's demo hardware class (CPU acceptable).
4. Dashboard data load average shall be **< 2 s** and maximum **≤ 5 s** for a business with ≤ 500 products and ≤ 5,000 scans.
5. Health endpoint response shall be **< 500 ms** average when dependencies are local Docker network.

##### NFR-PERF-002: Throughput and Concurrency

1. The prototype shall support at least **10 concurrent scan requests** without crashing; queueing/slower responses are acceptable beyond that.
2. The API shall support at least **50 concurrent authenticated read requests** (inventory/alerts) for demo stress smoke tests.
3. Sustained write throughput target for academic demo: ≥ **1 scan/minute/tenant** for 3 tenants simultaneously.

##### NFR-PERF-003: Capacity

1. The data model and indexes shall support at least **100 businesses**, **500 users**, **50,000 scans**, and **500,000 detections** without schema redesign (prototype may not populate to capacity).
2. Image storage planning shall assume average compressed image ≤ 2 MB; disk capacity monitoring is required for demo hosts.
3. Pagination shall be used for list endpoints (default page size 20; max 100).

##### NFR-PERF-004: Resource Utilization

1. API container idle memory should remain practical for student VMs (target < 512 MB RSS typical).
2. AI container may use higher memory for models; team shall document observed RSS after model load.
3. Client bundle should remain compatible with mid-range mobile browsers; code-splitting should be used for admin vs vendor routes where practical.
4. CPU spike during inference shall not freeze the API container (separate microservice constraint).

##### NFR-PERF-005: Performance Degradation Modes

1. When inference latency exceeds 15 s, the server shall time out the AI call and return a controlled error (not hang indefinitely).
2. When DB is slow, list endpoints should still fail with timeout rather than unbounded wait (timeout values documented in ops notes).
3. Static assets should be cacheable in production builds.

#### 3.4.2 Security Requirements

##### NFR-SEC-001: Transport and HTTP Hardening

1. All client–server communication in production/demo public deployments shall use **HTTPS**.
2. The API shall use **Helmet** to set secure HTTP headers (e.g., X-Content-Type-Options, frameguard as appropriate).
3. CORS shall be restricted to known client origins in production; wildcard CORS shall not be used in public deployments.
4. Sensitive cookies, if any, shall be Secure and HttpOnly; MVP JWT may be Bearer header based.

##### NFR-SEC-002: Authentication Secrets and Password Storage

1. Passwords shall be hashed with **bcrypt** at **minimum cost factor 10**.
2. JWT shall be signed with a secret/key from environment variables; secrets shall not be committed to Git.
3. Default JWT expiry shall be **24 hours** (configurable).
4. Password reset and verification tokens shall be single-use and time-limited.

##### NFR-SEC-003: Tenant Isolation and Authorization

1. Every tenant-owned query shall enforce `business_id` isolation in server-side data access.
2. Object-level authorization shall prevent IDOR: knowing another tenant's UUID shall not return its data.
3. RBAC shall enforce OWNER / EMPLOYEE / ADMIN policies (FR-TENANT-003).
4. Admin APIs shall be mounted under a distinct `/api/admin` prefix with ADMIN checks.

##### NFR-SEC-004: Input Validation and Injection Defense

1. All external API inputs shall be validated with **Zod** schemas (or equivalent) before business logic.
2. ORM parameterized queries (TypeORM) shall be used; raw SQL, if any, must be parameterized.
3. Multipart uploads shall validate MIME type and size server-side, not only client-side.
4. JSON bodies with unexpected fields shall be stripped or rejected per schema policy.

##### NFR-SEC-005: OWASP Top 10 Awareness Controls

1. The system shall apply controls aligned with OWASP Top 10 awareness [11], including: broken access control prevention (tenant+RBAC), cryptographic failures prevention (bcrypt/JWT/HTTPS), injection prevention (validation/ORM), security misconfiguration reduction (Helmet/CORS/env secrets), and authentication failures reduction (generic errors, verification, reset limits).
2. Security logging shall record auth failures and forbidden cross-tenant attempts without logging passwords or tokens.
3. Dependencies shall be reviewed for known critical vulnerabilities before final submission (npm/pip audit best effort).

##### NFR-SEC-006: File Upload Safety

1. Uploaded files shall be stored outside client-accessible source trees with randomized names.
2. Executable content types shall be rejected.
3. Server shall not reflect raw file paths that expose host filesystem layout to clients unnecessarily.

### 3.5 Supportability

##### NFR-SUP-001: Coding Standards and Structure

1. Client and server application code shall be written in **TypeScript**.
2. ESLint (client) shall be configured and kept passing on the main branch for CI-or-pre-submit checks.
3. Naming: camelCase for JS/TS variables/functions; PascalCase for React components/types; snake_case for database columns.
4. Repository modularity: `client/`, `server/`, `ai-service/` as independent deployable units.
5. Python AI code shall follow readable module structure (routers, services, models) and include requirements pinning.

##### NFR-SUP-002: Database Migrations and Schema Evolution

1. Schema changes shall be managed via TypeORM migrations (or equivalent versioned migrations), not undocumented manual prod edits.
2. Migrations shall be re-runnable in empty environments via documented commands.
3. Seed scripts may exist for demo data and shall be clearly separated from migrations.

##### NFR-SUP-003: Logging and Observability

1. API requests shall include a trace/request ID in logs.
2. AI inference logs shall include model version, input size, and processing duration.
3. Logs shall not contain plaintext passwords, JWTs, or full payment-like secrets (N/A) or SMTP passwords.
4. Error logs shall be sufficient to diagnose FAILED scans.

##### NFR-SUP-004: Health, Docs, and Maintainability Utilities

1. Health endpoints shall exist as in FR-HEALTH-001.
2. README documents shall describe setup, env vars, and demo walkthrough.
3. API route lists in this SRS (3.9.3) shall be kept consistent with implementation at submission (or changelog noted).
4. Container rebuilds shall be documented for model weight updates.

### 3.6 Design Constraints

Design constraints are mandated decisions that must be adhered to.

#### 3.6.1 Technology Stack Constraint

| Layer | Required Technology |
|-------|---------------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express.js, TypeORM, PostgreSQL |
| AI Service | Python 3, FastAPI, PyTorch/TensorFlow, Ultralytics YOLO, OpenCV, Pillow |
| DevOps | Docker, Docker Compose, Git/GitHub |
| Auth / Safety | JWT, bcrypt, Zod validation, Helmet |

#### 3.6.2 Standards Compliance Constraints

1. RESTful API design conventions shall be followed for resource naming and HTTP verbs.
2. This SRS follows IEEE 830 structure [7].
3. Architecture documentation shall use RUP 4+1 views in the SAD [2], [9].

#### 3.6.3 Hardware Limitations (Client)

| Requirement | Minimum |
|-------------|---------|
| RAM | 2 GB |
| Storage | 100 MB free (browser cache) |
| Camera | 5 MP rear camera or equivalent webcam |
| Browser | Chrome 100+, Firefox 100+, Safari 15+, Edge 100+ |
| Network | 1 Mbps upload speed recommended |

#### 3.6.4 Hardware Limitations (Server Demo Class)

| Requirement | Minimum recommended for demo host |
|-------------|-----------------------------------|
| CPU | 4 cores |
| RAM | 8 GB (16 GB preferred if AI+DB co-hosted) |
| Disk | 20 GB free |
| GPU | Optional |

### 3.7 On-line User Documentation and Help System Requirements

##### NFR-HELP-001: In-Product Help

1. The system shall include a Landing page with product overview and a “How It Works” section.
2. The Scan capture screen shall include in-app tooltips/guidance covering lighting, angle, and distance.
3. Empty states shall include guidance CTAs (e.g., “Run your first scan”).
4. A FAQ section shall address common AI accuracy and connectivity questions.

##### NFR-HELP-002: External User Documentation

1. A user guide (PDF or Markdown) shall cover registration, scanning, dashboard, alerts, and admin basics.
2. The guide shall include at least one illustrated happy-path scenario for a vendor owner.
3. README setup docs shall cover Docker Compose bring-up for evaluators.

### 3.8 Purchased Components

No commercial software licenses are required for the academic build. All major components are open-source. The following table lists components and licenses (verify at freeze):

| Component | Role | License (typical) |
|-----------|------|-------------------|
| React [13] | UI library | MIT |
| Vite [14] | Build tool | MIT |
| Tailwind CSS [15] | Styling | MIT |
| Express.js [16] | HTTP API | MIT |
| TypeORM [17] | ORM | MIT |
| PostgreSQL [18] | Database | PostgreSQL License |
| FastAPI [19] | AI HTTP API | MIT |
| Ultralytics YOLO [20] | Detection | AGPL-3.0 (compliance required if distributing) |
| TensorFlow / PyTorch [21], [22] | ML frameworks | Apache 2.0 |
| OpenCV [23] | Image processing | Apache 2.0 |
| Docker [24] | Containerization | Apache 2.0 (engine components vary) |

The team shall comply with AGPL obligations applicable to Ultralytics YOLO usage/distribution for the submission package [20]. Dataset licenses for Kaggle sources [25], [26] shall be respected.

### 3.9 Interfaces

This section defines interfaces that must be supported. Screen screenshots are not included (not yet implemented). Menus, panels, fields, and buttons are described in wireframe-level detail. A draft block diagram of main user interfaces is included.

#### 3.9.1 User Interfaces

##### ASCII Block Diagram of Main User Interfaces

```
                         +----------------------+
                         |     Landing Page     |
                         |  CTA: Login / Signup |
                         +----------+-----------+
                                    |
                 +------------------+------------------+
                 |                                     |
                 v                                     v
          +------------+                        +-------------+
          | Login Page |<---- Forgot/Reset ---->| Reset Pages |
          +------+-----+                        +-------------+
                 |
                 | JWT OK
                 v
          +-------------+     +------------------+
          |  Signup /   |     | Verify Email Page|
          |  Register   |---->|                  |
          +-------------+     +------------------+
                 |
                 v
+--------------- VENDOR SHELL ------------------+     +-------- ADMIN SHELL --------+
| Nav: Home | Scans | Inventory | Alerts |      |     | Nav: Vendors | Health |     |
|      Analytics | Settings | Logout            |     |      Stats | Logout         |
|                                               |     |                             |
| [Dashboard Home]  [Scan Capture/Results]      |     | [Vendor Mgmt] [Health]      |
| [Inventory/Catalog] [Alerts] [Analytics]      |     | [Platform Stats]            |
| [Settings/Profile/Team]                       |     |                             |
+-----------------------------------------------+     +-----------------------------+
```

##### Page-Level Wireframe Descriptions

###### Landing Page

**Purpose.** Marketing/entry surface explaining SnapStock-AI and routing users to auth.

**Layout regions and controls.**
1. Top nav: brand wordmark “SnapStock-AI”, links How It Works / Features / FAQ, buttons Login and Sign Up.
2. Hero region: brand-forward product name, one headline, one short supporting sentence, primary CTA (Start Free / Sign Up) and secondary CTA (Login).
3. How It Works section: 3 steps — Capture, Analyze, Act — with short text (no screenshots required in SRS).
4. Features section: detection, freshness classes, alerts, multi-tenant security.
5. Footer: disclaimer that the tool is not a certified food-safety inspector; mentor/project academic notice; links to docs.

###### Login Page

**Purpose.** Authenticate existing users.

**Layout regions and controls.**
1. Centered auth card/panel (interaction container): Email text field, Password field with show/hide toggle, primary Submit button “Log in”.
2. Links: Forgot password?, Create account, Back to Landing.
3. Inline error alert region for auth failures.
4. Optional “Resend verification email” affordance when error code indicates unverified.

###### Signup Page

**Purpose.** Register vendor + business.

**Layout regions and controls.**
1. Fields: Full name, Email, Password, Confirm password, Business name, Address (textarea), Contact number.
2. Checkbox: Accept terms & academic-use disclaimer.
3. Primary button: Create account.
4. Link: Already have an account? Log in.
5. Field-level validation messages.

###### Verify Email Page

**Purpose.** Complete email verification.

**Layout regions and controls.**
1. Status message panel (pending/success/failure).
2. Button: Resend verification email.
3. Button: Go to Login.

###### Forgot Password Page

**Purpose.** Request reset email.

**Layout regions and controls.**
1. Email field, Submit button “Send reset link”, Cancel/Back to Login.
2. Generic success alert text.

###### Reset Password Page

**Purpose.** Set new password with token.

**Layout regions and controls.**
1. New password, Confirm password fields, Submit button.
2. Token invalid state with link to Forgot Password.

###### Dashboard Home

**Purpose.** At-a-glance tenant status for vendors.

**Layout regions and controls.**
1. Left/top nav as in shell diagram.
2. Summary cards: Total products, Low stock count, Spoilage alerts count, Scans today.
3. Panel: Recent scans list (thumbnail/status/time) with link “View all”.
4. Panel: Unread alerts preview.
5. Primary CTA button: New Scan.

###### Scans List Page

**Purpose.** History of scans.

**Layout regions and controls.**
1. Table/list: scan time, status chip, detection count, freshness summary, Open action.
2. Filter: status, date range.
3. Button: New Scan.

###### Scan Capture / New Scan Page

**Purpose.** Capture and submit image.

**Layout regions and controls.**
1. Panel: Camera preview or file drop zone.
2. Buttons: Capture, Upload file, Replace, Submit scan.
3. Optional dropdown: Product category hint.
4. Guidance tooltip/help icon for lighting/angle/distance.
5. Progress modal/bar during upload+inference.

###### Scan Results Page

**Purpose.** Show AI outputs and corrections.

**Layout regions and controls.**
1. Image with optional bounding box overlays.
2. Detections table: label, count, confidence, freshness badge (green/yellow/red), needs_review flag, Correct button.
3. Summary: inventory update notes.
4. Actions: Back to scans, Run another scan.

###### Inventory Page

**Purpose.** Stock levels and adjustments.

**Layout regions and controls.**
1. Search box, category filter, low-stock-only toggle.
2. Table columns: Product, Quantity, Unit, Freshness summary, Last updated, Low-stock indicator, Actions (Adjust).
3. OWNER extra: Manage products button.

###### Product Catalog Modal/Page

**Purpose.** CRUD products (OWNER).

**Layout regions and controls.**
1. Fields: Name, Category dropdown/text, Unit dropdown (pcs/kg/bunch), Low stock threshold number, Active toggle.
2. Buttons: Save, Cancel, Deactivate.

###### Alerts Page

**Purpose.** Triaged notifications.

**Layout regions and controls.**
1. Filters: severity, type, product, date range, unread only.
2. List rows: severity badge, type, product, message, timestamp, Mark as read.
3. Button: Mark all as read.

###### Analytics Page

**Purpose.** Charts and trends.

**Layout regions and controls.**
1. Date range picker, optional product filter.
2. Chart panels: Inventory trend, Freshness distribution, Top products by scans, Spoilage rate.
3. Could: Export CSV button.

###### Settings Page

**Purpose.** Profile, security, business, team.

**Layout regions and controls.**
1. Tabs/sections: Profile, Password, Business (OWNER), Team/Invites (OWNER), Notifications.
2. Profile fields + Save.
3. Password: current, new, confirm.
4. Business fields + Save.
5. Invite employee: email field + Send invite.

###### Admin — Vendors

**Purpose.** Manage tenants/users.

**Layout regions and controls.**
1. Search vendors, table: business name, owner email, status, created_at, actions Suspend/Activate/View.
2. Detail drawer: basic stats (scans count).

###### Admin — Health

**Purpose.** Dependency status.

**Layout regions and controls.**
1. Status cards: API, Database, AI Service, Model loaded.
2. Last checked timestamp, Refresh button.

###### Admin — Platform Stats

**Purpose.** Aggregates.

**Layout regions and controls.**
1. Cards: businesses, users, scans (period), alerts.
2. Simple chart of scans over time.

#### 3.9.2 Hardware Interfaces

1. **Camera / image input:** Browser `MediaDevices.getUserMedia()` for live capture where permitted; `<input type="file" accept="image/*" capture="environment">` for mobile capture/gallery.
2. **Client storage:** `localStorage` (or session storage) for JWT persistence key(s).
3. **No custom kernel drivers** or special USB scales are required.
4. Client hardware minima are those in Section 3.6.3.

#### 3.9.3 Software Interfaces (REST API Inventory)

Planned REST endpoints (methods/paths/purpose). Paths are normative intent for MVP; minor naming harmonization is allowed if SAD/OpenAPI stays consistent.

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/api/auth/register` | Register vendor + business | No |
| POST | `/api/auth/login` | Login; return JWT | No |
| POST | `/api/auth/logout` | Logout acknowledgment (client clears token) | Optional |
| POST | `/api/auth/verify-email` | Verify email token | No |
| POST | `/api/auth/resend-verification` | Resend verification email | No/Auth |
| POST | `/api/auth/forgot-password` | Request password reset email | No |
| POST | `/api/auth/reset-password` | Reset password with token | No |
| GET | `/api/me` | Current user profile + roles | JWT |
| PATCH | `/api/me` | Update profile | JWT |
| PATCH | `/api/me/password` | Change password | JWT |
| GET | `/api/businesses/current` | Get active business profile | JWT vendor |
| PATCH | `/api/businesses/current` | Update business (OWNER) | JWT OWNER |
| POST | `/api/businesses/current/invites` | Invite employee | JWT OWNER |
| POST | `/api/invites/:token/accept` | Accept invite | No/JWT |
| GET | `/api/products` | List catalog | JWT vendor |
| POST | `/api/products` | Create product | JWT OWNER |
| PATCH | `/api/products/:id` | Update product | JWT OWNER |
| DELETE | `/api/products/:id` | Soft-delete product | JWT OWNER |
| GET | `/api/inventory` | List inventory | JWT vendor |
| PATCH | `/api/inventory/:productId` | Manual adjust quantity | JWT vendor |
| GET | `/api/scans` | List scans | JWT vendor |
| POST | `/api/scans` | Upload image + create scan | JWT vendor |
| GET | `/api/scans/:id` | Scan detail + detections | JWT vendor |
| PATCH | `/api/detections/:id` | Manual correction | JWT vendor |
| GET | `/api/alerts` | List alerts | JWT vendor |
| PATCH | `/api/alerts/:id/read` | Mark alert read | JWT vendor |
| POST | `/api/alerts/read-all` | Mark all read | JWT vendor |
| GET | `/api/analytics/summary` | Charts/trends data | JWT |
| GET | `/api/analytics/export` | CSV export (Could) | JWT |
| GET | `/api/admin/vendors` | List vendors | JWT ADMIN |
| PATCH | `/api/admin/vendors/:id` | Suspend/activate | JWT ADMIN |
| GET | `/api/admin/stats` | Platform stats | JWT ADMIN |
| GET | `/api/admin/health` | Aggregated health | JWT ADMIN |
| GET | `/health` | API liveness/readiness | No |
| GET | `/health` | AI service health (AI host) | No |
| POST | `/analyze` | AI detection+freshness (internal) | Internal/network |
| POST | `/detect` | AI detection only (optional split) | Internal/network |
| POST | `/predict` | AI freshness only (optional split) | Internal/network |

Software interface notes:

1. Client ↔ Server: REST/JSON over HTTPS (HTTP allowed on local Docker).
2. Server ↔ AI Service: REST/JSON over Docker network HTTP; not exposed publicly in hardened demos.
3. Server ↔ PostgreSQL: TCP 5432 via TypeORM.
4. Optional Server ↔ S3-compatible storage for images.

#### 3.9.4 Communications Interfaces

1. Asynchronous HTTP/HTTPS request/response between client and server.
2. Multipart form-data for image uploads (`Content-Type: multipart/form-data`).
3. JSON request/response bodies for non-file API calls (`Content-Type: application/json`).
4. SMTP for transactional emails (verification, password reset, invites).
5. No FTP requirement; no custom binary socket protocol beyond HTTP and PostgreSQL wire protocol.

### 3.10 Database Requirements

PostgreSQL shall be the system of record. The following schemas define required tables, column types, indexes, foreign keys, soft-delete conventions, and tenant isolation rules. UUID primary keys are recommended; BIGSERIAL is acceptable if consistently applied.

#### 3.10.1 Tenant Isolation Rules

1. Tables `products`, `inventory_items` (or inventory fields on products), `scans`, `alerts`, and related child data shall include `business_id` (directly or via immutable parent FK).
2. All vendor data-access paths shall filter by `business_id` from the JWT context; client-supplied business_id shall be ignored unless it matches the token (or ADMIN using admin APIs).
3. Soft delete via `deleted_at TIMESTAMPTZ NULL` shall be used for products and users where historical references must remain.
4. Unique constraints involving emails/names shall be defined carefully (e.g., unique email on users; unique (business_id, name) on products where active).

#### 3.10.2 Table: users

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | UUID | PK |
| email | VARCHAR(255) | UNIQUE, NOT NULL, stored lowercase |
| password_hash | VARCHAR(255) | NOT NULL |
| full_name | VARCHAR(255) | NOT NULL |
| system_role | VARCHAR(32) | NOT NULL; `USER` or `ADMIN` |
| email_verified | BOOLEAN | NOT NULL DEFAULT FALSE |
| is_suspended | BOOLEAN | NOT NULL DEFAULT FALSE |
| password_version | INT | NOT NULL DEFAULT 1 |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| deleted_at | TIMESTAMPTZ | NULL soft delete |

Indexes: unique(email); index(system_role); index(deleted_at).

#### 3.10.3 Table: businesses

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | UUID | PK |
| business_name | VARCHAR(255) | NOT NULL |
| business_email | VARCHAR(255) | NULL |
| address | TEXT | NULL |
| contact_number | VARCHAR(64) | NULL |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| deleted_at | TIMESTAMPTZ | NULL |

Indexes: index(business_name); index(is_active).

#### 3.10.4 Table: business_users

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | UUID | PK |
| business_id | UUID | FK → businesses.id NOT NULL |
| user_id | UUID | FK → users.id NOT NULL |
| role | VARCHAR(32) | NOT NULL; `OWNER` or `EMPLOYEE` |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Constraints: UNIQUE(business_id, user_id); index(user_id); index(business_id, role).

#### 3.10.5 Table: products

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | UUID | PK |
| business_id | UUID | FK → businesses.id NOT NULL |
| name | VARCHAR(255) | NOT NULL |
| category | VARCHAR(128) | NULL |
| unit | VARCHAR(32) | NOT NULL DEFAULT `pcs` |
| low_stock_threshold | INT | NOT NULL DEFAULT 5 |
| quantity | NUMERIC(12,2) | NOT NULL DEFAULT 0 |
| freshness_summary | VARCHAR(32) | NULL; denormalized latest |
| last_scan_at | TIMESTAMPTZ | NULL |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| deleted_at | TIMESTAMPTZ | NULL |

Indexes: index(business_id); UNIQUE(business_id, name) WHERE deleted_at IS NULL (or equivalent app rule); index(business_id, quantity).

#### 3.10.6 Table: scans

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | UUID | PK |
| business_id | UUID | FK → businesses.id NOT NULL |
| user_id | UUID | FK → users.id NOT NULL |
| image_url | TEXT | NOT NULL |
| status | VARCHAR(32) | NOT NULL; PENDING/PROCESSING/COMPLETED/FAILED |
| category_hint | VARCHAR(128) | NULL |
| model_version | VARCHAR(64) | NULL |
| error_message | TEXT | NULL |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| completed_at | TIMESTAMPTZ | NULL |

Indexes: index(business_id, created_at DESC); index(status); index(user_id).

#### 3.10.7 Table: detections

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | UUID | PK |
| scan_id | UUID | FK → scans.id NOT NULL ON DELETE CASCADE |
| product_label | VARCHAR(128) | NOT NULL |
| product_id | UUID | FK → products.id NULL |
| count | INT | NOT NULL DEFAULT 1 |
| confidence | NUMERIC(5,4) | NOT NULL |
| bbox_json | JSONB | NULL |
| freshness | VARCHAR(32) | NULL; Fresh/Medium/Spoiled/UNKNOWN |
| freshness_confidence | NUMERIC(5,4) | NULL |
| needs_review | BOOLEAN | NOT NULL DEFAULT FALSE |
| corrected_label | VARCHAR(128) | NULL |
| corrected_freshness | VARCHAR(32) | NULL |
| corrected_count | INT | NULL |
| corrected_by | UUID | FK → users.id NULL |
| corrected_at | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Indexes: index(scan_id); index(product_id); index(freshness).

#### 3.10.8 Table: alerts

| Column | Type | Constraints / Notes |
|--------|------|---------------------|
| id | UUID | PK |
| business_id | UUID | FK → businesses.id NOT NULL |
| product_id | UUID | FK → products.id NULL |
| type | VARCHAR(32) | NOT NULL; LOW_STOCK/SPOILAGE |
| severity | VARCHAR(32) | NOT NULL; INFO/WARNING/CRITICAL |
| message | TEXT | NOT NULL |
| is_read | BOOLEAN | NOT NULL DEFAULT FALSE |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| resolved_at | TIMESTAMPTZ | NULL |

Indexes: index(business_id, created_at DESC); index(business_id, is_read); index(type, severity).

#### 3.10.9 Tables: auth_tokens / invites (supporting)

**email_verification_tokens / password_reset_tokens** (may be unified as `auth_tokens`): id, user_id FK, token_hash, purpose, expires_at, used_at, created_at. Index(token_hash); index(user_id, purpose).

**business_invites**: id, business_id FK, email, invited_by FK, token_hash, status, expires_at, accepted_user_id NULL, created_at. Index(token_hash); index(business_id).

#### 3.10.10 Inventory Adjustments Audit (recommended)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| business_id | UUID | FK |
| product_id | UUID | FK |
| user_id | UUID | FK |
| old_quantity | NUMERIC(12,2) | |
| new_quantity | NUMERIC(12,2) | |
| note | TEXT | NULL |
| created_at | TIMESTAMPTZ | |

#### 3.10.11 Referential Integrity and Cascades

1. Deleting a business (soft) shall hide child data from default queries.
2. Hard-deleting a scan may cascade detections.
3. Products referenced by detections should be soft-deleted, not hard-deleted.
4. Migrations shall create FKs and indexes above.

### 3.11 Licensing, Legal, Copyright, and Other Notices

1. SnapStock-AI is an **academic project prototype**. It is **not** a certified food safety inspection tool and shall not be marketed as a statutory inspection instrument under the Sri Lankan Food Act No. 26 of 1980 [12].
2. The UI and documentation shall include a disclaimer that vendors remain responsible for manual checks and compliance with applicable food safety laws and good hygiene practices.
3. User business data is confidential and shall be isolated per tenant; the team shall not disclose demo tenant data outside evaluation contexts without permission.
4. Training datasets shall be used according to their Kaggle/platform license terms [25], [26].
5. Open-source license obligations (especially AGPL for Ultralytics YOLO, if triggered by distribution) shall be observed in the final submission package [20].
6. Copyright of original SnapStock-AI source code created by the team remains with the authors for academic purposes unless otherwise required by the university.
7. No trademark of SAP, Square, or Afresh is implied by comparative references in Section 2.1; names are used solely for academic comparison [29]–[31].
8. Privacy: collect only data necessary for account, business profile, inventory, and scans; do not sell personal data.

### 3.12 Applicable Standards

| Standard | Application to SnapStock-AI |
|----------|-------------------------------|
| IEEE Std 830-1998 [7] | Structure and qualities of this SRS |
| RUP SRS Template [8] | Section organization without use-case diagrams |
| RFC 7519 JWT [10] | Access token format and validation expectations |
| OWASP Top 10 (2021) [11] | Security control awareness (NFR-SEC-005) |
| REST architectural constraints | Resource-oriented HTTP API design |
| Food Act No. 26 of 1980 [12] | Legal disclaimer boundary (supporting tool only) |
| WCAG (awareness) | Accessibility baseline intent in NFR-USE-006 |

---

## 4. Supporting Information

This section makes the SRS easier to use. It includes a requirement traceability matrix and appendices. **Appendix status (normative vs informative) is stated explicitly for each appendix.**

The glossary of terms appears in Section 1.3 and is not duplicated here.

### 4.1 Requirement Traceability Matrix

The following matrix traces major functional requirements to sprint windows, modules, and planned test types. It is **part of the requirements baseline** for planning verification.

| Requirement ID | Priority | Sprint (target) | Milestone | Module(s) | Test Type |
|----------------|----------|-----------------|-----------|-----------|-----------|
| FR-AUTH-001 | Must | 5–6 | M2–M3 | server, client | API + UI E2E |
| FR-AUTH-002 | Must | 5–6 | M2–M3 | server, client | API + UI E2E |
| FR-AUTH-003 | Must | 5–6 | M2 | client | UI |
| FR-AUTH-004 | Should | 6–7 | M3–M4 | server, client | API + email integration |
| FR-AUTH-005 | Should | 6–7 | M3–M4 | server, client | API + email integration |
| FR-AUTH-006 | Must | 5–6 | M2–M3 | server | API security |
| FR-TENANT-001 | Must | 5–6 | M2 | server | API + DB |
| FR-TENANT-002 | Should | 6–7 | M4 | server, client | API + UI |
| FR-TENANT-003 | Must | 5–7 | M2–M4 | server, client | API security / RBAC |
| FR-SCAN-001 | Must | 6 | M3 | client | UI |
| FR-SCAN-002 | Must | 6 | M3 | client | UI |
| FR-SCAN-003 | Must | 6 | M3 | client | UI unit |
| FR-SCAN-004 | Must | 6 | M3 | client, server, ai-service | E2E integration |
| FR-SCAN-005 | Must | 6 | M3 | server | API + DB |
| FR-DET-001 | Must | 6 | M3 | ai-service | Model + API |
| FR-DET-002 | Must | 6 | M3 | ai-service, server | Unit + API |
| FR-DET-003 | Must | 6–7 | M3–M4 | ai-service, server | Unit + API |
| FR-DET-004 | Must | 6 | M3 | server | DB |
| FR-FRESH-001 | Must | 6–7 | M3–M4 | ai-service | Model + API |
| FR-FRESH-002 | Should | 7 | M4 | server, client | API + UI |
| FR-FRESH-003 | Should | 7 | M4 | server, client | API + UI |
| FR-INV-001 | Must | 6–7 | M3–M4 | server, client | API + UI |
| FR-INV-002 | Must | 6 | M3 | server | Integration |
| FR-INV-003 | Must | 6–7 | M3–M4 | server, client | API + UI |
| FR-INV-004 | Must | 6–7 | M3–M4 | server, client | API + UI |
| FR-ALERT-001 | Must | 7 | M4 | server, client | Integration + UI |
| FR-ALERT-002 | Must | 7 | M4 | server, client | Integration + UI |
| FR-ALERT-003 | Should | 7 | M4 | server, client | API + UI |
| FR-ALERT-004 | Must | 7 | M4 | server, client | API + UI |
| FR-ANALYTICS-001 | Should | 7 | M4 | server, client | UI |
| FR-ANALYTICS-002 | Should | 7 | M4 | server | API |
| FR-ANALYTICS-003 | Should | 7 | M4 | client, server | UI |
| FR-ANALYTICS-004 | Could | 8 | M5 | server, client | UI |
| FR-ADMIN-001 | Must | 7 | M4 | server, client | API + UI |
| FR-ADMIN-002 | Should | 7–8 | M4–M5 | server, client | Integration |
| FR-ADMIN-003 | Should | 7 | M4 | server, client | API + UI |
| FR-SETTINGS-001 | Should | 7 | M4 | server, client | API + UI |
| FR-HEALTH-001 | Must | 5–6 | M2–M3 | server, ai-service | Smoke |
| FR-HEALTH-002 | Must | 6–7 | M3–M4 | server, client | Chaos/integration |
| NFR-PERF-001 | Must | 8 | M5 | all | Performance test |
| NFR-SEC-001..006 | Must | 6–8 | M3–M5 | server | Security checklist |
| NFR-REL-004 | Must | 7–8 | M4–M5 | ai-service | Offline eval metrics |

### 4.2 Appendices

#### Appendix status summary

| Appendix | Title | Part of requirements? |
|----------|-------|------------------------|
| A | Sample API request/response JSON | **Yes** — illustrative but field names are normative intent for MVP contracts |
| B | Data Dictionary | **Yes** — elaborates Section 3.10 meanings |
| C | MoSCoW Prioritization Table | **Yes** — prioritization baseline |
| D | Open Issues / TBD | **No** — informative tracking only; resolutions may generate SRS revisions |

### Appendix A — Sample API Request/Response JSON

**Status:** Part of requirements (contract examples).

#### A.1 Register

Request `POST /api/auth/register`:

```json
{
  "full_name": "Nimal Perera",
  "email": "nimal@example.com",
  "password": "SecurePass1",
  "business_name": "Nimal Fresh Mart",
  "address": "12 Market Road, Colombo",
  "contact_number": "+94771234567",
  "terms_accepted": true
}
```

Response `201 Created`:

```json
{
  "user": {
    "id": "11111111-1111-1111-1111-111111111111",
    "email": "nimal@example.com",
    "full_name": "Nimal Perera",
    "email_verified": false,
    "system_role": "USER"
  },
  "business": {
    "id": "22222222-2222-2222-2222-222222222222",
    "business_name": "Nimal Fresh Mart"
  },
  "message": "Registration successful. Please verify your email."
}
```

#### A.2 Login

Request `POST /api/auth/login`:

```json
{
  "email": "nimal@example.com",
  "password": "SecurePass1"
}
```

Response `200 OK`:

```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 86400,
  "user": {
    "id": "11111111-1111-1111-1111-111111111111",
    "email": "nimal@example.com",
    "full_name": "Nimal Perera",
    "system_role": "USER",
    "business_role": "OWNER",
    "business_id": "22222222-2222-2222-2222-222222222222"
  }
}
```

#### A.3 Create Scan (multipart described as JSON metadata + file)

Request `POST /api/scans` (`multipart/form-data`): fields `image` (file), optional `category_hint` (string).

Response `201/200` (COMPLETED example):

```json
{
  "scan": {
    "id": "33333333-3333-3333-3333-333333333333",
    "status": "COMPLETED",
    "image_url": "/uploads/33333333.jpg",
    "model_version": "yolov8n-fresh-v1",
    "created_at": "2026-09-01T10:15:00.000Z",
    "completed_at": "2026-09-01T10:15:04.200Z"
  },
  "detections": [
    {
      "id": "44444444-4444-4444-4444-444444444444",
      "product_label": "banana",
      "count": 6,
      "confidence": 0.91,
      "freshness": "Fresh",
      "freshness_confidence": 0.88,
      "needs_review": false,
      "bbox_json": {"x": 12, "y": 40, "w": 120, "h": 160}
    },
    {
      "id": "55555555-5555-5555-5555-555555555555",
      "product_label": "banana",
      "count": 2,
      "confidence": 0.84,
      "freshness": "Medium",
      "freshness_confidence": 0.67,
      "needs_review": false,
      "bbox_json": {"x": 200, "y": 50, "w": 110, "h": 150}
    }
  ],
  "inventory_update": [
    {"product_label": "banana", "quantity": 8, "freshness_summary": "Medium"}
  ]
}
```

#### A.4 Error shape (normative intent)

```json
{
  "error": {
    "code": "AI_UNAVAILABLE",
    "message": "AI analysis temporarily unavailable. Please retry shortly."
  }
}
```

### Appendix B — Data Dictionary

**Status:** Part of requirements.

| Data element | Meaning | Allowed values / format | Source |
|--------------|---------|-------------------------|--------|
| business_id | Tenant identifier | UUID | Server |
| user_id | Account identifier | UUID | Server |
| system_role | Platform role | USER, ADMIN | Server |
| business_role | Tenant role | OWNER, EMPLOYEE | Server |
| email | Login identity | Valid email, lowercase | User |
| password_hash | Stored credential | bcrypt hash | Server |
| scan.status | Lifecycle of a scan | PENDING, PROCESSING, COMPLETED, FAILED | Server |
| product_label | Detector class name | Model vocabulary string | AI |
| confidence | Detection confidence | 0.0–1.0 | AI |
| freshness | Freshness class | Fresh, Medium, Spoiled, UNKNOWN | AI/User correction |
| freshness_confidence | Classifier confidence | 0.0–1.0 | AI |
| needs_review | Low-confidence flag | true/false | Server rule |
| quantity | Stock level | ≥ 0 numeric | Server/User |
| low_stock_threshold | Alert trigger level | ≥ 0 integer | OWNER |
| alert.type | Alert classification | LOW_STOCK, SPOILAGE | Server |
| alert.severity | Urgency | INFO, WARNING, CRITICAL | Server |
| is_read | Alert read state | true/false | User |
| image_url | Stored image locator | URL/path string | Server |
| model_version | Inference artifact id | string | AI/Server |
| deleted_at | Soft-delete marker | timestamptz/NULL | Server |
| bbox_json | Bounding box | JSON object x,y,w,h (or xyxy) | AI |
| category_hint | Optional user hint | string/NULL | User |
| expires_in | Token lifetime seconds | integer | Server |
| terms_accepted | Legal acceptance | true required at signup | User |

### Appendix C — MoSCoW Prioritization Table

**Status:** Part of requirements (prioritization decisions).

| ID | Item | MoSCoW | Rationale |
|----|------|--------|-----------|
| FR-AUTH-001..003,006 | Core auth + JWT | Must | No secure multi-tenant app without auth |
| FR-AUTH-004..005 | Verify + reset | Should | Needed for polish; local demo bypass TBD |
| FR-TENANT-001,003 | Tenant + RBAC | Must | Core SaaS property |
| FR-TENANT-002 | Invite employee | Should | Important multi-user story |
| FR-SCAN-001..005 | Capture/upload path | Must | Primary value proposition entry |
| FR-DET-* / FR-FRESH-001 | AI pipeline | Must | Differentiator vs manual tools |
| FR-FRESH-002..003 | Threshold + correction | Should | Trust & accuracy UX |
| FR-INV-* | Inventory/catalog | Must | Persistent business value |
| FR-ALERT-001,002,004 | Alerts core | Must | Actionability |
| FR-ALERT-003 | Filters | Should | Usability at scale |
| FR-ANALYTICS-001..003 | Charts/trends/filters | Should | Mid/final evaluation strength |
| FR-ANALYTICS-004 | Export | Could | Stretch |
| FR-ADMIN-001 | Vendor mgmt | Must | Admin actor story |
| FR-ADMIN-002..003 | Health/stats | Should | Operability |
| FR-SETTINGS-001 | Settings | Should | Account hygiene |
| FR-HEALTH-* | Health/degraded | Must | Demo resilience |
| NFR-PERF/SEC/REL core | Quality attributes | Must | Academic + practical acceptance |
| Sinhala/Tamil i18n | Localization | Won't | Future roadmap |
| Offline scan queue | Offline-first | Won't | Out of schedule |
| SMS alerts | Notification channel | Won't | Cost/scope |
| Native mobile stores | iOS/Android apps | Won't | Responsive web only |

### Appendix D — Open Issues / TBD

**Status:** Not part of the requirements baseline (informative). Resolutions shall be reflected in a future SRS revision if they change normative behavior.

| ID | Topic | Question / Risk | Owner | Target resolution |
|----|-------|-----------------|-------|-------------------|
| TBD-01 | Email in local demo | If SMTP unavailable, allow verified-by-default flag for localhost? | Backend | Sprint 5 |
| TBD-02 | Inventory update semantics | Confirm replace-from-latest-scan vs incremental deltas for mixed trays | Team + Mentor | Sprint 6 |
| TBD-03 | Unknown product labels | Auto-create catalog stubs vs require pre-registration | Team | Sprint 6 |
| TBD-04 | Per-user alert read state | Shared business read vs per-user read table | Backend | Sprint 7 |
| TBD-05 | YOLO license packaging | Exact AGPL compliance steps for submission zip | Team | Sprint 8 |
| TBD-06 | Confidence defaults | Finalize numeric thresholds after first model eval | AI lead | Sprint 7 |
| TBD-07 | Image retention | Retention days for uploaded images on demo host | Team | Sprint 8 |
| TBD-08 | Multi-business owners | Explicitly Won't — document error if attempted | Backend | Sprint 5 |
| TBD-09 | PDF export | Drop to Won't if CSV slips | Frontend | Sprint 8 |
| TBD-10 | Model card publication | Metrics table format in testing document | AI lead | Sprint 8 |

---

## Document Control

| Item | Value |
|------|-------|
| Document | SnapStock-AI Software Requirements Specification |
| Version | 1.1 |
| Date | 25 July 2026 |
| Next review | Progress Review 1 (10–14 August 2026) and as change-controlled thereafter |
| Template basis | IEEE 830-1998 + RUP SRS (natural language; no use-case diagrams) [7], [8] |

*End of Software Requirements Specification*

