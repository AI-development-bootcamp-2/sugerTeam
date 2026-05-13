import { TaskStatus } from '@prisma/client';
import type { Task, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { NotFoundError } from '@/lib/errors';

export { NotFoundError };

export async function createTask(data: { projectId: string; name: string; description?: string; startDate?: string; endDate?: string }): Promise<Task> {
  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) {
    throw new NotFoundError(`Project ${data.projectId} not found`);
  }
  return prisma.task.create({
    data: {
      projectId:   data.projectId,
      name:        data.name,
      description: data.description,
      status:      TaskStatus.OPEN,
      startDate:   data.startDate ? new Date(data.startDate) : undefined,
      endDate:     data.endDate   ? new Date(data.endDate)   : undefined,
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
  data: { name?: string; description?: string; isActive?: boolean; startDate?: string | null; endDate?: string | null },
): Promise<Task> {
  const updateData: Prisma.TaskUpdateInput = {};

  if (data.name        !== undefined) updateData.name        = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate   !== undefined) updateData.endDate   = data.endDate   ? new Date(data.endDate)   : null;
  if (data.isActive === false) {
    updateData.status   = TaskStatus.CLOSED;
    updateData.closedAt = new Date();
  } else if (data.isActive === true) {
    updateData.status   = TaskStatus.OPEN;
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
