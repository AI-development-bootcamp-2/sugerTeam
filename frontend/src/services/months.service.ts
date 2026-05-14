import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api';

export interface MonthLockUserRef {
  id: string;
  fullName: string;
}

export interface MonthLockRecord {
  id: string;
  year: number;
  month: number;
  isLocked: boolean;
  lockedBy: string | null;
  lockedAt: string | null;
  reopenedBy: string | null;
  reopenedAt: string | null;
  lockedByUser: MonthLockUserRef | null;
  reopenedByUser: MonthLockUserRef | null;
}

const QUERY_KEY = ['months'] as const;

export function useMonths() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<MonthLockRecord[]>('/api/v1/month-locks');
      return data;
    },
  });
}

interface YearMonth { year: number; month: number }

export interface MissingReportsForUser {
  userId: string;
  fullName: string;
  missingDays: number;
}

export function useMissingReports(year: number, month: number, enabled: boolean) {
  return useQuery({
    queryKey: ['missing-reports', year, month],
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.get<MissingReportsForUser[]>(
        `/api/v1/month-locks/${year}/${month}/missing-reports`,
      );
      return data;
    },
  });
}

export function useLockMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ year, month }: YearMonth) => {
      const { data } = await apiClient.post<MonthLockRecord>(
        `/api/v1/month-locks/${year}/${month}/lock`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUnlockMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ year, month }: YearMonth) => {
      const { data } = await apiClient.post<MonthLockRecord>(
        `/api/v1/month-locks/${year}/${month}/unlock`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
