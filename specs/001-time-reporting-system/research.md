# Research: Time Reporting System

**Phase**: 0 — Pre-Design Research
**Feature**: Time Reporting System
**Date**: 2026-05-06

---

## Technology Stack Decisions

### Backend Framework

**Decision**: Express.js on Node.js  
**Rationale**: Most familiar REST framework for Node.js; minimal boilerplate; large ecosystem;
well-documented for JWT auth and middleware chains. Suitable for a course project where
team members need to ramp up quickly.  
**Alternatives considered**:
- Fastify — faster performance but smaller community for beginners
- NestJS — structured but high learning curve for a course project

---

### ORM / Database Layer

**Decision**: Prisma  
**Rationale**: Prisma generates TypeScript types from the schema, provides a migration CLI, and
produces readable query syntax. The schema file serves as live documentation of the data model.
`deletedAt` soft-delete fields integrate cleanly with Prisma middleware.  
**Alternatives considered**:
- Sequelize — older API, weaker TypeScript support
- Knex (raw query builder) — too low-level for a course project; more error-prone

---

### Authentication

**Decision**: JWT with access token (2h) stored in memory / Authorization header + refresh token
(30d) stored in an HTTP-only cookie.  
**Rationale**: Matches the spec requirement. HTTP-only cookie for refresh token prevents XSS theft.
Access token in memory (not localStorage) prevents CSRF theft. Standard for SPAs.  
**Alternatives considered**:
- Session-based (server-side sessions) — simpler but requires sticky sessions or Redis for
  multi-instance deployments; overkill for this scale
- Auth libraries (Passport.js) — adds abstraction that obscures learning opportunity

---

### Password Hashing

**Decision**: bcrypt with cost factor 12  
**Rationale**: Industry standard for password hashing. Built-in salt. Node.js `bcrypt` package
is battle-tested. Cost factor 12 is a good balance between security and speed for small teams.  
**Alternatives considered**:
- argon2 — more secure but less familiar; bcrypt is sufficient for this scale

---

### Frontend Framework & Routing

**Decision**: React with Vite build tool + React Router v6  
**Rationale**: React is required by spec. Vite provides fast HMR and modern build pipeline.
React Router v6 has clean nested route syntax that maps well to the role-based navigation model.  
**Alternatives considered**:
- Next.js — SSR not needed; adds complexity without benefit for this SPA

---

### Frontend State Management

**Decision**: React Query (TanStack Query) for server state + Zustand for UI/auth state  
**Rationale**: React Query handles caching, re-fetching, and loading/error states for API data,
eliminating manual useEffect patterns. Zustand is lightweight for auth state (current user,
token). Together they avoid the boilerplate overhead of Redux.  
**Alternatives considered**:
- Redux Toolkit — feature-complete but verbose for a project of this scope
- React Context + useReducer — sufficient but leads to prop-drilling and re-render issues at
  this feature count

---

### RTL and Internationalization

**Decision**: HTML `dir="rtl"` attribute on root + CSS logical properties + Tailwind CSS with
RTL variant or Material UI with RTL theme  
**Rationale**: The system is Hebrew-only. Setting `dir="rtl"` at the root ensures all browser
defaults flip correctly. Tailwind CSS RTL plugin or MUI's `CacheProvider` with `rtlPlugin`
handles component-level RTL automatically.  
**Alternatives considered**:
- Manual CSS mirroring — error-prone and hard to maintain

---

### File Storage (Absence Documents)

**Decision**: Local file system storage with a configured `UPLOADS_DIR` in development;
prepare for S3-compatible storage swap in production via an abstraction layer.  
**Rationale**: Local storage is the simplest approach for a course project running in Docker.
Wrapping uploads in a storage service interface (e.g., `FileStorageService`) means the
implementation can be swapped to S3 or Cloudflare R2 in production without changing API logic.  
**Alternatives considered**:
- AWS S3 directly — requires AWS account, IAM setup, and cost; unnecessary for a course project
- Database BLOBs — poor performance; not recommended for file storage

---

### Testing

**Decision**: Vitest + React Testing Library (frontend); Jest (backend)  
**Rationale**: Vitest integrates with Vite natively and shares the same config. Jest is the
standard for Node.js backend testing. Both support the 60% minimum coverage requirement.  
**Coverage approach**:
- Backend: unit test services and middleware; integration test API routes with an in-memory
  PostgreSQL instance (e.g., `pg-mem` or a Docker test DB)
- Frontend: unit test utility functions (overlap detection, absence day calculation, duration
  calculation); component tests for form validation logic

---

### Docker Compose Setup

**Decision**: Three services — `backend` (Node.js), `frontend` (Vite dev server / Nginx for
prod), `db` (PostgreSQL 15)  
**Rationale**: Matches spec requirement. A `.env` file at root controls all port, database
URL, and JWT secret values. `db` container uses a named volume for data persistence.  

---

### CI/CD

**Decision**: GitHub Actions for CI (lint + test on every PR); Render or Railway for CD  
**Rationale**: GitHub Actions is free for public repos; deep GitHub integration. Render/Railway
both offer free tiers with Docker support and one-click PostgreSQL add-on.  

---

## Key Business Logic Decisions

### Overlap Detection

Time reports for the same user on the same day must not have overlapping `(startTime, endTime)`
intervals. Query: check if any existing report for `(userId, reportDate)` satisfies:
`existingStart < newEnd AND existingEnd > newStart`. Reject if any match found.

### Weekend Exclusion for Absences

Work week: Sunday–Thursday. Exclude day if `dayOfWeek IN (5, 6)` (Friday = 5, Saturday = 6,
using ISO 8601 where Monday = 1). Iterate start–end range and count non-excluded days.

### Day Status Calculation (Monthly View)

For each calendar day in the selected month:
- **Complete**: Total reported hours ≥ 9 (or day is a valid absence)
- **Missing**: Working day with no report and no absence (and month started ≥ 1 day ago)
- **Exceptional**: Working day with total reported hours > 0 but < 9 or > 9 (partial day)
- **Non-working**: Weekend or holiday per WorkCalendarDay

### Month Lock Enforcement

Every write endpoint for `TimeReport` and `AbsenceReport` MUST check `MonthLock` for the
report's year-month before persisting. If `isLocked = true` and the requester is not an Admin,
return HTTP 423 Locked with a clear message.

---

## Admin Entity Form Fields (added 2026-05-11)

### Manager definition for "שיוך מנהל ראשי"

**Decision**: A manager eligible for the `primaryManagerId` dropdown is any User with `role IN (TEAM_LEAD, ADMIN)` and `status = ACTIVE`.

**Rationale**: Both roles carry supervisory responsibility. Filtering by ACTIVE prevents assigning inactive accounts. A dedicated "Manager" role is not warranted — the existing enum covers the needed semantics.

**Alternatives considered**: Separate Manager role — rejected as over-engineering.

---

### Description field length

**Decision**: `description` on Client, Project, and Task is `String?` (nullable) with a max of 500 chars enforced in Zod.

**Rationale**: Consistent with the existing `TimeReportEntry.description` limit (`@db.VarChar(500)`).

---

### Date fields (startDate / endDate) on Project and Task

**Decision**: Both are `DateTime? @db.Date` (nullable). Zod applies a `.refine()` cross-field check when both are present: `endDate >= startDate`. The same check runs in the React Hook Form resolver.

**Rationale**: Making dates optional avoids a migration-time default problem and fits FR-043/FR-045. Cross-field validation at both API and form boundaries enforces FR-044.

**Alternatives considered**: Required startDate — rejected; most tasks are created without planned timelines.

---

### primaryManagerId cascade behaviour

**Decision**: No `onDelete` action on the `primaryManager` FK (Prisma default). Deactivating a manager user leaves their `primaryManagerId` references intact on existing projects but removes them from the managers dropdown (which filters by `status = ACTIVE`).

**Rationale**: Matches FR-047. Cascading nullify would silently erase ownership history; keeping the reference preserves auditability.

---

### Managers API endpoint

**Decision**: `GET /api/v1/users/managers` — a new route on the existing users router, admin-only. Returns `{ id, fullName, role }[]`.

**Rationale**: A named endpoint is more explicit than extending `GET /api/v1/users` with a role filter query param. Reuses the existing users router and auth middleware.

---

### Active projects dropdown for tasks

**Decision**: The "שיוך לפרויקט קיים" dropdown uses `GET /api/v1/projects` (existing endpoint), client-side filtered by `status === 'ACTIVE'`. No new endpoint needed.

**Rationale**: The existing projects endpoint already carries status and is used elsewhere.

---

## Admin Nav Restructure — Stage 1 (added 2026-05-12)

Stage 1 splits the admin sidebar from 2 tabs into 4: **Users / Clients / Projects / Tasks**
(top-to-bottom). The four destination pages already exist; Stage 1 is pure navigation +
routing. Stage 2 (page redesign) is out of scope here.

### S1.1 Tab order

**Decision**: Top-to-bottom — **Users → Clients → Projects → Tasks**.

**Rationale**: Explicitly requested by the user. Also mirrors the natural admin workflow:
manage users first, then create clients, projects under clients, and tasks under projects.

**Alternatives considered**: Hierarchy-only (Clients → Projects → Tasks → Users) — rejected
because Users is the most frequent admin surface and the user pinned it to the top.

### S1.2 Hebrew labels

**Decision**: Reuse the established `ניהול X` pattern.

| Tab      | Label             | Source                                                |
|----------|-------------------|-------------------------------------------------------|
| Users    | `ניהול משתמשים`    | Existing label                                         |
| Clients  | `ניהול לקוחות`     | Split from existing combined `ניהול לקוחות/פרויקטים`     |
| Projects | `ניהול פרויקטים`   | New — follows `ניהול X` pattern                        |
| Tasks    | `ניהול משימות`     | New — follows `ניהול X` pattern                        |

**Rationale**: Consistent prefix preserves the visual rhythm of the sidebar.

### S1.3 Role gating per tab

**Decision**:
- `/admin/users` — Admin only (sidebar `adminOnly: true`).
- `/admin/clients`, `/admin/projects`, `/admin/tasks` — Admin + Team Lead.

**Rationale**: Matches Constitution IV and FR-030/FR-031. Team Leads need visibility into
project/task management for their assignment workflow (FR-034). Server-side write
authorization is independent of this routing change.

### S1.4 Index redirect for `/admin`

**Decision**: `/admin` → `/admin/users` (was `/admin/clients`).

**Rationale**: The default route follows the new top-of-sidebar tab. Keeps the change
mechanical — no per-role branching logic in Stage 1.

### S1.5 ClientsPage embedded ProjectsSection

**Decision**: Leave as-is in Stage 1.

**Rationale**: Removing the inline `ProjectsSection` from `ClientsPage` is a page-redesign
concern — explicitly Stage 2 territory ("how the pages should look like"). Stage 1 stays
mechanical.

### S1.6 Icons for the two new sidebar items

**Decision**: Inline SVGs in the same stroked-outline family as existing icons. Folder/briefcase
glyph for Projects, clipboard/checkmark glyph for Tasks.

**Rationale**: Matches existing icon style; avoids pulling in an icon library for two glyphs.
Library-wide icon migration, if any, belongs to Stage 2.

---

## Admin Pages Table Redesign — Stage 2 (added 2026-05-12)

Stage 2 rebuilds Clients, Projects, and Tasks as table-driven pages with create-via-modal.
The Users page stays as-is. Decisions below capture the calls made in addition to the spec.

### S2.1 Page shape per entity

**Decision**:

- **Clients page** — top-level table of all clients. No parent picker.
- **Projects page** — single **client picker** at the top; the table lists projects for that
  client. The `יצירה` button is always visible (even before a client is picked).
- **Tasks page** — two cascading pickers (**client → project**); the table lists tasks for the
  selected project. The `יצירה` button is always visible.

**Rationale**: Matches the user's explicit clarification: scope tables by parent so each list is
small and contextual. The Client → Project → Task hierarchy (Constitution II) is reflected in
the navigation chrome.

**Alternatives considered**:
- Flat tables across the whole DB with the parent shown as a column: rejected — would surface
  potentially thousands of rows; would also lose the create-modal pre-fill behavior the user
  wanted.

### S2.2 Create-modal parent dropdown behavior

**Decision**: In create modals the previously-disabled parent fields become **always-enabled
dropdowns**. When a parent is already selected on the page (e.g. user picked a client before
clicking `יצירה`), the modal opens with that parent pre-selected — but the user can change it.

- **Project create modal**: client dropdown always enabled. Pre-selected = the client picker's
  current value if any; empty otherwise.
- **Task create modal**: client + project dropdowns always enabled and cascade (client filters
  projects). Pre-selected = the page's current pickers if any; empty otherwise.

**Rationale**: Matches the user's clarification. Keeps a single create-modal codepath whether
the user starts from the page header or from a row context. Lets admins create cross-cutting
items without leaving the page.

**Alternatives considered**:
- Lock the parent dropdown when one is already selected on the page: rejected — the user
  explicitly asked for it to remain enabled.

### S2.3 Inactive items — toggle behavior

**Decision**: Tables show **active items by default**. A small toggle above each table
(`הצג גם לא פעילים`) controls inclusion of inactive rows.

- Inactive rows are visually de-emphasized (muted text, italic status badge).
- On an inactive row the `פעולות` column shows an **`הפעל מחדש`** icon (reactivate) instead of
  the delete icon. Edit remains available for both states.

**Rationale**: Confirmed by the user in the AskUserQuestion turn. Aligns with Constitution VII
(Transparency) — soft-deleted items are visible on demand rather than hidden.

**Alternatives considered**:
- Always include inactive rows with status column: rejected by the user.
- Active only with no toggle: rejected by the user.

### S2.4 Delete icon semantics

**Decision**: The delete (trash) icon performs a **soft-delete** via `PATCH /:id { isActive: false }`
on the existing endpoint. A `<ConfirmDialog>` confirms before the call. No hard-delete option
is exposed in this stage.

**Rationale**: FR-032 mandates soft-delete only — "no data is physically removed". The icon
is a UX shorthand; the server contract is unchanged. Re-activation uses the same endpoint with
`isActive: true`.

**Alternatives considered**:
- Add a hard-delete endpoint: rejected — would violate FR-032 and Constitution III.
- Distinct "deactivate" and "delete" icons: rejected — there is only one operation.

### S2.5 Table columns per entity

**Decision**:

| Page    | Columns                                                                                         |
|---------|-------------------------------------------------------------------------------------------------|
| Clients | `שם`, `תיאור`, `סטטוס`, `נוצר ב`, `פעולות`                                                        |
| Projects| `שם`, `מנהל ראשי`, `תאריך התחלה`, `תאריך סיום`, `תיאור`, `סטטוס`, `פעולות`                          |
| Tasks   | `שם`, `תאריך התחלה`, `תאריך סיום`, `תיאור`, `סטטוס`, `פעולות`                                      |

- The parent column (`לקוח` on Projects, `פרויקט`/`לקוח` on Tasks) is **omitted** from the body
  because the page is already scoped to one parent — the page header carries the breadcrumb
  (`לקוח: X` / `לקוח: X › פרויקט: Y`).
- `תיאור` is truncated with a tooltip on hover/touch.
- Dates render as `dd/MM/yyyy` (Hebrew locale).

**Rationale**: Avoids redundant columns since the table itself is parent-scoped. Keeps the
table readable on tablet width without horizontal scroll for the typical case.

**Alternatives considered**:
- Include parent columns anyway: rejected — duplicate information; the breadcrumb is clearer.
- Add a created-at column on Projects/Tasks: deferred — not requested and rarely useful for
  admin daily use.

### S2.6 Table chrome — no sorting, no pagination in v1

**Decision**: Top-of-table chrome is **search input only + `יצירה` button + inactive toggle**.
No clickable column-sort headers, no pagination, no virtualization. Sticky table header for
long lists.

**Rationale**: The user did not ask for sorting/pagination, and parent-scoped tables stay
small (typically <50 rows per project for tasks; per client for projects; <a few hundred clients
total). Adding sort + pagination would inflate scope without clear benefit. Search covers the
"find quickly" use case for v1. If row counts grow, sorting can be added in a focused follow-up.

**Alternatives considered**:
- Sortable headers: deferred — easy to add later without re-architecting the table.
- Server-side pagination: rejected — premature; payloads are small.

### S2.7 Search behavior

**Decision**: Search is **client-side**, case-insensitive substring match over each row's
`name` and `description` fields. Debounced 150ms. Search is **scoped to the currently loaded
list** (i.e. after the parent picker filter, after the inactive toggle).

**Rationale**: Datasets are small enough that client-side search is instant and avoids new
backend query params. Including `description` lets admins find items by note content.

**Alternatives considered**:
- Server-side search with a query param: rejected — premature.
- Search across additional columns (manager, dates): deferred — adds complexity for marginal
  benefit. Easy to extend the matcher later.

### S2.8 Modal interaction

**Decision**: A single shared `<Modal>` component with:
- Backdrop click to close.
- `Esc` to close.
- Focus trap inside the modal while open.
- `aria-modal="true"` and `role="dialog"`.
- Smooth open/close (CSS transition, no library).
- RTL layout (modal content uses `dir="rtl"`).

Edit uses the **same modal** as create, pre-populated with the row's values. The create vs
edit distinction is internal to the modal's submit handler.

**Rationale**: Symmetric UX. Avoids two divergent forms. Reduces component count.

**Alternatives considered**:
- Inline accordion edit (current Stage-1 leftover behavior): rejected — the user explicitly
  asked for a modal pattern.
- Separate edit modal component: rejected — same form fields, different mutation; one
  component with a `mode: 'create' | 'edit'` prop is simpler.

### S2.9 Backend list endpoints

**Decision**: Two new admin/team-lead-only list endpoints that return full entity shape with
joined parent data, including inactive rows:

- `GET /api/v1/projects?clientId=<uuid>` → `ProjectWithRelations[]`
  - Includes inactive rows.
  - Joins `primaryManager: { id, fullName, role } | null`.
  - Replaces the minimal shape currently returned by `GET /api/v1/projects/active`.
- `GET /api/v1/tasks?projectId=<uuid>` → `TaskWithRelations[]`
  - Includes inactive rows.
  - Joins `project: { id, name, clientId }`.

**Rationale**: The existing `/active` endpoints return a stripped `{ id, name, parentId }`
shape designed for dropdowns, and they exclude inactive rows by design. A table needs the full
row plus joined parent info plus inactive rows. Adding new top-level routes keeps the
dropdown-style endpoints unchanged and avoids overloading them with payload-shape switches.

**Alternatives considered**:
- Add `?includeInactive=true&full=true` query params to existing routes: rejected — overloads
  the route with two orthogonal payload shapes; harder to type.
- Use `/api/v1/clients/:id/projects` REST nesting: rejected — adds a new nesting pattern not
  used elsewhere; query-param style matches existing `/active?clientId=` shape.

### S2.10 Cleanup of `ProjectsSection` and `TasksSection`

**Decision**: Delete `frontend/src/pages/admin/clients/ProjectsSection.tsx` and
`frontend/src/pages/admin/clients/TasksSection.tsx`. The new `ClientsPage` is a flat table
with no embedded child surface. The new `ProjectsPage` and `TasksPage` replace the
sectioned-inside-a-client UX entirely.

**Rationale**: Stage 1 left these components in place. With Stage 2's flat-table redesign,
they are unreachable and would otherwise rot. Their logic (form fields, validation, mutation
wiring) is reproduced inside the new create/edit modals.

**Alternatives considered**:
- Keep them around for future re-use: rejected — dead code; the new modal pattern subsumes
  their functionality.
