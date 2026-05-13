import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateToken } from '@/middleware/auth';
import { requireRole } from '@/middleware/roleGuard';
import {
  lockMonth,
  unlockMonth,
  listMonths,
  isMonthLocked,
  getMissingReports,
} from '@/services/month-lock.service';

const router = Router();

router.use(authenticateToken);

const querySchema = z.object({
  year:  z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const paramsSchema = z.object({
  year:  z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const hasQuery = req.query.year !== undefined || req.query.month !== undefined;

  if (!hasQuery) {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'אין לך הרשאה לבצע פעולה זו' });
      return;
    }
    try {
      const months = await listMonths();
      res.status(200).json(months);
    } catch (err) {
      next(err);
    }
    return;
  }

  const result = querySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.format() });
    return;
  }

  try {
    const { year, month } = result.data;
    const locked = await isMonthLocked(year, month);
    res.status(200).json({ year, month, isLocked: locked });
  } catch (err) {
    next(err);
  }
});

router.get(
  '/:year/:month/missing-reports',
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    const result = paramsSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({ error: result.error.format() });
      return;
    }
    try {
      const { year, month } = result.data;
      const missing = await getMissingReports(year, month);
      res.status(200).json(missing);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/:year/:month/lock',
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    const result = paramsSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({ error: result.error.format() });
      return;
    }

    try {
      const { year, month } = result.data;
      const missing = await getMissingReports(year, month);
      if (missing.length > 0) {
        res.status(409).json({
          error: 'יש עובדים עם דיווחים חסרים, לא ניתן לנעול את החודש',
          missingReports: missing,
        });
        return;
      }
      const lock = await lockMonth(year, month, req.user!.userId);
      res.status(200).json({
        year:     lock.year,
        month:    lock.month,
        isLocked: lock.isLocked,
        lockedAt: lock.lockedAt,
        lockedBy: lock.lockedByUser,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/:year/:month/unlock',
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    const result = paramsSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({ error: result.error.format() });
      return;
    }

    try {
      const { year, month } = result.data;
      const lock = await unlockMonth(year, month, req.user!.userId);
      res.status(200).json({
        year:       lock.year,
        month:      lock.month,
        isLocked:   lock.isLocked,
        reopenedAt: lock.reopenedAt,
        reopenedBy: lock.reopenedByUser,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
