# Tasks: EPIC-007 — Timer Feature

**Sprint**: 2 | **Days**: 3–4 | **Spec Priority**: P4 | **User Story**: US4
**Platform**: 🟢 Time Management Platform — all frontend work targets `frontend/`; backend routes are shared API
**Assignees**: Dev 2 (backend) + Dev 3 (frontend)
**Depends on**: EPIC-001 (auth), EPIC-004 Phase 3 (DailyReportPage must accept pre-fill state)
**Blocks**: nothing

**Acceptance Criteria**:
- Employee clicks Start → startedAt stored server-side; close browser → reopen → GET /timer/status returns isActive true with original startedAt
- Second POST /timer/start while timer active → 409
- POST /timer/stop → returns {date, startTime, endTime, durationMinutes} pre-fill data; timer row deleted
- TimerWidget header bar visible on all authenticated pages; elapsed time counts up in real time
- Clicking End navigates to /reports with startTime + endTime + date pre-filled in form

---

## Phase 1: Timer Schema Addition

- [ ] T001 Extend Prisma schema with ActiveTimer model: { id String @id @default(uuid()), userId String @unique, user User @relation(...), startedAt DateTime @default(now()) }; run `pnpm prisma migrate dev --name add_active_timer` to generate and apply migration; update backend/prisma/schema.prisma to add the model and the relation on User: backend/prisma/schema.prisma (extend), backend/prisma/migrations/add_active_timer/

---

## Phase 2: Timer API (User Story: US4)

- [ ] T002 [US4] Implement TimerService: startTimer(userId) — check if ActiveTimer row exists for userId (409 ConflictError "כבר קיים טיימר פעיל" if found); insert ActiveTimer {userId, startedAt: now()}; return {startedAt}; stopTimer(userId) — find ActiveTimer for userId (404 "אין טיימר פעיל" if not found); compute endTime = now(); compute durationMinutes; delete ActiveTimer row; return {date: startedAt.toISOString().slice(0,10), startTime: HH:MM from startedAt, endTime: HH:MM from now, durationMinutes}; getTimerStatus(userId) — if ActiveTimer row found return {isActive: true, startedAt, elapsedSeconds: Math.floor((now - startedAt) / 1000)}; else return {isActive: false}: backend/src/services/timer.service.ts
- [ ] T003 [US4] Implement POST /timer/start (authenticateToken any role, 409 on duplicate, 201 response {startedAt}), POST /timer/stop (authenticateToken, 404 if no active timer, 200 response with pre-fill data), GET /timer/status (authenticateToken, 200 response {isActive, startedAt?, elapsedSeconds?}) routes; register timer router in backend/src/app.ts: backend/src/routes/timer.ts, backend/src/app.ts (extend)

---

## Phase 3: Timer UI (User Story: US4)

- [ ] T004 [US4] Create React Query hooks for timer: useTimerStatus() — GET /timer/status (refetchInterval 30000 when isActive, disabled otherwise); useStartTimer() — POST /timer/start (on success invalidates useTimerStatus); useStopTimer() — POST /timer/stop (on success returns pre-fill data, invalidates useTimerStatus): frontend/src/services/timer.service.ts
- [ ] T005 [US4] Implement Zustand timer store: state { isActive: boolean, startedAt: string | null }; actions setTimerState(isActive, startedAt), clearTimer(); initialize from useTimerStatus response on app mount via a bootstrap hook in main.tsx; timer store drives the client-side elapsed counter without polling every second: frontend/src/store/timerStore.ts
- [ ] T006 [US4] Implement TimerWidget component rendered inside the main authenticated app layout header (AppLayout.tsx): when timer isActive shows red pulsing dot + elapsed time display counting up as HH:MM:SS using setInterval from startedAt (updates every second using timerStore.startedAt); shows "סיים יום" (End) button that calls useStopTimer, receives pre-fill {date, startTime, endTime}, navigates to /reports using React Router navigate with state {prefill: {date, startTime, endTime, durationMinutes}} clearing the timer store on success; when timer inactive shows "התחל יום" (Start) button that calls useStartTimer and updates timer store; add TimerWidget to AppLayout header so it is visible on all authenticated pages; update DailyReportPage to read location.state.prefill on mount and pre-populate date, startTime, endTime fields if present: frontend/src/pages/timer/TimerWidget.tsx, frontend/src/components/AppLayout.tsx, frontend/src/pages/reports/DailyReportPage.tsx (extend to read route state prefill)

---

## Dependencies

- T001 (schema extension): Start immediately — independent; migration must run before T002
- T002 (TimerService): Requires T001 (ActiveTimer table migrated)
- T003 (routes): Requires T002
- T004 (hooks): Requires T003 (endpoints running)
- T005 (Zustand store): Can be written in parallel with T004 (no endpoint dependency)
- T006 (TimerWidget UI): Requires T004 + T005; also requires EPIC-004 T007 (DailyReportPage) to exist for pre-fill integration

## Parallel Execution Guide

```
Dev 2 (Backend):
  T001 → T002 → T003   (sequential: schema → service → routes)

Dev 3 (Frontend):
  T004 ‖ T005           (hooks ‖ Zustand store — parallel, after T003 running)
  T006                  (TimerWidget — after T004 + T005 + EPIC-004 DailyReportPage exists)
```
