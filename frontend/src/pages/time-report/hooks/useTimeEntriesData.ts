import { useMemo } from 'react';
import { useMonthlyDays } from './useTimeEntries';
import { useMonthLock } from './useMonthLock';
import { computeMonthSummary } from './useDayEntries';
import type { DayEntry, MonthlySummary, TimeReportEntryDto } from '../../../types/time-report';
import { AbsenceType, CalendarDayType } from '../../../types/time-report';
import type { DayStatus } from '../../../types/time-report';
import type { DayDto } from '../../../types/timeEntries';
import { useAuthStore } from '../../../store/authStore';
import { useAbsences } from '../../../services/absences.service';
import type { AbsenceWithDocumentsDto } from '../../../services/absences.service';

// ─── Status derivation ────────────────────────────────────────────────────────

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
  return 'missing';
}

function todayLocalStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface AbsenceMapEntry {
  absenceId: string;
  absenceType: AbsenceType;
  isPartial: boolean;
}

function buildAbsenceMap(absences: AbsenceWithDocumentsDto[]): Map<string, AbsenceMapEntry> {
  const map = new Map<string, AbsenceMapEntry>();
  for (const absence of absences) {
    // Prisma serializes DateTime @db.Date as a full ISO timestamp; slice to YYYY-MM-DD
    const startStr = absence.startDate.slice(0, 10);
    const endStr = absence.endDate.slice(0, 10);
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const cursor = new Date(Date.UTC(sy, sm - 1, sd));
    const endDate = new Date(Date.UTC(ey, em - 1, ed));
    while (cursor <= endDate) {
      const y = cursor.getUTCFullYear();
      const mo = String(cursor.getUTCMonth() + 1).padStart(2, '0');
      const da = String(cursor.getUTCDate()).padStart(2, '0');
      map.set(`${y}-${mo}-${da}`, {
        absenceId: absence.id,
        absenceType: absence.absenceType,
        isPartial: absence.isPartial,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  return map;
}

function adaptDayDtos(days: DayDto[], absenceMap: Map<string, AbsenceMapEntry>): DayEntry[] {
  const todayStr = todayLocalStr();

  return days.map((dto) => {
    const reportedMinutes = dto.entries.reduce((sum, e) => sum + e.durationMinutes, 0);
    const standardMinutes = dto.isWorkingDay ? 9 * 60 : 0;
    const isToday  = dto.reportDate === todayStr;
    const isFuture = dto.reportDate > todayStr;
    const dayOfWeek = new Date(`${dto.reportDate}T00:00:00`).getDay();
    const dayType = dto.dayType as CalendarDayType;
    const absenceEntry = absenceMap.get(dto.reportDate) ?? null;
    const absenceType = absenceEntry?.absenceType ?? null;
    const absenceId = absenceEntry?.absenceId ?? null;
    const isPartial = absenceEntry?.isPartial ?? false;
    const hasAbsence = absenceType !== null;

    const entries: TimeReportEntryDto[] = dto.entries.map((e) => ({
      id:              e.id,
      dailyReportId:   dto.dailyReportId ?? '',
      workLocation:    e.workLocation,
      clientId:        e.clientId,
      clientName:      e.clientName,
      projectId:       e.projectId,
      projectName:     e.projectName,
      taskId:          e.taskId,
      taskName:        e.taskName,
      startTime:       e.startTime,
      endTime:         e.endTime,
      durationMinutes: e.durationMinutes,
      description:     e.description,
    }));

    return {
      date:            dto.reportDate,
      dayOfWeek,
      isWorkingDay:    dto.isWorkingDay,
      dayType,
      standardMinutes,
      reportedMinutes,
      entries,
      hasAbsence,
      absenceType,
      absenceId,
      isPartial,
      isToday,
      isFuture,
      displayStatus:   deriveDayStatus(dayType, dto.isWorkingDay, hasAbsence, absenceType, isToday, isFuture, reportedMinutes, standardMinutes),
    };
  });
}

// ─── Public interface ─────────────────────────────────────────────────────────

export interface UseTimeEntriesDataResult {
  dayEntries:     DayEntry[];
  monthlyDays:    DayDto[];
  monthlySummary: MonthlySummary;
  absences:       AbsenceWithDocumentsDto[];
  isLocked:       boolean;
  isLoading:      boolean;
  isError:        boolean;
  refetch:        () => void;
}

export function useTimeEntriesData(year: number, month: number): UseTimeEntriesDataResult {
  const daysQuery = useMonthlyDays(year, month);
  const lockQuery = useMonthLock(year, month);
  const userId = useAuthStore((s) => s.user?.id);
  const absencesQuery = useAbsences(userId, year, month);

  const monthlyDays = useMemo(() => daysQuery.data?.days ?? [], [daysQuery.data?.days]);
  const absences = useMemo(() => absencesQuery.data ?? [], [absencesQuery.data]);
  const absenceMap = useMemo(() => buildAbsenceMap(absences), [absences]);

  const dayEntries = useMemo(() => adaptDayDtos(monthlyDays, absenceMap), [monthlyDays, absenceMap]);
  const monthlySummary = useMemo(() => computeMonthSummary(dayEntries), [dayEntries]);

  return {
    dayEntries,
    monthlyDays,
    monthlySummary,
    absences,
    isLocked:  lockQuery.data?.isLocked ?? false,
    isLoading: daysQuery.isPending || lockQuery.isPending,
    isError:   daysQuery.isError   || lockQuery.isError,
    refetch() {
      void daysQuery.refetch();
      void lockQuery.refetch();
      void absencesQuery.refetch();
    },
  };
}
