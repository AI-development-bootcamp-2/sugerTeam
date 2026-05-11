import bcrypt from 'bcrypt';
import { UserRole, UserStatus, User } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export type SafeUser = Omit<User, 'passwordHash'>;

function omitHash(user: User): SafeUser {
  const { passwordHash, ...safe } = user;
  void passwordHash;
  return safe;
}

export async function createUser(data: {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<SafeUser> {
  const email = data.email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(data.password, 12);
  try {
    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email,
        passwordHash,
        role: data.role,
        status: UserStatus.ACTIVE,
        passwordChangedAt: new Date(),
      },
    });
    return omitHash(user);
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      throw new ConflictError('Email already in use');
    }
    throw err;
  }
}

export async function listUsers(filters: {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}): Promise<SafeUser[]> {
  const where: Prisma.UserWhereInput = {
    ...(filters.role !== undefined && { role: filters.role }),
    ...(filters.isActive === true && { status: UserStatus.ACTIVE }),
    ...(filters.isActive === false && { status: UserStatus.INACTIVE }),
    ...(filters.search && {
      OR: [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ],
    }),
  };

  const users = await prisma.user.findMany({ where });
  return users.map(omitHash);
}

export async function updateUser(
  id: string,
  data: { fullName?: string; email?: string; role?: UserRole },
): Promise<SafeUser> {
  const updateData = { ...data };
  if (updateData.email) {
    updateData.email = updateData.email.toLowerCase().trim();
  }
  try {
    const user = await prisma.user.update({ where: { id }, data: updateData });
    return omitHash(user);
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      throw new ConflictError('Email already in use');
    }
    throw err;
  }
}

export async function deactivateUser(id: string): Promise<SafeUser> {
  const user = await prisma.user.update({
    where: { id },
    data: { status: UserStatus.INACTIVE, deletedAt: new Date() },
  });
  return omitHash(user);
}

export async function activateUser(id: string): Promise<SafeUser> {
  const user = await prisma.user.update({
    where: { id },
    data: { status: UserStatus.ACTIVE, deletedAt: null },
  });
  return omitHash(user);
}

export async function listManagers(): Promise<SafeUser[]> {
  const users = await prisma.user.findMany({
    where: {
      status: UserStatus.ACTIVE,
      role: { in: [UserRole.TEAM_LEAD, UserRole.ADMIN] },
    },
    orderBy: { fullName: 'asc' },
  });
  return users.map(omitHash);
}
