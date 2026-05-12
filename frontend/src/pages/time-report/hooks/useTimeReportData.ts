import type { DayEntry, MonthlySummary } from '../../../types/time-report';
import { useDailyReports } from './useDailyReports';
import { useWorkCalendar } from './useWorkCalendar';
import { useMonthLock } from './useMonthLock';
import { useAbsences } from './useAbsences';
import { useDayEntries } from './useDayEntries';

export interface UseTimeReportDataResult {
  dayEntries: DayEntry[];
  monthlySummary: MonthlySummary;
  isLocked: boolean;
  isLoading: boolean;
  isError: boolean;
  hasAbsenceError: boolean;
  refetch: () => void;
}

export function useTimeReportData(
  userId: string,
  year: number,
  month: number,
): UseTimeReportDataResult {
  const dailyReports = useDailyReports(userId, year, month);
  const workCalendar = useWorkCalendar(year, month);
  const monthLock = useMonthLock(year, month);
  const absences = useAbsences(userId, year, month);

  const { dayEntries, monthlySummary } = useDayEntries(
    dailyReports.data ?? [],
    workCalendar.data ?? [],
    absences.data ?? [],
  );

  const isLoading =
    dailyReports.isPending || workCalendar.isPending || monthLock.isPending;

  const isError =
    dailyReports.isError || workCalendar.isError || monthLock.isError;

  const hasAbsenceError = absences.hasError;

  function refetch() {
    void dailyReports.refetch();
    void workCalendar.refetch();
    void monthLock.refetch();
  }

  return {
    dayEntries,
    monthlySummary,
    isLocked: monthLock.data?.isLocked ?? false,
    isLoading,
    isError,
    hasAbsenceError,
    refetch,
  };
}
