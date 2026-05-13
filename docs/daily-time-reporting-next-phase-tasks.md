# Daily Time Reporting — Next Phase Task List

Prerequisite: [daily-time-reporting-next-phase-spec.md](./daily-time-reporting-next-phase-spec.md) and [calendar-feature-spec.md](./calendar-feature-spec.md).

Tasks are ordered by dependency. Complete backend foundation tasks before wiring the frontend.

---

## PHASE 1 — Backend: New API Endpoints

### TASK-TR-001 — Time Entries Service (CRUD core)

**File:** `backend/src/services/timeEntries.service.ts` (new)

- Implement `getMonthlyDays(userId, year, month)` — returns one object per calendar day, joining `WorkCalendarDay`, `DailyReport`, and `TimeReportEntry` (soft-delete aware). Days with no `DailyReport` return `dailyReportId: null` and `entries: []`.
- Implement `upsertDayReport(userId, data)` — creates or replaces a `DailyReport` and its `TimeReportEntry` records for a given `reportDate` in a single Prisma transaction. Deletes orphaned entries not present in the new payload.
- Implement `deleteDayReport(userId, reportDate)` — soft-delete `DailyReport` and all child `TimeReportEntry` rows (set `deletedAt = now()`). Reject if status is `SUBMITTED`.
- Validate: month not locked (`MonthLock.isLocked`), report not SUBMITTED on delete/update, `clientId`/`projectId`/`taskId` referential integrity.

**Tests:** `backend/src/__tests__/timeEntries.service.test.ts`
- upsert creates new report + entries
- upsert replaces entries on second call (old entries soft-deleted)
- upsert rejects when month is locked → throws with status 423
- upsert rejects when report is SUBMITTED → throws with status 409
- delete soft-deletes report and entries
- delete rejects SUBMITTED report → throws with status 409

---

### TASK-TR-002 — Dropdown Data Service

**File:** `backend/src/services/timeEntries.service.ts` (add to same file)

- Implement `getDropdownData(userId)` — returns nested `clients → projects → tasks`.
- Filter: only `ACTIVE` clients, `ACTIVE` projects, `OPEN` tasks.
- Tasks: include if `TaskAssignment` row exists for `userId` OR if the task has no assignments at all.

**Tests:** `backend/src/__tests__/timeEntries.service.test.ts`
- returns only active/open hierarchy
- filters tasks to assigned + unassigned-pool only

---

### TASK-TR-003 — Monthly Summary Service

**File:** `backend/src/services/timeEntries.service.ts` (add to same file)

- Implement `getMonthlySummary(userId, year, month)` — aggregates:
  - `totalReportedMinutes` (sum of `durationMinutes` for the month)
  - `expectedWorkingMinutes` (sum of `WorkCalendarDay.standardHours × 60` for `isWorkingDay = true` days in range)
  - `submittedDays` (count of `SUBMITTED` daily reports)
  - `draftDays` (count of `DRAFT` daily reports)
  - `missingDays` (working days with no report and no absence)
  - `absenceDays` (working days covered by an `AbsenceReport`)

**Tests:** `backend/src/__tests__/timeEntries.service.test.ts`
- correct counts with mixed submitted/draft/missing days

---

### TASK-TR-004 — Zod Schemas for Time Entry Routes

**File:** `backend/src/routes/timeEntries.ts` (new)

Define Zod schemas:
```ts
const entrySchema = z.object({
  workLocation: z.enum(['OFFICE', 'CLIENT', 'HOME']),
  clientId: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  description: z.string().max(500).optional(),
});

const dayReportSchema = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  status: z.enum(['DRAFT', 'SUBMITTED']),
  entries: z.array(entrySchema).min(1),
});
```

Wire routes:
- `GET /` → `getMonthlyDays` (query: `year`, `month`)
- `GET /dropdown-data` → `getDropdownData`
- `GET /monthly-summary` → `getMonthlySummary` (query: `year`, `month`)
- `POST /` → `upsertDayReport` (body: `dayReportSchema`)
- `PUT /:reportDate` → `upsertDayReport` (body: `dayReportSchema`)
- `DELETE /:reportDate` → `deleteDayReport`

All routes: `requireAuth` middleware (JWT validation), employee sees only own data.

---

### TASK-TR-005 — Register Router in app.ts

**File:** `backend/src/app.ts`

```ts
import timeEntriesRouter from './routes/timeEntries';
app.use('/api/v1/time-entries', timeEntriesRouter);
```

---

## PHASE 2 — Frontend: API Layer

### TASK-TR-006 — Time Entries API Client

**File:** `frontend/src/services/timeEntriesApi.ts` (new)

Using `apiClient` from `services/api.ts`:

```ts
export const timeEntriesApi = {
  getMonthlyDays: (year: number, month: number) =>
    apiClient.get<MonthlyDaysResponse>('/api/v1/time-entries', { params: { year, month } }),

  getDropdownData: () =>
    apiClient.get<DropdownDataResponse>('/api/v1/time-entries/dropdown-data'),

  getMonthlySummary: (year: number, month: number) =>
    apiClient.get<MonthlySummaryResponse>('/api/v1/time-entries/monthly-summary', { params: { year, month } }),

  upsertDayReport: (data: DayReportPayload) =>
    apiClient.post<DayResponse>('/api/v1/time-entries', data),

  updateDayReport: (reportDate: string, data: DayReportPayload) =>
    apiClient.put<DayResponse>(`/api/v1/time-entries/${reportDate}`, data),

  deleteDayReport: (reportDate: string) =>
    apiClient.delete(`/api/v1/time-entries/${reportDate}`),
};
```

Define all TypeScript types in `frontend/src/types/timeEntries.ts` (new file).

---

### TASK-TR-007 — React Query Hooks

**File:** `frontend/src/hooks/useTimeEntries.ts` (new)

```ts
export function useMonthlyDays(year: number, month: number) { ... }
export function useMonthlySummary(year: number, month: number) { ... }
export function useDropdownData() { ... }
export function useUpsertDayReport() { ... }   // useMutation
export function useDeleteDayReport() { ... }   // useMutation
```

Mutation hooks must invalidate `['timeEntries', year, month]` and `['monthlySummary', year, month]` on success.

---

## PHASE 3 — Frontend: Wire TimeReportPage

### TASK-TR-008 — Wire Day List into TimeReportPage

**File:** `frontend/src/pages/TimeReportPage.tsx`

- Add `year`/`month` state (default: current month).
- Pass to `MonthPager` — it controls navigation.
- Call `useMonthlyDays(year, month)` and pass data to `DayList`.
- Call `useMonthlySummary(year, month)` and pass to `KpiStrip`.
- Call `useMonthLock(year, month)` and conditionally render `LockedMonthBanner`.
- On DayCard click or "+ הוסף רשומה" click: set `selectedDate` state and open drawer.

---

### TASK-TR-009 — DailyReportDrawer Component

**File:** `frontend/src/components/DailyReportDrawer.tsx` (new)

Props:
```ts
interface DailyReportDrawerProps {
  date: string;           // ISO date "YYYY-MM-DD"
  isOpen: boolean;
  onClose: () => void;
  existingReport?: DayData | null;
  isMonthLocked: boolean;
}
```

Structure:
- Drawer container with RTL slide-in animation (Tailwind `translate-x` transition).
- Backdrop overlay that triggers `onClose` (with unsaved-changes guard).
- Sticky header: date label + "שמור טיוטה" + "הגש" buttons.
- Scrollable body: day-level time range fields + list of `TimeEntryBlock` components.
- Sticky footer: "+ הוסף רשומה" button.
- Read-only mode when `existingReport.status === 'SUBMITTED'` or `isMonthLocked`.

Uses `react-hook-form` with `useFieldArray` for entry blocks.

---

### TASK-TR-010 — TimeEntryBlock Component

**File:** `frontend/src/components/TimeEntryBlock.tsx` (new)

Props: `index: number`, `control` (from react-hook-form), `onRemove: () => void`, `dropdownData: DropdownDataResponse`.

- Work location segmented control (3 buttons: משרד | לקוח | בית).
- Client dropdown → Project dropdown → Task dropdown (cascading, filtered client-side from `dropdownData`).
  - On client change: reset project and task fields.
  - On project change: reset task field.
- Start time / End time inputs (type="time").
- Duration display: computed as `(endTime - startTime)` in HH:MM, shown as read-only chip.
- Description textarea (max 500 chars, counter shown at bottom-right).
- Delete button (trash icon, hidden when this is the only block).

---

### TASK-TR-011 — Client-Side Validation (Zod + React Hook Form)

**File:** `frontend/src/components/DailyReportDrawer.tsx`

Add Zod resolver schema matching the server-side schema. Additional cross-field rules:
- Day `startTime < endTime`.
- Each entry `startTime >= day startTime`, `endTime <= day endTime`.
- Each entry `startTime < endTime`.
- No overlapping entries: sort by `startTime`, check each pair for overlap.

Show inline field errors below each input using the existing form error style.

---

### TASK-TR-012 — Unsaved-Changes Guard

**File:** `frontend/src/components/DailyReportDrawer.tsx`

- Track `isDirty` from `useForm`.
- If `isDirty` and user clicks backdrop or back arrow: show a confirmation dialog (`window.confirm` or a small modal) — "יש שינויים שלא נשמרו. לצאת בכל זאת?"
- On `onClose` from parent: same guard applies.

---

## PHASE 4 — Polish & Edge Cases

### TASK-TR-013 — Optimistic UI for Save

In `useUpsertDayReport` mutation:
- On `onMutate`: optimistically update the `['timeEntries', year, month]` cache entry for the affected date.
- On `onError`: roll back with `context.previousData`.
- On `onSettled`: invalidate to re-sync with server.

---

### TASK-TR-014 — Empty State for Missing Days

**File:** `frontend/src/components/DayCard.tsx` (update)

When `dailyReportId === null` and the day is a working day: render a "+ הוסף רשומה" call-to-action button inside the card instead of the empty entries area.

---

### TASK-TR-015 — Submission Confirmation Dialog

**File:** `frontend/src/components/DailyReportDrawer.tsx`

When the user clicks "הגש": show a modal dialog before calling the API.

```
כותרת: הגשת דוח יומי
גוף:   לאחר ההגשה לא ניתן יהיה לערוך את הדוח ללא אישור מנהל.
       להמשיך?
כפתורים: [בטל]  [הגש]
```

Only call `upsertDayReport` after confirmation.

---

### TASK-TR-016 — Error Toast Notifications

**File:** `frontend/src/components/DailyReportDrawer.tsx`

On mutation error:
- `423` (month locked): `"חודש זה נעול. לא ניתן לשמור דוחות."`
- `409` (already submitted): `"הדוח כבר הוגש. פנה לאחראי לעריכה."`
- Other: `"שגיאה בשמירת הדוח. נסה שנית."`

Use the existing toast/notification system (or add a minimal one if none exists).

---

## PHASE 5 — Tests

### TASK-TR-017 — Backend Integration Tests

**File:** `backend/src/__tests__/timeEntries.routes.test.ts` (new)

Test against a real test database (no mocks). Cover:
- `GET /api/v1/time-entries?year=&month=` returns correct day array
- `POST /api/v1/time-entries` creates report + entries; 400 on invalid body
- `POST` on locked month → 423
- `PUT` updates entries, soft-deletes removed ones
- `DELETE` soft-deletes; 409 on SUBMITTED report
- `GET /api/v1/time-entries/dropdown-data` returns correct hierarchy
- `GET /api/v1/time-entries/monthly-summary` returns correct aggregates

---

### TASK-TR-018 — Frontend Component Tests

**File:** `frontend/src/__tests__/DailyReportDrawer.test.tsx` (new)

Using Vitest + jsdom:
- Renders in read-only mode when report is SUBMITTED
- "+ הוסף רשומה" appends a new entry block
- Delete button removes an entry block (hidden on last block)
- Client dropdown change resets project and task
- Submit button triggers confirmation dialog
- Validation errors appear on submit with invalid data
- Calls `upsertDayReport` with correct payload on valid submit

---

## Dependency Order Summary

```
TASK-TR-001 → TASK-TR-002 → TASK-TR-003
                                        ↘
TASK-TR-004 (schemas + routes) → TASK-TR-005 (register in app.ts)
                                        ↘
TASK-TR-006 (API client) → TASK-TR-007 (hooks)
                                        ↘
TASK-TR-008 (wire page) → TASK-TR-009 (drawer) → TASK-TR-010 (entry block)
                                                          ↘
                                                  TASK-TR-011 (validation)
                                                  TASK-TR-012 (guard)
                                                  TASK-TR-013 (optimistic)
                                                  TASK-TR-014 (empty state)
                                                  TASK-TR-015 (confirm dialog)
                                                  TASK-TR-016 (error toasts)
                                                          ↘
                                                  TASK-TR-017 (backend tests)
                                                  TASK-TR-018 (frontend tests)
```
