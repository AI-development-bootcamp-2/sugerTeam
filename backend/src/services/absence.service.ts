import { AbsenceStatus, AbsenceType, UserRole } from '@prisma/client';
import type { AbsenceReport, AbsenceDocument, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { fileStorageService } from '@/services/file-storage.service';

export class ValidationError extends Error {
  status = 422;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  status = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class MonthLockedError extends Error {
  status = 423;
  constructor(message = 'החודש נעול, לא ניתן לבצע שינויים') {
    super(message);
    this.name = 'MonthLockedError';
  }
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(value: string, fieldName: string): Date {
  if (!ISO_DATE_RE.test(value)) {
    throw new ValidationError(`פורמט ${fieldName} שגוי, נדרש yyyy-mm-dd`);
  }
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    throw new ValidationError(`ערך ${fieldName} אינו תאריך תקין`);
  }
  return date;
}

function toDate(value: Date | string, fieldName: string): Date {
  return value instanceof Date ? value : parseIsoDate(value, fieldName);
}

export function calculateAbsenceDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const cursor = new Date(
    Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()),
  );
  const end = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()),
  );
  while (cursor.getTime() <= end.getTime()) {
    const dow = cursor.getUTCDay();
    if (dow !== 5 && dow !== 6) {
      count += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

async function assertMonthUnlocked(date: Date, actorRole: UserRole): Promise<void> {
  if (actorRole === UserRole.ADMIN) {
    return;
  }
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const lock = await prisma.monthLock.findUnique({
    where: { year_month: { year, month } },
  });
  if (lock?.isLocked) {
    throw new MonthLockedError();
  }
}

export type AbsenceWithDocument = AbsenceReport & {
  documents: AbsenceDocument[];
};

export type AbsenceResponse = AbsenceReport & {
  documents?: AbsenceDocument[];
  documentRequired: boolean;
};

function withDocumentRequired<T extends AbsenceReport>(
  record: T,
): T & { documentRequired: boolean } {
  return { ...record, documentRequired: record.status === AbsenceStatus.DOCUMENT_PENDING };
}

export interface CreateAbsenceInput {
  userId: string;
  absenceType: AbsenceType;
  startDate: string | Date;
  endDate: string | Date;
  isPartial: boolean;
  partialDurationHours?: number | null;
}

export async function createAbsence(
  input: CreateAbsenceInput,
  actorRole: UserRole,
): Promise<AbsenceResponse> {
  const startDate = toDate(input.startDate, 'תאריך התחלה');
  const endDate = toDate(input.endDate, 'תאריך סיום');

  if (endDate.getTime() < startDate.getTime()) {
    throw new ValidationError('תאריך סיום חייב להיות אחרי תאריך ההתחלה');
  }

  await assertMonthUnlocked(startDate, actorRole);

  const calculatedAbsenceDays = calculateAbsenceDays(startDate, endDate);

  const status =
    input.absenceType === AbsenceType.SICK_LEAVE ||
    input.absenceType === AbsenceType.MILITARY_RESERVE
      ? AbsenceStatus.DOCUMENT_PENDING
      : AbsenceStatus.SUBMITTED;

  const data: Prisma.AbsenceReportUncheckedCreateInput = {
    userId: input.userId,
    absenceType: input.absenceType,
    startDate,
    endDate,
    isPartial: input.isPartial,
    partialDurationHours: input.partialDurationHours ?? null,
    calculatedAbsenceDays,
    status,
  };

  const record = await prisma.absenceReport.create({ data });
  return withDocumentRequired(record);
}

export interface UpdateAbsenceInput {
  absenceType?: AbsenceType;
  startDate?: string | Date;
  endDate?: string | Date;
  isPartial?: boolean;
  partialDurationHours?: number | null;
}

async function loadOwnedAbsence(
  id: string,
  actorUserId: string,
  actorRole: UserRole,
): Promise<AbsenceReport> {
  const existing = await prisma.absenceReport.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    throw new NotFoundError('היעדרות לא נמצאה');
  }
  if (actorRole !== UserRole.ADMIN && existing.userId !== actorUserId) {
    throw new ForbiddenError('אין הרשאה לפעולה זו');
  }
  return existing;
}

export async function updateAbsence(
  id: string,
  data: UpdateAbsenceInput,
  actorUserId: string,
  actorRole: UserRole,
): Promise<AbsenceResponse> {
  const existing = await loadOwnedAbsence(id, actorUserId, actorRole);

  await assertMonthUnlocked(existing.startDate, actorRole);

  const nextStart =
    data.startDate !== undefined ? toDate(data.startDate, 'תאריך התחלה') : existing.startDate;
  const nextEnd =
    data.endDate !== undefined ? toDate(data.endDate, 'תאריך סיום') : existing.endDate;

  if (nextEnd.getTime() < nextStart.getTime()) {
    throw new ValidationError('תאריך סיום חייב להיות אחרי תאריך ההתחלה');
  }

  if (data.startDate !== undefined && nextStart.getTime() !== existing.startDate.getTime()) {
    await assertMonthUnlocked(nextStart, actorRole);
  }

  const datesChanged =
    data.startDate !== undefined || data.endDate !== undefined;

  const updateData: Prisma.AbsenceReportUpdateInput = {};
  if (data.absenceType !== undefined) {
    updateData.absenceType = data.absenceType;
    const requiresDoc =
      data.absenceType === AbsenceType.SICK_LEAVE ||
      data.absenceType === AbsenceType.MILITARY_RESERVE;
    const hasDocument =
      (await prisma.absenceDocument.count({ where: { absenceReportId: id } })) > 0;
    updateData.status =
      requiresDoc && !hasDocument ? AbsenceStatus.DOCUMENT_PENDING : AbsenceStatus.SUBMITTED;
  }
  if (data.startDate !== undefined) updateData.startDate = nextStart;
  if (data.endDate !== undefined) updateData.endDate = nextEnd;
  if (data.isPartial !== undefined) updateData.isPartial = data.isPartial;
  if (data.partialDurationHours !== undefined) {
    updateData.partialDurationHours = data.partialDurationHours;
  }
  if (datesChanged) {
    updateData.calculatedAbsenceDays = calculateAbsenceDays(nextStart, nextEnd);
  }

  const record = await prisma.absenceReport.update({ where: { id }, data: updateData });
  return withDocumentRequired(record);
}

export async function deleteAbsence(
  id: string,
  actorUserId: string,
  actorRole: UserRole,
): Promise<void> {
  const existing = await loadOwnedAbsence(id, actorUserId, actorRole);
  await assertMonthUnlocked(existing.startDate, actorRole);

  await prisma.$transaction([
    prisma.absenceDocument.deleteMany({ where: { absenceReportId: id } }),
    prisma.absenceReport.delete({ where: { id } }),
  ]);
}

export async function listAbsences(
  userId: string,
  year: number,
  month: number,
): Promise<AbsenceWithDocument[]> {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));

  return prisma.absenceReport.findMany({
    where: {
      userId,
      deletedAt: null,
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
    },
    include: { documents: true },
    orderBy: { startDate: 'asc' },
  });
}

export async function getAbsenceById(id: string): Promise<AbsenceWithDocument | null> {
  return prisma.absenceReport.findFirst({
    where: { id, deletedAt: null },
    include: { documents: true },
  });
}

export interface UploadedFileInput {
  path: string;
  originalname: string;
  mimetype: string;
}

export async function uploadAbsenceDocument(
  absenceId: string,
  file: UploadedFileInput,
  actorUserId: string,
  actorRole: UserRole,
): Promise<AbsenceDocument> {
  const absence = await loadOwnedAbsence(absenceId, actorUserId, actorRole);

  const existing = await prisma.absenceDocument.findFirst({
    where: { absenceReportId: absenceId },
  });
  if (existing) {
    await fileStorageService.deleteFile(existing.storagePath);
    await prisma.absenceDocument.delete({ where: { id: existing.id } });
  }

  const saved = await fileStorageService.saveFile({ file, absenceReportId: absenceId });

  const document = await prisma.absenceDocument.create({
    data: {
      absenceReportId: absenceId,
      fileName: saved.fileName,
      storagePath: saved.storagePath,
      mimeType: saved.mimeType,
      uploadedBy: actorUserId,
    },
  });

  if (absence.status === AbsenceStatus.DOCUMENT_PENDING) {
    await prisma.absenceReport.update({
      where: { id: absenceId },
      data: { status: AbsenceStatus.SUBMITTED },
    });
  }

  return document;
}

export async function deleteAbsenceDocument(
  absenceId: string,
  actorUserId: string,
  actorRole: UserRole,
): Promise<void> {
  const absence = await loadOwnedAbsence(absenceId, actorUserId, actorRole);

  const existing = await prisma.absenceDocument.findFirst({
    where: { absenceReportId: absenceId },
  });
  if (!existing) {
    throw new NotFoundError('מסמך לא נמצא');
  }

  await fileStorageService.deleteFile(existing.storagePath);
  await prisma.absenceDocument.delete({ where: { id: existing.id } });

  const requiresDoc =
    absence.absenceType === AbsenceType.SICK_LEAVE ||
    absence.absenceType === AbsenceType.MILITARY_RESERVE;
  if (requiresDoc) {
    await prisma.absenceReport.update({
      where: { id: absenceId },
      data: { status: AbsenceStatus.DOCUMENT_PENDING },
    });
  }
}
