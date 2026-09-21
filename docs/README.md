# SnapStock-AI Documentation

This folder contains project planning, requirements, and architecture documentation for **SnapStock-AI** — an AI-powered automated inventory and freshness monitoring system for small-scale retailers.

## Document Index

| Document | File | Due Date | Status |
|----------|------|----------|--------|
| Project Proposal | [project-proporsal.md](./project-proporsal.md) | 05 Jul 2026 | Submitted |
| Feasibility Report | [feasability-report.md](./feasability-report.md) | 12 Jul 2026 | Submitted |
| Project Management Plan | [project-management](./project-management) | 12 Jul 2026 | Submitted |
| **Software Requirements Specification (SRS)** | [srs.md](./srs.md) | 09 Aug 2026 | v1.1 Baseline |
| **Software Architecture Document (SAD)** | [software-architecture-document.md](./software-architecture-document.md) | 09 Aug 2026 | v1.1 Draft |
| Kanban / Issue Blueprint | [KANBAN_ISSUE_BLUEPRINT.md](./KANBAN_ISSUE_BLUEPRINT.md) | Ongoing | Reference |
| Authentication Guide | [AUTHENTICATION-GUIDE.md](./AUTHENTICATION-GUIDE.md) | Ongoing | Interview / mid-eval |
| CodeGen Interview Prep | [CODEGEN-INTERVIEW-PREP-SNAPSTOCK-AI.md](./CODEGEN-INTERVIEW-PREP-SNAPSTOCK-AI.md) | Ongoing | Interview |
| Design Patterns & OOP | [DESIGN-PATTERNS-AND-OOP.md](./DESIGN-PATTERNS-AND-OOP.md) | Ongoing | Interview |
| OOP / GoF / Normalization | [INTERVIEW-OOP-GOF-NORMALIZATION.md](./INTERVIEW-OOP-GOF-NORMALIZATION.md) | Ongoing | Interview |

## Templates

| Template | File |
|----------|------|
| SRS Template (RUP / IEEE 830) | [srs-template.md](./srs-template.md) |
| Software Architecture Document Template | [4 Template for Software Architecture Document.pdf](./4%20Template%20for%20Software%20Architecture%20Document.pdf) |

## Deliverable Summary

### SRS (`srs.md`) — Version 1.1

- IEEE 830 / RUP structure (no use-case diagrams; detailed natural-language FRs)
- ~40 printed pages (~3,300 lines / ~21,000 words)
- 39 functional requirements with flows, business rules, and acceptance criteria
- Expanded NFRs: usability, reliability, performance, security, supportability
- UI wireframe descriptions, REST inventory, PostgreSQL schemas
- Traceability matrix + Appendices A–D (sample payloads, data dictionary, MoSCoW, open issues)

### SAD (`software-architecture-document.md`) — Version 1.1

- RUP 4+1 views + Data View
- ~35–40 printed pages (~2,450+ lines / ~16,000+ words)
- **36+ detailed ASCII diagrams**: context, C4 containers, use cases, class, activity, sequence (multi-lifeline), deployment, ER, DFD L0/L1, AI pipeline, security, degraded modes, API map
- 10 use-case realizations; ADR decision tables; quality attribute scenarios
- Diagram tool: ASCII for now (draw.io / PlantUML later)

## Quick Links

- **SRS** — What the system must do (functional and non-functional requirements)
- **SAD** — How the system is structured (architecture views, diagrams, deployment)

## Repository Structure

```
SnapStock-AI/
├── client/          # React 19 + TypeScript + Vite frontend
├── server/          # Node.js + Express + PostgreSQL API
├── ai-service/      # Python FastAPI AI microservice
├── docs/            # Project documentation (this folder)
└── docker-compose.yml
```

## Team

| Name | Index No. |
|------|-----------|
| ABEYWARDANA S.M. | 230011P |
| ANDRAHENNADI N.J. | 230042K |
| ATHTHANAYAKE A.M.R.N | 230062V |

**Mentor:** Mr. Kavinda Rajapaksha | **PID:** 5
