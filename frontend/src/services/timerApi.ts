import { apiClient } from './api';
import type { ActiveTimerDto, StoppedTimerDto } from '../types/time-report';

export function getActiveTimer(): Promise<ActiveTimerDto | null> {
  return apiClient.get<ActiveTimerDto | null>('/api/v1/timers').then((r) => r.data);
}

export function startTimer(): Promise<ActiveTimerDto> {
  return apiClient.post<ActiveTimerDto>('/api/v1/timers/start').then((r) => r.data);
}

export function stopTimer(): Promise<StoppedTimerDto> {
  return apiClient.delete<StoppedTimerDto>('/api/v1/timers').then((r) => r.data);
}
