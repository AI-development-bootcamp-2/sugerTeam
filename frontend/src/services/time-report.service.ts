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
 * Response shape: `AbsenceDto[]` — each record includes `startDate`, `endDate`,
 * `absenceType`, and `calculatedAbsenceDays` (Fri/Sat excluded).
 *
 * This call is treated as optional: if the endpoint is unavailable or returns
 * an error, the page continues to function and days that would have shown
 * `vacation` status degrade to `missing` instead.
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
