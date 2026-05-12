# Contract: Admin Tables, Create Modals & List APIs (Stage 2)

This contract pins down: (1) the page chrome and table layout for Clients/Projects/Tasks,
(2) the create/edit modal shape and dropdown rules, (3) the two new backend list endpoints
and their response payloads.

## 1. Page chrome (RTL, Hebrew)

All three pages share this top-down structure:

```
[ Page title:      "ניהול לקוחות" | "ניהול פרויקטים" | "ניהול משימות" ]
[ Parent picker(s) (Projects: client; Tasks: client → project) ]
[ Toolbar row, RTL: SEARCH on the right (start), TOGGLE "הצג גם לא פעילים", "יצירה" on the left (end) ]
[ Table (sticky header, RTL columns) ]
```

- The **`יצירה`** button is **always rendered**, even when no parent is selected. Clicking it
  always opens the create modal — never disabled.
- The **`הצג גם לא פעילים`** toggle defaults to OFF. Toggling ON includes inactive rows.
- The **search input** filters the currently loaded rows client-side (case-insensitive
  substring over `name` and `description`).
- The **parent picker(s)** sit between the title and the toolbar. On the Projects page, the
  client picker is a single `<select>`. On the Tasks page, two `<select>`s in a row: client
  cascades into project.

## 2. Table layout

### 2.1 Clients table

| Column header | Source field          | Notes                                           |
|---------------|-----------------------|-------------------------------------------------|
| `שם`          | `client.name`         |                                                 |
| `תיאור`        | `client.description`  | Truncate at ~60 chars; full text in `title` attr |
| `סטטוס`        | `client.status`       | `פעיל` (green) / `לא פעיל` (gray)                |
| `נוצר ב`       | `client.createdAt`    | `dd/MM/yyyy`                                    |
| `פעולות`       | —                     | Edit + (delete \| activate) icons               |

### 2.2 Projects table (scoped to selected client)

| Column header | Source field                       | Notes                                            |
|---------------|------------------------------------|--------------------------------------------------|
| `שם`           | `project.name`                     |                                                  |
| `מנהל ראשי`    | `project.primaryManager.fullName`  | `—` if null                                      |
| `תאריך התחלה`  | `project.startDate`                | `dd/MM/yyyy` or `—`                              |
| `תאריך סיום`   | `project.endDate`                  | `dd/MM/yyyy` or `—`                              |
| `תיאור`        | `project.description`              | Truncate as above                                |
| `סטטוס`        | `project.status`                   | `פעיל` / `לא פעיל`                                |
| `פעולות`       | —                                  | Edit + (delete \| activate) icons                |

The client name is shown in the page **breadcrumb above the table**, not as a column.

### 2.3 Tasks table (scoped to selected client + project)

| Column header | Source field            | Notes                                            |
|---------------|-------------------------|--------------------------------------------------|
| `שם`           | `task.name`             |                                                  |
| `תאריך התחלה`  | `task.startDate`        | `dd/MM/yyyy` or `—`                              |
| `תאריך סיום`   | `task.endDate`          | `dd/MM/yyyy` or `—`                              |
| `תיאור`        | `task.description`      | Truncate as above                                |
| `סטטוס`        | `task.status`           | `פתוח` (green) / `סגור` (gray)                    |
| `פעולות`       | —                       | Edit + (close \| reopen) icons                   |

Note: Tasks use `OPEN`/`CLOSED` rather than `ACTIVE`/`INACTIVE`. The PATCH semantic is the
same — `isActive: false` closes the task, `isActive: true` reopens it (existing backend behavior).

The client + project breadcrumb sits above the table.

## 3. Action icons (`פעולות` column)

Two icons per row, in this order (RTL):

| Row state              | Icons shown                                 | On click                                   |
|------------------------|---------------------------------------------|--------------------------------------------|
| Active row             | `✏️ Edit`  •  `🗑️ Delete`                   | Edit → open modal in edit mode. Delete → open ConfirmDialog → on confirm, `PATCH /:id { isActive: false }`. |
| Inactive row           | `✏️ Edit`  •  `↻ Activate`                  | Edit → open modal in edit mode. Activate → on click (no confirm), `PATCH /:id { isActive: true }`. |

Icons are inline SVGs (no library), 20×20, stroked outline, hover-tinted.

## 4. Create / Edit Modal

A single `<Modal>` component is reused. The form inside is rendered per entity.

### 4.1 Modal mechanics

- Opens on `יצירה` click (create mode) or on row's edit icon click (edit mode).
- `Esc` closes. Backdrop click closes. Close button (`×`) in modal header closes.
- Focus traps inside the modal while open.
- `dir="rtl"` on modal content.
- Submit calls the existing `useCreate*` / `useUpdate*` mutation; on success, modal closes
  and the table query is invalidated by the mutation's existing `onSuccess`.
- Validation errors render inline under each field (Hebrew messages, existing pattern).

### 4.2 Client modal fields

| Field   | Hebrew label    | Component | Required | Notes                       |
|---------|-----------------|-----------|----------|-----------------------------|
| name    | `שם לקוח`        | `<input>` | yes      | max 255 chars               |
| description | `תיאור`     | `<textarea>` | no    | max 500 chars               |

### 4.3 Project modal fields

| Field            | Hebrew label                | Component   | Required | Notes                                                      |
|------------------|-----------------------------|-------------|----------|------------------------------------------------------------|
| name             | `שם פרויקט`                  | `<input>`   | yes      | max 255 chars                                              |
| **clientId**     | `שם לקוח`                    | `<select>`  | yes      | **ALWAYS ENABLED.** Options = active clients. Pre-selected = page's client picker value if any. |
| primaryManagerId | `שיוך מנהל ראשי`             | `<select>`  | no       | Options = `useManagers()` result (TEAM_LEAD/ADMIN, ACTIVE) |
| startDate        | `תאריך התחלה`                | `<input type="date">` | no |                                                            |
| endDate          | `תאריך סיום`                 | `<input type="date">` | no | Cross-field validation: must be ≥ startDate                |
| description      | `תיאור`                     | `<textarea>` | no      | max 500 chars                                              |

### 4.4 Task modal fields

| Field           | Hebrew label                  | Component   | Required | Notes                                                       |
|-----------------|-------------------------------|-------------|----------|-------------------------------------------------------------|
| name            | `שם משימה`                     | `<input>`   | yes      | max 255 chars                                               |
| **clientId**    | `לקוח`                         | `<select>`  | yes      | **ALWAYS ENABLED.** Filters the project dropdown.            |
| **projectId**   | `שיוך לפרויקט קיים`            | `<select>`  | yes      | **ALWAYS ENABLED.** Options = active projects for selected client. Pre-selected = page's project picker value if any. |
| startDate       | `תאריך התחלה`                  | `<input type="date">` | no |                                                             |
| endDate         | `תאריך סיום`                   | `<input type="date">` | no | Cross-field validation: must be ≥ startDate                 |
| description     | `תיאור`                       | `<textarea>` | no      | max 500 chars                                               |

Note: The Task API accepts `projectId` only — the modal's `clientId` is a UI-only filter for
the project dropdown and is not part of the request body.

### 4.5 Pre-fill rules (create mode)

| Page         | Pre-filled fields when opening create modal                                |
|--------------|-----------------------------------------------------------------------------|
| Clients      | All empty.                                                                 |
| Projects     | `clientId` ← page's selected client (if any), else empty. All else empty.  |
| Tasks        | `clientId` ← page's selected client (if any). `projectId` ← page's selected project (if any). All else empty. |

In all cases, every field — including pre-filled dropdowns — remains editable.

## 5. Backend list endpoints (NEW)

### 5.1 `GET /api/v1/projects?clientId=<uuid>`

- **Auth**: authenticated; `requireRole(ADMIN, TEAM_LEAD)`.
- **Query**: `clientId` (uuid, required) — validated via Zod; 400 on missing/invalid.
- **Behavior**: Returns **all** projects (active + inactive) for the given client, ordered by
  `name asc`.
- **Response 200**:
  ```ts
  type ProjectWithRelations = {
    id: string;
    clientId: string;
    name: string;
    description: string | null;
    startDate: string | null;        // ISO date
    endDate: string | null;          // ISO date
    primaryManagerId: string | null;
    primaryManager: { id: string; fullName: string; role: 'TEAM_LEAD' | 'ADMIN' } | null;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  ```
- **Notes**:
  - Implemented in `backend/src/services/project.service.ts` as `listProjectsByClient(clientId)` using `prisma.project.findMany({ where: { clientId }, include: { primaryManager: { select: { id, fullName, role } } }, orderBy: { name: 'asc' } })`.
  - The existing `GET /active` endpoint is **untouched**.

### 5.2 `GET /api/v1/tasks?projectId=<uuid>`

- **Auth**: authenticated; `requireRole(ADMIN, TEAM_LEAD)`.
- **Query**: `projectId` (uuid, required) — validated via Zod; 400 on missing/invalid.
- **Behavior**: Returns **all** tasks (open + closed) for the given project, ordered by
  `name asc`.
- **Response 200**:
  ```ts
  type TaskWithRelations = {
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
  };
  ```
- **Notes**:
  - Implemented in `backend/src/services/task.service.ts` as `listTasksByProject(projectId)`.
  - Does **not** embed the project — the page already knows the project from the picker. The
    join is omitted for simplicity; can be added if a future view needs cross-project tables.
  - The existing `GET /active` endpoint is **untouched**.

### 5.3 Endpoint changes summary

| Method | Path                              | Status  | Notes                              |
|--------|-----------------------------------|---------|------------------------------------|
| GET    | `/api/v1/clients`                 | existing | Already returns full Client[]      |
| GET    | `/api/v1/clients/active`          | existing | Used for dropdowns; unchanged       |
| GET    | `/api/v1/projects?clientId=`      | **NEW** | Full list incl. inactive, joined   |
| GET    | `/api/v1/projects/active?clientId=` | existing | Used for dropdowns; unchanged       |
| POST   | `/api/v1/projects`                | existing | Admin-only create                  |
| PATCH  | `/api/v1/projects/:id`            | existing | Admin-only update (incl. isActive) |
| GET    | `/api/v1/tasks?projectId=`        | **NEW** | Full list incl. inactive           |
| GET    | `/api/v1/tasks/active?projectId=` | existing | Used for dropdowns; unchanged       |
| POST   | `/api/v1/tasks`                   | existing | Admin-only create                  |
| PATCH  | `/api/v1/tasks/:id`               | existing | Admin-only update (incl. isActive) |

## 6. New frontend query hooks

```ts
// in frontend/src/services/entities.service.ts

export function useProjectsByClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ['projects', 'byClient', clientId],
    queryFn: async () => {
      const { data } = await apiClient.get<ProjectWithRelations[]>(
        '/api/v1/projects',
        { params: { clientId } },
      );
      return data;
    },
    enabled: clientId !== undefined && clientId !== '',
  });
}

export function useTasksByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', 'byProject', projectId],
    queryFn: async () => {
      const { data } = await apiClient.get<TaskWithRelations[]>(
        '/api/v1/tasks',
        { params: { projectId } },
      );
      return data;
    },
    enabled: projectId !== undefined && projectId !== '',
  });
}
```

Mutation `onSuccess` invalidation must extend to the new query keys:
- `useCreateProject` / `useUpdateProject` → invalidate `['projects', 'byClient']` (in addition to existing `['projects']`).
- `useCreateTask` / `useUpdateTask` → invalidate `['tasks', 'byProject']`.

## 7. Type additions

In `frontend/src/types/entities.ts`:

```ts
export interface ProjectWithRelations extends Project {
  primaryManager: { id: string; fullName: string; role: 'TEAM_LEAD' | 'ADMIN' } | null;
}

export type TaskWithRelations = Task; // no join in v1; alias exists for parity
```

## 8. Files deleted

- `frontend/src/pages/admin/clients/ProjectsSection.tsx` — superseded by the standalone Projects page + create modal.
- `frontend/src/pages/admin/clients/TasksSection.tsx` — superseded by the standalone Tasks page + create modal.

## 9. Out of scope for Stage 2

- Sorting headers on tables.
- Pagination.
- Mobile-specific table-to-card collapse.
- Users page redesign.
- Audit log surfacing for create/edit/deactivate actions (FR-035 covers write-log on report
  edits; not extended to entity admin in this stage).
- Bulk actions (multi-select rows for batch deactivate).
- Server-side search.
