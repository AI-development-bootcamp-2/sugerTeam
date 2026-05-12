import { TaskStatus } from '@prisma/client';
import type { Task, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

export class NotFoundError extends Error {
  status = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export async function createTask(data: { projectId: string; name: string }): Promise<Task> {
  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) {
    throw new NotFoundError(`Project ${data.projectId} not found`);
  }
  return prisma.task.create({
    data: {
      projectId: data.projectId,
      name: data.name,
      status: TaskStatus.OPEN,
    },
  });
}

export async function listActiveTasks(projectId: string): Promise<Task[]> {
  return prisma.task.findMany({
    where: {
      projectId,
      status: TaskStatus.OPEN,
      deletedAt: null,
    },
    orderBy: { name: 'asc' },
  });
}

export async function listAllTasks(): Promise<Task[]> {
  return prisma.task.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function updateTask(
  id: string,
  data: { name?: string; isActive?: boolean },
): Promise<Task> {
  const updateData: Prisma.TaskUpdateInput = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  if (data.isActive === false) {
    updateData.status = TaskStatus.CLOSED;
    updateData.closedAt = new Date();
  } else if (data.isActive === true) {
    updateData.status = TaskStatus.OPEN;
    updateData.closedAt = null;
  }

  return prisma.task.update({ where: { id }, data: updateData });
}

export type TaskWithProject = Task & {
  project: { id: string; name: string; client: { id: string; name: string } };
};

export async function listTasksByProject(projectId?: string): Promise<TaskWithProject[]> {
  return prisma.task.findMany({
    where: projectId ? { projectId } : undefined,
    include: {
      project: {
        select: { id: true, name: true, client: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });
}
