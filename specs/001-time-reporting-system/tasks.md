# Tasks: Time Reporting System — Epic Index

**Feature**: 001-time-reporting-system
**Generated**: 2026-05-06
**Organization**: One tasks file per epic (8 epics total)
**Sprint Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

Tasks are split by epic to enable parallel team execution. Each epic file contains phases,
acceptance criteria, and parallel execution guidance for that epic.

---

## Epic Index

| Epic | File | Sprint | Spec Priority | Assignees |
|------|------|--------|--------------|-----------|
| EPIC-001: Foundation & Authentication | [tasks-epic-001.md](tasks-epic-001.md) | Sprint 1 | P0 | Dev 1 + Dev 3 |
| EPIC-002: Admin Entity Management | [tasks-epic-002.md](tasks-epic-002.md) | Sprint 1 | P6 | Dev 2 + Dev 4 |
| EPIC-003: Task Assignment | [tasks-epic-003.md](tasks-epic-003.md) | Sprint 1 | P5 | Dev 2 + Dev 4 |
| EPIC-004: Daily Time Reporting | [tasks-epic-004.md](tasks-epic-004.md) | Sprint 1+2 | P1 | Dev 1 + Dev 3 |
| EPIC-005: Absence Reporting | [tasks-epic-005.md](tasks-epic-005.md) | Sprint 2 | P2 | Dev 2 + Dev 4 |
| EPIC-006: Monthly Calendar View | [tasks-epic-006.md](tasks-epic-006.md) | Sprint 2 | P3 | Dev 2 + Dev 4 |
| EPIC-007: Timer Feature | [tasks-epic-007.md](tasks-epic-007.md) | Sprint 2 | P4 | Dev 2 + Dev 3 |
| EPIC-008: Month Closure & Audit Log | [tasks-epic-008.md](tasks-epic-008.md) | Sprint 2 | P7 | Dev 1 + Dev 4 |

---

## Epic Dependency Chain

```
EPIC-001 (Foundation — P0)
  ├──► EPIC-002 (Admin Entities — P6)
  │       └──► EPIC-003 (Task Assignment — P5)
  │               └──► EPIC-004 (Daily Reports — P1)
  │                       ├──► EPIC-006 (Monthly Calendar — P3)
  │                       └──► EPIC-007 (Timer pre-fills report form — P4)
  ├──► EPIC-005 (Absences — P2)
  │       └──► EPIC-006 (absence data feeds COMPLETE status)
  └──► EPIC-008 (Month Closure — P7; lock middleware already wired in EPIC-001)
```

---

## Sprint 1 Execution Order (Days 1–2)

```
Day 1 Morning — all devs on EPIC-001 Phase 1–2 (monorepo setup + Prisma schema):
  Dev 1: backend scaffold → dependencies → schema → migration + seed
  Dev 3: frontend scaffold → dependencies → RTL root setup

Day 1 PM → Day 2 AM — split:
  Dev 1: EPIC-001 Phase 3 (Auth API)
  Dev 3: EPIC-001 Phase 4 (Auth UI)
  Dev 2: EPIC-002 Phase 1–2 (User + Entity APIs) — after EPIC-001 Phase 2
  Dev 4: EPIC-002 Phase 3–4 (Admin UI) — after EPIC-002 API phases

Day 2:
  Dev 2 + Dev 4: EPIC-003 (Assignment API + UI) — after EPIC-002 entity APIs
  Dev 1: EPIC-004 Phase 1–2 (Report CRUD API + Draft API) — after EPIC-001 complete
```

## Sprint 2 Execution Order (Days 3–5)

```
Day 3:
  Dev 3: EPIC-004 Phase 3–4 (Report form UI + progress bar) — after EPIC-003 done
  Dev 2: EPIC-005 Phase 1 (Absence API) + EPIC-007 Phase 1 (Timer schema)
  Dev 1: EPIC-008 Phase 1–2 (Month lock API + Audit log API)

Day 4:
  Dev 2: EPIC-005 Phase 2 (Document upload API) → EPIC-006 Phase 1 (Monthly status API)
  Dev 4: EPIC-005 Phase 3 (Absence UI) → EPIC-006 Phase 2 (Calendar UI)
  Dev 2: EPIC-007 Phase 2 (Timer API) — after schema migration
  Dev 3: EPIC-007 Phase 3 (Timer UI) — after EPIC-007 API + EPIC-004 report form

Day 5:
  Dev 4: EPIC-008 Phase 3 (Month closure UI)
  All: Integration testing, bug fixes, quickstart.md validation
```

---

## Task Count Summary

| Epic | Tasks | Backend | Frontend |
|------|-------|---------|----------|
| EPIC-001 | 20 | 11 | 9 |
| EPIC-002 | 17 | 8 | 9 |
| EPIC-003 | 4 | 2 | 2 |
| EPIC-004 | 11 | 5 | 6 |
| EPIC-005 | 9 | 6 | 3 |
| EPIC-006 | 6 | 2 | 4 |
| EPIC-007 | 6 | 3 | 3 |
| EPIC-008 | 7 | 5 | 2 |
| **Total** | **80** | **42** | **38** |

---

## MVP Scope

Complete **EPIC-001 → EPIC-002 → EPIC-003 → EPIC-004** to deliver:
> "An employee with an assigned task can log in and submit a daily work report."

Validate end-to-end before proceeding to EPIC-005–008.

---

## Implementation Strategy

### MVP First

1. EPIC-001: Foundation (day 1)
2. EPIC-002: Admin entities (day 1–2, parallel)
3. EPIC-003: Task assignment (day 2)
4. EPIC-004: Daily report API + form (days 2–3)
5. **STOP and VALIDATE**: Full employee daily-report flow, end-to-end
6. Continue Sprint 2 epics in priority order: P2 → P3 → P4 → P7

### Cross-Cutting Notes

- Tests are NOT included (not requested in spec)
- All UI uses Hebrew RTL throughout — `dir="rtl"` on HTML root, Tailwind CSS logical properties
  (`ps`, `pe`, `ms`, `me`) instead of directional (`pl`, `pr`, `ml`, `mr`)
- Month-lock middleware (EPIC-001 T015) is shared across EPIC-004, EPIC-005, and EPIC-008
- WorkCalendarDay seeding (EPIC-001 T010) is required by EPIC-006 monthly status calculation
- Run `quickstart.md` validation checklist after EPIC-004 is complete
