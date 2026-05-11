import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { DailyReportDto } from '../../../types/time-report';
import { getDailyReports } from '../../../services/time-report.service';

export function useDailyReports(
  userId: string,
  year: number,
  month: number,
): UseQueryResult<DailyReportDto[]> {
  return useQuery({
    queryKey: ['daily-reports', userId, year, month],
    queryFn: () => getDailyReports(userId, year, month),
    staleTime: 30_000,
  });
}
