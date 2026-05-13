import { UserStatus } from '@prisma/client';
import type { Task } from '@prisma/client';
import prisma from '@/lib/prisma';

export type TaskWithAssignments = Task & {
  project: { id: string; name: string; client: { id: string; name: string } };
  assignments: { id: string; user: { id: string; fullName: string } }[];
};

export async function listTasksWithAssignments(projectId?: string): Promise<TaskWithAssignments[]> {
  return prisma.task.findMany({
    where: {
      deletedAt: null,
      ...(projectId ? { projectId } : {}),
    },
    include: {
      project: {
        select: { id: true, name: true, client: { select: { id: true, name: true } } },
      },
      assignments: {
        include: { user: { select: { id: true, fullName: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  }) as Promise<TaskWithAssignments[]>;
}

export async function syncTaskAssignments(
  taskId: string,
  userIds: string[],
  assignedBy: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.taskAssignment.deleteMany({
      where: { taskId, userId: { notIn: userIds } },
    }),
    prisma.taskAssignment.createMany({
      data: userIds.map((userId) => ({ taskId, userId, assignedBy })),
      skipDuplicates: true,
    }),
  ]);
}

export async function removeAllTaskAssignments(taskId: string): Promise<void> {
  await prisma.taskAssignment.deleteMany({ where: { taskId } });
}

export async function listActiveUsers(): Promise<{ id: string; fullName: string }[]> {
  return prisma.user.findMany({
    where: { status: UserStatus.ACTIVE, deletedAt: null },
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
  });
}
