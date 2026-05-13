# Implementation Tasks — Timer Feature

**Feature**: Active Timer with Completion Dialog
**Spec**: [timer-feature-spec.md](./timer-feature-spec.md)
**Developer**: Solo
**Created**: 2026-05-12

---

## Recommended Execution Order

```
T001 (types) — no dependencies
  ↓
T002–T004 (Phase 1: DB + backend) — server foundation before any UI
  ↓
T005–T007 (Phase 2: frontend service + hooks) — data layer before UI
  ↓
T008–T009 (Phase 3: AppHeader UI) — visible timer button
  ↓
T010–T013 (Phase 4: completion dialog) — the primary UX surface
  ↓
T014–T015 (Phase 5: DailyReportDrawer integration) — guard existing form
  ↓
T016 (Phase 6: TimeReportPage wiring) — connect all pieces
  ↓
T017 (Phase 7: long-running warning) — polish
  ↓
T018–T019 (Phase 8: testing) — unit + component coverage
```

**Complexity key**: S = under 2 hours · M = 2–4 hours · L = 4–8 hours

---

## Phase 0 — TypeScript Types

> Define all new types before writing any logic. Everything else builds on this.

---

### T001 — Define timer types

**Complexity**: S
**Depends on**: —

Add new types to `frontend/src/types/time-report.ts` (extend the existing file):

```typescript
// Active timer response shape from GET /api/v1/timers/active
export interface ActiveTimerDto {
  timerId: string;
  startedAt: string;   // UTC ISO-8601, e.g. "2026-05-12T08:30:00.000Z"
}

// Returned by DELETE /api/v1/timers (stop)
export interface StoppedTimerDto {
  timerId: string;
  startedAt: string;   // UTC ISO-8601
  stoppedAt: string;   // UTC ISO-8601
}

// Local computed state consumed by AppHeader and TimeReportPage
export interface TimerState {
  isRunning: boolean;
  timerId: string | null;
  startedAt: Date | null;
  elapsedSeconds: number;   // updated every second, derived locally
}
```

`frontend/src/types/time-report.ts`

---

## Phase 1 — Backend

> Add the Prisma model, service layer, and Express routes. No frontend work in this phase.

---

### T002 — Add ActiveTimer model to Prisma schema

**Complexity**: S
**Depends on**: —

In `backend/prisma/schema.prisma`:

1. Add the `ActiveTimer` model:
   ```prisma
   model ActiveTimer {
     id        String   @id @default(cuid())
     userId    String   @unique
     startedAt DateTime @default(now())
     user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

     @@map("active_timers")
   }
   ```

2. Add the reverse relation on the `User` model:
   ```prisma
   activeTimer ActiveTimer?
   ```

3. Run `pnpm --filter backend prisma migrate dev --name add-active-timer` to
   generate and apply the migration.

`backend/prisma/schema.prisma`
`backend/prisma/migrations/` (auto-generated)

---

### T003 — Timer service

**Complexity**: S
**Depends on**: T002

Create `backend/src/services/timer.service.ts` with three exported functions:

```typescript
getActiveTimer(userId: string): Promise<ActiveTimer | null>
```
Calls `prisma.activeTimer.findUnique({ where: { userId } })`.
Returns the record or null.

```typescript
startTimer(userId: string): Promise<ActiveTimer>
```
Calls `prisma.activeTimer.create({ data: { userId } })`.
If the create throws a unique-constraint error (P2002), re-throw as a
`ConflictError` (HTTP 409) with message `"כבר יש שעון פעיל. עצור אותו לפני שמתחיל חדש."`.
Re-export `ConflictError` from `backend/src/lib/errors.ts` if it is not already defined.

```typescript
stopTimer(userId: string): Promise<{ startedAt: Date; stoppedAt: Date }>
```
1. Reads the active timer: `prisma.activeTimer.findUnique({ where: { userId } })`.
2. If null, throws `NotFoundError` (HTTP 404) with message `"אין שעון פעיל."`.
3. Captures `stoppedAt = new Date()`.
4. Deletes the record: `prisma.activeTimer.delete({ where: { userId } })`.
5. Returns `{ startedAt: record.startedAt, stoppedAt }`.

`backend/src/services/timer.service.ts`

---

### T004 — Timer routes

**Complexity**: S
**Depends on**: T003

Create `backend/src/routes/timers.ts`. Apply the existing `requireAuth` middleware
to all routes. No role guard needed — any authenticated user may use the timer.

```
GET    /          → getActiveTimer   → 200 { timerId, startedAt } | 200 null
POST   /start     → startTimer       → 201 { timerId, startedAt } | 409
DELETE /          → stopTimer        → 200 { timerId, startedAt, stoppedAt } | 404
```

Serialise all `Date` values with `.toISOString()` before sending.

Register the router in `backend/src/app.ts`:
```typescript
import timerRoutes from './routes/timers';
app.use('/api/v1/timers', timerRoutes);
```

`backend/src/routes/timers.ts`
`backend/src/app.ts`

---

## Phase 2 — Frontend Service & Hooks

> Thin API layer + React Query hooks. No UI in this phase.

---

### T005 — timerApi service functions

**Complexity**: S
**Depends on**: T001

Create `frontend/src/services/timerApi.ts`. Use the existing axios instance from
`services/api.ts`. Three named exports:

```typescript
getActiveTimer(): Promise<ActiveTimerDto | null>
  // GET /api/v1/timers/active
  // Returns the response data directly (null if server returns null)

startTimer(): Promise<ActiveTimerDto>
  // POST /api/v1/timers/start

stopTimer(): Promise<StoppedTimerDto>
  // DELETE /api/v1/timers
```

Let axios errors bubble — hooks handle them.

`frontend/src/services/timerApi.ts`

---

### T006 — useActiveTimer React Query hook

**Complexity**: S
**Depends on**: T005

```typescript
useActiveTimer(): UseQueryResult<ActiveTimerDto | null>
```

- Query key: `['timer', 'active']`
- Calls `getActiveTimer()`
- `staleTime: 0` — always re-fetch on mount so a new tab picks up the running state
- `refetchOnWindowFocus: true` — keeps two open tabs in sync
- Do not use `refetchInterval` — the elapsed display is computed locally, not from
  repeated server polls

`frontend/src/pages/time-report/hooks/useTimer.ts`

---

### T007 — useStartTimer and useStopTimer mutations

**Complexity**: S
**Depends on**: T005, T006

Add to `frontend/src/pages/time-report/hooks/useTimer.ts`:

```typescript
useStartTimer(): UseMutationResult<ActiveTimerDto, Error>
```
- Calls `startTimer()`
- On success: `queryClient.setQueryData(['timer', 'active'], data)` (optimistic cache update)

```typescript
useStopTimer(): UseMutationResult<StoppedTimerDto, Error>
```
- Calls `stopTimer()`
- On success: `queryClient.setQueryData(['timer', 'active'], null)` (clears cache)

`frontend/src/pages/time-report/hooks/useTimer.ts`

---

### T008 — useTimer composite hook

**Complexity**: M
**Depends on**: T001, T006, T007

Create the public API that `TimeReportPage` will call:

```typescript
function useTimer(): {
  timerState: TimerState;
  startTimer: () => Promise<void>;
  stopTimer: () => Promise<StoppedTimerDto>;
  startError: Error | null;
  stopError: Error | null;
  isStarting: boolean;
  isStopping: boolean;
}
```

Internal logic:

1. Call `useActiveTimer()` to get the server state.
2. Drive a `elapsedSeconds: number` piece of local state via `useEffect` +
   `setInterval(1000)`. Start the interval when `activeTimer !== null`; clear it
   when `activeTimer === null`. On each tick:
   ```typescript
   setElapsedSeconds(Math.floor((Date.now() - new Date(activeTimer.startedAt).getTime()) / 1000));
   ```
   Initialise `elapsedSeconds` to the correct value immediately when the query
   resolves (not just on the first tick) to avoid a 1-second flash of zero.

3. Derive `timerState` from the query result + local counter:
   ```typescript
   const timerState: TimerState = {
     isRunning:      activeTimer !== null,
     timerId:        activeTimer?.timerId ?? null,
     startedAt:      activeTimer ? new Date(activeTimer.startedAt) : null,
     elapsedSeconds,
   };
   ```

4. Expose `startTimer` as a wrapper around the `useStartTimer` mutation's
   `mutateAsync`, and `stopTimer` around `useStopTimer`'s `mutateAsync`.

`frontend/src/pages/time-report/hooks/useTimer.ts`

---

## Phase 3 — AppHeader UI

> Wire the timer state into the existing header button.

---

### T009 — Update AppHeader props and timer button rendering

**Complexity**: M
**Depends on**: T001

**Props change** — extend `AppHeaderProps`:
```typescript
interface AppHeaderProps {
  onLogout: () => void;
  onAddDay: () => void;
  timerState: TimerState;          // new
  onTimerClick: () => void;        // new — single handler; caller decides start vs. stop
  isTimerLoading?: boolean;        // new — true while start/stop mutation is in flight
}
```

**Button rendering** — replace the static `<button>` with a function:

```
if (timerState.isRunning):
  - icon: StopIcon (new 16×16px filled square SVG)
  - label: formatElapsed(timerState.elapsedSeconds)  →  "HH:MM:SS" or "MM:SS"
  - background: #E7000B
  - pulsing dot: 8×8px circle before the icon, white, CSS keyframe animation
    @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
    animation: pulse 1.5s ease-in-out infinite

else:
  - icon: PlayIcon (existing)
  - label: "הפעלת שעון"
  - background: #EA7693

if (isTimerLoading):
  - button disabled, opacity 0.6, cursor not-allowed
  - replace icon with a 16px CSS spinner
```

Add a `StopIcon` function component (same pattern as the existing `PlayIcon`):
```typescript
function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}
```

Add `formatElapsed(seconds: number): string` as a module-level pure function in
`AppHeader.tsx`:
```typescript
function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
```

`frontend/src/pages/time-report/components/AppHeader.tsx`

---

## Phase 4 — Timer Completion Dialog

> The primary UX surface. Employee assigns the timer block to a project and saves.

---

### T010 — TimerCompletionDialog skeleton + overlay

**Complexity**: S
**Depends on**: T001

Create `frontend/src/pages/time-report/components/TimerCompletionDialog.tsx`.

Props:
```typescript
interface TimerCompletionDialogProps {
  stoppedTimer: StoppedTimerDto;           // contains startedAt, stoppedAt
  existingDayEntries: TimeEntryDto[];      // used for overlap check
  onConfirm: (payload: EntryPayload) => void;
  onOpenFullForm: () => void;              // "פתח טופס מלא" → opens DailyReportDrawer
  onClose: () => void;
  isSubmitting: boolean;
  submitError: string | null;
}
```

Render:
- Overlay `div` (fixed, full-screen, semi-transparent navy, z-index 100)
  - Clicking overlay calls `onClose`
- Panel `div` (fixed, centered via transform, 480px wide, white, radius 16px,
  padding 32px, box-shadow)
  - `dir="rtl"`
  - Stop propagation on panel clicks so overlay click-to-close works correctly

For now just render the structure with placeholder content; fill in the form in
T011–T012.

`frontend/src/pages/time-report/components/TimerCompletionDialog.tsx`

---

### T011 — TimerCompletionDialog form fields

**Complexity**: L
**Depends on**: T010

Fill in the dialog form using `react-hook-form` + `zod`, matching the patterns in
`DailyReportDrawer.tsx`:

**Schema** (Zod):
```typescript
const schema = z.object({
  workLocation: z.nativeEnum(WorkLocation),
  clientId:     z.string().min(1, 'בחר לקוח'),
  projectId:    z.string().min(1, 'בחר פרויקט'),
  taskId:       z.string().min(1, 'בחר משימה'),
  description:  z.string().max(500).optional(),
});
```

**Sections to render** (see spec §5.4 for visual details):

1. **Header row**: title "רישום זמן" + close × button
2. **Timer summary strip**: read-only display of elapsed time and date
   - `elapsedLabel`: format `(stoppedAt - startedAt)` in milliseconds → HH:MM
   - `dateLabel`: `new Date(stoppedAt).toLocaleDateString('he-IL')`
3. **Time range row**: two read-only time inputs (startTime, endTime as HH:MM strings)
   derived from `stoppedTimer.startedAt` and `stoppedTimer.stoppedAt`
4. **Work location selector**: segmented buttons, same style as `DailyReportDrawer`
5. **Client dropdown**: `<select>` from `useDropdownData().data.clients`
6. **Project dropdown**: filtered by selected clientId
7. **Task dropdown**: filtered by selected projectId
8. **Description textarea**: optional, max 500 chars
9. **Action row**: "שמור רשומה" (primary), "פתח טופס מלא" (secondary), "בטל" (link)

`useDropdownData()` is already exported from
`frontend/src/pages/time-report/hooks/useTimeEntries.ts` — import and use it here.

`frontend/src/pages/time-report/components/TimerCompletionDialog.tsx`

---

### T012 — TimerCompletionDialog overlap validation

**Complexity**: S
**Depends on**: T011

Extract the `toMin(time: string): number` helper from `DailyReportDrawer.tsx` into
a shared utility file `frontend/src/pages/time-report/utils/timeUtils.ts`. Both
`DailyReportDrawer` and `TimerCompletionDialog` import from there.

In `TimerCompletionDialog`, after the user selects a `taskId`, run the overlap check
in a `useEffect` (depends on `taskId`, `stoppedTimer`):

```typescript
const newStart = toMin(format(new Date(stoppedTimer.startedAt), 'HH:mm'));
const newEnd   = toMin(format(new Date(stoppedTimer.stoppedAt), 'HH:mm'));

const hasOverlap = existingDayEntries
  .filter(e => e.taskId === selectedTaskId)
  .some(e => {
    const overlapStart = Math.max(newStart, toMin(e.startTime));
    const overlapEnd   = Math.min(newEnd,   toMin(e.endTime));
    return overlapStart < overlapEnd;
  });
```

When `hasOverlap = true`:
- Render the amber overlap warning (see spec §5.4 item 9)
- Disable the "שמור רשומה" button

`frontend/src/pages/time-report/components/TimerCompletionDialog.tsx`
`frontend/src/pages/time-report/utils/timeUtils.ts`

---

### T013 — TimerCompletionDialog entry merge logic

**Complexity**: M
**Depends on**: T011

The `onConfirm` callback in `TimerCompletionDialog` must pass back an `EntryPayload`.
The merge with existing entries happens in `TimeReportPage` (which owns the mutation),
not inside the dialog. The dialog only builds the `EntryPayload` for the new entry.

In `TimeReportPage`, implement the `handleTimerConfirm` function:

```typescript
function handleTimerConfirm(newEntry: EntryPayload) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const existingDay = dayEntries.find(d => d.date === today);

  const payload: DayReportPayload = {
    reportDate: today,
    startTime:  existingDay?.startTime
                  ?? format(completionData!.startedAt, 'HH:mm'),
    endTime:    existingDay?.endTime
                  ?? format(completionData!.stoppedAt, 'HH:mm'),
    status:     existingDay?.status ?? DailyReportStatus.DRAFT,
    entries:    [
      ...(existingDay?.entries ?? []).map(entryDtoToPayload),
      newEntry,
    ],
  };

  upsertMutation.mutateAsync(payload);
}
```

Implement `entryDtoToPayload(dto: TimeReportEntryDto): EntryPayload` as a pure
function in `timeUtils.ts` (maps DTO fields to the payload shape).

Extend the day bounds if the timer ran outside the existing day's `startTime`/`endTime`:
```typescript
startTime: min(existingDay.startTime, timerStartTime)
endTime:   max(existingDay.endTime,   timerStopTime)
```
Use `toMin()` for comparison and `formatMinutes()` (new helper, inverse of `toMin()`)
for output.

`frontend/src/pages/time-report/TimeReportPage.tsx`
`frontend/src/pages/time-report/utils/timeUtils.ts`

---

## Phase 5 — DailyReportDrawer Integration

> Prevent saving daily reports while a timer is running.

---

### T014 — Add isTimerRunning prop to DailyReportDrawer

**Complexity**: S
**Depends on**: T001

In `DailyReportDrawer.tsx`:

1. Extend the props interface:
   ```typescript
   isTimerRunning?: boolean;   // default: false
   ```

2. When `isTimerRunning = true`, render a non-dismissible amber warning banner
   at the top of the form body (below the drawer header, above the day time inputs):
   ```
   [⏱ icon] שעון פעיל — עצור את השעון לפני שמירת הדוח
   ```
   Style: background `#FFF3CD`, text `#B8860B`, 14px, radius 8px, padding 10px 16px.

3. When `isTimerRunning = true`, add `disabled` and
   `style={{ opacity: 0.5, cursor: 'not-allowed' }}` to both the "שמור טיוטה" and
   "הגש" buttons at the bottom of the drawer. All other form fields remain interactive.

`frontend/src/pages/time-report/components/DailyReportDrawer.tsx`

---

### T015 — Pass isTimerRunning from TimeReportPage to DailyReportDrawer

**Complexity**: S
**Depends on**: T014

This is a prop-threading task. In `TimeReportPage.tsx`:

```typescript
<DailyReportDrawer
  ...existingProps
  isTimerRunning={timerState.isRunning}
/>
```

No logic changes needed — just wire the prop through.

`frontend/src/pages/time-report/TimeReportPage.tsx`

---

## Phase 6 — TimeReportPage Wiring

> Connect all timer state and callbacks at the page level.

---

### T016 — Wire useTimer into TimeReportPage

**Complexity**: M
**Depends on**: T008, T009, T013, T015

In `TimeReportPage.tsx`:

1. Call `useTimer()`:
   ```typescript
   const { timerState, startTimer, stopTimer, isStarting, isStopping } = useTimer();
   ```

2. Add local state for the completion dialog:
   ```typescript
   const [completionData, setCompletionData] = useState<StoppedTimerDto | null>(null);
   ```

3. Implement `handleTimerClick`:
   ```typescript
   async function handleTimerClick() {
     if (timerState.isRunning) {
       const stopped = await stopTimer();
       setCompletionData(stopped);
     } else {
       await startTimer();
     }
   }
   ```
   Errors from `startTimer`/`stopTimer` are surfaced via the hook's `startError`/
   `stopError` fields — display them as a transient message below the header button
   (auto-clear after 4 seconds via `setTimeout` inside a `useEffect`).

4. Pass to `AppHeader`:
   ```typescript
   <AppHeader
     onLogout={handleLogout}
     onAddDay={() => setAbsenceDrawerOpen(true)}
     timerState={timerState}
     onTimerClick={handleTimerClick}
     isTimerLoading={isStarting || isStopping}
   />
   ```

5. Render `TimerCompletionDialog` conditionally:
   ```typescript
   {completionData && (
     <TimerCompletionDialog
       stoppedTimer={completionData}
       existingDayEntries={todayEntries}
       onConfirm={handleTimerConfirm}
       onOpenFullForm={() => {
         setCompletionData(null);
         setSelectedDate(todayString);
         setReportDrawerOpen(true);
       }}
       onClose={() => setCompletionData(null)}
       isSubmitting={upsertMutation.isPending}
       submitError={upsertMutation.error?.message ?? null}
     />
   )}
   ```
   Where `todayEntries` is derived from `dayEntries.find(d => d.date === todayString)?.entries ?? []`.

`frontend/src/pages/time-report/TimeReportPage.tsx`

---

## Phase 7 — Long-Running Timer Warning

> Non-blocking visual cue when the employee forgets to stop the timer.

---

### T017 — Long-running warning badge on AppHeader

**Complexity**: S
**Depends on**: T009

In `AppHeader.tsx`, add the warning badge to the timer button when elapsed > 8 hours
(`timerState.elapsedSeconds > 28_800`):

- Render a 16×16px absolute-positioned circle in the top-right corner of the button:
  `background: #FFF3CD; color: #B8860B; font-size: 10px; font-weight: 700; content: "!"`
  Use `position: relative` on the button and `position: absolute; top: -4px; right: -4px`
  on the badge. This requires changing the button's inline `display` from `inline-flex`
  to a wrapping `span` with `position: relative`.

- Add a `title` attribute to the button: `"השעון פועל מעל 8 שעות — שכחת לעצור?"`
  (renders as native browser tooltip)

No modal, no notification — a subtle visual cue is sufficient for v1.

`frontend/src/pages/time-report/components/AppHeader.tsx`

---

## Phase 8 — Testing

---

### T018 — Unit tests: formatElapsed and timeUtils helpers

**Complexity**: S
**Depends on**: T009, T012

Test the pure utility functions:

**`formatElapsed`** (in `AppHeader.tsx` — extract to `timeUtils.ts` for testability):
- `formatElapsed(0)` → `"00:00"`
- `formatElapsed(59)` → `"00:59"`
- `formatElapsed(3600)` → `"1:00:00"`
- `formatElapsed(3661)` → `"1:01:01"`
- `formatElapsed(86399)` → `"23:59:59"`

**`toMin`**:
- `toMin("00:00")` → `0`
- `toMin("09:30")` → `570`
- `toMin("23:59")` → `1439`

**`entryDtoToPayload`**:
- Verify all required fields are correctly mapped from a mock `TimeReportEntryDto`

`frontend/src/__tests__/timerUtils.test.ts`

---

### T019 — Component tests: AppHeader timer states

**Complexity**: M
**Depends on**: T009, T017

Using Vitest + React Testing Library:

- **Idle state**: renders "הפעלת שעון" label, pink background, no stop icon
- **Running state** (elapsedSeconds = 150): renders "02:30" label, red background, stop icon
- **Running state, long-running** (elapsedSeconds = 30_000): warning badge is present in the DOM; `title` attribute contains the warning text
- **Loading state** (isTimerLoading = true): button has `disabled` attribute
- **Click idle**: calls `onTimerClick`
- **Click running**: calls `onTimerClick`
- **Click while loading**: `onTimerClick` is NOT called (button disabled)

`frontend/src/__tests__/AppHeaderTimer.test.tsx`

---

## Task Summary

| Phase | Tasks | Complexity | Est. hours |
|-------|-------|------------|------------|
| 0 — Types | T001 | 1× S | 1h |
| 1 — Backend | T002–T004 | 3× S | 4h |
| 2 — Frontend service + hooks | T005–T008 | 3× S, 1× M | 6h |
| 3 — AppHeader UI | T009 | 1× M | 3h |
| 4 — Completion dialog | T010–T013 | 1× S, 1× L, 2× M | 11h |
| 5 — DailyReportDrawer integration | T014–T015 | 2× S | 2h |
| 6 — TimeReportPage wiring | T016 | 1× M | 3h |
| 7 — Long-running warning | T017 | 1× S | 1h |
| 8 — Testing | T018–T019 | 1× S, 1× M | 4h |
| **Total** | **19 tasks** | **11× S · 5× M · 1× L** | **~35h** |

At ~6 focused hours/day: approximately **6 working days**.

---

## Dependencies Graph

```
T001 (types)
  ├─▶ T005 (timerApi)
  │     ├─▶ T006 (useActiveTimer)
  │     └─▶ T007 (useStart/Stop mutations)
  │           └─▶ T008 (useTimer composite)
  │                 └─▶ T016 (TimeReportPage wiring)
  │
  ├─▶ T009 (AppHeader UI) ─▶ T016
  ├─▶ T010 (Dialog skeleton)
  │     └─▶ T011 (Dialog form)
  │           ├─▶ T012 (overlap validation) ─▶ T016
  │           └─▶ T013 (merge logic) ─▶ T016
  │
  └─▶ T014 (DailyReportDrawer prop) ─▶ T015 ─▶ T016

T002 (Prisma model)
  └─▶ T003 (timer service)
        └─▶ T004 (timer routes)

T009 ─▶ T017 (long-running warning)

T018 (unit tests) — depends on T009, T012 logic being extractable
T019 (component tests) — depends on T009, T017
```

---

## Reusable Existing Code (Do Not Duplicate)

| Existing item | Where it lives | How the timer feature uses it |
|---------------|---------------|-------------------------------|
| `useUpsertDayReport()` | `hooks/useTimeEntries.ts` | Creates the time entry after dialog confirm |
| `useDropdownData()` | `hooks/useTimeEntries.ts` | Populates client/project/task dropdowns in dialog |
| `pillBase` style object | `components/AppHeader.tsx` | Timer button inherits this style |
| `toMin()` helper | `components/DailyReportDrawer.tsx` → extract to `utils/timeUtils.ts` | Overlap detection in dialog |
| `DayReportPayload` / `EntryPayload` | `types/timeEntries.ts` | Payload construction in T013 |
| Overlay + drawer animation pattern | `components/DailyReportDrawer.tsx` | Dialog overlay in T010 |
| Confirmation dialog pattern | `components/DailyReportDrawer.tsx` | Modal UI reference for T010–T011 |
| `requireAuth` middleware | `backend/src/middleware/` | Applied to all timer routes in T004 |
| `ConflictError` / `NotFoundError` | `backend/src/lib/errors.ts` | Used in T003 timer service |
