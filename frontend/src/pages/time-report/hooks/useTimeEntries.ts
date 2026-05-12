import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type {
  MonthlyDaysResponse,
  DropdownDataResponse,
  MonthlySummaryResponse,
  DayReportPayload,
  DayDto,
} from '../../../types/timeEntries';
import {
  getMonthlyDays,
  getDropdownData,
  getMonthlySummary,
  createDayReport,
  deleteDayReport,
} from '../../../services/timeEntriesApi';

// ─── Query keys ───────────────────────────────────────────────────────────────

export const timeEntriesKeys = {
  monthly: (year: number, month: number) => ['timeEntries', year, month] as const,
  summary: (year: number, month: number) => ['timeEntriesSummary', year, month] as const,
  dropdown: () => ['timeEntriesDropdown'] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useMonthlyDays(
  year: number,
  month: number,
): UseQueryResult<MonthlyDaysResponse> {
  return useQuery({
    queryKey: timeEntriesKeys.monthly(year, month),
    queryFn: () => getMonthlyDays(year, month),
    staleTime: 30_000,
  });
}

export function useMonthlySummary(
  year: number,
  month: number,
): UseQueryResult<MonthlySummaryResponse> {
  return useQuery({
    queryKey: timeEntriesKeys.summary(year, month),
    queryFn: () => getMonthlySummary(year, month),
    staleTime: 30_000,
  });
}

export function useDropdownData(): UseQueryResult<DropdownDataResponse> {
  return useQuery({
    queryKey: timeEntriesKeys.dropdown(),
    queryFn: getDropdownData,
    staleTime: 5 * 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

function yearMonthFromDate(reportDate: string): [number, number] {
  const [y, m] = reportDate.split('-').map(Number);
  return [y, m];
}

type UpsertContext = {
  previousData: MonthlyDaysResponse | undefined;
  year: number;
  month: number;
};

export function useUpsertDayReport() {
  const queryClient = useQueryClient();

  return useMutation<DayDto, Error, DayReportPayload, UpsertContext>({
    mutationFn: createDayReport,

    onMutate: async (payload) => {
      const [year, month] = yearMonthFromDate(payload.reportDate);
      const key = timeEntriesKeys.monthly(year, month);

      await queryClient.cancelQueries({ queryKey: key });
      const previousData = queryClient.getQueryData<MonthlyDaysResponse>(key);

      queryClient.setQueryData<MonthlyDaysResponse>(key, (old) => {
        if (!old) return old;
        return {
          ...old,
          days: old.days.map((day) =>
            day.reportDate === payload.reportDate
              ? { ...day, status: payload.status, startTime: payload.startTime, endTime: payload.endTime }
              : day,
          ),
        };
      });

      return { previousData, year, month };
    },

    onError: (_err, _payload, context) => {
      if (context && context.previousData !== undefined) {
        queryClient.setQueryData(timeEntriesKeys.monthly(context.year, context.month), context.previousData);
      }
    },

    onSettled: (_data, _error, payload) => {
      const [year, month] = yearMonthFromDate(payload.reportDate);
      void queryClient.invalidateQueries({ queryKey: timeEntriesKeys.monthly(year, month) });
      void queryClient.invalidateQueries({ queryKey: timeEntriesKeys.summary(year, month) });
    },
  });
}

export function useDeleteDayReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportDate: string) => deleteDayReport(reportDate),
    onSuccess: (_data, reportDate) => {
      const [year, month] = yearMonthFromDate(reportDate);
      void queryClient.invalidateQueries({ queryKey: timeEntriesKeys.monthly(year, month) });
      void queryClient.invalidateQueries({ queryKey: timeEntriesKeys.summary(year, month) });
    },
  });
}
