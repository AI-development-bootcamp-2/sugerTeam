import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DayList from '../pages/time-report/components/DayList';
import type { DayEntry, TimeReportEntryDto } from '../types/time-report';
import { AbsenceType, CalendarDayType, WorkLocation } from '../types/time-report';

// ─── Factories ────────────────────────────────────────────────────────────────
// Dates are in January 2026 to avoid matching today's real date
// (DayList initialises expandedDate to todayStr which is ~May 2026).

function makeEntry(id: string): TimeReportEntryDto {
  return {
    id,
    dailyReportId: `r-${id}`,
    workLocation: WorkLocation.OFFICE,
    clientId: 'c1',
    clientName: 'Client A',
    projectId: 'p1',
    projectName: 'Project A',
    taskId: 't1',
    taskName: 'Task A',
    startTime: '09:00',
    endTime: '18:00',
    durationMinutes: 540,
    description: null,
  };
}

// Jan 5, 2026 = Monday. Working day with one entry (interactive).
const workingDay1: DayEntry = {
  date: '2026-01-05',
  dayOfWeek: 1,
  isWorkingDay: true,
  dayType: CalendarDayType.REGULAR,
  standardMinutes: 540,
  reportedMinutes: 540,
  entries: [makeEntry('e1')],
  hasAbsence: false,
  absenceType: null,
  isToday: false,
  isFuture: false,
  displayStatus: 'filled',
};

// Jan 6, 2026 = Tuesday. Second interactive card.
const workingDay2: DayEntry = {
  ...workingDay1,
  date: '2026-01-06',
  dayOfWeek: 2,
  entries: [makeEntry('e2')],
};

// Jan 3, 2026 = Saturday. Weekend — not interactive.
const weekendDay: DayEntry = {
  date: '2026-01-03',
  dayOfWeek: 6,
  isWorkingDay: false,
  dayType: CalendarDayType.WEEKEND,
  standardMinutes: 0,
  reportedMinutes: 0,
  entries: [],
  hasAbsence: false,
  absenceType: null,
  isToday: false,
  isFuture: false,
  displayStatus: 'weekend',
};

// Jan 7, 2026 = Wednesday. Past working day, no entries — not interactive.
const missingDay: DayEntry = {
  date: '2026-01-07',
  dayOfWeek: 3,
  isWorkingDay: true,
  dayType: CalendarDayType.REGULAR,
  standardMinutes: 540,
  reportedMinutes: 0,
  entries: [],
  hasAbsence: false,
  absenceType: null,
  isToday: false,
  isFuture: false,
  displayStatus: 'missing',
};

// Vacation day — has absence, no entries — not interactive.
const vacationDay: DayEntry = {
  date: '2026-01-08',
  dayOfWeek: 4,
  isWorkingDay: true,
  dayType: CalendarDayType.REGULAR,
  standardMinutes: 540,
  reportedMinutes: 0,
  entries: [],
  hasAbsence: true,
  absenceType: AbsenceType.VACATION,
  isToday: false,
  isFuture: false,
  displayStatus: 'vacation',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBody(header: HTMLElement): HTMLElement {
  return header.nextElementSibling as HTMLElement;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('DayCard accordion (rendered via DayList)', () => {
  it('expandable card body starts collapsed', () => {
    render(<DayList dayEntries={[workingDay1]} isLocked={false} />);
    const header = screen.getByRole('button');
    expect(getBody(header).style.maxHeight).not.toBe('800px');
  });

  it('clicking expandable header opens the body', () => {
    render(<DayList dayEntries={[workingDay1]} isLocked={false} />);
    const header = screen.getByRole('button');
    fireEvent.click(header);
    expect(getBody(header).style.maxHeight).toBe('800px');
  });

  it('clicking the same expandable header again collapses it', () => {
    render(<DayList dayEntries={[workingDay1]} isLocked={false} />);
    const header = screen.getByRole('button');
    fireEvent.click(header);
    expect(getBody(header).style.maxHeight).toBe('800px');
    fireEvent.click(header);
    expect(getBody(header).style.maxHeight).not.toBe('800px');
  });

  it('opening a second card collapses the first (single-expand)', () => {
    render(<DayList dayEntries={[workingDay1, workingDay2]} isLocked={false} />);
    const [header1, header2] = screen.getAllByRole('button');
    const body1 = getBody(header1);
    const body2 = getBody(header2);

    fireEvent.click(header1);
    expect(body1.style.maxHeight).toBe('800px');
    expect(body2.style.maxHeight).not.toBe('800px');

    fireEvent.click(header2);
    expect(body2.style.maxHeight).toBe('800px');
    expect(body1.style.maxHeight).not.toBe('800px');
  });

  it('non-interactive cards (weekend, missing, vacation) have no button role', () => {
    render(
      <DayList
        dayEntries={[workingDay1, weekendDay, missingDay, vacationDay]}
        isLocked={false}
      />,
    );
    // Only workingDay1 has entries and is interactive
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
  });

  it('clicking non-interactive card (weekend) does not expand any body', () => {
    render(<DayList dayEntries={[weekendDay, workingDay1]} isLocked={false} />);
    // Find weekend card date label and click it
    const weekendText = screen.getByText(/שבת/);
    fireEvent.click(weekendText);
    // workingDay1 header is still collapsed (it was not clicked)
    const header1 = screen.getByRole('button');
    expect(getBody(header1).style.maxHeight).not.toBe('800px');
  });

  describe('locked state', () => {
    it('edit link (עריכה) is absent from the DOM', () => {
      render(<DayList dayEntries={[workingDay1]} isLocked={true} />);
      expect(screen.queryByText('עריכה')).not.toBeInTheDocument();
    });

    it('add-report row (הוספת דיווח +) is absent from the DOM', () => {
      render(<DayList dayEntries={[workingDay1]} isLocked={true} />);
      expect(screen.queryByText('הוספת דיווח +')).not.toBeInTheDocument();
    });

    it('card is still expandable when locked (read access)', () => {
      render(<DayList dayEntries={[workingDay1]} isLocked={true} />);
      const header = screen.getByRole('button');
      fireEvent.click(header);
      expect(getBody(header).style.maxHeight).toBe('800px');
    });

    it('unlocked card shows edit link and add-report row', () => {
      render(<DayList dayEntries={[workingDay1]} isLocked={false} />);
      expect(screen.getByText('עריכה')).toBeInTheDocument();
      expect(screen.getByText('הוספת דיווח +')).toBeInTheDocument();
    });
  });
});
