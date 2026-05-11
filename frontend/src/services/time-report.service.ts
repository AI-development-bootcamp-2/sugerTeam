import { apiClient } from './api';
import type {
  DailyReportDto,
  WorkCalendarDayDto,
  MonthLockDto,
  AbsenceDto,
} from '../types/time-report';

export function getDailyReports(
  userId: string,
  year: number,
  month: number,
): Promise<DailyReportDto[]> {
  return apiClient
    .get<DailyReportDto[]>('/api/v1/daily-reports', { params: { userId, year, month } })
    .then((r) => r.data);
}

export function getWorkCalendar(
  year: number,
  month: number,
): Promise<WorkCalendarDayDto[]> {
  return apiClient
    .get<WorkCalendarDayDto[]>('/api/v1/work-calendar', { params: { year, month } })
    .then((r) => r.data);
}

export function getMonthLock(year: number, month: number): Promise<MonthLockDto> {
  return apiClient
    .get<MonthLockDto>('/api/v1/month-locks', { params: { year, month } })
    .then((r) => r.data);
}

/**
 * Fetch absence records for the given user and month.
 *
 * Used to derive the `vacation` day status. This call is treated as optional:
 * if the endpoint is unavailable or returns an error, the rest of the page
 * continues to function and affected days degrade from `vacation` to `missing`.
 *
 * Endpoint: GET /api/v1/absences?userId=&year=&month=
 */
export function getAbsences(
  userId: string,
  year: number,
  month: number,
): Promise<AbsenceDto[]> {
  return apiClient
    .get<AbsenceDto[]>('/api/v1/absences', { params: { userId, year, month } })
    .then((r) => r.data);
}
