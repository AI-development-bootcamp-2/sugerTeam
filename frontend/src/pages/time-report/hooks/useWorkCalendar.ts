import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { WorkCalendarDayDto } from '../../../types/time-report';
import { getWorkCalendar } from '../../../services/time-report.service';

export function useWorkCalendar(
  year: number,
  month: number,
): UseQueryResult<WorkCalendarDayDto[]> {
  return useQuery({
    queryKey: ['work-calendar', year, month],
    queryFn: () => getWorkCalendar(year, month),
    staleTime: 5 * 60 * 1000,
  });
}
