# Tasks: EPIC-008 — Month Closure & Audit Log

**Sprint**: 2 | **Days**: 4–5 | **Spec Priority**: P7 | **User Story**: US7
**Platform**: 🟠 Admin Platform — month closure UI and audit log UI target `frontend-admin`; backend routes are shared API
**Assignees**: Dev 1 (backend) + Dev 4 (frontend)
**Depends on**: EPIC-001 (auth, MonthLock + AuditLog entities in schema, monthLock middleware), EPIC-004 (report routes to integrate audit), EPIC-005 (absence routes to integrate audit)
**Blocks**: nothing (monthLock middleware was already wired in EPIC-001; this epic adds the management UI and audit capture)

**Acceptance Criteria**:
- Admin locks month M → POST /reports for month M returns 423; POST /months/:year/:month/unlock → POST /reports succeeds again
- After admin calls PATCH /reports/:id, AuditLog row exists with correct entityType=TIME_REPORT, oldValue and newValue within 1s
- GET /audit-logs returns records with performedBy user details
- Month closure page shows all months (current + past) with lock status; Lock/Unlock buttons with Hebrew confirmation dialogs

---

## Phase 1: Month Lock API (User Story: US7)

- [ ] T001 [US7] Implement MonthLockService: lockMonth(year, month, adminUserId) — upsert MonthLock {year, month, isLocked: true, lockedBy: adminUserId, lockedAt: now(), reopenedBy: null, reopenedAt: null}; unlockMonth(year, month, adminUserId) — upsert {isLocked: false, reopenedBy: adminUserId, reopenedAt: now()}; listMonths() → MonthLock[] ordered by year desc, month desc, include lockedBy user name via join; isMonthLocked(year, month) → boolean (if no row exists return false — month is implicitly unlocked): backend/src/services/month-lock.service.ts
- [ ] T002 [US7] Implement POST /months/:year/:month/lock (requireRole ADMIN, parse year+month from params as integers, validate month 1–12, call MonthLockService.lockMonth, 200 response {year, month, isLocked: true, lockedAt}), POST /months/:year/:month/unlock (requireRole ADMIN, call unlockMonth, 200 response {year, month, isLocked: false, unlockedAt}), GET /months (requireRole ADMIN, returns all MonthLock records with lockedBy user name, sorted year desc month desc) routes; register months router in backend/src/app.ts; refactor checkMonthLock middleware in backend/src/middleware/monthLock.ts to call MonthLockService.isMonthLocked(year, month) instead of a raw Prisma query, import the service (resolves circular deps by importing from services/month-lock.service): backend/src/routes/months.ts, backend/src/middleware/monthLock.ts (refactor), backend/src/app.ts (extend)

---

## Phase 2: Audit Log (User Story: US7)

- [ ] T003 [US7] Implement AuditLogService: logChange({entityType, entityId, action, performedBy, targetUserId, oldValue, newValue}) — insert AuditLog record; records are immutable (insert only, never update/delete); listAuditLogs({employeeId?, year?, month?}) → AuditLog[] joined with performedBy user {id, fullName}, filtered by targetUserId=employeeId if provided and createdAt within year-month if provided, ordered createdAt desc: backend/src/services/audit-log.service.ts
- [ ] T004 [US7] Integrate AuditLogService into PATCH /reports/:id route: before calling ReportService.updateReport capture oldValue = current TimeReport record as JSON snapshot; after successful update capture newValue = updated record; if req.user.role === ADMIN call AuditLogService.logChange({entityType: TIME_REPORT, entityId: id, action: UPDATE, performedBy: req.user.userId, targetUserId: report.userId, oldValue, newValue}); same pattern for DELETE /reports/:id (action: DELETE, newValue: {deletedAt: now()}); integrate same audit capture in PATCH /absences/:id and DELETE /absences/:id with entityType ABSENCE_REPORT: backend/src/routes/reports.ts (extend), backend/src/routes/absences.ts (extend)
- [ ] T005 [US7] Implement GET /audit-logs?employeeId=&year=&month= (requireRole ADMIN, parse optional query params, call AuditLogService.listAuditLogs, 200 response array) route; register audit-logs router in backend/src/app.ts: backend/src/routes/audit-logs.ts, backend/src/app.ts (extend)

---

## Phase 3: Month Closure UI (User Story: US7)

- [ ] T006 [US7] Create React Query hooks: useMonths() — GET /months; useLockMonth() — POST /months/:year/:month/lock (on success invalidates useMonths); useUnlockMonth() — POST /months/:year/:month/unlock (on success invalidates useMonths); useAuditLogs({employeeId?, year?, month?}) — GET /audit-logs with query params: frontend-time_management/src/services/months.service.ts
- [ ] T007 [US7] Implement admin month closure page (Hebrew RTL, mobile-first): table showing months in format "חודש/שנה" (e.g., "05/2026") with columns: חודש, סטטוס (badge: "נעול"=red / "פתוח"=green), נעול ב, נעול על-ידי, פעולות; Lock button opens Hebrew confirmation dialog "האם לנעול את חודש 05/2026? לא ניתן לערוך דיווחים לאחר הנעילה." with "נעל" confirm and "ביטול" cancel — on confirm calls useLockMonth; Unlock button opens dialog "האם לפתוח מחדש את החודש?" — on confirm calls useUnlockMonth; page pre-populates current month and 3 previous months as rows even if no MonthLock record exists (show as "פתוח"); add "נעילת חודשים" link to AdminLayout sidebar: frontend-time_management/src/pages/admin/months/MonthClosurePage.tsx, frontend-time_management/src/components/AdminLayout.tsx (extend)

---

## Dependencies

- T001 (MonthLockService): Requires EPIC-001 T009 (MonthLock in schema) and T010 (migration run)
- T002 (routes + middleware refactor): Requires T001; middleware refactor is safe — same behavior, just delegates to service
- T003 (AuditLogService): Requires EPIC-001 T009 (AuditLog in schema); independent of T001
- T004 (audit integration): Requires T003 + EPIC-004 T003 (report routes exist) + EPIC-005 T003 (absence routes exist); these files were created in earlier epics — extend them
- T005 (audit-logs route): Requires T003
- T006 (hooks): Requires T002 + T005 (endpoints running)
- T007 (month closure UI): Requires T006

## Parallel Execution Guide

```
Dev 1 (Backend):
  T001 ‖ T003           (MonthLockService ‖ AuditLogService — different files, parallel)
  T002                  (after T001)
  T004 ‖ T005           (audit integration in routes ‖ audit-logs route — parallel after T003)

Dev 4 (Frontend):
  T006 → T007           (hooks → page — sequential, after T002 + T005 running)
```
