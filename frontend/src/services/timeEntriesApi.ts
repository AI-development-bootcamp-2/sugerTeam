import { apiClient } from './api';
import type {
  MonthlyDaysResponse,
  DropdownDataResponse,
  MonthlySummaryResponse,
  DayReportPayload,
  DayDto,
} from '../types/timeEntries';

export function getMonthlyDays(year: number, month: number): Promise<MonthlyDaysResponse> {
  return apiClient
    .get<MonthlyDaysResponse>('/api/v1/time-entries', { params: { year, month } })
    .then((r) => r.data);
}

export function getDropdownData(): Promise<DropdownDataResponse> {
  return apiClient
    .get<DropdownDataResponse>('/api/v1/time-entries/dropdown-data')
    .then((r) => r.data);
}

export function getMonthlySummary(year: number, month: number): Promise<MonthlySummaryResponse> {
  return apiClient
    .get<MonthlySummaryResponse>('/api/v1/time-entries/monthly-summary', {
      params: { year, month },
    })
    .then((r) => r.data);
}

export function createDayReport(payload: DayReportPayload): Promise<DayDto> {
  return apiClient
    .post<DayDto>('/api/v1/time-entries', payload)
    .then((r) => r.data);
}

export function updateDayReport(reportDate: string, payload: DayReportPayload): Promise<DayDto> {
  return apiClient
    .put<DayDto>(`/api/v1/time-entries/${reportDate}`, payload)
    .then((r) => r.data);
}

export function deleteDayReport(reportDate: string): Promise<void> {
  return apiClient
    .delete(`/api/v1/time-entries/${reportDate}`)
    .then(() => undefined);
}
