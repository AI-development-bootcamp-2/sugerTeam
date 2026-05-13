import { DailyReportStatus, EntityStatus, TaskStatus, WorkLocation } from '@prisma/client';
import prisma from '@/lib/prisma';

// ─── Errors ───────────────────────────────────────────────────────────────────

export class NotFoundError extends Error {
  status = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  status = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class LockedError extends Error {
  status = 423;
  constructor(message: string) {
    super(message);
    this.name = 'LockedError';
  }
}

export class ValidationError extends Error {
  status = 422;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const DEFAULT_STANDARD_HOURS = 9;

// ─── Input types ──────────────────────────────────────────────────────────────

export interface EntryInput {
  workLocation: WorkLocation;
  clientId: string;
  projectId: string;
  taskId: string;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  description?: string;
}

export interface DayReportInput {
  reportDate: string; // "YYYY-MM-DD"
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
  status: DailyReportStatus;
  entries: EntryInput[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTimeUTC(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m, 0, 0));
}

function formatTimeUTC(d: Date): string {
  return (
    String(d.getUTCHours()).padStart(2, '0') +
    ':' +
    String(d.getUTCMinutes()).padStart(2, '0')
  );
}

function formatDateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseDateUTC(iso: string): Date {
  const [y, mo, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, day));
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function allDaysInMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const d = new Date(Date.UTC(year, month - 1, 1));
  while (d.getUTCMonth() === month - 1) {
    days.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

async function assertMonthNotLocked(year: number, month: number): Promise<void> {
  const lock = await prisma.monthLock.findUnique({
    where: { year_month: { year, month } },
  });
  if (lock?.isLocked) {
    throw new LockedError('החודש נעול, לא ניתן לבצע שינויים');
  }
}

async function assertCompatibleWithAbsence(
  userId: string,
  reportDate: Date,
  totalEntryMinutes: number,
): Promise<void> {
  const absence = await prisma.absenceReport.findFirst({
    where: {
      userId,
      deletedAt: null,
      startDate: { lte: reportDate },
      endDate:   { gte: reportDate },
    },
    select: { isPartial: true, partialDurationHours: true },
  });
  if (!absence) return;

  if (!absence.isPartial) {
    throw new ValidationError('לא ניתן לדווח שעות ביום של היעדרות מלאה');
  }

  const calendarDay = await prisma.workCalendarDay.findUnique({
    where: { date: reportDate },
    select: { standardHours: true },
  });
  const standardHours = calendarDay ? Number(calendarDay.standardHours) : DEFAULT_STANDARD_HOURS;
  const partialHours = Number(absence.partialDurationHours ?? 0);
  const allowedMinutes = Math.max(0, Math.round((standardHours - partialHours) * 60));
  if (totalEntryMinutes > allowedMinutes) {
    throw new ValidationError(
      `סך השעות המדווחות חורג מהמותר ביום היעדרות חלקית (מקסימום ${(allowedMinutes / 60).toFixed(2)} שעות)`,
    );
  }
}

// ─── Shared include shape ─────────────────────────────────────────────────────

const entryInclude = {
  client:  { select: { name: true } },
  project: { select: { name: true } },
  task:    { select: { name: true } },
} as const;

// ─── Public functions ─────────────────────────────────────────────────────────

export async function getMonthlyDays(userId: string, year: number, month: number) {
  const days = allDaysInMonth(year, month);
  const startDate = parseDateUTC(days[0]);
  const endDate = parseDateUTC(days[days.length - 1]);

  const [reports, calendarDays] = await Promise.all([
    prisma.dailyReport.findMany({
      where: {
        userId,
        reportDate: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      include: {
        entries: {
          where: { deletedAt: null },
          include: entryInclude,
          orderBy: { startTime: 'asc' },
        },
      },
    }),
    prisma.workCalendarDay.findMany({
      where: { date: { gte: startDate, lte: endDate } },
    }),
  ]);

  const reportByDate = new Map(reports.map((r) => [formatDateUTC(r.reportDate), r]));
  const calByDate = new Map(calendarDays.map((c) => [formatDateUTC(c.date), c]));

  return days.map((day) => {
    const report = reportByDate.get(day) ?? null;
    const cal    = calByDate.get(day)    ?? null;

    return {
      reportDate:    day,
      dayType:       cal?.dayType    ?? 'REGULAR',
      isWorkingDay:  cal?.isWorkingDay ?? true,
      dailyReportId: report?.id       ?? null,
      status:        report?.status   ?? null,
      startTime:     report ? formatTimeUTC(report.startTime) : null,
      endTime:       report ? formatTimeUTC(report.endTime)   : null,
      entries: report
        ? report.entries.map((e) => ({
            id:              e.id,
            workLocation:    e.workLocation,
            clientId:        e.clientId,
            clientName:      e.client.name,
            projectId:       e.projectId,
            projectName:     e.project.name,
            taskId:          e.taskId,
            taskName:        e.task.name,
            startTime:       formatTimeUTC(e.startTime),
            endTime:         formatTimeUTC(e.endTime),
            durationMinutes: e.durationMinutes,
            description:     e.description ?? null,
          }))
        : [],
    };
  });
}

export async function upsertDayReport(userId: string, data: DayReportInput) {
  const [year, month] = data.reportDate.split('-').map(Number);
  await assertMonthNotLocked(year, month);

  const reportDateObj = parseDateUTC(data.reportDate);

  const existing = await prisma.dailyReport.findFirst({
    where: { userId, reportDate: reportDateObj, deletedAt: null },
  });

  if (existing?.status === DailyReportStatus.SUBMITTED) {
    throw new ConflictError('הדוח כבר הוגש ולא ניתן לעריכה');
  }

  const dayStartTime = parseTimeUTC(data.startTime);
  const dayEndTime   = parseTimeUTC(data.endTime);

  const entriesData = data.entries.map((e) => ({
    workLocation:    e.workLocation,
    clientId:        e.clientId,
    projectId:       e.projectId,
    taskId:          e.taskId,
    startTime:       parseTimeUTC(e.startTime),
    endTime:         parseTimeUTC(e.endTime),
    durationMinutes: toMinutes(e.endTime) - toMinutes(e.startTime),
    description:     e.description ?? null,
  }));

  const totalEntryMinutes = entriesData.reduce((sum, e) => sum + e.durationMinutes, 0);
  await assertCompatibleWithAbsence(userId, reportDateObj, totalEntryMinutes);

  let reportId: string;

  if (existing) {
    await prisma.$transaction(async (tx) => {
      await tx.timeReportEntry.updateMany({
        where: { dailyReportId: existing.id, deletedAt: null },
        data:  { deletedAt: new Date() },
      });
      await tx.dailyReport.update({
        where: { id: existing.id },
        data:  { startTime: dayStartTime, endTime: dayEndTime, status: data.status },
      });
      await tx.timeReportEntry.createMany({
        data: entriesData.map((e) => ({ ...e, dailyReportId: existing.id })),
      });
    });
    reportId = existing.id;
  } else {
    const created = await prisma.dailyReport.create({
      data: {
        userId,
        reportDate: reportDateObj,
        startTime:  dayStartTime,
        endTime:    dayEndTime,
        status:     data.status,
        entries:    { create: entriesData },
      },
      select: { id: true },
    });
    reportId = created.id;
  }

  const report = await prisma.dailyReport.findUniqueOrThrow({
    where: { id: reportId },
    include: {
      entries: {
        where: { deletedAt: null },
        include: entryInclude,
        orderBy: { startTime: 'asc' },
      },
    },
  });

  return {
    reportDate:    formatDateUTC(report.reportDate),
    dailyReportId: report.id,
    status:        report.status,
    startTime:     formatTimeUTC(report.startTime),
    endTime:       formatTimeUTC(report.endTime),
    entries: report.entries.map((e) => ({
      id:              e.id,
      workLocation:    e.workLocation,
      clientId:        e.clientId,
      clientName:      e.client.name,
      projectId:       e.projectId,
      projectName:     e.project.name,
      taskId:          e.taskId,
      taskName:        e.task.name,
      startTime:       formatTimeUTC(e.startTime),
      endTime:         formatTimeUTC(e.endTime),
      durationMinutes: e.durationMinutes,
      description:     e.description ?? null,
    })),
  };
}

export async function deleteDayReport(userId: string, reportDate: string): Promise<void> {
  const [year, month] = reportDate.split('-').map(Number);
  await assertMonthNotLocked(year, month);

  const reportDateObj = parseDateUTC(reportDate);
  const report = await prisma.dailyReport.findFirst({
    where: { userId, reportDate: reportDateObj, deletedAt: null },
  });

  if (!report) {
    throw new NotFoundError('דוח לא נמצא');
  }
  if (report.status === DailyReportStatus.SUBMITTED) {
    throw new ConflictError('לא ניתן למחוק דוח שהוגש');
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.timeReportEntry.updateMany({
      where: { dailyReportId: report.id },
      data:  { deletedAt: now },
    }),
    prisma.dailyReport.update({
      where: { id: report.id },
      data:  { deletedAt: now },
    }),
  ]);
}

export async function getDropdownData(userId: string) {
  const clients = await prisma.client.findMany({
    where: { status: EntityStatus.ACTIVE, deletedAt: null },
    include: {
      projects: {
        where: { status: EntityStatus.ACTIVE, deletedAt: null },
        include: {
          tasks: {
            where: {
              status: TaskStatus.OPEN,
              deletedAt: null,
              OR: [
                { assignments: { none: {} } },
                { assignments: { some: { userId } } },
              ],
            },
            select:  { id: true, name: true },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return {
    clients: clients.map((c) => ({
      id:   c.id,
      name: c.name,
      projects: c.projects.map((p) => ({
        id:   p.id,
        name: p.name,
        tasks: p.tasks.map((t) => ({ id: t.id, name: t.name })),
      })),
    })),
  };
}

export async function getMonthlySummary(userId: string, year: number, month: number) {
  const days      = allDaysInMonth(year, month);
  const startDate = parseDateUTC(days[0]);
  const endDate   = parseDateUTC(days[days.length - 1]);

  const [reports, workingDays, absences] = await Promise.all([
    prisma.dailyReport.findMany({
      where: {
        userId,
        reportDate: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
      include: {
        entries: {
          where: { deletedAt: null },
          select: { durationMinutes: true },
        },
      },
    }),
    prisma.workCalendarDay.findMany({
      where: { date: { gte: startDate, lte: endDate }, isWorkingDay: true },
    }),
    prisma.absenceReport.findMany({
      where: {
        userId,
        deletedAt: null,
        startDate: { lte: endDate },
        endDate:   { gte: startDate },
      },
    }),
  ]);

  const totalReportedMinutes = reports.reduce(
    (sum, r) => sum + r.entries.reduce((s, e) => s + e.durationMinutes, 0),
    0,
  );

  const expectedWorkingMinutes = workingDays.reduce(
    (sum, d) => sum + Number(d.standardHours) * 60,
    0,
  );

  const submittedDays = reports.filter((r) => r.status === DailyReportStatus.SUBMITTED).length;
  const draftDays     = reports.filter((r) => r.status === DailyReportStatus.DRAFT).length;

  const workingDaySet = new Set(workingDays.map((d) => formatDateUTC(d.date)));
  const absenceDaySet = new Set<string>();
  for (const absence of absences) {
    const cur = new Date(absence.startDate);
    const end = new Date(absence.endDate);
    while (cur <= end) {
      const ds = formatDateUTC(cur);
      if (workingDaySet.has(ds)) absenceDaySet.add(ds);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }

  const reportedDates = new Set(reports.map((r) => formatDateUTC(r.reportDate)));
  const missingDays = workingDays.filter(
    (d) => {
      const ds = formatDateUTC(d.date);
      return !reportedDates.has(ds) && !absenceDaySet.has(ds);
    },
  ).length;

  return {
    totalReportedMinutes,
    expectedWorkingMinutes,
    submittedDays,
    draftDays,
    missingDays,
    absenceDays: absenceDaySet.size,
  };
}
