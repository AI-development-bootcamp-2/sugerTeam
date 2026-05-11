import { TaskStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { createTask, listActiveTasks, updateTask, NotFoundError } from '../services/task.service';

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
  id: 'test-project-id',
  clientId: 'test-client-id',
  name: 'Test Project',
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockTask = {
  id: 'test-task-id',
  projectId: 'test-project-id',
  name: 'Test Task',
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
  it('creates a task with OPEN status when project exists', async () => {
    jest.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never);
    jest.mocked(prisma.task.create).mockResolvedValue(mockTask);

    const result = await createTask({ projectId: 'test-project-id', name: 'Test Task' });

    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: 'test-project-id' },
    });
    expect(prisma.task.create).toHaveBeenCalledWith({
      data: {
        projectId: 'test-project-id',
        name: 'Test Task',
        status: TaskStatus.OPEN,
      },
    });
    expect(result).toEqual(mockTask);
  });

  it('throws NotFoundError when project does not exist', async () => {
    jest.mocked(prisma.project.findUnique).mockResolvedValue(null);

    await expect(createTask({ projectId: 'nonexistent', name: 'Test Task' })).rejects.toThrow(
      NotFoundError,
    );
    expect(prisma.task.create).not.toHaveBeenCalled();
  });
});

describe('listActiveTasks', () => {
  it('filters by projectId and OPEN status, ordered by name asc', async () => {
    jest.mocked(prisma.task.findMany).mockResolvedValue([mockTask]);

    const result = await listActiveTasks('test-project-id');

    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { projectId: 'test-project-id', status: TaskStatus.OPEN },
      orderBy: { name: 'asc' },
    });
    expect(result).toEqual([mockTask]);
  });

  it('returns empty array when no active tasks', async () => {
    jest.mocked(prisma.task.findMany).mockResolvedValue([]);

    const result = await listActiveTasks('test-project-id');

    expect(result).toEqual([]);
  });
});

describe('updateTask', () => {
  it('updates name when provided', async () => {
    jest.mocked(prisma.task.update).mockResolvedValue({ ...mockTask, name: 'New Name' });

    await updateTask('test-task-id', { name: 'New Name' });

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'test-task-id' },
      data: expect.objectContaining({ name: 'New Name' }),
    });
  });

  it('sets status CLOSED and closedAt when isActive=false', async () => {
    jest.mocked(prisma.task.update).mockResolvedValue({
      ...mockTask,
      status: TaskStatus.CLOSED,
      closedAt: new Date(),
    });

    await updateTask('test-task-id', { isActive: false });

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'test-task-id' },
      data: expect.objectContaining({
        status: TaskStatus.CLOSED,
        closedAt: expect.any(Date),
      }),
    });
  });

  it('sets status OPEN and closedAt null when isActive=true', async () => {
    jest.mocked(prisma.task.update).mockResolvedValue(mockTask);

    await updateTask('test-task-id', { isActive: true });

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'test-task-id' },
      data: expect.objectContaining({
        status: TaskStatus.OPEN,
        closedAt: null,
      }),
    });
  });

  it('propagates P2025 without converting it', async () => {
    const err = Object.assign(new Error('Not found'), { code: 'P2025' });
    jest.mocked(prisma.task.update).mockRejectedValue(err);

    await expect(updateTask('nonexistent', { name: 'X' })).rejects.toMatchObject({
      code: 'P2025',
    });
  });
});
