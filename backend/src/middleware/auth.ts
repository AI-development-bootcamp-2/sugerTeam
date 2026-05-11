import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';

export interface AuthPayload {
  userId: string;
  role: UserRole;
}

interface TokenPayload {
  sub: string;
  role: UserRole;
}

const VALID_ROLES = new Set<string>(['EMPLOYEE', 'TEAM_LEAD', 'ADMIN']);

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'שגיאת שרת פנימית' });
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'טוקן חסר או לא תקין' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as TokenPayload;
    if (
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0 ||
      !VALID_ROLES.has(payload.role)
    ) {
      res.status(401).json({ error: 'טוקן חסר או לא תקין' });
      return;
    }
    req.user = { userId: payload.sub, role: payload.role };
    next();
  } catch (err) {
    console.error('[authenticateToken] JWT verification failed:', err);
    res.status(401).json({ error: 'טוקן חסר או לא תקין' });
  }
}
