import { describe, it, expect } from 'vitest';
import { formatElapsed, toMin, entryDtoToPayload } from '../pages/time-report/utils/timeUtils';
import { WorkLocation } from '../types/time-report';
import type { TimeEntryDto } from '../types/timeEntries';

// ─── formatElapsed ────────────────────────────────────────────────────────────

describe('formatElapsed', () => {
  it.each([
    [0,     '00:00'],
    [59,    '00:59'],
    [3600,  '1:00:00'],
    [3661,  '1:01:01'],
    [86399, '23:59:59'],
  ])('formatElapsed(%i) → "%s"', (seconds, expected) => {
    expect(formatElapsed(seconds)).toBe(expected);
  });
});

// ─── toMin ────────────────────────────────────────────────────────────────────

describe('toMin', () => {
  it.each([
    ['00:00',  0],
    ['09:30',  570],
    ['23:59',  1439],
  ])('toMin("%s") → %i', (hhmm, expected) => {
    expect(toMin(hhmm)).toBe(expected);
  });
});

// ─── entryDtoToPayload ────────────────────────────────────────────────────────

describe('entryDtoToPayload', () => {
  const dto: TimeEntryDto = {
    id:              'entry-1',
    workLocation:    WorkLocation.HOME,
    clientId:        'client-1',
    clientName:      'Acme',
    projectId:       'proj-1',
    projectName:     'Portal',
    taskId:          'task-1',
    taskName:        'Dev',
    startTime:       '09:00',
    endTime:         '17:30',
    durationMinutes: 510,
    description:     'Working on feature',
  };

  it('maps all required fields correctly', () => {
    expect(entryDtoToPayload(dto)).toEqual({
      workLocation: WorkLocation.HOME,
      clientId:     'client-1',
      projectId:    'proj-1',
      taskId:       'task-1',
      startTime:    '09:00',
      endTime:      '17:30',
      description:  'Working on feature',
    });
  });

  it('converts null description to undefined', () => {
    expect(entryDtoToPayload({ ...dto, description: null }).description).toBeUndefined();
  });
});
