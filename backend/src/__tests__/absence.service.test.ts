import { AbsenceStatus, AbsenceType, UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  calculateAbsenceDays,
  createAbsence,
  deleteAbsence,
  deleteAbsenceDocument,
  ForbiddenError,
  MonthLockedError,
  NotFoundError,
  updateAbsence,
  uploadAbsenceDocument,
  ValidationError,
} from '../services/absence.service';
import { fileStorageService } from '../services/file-storage.service';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    absenceReport: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    absenceDocument: {
      count: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    monthLock: {
      findUnique: jest.fn(),
    },
    dailyReport: {
      findMany: jest.fn(),
    },
    workCalendarDay: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

jest.mock('../services/file-storage.service', () => ({
  fileStorageService: {
    saveFile: jest.fn(),
    deleteFile: jest.fn(),
  },
}));

const lockMock = jest.mocked(prisma.monthLock.findUnique);
const reportCreateMock = jest.mocked(prisma.absenceReport.create);
const reportFindUniqueMock = jest.mocked(prisma.absenceReport.findUnique);
const reportFindFirstMock = jest.mocked(prisma.absenceReport.findFirst);
const reportUpdateMock = jest.mocked(prisma.absenceReport.update);
const dailyReportFindManyMock = jest.mocked(prisma.dailyReport.findMany);
const workCalendarFindManyMock = jest.mocked(prisma.workCalendarDay.findMany);
const docCountMock = jest.mocked(prisma.absenceDocument.count);
const docFindFirstMock = jest.mocked(prisma.absenceDocument.findFirst);
const docCreateMock = jest.mocked(prisma.absenceDocument.create);
const docDeleteMock = jest.mocked(prisma.absenceDocument.delete);
const storageSaveMock = jest.mocked(fileStorageService.saveFile);
const storageDeleteMock = jest.mocked(fileStorageService.deleteFile);

const ownerId = 'user-1';
const otherId = 'user-2';
const absenceId = 'abs-1';

function baseAbsence(overrides: Partial<{ startDate: Date; endDate: Date }> = {}) {
  return {
    id: absenceId,
    userId: ownerId,
    absenceType: AbsenceType.VACATION,
    startDate: overrides.startDate ?? new Date(Date.UTC(2026, 4, 4)), // 2026-05-04, Mon
    endDate:   overrides.endDate   ?? new Date(Date.UTC(2026, 4, 6)), // 2026-05-06, Wed
    isPartial: false,
    partialDurationHours: null,
    calculatedAbsenceDays: 3,
    status: AbsenceStatus.SUBMITTED,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Safe defaults: no work entries, no calendar overrides
  dailyReportFindManyMock.mockResolvedValue([] as never);
  workCalendarFindManyMock.mockResolvedValue([] as never);
});

describe('calculateAbsenceDays', () => {
  it('skips Fri/Sat (Israeli weekend)', () => {
    // 2026-05-01 Fri → 2026-05-07 Thu → 5 working days
    const start = new Date(Date.UTC(2026, 4, 1));
    const end   = new Date(Date.UTC(2026, 4, 7));
    expect(calculateAbsenceDays(start, end)).toBe(5);
  });

  it('returns 1 for a single weekday', () => {
    const d = new Date(Date.UTC(2026, 4, 4)); // Mon
    expect(calculateAbsenceDays(d, d)).toBe(1);
  });

  it('returns 0 when range is entirely weekend', () => {
    const fri = new Date(Date.UTC(2026, 4, 1));
    const sat = new Date(Date.UTC(2026, 4, 2));
    expect(calculateAbsenceDays(fri, sat)).toBe(0);
  });
});

describe('createAbsence', () => {
  it('rejects endDate before startDate', async () => {
    await expect(
      createAbsence(
        {
          userId: ownerId,
          absenceType: AbsenceType.VACATION,
          startDate: '2026-05-10',
          endDate:   '2026-05-09',
          isPartial: false,
        },
        UserRole.EMPLOYEE,
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(reportCreateMock).not.toHaveBeenCalled();
  });

  it('throws MonthLockedError when the start month is locked', async () => {
    lockMock.mockResolvedValueOnce({ year: 2026, month: 5, isLocked: true } as never);

    await expect(
      createAbsence(
        {
          userId: ownerId,
          absenceType: AbsenceType.VACATION,
          startDate: '2026-05-04',
          endDate:   '2026-05-06',
          isPartial: false,
        },
        UserRole.EMPLOYEE,
      ),
    ).rejects.toBeInstanceOf(MonthLockedError);
  });

  it('throws MonthLockedError when only the end month is locked (range spans months)', async () => {
    // start month (Apr) unlocked, end month (May) locked
    lockMock
      .mockResolvedValueOnce({ year: 2026, month: 4, isLocked: false } as never)
      .mockResolvedValueOnce({ year: 2026, month: 5, isLocked: true } as never);

    await expect(
      createAbsence(
        {
          userId: ownerId,
          absenceType: AbsenceType.VACATION,
          startDate: '2026-04-29',
          endDate:   '2026-05-04',
          isPartial: false,
        },
        UserRole.EMPLOYEE,
      ),
    ).rejects.toBeInstanceOf(MonthLockedError);
    expect(lockMock).toHaveBeenCalledTimes(2);
  });

  it('admins bypass the month lock', async () => {
    lockMock.mockResolvedValue({ year: 2026, month: 5, isLocked: true } as never);
    reportCreateMock.mockResolvedValue(baseAbsence());

    await createAbsence(
      {
        userId: ownerId,
        absenceType: AbsenceType.VACATION,
        startDate: '2026-05-04',
        endDate:   '2026-05-06',
        isPartial: false,
      },
      UserRole.ADMIN,
    );

    expect(lockMock).not.toHaveBeenCalled();
    expect(reportCreateMock).toHaveBeenCalled();
  });

  it('rejects when an overlapping absence already exists for the same user', async () => {
    lockMock.mockResolvedValue({ year: 2026, month: 5, isLocked: false } as never);
    reportFindFirstMock.mockResolvedValueOnce({ id: 'existing-1' } as never);

    await expect(
      createAbsence(
        {
          userId: ownerId,
          absenceType: AbsenceType.VACATION,
          startDate: '2026-05-04',
          endDate:   '2026-05-06',
          isPartial: false,
        },
        UserRole.EMPLOYEE,
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(reportCreateMock).not.toHaveBeenCalled();
  });

  it('allows creation when no overlap exists', async () => {
    lockMock.mockResolvedValue({ year: 2026, month: 5, isLocked: false } as never);
    reportFindFirstMock.mockResolvedValueOnce(null);
    reportCreateMock.mockResolvedValue(baseAbsence());

    await createAbsence(
      {
        userId: ownerId,
        absenceType: AbsenceType.VACATION,
        startDate: '2026-05-04',
        endDate:   '2026-05-06',
        isPartial: false,
      },
      UserRole.EMPLOYEE,
    );

    expect(reportFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: ownerId, deletedAt: null }),
      }),
    );
    expect(reportCreateMock).toHaveBeenCalled();
  });

  it('rejects a FULL absence when work entries exist on any covered date', async () => {
    lockMock.mockResolvedValue({ year: 2026, month: 5, isLocked: false } as never);
    reportFindFirstMock.mockResolvedValueOnce(null); // no overlap with other absences
    dailyReportFindManyMock.mockResolvedValueOnce([
      {
        reportDate: new Date(Date.UTC(2026, 4, 5)),
        entries: [{ durationMinutes: 120 }],
      },
    ] as never);

    await expect(
      createAbsence(
        {
          userId: ownerId,
          absenceType: AbsenceType.VACATION,
          startDate: '2026-05-04',
          endDate:   '2026-05-06',
          isPartial: false,
        },
        UserRole.EMPLOYEE,
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(reportCreateMock).not.toHaveBeenCalled();
  });

  it('rejects a PARTIAL absence when entries exceed the standard-minus-partial cap', async () => {
    lockMock.mockResolvedValue({ year: 2026, month: 5, isLocked: false } as never);
    reportFindFirstMock.mockResolvedValueOnce(null);
    // 7h of entries on 2026-05-04, default 9h standard, partial 3h → allowed = 6h. 7 > 6 → reject.
    dailyReportFindManyMock.mockResolvedValueOnce([
      {
        reportDate: new Date(Date.UTC(2026, 4, 4)),
        entries: [{ durationMinutes: 420 }],
      },
    ] as never);

    await expect(
      createAbsence(
        {
          userId: ownerId,
          absenceType: AbsenceType.SICK_LEAVE,
          startDate: '2026-05-04',
          endDate:   '2026-05-04',
          isPartial: true,
          partialDurationHours: 3,
        },
        UserRole.EMPLOYEE,
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('allows a PARTIAL absence when existing entries fit within the cap', async () => {
    lockMock.mockResolvedValue({ year: 2026, month: 5, isLocked: false } as never);
    reportFindFirstMock.mockResolvedValueOnce(null);
    // 5h of entries, 9h standard, partial 3h → allowed = 6h. 5 ≤ 6 → ok.
    dailyReportFindManyMock.mockResolvedValueOnce([
      {
        reportDate: new Date(Date.UTC(2026, 4, 4)),
        entries: [{ durationMinutes: 300 }],
      },
    ] as never);
    reportCreateMock.mockResolvedValue(baseAbsence());

    await createAbsence(
      {
        userId: ownerId,
        absenceType: AbsenceType.SICK_LEAVE,
        startDate: '2026-05-04',
        endDate:   '2026-05-04',
        isPartial: true,
        partialDurationHours: 3,
      },
      UserRole.EMPLOYEE,
    );

    expect(reportCreateMock).toHaveBeenCalled();
  });

  it('SICK_LEAVE creates a record in DOCUMENT_PENDING status', async () => {
    lockMock.mockResolvedValue({ year: 2026, month: 5, isLocked: false } as never);
    reportCreateMock.mockResolvedValue({
      ...baseAbsence(),
      absenceType: AbsenceType.SICK_LEAVE,
      status: AbsenceStatus.DOCUMENT_PENDING,
    } as never);

    const result = await createAbsence(
      {
        userId: ownerId,
        absenceType: AbsenceType.SICK_LEAVE,
        startDate: '2026-05-04',
        endDate:   '2026-05-06',
        isPartial: false,
      },
      UserRole.EMPLOYEE,
    );

    expect(reportCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        absenceType: AbsenceType.SICK_LEAVE,
        status: AbsenceStatus.DOCUMENT_PENDING,
      }),
    });
    expect(result.documentRequired).toBe(true);
  });
});

describe('updateAbsence', () => {
  it('forbids non-admin non-owner', async () => {
    reportFindUniqueMock.mockResolvedValue(baseAbsence() as never);

    await expect(
      updateAbsence(absenceId, { isPartial: true }, otherId, UserRole.EMPLOYEE),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('404s when absence is missing or soft-deleted', async () => {
    reportFindUniqueMock.mockResolvedValue({ ...baseAbsence(), deletedAt: new Date() } as never);

    await expect(
      updateAbsence(absenceId, { isPartial: true }, ownerId, UserRole.EMPLOYEE),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects when moving dates would overlap another absence', async () => {
    reportFindUniqueMock.mockResolvedValue(baseAbsence() as never);
    lockMock.mockResolvedValue({ year: 2026, month: 5, isLocked: false } as never);
    reportFindFirstMock.mockResolvedValueOnce({ id: 'other-absence' } as never);

    await expect(
      updateAbsence(absenceId, { endDate: '2026-05-08' }, ownerId, UserRole.EMPLOYEE),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(reportUpdateMock).not.toHaveBeenCalled();
    expect(reportFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: absenceId } }),
      }),
    );
  });

  it('allows date-changing update when the only overlap is the absence itself', async () => {
    reportFindUniqueMock.mockResolvedValue(baseAbsence() as never);
    lockMock.mockResolvedValue({ year: 2026, month: 5, isLocked: false } as never);
    reportFindFirstMock.mockResolvedValueOnce(null);
    reportUpdateMock.mockResolvedValue(baseAbsence() as never);

    await updateAbsence(absenceId, { endDate: '2026-05-08' }, ownerId, UserRole.EMPLOYEE);

    expect(reportUpdateMock).toHaveBeenCalled();
  });

  it('rejects a partial-change update when existing entries no longer fit the new cap', async () => {
    reportFindUniqueMock.mockResolvedValue(baseAbsence() as never);
    lockMock.mockResolvedValue({ year: 2026, month: 5, isLocked: false } as never);
    // Dates unchanged → no overlap check, but partial flipped on → entry-conflict check runs.
    dailyReportFindManyMock.mockResolvedValueOnce([
      {
        reportDate: new Date(Date.UTC(2026, 4, 4)),
        entries: [{ durationMinutes: 480 }], // 8h, exceeds 9-3=6 cap
      },
    ] as never);

    await expect(
      updateAbsence(
        absenceId,
        { isPartial: true, partialDurationHours: 3 },
        ownerId,
        UserRole.EMPLOYEE,
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(reportUpdateMock).not.toHaveBeenCalled();
  });

  it('skips the overlap check when dates are unchanged', async () => {
    reportFindUniqueMock.mockResolvedValue(baseAbsence() as never);
    lockMock.mockResolvedValue({ year: 2026, month: 5, isLocked: false } as never);
    reportUpdateMock.mockResolvedValue(baseAbsence() as never);

    await updateAbsence(absenceId, { isPartial: true }, ownerId, UserRole.EMPLOYEE);

    expect(reportFindFirstMock).not.toHaveBeenCalled();
    expect(reportUpdateMock).toHaveBeenCalled();
  });

  it('rejects an update that moves endDate into a locked month', async () => {
    reportFindUniqueMock.mockResolvedValue(baseAbsence() as never);
    // existing range (both in May, unlocked), then new end (June, locked)
    lockMock
      .mockResolvedValueOnce({ year: 2026, month: 5, isLocked: false } as never) // existing start
      .mockResolvedValueOnce({ year: 2026, month: 5, isLocked: false } as never) // next start
      .mockResolvedValueOnce({ year: 2026, month: 6, isLocked: true  } as never); // next end

    await expect(
      updateAbsence(absenceId, { endDate: '2026-06-02' }, ownerId, UserRole.EMPLOYEE),
    ).rejects.toBeInstanceOf(MonthLockedError);
  });
});

describe('deleteAbsence', () => {
  it('blocks delete when the absence range is locked', async () => {
    reportFindUniqueMock.mockResolvedValue(baseAbsence() as never);
    lockMock.mockResolvedValue({ year: 2026, month: 5, isLocked: true } as never);

    await expect(
      deleteAbsence(absenceId, ownerId, UserRole.EMPLOYEE),
    ).rejects.toBeInstanceOf(MonthLockedError);
  });
});

describe('uploadAbsenceDocument', () => {
  it('blocks upload when the absence range is locked', async () => {
    reportFindUniqueMock.mockResolvedValue(baseAbsence() as never);
    lockMock.mockResolvedValue({ year: 2026, month: 5, isLocked: true } as never);

    await expect(
      uploadAbsenceDocument(
        absenceId,
        { path: '/tmp/x', originalname: 'x.pdf', mimetype: 'application/pdf' },
        ownerId,
        UserRole.EMPLOYEE,
      ),
    ).rejects.toBeInstanceOf(MonthLockedError);
    expect(storageSaveMock).not.toHaveBeenCalled();
  });

  it('flips DOCUMENT_PENDING → SUBMITTED on successful upload', async () => {
    const pending = { ...baseAbsence(), status: AbsenceStatus.DOCUMENT_PENDING, absenceType: AbsenceType.SICK_LEAVE };
    reportFindUniqueMock.mockResolvedValue(pending as never);
    lockMock.mockResolvedValue({ year: 2026, month: 5, isLocked: false } as never);
    docFindFirstMock.mockResolvedValue(null);
    storageSaveMock.mockResolvedValue({ storagePath: '/uploads/abs/x.pdf', fileName: 'x.pdf', mimeType: 'application/pdf' });
    docCreateMock.mockResolvedValue({ id: 'doc-1', fileName: 'x.pdf' } as never);

    await uploadAbsenceDocument(
      absenceId,
      { path: '/tmp/x', originalname: 'x.pdf', mimetype: 'application/pdf' },
      ownerId,
      UserRole.EMPLOYEE,
    );

    expect(reportUpdateMock).toHaveBeenCalledWith({
      where: { id: absenceId },
      data: { status: AbsenceStatus.SUBMITTED },
    });
  });
});

describe('deleteAbsenceDocument', () => {
  it('blocks delete when the absence range is locked', async () => {
    reportFindUniqueMock.mockResolvedValue(baseAbsence() as never);
    lockMock.mockResolvedValue({ year: 2026, month: 5, isLocked: true } as never);

    await expect(
      deleteAbsenceDocument(absenceId, ownerId, UserRole.EMPLOYEE),
    ).rejects.toBeInstanceOf(MonthLockedError);
    expect(storageDeleteMock).not.toHaveBeenCalled();
  });

  it('reverts SICK_LEAVE back to DOCUMENT_PENDING after document removal', async () => {
    const sick = { ...baseAbsence(), absenceType: AbsenceType.SICK_LEAVE };
    reportFindUniqueMock.mockResolvedValue(sick as never);
    lockMock.mockResolvedValue({ year: 2026, month: 5, isLocked: false } as never);
    docFindFirstMock.mockResolvedValue({ id: 'doc-1', storagePath: '/x' } as never);

    await deleteAbsenceDocument(absenceId, ownerId, UserRole.EMPLOYEE);

    expect(storageDeleteMock).toHaveBeenCalledWith('/x');
    expect(docDeleteMock).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
    expect(reportUpdateMock).toHaveBeenCalledWith({
      where: { id: absenceId },
      data: { status: AbsenceStatus.DOCUMENT_PENDING },
    });
  });
});

describe('updateAbsence — status transitions on type change', () => {
  it('SICK_LEAVE without document → DOCUMENT_PENDING', async () => {
    reportFindUniqueMock.mockResolvedValue(baseAbsence() as never);
    lockMock.mockResolvedValue({ year: 2026, month: 5, isLocked: false } as never);
    docCountMock.mockResolvedValue(0);
    reportUpdateMock.mockResolvedValue({ ...baseAbsence(), status: AbsenceStatus.DOCUMENT_PENDING } as never);

    await updateAbsence(absenceId, { absenceType: AbsenceType.SICK_LEAVE }, ownerId, UserRole.EMPLOYEE);

    expect(reportUpdateMock).toHaveBeenCalledWith({
      where: { id: absenceId },
      data: expect.objectContaining({
        absenceType: AbsenceType.SICK_LEAVE,
        status: AbsenceStatus.DOCUMENT_PENDING,
      }),
    });
  });

  it('SICK_LEAVE with existing document → SUBMITTED', async () => {
    reportFindUniqueMock.mockResolvedValue(baseAbsence() as never);
    lockMock.mockResolvedValue({ year: 2026, month: 5, isLocked: false } as never);
    docCountMock.mockResolvedValue(1);
    reportUpdateMock.mockResolvedValue({ ...baseAbsence(), status: AbsenceStatus.SUBMITTED } as never);

    await updateAbsence(absenceId, { absenceType: AbsenceType.SICK_LEAVE }, ownerId, UserRole.EMPLOYEE);

    expect(reportUpdateMock).toHaveBeenCalledWith({
      where: { id: absenceId },
      data: expect.objectContaining({ status: AbsenceStatus.SUBMITTED }),
    });
  });
});
