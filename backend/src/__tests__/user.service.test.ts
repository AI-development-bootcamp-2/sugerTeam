import { UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from '../prisma/client';
import {
  createUser,
  listUsers,
  updateUser,
  deactivateUser,
  activateUser,
  ConflictError,
} from '../services/user.service';

jest.mock('../prisma/client', () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('bcrypt');

const mockDbUser = {
  id: 'test-id',
  fullName: 'Test User',
  email: 'test@example.com',
  passwordHash: 'hashed',
  role: UserRole.EMPLOYEE,
  status: UserStatus.ACTIVE,
  passwordChangedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createUser', () => {
  it('calls bcrypt.hash with cost 12 and returns no passwordHash', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    (prisma.user.create as jest.Mock).mockResolvedValue(mockDbUser);

    const result = await createUser({
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: UserRole.EMPLOYEE,
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('normalises email to lowercase + trim before creating', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    (prisma.user.create as jest.Mock).mockResolvedValue(mockDbUser);

    await createUser({
      fullName: 'Test',
      email: '  TEST@EXAMPLE.COM  ',
      password: 'pass',
      role: UserRole.EMPLOYEE,
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'test@example.com' }),
      }),
    );
  });

  it('sets passwordChangedAt to a Date instance, not null', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    (prisma.user.create as jest.Mock).mockResolvedValue(mockDbUser);

    await createUser({
      fullName: 'Test',
      email: 'test@example.com',
      password: 'pass',
      role: UserRole.EMPLOYEE,
    });

    const call = (prisma.user.create as jest.Mock).mock.calls[0][0];
    expect(call.data.passwordChangedAt).toBeInstanceOf(Date);
  });

  it('throws ConflictError on P2002', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    const err = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
    (prisma.user.create as jest.Mock).mockRejectedValue(err);

    await expect(
      createUser({ fullName: 'Test', email: 'test@example.com', password: 'pass', role: UserRole.EMPLOYEE }),
    ).rejects.toThrow(ConflictError);
  });
});

describe('listUsers', () => {
  it('calls findMany with empty where when no filters provided', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    await listUsers({});

    expect(prisma.user.findMany).toHaveBeenCalledWith({ where: {} });
  });

  it('applies role filter', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    await listUsers({ role: UserRole.ADMIN });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ role: UserRole.ADMIN }),
    });
  });

  it('isActive=true maps to status ACTIVE', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    await listUsers({ isActive: true });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ status: UserStatus.ACTIVE }),
    });
  });

  it('isActive=false maps to status INACTIVE', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    await listUsers({ isActive: false });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ status: UserStatus.INACTIVE }),
    });
  });

  it('search adds OR with mode insensitive on fullName and email', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

    await listUsers({ search: 'alice' });

    const call = (prisma.user.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fullName: expect.objectContaining({ mode: 'insensitive' }) }),
        expect.objectContaining({ email: expect.objectContaining({ mode: 'insensitive' }) }),
      ]),
    );
  });

  it('strips passwordHash from every result', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([mockDbUser, mockDbUser]);

    const results = await listUsers({});

    for (const r of results) {
      expect(r).not.toHaveProperty('passwordHash');
    }
  });
});

describe('updateUser', () => {
  it('passes only provided fields to prisma and returns no passwordHash', async () => {
    (prisma.user.update as jest.Mock).mockResolvedValue(mockDbUser);

    const result = await updateUser('test-id', { fullName: 'New Name' });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { fullName: 'New Name' } }),
    );
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('normalises email to lowercase + trim before updating', async () => {
    (prisma.user.update as jest.Mock).mockResolvedValue(mockDbUser);

    await updateUser('test-id', { email: ' UPPER@EXAMPLE.COM ' });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'upper@example.com' }),
      }),
    );
  });

  it('throws ConflictError on P2002', async () => {
    const err = Object.assign(new Error('Unique'), { code: 'P2002' });
    (prisma.user.update as jest.Mock).mockRejectedValue(err);

    await expect(updateUser('id', { fullName: 'X' })).rejects.toThrow(ConflictError);
  });

  it('propagates P2025 without converting to ConflictError', async () => {
    const err = Object.assign(new Error('Not found'), { code: 'P2025' });
    (prisma.user.update as jest.Mock).mockRejectedValue(err);

    await expect(updateUser('id', { fullName: 'X' })).rejects.not.toThrow(ConflictError);
    await expect(updateUser('id', { fullName: 'X' })).rejects.toMatchObject({ code: 'P2025' });
  });
});

describe('deactivateUser', () => {
  it('calls prisma with status INACTIVE and deletedAt as a Date', async () => {
    (prisma.user.update as jest.Mock).mockResolvedValue({
      ...mockDbUser,
      status: UserStatus.INACTIVE,
      deletedAt: new Date(),
    });

    await deactivateUser('test-id');

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: UserStatus.INACTIVE,
          deletedAt: expect.any(Date),
        }),
      }),
    );
  });
});

describe('activateUser', () => {
  it('calls prisma with status ACTIVE and deletedAt null', async () => {
    (prisma.user.update as jest.Mock).mockResolvedValue(mockDbUser);

    await activateUser('test-id');

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: UserStatus.ACTIVE,
          deletedAt: null,
        }),
      }),
    );
  });
});
