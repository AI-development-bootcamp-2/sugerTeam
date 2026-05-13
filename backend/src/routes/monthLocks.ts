import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateToken } from '@/middleware/auth';
import prisma from '@/lib/prisma';

const router = Router();

router.use(authenticateToken);

const querySchema = z.object({
  year:  z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const result = querySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.format() });
    return;
  }

  try {
    const { year, month } = result.data;
    const lock = await prisma.monthLock.findUnique({
      where: { year_month: { year, month } },
    });
    res.status(200).json({ year, month, isLocked: lock?.isLocked ?? false });
  } catch (err) {
    next(err);
  }
});

export default router;
