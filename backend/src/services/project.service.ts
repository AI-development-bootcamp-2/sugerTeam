import { EntityStatus } from '@prisma/client';
import type { Project, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { NotFoundError } from '@/lib/errors';

export { NotFoundError };

export async function createProject(data: { clientId: string; name: string; description?: string; startDate?: string; endDate?: string }): Promise<Project> {
  const client = await prisma.client.findUnique({ where: { id: data.clientId } });
  if (!client) {
    throw new NotFoundError(`Client ${data.clientId} not found`);
  }

  return prisma.project.create({
    data: {
      clientId:    data.clientId,
      name:        data.name,
      description: data.description,
      status:      EntityStatus.ACTIVE,
      startDate:   data.startDate ? new Date(data.startDate) : undefined,
      endDate:     data.endDate   ? new Date(data.endDate)   : undefined,
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

export type ProjectWithManager = Project & {
  client: { id: string; name: string };
};

export async function listProjectsByClient(clientId?: string): Promise<ProjectWithManager[]> {
  return prisma.project.findMany({
    where: clientId ? { clientId } : undefined,
    include: {
      client: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export async function updateProject(
  id: string,
  data: { name?: string; description?: string; isActive?: boolean; startDate?: string | null; endDate?: string | null },
): Promise<Project> {
  const updateData: Prisma.ProjectUpdateInput = {};

  if (data.name        !== undefined) updateData.name        = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.startDate   !== undefined) updateData.startDate   = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate   !== undefined) updateData.endDate   = data.endDate   ? new Date(data.endDate)   : null;
  if (data.isActive === false) {
    updateData.status = EntityStatus.INACTIVE;
  } else if (data.isActive === true) {
    updateData.status = EntityStatus.ACTIVE;
  }

  return prisma.project.update({ where: { id }, data: updateData });
}
