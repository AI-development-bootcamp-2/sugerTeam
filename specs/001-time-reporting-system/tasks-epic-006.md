# Tasks: EPIC-006 — Monthly Calendar View

**Sprint**: 2 | **Days**: 4–5 | **Spec Priority**: P3 | **User Story**: US3
**Assignees**: Dev 2 (backend) + Dev 4 (frontend)
**Depends on**: EPIC-001 (auth, WorkCalendarDay seeded), EPIC-004 (TimeReports in DB), EPIC-005 (AbsenceReports in DB for COMPLETE status)
**Blocks**: nothing

**Acceptance Criteria**:
- GET /reports/monthly-status returns correct per-day status for all day types
- NON_WORKING for Fri/Sat and WorkCalendarDay holidays; COMPLETE when totalMinutes ≥ standardHours×60 or valid absence; EXCEPTIONAL when working day with 0 < total < standard; MISSING for past working days with no data
- Calendar shows color-coded grid in Hebrew RTL; open-month report → editable form; locked-month report → read-only modal with "חודש נעול" badge
- Month navigation (← →) works and re-fetches data

---

## Phase 1: Monthly Status API (User Story: US3)

- [ ] T001 [US3] Implement MonthlyStatusService.getMonthlyStatus(userId, year, month): enumerate all calendar days for the given year-month; for each date: (1) check WorkCalendarDay.isWorkingDay — if false mark NON_WORKING and continue; (2) sum TimeReport.durationMinutes for (userId, reportDate=date, status=SUBMITTED, deletedAt null); (3) fetch AbsenceReport that covers date (startDate ≤ date ≤ endDate and status=SUBMITTED or DOCUMENT_PENDING — absence is still valid); (4) determine standardHours: read WorkCalendarDay.standardHours for date (default 9.0 if no row); (5) if date has a covering absence record mark COMPLETE; else if totalMinutes ≥ standardHours×60 mark COMPLETE; else if totalMinutes > 0 mark EXCEPTIONAL; else if date < today() mark MISSING; else mark MISSING only if date is in the past; also query MonthLock for {year, month} and include isLocked boolean; return { year, month, isLocked, days: [{date, status, totalMinutes, isWorkingDay, standardHours}] }: backend/src/services/monthly-status.service.ts
- [ ] T002 [US3] Implement GET /reports/monthly-status?userId=&year=&month= (authenticateToken; validate userId param — employee can only query own userId enforced by checking req.user.userId === userId or role is ADMIN/TEAM_LEAD; validate year is 4-digit integer, month is 1–12; call MonthlyStatusService.getMonthlyStatus; return 200 with full response shape from contracts/api.md): backend/src/routes/reports.ts (extend, mount before /:id to avoid route conflict)

---

## Phase 2: Monthly Calendar UI (User Story: US3)

- [ ] T003 [US3] Extend reports React Query hooks file: useMonthlyStatus(userId, year, month) — GET /reports/monthly-status?userId=&year=&month=; useMonthlyReports(userId, year, month) — GET /reports?userId=&year=&month= (not yet in API — use multiple GET /reports?userId=&date= calls or add a month-scoped GET; for v1 use GET /absences + GET /reports mapped over days from useMonthlyStatus response to avoid extra endpoint): frontend/src/services/reports.service.ts (extend)
- [ ] T004 [US3] Implement monthly calendar page (Hebrew RTL, mobile-first): header row with Hebrew month name + year (e.g., "מאי 2026"), right arrow ← (next in RTL direction) and left arrow → (previous) for month navigation; day-of-week header row with Hebrew abbreviations (א ב ג ד ה ו ש); day grid — 7 columns, weeks as rows; each day cell shows: date number + status chip (COMPLETE=ירוק, MISSING=אדום, EXCEPTIONAL=צהוב, NON_WORKING=אפור); locked-month banner at page top when isLocked=true: "החודש נעול — לא ניתן לבצע שינויים"; data from useMonthlyStatus: frontend/src/pages/reports/MonthlyCalendarPage.tsx
- [ ] T005 [US3] Implement monthly report list below the calendar grid: for each SUBMITTED TimeReport in the selected month render a card showing Hebrew date (e.g., "יום ראשון, 6 במאי"), task name, duration ("X שעות Y דקות"), work location (Hebrew label); cards sorted by date ascending; if month is open (isLocked=false) clicking a card navigates to DailyReportPage with ?date=YYYY-MM-DD (pre-selects the date); if month is locked clicking a card opens ReadOnlyReportModal: frontend/src/pages/reports/components/MonthlyReportList.tsx
- [ ] T006 [US3] Implement read-only report detail modal: displays all TimeReport fields in Hebrew (תאריך, מיקום עבודה, שעת התחלה, שעת סיום, משך, לקוח, פרויקט, משימה, תיאור); shows red "חודש נעול" badge at top; close button only (no edit/delete); opens over MonthlyCalendarPage as a portal/dialog: frontend/src/pages/reports/components/ReadOnlyReportModal.tsx

---

## Dependencies

- T001 (MonthlyStatusService): Requires WorkCalendarDay seeded (EPIC-001 T010); reads TimeReport (EPIC-004) and AbsenceReport (EPIC-005) — those entities must exist in schema (already done in EPIC-001 T009)
- T002 (route): Requires T001; must be mounted before `/:id` route in reports router to avoid Express parsing "monthly-status" as an id
- T003 (hooks): Requires T002 (endpoint running)
- T004 (calendar page): Requires T003
- T005 (report list): Requires T003; requires EPIC-004 DailyReportPage to accept ?date= query param
- T006 (read-only modal): Requires T005 (list component that opens it)

## Parallel Execution Guide

```
Dev 2 (Backend):
  T001 → T002   (sequential)

Dev 4 (Frontend):
  T003          (hooks — after T002 running)
  → T004 ‖ T005 (calendar page ‖ report list — parallel, different files)
  → T006        (read-only modal — after T005)
```
