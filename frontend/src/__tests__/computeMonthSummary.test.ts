import { describe, it, expect } from 'vitest';
import { computeMonthSummary } from '../pages/time-report/hooks/useDayEntries';
import type { DayEntry, TimeReportEntryDto } from '../types/time-report';
import { AbsenceType, CalendarDayType, WorkLocation } from '../types/time-report';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeDay(overrides: Partial<DayEntry> = {}): DayEntry {
  return {
    date: '2026-05-01',
    dayOfWeek: 5,
    isWorkingDay: true,
    dayType: CalendarDayType.REGULAR,
    standardMinutes: 540,
    reportedMinutes: 540,
    entries: [],
    hasAbsence: false,
    absenceType: null,
    isToday: false,
    isFuture: false,
    displayStatus: 'filled',
    ...overrides,
  };
}

function makeEntry(taskName: string, durationMinutes: number): TimeReportEntryDto {
  return {
    id: `e-${taskName}`,
    dailyReportId: 'r1',
    workLocation: WorkLocation.OFFICE,
    clientId: 'c1',
    clientName: 'Client',
    projectId: 'p1',
    projectName: 'Project',
    taskId: `t-${taskName}`,
    taskName,
    startTime: '09:00',
    endTime: '18:00',
    durationMinutes,
    description: null,
  };
}

// Build N identical filled working days
function filledDays(n: number): DayEntry[] {
  return Array.from({ length: n }, (_, i) =>
    makeDay({ date: `2026-05-${String(i + 1).padStart(2, '0')}` }),
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('computeMonthSummary', () => {
  it('all working days filled: completionPct = 100, daysMissing = 0', () => {
    const summary = computeMonthSummary(filledDays(20));
    expect(summary.completionPct).toBe(100);
    expect(summary.daysMissing).toBe(0);
    expect(summary.reportedMinutes).toBe(20 * 540);
    expect(summary.standardMinutes).toBe(20 * 540);
  });

  it('all working days missing: reportedMinutes = 0, completionPct = 0', () => {
    const days = Array.from({ length: 20 }, (_, i) =>
      makeDay({
        date: `2026-05-${String(i + 1).padStart(2, '0')}`,
        reportedMinutes: 0,
        displayStatus: 'missing',
      }),
    );
    const summary = computeMonthSummary(days);
    expect(summary.reportedMinutes).toBe(0);
    expect(summary.completionPct).toBe(0);
    expect(summary.daysMissing).toBe(20);
  });

  it('mixed month: daysMissing counts only missing-status days', () => {
    const days = [
      makeDay({ date: '2026-05-04', displayStatus: 'filled', reportedMinutes: 540 }),
      makeDay({ date: '2026-05-05', displayStatus: 'missing', reportedMinutes: 0 }),
      makeDay({ date: '2026-05-06', displayStatus: 'missing', reportedMinutes: 0 }),
      makeDay({
        date: '2026-05-07',
        displayStatus: 'weekend',
        isWorkingDay: false,
        standardMinutes: 0,
        reportedMinutes: 0,
      }),
    ];
    const summary = computeMonthSummary(days);
    expect(summary.daysMissing).toBe(2);
  });

  it('weekend and holiday days do not count toward standardMinutes', () => {
    const days = [
      makeDay({ date: '2026-05-04', displayStatus: 'filled', reportedMinutes: 540 }),
      makeDay({
        date: '2026-05-03',
        isWorkingDay: false,
        dayType: CalendarDayType.WEEKEND,
        standardMinutes: 0,
        reportedMinutes: 0,
        displayStatus: 'weekend',
      }),
    ];
    const summary = computeMonthSummary(days);
    expect(summary.standardMinutes).toBe(540); // only the working day
    expect(summary.completionPct).toBe(100);
  });

  it('standardMinutes = 0 (all holidays): completionPct = 0, no division by zero', () => {
    const days = [
      makeDay({
        date: '2026-05-04',
        isWorkingDay: false,
        dayType: CalendarDayType.HOLIDAY,
        standardMinutes: 0,
        reportedMinutes: 0,
        displayStatus: 'holiday',
      }),
    ];
    expect(() => computeMonthSummary(days)).not.toThrow();
    expect(computeMonthSummary(days).completionPct).toBe(0);
  });

  it('completionPct is capped at 100 when reportedMinutes > standardMinutes', () => {
    const days = [makeDay({ reportedMinutes: 1000, standardMinutes: 540 })];
    expect(computeMonthSummary(days).completionPct).toBe(100);
  });

  it('project breakdown is sorted descending by total minutes', () => {
    const days = [
      makeDay({
        entries: [makeEntry('Alpha', 120), makeEntry('Beta', 300), makeEntry('Gamma', 60)],
      }),
    ];
    const { projectBreakdown } = computeMonthSummary(days);
    expect(projectBreakdown[0].name).toBe('Beta');
    expect(projectBreakdown[1].name).toBe('Alpha');
    expect(projectBreakdown[2].name).toBe('Gamma');
  });

  it('project breakdown aggregates same task name across multiple days', () => {
    const days = [
      makeDay({ date: '2026-05-04', entries: [makeEntry('Alpha', 200)] }),
      makeDay({ date: '2026-05-05', entries: [makeEntry('Alpha', 150)] }),
    ];
    const { projectBreakdown } = computeMonthSummary(days);
    expect(projectBreakdown[0].name).toBe('Alpha');
    expect(projectBreakdown[0].minutes).toBe(350);
  });

  it('project breakdown returns at most 10 entries', () => {
    const entries = Array.from({ length: 15 }, (_, i) => makeEntry(`Task${i}`, 60));
    const days = [makeDay({ entries })];
    expect(computeMonthSummary(days).projectBreakdown).toHaveLength(10);
  });

  it('absenceMinutes approximates vacation days using their standardMinutes', () => {
    const days = [
      makeDay({
        date: '2026-05-04',
        hasAbsence: true,
        absenceType: AbsenceType.VACATION,
        displayStatus: 'vacation',
        standardMinutes: 540,
        reportedMinutes: 0,
      }),
    ];
    expect(computeMonthSummary(days).absenceMinutes).toBe(540);
  });
});
