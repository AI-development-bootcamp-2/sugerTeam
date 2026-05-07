# Tasks: EPIC-003 — Task Assignment

**Sprint**: 1 | **Days**: 2 | **Spec Priority**: P5 | **User Story**: US5
**Assignees**: Dev 2 (backend) + Dev 4 (frontend)
**Depends on**: EPIC-001 (auth middleware), EPIC-002 (users, tasks, and clients/projects must exist in DB)
**Blocks**: EPIC-004 (employees need assigned tasks before they can submit reports)

**Acceptance Criteria**:
- Team lead assigns Employee A to Task T; GET /tasks/my-assigned for A now returns Task T with parent project + client
- Team lead removes assignment; GET /tasks/my-assigned for A no longer returns Task T
- Historical TimeReports referencing Task T are unaffected by unassignment
- Only TEAM_LEAD and ADMIN roles can POST/DELETE /assignments; attempting with EMPLOYEE role → 403
- Assignment UI shows current assignees per task and allows add/remove

---

## Phase 1: Assignment API (User Story: US5)

- [ ] T001 [US5] Implement AssignmentService: assignTask({taskId, userId, assignedByUserId}) — validate taskId exists (404 if not), validate userId exists (404 if not), insert TaskAssignment (409 ConflictError if UNIQUE (taskId, userId) already exists); unassignTask(assignmentId) — delete TaskAssignment by id (404 if not found); listAssignmentsByTask(taskId) → TaskAssignment[] joined with User (id, fullName, email); getMyAssignedTasks(userId) → Task[] where TaskAssignment.userId = userId AND Task.status = OPEN AND Project.status = ACTIVE AND Client.status = ACTIVE, including nested { task: { id, name, project: { id, name, client: { id, name } } } }: backend/src/services/assignment.service.ts
- [ ] T002 [US5] Implement POST /assignments (requireRole ADMIN|TEAM_LEAD, Zod body: {userId: uuid, taskId: uuid}, calls AssignmentService.assignTask, 201 response with assignment record, 409 on duplicate), DELETE /assignments/:id (requireRole ADMIN|TEAM_LEAD, calls unassignTask, 204 response, 404 if not found), GET /assignments?taskId= (requireRole ADMIN|TEAM_LEAD, returns assignees list), GET /tasks/my-assigned (authenticateToken any role, calls getMyAssignedTasks(req.user.userId), returns nested task array) routes; register assignments router in backend/src/app.ts; mount GET /tasks/my-assigned on the tasks router: backend/src/routes/assignments.ts, backend/src/routes/tasks.ts (extend with /my-assigned), backend/src/app.ts (extend)

---

## Phase 2: Assignment UI (User Story: US5)

- [ ] T003 [US5] Create React Query hooks for assignments: useAssignmentsByTask(taskId) — GET /assignments?taskId= (enabled when taskId defined); useMyAssignedTasks() — GET /tasks/my-assigned; useCreateAssignment() — POST /assignments (invalidates useAssignmentsByTask on success); useDeleteAssignment() — DELETE /assignments/:id (invalidates useAssignmentsByTask on success): frontend/src/services/assignments.service.ts
- [ ] T004 [US5] Implement team lead assignments page (Hebrew RTL, mobile-first): three-step cascading selector — client select (useActiveClients from entities.service), project select (useActiveProjects filtered by client), task select (useActiveTasks filtered by project); once task selected, show current assignees list (useAssignmentsByTask) with each assignee's fullName + email and an "הסר" (remove) button per row that calls useDeleteAssignment with Hebrew confirmation "האם להסיר את ההקצאה?"; employee search input (GET /users?search=&isActive=true) with add-assignment "הוסף" button that calls useCreateAssignment and shows Hebrew 409 error "העובד כבר מוקצה למשימה"; integrate page into admin layout sidebar under "הקצאות": frontend/src/pages/admin/assignments/AssignmentsPage.tsx

---

## Dependencies

- T001 (AssignmentService): Requires EPIC-001 T011 (Prisma client) and EPIC-002 entities in DB
- T002 (Assignment routes): Requires T001; also extend tasks router from EPIC-002 T008
- T003 (React Query hooks): Can be scaffolded in parallel with T002; requires endpoints running to test
- T004 (Assignments UI): Requires T002 (API endpoints) and T003 (hooks); also uses entity hooks from EPIC-002 T013

## Parallel Execution Guide

```
Dev 2 (Backend):
  T001 → T002  (sequential: service then routes)

Dev 4 (Frontend):
  T003          (scaffold hooks while T002 is finishing)
  T004          (after T002 endpoints running + T003 hooks)
```
