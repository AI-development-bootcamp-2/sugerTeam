# Quickstart: Time Reporting System

**Date**: 2026-05-06 | **Plan**: [plan.md](plan.md)

---

## Prerequisites

- Node.js 20+
- PostgreSQL 16
- pnpm (or npm/yarn)

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd time-reporting-system

# Install backend dependencies
cd backend && pnpm install && cd ..

# Install frontend dependencies
cd frontend && pnpm install && cd ..
```

---

## 2. Configure Environment

### Backend (`backend/.env`)

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/time_reporting"
JWT_ACCESS_SECRET="change-me-access-secret"
JWT_REFRESH_SECRET="change-me-refresh-secret"
JWT_ACCESS_EXPIRES_IN="2h"
JWT_REFRESH_EXPIRES_IN="30d"
UPLOAD_DIR="./uploads/absence-docs"
PORT=3000
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3000
```

---

## 3. Database Setup

```bash
cd backend

# Run migrations
pnpm prisma migrate dev --name init

# Seed admin user (email: admin@company.com, password: Admin1234!)
pnpm prisma db seed
```

---

## 4. Start Development Servers

```bash
# Terminal 1 — Backend (port 3000)
cd backend && pnpm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend && pnpm run dev
```

Open http://localhost:5173 — login with `admin@company.com` / `Admin1234!`

---

## 5. First-Time Setup Flow

1. **Admin logs in** → creates employees and team leads
2. **Admin creates clients → projects → tasks**
3. **Team lead or admin assigns employees to tasks**
4. **Employees can now log in and submit daily work reports**

---

## 6. Running Tests

```bash
# Backend unit + e2e tests
cd backend && pnpm test && pnpm test:e2e

# Frontend component tests
cd frontend && pnpm test
```

---

## 7. Key API Endpoints (summary)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login — returns access + refresh tokens |
| POST | `/auth/refresh` | Rotate tokens |
| GET | `/tasks/assigned` | Tasks available to current user for reporting |
| POST | `/reports` | Submit time report |
| GET | `/reports/monthly-status` | Monthly calendar status |
| POST | `/absences` | Submit absence report |
| POST | `/absences/:id/document` | Upload supporting document |
| POST | `/timer/start` | Start workday timer |
| POST | `/timer/stop` | Stop timer + get pre-fill data |
| POST | `/months/:year/:month/lock` | Admin: lock reporting month |

Full API reference: [contracts/api.md](contracts/api.md)

---

## Implementing Admin Entity Form Fields (FR-042 – FR-047)

### Step 1 — Prisma schema migration

Add nullable columns to `Client`, `Project`, and `Task` in `backend/prisma/schema.prisma`:

```prisma
model Client {
  // existing fields...
  description String?
}

model Project {
  // existing fields...
  description      String?
  primaryManagerId String?
  startDate        DateTime? @db.Date
  endDate          DateTime? @db.Date

  primaryManager User? @relation("ProjectManager", fields: [primaryManagerId], references: [id])
}

model Task {
  // existing fields...
  description String?
  startDate   DateTime? @db.Date
  endDate     DateTime? @db.Date
}
```

Run migration:
```bash
cd backend
pnpm prisma migrate dev --name add-admin-entity-fields
```

### Step 2 — Backend: Zod + services

1. **`routes/clients.ts`** — add `description: z.string().max(500).optional()` to create/update schemas.
2. **`routes/projects.ts`** — add `description`, `primaryManagerId` (UUID optional), `startDate`/`endDate` (date string optional), and a `.refine()` cross-check that `endDate >= startDate`.
3. **`routes/tasks.ts`** — same date fields + description + `.refine()` check.
4. **`routes/users.ts`** — add `GET /managers`: query `{ role: { in: ['TEAM_LEAD','ADMIN'] }, status: 'ACTIVE' }`, return `{ id, fullName, role }[]`. Gate with admin middleware.
5. **`services/project.service.ts`** — include `primaryManager: { select: { id, fullName, role } }` in read queries.

### Step 3 — Frontend: types and services

1. **`types/entities.ts`** — extend `Client`, `Project`, `Task` interfaces with the new optional fields.
2. **`services/entities.service.ts`** — add `useManagers()` query hook: `GET /api/v1/users/managers`.

### Step 4 — Frontend: admin form components

1. **`ClientsPage.tsx`** — add a `<textarea>` / `<input>` for `description` to create and edit forms.
2. **`ProjectsPage.tsx`** — add: client dropdown (already has `clientId`), manager dropdown (from `useManagers()`), description textarea, startDate/endDate date inputs. Add `endDate >= startDate` validation in the RHF resolver.
3. **`TasksPage.tsx`** — add: project dropdown (already has `projectId`, label "שיוך לפרויקט קיים"), description textarea, startDate/endDate date inputs with the same cross-field validation.

### Step 5 — Tests

Add/update test cases in `backend/src/__tests__/`:
- `clients.test.ts` — test create/update with and without description.
- `projects.test.ts` — test create with primaryManagerId (valid manager, non-manager, inactive user), endDate < startDate rejection.
- `tasks.test.ts` — test endDate < startDate rejection, description truncation.
- `users.test.ts` — test GET /managers returns only TEAM_LEAD/ADMIN with ACTIVE status.

---

## Stage 1 — Admin Nav Restructure Verification

Stage 1 splits the admin sidebar into 4 tabs (Users / Clients / Projects / Tasks). The four
pages already exist; no backend changes. Use these steps to verify after the routing + sidebar
edits land.

### 1. Type-check

```powershell
pnpm --filter frontend exec tsc --noEmit
```
Expect zero errors.

### 2. Run the dev server

```powershell
pnpm --filter frontend dev
```

### 3. Verify as Admin

Log in as an Admin and navigate to `/admin`. Expect:
- Redirected to `/admin/users`.
- Sidebar shows exactly 4 items top-to-bottom: `ניהול משתמשים`, `ניהול לקוחות`, `ניהול פרויקטים`, `ניהול משימות`.
- The active item is highlighted with the existing orange edge accent.

Click each tab:
- `ניהול משתמשים` → `UsersListPage` renders.
- `ניהול לקוחות` → `ClientsPage` renders (its inline `ProjectsSection` is still present — intentional in Stage 1).
- `ניהול פרויקטים` → `ProjectsPage` renders (client picker + projects list).
- `ניהול משימות` → `TasksPage` renders (client + project pickers + tasks list).

### 4. Verify as Team Lead

Log in as a Team Lead, navigate to `/admin`. Expect:
- Sidebar shows exactly 3 items: Clients, Projects, Tasks. The Users entry is hidden.
- Direct navigation to `/admin/users` is not blocked by Stage 1 (parent route still allows Team Lead). Server-side write endpoints for user management remain admin-only and are unaffected by this routing change.

### 5. Files touched

Only two files should change for Stage 1:
- `frontend/src/pages/admin/AdminPage.tsx`
- `frontend/src/router.tsx`

### 6. Out-of-scope reminders

- No edits to `UsersListPage`, `ClientsPage`, `ProjectsPage`, `TasksPage`, `ProjectsSection`, or `TasksSection`.
- No backend changes.
- No visual restyle.
- The inline `ProjectsSection` inside `ClientsPage` stays — Stage 2 will untangle it.

---

## Stage 2 — Admin Tables & Create Modals Verification

Stage 2 rebuilds Clients, Projects, and Tasks as table + create-modal pages, adds two
backend list endpoints, and removes `ProjectsSection.tsx` / `TasksSection.tsx`. Verify after
implementation as follows.

### 1. Type-check and unit tests

```powershell
pnpm --filter backend exec tsc --noEmit
pnpm --filter backend test -- --runTestsByPath src/__tests__/projects.test.ts src/__tests__/tasks.test.ts
pnpm --filter frontend exec tsc --noEmit
```
All commands should pass.

### 2. Start dev servers

```powershell
pnpm --filter backend dev   # one terminal
pnpm --filter frontend dev  # another terminal
```

### 3. Clients page — `/admin/clients`

- Page renders a table with columns: `שם`, `תיאור`, `סטטוס`, `נוצר ב`, `פעולות`.
- Toolbar above table shows search input (right), `הצג גם לא פעילים` toggle, and `יצירה` button (left).
- Click `יצירה` → modal opens with `שם לקוח` and `תיאור` fields. Submit creates a client; modal closes; new row appears.
- Click edit icon on a row → modal opens pre-filled; submit updates row in-place.
- Click delete icon → `ConfirmDialog` appears; confirming sets the row to `לא פעיל` and (with toggle OFF) it disappears from the table.
- Toggle `הצג גם לא פעילים` ON → inactive rows reappear with muted styling; their action column shows `הפעל מחדש` instead of delete.
- Type in search → table filters live to rows whose name or description contains the query (case-insensitive).

### 4. Projects page — `/admin/projects`

- Top of page: a single client `<select>` picker.
- Below that: toolbar (search / inactive toggle / `יצירה`).
- `יצירה` button is **always visible**, even when no client is selected.
- With **no client selected**: clicking `יצירה` opens the modal with an empty `שם לקוח` dropdown (showing active clients). Empty state below toolbar reads `בחר לקוח כדי לראות פרויקטים`.
- After picking a client: table renders with columns `שם`, `מנהל ראשי`, `תאריך התחלה`, `תאריך סיום`, `תיאור`, `סטטוס`, `פעולות`. Breadcrumb above table shows `לקוח: <name>`.
- Clicking `יצירה` with a client selected → modal opens with `שם לקוח` **pre-selected and editable** (it's an enabled dropdown, not a disabled label).
- Verify cross-field validation: setting `תאריך סיום` before `תאריך התחלה` shows the existing Hebrew error and blocks submit.
- Delete icon → ConfirmDialog → row deactivates.

### 5. Tasks page — `/admin/tasks`

- Top of page: client `<select>`, then project `<select>` (cascades, disabled until a client is picked).
- Toolbar (search / inactive toggle / `יצירה`).
- `יצירה` always visible. With no project selected the modal opens with empty `לקוח` and `שיוך לפרויקט קיים` dropdowns (both enabled). Selecting a client in the modal filters the project dropdown.
- With a project selected on the page: clicking `יצירה` opens the modal with both `לקוח` and `שיוך לפרויקט קיים` pre-selected and editable.
- Table columns: `שם`, `תאריך התחלה`, `תאריך סיום`, `תיאור`, `סטטוס` (`פתוח`/`סגור`), `פעולות`.
- Close (delete) icon → ConfirmDialog → task becomes `סגור`; with toggle OFF it disappears; with toggle ON it shows muted with a reopen icon.

### 6. Backend endpoints sanity

Using `curl` (replace tokens / IDs):

```powershell
# Projects by client — includes inactive, joins primaryManager
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/v1/projects?clientId=<uuid>"

# Tasks by project — includes inactive
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/v1/tasks?projectId=<uuid>"
```

Expect: 200 with full entity arrays as defined in `contracts/admin-tables.md` § 5.

A request without `clientId` / `projectId` returns 400. A request as a non-admin/team-lead user returns 403.

### 7. Files touched (sanity check)

```powershell
git diff --stat main..HEAD
```

Expect changes to (no others):
- `backend/src/routes/projects.ts`
- `backend/src/routes/tasks.ts`
- `backend/src/services/project.service.ts`
- `backend/src/services/task.service.ts`
- `backend/src/__tests__/projects.test.ts`
- `backend/src/__tests__/tasks.test.ts`
- `frontend/src/components/Modal.tsx` (NEW)
- `frontend/src/components/ConfirmDialog.tsx` (NEW)
- `frontend/src/pages/admin/clients/ClientsPage.tsx`
- `frontend/src/pages/admin/projects/ProjectsPage.tsx`
- `frontend/src/pages/admin/tasks/TasksPage.tsx`
- `frontend/src/pages/admin/clients/ProjectsSection.tsx` (DELETED)
- `frontend/src/pages/admin/clients/TasksSection.tsx` (DELETED)
- `frontend/src/services/entities.service.ts`
- `frontend/src/types/entities.ts`

### 8. Rollback

Stage 2 has no DB migration — `git revert` of the implementation commit is fully reversible.
