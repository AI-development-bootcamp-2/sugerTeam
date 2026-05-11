import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/prisma/client';

if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set');
}

const PASSWORD_MAX_AGE_DAYS = 30;
const REFRESH_LIFETIME_DAYS = 30;

// Pre-computed to prevent timing-based email enumeration when the user doesn't exist
const DUMMY_HASH = bcrypt.hashSync('__timing_guard__', 12);

export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

function refreshExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_LIFETIME_DAYS);
  return d;
}

function signAccess(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role }, process.env.JWT_ACCESS_SECRET!, {
    algorithm: 'HS256',
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '2h') as string,
  } as jwt.SignOptions);
}

function signRefresh(userId: string, jti: string): string {
  return jwt.sign({ sub: userId, jti }, process.env.JWT_REFRESH_SECRET!, {
    algorithm: 'HS256',
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') as string,
  } as jwt.SignOptions);
}

interface TokenResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; fullName: string; role: string };
}

export async function login(
  email: string,
  password: string,
  userAgent?: string,
  ipAddress?: string,
): Promise<TokenResult> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Always run bcrypt to prevent timing-based email enumeration
  const hash = user?.passwordHash ?? DUMMY_HASH;
  const valid = await bcrypt.compare(password, hash);

  if (!user || user.status === 'INACTIVE' || !valid) {
    throw new AuthError(401, 'Invalid credentials');
  }

  // null = seeded admin account, exempt from 30-day rotation
  if (user.passwordChangedAt != null) {
    const ageDays =
      (Date.now() - user.passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > PASSWORD_MAX_AGE_DAYS) {
      throw new AuthError(401, 'Password has expired; please change it');
    }
  }

  const jti = uuidv4();
  const accessToken = signAccess(user.id, user.role);
  const refreshToken = signRefresh(user.id, jti);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      jti,
      expiresAt: refreshExpiresAt(),
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    },
  });

  return { accessToken, refreshToken, user: { id: user.id, fullName: user.fullName, role: user.role } };
}

export async function refreshTokens(refreshToken: string): Promise<TokenResult> {
  let payload: { sub: string; jti: string };
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!, {
      algorithms: ['HS256'],
    }) as { sub: string; jti: string };
  } catch {
    throw new AuthError(401, 'Invalid refresh token');
  }

  const record = await prisma.refreshToken.findUnique({ where: { jti: payload.jti } });
  if (!record || record.revokedAt !== null || record.expiresAt < new Date()) {
    throw new AuthError(401, 'Refresh token revoked or expired');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.status === 'INACTIVE') {
    throw new AuthError(401, 'User not found or inactive');
  }

  const newJti = uuidv4();
  // Atomic: revoke old token and issue new one
  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { jti: payload.jti },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        jti: newJti,
        expiresAt: refreshExpiresAt(),
        userAgent: record.userAgent,
        ipAddress: record.ipAddress,
      },
    }),
  ]);

  const accessToken = signAccess(user.id, user.role);
  const newRefreshToken = signRefresh(user.id, newJti);

  return { accessToken, refreshToken: newRefreshToken, user: { id: user.id, fullName: user.fullName, role: user.role } };
}

export async function logout(refreshToken: string): Promise<void> {
  let payload: { jti: string };
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!, {
      algorithms: ['HS256'],
    }) as { jti: string };
  } catch {
    // expired or invalid token — treat as already logged out
    return;
  }

  await prisma.refreshToken.updateMany({
    where: { jti: payload.jti, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function changePassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordChangedAt: new Date() },
    }),
    // Revoke all active sessions across all devices
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}
