# Implementation Tasks — Calendar / Time Report Page

**Feature**: Monthly Day-List View (Employee Home Page)
**Spec**: [calendar-feature-spec.md](./calendar-feature-spec.md)
**Developer**: Solo
**Created**: 2026-05-11

---

## Recommended Execution Order

The phases below are logical groupings, not strict development order. For a solo developer, work in this sequence to maximise flow and minimise blocking:

```
T001 (types) — no dependencies; everything else builds on this
  ↓
T024–T027 (Phase 6: status logic) — pure functions, no UI; test-first friendly
  ↓
T002–T007 (Phase 1: API service + hooks) — data layer before any UI
  ↓
T008–T010 (Phase 2: state management) — trivial; fold into page work as you go
  ↓
T011–T016 (Phase 3: page structure) — outer shell with real data flowing through it
  ↓
T017–T020 (Phase 4: day cards) — the primary UI unit
  ↓
T021–T023 (Phase 5: entries rendering) — the card body
  ↓
T028–T030 (Phase 7: locked state) — edge case on top of working UI
  ↓
T031–T034 (Phase 8: error & loading) — polish pass
  ↓
T035–T038 (Phase 9: testing) — cover the pure logic and key interactions
  ↓
T039–T041 (Phase 10: extension hooks) — prepare seams for the next feature
```

**Complexity key**: S = under 2 hours · M = 2–4 hours · L = 4–8 hours

---

## Phase 1 — API Integration

> Goal: a thin, typed service layer and React Query hooks for every data source the page needs. No UI work in this phase.

---

### T001 — Define TypeScript types for the time report feature

**Complexity**: S
**Depends on**: —

Create `frontend/src/types/time-report.ts`. Define all types consumed by this feature:

- `DayStatus`: `'open' | 'filled' | 'missing' | 'weekend' | 'holiday' | 'vacation'`
- `DayEntry`: derived day object — not stored, computed client-side per day:
  ```
  date: string (YYYY-MM-DD)
  dayOfWeek: number (0=Sunday)
  isWorkingDay: boolean
  dayType: 'REGULAR' | 'WEEKEND' | 'HOLIDAY' | 'SPECIAL'
  standardMinutes: number
  reportedMinutes: number
  entries: TimeReportEntryDto[]
  hasAbsence: boolean
  absenceType: AbsenceType | null
  isToday: boolean
  isFuture: boolean
  status: DayStatus
  ```
- `MonthlySummary`: `{ reportedMinutes, standardMinutes, completionPct, daysMissing, absenceMinutes, projectBreakdown: ProjectRow[] }`
- `ProjectRow`: `{ name: string; minutes: number }`
- API response DTOs: `DailyReportDto`, `TimeReportEntryDto`, `WorkCalendarDayDto`, `MonthLockDto`, `AbsenceDto`

Do not import from backend types — define independently in the frontend.

`frontend/src/types/time-report.ts`

---

### T002 — Implement service functions (axios calls)

**Complexity**: S
**Depends on**: T001

Create `frontend/src/services/time-report.service.ts`. One named export per endpoint:

- `getDailyReports(userId: string, year: number, month: number): Promise<DailyReportDto[]>` → `GET /api/v1/daily-reports?userId=&year=&month=`
- `getWorkCalendar(year: number, month: number): Promise<WorkCalendarDayDto[]>` → `GET /api/v1/work-calendar?year=&month=`
- `getMonthLock(year: number, month: number): Promise<MonthLockDto>` → `GET /api/v1/month-locks?year=&month=`
- `getAbsences(userId: string, year: number, month: number): Promise<AbsenceDto[]>` → `GET /api/v1/absences?userId=&year=&month=`

Use the existing axios instance (do not create a new one). Each function should let the axios error bubble — hooks will handle it. Add a JSDoc comment on `getAbsences` noting it is used for `vacation` status derivation and degrades gracefully if the endpoint is unavailable.

`frontend/src/services/time-report.service.ts`

---

### T003 — React Query hook: daily reports

**Complexity**: S
**Depends on**: T002

`useDailyReports(userId: string, year: number, month: number)`

- Query key: `['daily-reports', userId, year, month]`
- Calls `getDailyReports`; returns `UseQueryResult<DailyReportDto[]>`
- `staleTime`: 30 seconds (month views change infrequently within a session)

`frontend/src/pages/time-report/hooks/useDailyReports.ts`

---

### T004 — React Query hook: work calendar

**Complexity**: S
**Depends on**: T002

`useWorkCalendar(year: number, month: number)`

- Query key: `['work-calendar', year, month]`
- Calls `getWorkCalendar`
- `staleTime`: 5 minutes (calendar days change rarely — mostly static data)

`frontend/src/pages/time-report/hooks/useWorkCalendar.ts`

---

### T005 — React Query hook: month lock

**Complexity**: S
**Depends on**: T002

`useMonthLock(year: number, month: number)`

- Query key: `['month-lock', year, month]`
- Calls `getMonthLock`
- Returns `{ isLocked: boolean }` — default to `false` if no record exists (API may return 404; treat as unlocked)

`frontend/src/pages/time-report/hooks/useMonthLock.ts`

---

### T006 — React Query hook: absences (degradable)

**Complexity**: S
**Depends on**: T002

`useAbsences(userId: string, year: number, month: number)`

- Query key: `['absences', userId, year, month]`
- Calls `getAbsences`
- Mark `retry: false` — a failure is non-fatal; the composite hook will degrade gracefully rather than retrying indefinitely
- Expose `hasError` alongside the standard query fields

`frontend/src/pages/time-report/hooks/useAbsences.ts`

---

### T007 — Composite data hook: useTimeReportData

**Complexity**: M
**Depends on**: T003, T004, T005, T006, T027 (DayEntry derivation — implement T027 first or stub it)

`useTimeReportData(userId: string, year: number, month: number)`

Runs all four queries in parallel. Derives and returns:

```
{
  dayEntries: DayEntry[]        // derived and sorted descending
  monthlySummary: MonthlySummary
  isLocked: boolean
  isLoading: boolean            // true while ANY required query is in flight
  isError: boolean              // true if daily-reports, work-calendar, OR month-lock failed
  hasAbsenceError: boolean      // true if only the absence query failed (non-fatal)
  refetch: () => void           // re-triggers all four queries
}
```

Required queries: daily-reports, work-calendar, month-lock. If any of these fail, `isError = true`.
Optional query: absences. If it fails, `hasAbsenceError = true` and all days default `hasAbsence = false`.

`frontend/src/pages/time-report/hooks/useTimeReportData.ts`

---

## Phase 2 — State Management

> Goal: identify and place all UI state. Keep it simple — no Zustand needed for v1; local state in the right component is sufficient.

---

### T008 — Month navigation state

**Complexity**: S
**Depends on**: —

In `TimeReportPage`: two pieces of state — `selectedYear: number` and `selectedMonth: number` (1–12). Initialise to the current calendar month from `new Date()`.

Expose two handlers: `handlePrevMonth()` and `handleNextMonth()`. Handle the December → January year rollover (and reverse). These handlers are passed to `MonthPager`.

No Zustand — this state does not need to survive navigation or be shared across pages.

`frontend/src/pages/time-report/TimeReportPage.tsx`

---

### T009 — Expanded card state

**Complexity**: S
**Depends on**: —

In `DayList`: a single piece of state — `expandedDate: string | null`. Initialise to the current date (today's card opens by default if it exists in the list).

`toggleExpanded(date: string)`: if the given date is already expanded, collapse it (set to `null`); otherwise expand it and collapse any previously open card.

This enforces the single-expand constraint at the list level, keeping `DayCard` itself stateless.

`frontend/src/pages/time-report/components/DayList.tsx`

---

### T010 — Drawer open state

**Complexity**: S
**Depends on**: —

In `TimeReportPage`: `drawerOpen: boolean`, initialised to `false`. Two handlers: `openDrawer()` and `closeDrawer()`. Passed as `onOpen` to `KpiStrip` and as `open` / `onClose` to `MonthlySummaryDrawer`.

Also handle the Escape key: add a `keydown` event listener in a `useEffect` that calls `closeDrawer()` when `drawerOpen` is true and the key is `'Escape'`. Clean up the listener on unmount.

`frontend/src/pages/time-report/TimeReportPage.tsx`

---

## Phase 3 — Monthly Page Structure

> Goal: the visible shell of the page with real data flowing through it from top to bottom.

---

### T011 — TimeReportPage: route component and layout grid

**Complexity**: M
**Depends on**: T007, T008, T010

Create the route-level page component. This is the only component that:
- Reads `useTimeReportData`
- Owns `selectedYear`, `selectedMonth`, `drawerOpen` state
- Passes data and callbacks as props to all children

Layout structure (vertical flex column):
```
<AppHeader onLogout={...} />
<main>                              {/* bg: #F2F2F7, min-height: 100vh */}
  <div class="page-grid">           {/* max-width: 1120px, centered, padding: 32px 0 80px */}
    <LockedMonthBanner />           {/* conditional */}
    <TitleRow />                    {/* title + MonthPager */}
    <KpiStrip />                    {/* clickable, opens drawer */}
    <DayList />                     {/* day cards */}
  </div>
  <MonthlySummaryDrawer />
</main>
```

While loading: pass skeleton props to children. On error: render `ErrorState` instead of the grid. All layout divs should be RTL (`dir="rtl"`).

`frontend/src/pages/time-report/TimeReportPage.tsx`

---

### T012 — AppHeader component

**Complexity**: S
**Depends on**: —

Fixed top bar. Props: `onLogout: () => void`.

- Height: 80px, background `#FFFFFF`, bottom border `1px solid #ECECEC`
- Desktop horizontal padding: 400px each side; mobile: 16px
- RTL layout (`dir="rtl"`)
- **Right (RTL start)**: abra logo — use the existing `AbraLogo` component if it exists in the codebase, or render the `sm` variant (28px font, small mark) inline
- **Left (RTL end)**:
  - Logout button: outlined pill, border `#E1E7F3`, height 44px, icon + "יציאה"
  - "הוספת יום" button: orange pill (`#F09A37`), height 44px, white circle icon — **renders but has no `onClick` handler in v1**
  - "הפעלת שעון" button: pink pill (`#EA7693`), height 44px, play icon — **renders but has no `onClick` handler in v1**

Add `data-testid="app-header"` to the root element.

`frontend/src/pages/time-report/components/AppHeader.tsx`

---

### T013 — MonthPager component

**Complexity**: S
**Depends on**: —

Reusable navigation pill. Props: `month: number` (1–12), `year: number`, `onPrev: () => void`, `onNext: () => void`, `disabled?: boolean`.

- Shape: pill, height 44px, min-width 192px, background `#FFFFFF`
- Month name: display the Hebrew month name (e.g., "ינואר") and year (e.g., "2026") — use `Date` with `toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })` or a simple lookup array for month names
- Left/right chevron buttons: 24×24px, transparent background; hover background `#F0F4FA`; 4px border-radius
- When `disabled = true`: chevron buttons are visually faded and non-interactive

Used in two places: the title row (page-level) and inside `MonthlySummaryDrawer`. It must be self-contained and take no knowledge of page state.

`frontend/src/pages/time-report/components/MonthPager.tsx`

---

### T014 — Title row and page grid layout

**Complexity**: S
**Depends on**: T013

Add the title row inside `TimeReportPage`:

- `flex-direction: row-reverse; justify-content: space-between; align-items: center`
- **Left (RTL end)**: `h1` "דיווח שעות" (24px, 700, `#212525`) + `p` subtitle "רשימת הדיווחים החודשיים — לחודש {monthName} {year}" (16px, 500, `#848891`)
- **Right (RTL start)**: `<MonthPager month={selectedMonth} year={selectedYear} onPrev={handlePrevMonth} onNext={handleNextMonth} disabled={isLoading} />`

This is not a standalone component — it is a section inside `TimeReportPage`. Do not extract it.

`frontend/src/pages/time-report/TimeReportPage.tsx`

---

### T015 — KpiStrip component

**Complexity**: M
**Depends on**: T001

Props:
```
reportedMinutes: number
standardMinutes: number
completionPct: number
isLoading: boolean
onOpen: () => void
```

- Background `#FFFFFF`, border-radius 12px, padding `16px 24px`
- Layout: `flex-direction: row-reverse` (RTL)
- **Rightmost cell (RTL start)**: label "סיכום חודשי" in `#0C69FF`, 20px, 700, with a small right-pointing chevron (reversed in RTL); entire strip has `cursor: pointer`; calls `onOpen` on click
- **Three data cells** separated by `1px solid #E1E7F3` left borders:
  - `{reportedMinutes / 60} ש׳` / "דווחו עד כה"
  - `{standardMinutes / 60} ש׳` / "יעד לחודש"
  - `{completionPct}%` / "השלמה"
- Cell value: 22px, 700, `#212525`; label: 18px, `#53575B`
- When `isLoading = true`: render three placeholder dashes ("—") instead of computed values; strip is not clickable

Hours should be displayed as whole numbers (e.g., "141 ש׳"), not decimals.

`frontend/src/pages/time-report/components/KpiStrip.tsx`

---

### T016 — MonthlySummaryDrawer component

**Complexity**: L
**Depends on**: T013, T001

Props:
```
open: boolean
onClose: () => void
month: number
year: number
summary: MonthlySummary
onPrevMonth: () => void
onNextMonth: () => void
```

Structure:
- Overlay div: `position: fixed; inset: 0; background: rgba(20,30,62,0.5)` — renders only when `open`; clicking it calls `onClose`
- Drawer panel: `position: fixed; top: 0; bottom: 0; left: 0; width: 540px; background: #F2F2F7; overflow-y: auto; padding: 40px 24px` — slides in from left via CSS transform `translateX(-100%)` → `translateX(0)`, transition 0.3s ease; mobile: full width
- `dir="rtl"` on the panel

**Sections inside the panel (top to bottom)**:

1. **Header row**: "סיכום חודשי" (22px, 700) on the right; close button (×) as a 32px circle on the left
2. **MonthPager** (below header)
3. **Hours card** (`#FFFFFF`, border `#ECECEC`, radius 12px, padding 16px):
   - Head row: `{completionPct}% השלמה` label (18px, `#53575B`) | "שעות החודשיות" (20px, 700) | clock icon (32px square, `#F0F4FA` background)
   - Progress bar: 8px height, background `#ECECEC`, fill `#2F59FF`, RTL direction, value = `min(completionPct, 100)%`
   - Footer: "יעד {totalHours} ש׳" on the right | "**{reportedHours}** ש׳ דווחו" on the left
   - Alert row (only if `reportedMinutes < standardMinutes`): `#FEEBEB` background, `!` icon in red circle, "חסרות לך **{N} שעות** לפי היעד החודשי"
4. **Two KPI mini cards** side by side:
   - Absence hours: `#FFF6DB` icon background, value `{absenceMinutes / 60}`, label "שעות היעדרויות" — shows 0 if no absence data
   - Missing days: `#FCE3D6` icon background, value `{daysMissing}`, label "ימים ללא דיווח"
5. **Project breakdown card** (`#FFFFFF`, border, radius 12px):
   - Head: "פילוח לפי פרויקטים" (20px, 700) | purple pie-chart icon
   - Rows (from `summary.projectBreakdown`): project name (18px, `#212525`) + hours (18px, `#848891`), each separated by a `#ECECEC` bottom border; last row has no border

`frontend/src/pages/time-report/components/MonthlySummaryDrawer.tsx`

---

## Phase 4 — Day Card / Accordion Components

> Goal: the primary repeating UI unit. Build in order: StatusTag → DayCard (header) → DayList → expand behavior.

---

### T017 — StatusTag component

**Complexity**: S
**Depends on**: T001

Props: `status: DayStatus`, `reportedMinutes?: number`

Renders a colored pill. Exact spec:

| Status | Background | Text color | Content |
|--------|-----------|------------|---------|
| `open` | `#E3F9CA` | `#2E7D14` | ↑ SVG icon + `{HH:MM} ש׳` |
| `filled` | `#E3F9CA` | `#2E7D14` | ↑ SVG icon + `{HH:MM} ש׳` |
| `missing` | `#FCE3D6` | `#E7000B` | ↓ SVG icon + "חסר" |
| `weekend` | `#DEEAFF` | `#0C69FF` | "סוף שבוע" (no icon) |
| `holiday` | `#DEEAFF` | `#0C69FF` | "חג" (no icon) |
| `vacation` | `#FFE5D0` | `#C2630E` | "חופשה" (no icon) |

Anatomy: `display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 1000px; height: 28px; font-size: 16px; font-weight: 600; white-space: nowrap`

For `open` and `filled`: format `reportedMinutes` as `HH:MM` (e.g., 540 min → "09:00"). The ↑ and ↓ arrows are 12×12px SVG icons.

Use a `switch` statement — not a map or dynamic lookup — so TypeScript warns if a new status variant is added without a handler.

`frontend/src/pages/time-report/components/StatusTag.tsx`

---

### T018 — DayCard component (header — collapsed state)

**Complexity**: M
**Depends on**: T017, T001

Props:
```
dayEntry: DayEntry
isExpanded: boolean
onToggle: () => void
isLocked: boolean
```

**Header** (always rendered, height 72px):
- Border `1px solid #ECECEC`; border-radius: 12px when collapsed, `12px 12px 0 0` when expanded
- Layout: `flex-direction: row-reverse; justify-content: space-between; align-items: center; padding: 0 16px`
- **Right group (RTL start)**:
  - Briefcase icon: 40×40px, background `#F0F4FA`, border-radius 8px, icon color `#0C69FF`, 22×22px SVG
  - Date label: `"DD/MM/YY, {יום בשבוע}"` — derive the Hebrew day abbreviation (ראשון/שני/…/שבת) from `dayEntry.dayOfWeek`; 20px, 700, `#212525`
- **Left group (RTL end)**:
  - `<StatusTag status={dayEntry.status} reportedMinutes={dayEntry.reportedMinutes} />`
  - Chevron SVG (20px, `#848891`): `transform: rotate(0deg)` collapsed; `rotate(180deg)` expanded — CSS transition 0.25s

The entire header `div` calls `onToggle` on click, but only if `dayEntry.entries.length > 0` (i.e., there is a body to show). Cards with status `weekend`, `holiday`, `vacation`, or `missing` with no entries are not interactive — the chevron is hidden and the cursor is `default`.

`frontend/src/pages/time-report/components/DayCard.tsx`

---

### T019 — DayList component

**Complexity**: S
**Depends on**: T018, T009, T001

Props: `dayEntries: DayEntry[]`, `isLocked: boolean`

- Renders a vertical list of `DayCard` components, gap 8px, with `dayEntries` already sorted descending (the sorting happens in `useDayEntries`, not here)
- Owns `expandedDate` state (T009): manages which card is open
- Computes `isExpanded` and `onToggle` per card using `expandedDate`
- Passes `isLocked` down to each `DayCard`

`frontend/src/pages/time-report/components/DayList.tsx`

---

### T020 — DayCard expand/collapse animation

**Complexity**: S
**Depends on**: T018

Extend `DayCard` to conditionally render a body section below the header.

Body container: shown only when `isExpanded && dayEntry.entries.length > 0`. Use a CSS `max-height` transition for the slide-down effect: `max-height: 0; overflow: hidden` → `max-height: 800px`, transition 0.3s ease. (Avoid `height: auto` — it does not animate.)

When expanded:
- Header border-radius changes to `12px 12px 0 0` (top only)
- Body has no top border (the header bottom is already the separator)

`frontend/src/pages/time-report/components/DayCard.tsx`

---

## Phase 5 — Daily Entries Rendering

> Goal: the inside of an expanded day card — time segments with project rows.

---

### T021 — DaySegment component

**Complexity**: S
**Depends on**: T001

Props: `entry: TimeReportEntryDto`, `isLocked: boolean`

Renders one `TimeReportEntry` block inside a day card body.

Structure:
- Wrapper `div` with `padding: 16px 0; border-bottom: 1px solid #ECECEC`
- **Segment header row** (`flex-direction: row-reverse; justify-content: space-between`):
  - Left (RTL end): time range `"HH:MM–HH:MM"` in `#0C69FF`, 20px, 700
  - Right (RTL start): "עריכה" link — pencil icon + text, `#0C69FF`, 18px — **hidden when `isLocked = true`, otherwise renders but has no `onClick` in v1**
- **Project/task row** (`flex-direction: row-reverse; justify-content: space-between`):
  - Right: task name (from `entry.taskName` or task reference), 20px, `#212525`
  - Left: duration `"{H}:{MM} ש׳"` formatted from `entry.durationMinutes`, 20px, `#848891`

One `DaySegment` per `TimeReportEntry`. The last segment in the list has no bottom border — apply this via CSS `:last-child` selector on the wrapper.

`frontend/src/pages/time-report/components/DaySegment.tsx`

---

### T022 — DayCard body (segments list and add-report placeholder)

**Complexity**: S
**Depends on**: T021

Extend `DayCard` to render the card body content when expanded:

- Render one `<DaySegment>` per item in `dayEntry.entries`, passing `isLocked`
- Below the segments: a "הוספת דיווח +" row — `text-align: center; padding: 18px 0; color: #0C69FF; font-size: 20px; border-top: 1px solid #ECECEC; cursor: pointer` — **hidden when `isLocked = true`, otherwise renders with no `onClick` in v1**

`frontend/src/pages/time-report/components/DayCard.tsx`

---

### T023 — DayCard empty body state

**Complexity**: S
**Depends on**: T022

Edge case: a `DayCard` is technically expandable (e.g., status `open` because it is today) but `dayEntry.entries` is empty. Handle this:

- Body renders with a single centered message: "לא נמצאו דיווחים ליום זה" (16px, `#848891`, padding 24px)
- The "הוספת דיווח +" placeholder still renders below it (if not locked)
- The chevron and expand behavior still work normally

`frontend/src/pages/time-report/components/DayCard.tsx`

---

## Phase 6 — Status Calculation Logic

> Goal: pure, well-tested functions that convert raw API data into `DayEntry[]`. No UI dependency — implement and test these before building the UI.

---

### T024 — DayEntry type and buildDayEntries pure function

**Complexity**: M
**Depends on**: T001

Create the core derivation function:

```
buildDayEntries(
  dailyReports: DailyReportDto[],
  workCalendarDays: WorkCalendarDayDto[],
  absences: AbsenceDto[],
  today: Date
): DayEntry[]
```

Logic:
1. Build a `Map<string, WorkCalendarDayDto>` keyed by ISO date string
2. Build a `Set<string>` of dates covered by any `AbsenceReport` (expand date ranges into individual dates, skip Fri/Sat for absence expansion — or keep all dates in range and let `isWorkingDay` handle display)
3. Build a `Map<string, DailyReportDto>` keyed by date
4. For each date in the calendar month (1st to last day): look up the three maps and construct a `DayEntry`
5. Sort descending by date
6. Return the array

The function is pure — it takes only data and `today`, returns a `DayEntry[]`. All side effects are in the hook wrapper (T027).

`frontend/src/pages/time-report/hooks/useDayEntries.ts`

---

### T025 — Status priority logic

**Complexity**: M
**Depends on**: T024

Implement `deriveDayStatus(entry: Omit<DayEntry, 'status'>, today: Date): DayStatus` as a standalone function called inside `buildDayEntries`:

Priority chain (first match wins):

1. `dayType === 'HOLIDAY'` → `'holiday'`
2. `dayType === 'WEEKEND'` OR `isWorkingDay === false` → `'weekend'`
3. `hasAbsence && absenceType === 'VACATION'` → `'vacation'`
4. `isFuture` → no status rendered (return a sentinel or set `status` to a special value — see below)
5. `isToday && reportedMinutes > 0` → `'open'`
6. `!isToday && reportedMinutes >= standardMinutes && standardMinutes > 0` → `'filled'`
7. `isWorkingDay && !isFuture && reportedMinutes === 0` → `'missing'`
8. fallback → `'missing'` (covers irregular hours on working days — `'irregular'` is a future status)

For future days: `isFuture = date > today`. Future working days should appear in the list but with no status tag and no expandability. Represent this as `status: null` or add an `'future'` variant — whichever is cleaner, but do not mix it with the public `DayStatus` union. A separate `displayStatus: DayStatus | null` field on `DayEntry` is cleaner.

`frontend/src/pages/time-report/hooks/useDayEntries.ts`

---

### T026 — computeMonthSummary helper

**Complexity**: M
**Depends on**: T024

Implement `computeMonthSummary(dayEntries: DayEntry[]): MonthlySummary`:

- `reportedMinutes`: sum of `dayEntry.reportedMinutes` for all entries where `isWorkingDay = true`
- `standardMinutes`: sum of `dayEntry.standardMinutes` for all entries where `isWorkingDay = true`
- `completionPct`: `Math.min(Math.round((reportedMinutes / standardMinutes) * 100), 100)` — return 0 if `standardMinutes = 0`
- `daysMissing`: count of entries where `status === 'missing'`
- `absenceMinutes`: sum of (`standardMinutes`) for all entries where `status === 'vacation'` — approximation in v1; real value requires absence duration from AbsenceReport
- `projectBreakdown`: group `TimeReportEntry` rows by `taskName` (or project name if available), sum `durationMinutes`, sort descending by total — return top 10

`frontend/src/pages/time-report/hooks/useDayEntries.ts`

---

### T027 — useDayEntries hook

**Complexity**: S
**Depends on**: T024, T025, T026

Thin hook wrapper around the pure functions. Uses `useMemo` to avoid re-computing on every render:

```typescript
function useDayEntries(
  dailyReports: DailyReportDto[],
  workCalendarDays: WorkCalendarDayDto[],
  absences: AbsenceDto[]
): { dayEntries: DayEntry[]; monthlySummary: MonthlySummary }
```

- Calls `buildDayEntries(dailyReports, workCalendarDays, absences, new Date())`
- Calls `computeMonthSummary(dayEntries)`
- Returns both; memoised on all three input arrays

This hook is called inside `useTimeReportData` (T007), not directly in the page.

`frontend/src/pages/time-report/hooks/useDayEntries.ts`

---

## Phase 7 — Locked / Read-Only States

> Goal: apply the `isLocked` flag as a rendering constraint throughout the page. No new data fetching needed.

---

### T028 — LockedMonthBanner component

**Complexity**: S
**Depends on**: —

Props: `isLocked: boolean`

Renders only when `isLocked = true`. A full-width warning bar between the title row and the KPI strip:

- Background: `#FCE3D6` (red-bg)
- Text: "חודש נעול — לא ניתן לערוך דיווחים", 16px, 600, `#E7000B`
- A lock icon (SVG, 18×18px) inline before the text (RTL: icon on the right)
- Padding: 12px 24px; border-radius 8px

`frontend/src/pages/time-report/components/LockedMonthBanner.tsx`

---

### T029 — Read-only guard in DayCard body and DaySegment

**Complexity**: S
**Depends on**: T022, T021

Pass `isLocked: boolean` as a prop from `TimeReportPage` → `DayList` → `DayCard` → `DaySegment`.

When `isLocked = true`:
- `DaySegment`: hide the "עריכה" (edit) link
- `DayCard` body: hide the "הוספת דיווח +" row
- `DayCard` header: keep the card expandable (employee can still read their data)

This is intentionally a prop-drilling pattern — the component tree is shallow enough that context is not needed.

`frontend/src/pages/time-report/components/DayCard.tsx`
`frontend/src/pages/time-report/components/DaySegment.tsx`
`frontend/src/pages/time-report/components/DayList.tsx`

---

### T030 — Wire locked state throughout the page

**Complexity**: S
**Depends on**: T028, T029, T007

In `TimeReportPage`:

- Read `isLocked` from `useTimeReportData`
- Pass it to `<LockedMonthBanner isLocked={isLocked} />`
- Pass it to `<DayList isLocked={isLocked} />`
- Month navigation (`MonthPager`) remains enabled when locked — the employee can navigate to other months freely

`frontend/src/pages/time-report/TimeReportPage.tsx`

---

## Phase 8 — Error & Loading States

> Goal: the page should never show blank or broken UI. Every load and error condition has a defined visual state.

---

### T031 — DayCard skeleton component

**Complexity**: S
**Depends on**: —

A placeholder `DayCard` used while data is loading. Same outer dimensions as a real card (72px height, 12px border-radius, white background, `#ECECEC` border).

Inside: two grey animated blocks (pulsing opacity or shimmer via CSS animation):
- Right block: 200px wide (represents date)
- Left block: 80px wide (represents status tag)

Render 12 skeletons by default (approximate working days in a month view).

`frontend/src/pages/time-report/components/DayCardSkeleton.tsx`

---

### T032 — KpiStrip loading state

**Complexity**: S
**Depends on**: T015

Already covered partially by T015's `isLoading` prop. When `isLoading = true`:

- Replace each value with a grey animated placeholder block (`80px × 22px`, same shimmer animation as T031)
- The strip is not clickable (`pointer-events: none`)

Handle this inside `KpiStrip` via the existing `isLoading` prop — no new component needed.

`frontend/src/pages/time-report/components/KpiStrip.tsx`

---

### T033 — Full-page error state

**Complexity**: S
**Depends on**: T007

In `TimeReportPage`: when `isError = true`, render an error state instead of the page grid.

The error state is centered in the page area:
- A warning icon (large, `#848891`)
- Message: "לא ניתן לטעון את הדיווחים. אנא נסה שוב." (18px, `#53575B`, centered)
- A "נסה שוב" button: outlined pill, calls `refetch()` from `useTimeReportData`

The `AppHeader` remains visible above the error state — the employee can still log out.

`frontend/src/pages/time-report/TimeReportPage.tsx`

---

### T034 — Partial failure: absence data degradation

**Complexity**: S
**Depends on**: T007

In `TimeReportPage`: when `hasAbsenceError = true` (only the absence query failed):

- The page renders normally with all other data
- A non-blocking yellow informational banner appears at the top of the content area, below `LockedMonthBanner` (if shown) and above the title row:
  `"חלק מהנתונים לא נטענו — מידע על היעדרויות אינו זמין"`
  Background `#FFF6DB`, text `#B8860B`, 14px, dismissible via × button

Days that would have been `vacation` will appear as `missing` instead — this is the expected degraded behavior and does not require special handling beyond the absence data defaulting to an empty array.

`frontend/src/pages/time-report/TimeReportPage.tsx`

---

## Phase 9 — Testing

> Goal: cover the pure logic with unit tests and the key UI interactions with component tests. Focus on correctness, not coverage %.

---

### T035 — Unit tests: buildDayEntries and deriveDayStatus

**Complexity**: M
**Depends on**: T024, T025

Test the pure functions in isolation. Cover all status branches:

- Working day with `reportedMinutes >= standardMinutes` → `filled`
- Today with `reportedMinutes > 0` → `open`
- Past working day with `reportedMinutes = 0`, no absence → `missing`
- `dayType = 'HOLIDAY'` → `'holiday'` (even if `reportedMinutes = 0`)
- `dayType = 'WEEKEND'` → `'weekend'`
- `hasAbsence = true, absenceType = 'VACATION'` → `'vacation'`
- Future working day → `displayStatus = null`
- Priority: `HOLIDAY` day with absence record → still `'holiday'`
- Priority: `VACATION` day with 0 minutes → `'vacation'`, not `'missing'`

`frontend/src/__tests__/buildDayEntries.test.ts`

---

### T036 — Unit tests: computeMonthSummary

**Complexity**: S
**Depends on**: T026

Cover the KPI computation:

- Full month (all days filled): `completionPct = 100`, `daysMissing = 0`
- Empty month (no reports): `reportedMinutes = 0`, `completionPct = 0`
- Mixed month: verify `daysMissing` count matches only past working days with 0 minutes
- `standardMinutes = 0` (all holidays): `completionPct = 0`, no division by zero
- Project breakdown: verify top entries are sorted descending by total minutes

`frontend/src/__tests__/computeMonthSummary.test.ts`

---

### T037 — Component tests: StatusTag

**Complexity**: S
**Depends on**: T017

Render `StatusTag` with each of the 6 status values and assert:

- Correct Hebrew label is present in the DOM
- Correct background color class or inline style is applied
- Up arrow rendered for `filled`/`open`; down arrow for `missing`; no arrow for `weekend`/`holiday`/`vacation`
- `reportedMinutes = 540` renders as "09:00 ש׳"

`frontend/src/__tests__/StatusTag.test.tsx`

---

### T038 — Component tests: DayCard accordion behavior

**Complexity**: M
**Depends on**: T018, T019, T020

Test within `DayList` (which owns expand state):

- Clicking an expandable card header toggles its body open
- Clicking the same header again collapses it
- Clicking a second card collapses the first (single-expand constraint)
- Clicking a `weekend` or `missing` (no entries) card header does nothing — body does not appear
- When `isLocked = true`: card expands normally but "עריכה" and "הוספת דיווח" elements are absent from the DOM

`frontend/src/__tests__/DayCard.test.tsx`

---

## Phase 10 — Future Extension Hooks

> Goal: add seams that make the next features easy to wire without refactoring. These are small changes — not full implementations.

---

### T039 — Add 'irregular' slot to DayStatus and StatusTag

**Complexity**: S
**Depends on**: T001, T017

Add `'irregular'` to the `DayStatus` union in `types/time-report.ts`. In `StatusTag`, add a case for `'irregular'` in the switch statement that renders an amber pill (`background: #FFF3CD; color: #B8860B; label: "חריג"`). The condition that sets status to `'irregular'` (partial hours) is left as a `// TODO` in `deriveDayStatus` — the type and component are ready, the rule is not yet active.

This ensures a future PR that activates the rule does not need to touch `StatusTag` at all.

`frontend/src/types/time-report.ts`
`frontend/src/pages/time-report/components/StatusTag.tsx`

---

### T040 — DayCard action slot prop

**Complexity**: S
**Depends on**: T018

Add an optional prop `actionSlot?: React.ReactNode` to `DayCard`. If provided, render it at the very bottom of the card body, below the "הוספת דיווח" row. If not provided, nothing is rendered.

This is the injection point for a future report form or absence form. The current "הוספת דיווח" placeholder button will eventually be replaced by this slot. Document this intent with a single comment.

`frontend/src/pages/time-report/components/DayCard.tsx`

---

### T041 — Absence service interface comment and vacation status degradation note

**Complexity**: S
**Depends on**: T002, T006

In `time-report.service.ts`, add a JSDoc comment above `getAbsences` describing:
- The expected response shape (`AbsenceDto[]` with `startDate`, `endDate`, `absenceType`, `calculatedAbsenceDays`)
- That the frontend treats absence data as optional — if the endpoint is unavailable, `DayList` degrades to showing `missing` instead of `vacation` for those days
- The endpoint required: `GET /api/v1/absences?userId=&year=&month=`

In `useDayEntries.ts`, add a comment above the absence expansion logic: `// When AbsenceReport integration is complete, replace this with actual absence duration for absenceMinutes in computeMonthSummary`.

These comments exist to reduce ramp-up time for the next developer (or future-self) who wires in the absence reporting epic.

`frontend/src/services/time-report.service.ts`
`frontend/src/pages/time-report/hooks/useDayEntries.ts`

---

## Task Summary

| Phase | Tasks | Complexity breakdown | Estimated total |
|-------|-------|---------------------|-----------------|
| 1 — API Integration | T001–T007 | 6× S, 1× M | ~10h |
| 2 — State Management | T008–T010 | 3× S | ~4h |
| 3 — Page Structure | T011–T016 | 3× S, 2× M, 1× L | ~16h |
| 4 — Day Card / Accordion | T017–T020 | 2× S, 1× M, 1× S | ~8h |
| 5 — Daily Entries | T021–T023 | 3× S | ~4h |
| 6 — Status Logic | T024–T027 | 1× S, 2× M, 1× M | ~10h |
| 7 — Locked States | T028–T030 | 3× S | ~4h |
| 8 — Error & Loading | T031–T034 | 4× S | ~5h |
| 9 — Testing | T035–T038 | 2× S, 2× M | ~8h |
| 10 — Extension Hooks | T039–T041 | 3× S | ~3h |
| **Total** | **41 tasks** | **28× S · 10× M · 1× L** | **~72h** |

At a realistic solo pace (~6 focused hours/day), this is approximately **12 working days**.

---

## Dependencies Graph

```
T001 (types)
  └─▶ T002 (services) ─▶ T003–T006 (RQ hooks)
                               └─▶ T007 (composite hook)
                                       └─▶ T011 (page)

T024–T026 (pure logic) ─▶ T027 (useDayEntries)
                               └─▶ T007 (composite hook)

T001 ─▶ T017 (StatusTag) ─▶ T018 (DayCard header) ─▶ T019 (DayList)
T021 (DaySegment) ─▶ T022 (DayCard body) ─▶ T020 (animation)

T013 (MonthPager) ─▶ T014 (TitleRow) ─▶ T011 (page)
T015 (KpiStrip) ─▶ T011 (page)
T016 (Drawer) ─▶ T011 (page)

T028–T029 ─▶ T030 (wire locked state) ─▶ T011 (page)
T031–T034 ─▶ T011 (page)

T035 ─▶ T024, T025
T036 ─▶ T026
T037 ─▶ T017
T038 ─▶ T018, T019, T020

T039 ─▶ T001, T017
T040 ─▶ T018
T041 ─▶ T002, T006
```
