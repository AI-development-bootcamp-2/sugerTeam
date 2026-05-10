import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRole, UserStatus } from '@prisma/client';
import prisma from '../prisma/client';

// Fail at module load rather than at the first sign/verify call — jwt throws a
// cryptic "secretOrPrivateKey must have a value" deep in the stack otherwise,
// making misconfigured deployments very hard to diagnose.
if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set');
}

// Pre-computed at startup so bcrypt.compare always runs the full cost-12 work,
// preventing timing-based email enumeration when the user doesn't exist.
const DUMMY_HASH = bcrypt.hashSync('__timing_guard__', 12);

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; fullName: string; role: UserRole };
}

export class AuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function signAccess(userId: string, role: UserRole): string {
  return jwt.sign(
    { sub: userId, role },
    process.env.JWT_ACCESS_SECRET!,
    { algorithm: 'HS256', expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '2h') as string }
  );
}

function signRefresh(userId: string): string {
  return jwt.sign(
    { sub: userId },
    process.env.JWT_REFRESH_SECRET!,
    { algorithm: 'HS256', expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') as string }
  );
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await prisma.user.findFirst({ where: { email: email.toLowerCase(), deletedAt: null } });

  // Always compare to prevent timing-based email enumeration
  const hash = user?.passwordHash ?? DUMMY_HASH;
  const match = await bcrypt.compare(password, hash);

  if (!user || user.status === UserStatus.INACTIVE || !match) {
    throw new AuthError(401, 'Invalid credentials');
  }

  return {
    accessToken: signAccess(user.id, user.role),
    refreshToken: signRefresh(user.id),
    user: { id: user.id, fullName: user.fullName, role: user.role },
  };
}

export async function refreshTokens(refreshToken: string): Promise<AuthResult> {
  let userId: string;
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
    if (typeof decoded === 'string' || !decoded.sub) {
      throw new AuthError(401, 'Invalid refresh token');
    }
    userId = decoded.sub as string;
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError(401, 'Invalid refresh token');
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null, status: UserStatus.ACTIVE },
  });

  if (!user) {
    throw new AuthError(401, 'User not found or inactive');
  }

  return {
    accessToken: signAccess(user.id, user.role),
    refreshToken: signRefresh(user.id),
    user: { id: user.id, fullName: user.fullName, role: user.role },
  };
}

export function logout(): void {
  // No server state to clear; cookie is handled by the route
}
