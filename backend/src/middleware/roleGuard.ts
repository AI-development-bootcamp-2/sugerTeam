import { Request, Response, NextFunction, RequestHandler } from 'express';
import type { UserRole } from '@prisma/client';

export function requireRole(...roles: UserRole[]): RequestHandler {
  if (roles.length === 0) {
    throw new Error('requireRole requires at least one role');
  }
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'טוקן חסר או לא תקין' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'אין לך הרשאה לבצע פעולה זו' });
      return;
    }
    next();
  };
}
