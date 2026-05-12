# Agent Brief — Stage 2: Admin Tables & Create Modals

You are picking up a **partially-complete** implementation of Stage 2 of the admin entity redesign on
the `002-017-admin-layout` branch. Read this brief end-to-end before touching code — every
section is load-bearing.

## What you're building, in one paragraph

Rebuild three admin pages (`/admin/clients`, `/admin/projects`, `/admin/tasks`) around a single
**table + create/edit modal** pattern (Hebrew, RTL). The pages share a new `Modal` and
`ConfirmDialog` primitive. Two new backend list endpoints feed the Projects and Tasks tables
(includes inactive rows, joins parent metadata). The Users page is **out of scope**. There is
**no new DB migration** — every field already exists (schema.prisma was updated this session to
match the generated Prisma client). The trash icon is a UX wrapper around
`PATCH /:id { isActive: false }` — never a hard delete.

---

## Current State — What Has Been Done ✅

All backend work is complete and TypeScript-clean.

### Backend (DONE)

| File | Status | What was done |
|------|--------|---------------|
| `backend/prisma/schema.prisma` | ✅ Updated | Added `description` to `Client`; added `description`, `startDate`, `endDate`, `primaryManagerId`, `primaryManager` relation to `Project`; added `description`, `startDate`, `endDate` to `Task`; added `managedProjects` relation to `User`. |
| `backend/src/services/task.service.ts` | ✅ Created | `createTask`, `listActiveTasks`, `listAllTasks`, `updateTask`, `listTasksByProject`, `NotFoundError` |
| `backend/src/services/project.service.ts` | ✅ Updated | Added `listProjectsByClient(clientId)` with `include: { primaryManager: { select: { id, fullName, role } } }` and exported `ProjectWithManager` type |
| `backend/src/routes/tasks.ts` | ✅ Created | `GET /active?projectId=` (ADMIN\|TEAM_LEAD), `GET /?projectId=` (ADMIN\|TEAM_LEAD), `POST /` (ADMIN), `PATCH /:id` (ADMIN) |
| `backend/src/routes/projects.ts` | ✅ Updated | Added `GET /?clientId=` (ADMIN\|TEAM_LEAD) using `listProjectsByClient` |
| `backend/src/app.ts` | ✅ Updated | Registered `tasksRouter` at `/api/v1/tasks` |
| `backend/src/__tests__/task.service.test.ts` | ✅ Created | 8 unit tests, all passing (mocked prisma) |
| `backend/src/__tests__/tasks.routes.test.ts` | ✅ Created | Integration route tests (require real DB with seed) |
| `backend/src/__tests__/client.service.test.ts` | ✅ Fixed | Added `description: null` to mock object |

`pnpm --filter backend exec tsc --noEmit` passes. `task.service.test.ts` passes (8/8).

### Frontend (NOT STARTED)

Nothing in the frontend has been changed yet.

---

## What Still Needs to Be Done ❌

### Step 1 — Update `frontend/src/types/entities.ts`

Add these to the existing file (Project type also needs new fields):

```ts
// Update Project — add the new fields from the schema
export interface Project {
  id: string;
  clientId: string;
  name: string;
  description: string | null;   // NEW
  startDate: string | null;     // NEW
  endDate: string | null;       // NEW
  primaryManagerId: string | null; // NEW
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// NEW types
export interface Manager {
  id: string;
  fullName: string;
  role: string;
}

export interface ProjectWithRelations extends Project {
  primaryManager: Manager | null;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  deletedAt: string | null;
}

export type TaskWithRelations = Task;
```

Also update `Client` to include `description: string | null`.

### Step 2 — Update `frontend/src/services/entities.service.ts`

Add these hooks (append to existing file):

```ts
// Query key: ['projects', 'byClient', clientId]
export function useProjectsByClient(clientId: string | undefined) { ... }
  // GET /api/v1/projects?clientId=  → ProjectWithRelations[]
  // enabled: clientId !== undefined

// Query key: ['tasks', 'byProject', projectId]
export function useTasksByProject(projectId: string | undefined) { ... }
  // GET /api/v1/tasks?projectId=  → Task[]
  // enabled: projectId !== undefined

export function useActiveTasks(projectId: string | undefined) { ... }
  // GET /api/v1/tasks/active?projectId=  → { id, name, projectId }[]

export function useCreateTask() { ... }
  // POST /api/v1/tasks  { projectId, name }
  // onSuccess: invalidate ['tasks', 'byProject', projectId] + ['tasks']

export function useUpdateTask() { ... }
  // PATCH /api/v1/tasks/:id  { name?, isActive? }
  // onSuccess: invalidate ['tasks']
```

Also **extend existing mutations**:
- `useCreateProject` → also invalidate `['projects', 'byClient', variables.clientId]`
- `useUpdateProject` → also invalidate `['projects', 'byClient', ...]` (invalidate all `['projects']`)

### Step 3 — Create `frontend/src/components/Modal.tsx`

Generic RTL modal. Props: `isOpen`, `onClose`, `title`, `children`. Close on Escape key and backdrop click.

```tsx
// RTL modal with backdrop, Escape-to-close, title bar with ✕ button
// Use Tailwind only. No directional properties (pl/pr) — use ps/pe.
// dir="rtl" on the container
```

### Step 4 — Create `frontend/src/components/ConfirmDialog.tsx`

Thin wrapper over `Modal` for soft-delete confirmations.

Props: `isOpen`, `onClose`, `onConfirm`, `title`, `message`, `confirmLabel?`, `isPending?`

The confirm button should be styled red (destructive action).

### Step 5 — Create `frontend/src/pages/admin/clients/TasksSection.tsx` (T016)

Tasks sub-section rendered inside `ProjectsSection` within the expanded client accordion.

- Fetches `useTasksByProject(projectId)` (shows all tasks incl. CLOSED)
- Each task row: task name, status badge (OPEN=green / CLOSED=gray), edit button (inline rename form), close/reopen button
- "+ משימה חדשה" inline form with `useCreateTask()`
- No Modal needed here — inline forms like the existing `ProjectsSection` pattern

### Step 6 — Rewrite `frontend/src/pages/admin/clients/ClientsPage.tsx`

Replace the accordion pattern with a **flat table + create modal**:

- Header: `<h1>לקוחות</h1>` + `"+ יצירה"` button (always visible)
- Table columns: שם לקוח | תיאור | סטטוס | פעולות
- Actions per row: edit icon (opens edit modal) + trash icon (→ `PATCH { isActive: false }` via `ConfirmDialog`)
- Create/Edit modal via `Modal.tsx` with a `react-hook-form` form: `name` (required), `description` (optional)
- Uses `useAllClients()`, `useCreateClient()`, `useUpdateClient()`
- Status badge: פעיל (green) / לא פעיל (gray)
- Do NOT delete `ProjectsSection.tsx` or `TasksSection.tsx` — they stay as orphaned files until cleanup

### Step 7 — Create `frontend/src/pages/admin/projects/ProjectsPage.tsx` (NEW FILE)

Separate admin page for projects with a client picker at the top.

- Client picker: `<select>` using `useAllClients()` — shows all clients (active + inactive)
- "+ יצירה" button always visible (even before client is selected — opens modal pre-filled if client selected)
- Table (shown after client selected): שם פרויקט | מנהל ראשי | סטטוס | פעולות
- Actions: edit icon + trash icon (soft-delete via ConfirmDialog)
- Create modal fields: שם פרויקט (required), לקוח (pre-filled from picker, always enabled/editable)
- Edit modal fields: שם פרויקט, סטטוס toggle
- Uses `useProjectsByClient(selectedClientId)`, `useCreateProject()`, `useUpdateProject()`

Create the directory `frontend/src/pages/admin/projects/` first.

### Step 8 — Create `frontend/src/pages/admin/tasks/TasksPage.tsx` (NEW FILE)

Separate admin page for tasks with cascading client → project pickers.

- Client picker: `useAllClients()` → selecting a client populates project picker
- Project picker: `useProjectsByClient(selectedClientId)` — enabled only after client chosen
- "+ יצירה" button always visible (opens modal; pre-filled from pickers if both selected)
- Table (shown after project selected): שם משימה | סטטוס | פעולות
- Actions: edit icon + close/reopen icon (soft-delete maps isActive=false → CLOSED)
- Create modal fields: שם משימה (required), לקוח (UI only, filters project dropdown), פרויקט (required, always enabled even when pre-filled)
- NOTE: `clientId` is UI-only and NOT in POST body. Only `projectId` goes to the API.
- Uses `useTasksByProject(selectedProjectId)`, `useCreateTask()`, `useUpdateTask()`

Create the directory `frontend/src/pages/admin/tasks/` first.

### Step 9 — Update `frontend/src/router.tsx`

Add routes for the two new pages inside the existing `/admin` children:

```tsx
{ path: 'projects', element: <ProjectsPage /> },
{ path: 'tasks', element: <TasksPage /> },
```

Import `ProjectsPage` from `./pages/admin/projects/ProjectsPage` and `TasksPage` from `./pages/admin/tasks/TasksPage`.

### Step 10 — Update `frontend/src/pages/admin/AdminPage.tsx`

Add two new entries to the `NAV_ITEMS` array (after the clients entry, before users):

```tsx
{ to: '/admin/projects', label: 'פרויקטים', icon: <...> },
{ to: '/admin/tasks', label: 'משימות', icon: <...> },
```

Use simple SVG icons consistent with the existing style (24×24 viewBox, stroke-based).

---

## Hard Constraints (unchanged)

- **No new DB migration.** Every field Stage 2 reads/writes already exists.
- **Soft-delete only.** Trash icon → `PATCH /:id { isActive: false }`. Never hard-delete.
- **Both new endpoints are role-gated** `requireRole(ADMIN, TEAM_LEAD)`. ✅ Already done.
- **The existing `/active` endpoints are untouched.** ✅ Already done.
- **The `clientId` field on the Task create modal is UI-only** — NOT in the POST body.
- **The `"+ יצירה"` button is always visible**, even before a parent is picked.
- **The parent dropdown in the modal is always enabled** — even when pre-filled.

## Repo Conventions

- **Imports:** `import type` for type-only imports (`verbatimModuleSyntax` is on).
- **No `any`.** Use `unknown` + type guards.
- **Styling:** Tailwind only. Logical properties (`ps`, `pe`, `ms`, `me`) not directional (`pl`, `pr`). RTL must flip correctly.
- **Forms:** React Hook Form. Hebrew error messages inline.
- **Server state:** TanStack Query. Extend existing mutation `onSuccess` invalidations for new query keys.
- **HTTP:** `apiClient` from `frontend/src/services/api.ts`. Do not import `axios` directly.
- **Comments:** None unless WHY is non-obvious.
- **Commits:** Do NOT run `git commit` — produce commit message text and let the user run it.

## Verification After Each Step

```bash
pnpm --filter frontend exec tsc --noEmit
```

Run this after every frontend file you create or edit. Fix errors before proceeding.

## Key File Paths

```
frontend/src/types/entities.ts               ← Step 1
frontend/src/services/entities.service.ts    ← Step 2
frontend/src/components/Modal.tsx            ← Step 3 (NEW)
frontend/src/components/ConfirmDialog.tsx    ← Step 4 (NEW)
frontend/src/pages/admin/clients/TasksSection.tsx    ← Step 5 (NEW)
frontend/src/pages/admin/clients/ClientsPage.tsx     ← Step 6 (REWRITE)
frontend/src/pages/admin/projects/ProjectsPage.tsx   ← Step 7 (NEW)
frontend/src/pages/admin/tasks/TasksPage.tsx         ← Step 8 (NEW)
frontend/src/router.tsx                      ← Step 9
frontend/src/pages/admin/AdminPage.tsx       ← Step 10
```

## Discrepancy Notes for the New Agent

1. **`contracts/admin-tables.md` and `tasks-admin-tables.md` do not exist.** Ignore references to
   them in the original brief. Use this updated brief as the primary spec.

2. **`schema.prisma` was updated this session** to match the Prisma generated client (which had
   fields not reflected in the file). The generated client is authoritative — do not run
   `prisma migrate dev`.

3. **The original brief says "Don't touch router.tsx or AdminPage.tsx."** That constraint assumed
   Stage 1 had added those routes — it hadn't. You MUST update both files (Steps 9 and 10).

4. **Naming convention for test files:** `tasks.routes.test.ts` (not `tasks.test.ts`) to match
   `users.routes.test.ts`. ✅ Already applied.
