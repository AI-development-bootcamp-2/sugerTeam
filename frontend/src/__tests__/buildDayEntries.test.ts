import { describe, it, expect } from 'vitest';
import { buildDayEntries } from '../pages/time-report/hooks/useDayEntries';
import type { DailyReportDto, WorkCalendarDayDto, AbsenceDto } from '../types/time-report';
import {
  AbsenceStatus,
  AbsenceType,
  CalendarDayType,
  DailyReportStatus,
  WorkLocation,
} from '../types/time-report';

// ─── Factories ────────────────────────────────────────────────────────────────

function calDay(date: string, overrides: Partial<WorkCalendarDayDto> = {}): WorkCalendarDayDto {
  return {
    date,
    dayType: CalendarDayType.REGULAR,
    isWorkingDay: true,
    standardHours: 9,
    description: null,
    ...overrides,
  };
}

function report(date: string, totalMinutes = 540): DailyReportDto {
  return {
    id: `r-${date}`,
    userId: 'u1',
    reportDate: date,
    startTime: '09:00',
    endTime: '18:00',
    status: DailyReportStatus.SUBMITTED,
    entries: [],
    totalMinutes,
  };
}

function absence(
  start: string,
  end: string,
  type: AbsenceType = AbsenceType.VACATION,
): AbsenceDto {
  return {
    id: 'a1',
    userId: 'u1',
    absenceType: type,
    startDate: start,
    endDate: end,
    isPartial: false,
    partialDurationHours: null,
    calculatedAbsenceDays: 1,
    status: AbsenceStatus.SUBMITTED,
  };
}

// May 2026: May 1 = Friday. Used as the anchor to fix year/month detection.
const ANCHOR = calDay('2026-05-01');

function findDay(entries: ReturnType<typeof buildDayEntries>, date: string) {
  const day = entries.find((e) => e.date === date);
  if (!day) throw new Error(`No entry for ${date}`);
  return day;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildDayEntries', () => {
  it('returns empty array when workCalendarDays is empty', () => {
    expect(buildDayEntries([], [], [], new Date('2026-05-08'))).toEqual([]);
  });

  it('past working day with sufficient hours → filled', () => {
    // May 4 = Monday, today = May 8
    const days = buildDayEntries(
      [report('2026-05-04', 540)],
      [ANCHOR, calDay('2026-05-04')],
      [],
      new Date('2026-05-08T00:00:00'),
    );
    expect(findDay(days, '2026-05-04').displayStatus).toBe('filled');
  });

  it('today with reported minutes > 0 → open', () => {
    const days = buildDayEntries(
      [report('2026-05-05', 120)],
      [ANCHOR, calDay('2026-05-05')],
      [],
      new Date('2026-05-05T00:00:00'),
    );
    expect(findDay(days, '2026-05-05').displayStatus).toBe('open');
  });

  it('past working day with no report and no absence → missing', () => {
    const days = buildDayEntries(
      [],
      [ANCHOR, calDay('2026-05-04')],
      [],
      new Date('2026-05-08T00:00:00'),
    );
    expect(findDay(days, '2026-05-04').displayStatus).toBe('missing');
  });

  it('holiday day → holiday (even with no report)', () => {
    const days = buildDayEntries(
      [],
      [
        ANCHOR,
        calDay('2026-05-04', {
          dayType: CalendarDayType.HOLIDAY,
          isWorkingDay: false,
          standardHours: 0,
        }),
      ],
      [],
      new Date('2026-05-08T00:00:00'),
    );
    expect(findDay(days, '2026-05-04').displayStatus).toBe('holiday');
  });

  it('weekend day → weekend', () => {
    const days = buildDayEntries(
      [],
      [
        ANCHOR,
        calDay('2026-05-02', {
          dayType: CalendarDayType.WEEKEND,
          isWorkingDay: false,
          standardHours: 0,
        }),
      ],
      [],
      new Date('2026-05-08T00:00:00'),
    );
    expect(findDay(days, '2026-05-02').displayStatus).toBe('weekend');
  });

  it('working day covered by VACATION absence → vacation', () => {
    const days = buildDayEntries(
      [],
      [ANCHOR, calDay('2026-05-04')],
      [absence('2026-05-04', '2026-05-04', AbsenceType.VACATION)],
      new Date('2026-05-08T00:00:00'),
    );
    expect(findDay(days, '2026-05-04').displayStatus).toBe('vacation');
  });

  it('future working day → displayStatus is null', () => {
    const days = buildDayEntries(
      [],
      [ANCHOR, calDay('2026-05-08')],
      [],
      new Date('2026-05-05T00:00:00'),
    );
    expect(findDay(days, '2026-05-08').displayStatus).toBeNull();
  });

  it('priority: holiday beats vacation absence on same day', () => {
    const days = buildDayEntries(
      [],
      [
        ANCHOR,
        calDay('2026-05-04', {
          dayType: CalendarDayType.HOLIDAY,
          isWorkingDay: false,
          standardHours: 0,
        }),
      ],
      [absence('2026-05-04', '2026-05-04', AbsenceType.VACATION)],
      new Date('2026-05-08T00:00:00'),
    );
    expect(findDay(days, '2026-05-04').displayStatus).toBe('holiday');
  });

  it('priority: vacation beats missing (0 minutes + absence = vacation, not missing)', () => {
    const days = buildDayEntries(
      [],
      [ANCHOR, calDay('2026-05-04')],
      [absence('2026-05-04', '2026-05-04', AbsenceType.VACATION)],
      new Date('2026-05-08T00:00:00'),
    );
    const day = findDay(days, '2026-05-04');
    expect(day.displayStatus).toBe('vacation');
  });

  it('result is sorted descending by date', () => {
    const days = buildDayEntries([], [ANCHOR], [], new Date('2026-05-08T00:00:00'));
    expect(days[0].date).toBe('2026-05-31');
    expect(days[days.length - 1].date).toBe('2026-05-01');
  });

  it('non-VACATION absence type does not trigger vacation status', () => {
    const days = buildDayEntries(
      [],
      [ANCHOR, calDay('2026-05-04')],
      [absence('2026-05-04', '2026-05-04', AbsenceType.SICK_LEAVE)],
      new Date('2026-05-08T00:00:00'),
    );
    expect(findDay(days, '2026-05-04').displayStatus).toBe('absence');
  });

  it('multi-day absence range expands correctly', () => {
    const days = buildDayEntries(
      [],
      [ANCHOR, calDay('2026-05-04'), calDay('2026-05-05'), calDay('2026-05-06')],
      [absence('2026-05-04', '2026-05-06', AbsenceType.VACATION)],
      new Date('2026-05-08T00:00:00'),
    );
    expect(findDay(days, '2026-05-04').displayStatus).toBe('vacation');
    expect(findDay(days, '2026-05-05').displayStatus).toBe('vacation');
    expect(findDay(days, '2026-05-06').displayStatus).toBe('vacation');
  });

  it('derivedEntry carries correct reportedMinutes and entries', () => {
    const mockEntry = {
      id: 'e1',
      dailyReportId: 'r1',
      workLocation: WorkLocation.OFFICE,
      clientId: 'c1',
      clientName: 'Client',
      projectId: 'p1',
      projectName: 'Project',
      taskId: 't1',
      taskName: 'Task',
      startTime: '09:00',
      endTime: '18:00',
      durationMinutes: 540,
      description: null,
    };
    const r = { ...report('2026-05-04', 540), entries: [mockEntry] };
    const days = buildDayEntries(
      [r],
      [ANCHOR, calDay('2026-05-04')],
      [],
      new Date('2026-05-08T00:00:00'),
    );
    const day = findDay(days, '2026-05-04');
    expect(day.reportedMinutes).toBe(540);
    expect(day.entries).toHaveLength(1);
    expect(day.entries[0].taskName).toBe('Task');
  });
});
