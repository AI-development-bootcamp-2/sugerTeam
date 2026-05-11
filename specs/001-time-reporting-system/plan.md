# Implementation Plan: Time Reporting System

**Branch**: `001-time-reporting-system` | **Date**: 2026-05-06 (Updated: 2026-05-11) | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-time-reporting-system/spec.md`

---

## Summary

Two Hebrew-RTL, mobile-first React SPAs backed by a shared Express REST API and a single PostgreSQL database:

- **Time Management Platform** — employees, team leads, and admins submit daily work-hour records, report absences, and track monthly completeness via a calendar view.
- **Admin Platform** — admins manage all system entities (users, clients, projects, tasks, assignments) and control month closure. Team leads access assignment management here.

Both platforms use the **same login page** (identical RTL design, same `/api/v1/auth/login` endpoint); post-login routing is role-driven. All data is stored in one shared database — no duplication. Admins are also employees and use the Time Management Platform for their own time/absence reporting.

Built with Express.js (TypeScript) + React 18 + Vite + Prisma + PostgreSQL 15.
**Team**: 4 developers | **Timeline**: 5 calendar days (+ 1 CI/CD sprint) | **Sprints**: 3

---

## Technical Context

**Language/Version**: TypeScript — Node.js 20 (backend), React 18 (frontend)
**Primary Dependencies**: Express.js, Prisma ORM, React 18 + Vite, TanStack Query v5, Zustand, Tailwind CSS 3, React Hook Form, Zod, jsonwebtoken, bcrypt, Multer
**Storage**: PostgreSQL 15 (primary), local filesystem for absence document uploads in v1 (abstracted behind `FileStorageService` for future S3 swap)
**Testing**: Jest + Supertest (backend), Vitest + React Testing Library (frontend)
**Target Platform**: Web — Chrome, Edge, Safari; mobile-first responsive design
**Project Type**: Two React SPAs (`frontend-time_management/` + `frontend-admin`) + Express REST API (`backend/`)
**Performance Goals**: API p95 < 200ms for standard report queries; form submit < 300ms perceived
**Constraints**: Hebrew RTL throughout; mobile-first; 5-day delivery; no self-registration; no payroll; 15 MB max absence document upload
**Scale/Scope**: 20–200 internal company users; single-tenant deployment

---

## Constitution Check

*Gate evaluated against constitution v1.0.0 — must pass before Phase 0 research.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Simple Daily Reporting | ✅ PASS | Single-screen form; auto-selects when one task assigned (FR-015); server-side draft survives refresh (FR-016); draft never auto-expires |
| II. Clear Work Structure | ✅ PASS | Client→Project→Task FK chain enforced at DB + API; free-form task not possible |
| III. Reliable and Organized Data | ✅ PASS | Soft-delete (`deletedAt`) on all entities; historical reports retain all FK references |
| IV. Role-Based Access | ✅ PASS | Express middleware enforces role on every route; JWT claims carry role; no self-escalation; optimistic locking (FR-042) prevents silent overwrites |
| V. Monthly Closure | ✅ PASS | MonthLock entity; lock-check middleware applied to all write endpoints; HTTP 423 returned |
| VI. Absence Reporting | ✅ PASS | AbsenceReport first-class entity; 4 fixed types; document upload decoupled from creation (FR-025); 15 MB limit enforced server-side; owner+admin-only download (FR-025a) |
| VII. Transparency | ✅ PASS | Monthly status API returns per-day Complete/Missing/Exceptional; admin can view all employees |

**All gates PASS.**

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
├── tasks.md             ← aggregated task index
└── tasks-epic-00N.md    ← per-epic detailed tasks (EPIC-001 through EPIC-009)
```

### Source Code (repository root)

```text
backend/                          # Shared Express REST API
├── src/
│   ├── middleware/               # auth guard, role check, month-lock check, upload
│   ├── routes/                   # auth, users, clients, projects, tasks,
│   │                             # assignments, reports, absences, timer, months,
│   │                             # audit-logs
│   ├── services/                 # business logic per domain
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── client.service.ts
│   │   ├── project.service.ts
│   │   ├── task.service.ts
│   │   ├── assignment.service.ts
│   │   ├── report.service.ts
│   │   ├── absence.service.ts
│   │   ├── file-storage.service.ts
│   │   ├── timer.service.ts
│   │   ├── monthly-status.service.ts
│   │   ├── month-lock.service.ts
│   │   └── audit-log.service.ts
│   ├── prisma/                   # Prisma client singleton
│   └── app.ts                    # Express app setup
├── prisma/
│   └── schema.prisma             # DB schema + migrations (single shared DB)
└── tests/                        # Jest + Supertest

frontend-time_management/                         # Time Management Platform (employees, team leads, admins)
├── src/
│   ├── components/               # Shared RTL-aware UI primitives; AppLayout; ProtectedRoute
│   ├── pages/
│   │   ├── login/                # LoginPage (same design as admin platform)
│   │   ├── dashboard/            # DashboardPage
│   │   ├── reports/              # DailyReportPage, MonthlyCalendarPage, components/
│   │   ├── absences/             # AbsenceFormPage, components/
│   │   └── timer/                # TimerWidget
│   ├── services/                 # Axios API client + React Query hooks per domain
│   ├── store/                    # Zustand: authStore, timerStore
│   └── main.tsx
└── tests/                        # Vitest + React Testing Library

frontend-admin                   # Admin Platform (admins only)
├── src/
│   ├── components/               # AdminLayout (RTL sidebar), shared primitives
│   ├── pages/
│   │   ├── login/                # Same login page design as employee platform
│   │   ├── users/                # UsersListPage, CreateUserModal, EditUserModal
│   │   ├── clients/              # ClientsPage, ProjectsSection, TasksSection
│   │   ├── assignments/          # AssignmentsPage
│   │   └── months/               # MonthClosurePage
│   ├── services/                 # Axios API client + React Query hooks per domain
│   ├── store/                    # Zustand: authStore
│   └── main.tsx
└── tests/                        # Vitest + React Testing Library
```

**Structure Decision**: Two separate React SPAs (`frontend-time_management/` and `frontend-admin`) sharing one `backend/` Express REST API and one PostgreSQL database. Login page component is duplicated across both SPAs (same implementation) and hits the same `/api/v1/auth/login` endpoint.

---

## Team & Sprint Planning

> All 9 epics covering all 7 user stories from the spec are included across 3 sprints.

### Team Roles

| Dev | Role | Primary Focus |
|-----|------|---------------|
| Dev 1 | Backend Lead | Express setup, Prisma schema, auth, core report APIs, month lock, audit, CI |
| Dev 2 | Backend Dev | Entity management APIs, absence, timer, monthly status |
| Dev 3 | Frontend Lead | React + Vite setup, RTL layout system, auth UI, report form, timer UI |
| Dev 4 | Frontend Dev | Admin UI, monthly calendar, absence form |

---

### Epic Overview

Epics are grouped by the platform they primarily deliver. Backend API work is shared; the platform column indicates where the frontend work lands.

#### 🔵 Shared Foundation — both platforms

| Epic | Name | Spec Priority | Sprint | Assignees |
|------|------|---------------|--------|-----------|
| EPIC-001 | Foundation & Authentication | P0 (prerequisite) | 1 | Dev 1 + Dev 3 |

#### 🟢 Time Management Platform (`frontend-time_management/`) — employees, team leads, admins' own reporting

| Epic | Name | Spec Priority | Sprint | Assignees |
|------|------|---------------|--------|-----------|
| EPIC-004 | Daily Time Reporting | P1 | 1 (API) + 2 (UI) | Dev 1 + Dev 3 |
| EPIC-005 | Absence Reporting | P2 | 2 | Dev 2 + Dev 4 |
| EPIC-006 | Monthly Calendar View | P3 | 2 | Dev 2 + Dev 4 |
| EPIC-007 | Timer Feature | P4 | 2 | Dev 2 + Dev 3 |

#### 🟠 Admin Platform (`frontend-admin`) — admins and team leads managing the system

| Epic | Name | Spec Priority | Sprint | Assignees |
|------|------|---------------|--------|-----------|
| EPIC-002 | Admin Entity Management | P6 | 1 | Dev 2 + Dev 4 |
| EPIC-003 | Task Assignment | P5 | 1 | Dev 2 + Dev 4 |
| EPIC-008 | Month Closure & Audit Log | P7 | 2 | Dev 1 + Dev 4 |

#### ⚙️ DevOps — both platforms

| Epic | Name | Spec Priority | Sprint | Assignees |
|------|------|---------------|--------|-----------|
| EPIC-009 | CI/CD Pipeline | P8 | 3 | Dev 1 |

---

### Sprint 1 — Days 1–2 (8 person-days)

**Goal**: Working end-to-end auth, complete DB schema, admin entity management, task assignment, and time-report API + form skeleton.

---

#### 🔵 EPIC-001: Foundation & Authentication — Shared
*Tasks file*: [tasks-epic-001.md](tasks-epic-001.md) | **Depends on**: nothing | **Blocks**: ALL other epics

| Story ID | Title | Assignee | Story Points | Acceptance Criteria |
|----------|-------|----------|:---:|---------------------|
| US-001 (T001–T006) | Monorepo setup: .gitignore, .env.example, pnpm-workspace.yaml, Docker Compose (backend + frontend-time_management + postgres), ESLint/Prettier, Tailwind CSS | Dev 1 + Dev 3 | 2 | `docker-compose up` boots all three services; `GET /api/v1/health` returns 200 |
| US-002 (T007–T011) | Foundational: Express app, Prisma schema (all entities), migration, seed (admin@company.com), Prisma client singleton | Dev 1 | 3 | `prisma migrate dev` runs clean; seed creates admin@company.com |
| US-003 (T012–T016) | Auth API: POST /auth/login, /auth/refresh, /auth/logout; bcrypt cost 12; JWT 2h/30d; auth + role guard middleware; monthLock middleware; route registration + error handlers | Dev 1 | 2 | Valid login returns tokens; invalid → 401; inactive → 401; refresh rotates tokens |
| US-004 (T017–T020) | Auth UI: Zustand auth store, Axios API client (token refresh interceptor), React Router v6, Hebrew RTL login page (RHF + Zod) | Dev 3 | 2 | Employee logs in → dashboard; refresh survives page reload; mobile layout correct |

**EPIC-001 Sprint 1 total**: 9 pts

---

#### 🟠 EPIC-002: Admin Entity Management — Admin Platform
*Tasks file*: [tasks-epic-002.md](tasks-epic-002.md) | **Depends on**: EPIC-001 complete | **Blocks**: EPIC-003, EPIC-004

| Story ID | Title | Assignee | Story Points | Acceptance Criteria |
|----------|-------|----------|:---:|---------------------|
| US-005 (T001–T002) | User management API: GET/POST /users, PATCH /users/:id, deactivate/activate; admin-only; role enum | Dev 2 | 2 | Admin creates user; user logs in; deactivated user → 401 |
| US-006 (T003–T008) | Client/Project/Task CRUD API: REST endpoints; soft-delete; parent FK validation; active dropdowns | Dev 2 | 3 | Admin creates client→project→task chain; inactive client absent from dropdown |
| US-007 (T009–T012) | Admin Users UI (Hebrew RTL): list, create modal, edit sheet, deactivate/activate | Dev 4 | 2 | Admin creates user with role via UI; deactivated user no longer visible |
| US-008 (T013–T017) | Admin Clients/Projects/Tasks UI: accordion hierarchy, inline create/edit/deactivate; AdminLayout RTL sidebar | Dev 4 | 2 | Admin creates full client→project→task chain via UI |

**EPIC-002 Sprint 1 total**: 9 pts

---

#### 🟠 EPIC-003: Task Assignment — Admin Platform
*Tasks file*: [tasks-epic-003.md](tasks-epic-003.md) | **Depends on**: EPIC-001, EPIC-002 | **Blocks**: EPIC-004

| Story ID | Title | Assignee | Story Points | Acceptance Criteria |
|----------|-------|----------|:---:|---------------------|
| US-009 (T001–T002) | Assignment API: POST /assignments, DELETE /assignments/:id, GET /assignments?taskId=, GET /tasks/my-assigned; team-lead + admin guard | Dev 2 | 1 | Team lead assigns employee; employee's dropdown returns that task |
| US-010 (T003–T004) | Assignment UI: cascading client→project→task selector, current assignees list, add/remove employees | Dev 4 | 1 | Team lead assigns Employee A to Task T; A sees T in report form |

**EPIC-003 Sprint 1 total**: 2 pts

---

#### 🟢 EPIC-004: Daily Time Reporting — Time Management Platform (Sprint 1 portion — API only)
*Tasks file*: [tasks-epic-004.md](tasks-epic-004.md) | **Depends on**: EPIC-001, EPIC-003

| Story ID | Title | Assignee | Story Points | Acceptance Criteria |
|----------|-------|----------|:---:|---------------------|
| US-011 (T001–T003) | Time Report CRUD API: POST/GET/PATCH/DELETE /reports; overlap check; midnight-crossing rejection; month-lock check; duration calculation; optimistic locking via version field (FR-042) | Dev 1 | 3 | Overlap → 422; midnight → 422; locked month → 423; concurrent edit conflict → 409; valid report saves with duration |
| US-012 (T004–T005) | Draft save API: PUT /reports/draft — upsert per-user draft; cleared on final submit | Dev 1 | 1 | Draft survives page refresh; final submit clears draft; draft never auto-expires (FR-016) |

**EPIC-004 Sprint 1 total**: 4 pts (UI continues in Sprint 2)

---

**Sprint 1 Definition of Done**:
- [ ] Login/logout works end-to-end (UI → API → DB)
- [ ] Admin can create User, Client, Project, Task, and Assignment via UI
- [ ] Time Report CRUD API fully functional with all validation (including optimistic locking)
- [ ] All routes protected by role middleware (non-admin gets 403 on admin routes)
- [ ] Database schema complete, migration runs clean, seed creates admin user
- [ ] Hebrew RTL layout renders correctly on mobile Chrome
- [ ] Docker Compose boots all services without errors

**Sprint 1 capacity**: 4 devs × 2 days = 8 person-days → ~24 story points

---

### Sprint 2 — Days 3–5 (12 person-days)

**Goal**: Complete all employee-facing features — daily report UI, absence reporting, monthly view, timer, month closure, and audit log.

---

#### 🟢 EPIC-004: Daily Time Reporting — Time Management Platform (Sprint 2 portion — UI)
*Tasks file*: [tasks-epic-004.md](tasks-epic-004.md)

| Story ID | Title | Assignee | Story Points | Acceptance Criteria |
|----------|-------|----------|:---:|---------------------|
| US-013 (T006–T010) | Daily report form UI (Hebrew RTL): date picker, work-location radio, start/end time, cascading TaskSelector (client→project→task), description ≤500 chars, live duration, draft auto-save (debounced 1s), 409 conflict message | Dev 3 | 3 | Employee submits report; daily total updates; overlap error shown inline; draft persists across reload |
| US-014 (T011) | Daily hours progress bar: reported minutes vs. 540min standard; Hebrew warnings; auto-select single task | Dev 3 | 1 | Progress bar % correct; warnings shown; single task auto-selected |

**EPIC-004 Sprint 2 total**: 4 pts

---

#### 🟢 EPIC-005: Absence Reporting — Time Management Platform
*Tasks file*: [tasks-epic-005.md](tasks-epic-005.md) | **Depends on**: EPIC-001 | **Blocks**: EPIC-006

| Story ID | Title | Assignee | Story Points | Acceptance Criteria |
|----------|-------|----------|:---:|---------------------|
| US-015 (T001–T003) | Absence Report API: POST/PATCH/DELETE /absences; Fri+Sat exclusion from day count; month-lock check; DOCUMENT_PENDING flag for SickLeave + MilitaryReserve | Dev 2 | 2 | Sick leave saves with doc-required flag; Fri/Sat excluded; locked month → 423 |
| US-016 (T004–T006) | Document upload API: POST /absences/:id/document (multipart, 15 MB limit enforced, HTTP 413 if exceeded); access-controlled — owner + admin only (403 for others); DELETE; upload allowed even on locked month | Dev 2 | 1 | Upload returns metadata; 15 MB limit enforced; 403 for unauthorized access; upload on locked month succeeds |
| US-017 (T007–T009) | Absence form UI: date range picker, type selector, partial-day checkbox, live day counter, document-required badge, file upload widget (shows 413 error in Hebrew) | Dev 4 | 2 | Employee submits sick leave; uploads doc after save; badge updates |

**EPIC-005 total**: 5 pts

---

#### 🟢 EPIC-006: Monthly Calendar View — Time Management Platform
*Tasks file*: [tasks-epic-006.md](tasks-epic-006.md) | **Depends on**: EPIC-001, EPIC-004, EPIC-005

| Story ID | Title | Assignee | Story Points | Acceptance Criteria |
|----------|-------|----------|:---:|---------------------|
| US-018 (T001–T002) | Monthly status API: GET /reports/monthly-status?userId=&year=&month=; per-day COMPLETE/MISSING/EXCEPTIONAL/NON_WORKING; uses WorkCalendarDay for holidays; includes isLocked | Dev 2 | 2 | Returns correct status for all day types |
| US-019 (T003–T006) | Monthly calendar UI (Hebrew RTL): month navigation, day grid with color-coded status, Hebrew month name, report list below calendar, click → edit (open month) or read-only modal (locked) | Dev 4 | 3 | Correct status per day; can edit open-month report; locked report opens read-only |

**EPIC-006 total**: 5 pts

---

#### 🟢 EPIC-007: Timer Feature — Time Management Platform
*Tasks file*: [tasks-epic-007.md](tasks-epic-007.md) | **Depends on**: EPIC-001, EPIC-004 Phase 3

| Story ID | Title | Assignee | Story Points | Acceptance Criteria |
|----------|-------|----------|:---:|---------------------|
| US-020 (T001–T003) | Timer schema + API: ActiveTimer model migration; POST /timer/start (409 on duplicate), POST /timer/stop (returns pre-fill data), GET /timer/status; one timer per user | Dev 2 | 1 | Start timer; close browser; reopen → timer still shows original start time |
| US-021 (T004–T006) | Timer UI: Zustand timerStore, TimerWidget in AppLayout header (elapsed HH:MM:SS, pulsing dot), End → navigates to /reports with pre-fill state | Dev 3 | 1 | Employee clicks End; report form opens with correct times pre-filled |

**EPIC-007 total**: 2 pts

---

#### 🟠 EPIC-008: Month Closure & Audit Log — Admin Platform
*Tasks file*: [tasks-epic-008.md](tasks-epic-008.md) | **Depends on**: EPIC-001, EPIC-004, EPIC-005

| Story ID | Title | Assignee | Story Points | Acceptance Criteria |
|----------|-------|----------|:---:|---------------------|
| US-022 (T001–T002) | Month lock API: POST /months/:year/:month/lock|unlock; admin only; store actor + timestamp; refactor checkMonthLock middleware to delegate to MonthLockService | Dev 1 | 2 | Admin locks month; report write → 423; admin unlocks → write succeeds |
| US-023 (T003–T005) | Audit log: AuditLogService; intercept every admin PATCH/DELETE on TimeReport + AbsenceReport; write AuditLog row (before/after JSON); GET /audit-logs?employeeId=&year=&month= | Dev 1 | 2 | After admin edits report, audit log entry exists with correct before/after within 1s |
| US-024 (T006–T007) | Month closure UI: admin table of months with lock status badges, Lock/Unlock buttons with Hebrew confirmation dialogs | Dev 4 | 1 | Admin locks month from UI; employees receive 423 error with Hebrew message |

**EPIC-008 total**: 5 pts

---

**Sprint 2 Definition of Done**:
- [ ] Employee submits daily work report end-to-end (form → API → DB → updated daily total)
- [ ] Absence report with document upload works (including after-the-fact upload; 15 MB limit enforced)
- [ ] Absence document access restricted to owner + admin (403 for others)
- [ ] Monthly calendar displays correct Complete/Missing/Exceptional statuses
- [ ] Timer persists across browser close/reopen
- [ ] Admin can lock/unlock a month; all write endpoints honor the lock
- [ ] Audit log records every admin edit with before/after values
- [ ] Optimistic locking returns 409 on concurrent edit conflict
- [ ] Entire UI in Hebrew RTL; usable on mobile Chrome without horizontal scroll
- [ ] No P1 bugs; all acceptance criteria from spec pass manual test

**Sprint 2 capacity**: 4 devs × 3 days = 12 person-days → ~36 story points

---

### Sprint 3 — CI/CD (2 days, Dev 1)

**Goal**: Automated CI on every PR; automated CD to production on main merge; production-hardened Docker images.

---

#### ⚙️ EPIC-009: CI/CD Pipeline — Both Platforms
*Tasks file*: [tasks-epic-009.md](tasks-epic-009.md) | **Depends on**: EPIC-001 (monorepo structure)

| Story ID | Title | Assignee | Story Points | Acceptance Criteria |
|----------|-------|----------|:---:|---------------------|
| CI (T001–T003) | GitHub Actions CI workflow: lint + tsc + Jest on every PR to main/dev; PostgreSQL service container; pnpm cache; branch protection docs | Dev 1 | 2 | PR → CI runs; lint rule break → CI fails; health test passes |
| CD (T004–T006) | GitHub Actions CD workflow (Render): triggered on CI success; Render deploy hook; secrets docs; render.yaml Blueprint (backend + frontend-time_management + free-tier PostgreSQL) | Dev 1 | 2 | Merge to main → Render redeploys; GET /api/v1/health → 200 on production URL |
| Docker (T007–T008) | Production Docker hardening: frontend multi-stage Nginx SPA build (nginx proxies /api to backend); backend multi-stage with prisma migrate deploy in entrypoint | Dev 1 | 1 | Both images build; no dev deps in prod image; migrations auto-run on deploy |

**EPIC-009 total**: 5 pts

---

**Sprint 3 Definition of Done**:
- [ ] Every PR to main triggers CI: lint + type-check + tests pass before merge allowed
- [ ] Merging to main triggers CD to Render automatically
- [ ] Secrets stored in GitHub Secrets; not committed to repo
- [ ] Production Docker images are multi-stage (no devDependencies or source files)
- [ ] `prisma migrate deploy` runs automatically on every backend deploy

**Sprint 3 capacity**: 1 dev × 2 days → ~5 story points

---

### Capacity Summary

| Sprint | Days | Devs | Person-Days | Story Points | Key Deliverables |
|--------|------|------|:-----------:|:------------:|-----------------|
| Sprint 1 | Days 1–2 | 4 | 8 | ~24 | Auth, DB schema, admin entity management, task assignment, report API |
| Sprint 2 | Days 3–5 | 4 | 12 | ~36 | Report UI, absences + docs, monthly calendar, timer, month closure, audit |
| Sprint 3 | Days 6–7 | 1 | 2 | ~5 | CI/CD pipeline, production Docker hardening |
| **Total** | **7 days** | **4** | **22** | **~65** | **All 7 user stories + DevOps** |

---

### Feature Coverage Matrix

| User Story | Epic | Platform | Sprint | Devs |
|------------|------|----------|--------|------|
| US1 — Employee submits daily work report | EPIC-004 | 🟢 Time Management | 1 (API) + 2 (UI) | Dev 1, Dev 3 |
| US2 — Employee reports an absence | EPIC-005 | 🟢 Time Management | 2 | Dev 2, Dev 4 |
| US3 — Employee views monthly status | EPIC-006 | 🟢 Time Management | 2 | Dev 2, Dev 4 |
| US4 — Timer-based workday start/end | EPIC-007 | 🟢 Time Management | 2 | Dev 2, Dev 3 |
| US5 — Team lead assigns employees to tasks | EPIC-003 | 🟠 Admin | 1 | Dev 2, Dev 4 |
| US6 — Admin manages system entities | EPIC-001 + EPIC-002 | 🔵 Shared + 🟠 Admin | 1 | Dev 1, Dev 2, Dev 3, Dev 4 |
| US7 — Admin locks/reopens reporting month | EPIC-008 | 🟠 Admin | 2 | Dev 1, Dev 4 |
| DevOps — CI/CD pipeline | EPIC-009 | ⚙️ Both | 3 | Dev 1 |

---

## Clarifications Applied to This Plan (Session 2026-05-11)

The following decisions from the May 11 clarification session are reflected in this plan:

| # | Decision | Impact |
|---|----------|--------|
| 1 | **Optimistic locking** — `version` integer on TimeReport/AbsenceReport; second writer gets HTTP 409 + latest record body | Added to EPIC-004 T001/T002 acceptance criteria; FR-042 added to spec |
| 2 | **Document access** — only report owner + admins can download absence documents; others receive HTTP 403 | Added to EPIC-005 T006 and T009; FR-025a added to spec |
| 3 | **File size limit** — 15 MB max per absence document upload; HTTP 413 from server; client-side check where possible | Added to EPIC-005 T005 (Multer config) and T009 (error message); FR-025b added to spec; Multer `limits.fileSize` updated to 15 MB |
| 4 | **Admin dual platform** — admins are employees; they use the Time Management Platform for own time/absence reports | System Overview and Summary updated; FR-003a added to spec; both platforms serve admins |
| 5 | **Draft lifecycle** — draft never auto-expires; persists until employee finalizes or explicitly discards; starting new draft replaces existing one after confirmation | EPIC-004 T004 and T010 acceptance criteria updated; FR-016 clarified in spec |

---

## Complexity Tracking

> No constitution violations requiring justification.

---

*Phase 0 → [research.md](research.md)*
*Phase 1 → [data-model.md](data-model.md) · [contracts/api.md](contracts/api.md) · [quickstart.md](quickstart.md)*
*Epic tasks → [tasks-epic-001.md](tasks-epic-001.md) through [tasks-epic-009.md](tasks-epic-009.md)*
