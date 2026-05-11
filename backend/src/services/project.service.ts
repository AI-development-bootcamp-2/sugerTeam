import { EntityStatus } from '@prisma/client';
import type { Project, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

export class NotFoundError extends Error {
  status = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export async function createProject(data: {
  clientId: string;
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  primaryManagerId?: string;
}): Promise<Project> {
  const client = await prisma.client.findUnique({ where: { id: data.clientId } });
  if (!client) throw new NotFoundError(`Client ${data.clientId} not found`);

  if (data.primaryManagerId) {
    const manager = await prisma.user.findUnique({ where: { id: data.primaryManagerId } });
    if (!manager) throw new NotFoundError(`Manager ${data.primaryManagerId} not found`);
  }

  return prisma.project.create({
    data: {
      clientId: data.clientId,
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      primaryManagerId: data.primaryManagerId,
      status: EntityStatus.ACTIVE,
    },
  });
}

export async function listActiveProjects(clientId: string): Promise<Project[]> {
  return prisma.project.findMany({
    where: {
      clientId,
      status: EntityStatus.ACTIVE,
      deletedAt: null,
    },
    orderBy: { name: 'asc' },
  });
}

export async function listAllProjects(): Promise<Project[]> {
  return prisma.project.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function updateProject(
  id: string,
  data: {
    name?: string;
    description?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    primaryManagerId?: string | null;
    isActive?: boolean;
  },
): Promise<Project> {
  if (data.primaryManagerId) {
    const manager = await prisma.user.findUnique({ where: { id: data.primaryManagerId } });
    if (!manager) throw new NotFoundError(`Manager ${data.primaryManagerId} not found`);
  }

  const updateData: Prisma.ProjectUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if ('startDate' in data) updateData.startDate = data.startDate;
  if ('endDate' in data) updateData.endDate = data.endDate;
  if ('primaryManagerId' in data) {
    updateData.primaryManager = data.primaryManagerId
      ? { connect: { id: data.primaryManagerId } }
      : { disconnect: true };
  }
  if (data.isActive === false) {
    updateData.status = EntityStatus.INACTIVE;
    updateData.deletedAt = new Date();
  } else if (data.isActive === true) {
    updateData.status = EntityStatus.ACTIVE;
    updateData.deletedAt = null;
  }

  return prisma.project.update({ where: { id }, data: updateData });
}
