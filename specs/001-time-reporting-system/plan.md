# Implementation Plan: Admin Pages — Table Layout & Create Modals (Stage 2)

**Branch**: `client-project-task-fields` | **Date**: 2026-05-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-time-reporting-system/spec.md`

## Summary

**Stage 1 recap** (context only — covered in `research.md` § "Admin Nav Restructure — Stage 1"
and `contracts/admin-routes.md`):
The admin sidebar was split from 2 tabs to 4 — Users / Clients / Projects / Tasks — and the
four already-existing pages were wired into `/admin/users`, `/admin/clients`, `/admin/projects`,
`/admin/tasks`. No page content was redesigned.

**Stage 2 (this plan)**: Redesign the Clients, Projects, and Tasks pages around a single
consistent **table + create-modal** pattern (RTL, Hebrew):

- Each page renders a big table listing items from the DB with all relevant properties as
  columns. The last column is **`פעולות`** with edit and delete (soft-delete) icons.
- Above each table: a **search bar** (right side, RTL start) and a **`יצירה`** button
  (left side, RTL end). The button opens a **modal card** for adding a new item; the
  parent-entity fields that were previously rendered disabled (`שם לקוח` on the project form,
  `שיוך לפרויקט קיים` on the task form) are now **always-enabled dropdowns**.
- The **Projects** and **Tasks** pages keep an upstream parent picker (Projects: pick a
  client → table; Tasks: pick a client → pick a project → table). When a parent is already
  selected on the page, the create modal **pre-fills** that parent in its dropdown — but the
  dropdown remains editable so the user can override.
- Tables show **active items by default** with a `הצג גם לא פעילים` **toggle** that includes
  inactive (soft-deleted) rows. The delete icon performs a **soft-delete** (`PATCH isActive:false`)
  per FR-032; an `הפעל מחדש` icon replaces delete on inactive rows.

The Users page (`UsersListPage`) is **out of scope** for Stage 2 — it has its own dedicated
list+modal UI and a separate priority backlog.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend `verbatimModuleSyntax`); Node.js 20+ on backend.
**Primary Dependencies (frontend)**: React 18, `react-router-dom` v6, `@tanstack/react-query`, `react-hook-form`, TailwindCSS. No new libraries required — modal + table built from primitives.
**Primary Dependencies (backend)**: Express, Prisma, Zod.
**Storage**: PostgreSQL via Prisma — **no schema changes**. All Stage 2 fields already exist on `Client`, `Project`, `Task`.
**Testing**: Jest (`backend/src/__tests__/`) for the two new backend list endpoints. Frontend type check via `pnpm --filter frontend exec tsc --noEmit` per CLAUDE.md.
**Target Platform**: Modern browsers (Chrome, Edge, Safari) — mobile, tablet, desktop. RTL Hebrew layout throughout. Mobile tables: horizontal scroll inside the table card; do not collapse to cards in this stage.
**Project Type**: Web application (`frontend/` + `backend/` monorepo).
**Performance Goals**: Tables are scoped to a single client (Projects page) or single project (Tasks page). Expected row counts are bounded (tens to low hundreds). No server-side pagination needed; search filters client-side over the loaded list.
**Constraints**: RTL must remain pixel-correct. Modal must trap focus and close on `Esc` + backdrop click. All write endpoints stay admin-only (server-side gate already enforced).
**Scale/Scope**: 3 page rewrites (Clients, Projects, Tasks), 2 new shared components (Modal, ConfirmDialog), 2 new backend list endpoints, 2 new query hooks, removal of `ProjectsSection.tsx` and `TasksSection.tsx`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Relevance | Status |
|---|---|---|
| I. Simple Daily Reporting | N/A — admin surface, not employee flow. | PASS |
| II. Clear Work Structure | The Client → Project → Task hierarchy is reinforced: the Projects page is scoped per client, the Tasks page per project, and create modals always pre-select the parent context the user is already viewing. | PASS (improvement) |
| III. Reliable and Organized Data | The delete icon performs **soft-delete only** (PATCH `isActive:false`); historical reports referencing the entity remain intact. Inactive rows remain visible behind the toggle. | PASS (explicit) |
| IV. Role-Based Access | Two new backend list endpoints (`GET /projects?clientId=X`, `GET /tasks?projectId=X`) MUST be `requireRole(ADMIN, TEAM_LEAD)` to mirror existing read scope. Write endpoints remain admin-only (unchanged). | PASS |
| V. Monthly Closure | N/A | PASS |
| VI. Absence Reporting | N/A | PASS |
| VII. Transparency | Showing inactive items via the toggle makes the soft-delete state visible to admins instead of hidden. | PASS (improvement) |

**Verdict**: No violations. Complexity Tracking left empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-time-reporting-system/
├── plan.md                       # This file (Stage 2)
├── spec.md                       # Existing feature spec
├── research.md                   # Phase 0 — appends Stage 2 decisions
├── contracts/
│   ├── admin-routes.md           # Stage 1 — routing/sidebar contract
│   └── admin-tables.md           # NEW — Stage 2 table + modal + API shape contract
└── quickstart.md                 # Appends Stage 2 verification steps
```

`data-model.md` is intentionally **omitted** — Stage 2 introduces no entity or field changes.
Read-payload shapes (joined client/project info) are documented as an interface contract in
`contracts/admin-tables.md`, not as a data-model change.

### Source Code (repository root)

```text
backend/
├── src/
│   ├── routes/
│   │   ├── projects.ts                # EDIT — add GET / route (list-by-client, full shape, includes inactive)
│   │   └── tasks.ts                   # EDIT — add GET / route (list-by-project, full shape, includes inactive)
│   ├── services/
│   │   ├── project.service.ts         # EDIT — add listProjectsByClient(clientId) with primaryManager join
│   │   └── task.service.ts            # EDIT — add listTasksByProject(projectId) with project+client join
│   └── __tests__/
│       ├── projects.test.ts           # EDIT — add tests for the new list endpoint
│       └── tasks.test.ts              # EDIT — add tests for the new list endpoint

frontend/
├── src/
│   ├── components/
│   │   ├── Modal.tsx                  # NEW — generic RTL modal (backdrop, Esc, focus trap)
│   │   └── ConfirmDialog.tsx          # NEW — small confirm dialog (used by delete + deactivate)
│   ├── pages/
│   │   └── admin/
│   │       ├── clients/
│   │       │   ├── ClientsPage.tsx    # REWRITE — table + search + create modal
│   │       │   ├── ProjectsSection.tsx # DELETE — no longer used
│   │       │   └── TasksSection.tsx    # DELETE — no longer used
│   │       ├── projects/
│   │       │   └── ProjectsPage.tsx   # REWRITE — client picker + table + search + create modal (client dropdown enabled)
│   │       └── tasks/
│   │           └── TasksPage.tsx      # REWRITE — client+project pickers + table + search + create modal (client+project dropdowns enabled)
│   ├── services/
│   │   └── entities.service.ts        # EDIT — add useProjectsByClient(clientId), useTasksByProject(projectId)
│   └── types/
│       └── entities.ts                # EDIT — add optional joined shapes to Project and Task (ProjectWithRelations / TaskWithRelations)
```

**Structure Decision**: Standard monorepo layout (already in place). Stage 2 introduces two
small shared components (`Modal`, `ConfirmDialog`) at `frontend/src/components/` so the three
page rewrites stay focused and don't each re-implement modal mechanics.

## Complexity Tracking

> *No constitutional violations — table intentionally empty.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
