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

export async function createProject(data: { clientId: string; name: string }): Promise<Project> {
  const client = await prisma.client.findUnique({ where: { id: data.clientId } });
  if (!client) {
    throw new NotFoundError(`Client ${data.clientId} not found`);
  }

  return prisma.project.create({
    data: {
      clientId: data.clientId,
      name: data.name,
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
  data: { name?: string; isActive?: boolean },
): Promise<Project> {
  const updateData: Prisma.ProjectUpdateInput = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
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
