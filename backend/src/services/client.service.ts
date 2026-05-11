import { EntityStatus } from '@prisma/client';
import type { Client, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

export async function createClient(data: { name: string; description?: string }): Promise<Client> {
  return prisma.client.create({
    data: {
      name: data.name,
      description: data.description,
      status: EntityStatus.ACTIVE,
    },
  });
}

export async function listActiveClients(): Promise<Client[]> {
  return prisma.client.findMany({
    where: {
      status: EntityStatus.ACTIVE,
      deletedAt: null,
    },
    orderBy: { name: 'asc' },
  });
}

export async function listAllClients(): Promise<Client[]> {
  return prisma.client.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function updateClient(
  id: string,
  data: { name?: string; description?: string; isActive?: boolean },
): Promise<Client> {
  const updateData: Prisma.ClientUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.isActive === false) {
    updateData.status = EntityStatus.INACTIVE;
    updateData.deletedAt = new Date();
  } else if (data.isActive === true) {
    updateData.status = EntityStatus.ACTIVE;
    updateData.deletedAt = null;
  }

  return prisma.client.update({ where: { id }, data: updateData });
}
