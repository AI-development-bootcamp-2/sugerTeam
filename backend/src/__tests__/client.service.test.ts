import { EntityStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { createClient, listActiveClients, updateClient } from '../services/client.service';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    client: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockClient = {
  id: 'test-client-id',
  name: 'Test Client',
  description: null,
  status: EntityStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createClient', () => {
  it('creates a client with ACTIVE status', async () => {
    jest.mocked(prisma.client.create).mockResolvedValue(mockClient);

    const result = await createClient({ name: 'Test Client' });

    expect(prisma.client.create).toHaveBeenCalledWith({
      data: { name: 'Test Client', status: EntityStatus.ACTIVE },
    });
    expect(result).toEqual(mockClient);
  });

  it('allows duplicate names', async () => {
    jest.mocked(prisma.client.create).mockResolvedValue(mockClient);

    await createClient({ name: 'Duplicate' });
    await createClient({ name: 'Duplicate' });

    expect(prisma.client.create).toHaveBeenCalledTimes(2);
  });
});

describe('listActiveClients', () => {
  it('filters by ACTIVE status and null deletedAt, ordered by name asc', async () => {
    jest.mocked(prisma.client.findMany).mockResolvedValue([mockClient]);

    const result = await listActiveClients();

    expect(prisma.client.findMany).toHaveBeenCalledWith({
      where: { status: EntityStatus.ACTIVE, deletedAt: null },
      orderBy: { name: 'asc' },
    });
    expect(result).toEqual([mockClient]);
  });

  it('returns empty array when no active clients', async () => {
    jest.mocked(prisma.client.findMany).mockResolvedValue([]);

    const result = await listActiveClients();

    expect(result).toEqual([]);
  });
});

describe('updateClient', () => {
  it('updates name when provided', async () => {
    jest.mocked(prisma.client.update).mockResolvedValue({ ...mockClient, name: 'New Name' });

    await updateClient('test-client-id', { name: 'New Name' });

    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: 'test-client-id' },
      data: expect.objectContaining({ name: 'New Name' }),
    });
  });

  it('sets status INACTIVE and deletedAt when isActive=false', async () => {
    jest.mocked(prisma.client.update).mockResolvedValue({
      ...mockClient,
      status: EntityStatus.INACTIVE,
      deletedAt: new Date(),
    });

    await updateClient('test-client-id', { isActive: false });

    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: 'test-client-id' },
      data: expect.objectContaining({
        status: EntityStatus.INACTIVE,
        deletedAt: expect.any(Date),
      }),
    });
  });

  it('sets status ACTIVE and deletedAt null when isActive=true', async () => {
    jest.mocked(prisma.client.update).mockResolvedValue(mockClient);

    await updateClient('test-client-id', { isActive: true });

    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: 'test-client-id' },
      data: expect.objectContaining({
        status: EntityStatus.ACTIVE,
        deletedAt: null,
      }),
    });
  });

  it('propagates P2025 without converting it', async () => {
    const err = Object.assign(new Error('Not found'), { code: 'P2025' });
    jest.mocked(prisma.client.update).mockRejectedValue(err);

    await expect(updateClient('nonexistent', { name: 'X' })).rejects.toMatchObject({
      code: 'P2025',
    });
  });
});
