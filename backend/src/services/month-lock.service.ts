import type { MonthLock } from '@prisma/client';
import { prisma } from '@/prisma/client';

export type MonthLockUserRef = { id: string; fullName: string } | null;

export type MonthLockWithUsers = MonthLock & {
  lockedByUser: MonthLockUserRef;
  reopenedByUser: MonthLockUserRef;
};

const USER_SELECT = { select: { id: true, fullName: true } } as const;
const INCLUDE_USERS = {
  lockedByUser: USER_SELECT,
  reopenedByUser: USER_SELECT,
} as const;

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
