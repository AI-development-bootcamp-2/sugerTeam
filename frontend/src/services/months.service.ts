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
