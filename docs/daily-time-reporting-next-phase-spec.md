# Daily Time Reporting — Next Phase Spec

## Scope

This spec covers the **employee-facing** daily time-reporting flow only. The admin side (month locking, user management, audit log review) is out of scope. The monthly day-list UI component architecture is fully documented in [calendar-feature-spec.md](./calendar-feature-spec.md) — this document covers only the gaps: wiring the day-list into the page, the daily reporting drawer, and all backend APIs.

---

## 1. What Already Exists (Do Not Re-implement)

| Layer | Already Done |
|---|---|
| Prisma schema | `DailyReport`, `TimeReportEntry`, `Client`, `Project`, `Task`, `TaskAssignment`, `MonthLock`, `WorkCalendarDay` |
| Frontend components | `DayList`, `DayCard`, `StatusTag`, `DaySegment`, `MonthlySummaryDrawer`, `LockedMonthBanner`, `MonthPager`, `KpiStrip` |
| Frontend hooks | `useTimeReport`, `useMonthLock`, `useMonthlySummary` (stubs exist; verify) |
| Backend | Auth, Users, Clients (CRUD), Projects (CRUD) |

**Critical gap:** The `TimeReportPage` does not currently render the day-list or the monthly KPI strip. These components exist but are not wired into the page.

---

## 2. Page Layout: TimeReportPage

`/time-report` is the single route for all employee reporting activity.

```
┌──────────────────────────────────────────────────────────┐
│ AppHeader (exists)                                        │
├──────────────────────────────────────────────────────────┤
│ MonthPager            KPI Strip (3 cards)                 │
├──────────────────────────────────────────────────────────┤
│ LockedMonthBanner (conditional)                           │
├──────────────────────────────────────────────────────────┤
│ DayList                                                   │
│   DayCard (×N per month)                                  │
│     StatusTag | DaySegment(s) | [+ הוסף רשומה] button    │
└──────────────────────────────────────────────────────────┘
```

**Wiring rules:**
- `MonthPager` drives the `year`/`month` state — all other components consume it.
- `KpiStrip` receives data from `GET /api/v1/time-entries/monthly-summary?year=&month=`.
- `DayList` fetches from `GET /api/v1/time-entries?year=&month=`.
- `LockedMonthBanner` is shown when `MonthLock.isLocked === true` for the selected month.
- Clicking `DayCard` or the "הוסף רשומה" button opens the `DailyReportDrawer` for that date.

---

## 3. DailyReportDrawer

An in-context slide-in drawer (not a separate route). Opens from the right side (RTL: slides from the right edge). Does not navigate away.

### 3.1 Drawer Header

```
[←]  דוח יומי — יום ראשון, 11 מאי 2025      [שמור טיוטה]  [הגש]
```

- Back arrow closes the drawer and returns focus to the day-list.
- Date is formatted in Hebrew locale (`he-IL`).
- "שמור טיוטה" saves with `status: DRAFT`.
- "הגש" saves with `status: SUBMITTED` and prompts a confirmation dialog.

### 3.2 Day-Level Fields (DailyReport)

| Field | Type | Required | Notes |
|---|---|---|---|
| `reportDate` | date | auto | Set from the DayCard that opened the drawer; read-only in the UI |
| `startTime` | time | yes | Day start time (e.g., 08:00) |
| `endTime` | time | yes | Day end time; must be > startTime |

### 3.3 Time Entry Block (TimeReportEntry)

Each entry block represents one work segment within the day.

| Field | Type | Required | Notes |
|---|---|---|---|
| `workLocation` | enum | yes | OFFICE / CLIENT / HOME (Hebrew labels: משרד / לקוח / בית) |
| `clientId` | UUID | yes | Cascading dropdown — drives project list |
| `projectId` | UUID | yes | Filtered by selected client; drives task list |
| `taskId` | UUID | yes | Filtered by selected project; only OPEN tasks (or tasks assigned to the user) |
| `startTime` | time | yes | Must be ≥ DailyReport.startTime |
| `endTime` | time | yes | Must be ≤ DailyReport.endTime; must be > entry startTime |
| `durationMinutes` | int | auto | Computed client-side from startTime/endTime; displayed as HH:MM |
| `description` | string | no | Max 500 chars; textarea |

Multiple entry blocks can exist for one day. Blocks are added with "+ הוסף רשומה" and removed individually.

### 3.4 Cascading Dropdown Logic

```
Client (all ACTIVE clients)
  └─ Project (ACTIVE projects where clientId matches)
       └─ Task (OPEN tasks where projectId matches AND
                (task has no assignments OR user is assigned))
```

- Changing client resets project and task selections.
- Changing project resets task selection.
- Dropdown data is fetched once per drawer open via `GET /api/v1/time-entries/dropdown-data`.
- The response is a flat structure; filtering is done client-side.

### 3.5 Validation Rules

**Client-side (React Hook Form + Zod):**
- Day `startTime` < `endTime` (required).
- At least one time entry block present before submission.
- Each entry: `startTime` ≥ day `startTime`, `endTime` ≤ day `endTime`.
- Each entry: `startTime` < `endTime`.
- No overlapping entries within the same day (checked across all blocks).
- `description` max 500 chars.
- All required fields present.

**Server-side (Zod + service layer):**
- Same time range constraints validated independently.
- `reportDate` must not be in a locked month (`MonthLock.isLocked === true`).
- `clientId`, `projectId`, `taskId` must exist and be ACTIVE/OPEN.
- `taskId` must belong to `projectId`; `projectId` must belong to `clientId`.
- Total entry duration must not exceed day duration.

### 3.6 Conflict Handling

If the employee opens a day that already has a SUBMITTED report, the drawer opens in **read-only mode** with a banner:

```
הדוח הוגש. לעריכה פנה לאחראי צוות.
```

DRAFT reports are always editable (unless the month is locked).

---

## 4. Backend API

Base path: `/api/v1/time-entries`

All routes require `Authorization: Bearer <accessToken>`. Employees see only their own data. Filtering by userId is applied automatically from the JWT payload — employees cannot query other users' entries.

### 4.1 GET `/api/v1/time-entries`

Fetch all daily reports with their entries for the authenticated user in a given month.

**Query params:**
```
year: number (required)
month: number (required, 1-12)
```

**Response `200`:**
```jsonc
{
  "days": [
    {
      "reportDate": "2025-05-11",
      "dailyReportId": "uuid | null",      // null if no report exists yet
      "status": "DRAFT | SUBMITTED | null",
      "startTime": "08:00 | null",
      "endTime": "17:00 | null",
      "entries": [
        {
          "id": "uuid",
          "workLocation": "OFFICE",
          "clientId": "uuid",
          "clientName": "Acme Ltd",
          "projectId": "uuid",
          "projectName": "Portal Redesign",
          "taskId": "uuid",
          "taskName": "Frontend Development",
          "startTime": "08:00",
          "endTime": "12:00",
          "durationMinutes": 240,
          "description": "Implemented login flow"
        }
      ]
    }
    // ... one object per calendar day in the month
  ]
}
```

Days with no report have `dailyReportId: null` and `entries: []`. The response always covers every calendar day in the requested month (including weekends/holidays from `WorkCalendarDay`).

### 4.2 GET `/api/v1/time-entries/dropdown-data`

Returns the data needed to populate cascading dropdowns. Called once when the drawer opens.

**Response `200`:**
```jsonc
{
  "clients": [
    {
      "id": "uuid",
      "name": "Acme Ltd",
      "projects": [
        {
          "id": "uuid",
          "name": "Portal Redesign",
          "tasks": [
            { "id": "uuid", "name": "Frontend Development" }
          ]
        }
      ]
    }
  ]
}
```

Only ACTIVE clients, ACTIVE projects, OPEN tasks. Tasks are filtered to those where the user is assigned or where the task has no assignments (open-pool tasks).

### 4.3 GET `/api/v1/time-entries/monthly-summary`

Aggregate data for the KPI strip.

**Query params:** `year`, `month`

**Response `200`:**
```jsonc
{
  "totalReportedMinutes": 10200,
  "expectedWorkingMinutes": 11520,
  "submittedDays": 18,
  "draftDays": 2,
  "missingDays": 2,
  "absenceDays": 0
}
```

### 4.4 POST `/api/v1/time-entries`

Create or fully replace a daily report (upsert by `userId + reportDate`). A `DailyReport` record is created automatically if it doesn't exist.

**Request body:**
```jsonc
{
  "reportDate": "2025-05-11",      // ISO date string
  "startTime": "08:00",
  "endTime": "17:00",
  "status": "DRAFT",               // "DRAFT" | "SUBMITTED"
  "entries": [
    {
      "workLocation": "OFFICE",
      "clientId": "uuid",
      "projectId": "uuid",
      "taskId": "uuid",
      "startTime": "08:00",
      "endTime": "12:00",
      "description": "Implemented login flow"
    }
  ]
}
```

**Response `201`:** Full day object (same shape as one element from GET `/time-entries` `days` array).

**Error responses:**
- `400` — validation failure (body includes `errors` array).
- `409` — report already SUBMITTED (cannot update via this endpoint).
- `423` — month is locked.

### 4.5 PUT `/api/v1/time-entries/:reportDate`

Replace entries for an existing DRAFT report. Same body shape as POST. Returns `200` with updated day object.

**Errors:** same as POST plus `404` if no report exists for the date.

### 4.6 DELETE `/api/v1/time-entries/:reportDate`

Delete a DRAFT report and all its entries (soft-delete: sets `deletedAt`). Cannot delete SUBMITTED reports.

**Response `204` No Content.**

---

## 5. State Management

### 5.1 Server State (React Query)

| Query key | Endpoint | Stale time |
|---|---|---|
| `['timeEntries', year, month]` | GET `/time-entries` | 30 s |
| `['dropdownData']` | GET `/time-entries/dropdown-data` | 5 min |
| `['monthlySummary', year, month]` | GET `/time-entries/monthly-summary` | 30 s |

On successful POST/PUT/DELETE: invalidate `['timeEntries', year, month]` and `['monthlySummary', year, month]`.

### 5.2 Local State (Drawer)

Drawer form state is managed by `react-hook-form`. No Zustand store is needed for the drawer. The `isDrawerOpen` flag and `selectedDate` live in local `useState` within `TimeReportPage`.

---

## 6. Design & Visual Spec

### 6.1 Design Tokens

```css
--bg:           #F2F2F7;
--card:         #FFFFFF;
--blue:         #0C69FF;
--blue-light:   #EBF2FF;
--green-bg:     #E3F9CA;
--green-text:   #2D6A0F;
--red-bg:       #FCE3D6;
--red-text:     #8B2500;
--grey-text:    #6B7280;
--border:       #E5E7EB;
--radius:       12px;
--radius-sm:    8px;
font-family: 'Assistant', sans-serif;
direction: rtl;
```

### 6.2 Drawer Layout

- Slides in from the right edge (RTL).
- Width: 480px on desktop; full-width on mobile.
- Header: sticky at the top within the drawer.
- Footer: sticky at the bottom — "שמור טיוטה" (outline) + "הגש" (filled blue) buttons.
- Scrollable content area between header and footer.
- Background overlay (`rgba(0,0,0,0.3)`) behind the drawer; clicking it closes the drawer (only if no unsaved changes; otherwise prompt confirmation).

### 6.3 Entry Block Card

Each `TimeReportEntry` is rendered as a white card (`--card`, `border-radius: --radius`) with:
- Top row: work location selector (segmented control: משרד | לקוח | בית).
- Row 2: Client dropdown | Project dropdown | Task dropdown (cascading).
- Row 3: Start time | End time | Duration (read-only, computed).
- Row 4: Description textarea (optional, placeholder: "תיאור עבודה...").
- Delete icon (trash) in top-left corner. Hidden on the last remaining entry.

### 6.4 Status Colors (DayCard)

| Status | Background | Text |
|---|---|---|
| SUBMITTED | `--green-bg` | `--green-text` |
| DRAFT | `--blue-light` | `--blue` |
| MISSING | `--red-bg` | `--red-text` |
| WEEKEND / HOLIDAY | `--bg` | `--grey-text` |
| ABSENCE | `#FEF3C7` | `#92400E` |

These match the existing `StatusTag` component defined in [calendar-feature-spec.md](./calendar-feature-spec.md).

---

## 7. Employee-Side Admin Awareness

Employees can see the following read-only information but cannot perform admin actions:

- **Month lock state:** `LockedMonthBanner` is shown at the top of the day-list when the selected month is locked. Text: `"חודש זה נעול. לא ניתן לערוך דוחות."` with contact info.
- **Submission deadline:** If the admin sets a soft deadline (future feature), a countdown badge appears in the `MonthPager`.
- **SUBMITTED report indicator:** SUBMITTED DayCards display a checkmark icon; the drawer opens in read-only mode.

Employees are **not** shown: other employees' reports, admin lock controls, or the audit log.

---

## 8. Out of Scope for This Phase

- Absence reporting flow (separate epic).
- Admin month locking UI.
- Audit log viewer.
- Team-lead approval workflow.
- Export to PDF/Excel.
- Push or email notifications.
- Mobile app (only responsive web).
