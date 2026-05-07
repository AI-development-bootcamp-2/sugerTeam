# Tasks: EPIC-002 — Admin Entity Management

**Sprint**: 1 | **Days**: 1–2 | **Spec Priority**: P6 | **User Story**: US6
**Assignees**: Dev 2 (backend) + Dev 4 (frontend)
**Depends on**: EPIC-001 fully complete (auth middleware, Prisma schema, DB running, Express app)
**Blocks**: EPIC-003 (needs users + tasks to assign), EPIC-004 (employees need tasks to report against)

**Acceptance Criteria**:
- Admin creates user → user logs in; deactivated user cannot log in (401)
- Admin creates client → project → task chain via API: verified with GET /clients/active, GET /projects/active, GET /tasks/active
- Inactive client absent from GET /clients/active; historical reports unaffected
- Non-admin role receives 403 on admin-only routes
- Hebrew RTL admin UI works on mobile Chrome

---

## Phase 1: User Management API (User Story: US6)

- [ ] T001 [US6] Implement UserService: createUser({fullName, email, password, role}) — hash password with bcrypt cost 12, create User record (409 ConflictError if email already exists); listUsers({role?, isActive?, search?}) — filter by role enum, status ACTIVE/INACTIVE, fullName/email icontains; updateUser(id, {fullName?, email?, role?}) — partial update; deactivateUser(id) — set status INACTIVE + deletedAt = now(); activateUser(id) — set status ACTIVE + deletedAt null; never return passwordHash in any result: backend/src/services/user.service.ts
- [ ] T002 [US6] Implement GET /users?role=&isActive=&search= (requireRole ADMIN, returns array of user objects without passwordHash), POST /users (requireRole ADMIN, Zod body: fullName required, email required email(), password required min 8, role required enum, 409 on duplicate email, 201 response), PATCH /users/:id (requireRole ADMIN, Zod body partial update, 200 response), PATCH /users/:id/deactivate (requireRole ADMIN, 200 response), PATCH /users/:id/activate (requireRole ADMIN, 200 response) routes; apply authenticateToken middleware to all: backend/src/routes/users.ts

---

## Phase 2: Client / Project / Task CRUD API (User Story: US6)

- [ ] T003 [US6] Implement ClientService: createClient({name, contactDetails?}) → Client; listActiveClients() → Client[] where status ACTIVE and deletedAt null; listAllClients() → Client[] all; updateClient(id, {name?, contactDetails?, isActive?}) — set status ACTIVE/INACTIVE and deletedAt accordingly; soft-delete sets deletedAt = now(): backend/src/services/client.service.ts
- [ ] T004 [P] [US6] Implement ProjectService: createProject({clientId, name}) — validate clientId exists (404 if not); listActiveProjects(clientId) → Project[] where status ACTIVE and client status ACTIVE; listAllProjects() → Project[] all; updateProject(id, {name?, isActive?}) — set status and deletedAt: backend/src/services/project.service.ts
- [ ] T005 [P] [US6] Implement TaskService: createTask({projectId, name}) — validate projectId exists (404 if not); listActiveTasks(projectId) → Task[] where status OPEN; listAllTasks() → Task[] all; updateTask(id, {name?, isActive?}) — map isActive false → status CLOSED + closedAt = now(), true → status OPEN + closedAt null: backend/src/services/task.service.ts
- [ ] T006 [US6] Implement GET /clients/active (authenticateToken only, returns [{id, name}]), GET /clients (requireRole ADMIN), POST /clients (requireRole ADMIN, Zod body: name required, contactDetails optional, 201 response), PATCH /clients/:id (requireRole ADMIN, Zod body partial, 200 response) routes: backend/src/routes/clients.ts
- [ ] T007 [P] [US6] Implement GET /projects/active?clientId= (authenticateToken, 400 if clientId missing, returns [{id, name, clientId}]), POST /projects (requireRole ADMIN, Zod body: clientId required uuid, name required, 201 response), PATCH /projects/:id (requireRole ADMIN, 200 response) routes: backend/src/routes/projects.ts
- [ ] T008 [P] [US6] Implement GET /tasks/active?projectId= (requireRole ADMIN|TEAM_LEAD, 400 if projectId missing, returns [{id, name, projectId}]), POST /tasks (requireRole ADMIN, Zod body: projectId required uuid, name required, 201 response), PATCH /tasks/:id (requireRole ADMIN, 200 response) routes; register all new route files in backend/src/app.ts: backend/src/routes/tasks.ts, backend/src/app.ts (extend)

---

## Phase 3: Admin Users UI (User Story: US6)

- [ ] T009 [US6] Create React Query hooks for user management using API client: useUsers(filters: {role?, isActive?, search?}) — GET /users; useCreateUser — POST /users (invalidates useUsers on success); useUpdateUser — PATCH /users/:id (invalidates useUsers); useDeactivateUser — PATCH /users/:id/deactivate; useActivateUser — PATCH /users/:id/activate: frontend/src/services/users.service.ts
- [ ] T010 [US6] Implement admin users list page (Hebrew RTL, mobile-first): search input calling useUsers({search}), role filter tab pills (כולם/עובד/ראש צוות/מנהל), data table with columns (שם מלא, דוא״ל, תפקיד, סטטוס, פעולות); deactivate button per active-user row with confirmation dialog ("האם להשבית משתמש זה?"); activate button per inactive-user row; "+ משתמש חדש" button opens CreateUserModal: frontend/src/pages/admin/users/UsersListPage.tsx
- [ ] T011 [US6] Implement create user modal/dialog: React Hook Form + Zod (fullName required, email required + .email(), password required min 8, role required — select with Hebrew labels); on submit calls useCreateUser, shows Hebrew success toast ("משתמש נוצר בהצלחה"), closes modal and invalidates list; shows 409 error inline ("כתובת דוא״ל כבר קיימת"): frontend/src/pages/admin/users/CreateUserModal.tsx
- [ ] T012 [US6] Implement edit user sheet (slide-over panel): pre-populated form with current fullName, email, role (password field omitted); on submit calls useUpdateUser; inline Hebrew error feedback; separate confirm-dialog for deactivate/activate actions: frontend/src/pages/admin/users/EditUserModal.tsx

---

## Phase 4: Admin Clients / Projects / Tasks UI (User Story: US6)

- [ ] T013 [US6] Create React Query hooks for entity management: useAllClients, useCreateClient, useUpdateClient; useActiveProjects(clientId), useCreateProject, useUpdateProject; useActiveTasks(projectId), useCreateTask, useUpdateTask: frontend/src/services/entities.service.ts
- [ ] T014 [US6] Implement admin clients page (Hebrew RTL): accordion list of all clients; each row shows client name, status badge, edit button (opens inline edit form), deactivate/activate button; at top: "+ לקוח חדש" form (name field, submit); cascade visual hint: deactivating client shows warning "השבתה תסיר לקוח מהרשימות הפעילות. דיווחים קיימים לא ייפגעו.": frontend/src/pages/admin/clients/ClientsPage.tsx
- [ ] T015 [US6] Implement projects subsection within each expanded client accordion row: list of projects with status, edit, deactivate/activate; "+ פרויקט חדש" inline form (name field); projects fetch uses useActiveProjects(clientId) for display: frontend/src/pages/admin/clients/ProjectsSection.tsx
- [ ] T016 [US6] Implement tasks subsection within each expanded project row: list of tasks with OPEN/CLOSED status, edit, close/reopen; "+ משימה חדשה" inline form (name field): frontend/src/pages/admin/clients/TasksSection.tsx
- [ ] T017 [US6] Implement RTL-aware admin layout: left sidebar in RTL (so visually on the right) with navigation links to Users, Clients/Projects/Tasks, Assignments, Month Closure; hamburger collapse on mobile; route protection wraps all /admin/* routes requiring ADMIN role (403 page for unauthorized); register admin layout and all admin pages in React Router: frontend/src/components/AdminLayout.tsx, frontend/src/router.tsx (extend with /admin/users, /admin/clients, /admin/assignments, /admin/months)

---

## Dependencies

- T001 ‖ T003: UserService and ClientService have no dependency on each other — write in parallel
- T002: Requires T001; T006: Requires T003; T007: Requires T004; T008: Requires T005
- T004 ‖ T005 ‖ T007 ‖ T008: All different service/route files — write in parallel
- T009: Requires T002 (user endpoints running); T013: Requires T006+T007+T008
- T010 ‖ T011 ‖ T012 ‖ T014 ‖ T015 ‖ T016: Different component files — write in parallel after hooks
- T017: Requires T010, T014, T015, T016 to be created (pages must exist before wiring router)

## Parallel Execution Guide

```
Backend (Dev 2):
  T001 ‖ T003 ‖ T004 ‖ T005  (all service files — parallel)
  T002 ‖ T006 ‖ T007 ‖ T008  (all route files — parallel, after their respective services)

Frontend (Dev 4):
  T009 ‖ T013                 (hook files — parallel, after backend endpoints)
  T010 ‖ T011 ‖ T012          (user UI components — parallel)
  T014 → T015 → T016          (accordion nesting: client → projects → tasks)
  T017                        (admin layout — after all pages exist)
```
