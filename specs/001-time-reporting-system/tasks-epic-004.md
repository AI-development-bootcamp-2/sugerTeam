# Tasks: EPIC-004 — Daily Time Reporting

**Sprint**: 1 (API: Phase 1–2) + Sprint 2 (UI: Phase 3–4)
**Spec Priority**: P1 (MVP core) | **User Story**: US1
**Platform**: 🟢 Time Management Platform — all frontend work targets `frontend-time_management/`; backend routes are shared API
**Assignees**: Dev 1 (backend) + Dev 3 (frontend)
**Depends on**: EPIC-001 (auth + monthLock middleware), EPIC-003 (employee needs assigned tasks)
**Blocks**: EPIC-006 (monthly calendar reads TimeReport data), EPIC-007 (timer End pre-populates this form)

**Acceptance Criteria**:
- Employee submits report → 201 with correct durationMinutes; success confirmation shown in UI
- Overlap with existing report → 422 error shown inline
- End time < start time → 422; report crossing midnight → 422
- Locked month → 423 Hebrew banner shown in UI
- Draft survives page refresh; final submit clears draft
- Cascading dropdown shows only ACTIVE + assigned tasks; auto-selects when exactly one exists
- Progress bar shows (totalMinutes / 540 × 100)%; Hebrew warning for below/above 9h

---

## Phase 1: Time Report CRUD API (User Story: US1) — Sprint 1

- [ ] T001 [US1] Implement ReportService.createReport(userId, data): validate endTime > startTime (422 "שעת סיום חייבת להיות אחרי שעת ההתחלה"); validate no midnight crossing — startTime and endTime must represent times on the same calendar day (422 "דיווח לא יכול לחצות חצות"); validate overlap — SELECT existing TimeReports where userId = userId AND reportDate = date AND status ≠ DRAFT AND deletedAt IS NULL AND (startTime < data.endTime AND endTime > data.startTime), reject if any found (422 "קיים חפיפה עם דיווח קיים"); validate task is actively assigned to user via TaskAssignment join (422 "המשימה אינה מוקצית לך"); calculate durationMinutes = endTime minutes − startTime minutes; resolve clientId + projectId from taskId via Task → Project relation; check month lock via MonthLock table for date's year-month (423 if locked and not ADMIN); save TimeReport with status SUBMITTED: backend/src/services/report.service.ts
- [ ] T002 [US1] Implement ReportService.getReports(userId, date) → TimeReport[] where userId + reportDate + deletedAt null; getReport(id, actorUserId) → TimeReport or 404; updateReport(id, data, actorUserId) — 403 if actorUserId !== report.userId and actor is not ADMIN, then same validations as createReport and update fields; deleteReport(id, actorUserId) — 403 if not owner and not ADMIN, check month lock (423), set deletedAt = now(): backend/src/services/report.service.ts (extend)
- [ ] T003 [US1] Implement POST /reports (authenticateToken, Zod body: {date: string date format, workLocation: WorkLocation enum, startTime: HH:MM, endTime: HH:MM, taskId: uuid, description: string max 500, isDraft?: boolean false}), GET /reports?userId=&date= (authenticateToken; employee can only query own userId, admin can query any), GET /reports/:id (authenticateToken), PATCH /reports/:id (authenticateToken), DELETE /reports/:id (authenticateToken); apply checkMonthLock middleware to POST, PATCH, DELETE: backend/src/routes/reports.ts

---

## Phase 2: Draft Save API (User Story: US1) — Sprint 1

- [ ] T004 [US1] Implement ReportService.upsertDraft(userId, date, data): upsert TimeReport with status = DRAFT for (userId, reportDate) — one draft allowed per user per date; if a SUBMITTED report exists for same slot the draft saves alongside it; extend createReport to delete any DRAFT for same userId + reportDate before inserting the new SUBMITTED record: backend/src/services/report.service.ts (extend)
- [ ] T005 [US1] Implement PUT /reports/draft (authenticateToken, Zod body same as POST /reports except isDraft ignored, always draft); calls upsertDraft; returns 200 with draft record if updated, 201 if newly created: backend/src/routes/reports.ts (extend)

**Checkpoint (Sprint 1)**: POST /reports with valid data → 201 + correct durationMinutes; overlap → 422; midnight crossing → 422; locked month → 423; PUT /reports/draft → persists; GET /reports?userId=&date= returns reports

---

## Phase 3: Daily Report Form UI (User Story: US1) — Sprint 2

- [ ] T006 [US1] Create React Query hooks for reports: useMyAssignedTasks (GET /tasks/my-assigned), useDailyReports(userId, date) (GET /reports?userId=&date=), useCreateReport (POST /reports, invalidates useDailyReports + useMonthlyStatus), useUpdateReport (PATCH /reports/:id, invalidates), useDeleteReport (DELETE /reports/:id, invalidates), useUpsertDraft (PUT /reports/draft, debounced): frontend-time_management/src/services/reports.service.ts
- [ ] T007 [US1] Implement daily report page layout (Hebrew RTL, mobile-first): Hebrew page title "דיווח יומי"; date picker defaulting to today (input type=date with Hebrew label "תאריך"); work location radio group with Hebrew labels (משרד/לקוח/בית); start time input (HH:MM) and end time input (HH:MM) with Hebrew labels; live duration display — compute and show "משך: Xש' Yד'" updating on every time input change (zero/negative shows "--"); TaskSelector component slot; description textarea slot; action buttons: "שמור" (submit) and "נקה" (clear): frontend-time_management/src/pages/reports/DailyReportPage.tsx, frontend-time_management/src/pages/reports/components/TimeInputs.tsx
- [ ] T008 [US1] Implement cascading TaskSelector component: fetch useMyAssignedTasks on mount; group tasks by client → project → task; render three dependent selects (client select → filters projects → filters tasks) all in Hebrew; if exactly one unique client, project, and task available auto-select all three fields; on task select propagate taskId value to parent form via React Hook Form Controller: frontend-time_management/src/pages/reports/components/TaskSelector.tsx
- [ ] T009 [US1] Implement ReportForm with React Hook Form + Zod schema (date required, workLocation required, startTime required HH:MM pattern, endTime required HH:MM pattern, taskId required uuid, description required max 500 chars); wire Submit button to call useCreateReport; on 201: show Hebrew success toast "הדיווח נשמר בהצלחה", reset form; on 422 overlap: show Hebrew inline error below time inputs "קיימת חפיפה עם דיווח קיים"; on 422 endTime: show "שעת סיום חייבת להיות אחרי שעת ההתחלה"; on 423: show red Hebrew banner at top "החודש נעול — לא ניתן לשמור דיווחים"; char counter below description: frontend-time_management/src/pages/reports/components/ReportForm.tsx
- [ ] T010 [US1] Implement auto-save draft: on every form field change (1000ms debounce) call useUpsertDraft with current form values if at least date + taskId are filled; on page mount call useDailyReports to check for existing DRAFT status record and pre-populate form fields if found; clear draft state after successful submit: frontend-time_management/src/pages/reports/DailyReportPage.tsx (extend)

---

## Phase 4: Hours Progress Bar (User Story: US1) — Sprint 2

- [ ] T011 [US1] Implement DailyProgressBar component: receive dailyReports (TimeReport[]) as prop; sum durationMinutes of all SUBMITTED reports; compute percentage = sum / 540 * 100 clamped to 0–100; render colored progress bar (green < 100%, full at 100%); below bar show total hours text "X שעות Y דקות"; if sum < 540 show yellow Hebrew warning "שעות עבודה חסרות" (non-blocking); if sum > 540 show blue Hebrew notice "חרגת מהנורמה היומית"; integrate into DailyReportPage above the report form: frontend-time_management/src/pages/reports/components/DailyProgressBar.tsx

**Checkpoint (Sprint 2)**: Employee opens /reports → Hebrew RTL form with date=today, TaskSelector auto-selects if one task; fills form → live duration updates; submits → success toast; daily total and progress bar update; overlap error shows inline; draft persists across page reload; locked month shows banner

---

## Dependencies

- T001 → T002 → T003: Sequential within service then routes; T001 requires EPIC-003 T001 (assignment validation)
- T004 → T005: Extends T001 and T003 respectively
- T006: Requires T003 + T005 (endpoints running) and EPIC-003 T002 (my-assigned endpoint)
- T007 ‖ T008: Different component files — write in parallel after T006
- T009: Requires T007 + T008 (slots must exist in DailyReportPage)
- T010: Extends T007 (DailyReportPage); requires T006 (draft hook)
- T011: Requires T006 (daily reports hook); standalone component — can be written alongside T009

## Parallel Execution Guide

```
Sprint 1 (Dev 1 Backend):
  T001 → T002 → T003  (sequential: create → read/update/delete → routes)
  T004 → T005         (sequential: extend service → extend route)

Sprint 2 (Dev 3 Frontend):
  T006                (hooks — after endpoints running)
  → T007 ‖ T008       (DailyReportPage layout ‖ TaskSelector — parallel)
  → T009              (ReportForm — after T007 + T008)
  → T010              (draft auto-save — extends T007)
  T011                (DailyProgressBar — can run in parallel with T009)
```
