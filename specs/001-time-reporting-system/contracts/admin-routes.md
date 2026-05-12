# Contract: Admin Sidebar & Routing (Stage 1)

This is the UI/routing contract for the admin area after Stage 1. It defines what the sidebar
exposes, what URL each item maps to, what role gating applies, and which already-existing page
component renders at each route.

## Sidebar (top-to-bottom)

| # | Hebrew label   | URL              | Role gating (sidebar) | Page component                       |
|---|----------------|------------------|-----------------------|--------------------------------------|
| 1 | `ניהול משתמשים` | `/admin/users`   | Admin only            | `pages/admin/users/UsersListPage`    |
| 2 | `ניהול לקוחות`  | `/admin/clients` | Admin + Team Lead     | `pages/admin/clients/ClientsPage`    |
| 3 | `ניהול פרויקטים`| `/admin/projects`| Admin + Team Lead     | `pages/admin/projects/ProjectsPage`  |
| 4 | `ניהול משימות`  | `/admin/tasks`   | Admin + Team Lead     | `pages/admin/tasks/TasksPage`        |

## Routing (`frontend/src/router.tsx`)

The `/admin` parent stays guarded by `ProtectedRoute allowedRoles={[ADMIN, TEAM_LEAD]}`. The
children list becomes exactly:

```ts
{
  path: '/admin',
  element: <AdminPage />,
  children: [
    { index: true,        element: <Navigate to="/admin/users" replace /> },
    { path: 'users',      element: <UsersListPage /> },
    { path: 'clients',    element: <ClientsPage /> },
    { path: 'projects',   element: <ProjectsPage /> },
    { path: 'tasks',      element: <TasksPage /> },
  ],
}
```

Imports added at the top of `router.tsx`:
- `import ProjectsPage from './pages/admin/projects/ProjectsPage';`
- `import TasksPage from './pages/admin/tasks/TasksPage';`

## Sidebar nav definition (`frontend/src/pages/admin/AdminPage.tsx`)

The `NAV_ITEMS` array becomes 4 entries, in the order above. The `adminOnly: true` flag stays
**only** on the Users entry. The existing icon-rendering logic, `NavItem` component, and
sidebar layout markup are unchanged.

## Out-of-scope for Stage 1

- No edits to `UsersListPage`, `ClientsPage`, `ProjectsPage`, `TasksPage`, `ProjectsSection`, or `TasksSection`.
- No backend changes.
- No new API endpoints.
- No data-model changes.
- No visual redesign of the sidebar or pages (Stage 2).
- No mobile-specific layout work (Stage 2).

## Behavioral expectations

1. **Active-state highlight**: `NavLink` continues to mark the active tab with the existing
   orange edge accent (`bg-[#1F2A4F] text-white shadow-[-4px_0_0_0_#F09A37]`). No styling
   changes — the new entries inherit the existing `NavItem` styling.
2. **Role hiding**: A Team Lead logging into `/admin` MUST NOT see the Users sidebar entry but
   MUST see Clients, Projects, and Tasks. Typing `/admin/users` directly while logged in as a
   Team Lead is **not blocked** by Stage 1 (the parent route guard allows Team Lead). Server-side
   user-management endpoints remain admin-only — this contract does not change that.
3. **Default landing**: Visiting `/admin` redirects to `/admin/users` for everyone allowed past
   the `ProtectedRoute` guard.
4. **RTL**: Sidebar remains RTL-laid-out exactly as today (no markup direction changes).
