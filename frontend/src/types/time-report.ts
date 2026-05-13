// ─── Backend enum mirrors ─────────────────────────────────────────────────────
// Keep in sync with the Prisma schema. Do not import from the backend package.

export enum DailyReportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
}

export enum WorkLocation {
  OFFICE = 'OFFICE',
  CLIENT = 'CLIENT',
  HOME = 'HOME',
}

export enum AbsenceType {
  VACATION = 'VACATION',
  SICK_LEAVE = 'SICK_LEAVE',
  MILITARY_RESERVE = 'MILITARY_RESERVE',
  OTHER = 'OTHER',
}

export enum AbsenceStatus {
  SUBMITTED = 'SUBMITTED',
  DOCUMENT_PENDING = 'DOCUMENT_PENDING',
}

export enum CalendarDayType {
  REGULAR = 'REGULAR',
  WEEKEND = 'WEEKEND',
  HOLIDAY = 'HOLIDAY',
  SPECIAL = 'SPECIAL',
}

// ─── API response DTOs ────────────────────────────────────────────────────────
// Shapes returned by /api/v1 endpoints. All dates are ISO strings (YYYY-MM-DD),
// all times are HH:MM strings.

export interface TimeReportEntryDto {
  id: string;
  dailyReportId: string;
  workLocation: WorkLocation;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  taskId: string;
  taskName: string;
  startTime: string;        // HH:MM
  endTime: string;          // HH:MM
  durationMinutes: number;
  description: string | null;
}

export interface DailyReportDto {
  id: string;
  userId: string;
  reportDate: string;       // YYYY-MM-DD
  startTime: string;        // HH:MM
  endTime: string;          // HH:MM
  status: DailyReportStatus;
  entries: TimeReportEntryDto[];
  totalMinutes: number;     // SUM(entries.durationMinutes), computed server-side
}

export interface WorkCalendarDayDto {
  date: string;             // YYYY-MM-DD
  dayType: CalendarDayType;
  isWorkingDay: boolean;
  standardHours: number;    // default 9.0; may be 0 for holidays
  description: string | null;
}

export interface MonthLockDto {
  year: number;
  month: number;            // 1–12
  isLocked: boolean;
}

export interface AbsenceDto {
  id: string;
  userId: string;
  absenceType: AbsenceType;
  startDate: string;        // YYYY-MM-DD, inclusive
  endDate: string;          // YYYY-MM-DD, inclusive
  isPartial: boolean;
  partialDurationHours: number | null;
  calculatedAbsenceDays: number;
  status: AbsenceStatus;
}

// ─── Derived client-side types ────────────────────────────────────────────────
// Not stored in the database. Computed from API data by useDayEntries.

export type DayStatus =
  | 'open'       // today, has reported entries
  | 'filled'     // past day, reportedMinutes >= standardMinutes
  | 'missing'    // past working day, no entries reported
  | 'weekend'    // Friday or Saturday (dayType WEEKEND)
  | 'holiday'    // public holiday (dayType HOLIDAY) — auto non-working, no action needed
  | 'vacation'   // covered by an AbsenceReport of type VACATION
  | 'absence'    // covered by an AbsenceReport of type SICK_LEAVE / MILITARY_RESERVE / OTHER
  | 'irregular'; // partial hours (< standard but > 0) — rule not yet active in deriveDayStatus

export interface DayEntry {
  date: string;                    // YYYY-MM-DD
  dayOfWeek: number;               // 0 = Sunday … 6 = Saturday
  isWorkingDay: boolean;
  dayType: CalendarDayType;
  standardMinutes: number;         // WorkCalendarDayDto.standardHours × 60
  reportedMinutes: number;         // SUM(TimeReportEntryDto.durationMinutes) for this date
  entries: TimeReportEntryDto[];
  hasAbsence: boolean;
  absenceType: AbsenceType | null;
  absenceId: string | null;        // ID of the covering absence, for edit flows
  isPartial: boolean;              // true = partial absence; time entries are also allowed
  isToday: boolean;
  isFuture: boolean;
  // null for future days — the UI renders no status tag when displayStatus is null
  displayStatus: DayStatus | null;
}

export interface ProjectRow {
  name: string;
  minutes: number;
}

export interface MonthlySummary {
  reportedMinutes: number;
  standardMinutes: number;
  completionPct: number;           // 0–100, capped at 100
  daysMissing: number;
  absenceMinutes: number;          // approximated from standardMinutes of vacation days in v1
  projectBreakdown: ProjectRow[];  // sorted descending by minutes, top 10
}
