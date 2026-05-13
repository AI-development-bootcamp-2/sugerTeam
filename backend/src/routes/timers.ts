import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '@/middleware/auth';
import { getActiveTimer, startTimer, stopTimer } from '@/services/timer.service';
import { ConflictError, NotFoundError } from '@/lib/errors';

const router = Router();

router.use(authenticateToken);

function handleServiceError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof ConflictError) {
    res.status(409).json({ error: (err as Error).message });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: (err as Error).message });
    return;
  }
  next(err);
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const timer = await getActiveTimer(req.user!.userId);
    if (!timer) {
      res.status(200).json(null);
      return;
    }
    res.status(200).json({ timerId: timer.id, startedAt: timer.startedAt.toISOString() });
  } catch (err) {
    next(err);
  }
});

router.post('/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const timer = await startTimer(req.user!.userId);
    res.status(201).json({ timerId: timer.id, startedAt: timer.startedAt.toISOString() });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

router.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { timerId, startedAt, stoppedAt } = await stopTimer(req.user!.userId);
    res.status(200).json({
      timerId,
      startedAt: startedAt.toISOString(),
      stoppedAt: stoppedAt.toISOString(),
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

export default router;
