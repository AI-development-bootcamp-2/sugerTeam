# Tasks: Admin Pages — Table Layout & Create Modals (Stage 2)

**Feature**: 001-time-reporting-system
**Stage**: 2 (admin entity pages redesign)
**Generated**: 2026-05-12 | **Branch**: `client-project-task-fields`
**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md) — User Story 6 (Admin Manages System Entities, P6)
**Contracts**: [contracts/admin-tables.md](contracts/admin-tables.md), [contracts/admin-routes.md](contracts/admin-routes.md) (Stage 1 — already shipped)
**Research**: [research.md](research.md) § "Admin Pages Table Redesign — Stage 2" (S2.1–S2.10)
**Verification**: [quickstart.md](quickstart.md) § "Stage 2 — Admin Tables & Create Modals Verification"

## Scope summary

Rebuild **Clients**, **Projects**, and **Tasks** admin pages around a single consistent
**table + create-modal** pattern (RTL Hebrew). Adds two new backend list endpoints that include
inactive rows and join parent metadata. The Users page is **out of scope**. No DB migration —
all needed fields already exist on `Client`, `Project`, `Task`.

For tasks below the "user story" partitioning splits Stage 2 into three independent vertical
slices — one per page — each shippable on its own once foundational shared components land:

| Slice | Maps to | Independent test |
|-------|---------|------------------|
| **US-S2-A** Clients page rewrite | spec US6 (Admin Manages Entities) | `/admin/clients` shows table; `יצירה` opens modal; create/edit/soft-delete/reactivate/search/inactive-toggle all work end-to-end without touching Projects or Tasks pages. |
| **US-S2-B** Projects page rewrite + new `GET /projects?clientId` | spec US6 | `/admin/projects` with a client picker renders the full table (active + inactive); the new list endpoint returns 200 with joined `primaryManager`; modal `שם לקוח` dropdown is always enabled and pre-selects the page's client. |
| **US-S2-C** Tasks page rewrite + new `GET /tasks?projectId` | spec US6 | `/admin/tasks` with cascading client→project pickers renders the full table; the new list endpoint returns 200 incl. closed tasks; modal `לקוח` (UI-only) and `שיוך לפרויקט קיים` dropdowns are always enabled and pre-select the page's pickers. |

**Tests included**: Backend Jest tests only — per CLAUDE.md: "New backend features MUST include
a Jest test in `src/__tests__`". Frontend tests are not requested for Stage 2.

---

## Phase 1: Setup

**Purpose**: Project initialization.

> Nothing to do — backend, frontend, Prisma schema, TanStack Query, RHF, Tailwind, routing, and
> auth middleware are all already wired by EPIC-001/002. Stage 2 introduces no new dependency.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared primitives and type augmentations needed by all three page rewrites.

**⚠️ CRITICAL**: T001–T003 must land before any user story phase begins — every page imports `Modal`, every page imports `ConfirmDialog`, every Projects/Tasks read uses the new types.

- [ ] T001 [P] Add `ProjectWithRelations` (extends `Project` with `primaryManager: { id; fullName; role: 'TEAM_LEAD'|'ADMIN' } | null`) and `TaskWithRelations` (alias of `Task` for now — see contract § 7) types in `frontend/src/types/entities.ts`
- [ ] T002 [P] Create generic `Modal` component in `frontend/src/components/Modal.tsx`: backdrop-click close, `Esc` close, focus trap while open, `role="dialog"` + `aria-modal="true"`, `dir="rtl"` on content, CSS transition for open/close, header with `×` close button, accepts `isOpen`, `onClose`, `title`, `children` props (per contract § 4.1, research S2.8)
- [ ] T003 [P] Create `ConfirmDialog` component in `frontend/src/components/ConfirmDialog.tsx`: thin wrapper over `Modal` exposing `isOpen`, `title`, `message`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`; used by the trash icon on every page (per contract § 3, research S2.4)

**Checkpoint**: Shared primitives ready — page rewrites can now begin in parallel.

---

## Phase 3: User Story A — Clients page rewrite (Priority: P1) 🎯 MVP

**Goal**: Replace the accordion `ClientsPage` with a flat table + create/edit modal + soft-delete/reactivate + search + inactive-toggle. No backend or hook changes — uses existing `useAllClients` / `useCreateClient` / `useUpdateClient`.

**Independent Test**: Log in as admin, go to `/admin/clients`. Verify columns `שם / תיאור / סטטוס / נוצר ב / פעולות`; `יצירה` opens a modal with `שם לקוח` + `תיאור` fields; submit creates a row; edit pre-fills the modal; delete opens `ConfirmDialog` and (with toggle OFF) hides the row; toggling `הצג גם לא פעילים` ON shows inactive rows with `הפעל מחדש` instead of delete; the search input filters loaded rows over `name` + `description`.

### Implementation for User Story A

- [ ] T004 [US-S2-A] Rewrite `frontend/src/pages/admin/clients/ClientsPage.tsx` per contract § 1, § 2.1, § 3, § 4.1–4.2: title `ניהול לקוחות`, RTL toolbar (search right, `הצג גם לא פעילים` toggle, `יצירה` left), data table with columns `שם / תיאור / סטטוס / נוצר ב / פעולות` (sticky header, status badge `פעיל`/`לא פעיל`, `dd/MM/yyyy` date formatting, description truncated to ~60 chars with full text in `title` attr), action column shows `✏️ Edit` + (`🗑️ Delete` for active / `↻ Activate` for inactive), inline SVG icons (20×20 stroked outline) — no icon library. Wire `useAllClients` to populate the table; client-side filter rows by `isActive` (toggle) and `name`/`description` substring (search, case-insensitive, debounced 150ms). Edit + create both open a single `<Modal>` containing a `ClientForm` (React Hook Form + Zod: `name` required ≤255 chars, `description` optional ≤500 chars — Hebrew error messages inline). Submit calls `useCreateClient` (create mode) or `useUpdateClient` (edit mode); on success `onSuccess` already invalidates the existing `['clients']` queries — modal closes and table refreshes. Delete icon opens `ConfirmDialog`; confirming calls `useUpdateClient(id, { isActive: false })`. Activate icon calls `useUpdateClient(id, { isActive: true })` directly (no confirm).

**Checkpoint**: Clients page is fully functional and independently testable. MVP delivery point — Projects/Tasks pages can ship later as separate increments.

---

## Phase 4: User Story B — Projects page rewrite + list-by-client endpoint (Priority: P2)

**Goal**: Add `GET /api/v1/projects?clientId=<uuid>` (includes inactive, joins `primaryManager`), expose a `useProjectsByClient` hook, and rewrite `ProjectsPage` around a client picker + table + create/edit modal where the `שם לקוח` dropdown is **always enabled** and pre-fills from the page picker.

**Independent Test**: Hit `GET /api/v1/projects?clientId=<uuid>` as ADMIN/TEAM_LEAD → 200 array of `ProjectWithRelations` including inactive rows. Hit as EMPLOYEE → 403. Hit without `clientId` → 400. On `/admin/projects`: `יצירה` is visible even with no client picked; selecting a client renders the full table (per contract § 2.2) with breadcrumb `לקוח: <name>`; clicking `יצירה` with a client picked opens the modal with `שם לקוח` pre-selected **and editable**; setting `תאריך סיום` < `תאריך התחלה` blocks submit with the Hebrew error.

### Backend tests for User Story B (per CLAUDE.md "new backend features MUST include a Jest test") ⚠️

> **Write tests BEFORE the route handler so the red→green transition is explicit.**

- [ ] T005 [P] [US-S2-B] Add Jest tests for `GET /projects?clientId=<uuid>` in `backend/src/__tests__/projects.test.ts`: (a) 400 when `clientId` missing, (b) 400 when `clientId` not a uuid, (c) 200 returns array ordered by `name asc`, (d) response includes both `ACTIVE` and `INACTIVE` projects for the client, (e) each row carries `primaryManager: { id, fullName, role } | null` and never leaks the manager's `email`/`passwordHash`, (f) `authenticateToken` 401 path, (g) `requireRole` 403 for EMPLOYEE, (h) ADMIN and TEAM_LEAD both succeed

### Implementation for User Story B

- [ ] T006 [P] [US-S2-B] Implement `listProjectsByClient(clientId: string)` in `backend/src/services/project.service.ts`: `prisma.project.findMany({ where: { clientId }, include: { primaryManager: { select: { id: true, fullName: true, role: true } } }, orderBy: { name: 'asc' } })` — returns `ProjectWithRelations[]` (incl. inactive). The existing `listActiveProjects` stays untouched (per contract § 5.3 and research S2.9)
- [ ] T007 [US-S2-B] Add `GET /` route handler to `backend/src/routes/projects.ts` (depends on T006): chain `authenticateToken`, `requireRole(ADMIN, TEAM_LEAD)`, then Zod-validate `req.query` with `z.object({ clientId: z.string().uuid() })` (responding 400 on parse failure), call `listProjectsByClient(clientId)`, return 200 with the array. The existing `GET /active` route stays untouched (per contract § 5.1)
- [ ] T008 [P] [US-S2-B] Add `useProjectsByClient(clientId: string | undefined)` to `frontend/src/services/entities.service.ts` (queryKey `['projects','byClient', clientId]`, `enabled: !!clientId`, returns `ProjectWithRelations[]` — see contract § 6); extend `useCreateProject` and `useUpdateProject` `onSuccess` to also invalidate `['projects','byClient']` in addition to the existing `['projects']` invalidation (per contract § 6 closing note)
- [ ] T009 [US-S2-B] Rewrite `frontend/src/pages/admin/projects/ProjectsPage.tsx` per contract § 1, § 2.2, § 3, § 4.1, § 4.3, § 4.5: title `ניהול פרויקטים`, client `<select>` picker (populated from existing `useActiveClients`), toolbar (search / `הצג גם לא פעילים` toggle / `יצירה` always visible), breadcrumb `לקוח: <name>` above the table when a client is selected, empty state `בחר לקוח כדי לראות פרויקטים` when no client is picked. Table columns `שם / מנהל ראשי / תאריך התחלה / תאריך סיום / תיאור / סטטוס / פעולות` with `dd/MM/yyyy` date formatting (`—` for null), description truncation, status badge, action icons (Edit + Delete/Activate per row state). Data sourced from `useProjectsByClient`; client-side filter by inactive toggle + search (case-insensitive substring over `name` and `description`, debounced 150ms). Create/edit reuse the shared `<Modal>` rendering a `ProjectForm` (RHF + Zod: `name` required ≤255 chars, `clientId` required uuid **always-enabled** `<select>` populated by `useActiveClients` and pre-selected from the page picker per § 4.5, `primaryManagerId` optional `<select>` populated by `useManagers()`, `startDate`/`endDate` optional `<input type="date">` with cross-field refine `endDate >= startDate` matching the backend Zod rule, `description` optional ≤500 chars `<textarea>` — Hebrew error messages inline). Submit calls `useCreateProject` / `useUpdateProject`; mutation `onSuccess` (from T008) closes the modal and refreshes the table. Delete icon → `ConfirmDialog` → `useUpdateProject(id, { isActive: false })`. Activate → `useUpdateProject(id, { isActive: true })` (no confirm)

**Checkpoint**: Projects page works end-to-end. Tasks page can still be deferred.

---

## Phase 5: User Story C — Tasks page rewrite + list-by-project endpoint (Priority: P3)

**Goal**: Add `GET /api/v1/tasks?projectId=<uuid>` (includes closed), expose a `useTasksByProject` hook, and rewrite `TasksPage` around cascading client→project pickers + table + create/edit modal where both `לקוח` (UI-only) and `שיוך לפרויקט קיים` dropdowns are **always enabled** and pre-fill from the page pickers.

**Independent Test**: Hit `GET /api/v1/tasks?projectId=<uuid>` as ADMIN/TEAM_LEAD → 200 array including both `OPEN` and `CLOSED` tasks ordered by `name asc`. Hit as EMPLOYEE → 403. Hit without `projectId` → 400. On `/admin/tasks`: project picker is disabled until a client is picked; both pickers visible; `יצירה` opens the modal with `לקוח` + `שיוך לפרויקט קיים` pre-selected and editable when a project is selected on the page; the modal's `לקוח` dropdown filters the `שיוך לפרויקט קיים` dropdown but is **not** part of the request body (UI-only); close icon → `ConfirmDialog` → task becomes `סגור`.

### Backend tests for User Story C ⚠️

- [ ] T010 [P] [US-S2-C] Add Jest tests for `GET /tasks?projectId=<uuid>` in `backend/src/__tests__/tasks.test.ts`: (a) 400 when `projectId` missing, (b) 400 when `projectId` not a uuid, (c) 200 returns array ordered by `name asc`, (d) response includes both `OPEN` and `CLOSED` tasks for the project, (e) `authenticateToken` 401 path, (f) `requireRole` 403 for EMPLOYEE, (g) ADMIN and TEAM_LEAD both succeed

### Implementation for User Story C

- [ ] T011 [P] [US-S2-C] Implement `listTasksByProject(projectId: string)` in `backend/src/services/task.service.ts`: `prisma.task.findMany({ where: { projectId }, orderBy: { name: 'asc' } })` — returns `Task[]` (incl. closed; no parent join per contract § 5.2 note). The existing `listActiveTasks` stays untouched
- [ ] T012 [US-S2-C] Add `GET /` route handler to `backend/src/routes/tasks.ts` (depends on T011): chain `authenticateToken`, `requireRole(ADMIN, TEAM_LEAD)`, then Zod-validate `req.query` with `z.object({ projectId: z.string().uuid() })` (responding 400 on parse failure), call `listTasksByProject(projectId)`, return 200 with the array. The existing `GET /active` route stays untouched (per contract § 5.2)
- [ ] T013 [P] [US-S2-C] Add `useTasksByProject(projectId: string | undefined)` to `frontend/src/services/entities.service.ts` (queryKey `['tasks','byProject', projectId]`, `enabled: !!projectId`, returns `TaskWithRelations[]` — see contract § 6); extend `useCreateTask` and `useUpdateTask` `onSuccess` to also invalidate `['tasks','byProject']` in addition to existing invalidations (per contract § 6 closing note)
- [ ] T014 [US-S2-C] Rewrite `frontend/src/pages/admin/tasks/TasksPage.tsx` per contract § 1, § 2.3, § 3, § 4.1, § 4.4, § 4.5: title `ניהול משימות`, cascading pickers row — client `<select>` (from `useActiveClients`) then project `<select>` (from `useActiveProjects(clientId)`, disabled until client picked), toolbar (search / `הצג גם לא פעילים` toggle / `יצירה` always visible), breadcrumb `לקוח: X › פרויקט: Y` above the table. Table columns `שם / תאריך התחלה / תאריך סיום / תיאור / סטטוס (פתוח/סגור) / פעולות` with `dd/MM/yyyy` (`—` for null), description truncation, action icons (Edit + Close/Reopen — note tasks use OPEN/CLOSED but PATCH semantics are identical: `isActive: false` closes, `true` reopens). Data sourced from `useTasksByProject`; client-side filter by inactive toggle + search. Create/edit reuse `<Modal>` rendering a `TaskForm` (RHF + Zod: `name` required ≤255 chars, `clientId` **UI-only always-enabled** `<select>` from `useActiveClients` that filters the project dropdown — **not in the submit body**, `projectId` required uuid **always-enabled** `<select>` from `useActiveProjects(formClientId)` pre-selected from the page picker per § 4.5, `startDate`/`endDate` optional with cross-field refine `endDate >= startDate`, `description` optional ≤500 chars). Submit calls `useCreateTask` / `useUpdateTask`; mutation `onSuccess` (from T013) closes the modal. Delete icon → `ConfirmDialog` → `useUpdateTask(id, { isActive: false })`. Activate icon (inactive row) → `useUpdateTask(id, { isActive: true })`

**Checkpoint**: All three pages are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Remove now-dead code and verify the full Stage 2 acceptance per `quickstart.md`.

- [ ] T015 [P] Delete `frontend/src/pages/admin/clients/ProjectsSection.tsx` (per contract § 8 and research S2.10 — superseded by standalone `ProjectsPage` + create modal). Confirm no remaining imports in the frontend before deleting
- [ ] T016 [P] Delete `frontend/src/pages/admin/clients/TasksSection.tsx` (per contract § 8 and research S2.10 — superseded by standalone `TasksPage` + create modal). Confirm no remaining imports in the frontend before deleting
- [ ] T017 Run the Stage 2 verification checklist in `specs/001-time-reporting-system/quickstart.md` § "Stage 2 — Admin Tables & Create Modals Verification" steps 1–6: `pnpm --filter backend exec tsc --noEmit`, `pnpm --filter backend test -- --runTestsByPath src/__tests__/projects.test.ts src/__tests__/tasks.test.ts`, `pnpm --filter frontend exec tsc --noEmit`, then dev-server walkthrough of all three pages and the two new endpoints via curl
- [ ] T018 Sanity-check the staged file list with `git diff --stat main..HEAD` against `quickstart.md` § 7 "Files touched" — flag any unexpected file changes (e.g. `router.tsx`, `AdminPage.tsx`) since Stage 2 must not regress Stage 1

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: nothing to do
- **Phase 2 (Foundational)**: T001, T002, T003 — all parallel; must complete before Phase 3+
- **Phase 3 (US-S2-A Clients)**: depends on T002 (Modal) and T003 (ConfirmDialog). Independent of Phase 4/5.
- **Phase 4 (US-S2-B Projects)**: depends on T001 (types), T002, T003. Independent of Phase 3/5.
- **Phase 5 (US-S2-C Tasks)**: depends on T001, T002, T003. Independent of Phase 3/4.
- **Phase 6 (Polish)**: T015 depends on Phase 4 (ProjectsPage replaces `ProjectsSection`); T016 depends on Phase 5 (TasksPage replaces `TasksSection`); T017/T018 depend on all prior phases.

### Within each user story

- **US-S2-B**: T005 (tests) → write red. T006 ∥ T005 in time but T007 depends on T006. T008 depends on T007 being importable from the frontend type perspective only (`ProjectWithRelations` already added in T001) — can start as soon as T001 lands. T009 depends on T008 and on T007 being live in the dev backend.
- **US-S2-C**: T010 (tests) → T011 → T012. T013 depends on T001 only; T014 depends on T013 + T012 being live.

### Parallel opportunities

```
Phase 2:   T001 ∥ T002 ∥ T003                         (3 different files)

Phase 4:   T005 ∥ T006                                 (test file ∥ service file)
           T007 depends on T006
           T008 ∥ T007                                 (different files; T008 only needs T001's types)
           T009 depends on T007 + T008

Phase 5:   T010 ∥ T011                                 (test file ∥ service file)
           T012 depends on T011
           T013 ∥ T012                                 (different files; T013 only needs T001)
           T014 depends on T012 + T013

Cross-story: Phase 3, 4, 5 are fully independent slices — different devs can take one each.

Phase 6:   T015 ∥ T016                                 (two file deletions, no overlap)
           T017 → T018                                 (verification then file-list sanity)
```

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Three independent files — launch together:
Task: "Add ProjectWithRelations + TaskWithRelations to frontend/src/types/entities.ts"
Task: "Create Modal component in frontend/src/components/Modal.tsx"
Task: "Create ConfirmDialog component in frontend/src/components/ConfirmDialog.tsx"
```

## Parallel Example: Stage 2 with three devs

```
Dev 1 (Clients slice):   T001 → T002 → T004                          (single-file vertical)
Dev 2 (Projects slice):  T005 ∥ T006 → T007 → T008 → T009            (backend + frontend)
Dev 3 (Tasks slice):     T010 ∥ T011 → T012 → T013 → T014            (backend + frontend)

Convergence: T015, T016 (parallel) → T017 → T018
```

---

## Implementation Strategy

### MVP first (User Story A only)

1. Phase 2 (foundational primitives) — must complete first
2. Phase 3 (Clients page rewrite — T004)
3. **STOP and VALIDATE**: `/admin/clients` works end-to-end per quickstart § Stage 2 step 3
4. Demo / merge. Projects + Tasks pages still render the existing implementation in the meantime.

### Incremental delivery

1. Phase 2 → primitives in place
2. Phase 3 → ship Clients (MVP)
3. Phase 4 → ship Projects (also unblocks `useProjectsByClient` for any future view)
4. Phase 5 → ship Tasks
5. Phase 6 → delete the two now-orphaned `Section` components and run full verification

### Notes

- Tests are backend-only — Jest tests for the two new GET list endpoints. No frontend tests requested for Stage 2.
- All UI is Hebrew RTL — preserve `dir="rtl"` on modal content and use Tailwind logical props (`ps`, `pe`, `ms`, `me`) rather than directional (`pl`, `pr`).
- No DB migration in Stage 2 — `git revert` is a safe rollback.
- The existing `GET /api/v1/projects/active?clientId=` and `GET /api/v1/tasks/active?projectId=` endpoints are **intentionally untouched** (used by employee-facing dropdowns); never refactor them as part of Stage 2.
- Per CLAUDE.md: mentally run `pnpm --filter backend exec tsc --noEmit` and `pnpm --filter frontend exec tsc --noEmit` before committing each task. Backend routes must use `zod` for body/query validation. Services own business logic — routes stay thin.
- Per project memory: do **not** commit on the user's behalf — provide the commit message; the user runs the commit.
