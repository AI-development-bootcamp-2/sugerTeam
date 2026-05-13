import type { TimeEntryDto, EntryPayload, DayDto, DayReportPayload } from '../../../types/timeEntries';
import type { WorkLocation } from '../../../types/time-report';
import { DailyReportStatus } from '../../../types/time-report';

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

// T013 — pure merge logic consumed by TimeReportPage.handleTimerConfirm
export function buildDayPayload(
  newEntry: EntryPayload,
  today: string,
  existingDay: DayDto | undefined,
  timerStart: Date,
  timerStop: Date,
): DayReportPayload {
  const timerStartHHMM = formatTime(timerStart);
  const timerStopHHMM  = formatTime(timerStop);

  let startTime = timerStartHHMM;
  let endTime   = timerStopHHMM;

  if (existingDay?.startTime) {
    startTime = toMin(existingDay.startTime) <= toMin(timerStartHHMM)
      ? existingDay.startTime
      : timerStartHHMM;
  }
  if (existingDay?.endTime) {
    endTime = toMin(existingDay.endTime) >= toMin(timerStopHHMM)
      ? existingDay.endTime
      : timerStopHHMM;
  }

  return {
    reportDate: today,
    startTime,
    endTime,
    status:  existingDay?.status  ?? DailyReportStatus.DRAFT,
    entries: [
      ...(existingDay?.entries ?? []).map(entryDtoToPayload),
      newEntry,
    ],
  };
}
