# Timer Feature Spec — Employee Time Tracking

**Feature**: Active Timer with Completion Dialog
**Author**: Solo developer
**Created**: 2026-05-12
**Status**: Draft
**Scope**: Employee-facing only — no admin dependency

---

## 1. Purpose

The employee needs a way to track time while working, without having to remember
start/stop times and manually enter them later. The "הפעלת שעון" button already
exists in the header as a placeholder. This feature activates it.

The timer runs server-side (persisted in the database), so it survives page
refreshes and browser tab closures. When the employee stops the timer, a
lightweight completion dialog lets them quickly assign the tracked block to a
client/project/task and save it as a time entry for today's report.

---

## 2. User Story

**As an employee**, I want to start a timer when I begin working on a task, stop
it when I'm done, and immediately log the time to my daily report — without having
to write down the start time or do mental arithmetic.

**Core flow**:
1. Employee clicks "הפעלת שעון" → timer starts; button shows elapsed time.
2. Employee works. The elapsed display ticks up in the header.
3. Employee clicks the (now red/stop) button → timer stops; completion dialog opens.
4. Employee selects client / project / task and confirms.
5. A time entry is created for today's daily report.
6. Dialog closes; the day list refreshes to show the new entry.

---

## 3. MVP Scope

- Start and stop the timer from the header button
- Timer state persisted on the backend — survives page refresh
- Live elapsed time display in the header (HH:MM:SS, updates every second locally)
- Completion dialog after stopping: select client/project/task, work location,
  optional description
- Pre-fill `startTime` and `endTime` in the dialog from the timer's timestamps
- Create a time entry via the existing `useUpsertDayReport()` mutation
- Overlap validation in the dialog (same logic as `DailyReportDrawer`)
- Disable "שמור טיוטה" and "הגש" in `DailyReportDrawer` while a timer is active
- Warning banner in `DailyReportDrawer` when timer is running
- Long-running timer warning in the header (>8 hours elapsed)
- Only one active timer per user (enforced at DB level)

---

## 4. Out of Scope (This Version)

- Admin visibility into employee timers
- Timer history / past timer records
- Pause / resume
- Timer spanning midnight (edge case deferred — see §12)
- Editing timer start time after stopping
- Multiple simultaneous timers
- Mobile push notifications for long-running timers
- Integration with project billing or invoicing

---

## 5. UI Behavior

### 5.1 Design Tokens

Reuse all existing design tokens from the project. New token added for this feature:

```
--timer-running: #E7000B   (red — stop button / running state)
--timer-pulse:   #EA7693   (pink — idle state, already used for the placeholder)
```

### 5.2 Timer Button in AppHeader

The button has two visual states.

**Idle state** (no active timer):
- Label: "הפעלת שעון"
- Icon: `PlayIcon` (existing SVG)
- Background: `#EA7693` (existing pink)
- Behavior: clicking starts the timer

**Running state** (active timer exists):
- Label: elapsed time formatted as `HH:MM:SS` (e.g., "02:14:37")
- Icon: `StopIcon` (new square SVG, same 16×16px as PlayIcon)
- Background: `#E7000B` (red)
- Pulsing dot: a 8×8px circle before the icon, `background: #FFFFFF`, `opacity`
  alternating between 1.0 and 0.4 via CSS animation (1.5s ease-in-out infinite)
- Behavior: clicking stops the timer and opens `TimerCompletionDialog`

**Long-running warning state** (elapsed > 8 hours):
- Adds an amber badge on the button: `!` character in a 16×16px circle, color
  `#B8860B` on `#FFF3CD` background, positioned as an absolute overlay on the
  top-right corner of the button
- Tooltip (on hover): "השעון פועל מעל 8 שעות — שכחת לעצור?"

**Button is disabled** (grayed out, non-interactive) when:
- A month-lock check is pending (loading state)

The button never blocks navigation. The employee can browse months freely while
the timer runs.

### 5.3 Elapsed Time Display

The elapsed time is computed **client-side** from `timer.startedAt`:

```
elapsed = Math.floor((Date.now() - new Date(timer.startedAt).getTime()) / 1000)
```

A `setInterval` running every second updates the display. This does not require
polling the server — the server only stores the start timestamp.

Format: `HH:MM:SS` with zero-padding (`01:05:09`). When under 1 hour: `MM:SS`.

### 5.4 Timer Completion Dialog

A centered modal overlay that opens immediately after the employee stops the timer.

**Visual structure** (RTL, `dir="rtl"`):
- Overlay: `position: fixed; inset: 0; background: rgba(20,30,62,0.5); z-index: 100`
- Panel: `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)`
  width: 480px (mobile: 95vw); background: `#FFFFFF`; border-radius: 16px;
  padding: 32px; box-shadow: `0 8px 40px rgba(0,0,0,0.18)`

**Panel content (top to bottom)**:

1. **Header row** (`flex-direction: row-reverse; justify-content: space-between`):
   - Right: "רישום זמן" (20px, 700, `#141E3E`)
   - Left: close × button (24×24px, `color: #848891`) — dismisses without saving

2. **Timer summary strip** (gray background card, `#F3F4F6`, radius 8px, padding 12px 16px):
   - Right: "זמן מדוד" label (14px, `#848891`)
   - Left: pre-filled elapsed formatted as `HH:MM` (e.g., "02:14"), 18px, 700, `#141E3E`
   - Below: date row — "תאריך: DD/MM/YYYY" (14px, `#848891`)

3. **Time range row** (two inputs side by side):
   - Right input: "שעת התחלה" — pre-filled from `timer.startedAt` (HH:MM), **read-only**
   - Left input: "שעת סיום" — pre-filled from `timer.stoppedAt` (HH:MM), **read-only**
   - Inputs use the same inline style as `DailyReportDrawer` time inputs (height 44px,
     border `#E5E7EB`, radius 8px, font-size 16px, `text-align: center`)

4. **Work location selector**: segmented button strip — same component style as
   `DailyReportDrawer`'s location buttons (משרד / לקוח / בית)

5. **Client dropdown**: `<select>` populated from `useDropdownData()`; same style as
   existing dropdowns in `TimeEntryBlock`

6. **Project dropdown**: cascades from client selection; populated from
   `useDropdownData()` filtered by selected client

7. **Task dropdown**: cascades from project selection

8. **Description textarea** (optional): 3 rows, max 500 chars; same style as existing
   description field in `TimeEntryBlock`

9. **Overlap warning** (conditional, rendered between the task dropdown and description):
   - Shown when the selected task already has an entry on this day that overlaps with
     the timer's time range
   - Background: `#FCE3D6`; text: "רשומות לאותה משימה לא יכולות להיות חופפות" (14px,
     `#E7000B`); padding 10px 14px; radius 8px
   - The confirm button is disabled when overlap is detected

10. **Action row** (`flex-direction: row-reverse; gap: 12px; margin-top: 24px`):
    - Primary: "שמור רשומה" — filled blue pill (`#0C69FF`), creates the entry
    - Secondary: "פתח טופס מלא" — outlined pill — closes dialog and opens
      `DailyReportDrawer` for today with time range pre-filled from the timer
    - Tertiary: "בטל" (text link, `#848891`) — dismisses without saving

**Loading state**: while the create mutation is in flight, the primary button shows
a spinner and is non-interactive.

**Error state**: if the mutation fails, a red error message appears below the action
row (same pattern as `DailyReportDrawer` error messages).

### 5.5 DailyReportDrawer — Timer Running State

When `isTimerRunning = true`, the drawer shows a non-dismissible amber banner at
the top of the form body (below the drawer header):

```
[⏱] שעון פעיל — עצור את השעון לפני שמירת הדוח
```

- Background: `#FFF3CD`; text: 14px, `#B8860B`; padding 10px 16px; radius 8px
- The "שמור טיוטה" and "הגש" buttons at the bottom of the drawer are
  `disabled` and show `opacity: 0.5; cursor: not-allowed`
- All form fields remain interactive so the employee can still build their report
  while the timer runs

---

## 6. Component Breakdown

| Component / Hook | File | Purpose |
|-----------------|------|---------|
| `AppHeader` _(updated)_ | `components/AppHeader.tsx` | Receives `timerState` + `onTimerClick` props; renders idle vs. running button |
| `TimerCompletionDialog` _(new)_ | `components/TimerCompletionDialog.tsx` | Modal to assign timer block to a time entry |
| `DailyReportDrawer` _(updated)_ | `components/DailyReportDrawer.tsx` | Accepts `isTimerRunning` prop; disables submit + shows warning |
| `TimeReportPage` _(updated)_ | `TimeReportPage.tsx` | Owns timer state; wires `useTimer` → AppHeader + Dialog + Drawer |
| `useTimer` _(new)_ | `hooks/useTimer.ts` | Composite hook — fetches active timer, exposes start/stop mutations, computes elapsed seconds |
| `useActiveTimer` _(new)_ | `hooks/useTimer.ts` (internal) | React Query — `GET /api/v1/timers/active` |
| `useStartTimer` _(new)_ | `hooks/useTimer.ts` (internal) | Mutation — `POST /api/v1/timers/start` |
| `useStopTimer` _(new)_ | `hooks/useTimer.ts` (internal) | Mutation — `DELETE /api/v1/timers` |
| `timerApi` _(new)_ | `services/timerApi.ts` | Axios calls for the three timer endpoints |

`TimeReportPage` is the only component that calls `useTimer`. All child components
receive timer state and callbacks as props — consistent with the existing pattern
where `TimeReportPage` is the sole data owner.

---

## 7. Data Model

### 7.1 New Prisma Model

```prisma
model ActiveTimer {
  id        String   @id @default(cuid())
  userId    String   @unique        // enforces one active timer per user at DB level
  startedAt DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("active_timers")
}
```

- `@unique` on `userId` means `prisma.activeTimer.create()` throws a unique-constraint
  error if the user already has a running timer — the service layer converts this to a
  409 response.
- No `stoppedAt` column — the timer record is deleted on stop, so the backend returns
  the stop time from `new Date()` at the moment of deletion.
- `onDelete: Cascade` so deleting a user also removes their active timer.

### 7.2 Relationships

```
User (1) ──── (0..1) ActiveTimer
```

No changes to `DailyReport`, `TimeReportEntry`, or any existing tables.

---

## 8. API Contract

All routes are under `/api/v1/timers`. Auth middleware (`requireAuth`) applies to
all routes. No new role requirements — any authenticated employee can use the timer.

### GET /api/v1/timers/active

Returns the active timer for the authenticated user, or `null` if none exists.

**Response 200**:
```json
{
  "timerId": "clxxx",
  "startedAt": "2026-05-12T08:30:00.000Z"   // UTC ISO-8601
}
```

**Response 200 (no active timer)**:
```json
null
```

The frontend derives local `startTime` from `startedAt` using
`new Date(startedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })`.

### POST /api/v1/timers/start

Starts the timer. Returns 409 if the user already has an active timer.

**Request body**: none

**Response 201**:
```json
{
  "timerId": "clxxx",
  "startedAt": "2026-05-12T08:30:00.000Z"
}
```

**Response 409** (timer already running):
```json
{ "error": "כבר יש שעון פעיל. עצור אותו לפני שמתחיל חדש." }
```

### DELETE /api/v1/timers

Stops (deletes) the active timer. Returns 404 if no active timer.

**Request body**: none

**Response 200**:
```json
{
  "timerId": "clxxx",
  "startedAt": "2026-05-12T08:30:00.000Z",
  "stoppedAt": "2026-05-12T10:44:37.000Z"   // server-generated
}
```

**Response 404** (no active timer):
```json
{ "error": "אין שעון פעיל." }
```

---

## 9. State Management

The timer adds one new state concern to `TimeReportPage`:

```
timerState: {
  isRunning: boolean
  timerId: string | null
  startedAt: Date | null
  elapsedSeconds: number   // computed locally, updated every 1s
}

completionData: {
  timerId: string
  startedAt: Date
  stoppedAt: Date
} | null                   // non-null = completion dialog is open
```

`timerState` is derived from the `useTimer` hook which wraps React Query. It is
**not** stored in Zustand — the source of truth is the backend. The elapsed counter
is the only piece of purely local state (driven by `setInterval` within the hook).

`completionData` is local to `TimeReportPage` — it is set when `useStopTimer`
resolves and cleared when the dialog is dismissed.

### Query Keys

| Query key | Endpoint |
|-----------|----------|
| `['timer', 'active']` | `GET /api/v1/timers/active` |

`staleTime`: 0 — always refetch on mount so the button reflects the correct state
if the employee opens a new tab.

---

## 10. Overlap Validation in the Completion Dialog

The dialog performs the same overlap check as `DailyReportDrawer`. Because the
dialog creates a single new entry, the check is simpler:

1. Fetch existing entries for `reportDate` from the cached React Query data
   (already in memory from `useTimeEntriesData`).
2. For each existing entry with the same `taskId` as the selected task:
   - Compute `overlapStart = max(newStart, existingStart)`
   - Compute `overlapEnd = min(newEnd, existingEnd)`
   - If `overlapStart < overlapEnd` → overlap detected

Where `newStart`/`newEnd` are the timer's HH:MM values converted to minutes via
the same `toMin()` helper used in `DailyReportDrawer`.

The overlap check runs on `taskId` change (reacts to dropdown selection). The
"שמור רשומה" button is disabled while overlap is detected.

---

## 11. Creating the Time Entry from the Dialog

When the employee confirms in `TimerCompletionDialog`, the dialog calls
`useUpsertDayReport()` (the existing mutation from `useTimeEntries.ts`).

**Payload construction**:
```typescript
const payload: DayReportPayload = {
  reportDate: format(stoppedAt, 'yyyy-MM-dd'),   // date-fns or manual format
  startTime: format(startedAt, 'HH:mm'),         // timer start
  endTime:   format(stoppedAt, 'HH:mm'),         // timer stop
  status: DailyReportStatus.DRAFT,
  entries: [{
    workLocation: selectedWorkLocation,
    clientId:     selectedClientId,
    projectId:    selectedProjectId,
    taskId:       selectedTaskId,
    startTime:    format(startedAt, 'HH:mm'),
    endTime:      format(stoppedAt, 'HH:mm'),
    description:  description || undefined,
  }]
};
```

**If a DailyReport already exists for `reportDate`**: the existing `useUpsertDayReport`
mutation sends a `PUT`, which replaces all entries. This means the new timer entry
would overwrite the day's existing entries — **which is incorrect**.

**Resolution**: the completion dialog must **merge** the new entry into the existing
day's entries. Before calling the mutation, the dialog:

1. Reads the existing day's data from `useTimeEntriesData` cache.
2. If a DailyReport exists for `reportDate`, constructs a payload that includes **all
   existing entries** plus the new timer entry.
3. Uses the existing day's `startTime`/`endTime` as the day bounds, extending them if
   the timer ran outside those bounds.

The "פתח טופס מלא" fallback path sidesteps this complexity — it opens
`DailyReportDrawer` for today with the timer's time range pre-populated, letting the
employee review everything before saving.

---

## 12. Edge Cases

| Scenario | Behavior |
|---------|---------|
| Timer spanning midnight | Deferred. In v1: on page load, if `startedAt` is before the start of today, the timer still displays the elapsed time. The completion dialog uses today's date for `reportDate`. A future version should warn the employee and let them split the entry across two days. |
| User opens two browser tabs | Both tabs show the correct running state because `useActiveTimer` fetches fresh data on tab focus (`refetchOnWindowFocus: true`). Stopping in one tab → the other tab's query goes stale and refetches, updating the UI to idle. |
| Stop timer while `DailyReportDrawer` is open | Completion dialog opens on top of the drawer. Closing the dialog returns focus to the drawer. If the employee used "פתח טופס מלא", the drawer is rebuilt with today's date. |
| Month is locked for today | Completing the timer opens the dialog. The merge/create call hits a locked month → 423 error. Dialog shows: "החודש נעול — לא ניתן לשמור רשומות." The employee can still close without saving. |
| Network error on start/stop | Mutation error is displayed below the timer button as a transient red message (auto-hides after 4 seconds). The button reverts to its previous state. |
| Timer already running when page loads | `useActiveTimer` query succeeds → elapsed counter starts immediately; button renders in running state. No user action needed. |
| User clicks Start twice quickly | Second `POST /timers/start` returns 409. The start mutation is disabled while the first request is in-flight (button shows loading spinner). |

---

## 13. Acceptance Criteria

- [ ] Clicking "הפעלת שעון" starts a timer; the button changes to red with elapsed time.
- [ ] Elapsed time updates every second without a server round-trip.
- [ ] Refreshing the page while the timer is running shows the correct elapsed time.
- [ ] Clicking the stop button opens `TimerCompletionDialog`.
- [ ] The dialog pre-fills start time and end time from the timer's timestamps.
- [ ] Selecting a task with an overlapping time range disables the confirm button and shows a warning.
- [ ] Confirming in the dialog creates a time entry and closes the dialog.
- [ ] If a DailyReport already exists for today, the new timer entry is merged with existing entries (no data loss).
- [ ] "פתח טופס מלא" closes the dialog and opens `DailyReportDrawer` for today with the timer range pre-filled.
- [ ] Dismissing the dialog (× or "בטל") closes without creating an entry.
- [ ] Opening `DailyReportDrawer` while a timer is running shows the warning banner and disables save/submit buttons.
- [ ] After 8 hours elapsed, an amber warning badge appears on the timer button.
- [ ] Only one active timer per user — attempting to start a second timer when one is already running does nothing (button is in running state).
- [ ] All labels and messages are in Hebrew; layout is RTL.
- [ ] The timer button is at least 44×44px (existing constraint met by `pillBase`).

---

## 14. Future Extensions

- **Pause / Resume**: add a `pausedAt` timestamp array to `ActiveTimer`; compute net
  elapsed excluding paused intervals.
- **Timer history**: store completed timers in a `TimerLog` table for audit / productivity insights.
- **Pre-filling project from last entry**: if the employee's last time entry was for
  a specific project, pre-select it in the completion dialog.
- **Calendar day integration**: show a small running-timer indicator on today's
  `DayCard` header while the timer is active.
- **Mobile notification**: when elapsed passes a configurable threshold, send a
  browser push notification.
