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

export async function createTask(data: {
  projectId: string;
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<Task> {
  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new NotFoundError(`Project ${data.projectId} not found`);

  return prisma.task.create({
    data: {
      projectId: data.projectId,
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      status: TaskStatus.OPEN,
    },
  });
}

export async function listActiveTasks(projectId: string): Promise<Task[]> {
  return prisma.task.findMany({
    where: {
      projectId,
      status: TaskStatus.OPEN,
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
  data: {
    name?: string;
    description?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    isActive?: boolean;
  },
): Promise<Task> {
  const updateData: Prisma.TaskUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if ('startDate' in data) updateData.startDate = data.startDate;
  if ('endDate' in data) updateData.endDate = data.endDate;
  if (data.isActive === false) {
    updateData.status = TaskStatus.CLOSED;
    updateData.closedAt = new Date();
  } else if (data.isActive === true) {
    updateData.status = TaskStatus.OPEN;
    updateData.closedAt = null;
  }

  return prisma.task.update({ where: { id }, data: updateData });
}
