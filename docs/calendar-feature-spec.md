# Calendar Feature Spec — Employee Time Reporting

**Feature**: Monthly Day-List View (Employee Home Page)
**Author**: Solo developer
**Created**: 2026-05-11
**Updated**: 2026-05-11 — layout changed to day-list view (matching Figma); holiday rule added
**Status**: Draft
**Scope**: Employee-facing only — no admin dependency

---

## 1. Purpose

The Time Report page is the employee's primary home screen. After logging in, the employee lands here and sees a scrollable list of the current month's working days, each with a visual status tag showing whether hours were reported, are missing, or the day is non-working. The employee can navigate between months, expand any day to see its time segments, and open a monthly summary drawer for an overview of their progress.

The goal for v1 is a solid, readable foundation the employee can use immediately — not feature completeness.

**Entry point**: This page is the first screen the employee sees after the login page. The login page is implemented separately and is not part of this spec.

---

## 2. User Story

**As an employee**, I want to open the app after logging in and see a list of this month's days with clear status tags, so I can quickly spot missing reports and understand my progress — without asking a manager.

**Core flow**:
1. Employee logs in → lands on this page for the current month.
2. The page shows a month header, a KPI summary strip, and a scrollable list of day cards.
3. Each day card shows: date, day name, and a colored status tag.
4. Employee taps a day with reported segments → the card expands inline to show time blocks.
5. Employee taps the KPI strip → a monthly summary drawer slides in from the left.
6. Employee uses the month pager to navigate to a previous or next month.

---

## 3. MVP Scope

- App header with logo, logout button, and month pager
- Scrollable day-list for the selected month (most recent day first)
- Per-day status tag: `filled`, `open`, `missing`, `weekend`, `holiday`, `vacation`
- Status is derived from reported hours vs. the 9-hour daily standard
- Collapsible day cards: tap to expand and see time segments and project rows
- KPI summary strip (total reported hours, monthly target, completion %)
- Monthly summary drawer (slides in from left, accessible via KPI strip)
- Month/year navigation via a pill-shaped month pager
- Locked month: read-only rendering with a banner
- Loading skeletons and server error state

---

## 4. Out of Scope (This Version)

- Admin system — no admin views, no admin API calls
- Creating or editing time reports from this page (day list is read-only in v1)
- Timer (הפעלת שעון button appears in the Figma header but is a non-functional placeholder in v1)
- "הוספת יום" (Add Day) action — appears in header as placeholder only; wired in a future version
- Weekly submission or approval workflow
- Absence reporting UI (absence status tag `vacation` can render if data exists, but no absence form here)
- Export or print
- Advanced quota / KPI logic (accrual, carryover, balance)

---

## 5. UI Behavior

### 5.1 Design Tokens

All styling must use these values exactly — derived from the Figma source files.

**Colors**
```
--bg:           #F2F2F7   (page background)
--card:         #FFFFFF   (card / header surface)
--border:       #ECECEC   (default card border)
--border-soft:  #E1E7F3   (input / separator border)
--text:         #212525   (body text)
--text-strong:  #141E3E   (headings, primary labels)
--text-muted:   #848891   (secondary / placeholder text)
--text-mute2:   #53575B   (tertiary labels)
--blue:         #0C69FF   (primary action, links)
--blue-bg:      #F0F4FA   (icon background, hover)
--blue-strong:  #2F59FF   (progress bar)
--green-bg:     #E3F9CA
--green-text:   #2E7D14
--red-bg:       #FCE3D6
--red-text:     #E7000B
--orange:       #F09A37   (brand, Add Day button)
--pink:         #EA7693   (Timer button — placeholder)
--logo-navy:    #141E3E
```

**Typography**
- Font family: `"Assistant"` (Google Fonts) — weights 400, 500, 600, 700, 800
- All text in Hebrew, direction `rtl`
- Page heading (`h1`): 24px, 700
- Day card date: 20px, 700, `--text`
- Status tag: 16px, 600
- KPI strip value: 22px, 700
- KPI strip label: 18px, 500, `--text-mute2`

---

### 5.2 App Header

- Fixed at the top, height 80px, background `--card`, bottom border `1px solid --border`
- **Right side (RTL start)**: abra logo (small variant — `sm` size, 28px text)
- **Left side (RTL end)**:
  - Logout button: outlined pill (border `--border-soft`), icon + "יציאה", height 44px
  - "הוספת יום" button: orange pill (`--orange`), height 44px — **non-functional placeholder in v1**
  - "הפעלת שעון" button: pink pill (`--pink`), height 44px — **non-functional placeholder, timer is out of scope**
- Desktop: horizontal padding 400px each side
- Mobile: horizontal padding 16px, buttons may collapse to icon-only

---

### 5.3 Month Pager

- Pill-shaped control, height 44px, background `--card`, min-width 192px
- Content: `< {month name} >` with left/right chevron buttons (SVG, 18px)
- Month name: 18px, 700, `--text-strong`, centered
- Chevron buttons: 24×24px, transparent background, hover: `--blue-bg` fill, 4px border-radius
- In the page: appears in the title row (right side / RTL start)
- In the drawer: appears below the drawer header

---

### 5.4 Title Row

- Layout: `flex-direction: row-reverse; justify-content: space-between`
- Left side (RTL end): page title and subtitle
  - `h1`: "דיווח שעות", 24px, 700, `--text`
  - `p`: "רשימת הדיווחים החודשיים — לחודש {month} {year}", 16px, 500, `--text-muted`
- Right side (RTL start): `MonthPager` component

---

### 5.5 KPI Strip

- Clickable card (opens the monthly summary drawer)
- Background `--card`, border-radius 12px, padding 16px 24px
- Layout: `flex-direction: row-reverse` (RTL)
- **Label cell** (rightmost / RTL start): "סיכום חודשי" in `--blue`, 20px, 700, with a small left-pointing chevron (`▶` in RTL)
- **Three data cells** (each separated by a left border `1px solid --border-soft`):
  - Reported hours: value 22px 700, label "דווחו עד כה" 18px `--text-mute2`
  - Monthly target: value 22px 700, label "יעד לחודש" 18px `--text-mute2`
  - Completion %: value 22px 700, label "השלמה" 18px `--text-mute2`
- Hover: subtle cursor-pointer, no other visual change needed in v1

Values are computed client-side from the fetched data:
- **Reported hours** = `SUM(DailyReport.totalMinutes)` for the month ÷ 60
- **Monthly target** = `SUM(WorkCalendarDay.standardHours)` for all `isWorkingDay=true` days in the month
- **Completion %** = `(reportedHours / monthlyTarget) × 100`, capped at 100%

---

### 5.6 Day List

- A vertical column of `DayCard` components, most recent date first (descending)
- Gap between cards: 8px
- Only days from the current displayed month are shown (no overflow days from adjacent months)
- Weekends and holidays appear in the list but are styled distinctly

---

### 5.7 Day Card

Each card represents one calendar day.

**Header** (always visible, height 72px):
- Layout: `flex-direction: row-reverse; justify-content: space-between`
- Border: `1px solid --border`, border-radius 12px (collapses to top-radius-only when expanded)
- **Right group (RTL start)**:
  - Briefcase icon in a 40×40px `--blue-bg` square (8px radius), icon color `--blue`
  - Date label: `"DD/MM/YY, {יום בשבוע}"` — 20px, 700, `--text`
- **Left group (RTL end)**:
  - `StatusTag` component
  - Chevron icon (20px, `--text-muted`): rotates 180° when card is expanded

**Body** (visible only when expanded, slide-down animation):
- Shown only when the day has time segments (`TimeReportEntry` rows exist)
- One `DaySegment` per time block in the day

**Expandability rule**: A card is expandable (shows chevron, responds to tap) only if its status is `open` or `filled`. Cards with status `missing`, `weekend`, `holiday`, or `vacation` are not expandable in v1.

---

### 5.8 Status Tags

A colored pill rendered inside each day card header.

| Status | Condition | Tag background | Tag text color | Label |
|--------|-----------|---------------|----------------|-------|
| `open` | Today's date, has DailyReport entries | `#E3F9CA` | `#2E7D14` | ↑ `{HH:MM ש׳}` |
| `filled` | Past day, `reportedMinutes ≥ standardMinutes` | `#E3F9CA` | `#2E7D14` | ↑ `{HH:MM ש׳}` |
| `missing` | Past working day, no DailyReport or 0 minutes | `#FCE3D6` | `#E7000B` | ↓ חסר |
| `weekend` | `WorkCalendarDay.isWorkingDay = false` AND `dayOfWeek ∈ {5, 6}` (Fri/Sat) | `#DEEAFF` | `#0C69FF` | סוף שבוע |
| `holiday` | `WorkCalendarDay.dayType = HOLIDAY` (not Fri/Sat) | `#DEEAFF` | `#0C69FF` | חג |
| `vacation` | Day has an `AbsenceReport` with `absenceType = VACATION` | `#FFE5D0` | `#C2630E` | חופשה |

**Holiday rule**: Holidays are automatically treated as non-working days — the employee does not need to take any action. The `holiday` tag renders exactly like `weekend` visually, with the label "חג" instead of "סוף שבוע". Holiday status takes precedence over `missing`.

**Tag anatomy**: `display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 1000px; height: 28px; font-size: 16px; font-weight: 600`.

The ↑ / ↓ arrows inside `filled` / `open` / `missing` tags are 12×12px SVG icons.

---

### 5.9 Day Segment (inside expanded card)

Each `TimeReportEntry` block inside an open day card:

- Separated by a bottom border `1px solid --border`
- **Segment header**: time range (`"HH:MM–HH:MM"`) in `--blue`, 20px, 700 — aligned RTL start; edit link ("עריכה") with pencil icon in `--blue`, 18px, aligned RTL end — **non-functional in v1**
- **Project rows**: each row shows task/project name (20px, `--text`) and duration (20px, `--text-muted`) on opposite ends
- **"+ הוספת דיווח"** link at the bottom of the body: centered, `--blue`, 18px, border-top `1px solid --border`, padding 18px 0 — **non-functional in v1**

---

### 5.10 Monthly Summary Drawer

Slides in from the left side of the page (physical left; in RTL layout this is the trailing/end side).

- Width: 540px (desktop); full width (mobile)
- Background: `--bg` (`#F2F2F7`)
- Overlay: `rgba(20,30,62,0.5)` behind the drawer; tap overlay to close
- Padding: 40px 24px
- Opens when employee taps the KPI strip
- Closes via: close button (×), tap overlay, or Escape key

**Content (top to bottom)**:
1. **Header**: "סיכום חודשי" (22px, 700) + close button (32px circle, `--card` background)
2. **Month pager** (same component as page header)
3. **Hours card** (`--card`, border `--border`, radius 12px):
   - Head row: completion % label (18px, `--text-mute2`) | "שעות החודשיות" heading (20px, 700) | clock icon (32px square, `--blue-bg`)
   - Progress bar: height 8px, background `--border`, fill `--blue-strong`, RTL direction
   - Progress footer: target label left, "**{X}** ש׳ דווחו" right
   - Alert row (if hours missing): `#FEEBEB` background, `!` icon, "חסרות לך **{N} שעות** לפי היעד החודשי" — `--red-text`
4. **Two KPI mini cards** (side by side):
   - Absence hours: yellow icon, value (22px, 700), "שעות היעדרויות" label — **shows 0 if absence data not yet implemented**
   - Missing days: red icon, value (22px, 700), "ימים ללא דיווח" label
5. **Project breakdown card** (`--card`, border, radius 12px):
   - Head: "פילוח לפי פרויקטים" heading | purple pie icon
   - Rows: project/task name + hours, separated by `--border` bottom borders

---

### 5.11 Locked Month (Read-Only Mode)

- When `MonthLock.isLocked = true`, a banner appears between the title row and the KPI strip:
  `"חודש נעול — לא ניתן לערוך דיווחים"` — red/warning background
- Day cards still render and are expandable (read-only)
- "עריכה" (edit) links inside segments are hidden
- "הוספת דיווח" (add report) links inside day bodies are hidden
- KPI strip and summary drawer remain functional

---

## 6. Component Breakdown

No god component. `TimeReportPage` is the only component that owns state or calls hooks. All others are props-driven.

| Component | Responsibility |
|-----------|----------------|
| `TimeReportPage` | Route-level page. Owns `selectedMonth`, `drawerOpen` state. Fetches data via `useTimeReportData`. Passes data down. |
| `AppHeader` | Top navigation bar: logo, logout, Add Day placeholder, Timer placeholder. |
| `MonthPager` | Month navigation pill (`< {month} >`). Receives current month, emits prev/next callbacks. Pure presentational. |
| `KpiStrip` | Clickable summary bar. Receives computed totals. Emits `onOpen` callback. Pure presentational. |
| `DayList` | Renders a `DayCard` for each day in the month. Receives sorted `DayEntry[]`. Handles card expand/collapse state. |
| `DayCard` | Single collapsible day row. Renders header with `StatusTag`. When expanded, renders `DaySegment` list. |
| `StatusTag` | Colored pill with icon and label. Accepts a `DayStatus` prop. Pure presentational. |
| `DaySegment` | One time block inside an expanded day. Renders time range, project rows, and the non-functional edit/add links. |
| `MonthlySummaryDrawer` | Slide-in drawer. Receives monthly summary data. Renders hours card, KPI minis, project breakdown. |
| `LockedMonthBanner` | Warning banner shown at the top of the content area when the month is locked. Pure presentational. |

---

## 7. Suggested File Structure

```
frontend/src/
├── pages/
│   └── time-report/
│       ├── TimeReportPage.tsx              # Route page, data owner
│       ├── components/
│       │   ├── AppHeader.tsx
│       │   ├── MonthPager.tsx
│       │   ├── KpiStrip.tsx
│       │   ├── DayList.tsx
│       │   ├── DayCard.tsx
│       │   ├── StatusTag.tsx
│       │   ├── DaySegment.tsx
│       │   ├── MonthlySummaryDrawer.tsx
│       │   └── LockedMonthBanner.tsx
│       └── hooks/
│           ├── useTimeReportData.ts        # Composes the 3 parallel API calls
│           └── useDayEntries.ts            # Pure derivation: raw data → DayEntry[]
├── services/
│   └── time-report.service.ts             # Axios calls (daily-reports, work-calendar, month-locks)
└── types/
    └── time-report.ts                      # DayEntry, DayStatus, MonthlySummary, etc.
```

---

## 8. Backend / API Assumptions

The page requires three API calls on mount and on every month change. No new backend routes are needed — the page consumes existing planned endpoints.

| Data needed | Assumed endpoint | Notes |
|-------------|-----------------|-------|
| DailyReports + TimeReportEntries for the month | `GET /api/v1/daily-reports?userId=&year=&month=` | Returns DailyReport array, each with nested entries and `totalMinutes` |
| WorkCalendarDay rows for the month | `GET /api/v1/work-calendar?year=&month=` | Provides `standardHours`, `isWorkingDay`, `dayType` per date |
| MonthLock status | `GET /api/v1/month-locks?year=&month=` | Returns `{ isLocked: boolean }` |

All three are fetched in parallel (`Promise.all`). The `userId` defaults to the authenticated user's own ID (derived from the JWT). Employees cannot query another user's data.

AbsenceReport data for `vacation` status tags:

| Data needed | Assumed endpoint | Notes |
|-------------|-----------------|-------|
| Absence records for the month | `GET /api/v1/absences?userId=&year=&month=` | Returns `AbsenceReport[]` with `startDate`, `endDate`, `absenceType` |

This is a fourth parallel call. If the endpoint is not yet available, `vacation` tags degrade gracefully to `missing` — the rest of the page is unaffected.

---

## 9. Data Model Assumptions

Based on [data-model.md](../specs/001-time-reporting-system/data-model.md):

- **`DailyReport`**: day-level container, one per user per date, status `DRAFT | SUBMITTED`
- **`TimeReportEntry`**: one work block per task within a day, `durationMinutes` pre-calculated server-side
- **`WorkCalendarDay`**: provides `standardHours` (default 9.0), `isWorkingDay`, and `dayType` (`REGULAR | WEEKEND | HOLIDAY | SPECIAL`) per date. Fridays and Saturdays are seeded as `WEEKEND` / `isWorkingDay = false`.
- **`MonthLock`**: controls read-only state. No row = implicitly unlocked.
- **`AbsenceReport`**: absence records including type (`VACATION | SICK_LEAVE | MILITARY_RESERVE | OTHER`) and date range.

Status derivation per day (computed client-side, not stored):

```
DayEntry (derived type, not persisted):
  date: Date
  dayOfWeek: 0–6                         // 0=Sunday
  isWorkingDay: boolean                   // WorkCalendarDay.isWorkingDay
  dayType: 'REGULAR' | 'WEEKEND' | 'HOLIDAY' | 'SPECIAL'
  standardMinutes: number                 // WorkCalendarDay.standardHours × 60
  reportedMinutes: number                 // SUM(TimeReportEntry.durationMinutes) for the day
  entries: TimeReportEntry[]
  hasAbsence: boolean                     // any AbsenceReport covering this date
  absenceType: AbsenceType | null
  isToday: boolean
  status: DayStatus

DayStatus:
  'open'      → isToday AND reportedMinutes > 0
  'filled'    → !isToday AND reportedMinutes >= standardMinutes
  'missing'   → isWorkingDay AND !isToday AND !hasAbsence AND reportedMinutes === 0
  'vacation'  → hasAbsence AND absenceType === 'VACATION'
  'weekend'   → dayType === 'WEEKEND'
  'holiday'   → dayType === 'HOLIDAY'
  (status priority: holiday > vacation > weekend > open/filled/missing)
```

---

## 10. States

### 10.1 Loading

- All four API calls are in-flight.
- The day list renders as skeleton cards: each card is a grey animated placeholder block, same height as a real card.
- The KPI strip renders with placeholder dashes instead of numbers.
- Month navigation is disabled (buttons appear faded, no click response).
- The drawer cannot be opened.

### 10.2 Empty Day (no report)

- A past working day with no `DailyReport` or `reportedMinutes = 0`.
- `DayCard` renders with a `missing` tag (red pill + "חסר").
- Card is not expandable (no chevron interaction).

### 10.3 Selected / Expanded Day

- Employee taps a card with status `open` or `filled`.
- Card expands with a slide-down animation; chevron rotates 180°.
- The `DaySegment` list renders inside the card body.
- Only one card can be expanded at a time: expanding a new card collapses the previously open one.
- Tapping the same card header again collapses it.

### 10.4 Server Error

- If any required API call fails, the page shows a full-page error state instead of the day list.
- Message: "לא ניתן לטעון את הדיווחים. אנא נסה שוב."
- A "נסה שוב" button re-triggers all four calls.
- Partial failure (absence call fails, others succeed): `vacation` tags degrade to `missing`; a non-blocking yellow banner appears: "חלק מהנתונים לא נטענו — מידע על היעדרויות אינו זמין."

### 10.5 Locked Month / Read-Only

- `MonthLock.isLocked = true`.
- `LockedMonthBanner` appears between the title row and the KPI strip.
- Day cards render normally and are expandable.
- "עריכה" and "הוספת דיווח" elements inside card bodies are hidden.
- KPI strip and drawer remain fully functional.
- Month navigation still works.

---

## 11. Acceptance Criteria

- [ ] After login, the page loads with the current month's day list.
- [ ] Days are listed in descending order (most recent first).
- [ ] Each day card shows the correct date in the format `DD/MM/YY, {יום בשבוע}`.
- [ ] Status tags render with the correct color and label for each status: `open` (green + hours), `filled` (green + hours), `missing` (red + "חסר"), `weekend` (blue + "סוף שבוע"), `holiday` (blue + "חג"), `vacation` (orange + "חופשה").
- [ ] Holiday days show a "חג" tag and are not marked as missing, regardless of reported hours.
- [ ] Weekend days (Fri/Sat) show a "סוף שבוע" tag and are not expandable.
- [ ] Tapping a day with status `open` or `filled` expands the card and shows its time segments.
- [ ] Only one card is expanded at a time; opening another collapses the previous.
- [ ] The KPI strip shows correct computed values: reported hours, monthly target, completion %.
- [ ] Tapping the KPI strip opens the monthly summary drawer; tapping the overlay or × closes it.
- [ ] Month navigation updates the displayed month, re-fetches data, and updates all values.
- [ ] When the month is locked, `LockedMonthBanner` appears and edit/add links are hidden inside card bodies.
- [ ] During data fetch, skeleton placeholders are shown and navigation is disabled.
- [ ] On API error, a retry button is shown and re-triggers the fetch.
- [ ] All text is in Hebrew; layout is RTL with no visual alignment breaks.
- [ ] All tap targets are at least 44 × 44 px on mobile.
- [ ] The page is usable on a 375 px viewport without horizontal scrolling.

---

## 12. Future Extensions

The component structure must not make these hard to add:

- **Create/Edit reports** — `DayCard` body already has "עריכה" and "הוספת דיווח" as non-functional placeholders; wiring them to forms is the next natural step.
- **Timer** — the "הפעלת שעון" button is already in the header placeholder; the timer logic connects to it.
- **Absence reporting** — the `vacation` status already reads from `AbsenceReport`; an absence form can be opened from the header "הוספת יום" button or a dedicated route.
- **Calendar grid view** — `DayList` can be swapped for a `CalendarGrid` component using the same `DayEntry[]` data; no hook changes needed.
- **Irregular hours warning** — add `'irregular'` to `DayStatus` with an amber tag for days where `0 < reportedMinutes < standardMinutes`.
- **Admin view** — a parallel route with a user selector in the header; all sub-components are reusable.
- **Vacation balance / KPI** — the KPI mini cards in the drawer already have slots; plugging in balance data requires no layout changes.
