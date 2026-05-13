import { UserStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  listTasksWithAssignments,
  syncTaskAssignments,
  removeAllTaskAssignments,
  listActiveUsers,
} from '../services/taskAssignment.service';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    task: { findMany: jest.fn() },
    taskAssignment: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    user: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const mockTask = {
  id: 'task-1',
  projectId: 'proj-1',
  name: 'Task One',
  description: null,
  startDate: null,
  endDate: null,
  status: 'OPEN' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  closedAt: null,
  deletedAt: null,
  project: { id: 'proj-1', name: 'Project One', client: { id: 'client-1', name: 'Client One' } },
  assignments: [],
};

describe('listTasksWithAssignments', () => {
  it('fetches all non-deleted tasks with project and assignments', async () => {
    jest.mocked(prisma.task.findMany).mockResolvedValue([mockTask] as never);

    const result = await listTasksWithAssignments();

    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      include: {
        project: {
          select: { id: true, name: true, client: { select: { id: true, name: true } } },
        },
        assignments: {
          include: { user: { select: { id: true, fullName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([mockTask]);
  });

  it('scopes query to projectId when provided', async () => {
    jest.mocked(prisma.task.findMany).mockResolvedValue([mockTask] as never);

    await listTasksWithAssignments('proj-1');

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null, projectId: 'proj-1' } }),
    );
  });
});

describe('syncTaskAssignments', () => {
  it('calls deleteMany and createMany with correct args inside a transaction', async () => {
    jest.mocked(prisma.$transaction).mockResolvedValue([]);

    await syncTaskAssignments('task-1', ['user-1', 'user-2'], 'admin-1');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.taskAssignment.deleteMany).toHaveBeenCalledWith({
      where: { taskId: 'task-1', userId: { notIn: ['user-1', 'user-2'] } },
    });
    expect(prisma.taskAssignment.createMany).toHaveBeenCalledWith({
      data: [
        { taskId: 'task-1', userId: 'user-1', assignedBy: 'admin-1' },
        { taskId: 'task-1', userId: 'user-2', assignedBy: 'admin-1' },
      ],
      skipDuplicates: true,
    });
  });

  it('handles empty userIds by deleting all assignments', async () => {
    jest.mocked(prisma.$transaction).mockResolvedValue([]);

    await syncTaskAssignments('task-1', [], 'admin-1');

    expect(prisma.taskAssignment.deleteMany).toHaveBeenCalledWith({
      where: { taskId: 'task-1', userId: { notIn: [] } },
    });
    expect(prisma.taskAssignment.createMany).toHaveBeenCalledWith({
      data: [],
      skipDuplicates: true,
    });
  });
});

describe('removeAllTaskAssignments', () => {
  it('deletes all assignments for the given taskId', async () => {
    jest.mocked(prisma.taskAssignment.deleteMany).mockResolvedValue({ count: 2 });

    await removeAllTaskAssignments('task-1');

    expect(prisma.taskAssignment.deleteMany).toHaveBeenCalledWith({
      where: { taskId: 'task-1' },
    });
  });
});

describe('listActiveUsers', () => {
  it('fetches active non-deleted users ordered by fullName', async () => {
    const mockUsers = [{ id: 'user-1', fullName: 'Alice' }];
    jest.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as never);

    const result = await listActiveUsers();

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { status: UserStatus.ACTIVE, deletedAt: null },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    });
    expect(result).toEqual(mockUsers);
  });
});
