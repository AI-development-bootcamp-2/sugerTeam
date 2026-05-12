import { DailyReportStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  upsertDayReport,
  deleteDayReport,
  getDropdownData,
  getMonthlySummary,
  ConflictError,
  LockedError,
  NotFoundError,
} from '../services/timeEntries.service';

// ─── Prisma mock ──────────────────────────────────────────────────────────────

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    monthLock:       { findUnique:         jest.fn() },
    dailyReport:     { findFirst: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    timeReportEntry: { updateMany: jest.fn(), createMany: jest.fn() },
    client:          { findMany: jest.fn() },
    workCalendarDay: { findMany: jest.fn() },
    absenceReport:   { findMany: jest.fn() },
    $transaction:    jest.fn(),
  },
}));

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const USER_ID = 'user-1';
const REPORT_DATE = '2025-05-12';

const baseEntry = {
  workLocation: 'OFFICE' as const,
  clientId:  'client-1',
  projectId: 'project-1',
  taskId:    'task-1',
  startTime: '08:00',
  endTime:   '12:00',
};

const baseDayInput = {
  reportDate: REPORT_DATE,
  startTime: '08:00',
  endTime:   '17:00',
  status: DailyReportStatus.DRAFT,
  entries: [baseEntry],
};

const mockReport = {
  id:          'report-1',
  reportDate:  new Date(Date.UTC(2025, 4, 12)),
  startTime:   new Date(Date.UTC(1970, 0, 1, 8, 0)),
  endTime:     new Date(Date.UTC(1970, 0, 1, 17, 0)),
  status:      DailyReportStatus.DRAFT,
  entries: [
    {
      id:              'entry-1',
      workLocation:    'OFFICE',
      clientId:        'client-1',
      client:          { name: 'Acme' },
      projectId:       'project-1',
      project:         { name: 'Portal' },
      taskId:          'task-1',
      task:            { name: 'Dev' },
      startTime:       new Date(Date.UTC(1970, 0, 1, 8, 0)),
      endTime:         new Date(Date.UTC(1970, 0, 1, 12, 0)),
      durationMinutes: 240,
      description:     null,
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default: month not locked
  jest.mocked(prisma.monthLock.findUnique).mockResolvedValue(null);
  // Default: $transaction executes callback with prisma (for interactive transactions)
  jest.mocked(prisma.$transaction).mockImplementation(
    async (arg: unknown) => {
      if (typeof arg === 'function') {
        return arg(prisma);
      }
      // batch transaction: just resolve
      return Promise.all(arg as Promise<unknown>[]);
    },
  );
});

// ─── upsertDayReport ──────────────────────────────────────────────────────────

describe('upsertDayReport', () => {
  it('creates a new report when none exists', async () => {
    jest.mocked(prisma.dailyReport.findFirst).mockResolvedValue(null);
    jest.mocked(prisma.dailyReport.create).mockResolvedValue({ id: 'report-new' } as never);
    jest.mocked(prisma.dailyReport.findUniqueOrThrow).mockResolvedValue(mockReport as never);

    const result = await upsertDayReport(USER_ID, baseDayInput);

    expect(prisma.dailyReport.create).toHaveBeenCalledTimes(1);
    expect(result.dailyReportId).toBe('report-1');
    expect(result.entries).toHaveLength(1);
    expect(result.startTime).toBe('08:00');
  });

  it('replaces entries on an existing DRAFT report', async () => {
    jest.mocked(prisma.dailyReport.findFirst).mockResolvedValue({
      id: 'report-1',
      status: DailyReportStatus.DRAFT,
    } as never);
    jest.mocked(prisma.dailyReport.findUniqueOrThrow).mockResolvedValue(mockReport as never);

    await upsertDayReport(USER_ID, baseDayInput);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // Within the transaction: soft-delete old entries, update report, create new entries
    expect(prisma.timeReportEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { dailyReportId: 'report-1', deletedAt: null } }),
    );
    expect(prisma.timeReportEntry.createMany).toHaveBeenCalledTimes(1);
  });

  it('throws LockedError (423) when month is locked', async () => {
    jest.mocked(prisma.monthLock.findUnique).mockResolvedValue({
      isLocked: true,
    } as never);

    await expect(upsertDayReport(USER_ID, baseDayInput)).rejects.toBeInstanceOf(LockedError);
    await expect(upsertDayReport(USER_ID, baseDayInput)).rejects.toMatchObject({ status: 423 });
  });

  it('throws ConflictError (409) when report is already SUBMITTED', async () => {
    jest.mocked(prisma.dailyReport.findFirst).mockResolvedValue({
      id: 'report-1',
      status: DailyReportStatus.SUBMITTED,
    } as never);

    await expect(upsertDayReport(USER_ID, baseDayInput)).rejects.toBeInstanceOf(ConflictError);
    await expect(upsertDayReport(USER_ID, baseDayInput)).rejects.toMatchObject({ status: 409 });
  });

  it('computes durationMinutes from startTime/endTime', async () => {
    jest.mocked(prisma.dailyReport.findFirst).mockResolvedValue(null);
    jest.mocked(prisma.dailyReport.create).mockResolvedValue({ id: 'report-new' } as never);
    jest.mocked(prisma.dailyReport.findUniqueOrThrow).mockResolvedValue(mockReport as never);

    await upsertDayReport(USER_ID, baseDayInput);

    const createCall = jest.mocked(prisma.dailyReport.create).mock.calls[0][0];
    const entryCreated = (createCall.data as { entries: { create: { durationMinutes: number }[] } }).entries.create[0];
    expect(entryCreated.durationMinutes).toBe(240); // 08:00 → 12:00 = 4h = 240min
  });
});

// ─── deleteDayReport ──────────────────────────────────────────────────────────

describe('deleteDayReport', () => {
  it('soft-deletes report and entries', async () => {
    jest.mocked(prisma.dailyReport.findFirst).mockResolvedValue({
      id: 'report-1',
      status: DailyReportStatus.DRAFT,
    } as never);

    await deleteDayReport(USER_ID, REPORT_DATE);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.timeReportEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { dailyReportId: 'report-1' }, data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
    );
    expect(prisma.dailyReport.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'report-1' }, data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
    );
  });

  it('throws NotFoundError (404) when report does not exist', async () => {
    jest.mocked(prisma.dailyReport.findFirst).mockResolvedValue(null);

    await expect(deleteDayReport(USER_ID, REPORT_DATE)).rejects.toBeInstanceOf(NotFoundError);
    await expect(deleteDayReport(USER_ID, REPORT_DATE)).rejects.toMatchObject({ status: 404 });
  });

  it('throws ConflictError (409) when report is SUBMITTED', async () => {
    jest.mocked(prisma.dailyReport.findFirst).mockResolvedValue({
      id: 'report-1',
      status: DailyReportStatus.SUBMITTED,
    } as never);

    await expect(deleteDayReport(USER_ID, REPORT_DATE)).rejects.toBeInstanceOf(ConflictError);
    await expect(deleteDayReport(USER_ID, REPORT_DATE)).rejects.toMatchObject({ status: 409 });
  });

  it('throws LockedError (423) when month is locked', async () => {
    jest.mocked(prisma.monthLock.findUnique).mockResolvedValue({ isLocked: true } as never);

    await expect(deleteDayReport(USER_ID, REPORT_DATE)).rejects.toBeInstanceOf(LockedError);
  });
});

// ─── getDropdownData ──────────────────────────────────────────────────────────

describe('getDropdownData', () => {
  it('returns nested client → project → task hierarchy', async () => {
    jest.mocked(prisma.client.findMany).mockResolvedValue([
      {
        id: 'c1', name: 'Acme',
        projects: [
          {
            id: 'p1', name: 'Portal',
            tasks: [{ id: 't1', name: 'Dev' }],
          },
        ],
      },
    ] as never);

    const result = await getDropdownData(USER_ID);

    expect(result.clients).toHaveLength(1);
    expect(result.clients[0].projects[0].tasks[0].id).toBe('t1');
  });

  it('filters by ACTIVE clients and OPEN tasks with user assignment OR no assignment', async () => {
    jest.mocked(prisma.client.findMany).mockResolvedValue([]);

    await getDropdownData(USER_ID);

    expect(prisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ACTIVE' }),
        include: expect.objectContaining({
          projects: expect.objectContaining({
            include: expect.objectContaining({
              tasks: expect.objectContaining({
                where: expect.objectContaining({
                  status: 'OPEN',
                  OR: [
                    { assignments: { none: {} } },
                    { assignments: { some: { userId: USER_ID } } },
                  ],
                }),
              }),
            }),
          }),
        }),
      }),
    );
  });
});

// ─── getMonthlySummary ────────────────────────────────────────────────────────

describe('getMonthlySummary', () => {
  it('returns correct counts with mixed report statuses', async () => {
    jest.mocked(prisma.dailyReport.findMany).mockResolvedValue([
      { status: DailyReportStatus.SUBMITTED, reportDate: new Date(Date.UTC(2025, 4, 1)), entries: [{ durationMinutes: 480 }] },
      { status: DailyReportStatus.DRAFT,     reportDate: new Date(Date.UTC(2025, 4, 2)), entries: [{ durationMinutes: 240 }] },
    ] as never);

    jest.mocked(prisma.workCalendarDay.findMany).mockResolvedValue([
      { date: new Date(Date.UTC(2025, 4, 1)), standardHours: 8 },
      { date: new Date(Date.UTC(2025, 4, 2)), standardHours: 8 },
      { date: new Date(Date.UTC(2025, 4, 5)), standardHours: 8 }, // missing day
    ] as never);

    jest.mocked(prisma.absenceReport.findMany).mockResolvedValue([]);

    const result = await getMonthlySummary(USER_ID, 2025, 5);

    expect(result.submittedDays).toBe(1);
    expect(result.draftDays).toBe(1);
    expect(result.missingDays).toBe(1);
    expect(result.totalReportedMinutes).toBe(720);
    expect(result.expectedWorkingMinutes).toBe(1440); // 3 days × 8h × 60
    expect(result.absenceDays).toBe(0);
  });
});
