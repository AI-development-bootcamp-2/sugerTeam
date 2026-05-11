# Implementation Plan: Time Reporting System

**Branch**: `master` | **Date**: 2026-05-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-time-reporting-system/spec.md`

---

## Summary

A Hebrew-RTL, mobile-first web application for internal employee time and absence reporting.
Employees submit daily work-hour records linked to a three-level Client → Project → Task hierarchy,
report absences with optional document upload, and track monthly completeness via a calendar view.
Team leads assign employees to tasks; admins manage all entities and lock monthly reporting periods.

Built with Express.js (TypeScript) + React 18 + Vite + Prisma + PostgreSQL 15.
**Team**: 4 developers | **Timeline**: 5 calendar days | **Sprints**: 2

---

## Technical Context

**Language/Version**: TypeScript — Node.js 20 (backend), React 18 (frontend)
**Primary Dependencies**: Express.js, Prisma ORM, React 18 + Vite, React Query, Zustand, Tailwind CSS 3, React Hook Form, Zod, jsonwebtoken, bcrypt, Multer
**Storage**: PostgreSQL 15 (primary), local filesystem for absence document uploads in v1
**Testing**: Jest + Supertest (backend), Vitest + React Testing Library (frontend)
**Target Platform**: Web — Chrome, Edge, Safari; mobile-first responsive design
**Project Type**: Web application — React SPA + Express REST API
**Performance Goals**: API p95 < 200ms for standard report queries; form submit < 300ms perceived
**Constraints**: Hebrew RTL throughout; mobile-first; 5-day delivery; no self-registration; no payroll
**Scale/Scope**: 20–200 internal company users; single-tenant deployment

---

## Constitution Check

*Gate evaluated against constitution v1.0.0 — must pass before Phase 0 research.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Simple Daily Reporting | ✅ PASS | Single-screen form; auto-selects when one task assigned (FR-015); server-side draft survives refresh (FR-016) |
| II. Clear Work Structure | ✅ PASS | Client→Project→Task FK chain enforced at DB + API; free-form task not possible |
| III. Reliable and Organized Data | ✅ PASS | Soft-delete (`deletedAt`) on all entities; historical reports retain all FK references |
| IV. Role-Based Access | ✅ PASS | Express middleware enforces role on every route; JWT claims carry role; no self-escalation |
| V. Monthly Closure | ✅ PASS | MonthLock entity; lock-check middleware applied to all write endpoints; HTTP 423 returned |
| VI. Absence Reporting | ✅ PASS | AbsenceReport first-class entity; 4 fixed types; document upload decoupled from creation (FR-025) |
| VII. Transparency | ✅ PASS | Monthly status API returns per-day Complete/Missing/Exceptional; admin can view all employees |

**All gates PASS. Proceeding to Phase 0 research → [research.md](research.md)**

*Post-design re-check: data model and API contracts introduce no new violations.*

---

## Project Structure

### Documentation (this feature)

```text
specs/001-time-reporting-system/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── api.md           ← REST API contracts
└── tasks.md             ← Phase 2 output (via /speckit-tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── middleware/      # auth guard, role check, month-lock check
│   ├── routes/          # auth, users, clients, projects, tasks, assignments,
│   │                    # reports, absences, timer, months, audit
│   ├── services/        # business logic per domain
│   ├── prisma/          # Prisma client singleton
│   └── app.ts           # Express app setup
├── prisma/
│   └── schema.prisma    # DB schema + migrations
└── tests/               # Jest + Supertest

frontend/
├── src/
│   ├── components/      # Shared RTL-aware UI primitives
│   ├── pages/
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── reports/     # Daily report form + monthly view
│   │   ├── absences/    # Absence report form
│   │   ├── timer/       # Timer widget
│   │   └── admin/       # User/entity management, assignments, month closure
│   ├── services/        # Axios API client
│   ├── store/           # Zustand: auth + timer state
│   └── main.tsx
└── tests/               # Vitest + React Testing Library
```

**Structure Decision**: Web application — `backend/` (Express REST API) + `frontend/` (React SPA).
Shared TypeScript types may be extracted to a `shared/` package in v1 if time permits.

---

## Team & Sprint Planning

> All 8 epics covering all 7 user stories from the spec are included across both sprints.

### Team Roles

| Dev | Role | Primary Focus |
|-----|------|---------------|
| Dev 1 | Backend Lead | Express setup, Prisma schema, auth, core report APIs, month lock |
| Dev 2 | Backend Dev | Entity management APIs, absence, timer, audit log |
| Dev 3 | Frontend Lead | React + Vite setup, RTL layout system, auth UI, report form |
| Dev 4 | Frontend Dev | Admin UI, monthly calendar, absence form, timer widget |

---

### Epic Overview

| Epic | Name | Spec Priority | Sprint |
|------|------|---------------|--------|
| EPIC-001 | Foundation & Authentication | P0 (prerequisite) | Sprint 1 |
| EPIC-002 | Admin Entity Management | P6 | Sprint 1 |
| EPIC-003 | Task Assignment | P5 | Sprint 1 |
| EPIC-004 | Daily Time Reporting | P1 | Sprint 1–2 |
| EPIC-005 | Absence Reporting | P2 | Sprint 2 |
| EPIC-006 | Monthly Calendar View | P3 | Sprint 2 |
| EPIC-007 | Timer Feature | P4 | Sprint 2 |
| EPIC-008 | Month Closure & Audit | P7 | Sprint 2 |

---

### Sprint 1 — Days 1–2 (8 person-days)

**Goal**: Working end-to-end auth, complete DB schema, admin entity management, task assignment, and time-report API + form skeleton.

---

#### EPIC-001: Foundation & Authentication

| Story ID | Title | Assignee | Story Points | Acceptance Criteria |
|----------|-------|----------|:---:|---------------------|
| US-001 | Project setup: monorepo structure, TypeScript, ESLint, Prettier, Docker Compose (backend + frontend + postgres) | Dev 1 + Dev 3 | 2 | `docker-compose up` boots all three services; `GET /health` returns 200 |
| US-002 | Prisma schema: all entities with relations, soft-delete fields, migrations, seed script (admin user) | Dev 1 | 3 | `prisma migrate dev` runs clean; seed creates admin@company.com |
| US-003 | Auth API: `POST /auth/login` (email+pw → tokens), `POST /auth/refresh`, `POST /auth/logout`; bcrypt (cost 12); 2h access token + 30d httpOnly refresh cookie | Dev 1 | 2 | Valid login returns tokens; invalid returns 401; inactive user returns 401; refresh rotates tokens |
| US-004 | Auth UI: Hebrew RTL login page; form validation; token refresh on 401; redirect to dashboard | Dev 3 | 2 | Employee logs in, lands on dashboard; refresh survives page reload |

**EPIC-001 Sprint 1 total**: 9 pts

---

#### EPIC-002: Admin Entity Management

| Story ID | Title | Assignee | Story Points | Acceptance Criteria |
|----------|-------|----------|:---:|---------------------|
| US-005 | User management API: `GET/POST /users`, `PATCH /users/:id`, `PATCH /users/:id/deactivate`; admin-only; role enum | Dev 2 | 2 | Admin creates user; user logs in; deactivated user gets 401 |
| US-006 | Client/Project/Task CRUD API: REST endpoints for each; soft-delete; parent FK validation; `GET /clients/active` for dropdown | Dev 2 | 3 | Admin creates client→project→task chain; inactive client absent from dropdown endpoint |
| US-007 | Admin Users UI (Hebrew RTL): list, create, edit, deactivate; role selector; success/error feedback | Dev 4 | 2 | Admin creates user with role via UI; deactivated user no longer visible in active list |
| US-008 | Admin Clients/Projects/Tasks UI: hierarchical create/edit/deactivate; cascade visual hints | Dev 4 | 2 | Admin creates full client→project→task chain via UI |
| US-025 | Admin Entity Form Fields — backend: extend Prisma schema (description, startDate, endDate on Client/Project/Task; primaryManagerId FK on Project); update Zod schemas in clients/projects/tasks routes; add `GET /users/managers` (admin-only) | Dev 2 | 2 | New nullable columns migrate cleanly; POST/PATCH with new fields persist correctly; endDate < startDate returns 400; managers endpoint returns only active TEAM_LEAD/ADMIN users |
| US-026 | Admin Entity Form Fields — frontend: extend Client/Project/Task TypeScript interfaces; add `useManagers` query hook; update ClientsPage (description), ProjectsPage (description, client dropdown, manager dropdown "שיוך מנהל ראשי", startDate/endDate), TasksPage (description, project dropdown "שיוך לפרויקט קיים", startDate/endDate); cross-field date validation in RHF | Dev 4 | 2 | All new fields render and save via UI; endDate < startDate shows inline validation error |

**EPIC-002 Sprint 1 total**: 13 pts

---

#### EPIC-003: Task Assignment

| Story ID | Title | Assignee | Story Points | Acceptance Criteria |
|----------|-------|----------|:---:|---------------------|
| US-009 | Assignment API: `POST /assignments`, `DELETE /assignments/:id`; team-lead + admin guard; `GET /tasks/my-assigned` for employee dropdown | Dev 2 | 1 | Team lead assigns employee; employee's dropdown endpoint returns that task |
| US-010 | Assignment UI (Team Lead): search employees, assign/unassign tasks; filtered by their scope | Dev 4 | 1 | Team lead assigns Employee A to Task T; A sees T in report form dropdown |

**EPIC-003 Sprint 1 total**: 2 pts

---

#### EPIC-004: Daily Time Reporting (Sprint 1 portion — API only)

| Story ID | Title | Assignee | Story Points | Acceptance Criteria |
|----------|-------|----------|:---:|---------------------|
| US-011 | Time Report CRUD API: `POST /reports`, `GET /reports?userId=&date=`, `PATCH /reports/:id`, `DELETE /reports/:id`; overlap check; midnight-crossing rejection; month-lock check; duration calculation | Dev 1 | 3 | Overlap returns 422; midnight crossing returns 422; locked month returns 423; valid report saves with duration |
| US-012 | Draft save API: `PUT /reports/draft` — upsert per-user draft; cleared on final submit | Dev 1 | 1 | Draft survives page refresh; final submit clears draft |

**EPIC-004 Sprint 1 total**: 4 pts (UI continues in Sprint 2)

---

**Sprint 1 Definition of Done**:
- [ ] Login/logout works end-to-end (UI → API → DB)
- [ ] Admin can create User, Client, Project, Task, and Assignment via UI
- [ ] Time Report CRUD API fully functional with all validation
- [ ] All routes protected by role middleware (non-admin gets 403 on admin routes)
- [ ] Database schema complete, migration runs clean, seed creates admin user
- [ ] Hebrew RTL layout renders correctly on mobile Chrome
- [ ] Docker Compose boots all services without errors

**Sprint 1 capacity**: 4 devs × 2 days = 8 person-days → ~24 story points

---

### Sprint 2 — Days 3–5 (12 person-days)

**Goal**: Complete all employee-facing features — daily report UI, absence reporting, monthly view, timer, month closure, and audit log.

---

#### EPIC-004: Daily Time Reporting (Sprint 2 portion — UI)

| Story ID | Title | Assignee | Story Points | Acceptance Criteria |
|----------|-------|----------|:---:|---------------------|
| US-013 | Daily report form UI (Hebrew RTL): date picker, work-location enum, start/end time, cascading client→project→task dropdowns (assigned + active only), description ≤500 chars, live duration display, save + clear validation messages | Dev 3 | 3 | Employee submits report; daily total updates; overlap error message shown inline |
| US-014 | Daily hours progress bar: reported hours vs. 9h standard; non-blocking warning below/above; auto-select when only one task assigned | Dev 3 | 1 | Progress bar % correct; warning shown; single task auto-selected |

**EPIC-004 Sprint 2 total**: 4 pts

---

#### EPIC-005: Absence Reporting

| Story ID | Title | Assignee | Story Points | Acceptance Criteria |
|----------|-------|----------|:---:|---------------------|
| US-015 | Absence Report API: `POST /absences`, `PATCH /absences/:id`, `DELETE /absences/:id`; Fri+Sat exclusion from day count; month-lock check; document-required flag for SickLeave + MilitaryReserve | Dev 2 | 2 | Sick leave saves with doc-required flag; Fri/Sat excluded correctly; locked month returns 423 |
| US-016 | Document upload API: `POST /absences/:id/document` (multipart/form-data); store file; `DELETE /absences/:id/document`; upload allowed after month is locked | Dev 2 | 1 | Upload returns file metadata; upload on locked-month absence succeeds; second upload replaces first |
| US-017 | Absence form UI: date range picker, absence type selector, partial-day checkbox, document-required notice, file upload widget; Fri/Sat count exclusion shown live | Dev 4 | 2 | Employee submits sick leave; uploads doc after save; doc-required badge visible until upload |

**EPIC-005 total**: 5 pts

---

#### EPIC-006: Monthly Calendar View

| Story ID | Title | Assignee | Story Points | Acceptance Criteria |
|----------|-------|----------|:---:|---------------------|
| US-018 | Monthly status API: `GET /reports/monthly-status?userId=&year=&month=`; returns per-day status: `COMPLETE` / `MISSING` / `EXCEPTIONAL` / `NON_WORKING`; uses WorkCalendarDay for holidays | Dev 2 | 2 | Returns correct status for days with reports, days without, and weekend/holiday days |
| US-019 | Monthly calendar UI (Hebrew RTL): month navigation, day grid with color-coded status indicators, report list below calendar, click report → edit (open month) or read-only (locked); locked-month indicator | Dev 4 | 3 | Employee sees correct status per day; can edit open-month report; locked-month report opens read-only |

**EPIC-006 total**: 5 pts

---

#### EPIC-007: Timer Feature

| Story ID | Title | Assignee | Story Points | Acceptance Criteria |
|----------|-------|----------|:---:|---------------------|
| US-020 | Timer API: `POST /timer/start`, `POST /timer/stop`, `GET /timer/status`; one active timer per user; server-stored start time | Dev 2 | 1 | Start timer; close browser; reopen → timer still shows original start time |
| US-021 | Timer UI: persistent header bar showing elapsed time; Start / End buttons; End pre-populates daily report form with start + end times | Dev 3 | 1 | Employee clicks End; report form opens with correct times pre-filled |

**EPIC-007 total**: 2 pts

---

#### EPIC-008: Month Closure & Audit Log

| Story ID | Title | Assignee | Story Points | Acceptance Criteria |
|----------|-------|----------|:---:|---------------------|
| US-022 | Month lock API: `POST /months/:year/:month/lock`, `POST /months/:year/:month/unlock`; admin only; store actor + timestamp; locked check already applied by report/absence write routes | Dev 1 | 2 | Admin locks month; report write returns 423; admin unlocks; write succeeds |
| US-023 | Audit log: intercept every admin edit/delete of employee TimeReport or AbsenceReport; write AuditLog row (before/after JSON); `GET /audit-logs?userId=&year=&month=` | Dev 1 | 2 | After admin edits report, audit log entry exists with correct before/after values within 1s |
| US-024 | Month closure UI: Admin panel shows month list with lock status; Lock / Unlock buttons with confirmation dialog | Dev 4 | 1 | Admin locks month from UI; employees receive 423 error with locked-month message |

**EPIC-008 total**: 5 pts

---

**Sprint 2 Definition of Done**:
- [ ] Employee submits daily work report end-to-end (form → API → DB → updated daily total)
- [ ] Absence report with document upload works (including after-the-fact upload)
- [ ] Monthly calendar displays correct Complete/Missing/Exceptional statuses
- [ ] Timer persists across browser close/reopen
- [ ] Admin can lock/unlock a month; all write endpoints honor the lock
- [ ] Audit log records every admin edit with before/after values
- [ ] Entire UI in Hebrew RTL; usable on mobile Chrome without horizontal scroll
- [ ] No P1 bugs; all acceptance criteria from spec pass manual test

**Sprint 2 capacity**: 4 devs × 3 days = 12 person-days → ~36 story points

---

### Capacity Summary

| Sprint | Days | Devs | Person-Days | Story Points | Key Deliverables |
|--------|------|------|:-----------:|:------------:|-----------------|
| Sprint 1 | Days 1–2 | 4 | 8 | ~24 | Auth, DB schema, admin entity management, task assignment, report API |
| Sprint 2 | Days 3–5 | 4 | 12 | ~36 | Report UI, absences + docs, monthly calendar, timer, month closure, audit |
| **Total** | **5 days** | **4** | **20** | **~60** | **All 7 user stories delivered** |

*Story point scale: 1 pt ≈ 0.3 developer-days (complexity-weighted). Capacity is the binding constraint.*

---

### Feature Coverage Matrix

| User Story | Epic | Sprint | Devs |
|------------|------|--------|------|
| US1 — Employee submits daily work report | EPIC-004 | 1 (API) + 2 (UI) | Dev 1, Dev 3 |
| US2 — Employee reports an absence | EPIC-005 | 2 | Dev 2, Dev 4 |
| US3 — Employee views monthly status | EPIC-006 | 2 | Dev 2, Dev 4 |
| US4 — Timer-based workday start/end | EPIC-007 | 2 | Dev 2, Dev 3 |
| US5 — Team lead assigns employees to tasks | EPIC-003 | 1 | Dev 2, Dev 4 |
| US6 — Admin manages system entities | EPIC-001 + EPIC-002 | 1 | Dev 1, Dev 2, Dev 3, Dev 4 |
| US7 — Admin locks/reopens reporting month | EPIC-008 | 2 | Dev 1, Dev 4 |

---

## Complexity Tracking

> No constitution violations requiring justification.

---

*Phase 0 → [research.md](research.md)*
*Phase 1 → [data-model.md](data-model.md) · [contracts/api.md](contracts/api.md) · [quickstart.md](quickstart.md)*
