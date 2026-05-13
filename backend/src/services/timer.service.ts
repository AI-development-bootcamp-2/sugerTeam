import { ActiveTimer } from '@prisma/client';
import prisma from '@/lib/prisma';
import { ConflictError, NotFoundError } from '@/lib/errors';

export async function getActiveTimer(userId: string): Promise<ActiveTimer | null> {
  return prisma.activeTimer.findUnique({ where: { userId } });
}

export async function startTimer(userId: string): Promise<ActiveTimer> {
  try {
    return await prisma.activeTimer.create({ data: { userId } });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw new ConflictError('כבר יש שעון פעיל. עצור אותו לפני שמתחיל חדש.');
    }
    throw err;
  }
}

export async function stopTimer(userId: string): Promise<{ timerId: string; startedAt: Date; stoppedAt: Date }> {
  const record = await prisma.activeTimer.findUnique({ where: { userId } });
  if (!record) {
    throw new NotFoundError('אין שעון פעיל.');
  }
  const stoppedAt = new Date();
  await prisma.activeTimer.delete({ where: { userId } });
  return { timerId: record.id, startedAt: record.startedAt, stoppedAt };
}
