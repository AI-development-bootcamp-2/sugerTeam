import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { MonthLockDto } from '../../../types/time-report';
import { getMonthLock } from '../../../services/time-report.service';

export function useMonthLock(year: number, month: number): UseQueryResult<MonthLockDto> {
  return useQuery({
    queryKey: ['month-lock', year, month],
    queryFn: async () => {
      try {
        return await getMonthLock(year, month);
      } catch (err) {
        // No lock record means the month is implicitly unlocked.
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          return { year, month, isLocked: false } satisfies MonthLockDto;
        }
        throw err;
      }
    },
  });
}
