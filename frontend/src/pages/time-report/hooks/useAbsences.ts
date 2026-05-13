import { useQuery } from '@tanstack/react-query';
import type { AbsenceDto } from '../../../types/time-report';
import { getAbsences } from '../../../services/time-report.service';

export interface UseAbsencesResult {
  data: AbsenceDto[] | undefined;
  isPending: boolean;
  isError: boolean;
  hasError: boolean;
}

export function useAbsences(
  userId: string,
  year: number,
  month: number,
): UseAbsencesResult {
  const query = useQuery({
    queryKey: ['absences', userId, year, month],
    queryFn: () => getAbsences(userId, year, month),
    retry: false,
  });

  return {
    data: query.data,
    isPending: query.isPending,
    isError: query.isError,
    hasError: query.isError,
  };
}
