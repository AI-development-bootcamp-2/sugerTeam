import { useMemo } from 'react';
import { useMonthlyDays } from './useTimeEntries';
import { useMonthLock } from './useMonthLock';
import { computeMonthSummary } from './useDayEntries';
import type { DayEntry, MonthlySummary, TimeReportEntryDto } from '../../../types/time-report';
import { CalendarDayType } from '../../../types/time-report';
import type { DayStatus } from '../../../types/time-report';
import type { DayDto } from '../../../types/timeEntries';

// ─── Status derivation (mirrors the logic in useDayEntries, absence-free) ────

function deriveDayStatus(
  dayType: CalendarDayType,
  isWorkingDay: boolean,
  isToday: boolean,
  isFuture: boolean,
  reportedMinutes: number,
  standardMinutes: number,
): DayStatus | null {
  if (dayType === CalendarDayType.HOLIDAY) return 'holiday';
  if (dayType === CalendarDayType.WEEKEND || !isWorkingDay) return 'weekend';
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

function adaptDayDtos(days: DayDto[]): DayEntry[] {
  const todayStr = todayLocalStr();

  return days.map((dto) => {
    const reportedMinutes = dto.entries.reduce((sum, e) => sum + e.durationMinutes, 0);
    const standardMinutes = dto.isWorkingDay ? 9 * 60 : 0;
    const isToday  = dto.reportDate === todayStr;
    const isFuture = dto.reportDate > todayStr;
    const dayOfWeek = new Date(`${dto.reportDate}T00:00:00`).getDay();
    const dayType = dto.dayType as CalendarDayType;

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
      hasAbsence:      false,
      absenceType:     null,
      isToday,
      isFuture,
      displayStatus:   deriveDayStatus(dayType, dto.isWorkingDay, isToday, isFuture, reportedMinutes, standardMinutes),
    };
  });
}

// ─── Public interface ─────────────────────────────────────────────────────────

export interface UseTimeEntriesDataResult {
  dayEntries:     DayEntry[];
  monthlyDays:    DayDto[];
  monthlySummary: MonthlySummary;
  isLocked:       boolean;
  isLoading:      boolean;
  isError:        boolean;
  refetch:        () => void;
}

export function useTimeEntriesData(year: number, month: number): UseTimeEntriesDataResult {
  const daysQuery = useMonthlyDays(year, month);
  const lockQuery = useMonthLock(year, month);

  const monthlyDays = useMemo(() => daysQuery.data?.days ?? [], [daysQuery.data?.days]);

  const dayEntries = useMemo(() => adaptDayDtos(monthlyDays), [monthlyDays]);
  const monthlySummary = useMemo(() => computeMonthSummary(dayEntries), [dayEntries]);

  return {
    dayEntries,
    monthlyDays,
    monthlySummary,
    isLocked:  lockQuery.data?.isLocked ?? false,
    isLoading: daysQuery.isPending || lockQuery.isPending,
    isError:   daysQuery.isError   || lockQuery.isError,
    refetch() {
      void daysQuery.refetch();
      void lockQuery.refetch();
    },
  };
}
