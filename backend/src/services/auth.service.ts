import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';

const PASSWORD_MAX_AGE_DAYS = 30;
const REFRESH_LIFETIME_DAYS = 30;

class AuthError extends Error {
  constructor(
    public readonly code: string,
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
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '2h') as string,
  } as jwt.SignOptions);
}

function signRefresh(userId: string, jti: string): string {
  return jwt.sign({ sub: userId, jti }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '30d') as string,
  } as jwt.SignOptions);
}

interface TokenResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; fullName: string; role: string };
}

export class AuthService {
  async login(
    email: string,
    password: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<TokenResult> {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.status === 'INACTIVE') {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid credentials');
    }

    // null = seeded admin account, exempt from rotation
    if (user.passwordChangedAt !== null) {
      const ageDays =
        (Date.now() - user.passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > PASSWORD_MAX_AGE_DAYS) {
        throw new AuthError('PASSWORD_EXPIRED', 'Password has expired; please change it');
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

  async refreshTokens(refreshToken: string): Promise<TokenResult> {
    let payload: { sub: string; jti: string };
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as {
        sub: string;
        jti: string;
      };
    } catch {
      throw new AuthError('INVALID_TOKEN', 'Invalid refresh token');
    }

    const record = await prisma.refreshToken.findUnique({ where: { jti: payload.jti } });
    if (!record || record.revokedAt !== null || record.expiresAt < new Date()) {
      throw new AuthError('INVALID_TOKEN', 'Refresh token revoked or expired');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status === 'INACTIVE') {
      throw new AuthError('INVALID_TOKEN', 'User not found or inactive');
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

  async logout(refreshToken: string): Promise<void> {
    let payload: { jti: string };
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { jti: string };
    } catch {
      // expired or invalid token — treat as already logged out
      return;
    }

    await prisma.refreshToken.updateMany({
      where: { jti: payload.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
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
}
