import { useMemo } from 'react';
import type {
  DailyReportDto,
  WorkCalendarDayDto,
  AbsenceDto,
  DayEntry,
  MonthlySummary,
  ProjectRow,
} from '../../../types/time-report';
import { AbsenceType, CalendarDayType } from '../../../types/time-report';
import type { DayStatus } from '../../../types/time-report';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Parse YYYY-MM-DD as local midnight to avoid UTC-offset date shifts.
function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

// ─── T025 — Status derivation ─────────────────────────────────────────────────
// Priority chain: first match wins.
// Returns null for future days — the UI renders no tag when displayStatus is null.

function deriveDayStatus(
  dayType: CalendarDayType,
  isWorkingDay: boolean,
  hasAbsence: boolean,
  absenceType: AbsenceType | null,
  isToday: boolean,
  isFuture: boolean,
  reportedMinutes: number,
  standardMinutes: number,
): DayStatus | null {
  if (dayType === CalendarDayType.HOLIDAY) return 'holiday';
  if (dayType === CalendarDayType.WEEKEND || !isWorkingDay) return 'weekend';
  if (hasAbsence && absenceType === AbsenceType.VACATION) return 'vacation';
  if (hasAbsence && absenceType !== null) return 'absence';
  if (isFuture) return null;
  if (isToday && reportedMinutes > 0) return 'open';
  if (!isToday && standardMinutes > 0 && reportedMinutes >= standardMinutes) return 'filled';
  // Today with 0 minutes, or any past working day with insufficient hours → missing.
  // "Past" is enforced by the isFuture guard above; today is intentionally included.
  return 'missing';
}

// ─── Absence expansion ────────────────────────────────────────────────────────
// Expands every AbsenceReport date range into individual date strings so each
// day can do a single O(1) lookup. Overlapping absences: last entry wins
// (acceptable for v1 — overlapping absences are a data-quality issue).
// When AbsenceReport integration is complete, replace this with actual absence
// duration for absenceMinutes in computeMonthSummary.

interface AbsenceMapEntry {
  absenceId: string;
  absenceType: AbsenceType;
  isPartial: boolean;
}

function buildAbsenceMap(absences: AbsenceDto[]): Map<string, AbsenceMapEntry> {
  const map = new Map<string, AbsenceMapEntry>();

  for (const absence of absences) {
    const end = parseLocalDate(absence.endDate);
    const cursor = parseLocalDate(absence.startDate);

    while (cursor <= end) {
      map.set(toDateString(cursor), {
        absenceId: absence.id,
        absenceType: absence.absenceType,
        isPartial: absence.isPartial,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return map;
}

// ─── T024 — Core derivation function ─────────────────────────────────────────
// Pure function — takes only data + today, returns DayEntry[].
// The hook wrapper (useDayEntries) handles the useMemo lifecycle.
//
// Iteration strategy: generate every date in the calendar month and look up
// the three data sources. workCalendarDays determines the month; if no
// calendar data is available for a date, a REGULAR working day (9 h) is assumed.

export function buildDayEntries(
  dailyReports: DailyReportDto[],
  workCalendarDays: WorkCalendarDayDto[],
  absences: AbsenceDto[],
  today: Date,
): DayEntry[] {
  // Derive the year/month from the first calendar day returned by the API.
  // If workCalendarDays is empty the month cannot be determined — return [].
  if (workCalendarDays.length === 0) return [];

  const referenceDate = workCalendarDays[0]?.date; // YYYY-MM-DD
  if (!referenceDate) return [];
  const year = parseInt(referenceDate.slice(0, 4), 10);
  const month = parseInt(referenceDate.slice(5, 7), 10); // 1-indexed
  const daysInMonth = new Date(year, month, 0).getDate(); // month+1, day 0 trick

  const todayStr = toDateString(today);
  const reportMap = new Map(dailyReports.map((r) => [r.reportDate, r]));
  const calMap = new Map(workCalendarDays.map((c) => [c.date, c]));
  const absenceMap = buildAbsenceMap(absences);

  const entries: DayEntry[] = [];

  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

    // Fallback for dates the backend didn't return (regular working day defaults).
    const calDay: WorkCalendarDayDto = calMap.get(dateStr) ?? {
      date: dateStr,
      dayType: CalendarDayType.REGULAR,
      isWorkingDay: true,
      standardHours: 9,
      description: null,
    };

    const report = reportMap.get(dateStr);
    const absenceEntry = absenceMap.get(dateStr) ?? null;
    const absenceType = absenceEntry?.absenceType ?? null;
    const absenceId = absenceEntry?.absenceId ?? null;
    const isPartial = absenceEntry?.isPartial ?? false;
    const hasAbsence = absenceType !== null;
    const reportedMinutes = report?.totalMinutes ?? 0;
    const standardMinutes = calDay.standardHours * 60;
    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr;
    const dayOfWeek = parseLocalDate(dateStr).getDay(); // 0 = Sunday

    const displayStatus = deriveDayStatus(
      calDay.dayType,
      calDay.isWorkingDay,
      hasAbsence,
      absenceType,
      isToday,
      isFuture,
      reportedMinutes,
      standardMinutes,
    );

    entries.push({
      date: dateStr,
      dayOfWeek,
      isWorkingDay: calDay.isWorkingDay,
      dayType: calDay.dayType,
      standardMinutes,
      reportedMinutes,
      entries: report?.entries ?? [],
      hasAbsence,
      absenceType,
      absenceId,
      isPartial,
      isToday,
      isFuture,
      displayStatus,
    });
  }

  // Descending order — most recent day first (matches the Figma layout).
  return entries.sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ─── T026 — Monthly summary computation ──────────────────────────────────────
// absenceMinutes is an approximation in v1: uses standardMinutes for vacation
// days instead of the actual absence duration from AbsenceReport.
// Replace with AbsenceDto.partialDurationHours when absence integration lands.

export function computeMonthSummary(dayEntries: DayEntry[]): MonthlySummary {
  let reportedMinutes = 0;
  let standardMinutes = 0;
  let daysMissing = 0;
  let absenceMinutes = 0;
  const projectMap = new Map<string, number>();

  for (const day of dayEntries) {
    if (day.isWorkingDay) {
      reportedMinutes += day.reportedMinutes;
      standardMinutes += day.standardMinutes;
    }

    if (day.displayStatus === 'missing') daysMissing++;
    if (day.displayStatus === 'vacation') absenceMinutes += day.standardMinutes;

    for (const entry of day.entries) {
      projectMap.set(
        entry.taskName,
        (projectMap.get(entry.taskName) ?? 0) + entry.durationMinutes,
      );
    }
  }

  const completionPct =
    standardMinutes === 0
      ? 0
      : Math.min(Math.round((reportedMinutes / standardMinutes) * 100), 100);

  const projectBreakdown: ProjectRow[] = Array.from(projectMap.entries())
    .map(([name, minutes]) => ({ name, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 10);

  return {
    reportedMinutes,
    standardMinutes,
    completionPct,
    daysMissing,
    absenceMinutes,
    projectBreakdown,
  };
}

// ─── T027 — Hook wrapper ──────────────────────────────────────────────────────
// Thin wrapper around the pure functions. Called by useTimeReportData (T007),
// not directly by the page component.

export function useDayEntries(
  dailyReports: DailyReportDto[],
  workCalendarDays: WorkCalendarDayDto[],
  absences: AbsenceDto[],
): { dayEntries: DayEntry[]; monthlySummary: MonthlySummary } {
  const dayEntries = useMemo(
    () => buildDayEntries(dailyReports, workCalendarDays, absences, new Date()),
    [dailyReports, workCalendarDays, absences],
  );

  const monthlySummary = useMemo(
    () => computeMonthSummary(dayEntries),
    [dayEntries],
  );

  return { dayEntries, monthlySummary };
}
