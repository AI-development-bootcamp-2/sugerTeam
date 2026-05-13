import type { MonthLock } from '@prisma/client';
import { DailyReportStatus, UserStatus } from '@prisma/client';
import { prisma } from '@/prisma/client';

export type MonthLockUserRef = { id: string; fullName: string } | null;

export type MonthLockWithUsers = MonthLock & {
  lockedByUser: MonthLockUserRef;
  reopenedByUser: MonthLockUserRef;
};

export interface UserMissingReports {
  userId: string;
  fullName: string;
  missingDays: number;
}

const USER_SELECT = { select: { id: true, fullName: true } } as const;
const INCLUDE_USERS = {
  lockedByUser: USER_SELECT,
  reopenedByUser: USER_SELECT,
} as const;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function lockMonth(
  year: number,
  month: number,
  adminUserId: string,
): Promise<MonthLockWithUsers> {
  const now = new Date();
  return prisma.monthLock.upsert({
    where:  { year_month: { year, month } },
    create: {
      year,
      month,
      isLocked:   true,
      lockedBy:   adminUserId,
      lockedAt:   now,
    },
    update: {
      isLocked:   true,
      lockedBy:   adminUserId,
      lockedAt:   now,
      reopenedBy: null,
      reopenedAt: null,
    },
    include: INCLUDE_USERS,
  });
}

export async function unlockMonth(
  year: number,
  month: number,
  adminUserId: string,
): Promise<MonthLockWithUsers> {
  const now = new Date();
  return prisma.monthLock.upsert({
    where:  { year_month: { year, month } },
    create: {
      year,
      month,
      isLocked:   false,
      reopenedBy: adminUserId,
      reopenedAt: now,
    },
    update: {
      isLocked:   false,
      reopenedBy: adminUserId,
      reopenedAt: now,
    },
    include: INCLUDE_USERS,
  });
}

export async function listMonths(): Promise<MonthLockWithUsers[]> {
  return prisma.monthLock.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: INCLUDE_USERS,
  });
}

export async function isMonthLocked(year: number, month: number): Promise<boolean> {
  const lock = await prisma.monthLock.findUnique({
    where:  { year_month: { year, month } },
    select: { isLocked: true },
  });
  return lock?.isLocked ?? false;
}

/**
 * For each ACTIVE user, how many working days of the given month are not
 * covered by a SUBMITTED daily report or an approved absence. Users with
 * 0 missing days are excluded.
 */
export async function getMissingReports(
  year: number,
  month: number,
): Promise<UserMissingReports[]> {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate   = new Date(Date.UTC(year, month, 0));

  const [users, workingDays, reports, absences] = await Promise.all([
    prisma.user.findMany({
      where:  { status: UserStatus.ACTIVE },
      select: { id: true, fullName: true },
    }),
    prisma.workCalendarDay.findMany({
      where:  { date: { gte: startDate, lte: endDate }, isWorkingDay: true },
      select: { date: true },
    }),
    prisma.dailyReport.findMany({
      where: {
        reportDate: { gte: startDate, lte: endDate },
        status:     DailyReportStatus.SUBMITTED,
        deletedAt:  null,
      },
      select: { userId: true, reportDate: true },
    }),
    prisma.absenceReport.findMany({
      where: {
        deletedAt: null,
        startDate: { lte: endDate },
        endDate:   { gte: startDate },
      },
      select: { userId: true, startDate: true, endDate: true },
    }),
  ]);

  if (workingDays.length === 0) return [];

  const workingDayStrs = workingDays.map((d) => ymd(d.date));
  const workingDaySet  = new Set(workingDayStrs);

  const submittedByUser = new Map<string, Set<string>>();
  for (const r of reports) {
    const set = submittedByUser.get(r.userId) ?? new Set<string>();
    set.add(ymd(r.reportDate));
    submittedByUser.set(r.userId, set);
  }

  const absentByUser = new Map<string, Set<string>>();
  for (const a of absences) {
    const set = absentByUser.get(a.userId) ?? new Set<string>();
    const cur = new Date(a.startDate);
    const end = new Date(a.endDate);
    while (cur <= end) {
      const ds = ymd(cur);
      if (workingDaySet.has(ds)) set.add(ds);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    absentByUser.set(a.userId, set);
  }

  const out: UserMissingReports[] = [];
  for (const u of users) {
    const subs = submittedByUser.get(u.id);
    const abs  = absentByUser.get(u.id);
    let missing = 0;
    for (const wd of workingDayStrs) {
      const covered = subs?.has(wd) === true || abs?.has(wd) === true;
      if (!covered) missing++;
    }
    if (missing > 0) {
      out.push({ userId: u.id, fullName: u.fullName, missingDays: missing });
    }
  }

  out.sort((a, b) =>
    b.missingDays - a.missingDays || a.fullName.localeCompare(b.fullName, 'he'),
  );

  return out;
}
