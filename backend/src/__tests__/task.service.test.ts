import { TaskStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { createTask, listActiveTasks, listTasksByProject, updateTask, NotFoundError } from '../services/task.service';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    project: {
      findUnique: jest.fn(),
    },
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockProject = {
  id: 'proj-id',
  clientId: 'client-id',
  name: 'Test Project',
  description: null,
  startDate: null,
  endDate: null,
  primaryManagerId: null,
  status: 'ACTIVE' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockTask = {
  id: 'task-id',
  projectId: 'proj-id',
  name: 'Test Task',
  description: null,
  startDate: null,
  endDate: null,
  status: TaskStatus.OPEN,
  createdAt: new Date(),
  updatedAt: new Date(),
  closedAt: null,
  deletedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createTask', () => {
  it('throws NotFoundError when project does not exist', async () => {
    jest.mocked(prisma.project.findUnique).mockResolvedValue(null);

    await expect(createTask({ projectId: 'missing', name: 'Task' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('creates task with OPEN status when project exists', async () => {
    jest.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never);
    jest.mocked(prisma.task.create).mockResolvedValue(mockTask);

    const result = await createTask({ projectId: 'proj-id', name: 'Test Task' });

    expect(prisma.task.create).toHaveBeenCalledWith({
      data: { projectId: 'proj-id', name: 'Test Task', status: TaskStatus.OPEN },
    });
    expect(result).toEqual(mockTask);
  });
});

describe('listActiveTasks', () => {
  it('filters by projectId, OPEN status, and null deletedAt, ordered by name asc', async () => {
    jest.mocked(prisma.task.findMany).mockResolvedValue([mockTask]);

    const result = await listActiveTasks('proj-id');

    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { projectId: 'proj-id', status: TaskStatus.OPEN, deletedAt: null },
      orderBy: { name: 'asc' },
    });
    expect(result).toEqual([mockTask]);
  });
});

describe('listTasksByProject', () => {
  it('returns all tasks for projectId regardless of status', async () => {
    const closedTask = { ...mockTask, id: 'task-2', status: TaskStatus.CLOSED };
    jest.mocked(prisma.task.findMany).mockResolvedValue([mockTask, closedTask]);

    const result = await listTasksByProject('proj-id');

    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { projectId: 'proj-id' },
      orderBy: { name: 'asc' },
    });
    expect(result).toHaveLength(2);
  });
});

describe('updateTask', () => {
  it('updates name when provided', async () => {
    jest.mocked(prisma.task.update).mockResolvedValue({ ...mockTask, name: 'New Name' });

    await updateTask('task-id', { name: 'New Name' });

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'task-id' },
      data: expect.objectContaining({ name: 'New Name' }),
    });
  });

  it('sets status CLOSED and closedAt when isActive=false', async () => {
    jest.mocked(prisma.task.update).mockResolvedValue({
      ...mockTask,
      status: TaskStatus.CLOSED,
      closedAt: new Date(),
    });

    await updateTask('task-id', { isActive: false });

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'task-id' },
      data: expect.objectContaining({
        status: TaskStatus.CLOSED,
        closedAt: expect.any(Date),
      }),
    });
  });

  it('sets status OPEN and closedAt null when isActive=true', async () => {
    jest.mocked(prisma.task.update).mockResolvedValue(mockTask);

    await updateTask('task-id', { isActive: true });

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'task-id' },
      data: expect.objectContaining({
        status: TaskStatus.OPEN,
        closedAt: null,
      }),
    });
  });

  it('propagates P2025 without converting it', async () => {
    const err = Object.assign(new Error('Not found'), { code: 'P2025' });
    jest.mocked(prisma.task.update).mockRejectedValue(err);

    await expect(updateTask('nonexistent', { name: 'X' })).rejects.toMatchObject({ code: 'P2025' });
  });
});
