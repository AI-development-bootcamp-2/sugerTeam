import type { TimeEntryDto, EntryPayload } from '../../../types/timeEntries';
import type { WorkLocation } from '../../../types/time-report';

export function formatElapsed(seconds: number): string {
  const h  = Math.floor(seconds / 3600);
  const m  = Math.floor((seconds % 3600) / 60);
  const s  = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function toMin(hhmm: string): number {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

export function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function entryDtoToPayload(dto: TimeEntryDto): EntryPayload {
  return {
    workLocation: dto.workLocation as WorkLocation,
    clientId:     dto.clientId,
    projectId:    dto.projectId,
    taskId:       dto.taskId,
    startTime:    dto.startTime,
    endTime:      dto.endTime,
    description:  dto.description ?? undefined,
  };
}

