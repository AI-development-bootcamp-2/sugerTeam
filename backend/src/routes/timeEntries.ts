import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { WorkLocation, DailyReportStatus } from '@prisma/client';
import { authenticateToken } from '@/middleware/auth';
import {
  getMonthlyDays,
  upsertDayReport,
  deleteDayReport,
  getDropdownData,
  getMonthlySummary,
  NotFoundError,
  ConflictError,
  LockedError,
} from '@/services/timeEntries.service';

const router = Router();

router.use(authenticateToken);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const monthQuerySchema = z.object({
  year:  z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const reportDateParamSchema = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const entrySchema = z.object({
  workLocation: z.nativeEnum(WorkLocation),
  clientId:     z.string().uuid(),
  projectId:    z.string().uuid(),
  taskId:       z.string().uuid(),
  startTime:    z.string().regex(/^\d{2}:\d{2}$/),
  endTime:      z.string().regex(/^\d{2}:\d{2}$/),
  description:  z.string().max(500).optional(),
});

const dayReportSchema = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime:  z.string().regex(/^\d{2}:\d{2}$/),
  endTime:    z.string().regex(/^\d{2}:\d{2}$/),
  status:     z.nativeEnum(DailyReportStatus),
  entries:    z.array(entrySchema).min(1),
});

// ─── Error helper ─────────────────────────────────────────────────────────────

function handleServiceError(
  err: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof LockedError) {
    res.status(423).json({ error: err.message });
    return;
  }
  if (err instanceof ConflictError) {
    res.status(409).json({ error: err.message });
    return;
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  next(err);
}

// ─── Routes — static paths first ─────────────────────────────────────────────

router.get(
  '/dropdown-data',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await getDropdownData(req.user!.userId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/monthly-summary',
  async (req: Request, res: Response, next: NextFunction) => {
    const result = monthQuerySchema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ error: result.error.format() });
      return;
    }

    try {
      const summary = await getMonthlySummary(
        req.user!.userId,
        result.data.year,
        result.data.month,
      );
      res.status(200).json(summary);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    const result = monthQuerySchema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ error: result.error.format() });
      return;
    }

    try {
      const days = await getMonthlyDays(
        req.user!.userId,
        result.data.year,
        result.data.month,
      );
      res.status(200).json({ days });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    const result = dayReportSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.format() });
      return;
    }

    try {
      const day = await upsertDayReport(req.user!.userId, result.data);
      res.status(201).json(day);
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

router.put(
  '/:reportDate',
  async (req: Request, res: Response, next: NextFunction) => {
    const paramResult = reportDateParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      res.status(400).json({ error: 'פורמט תאריך שגוי, נדרש yyyy-mm-dd' });
      return;
    }

    const bodyResult = dayReportSchema.safeParse({
      ...req.body,
      reportDate: paramResult.data.reportDate,
    });
    if (!bodyResult.success) {
      res.status(400).json({ error: bodyResult.error.format() });
      return;
    }

    try {
      const day = await upsertDayReport(req.user!.userId, bodyResult.data);
      res.status(200).json(day);
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

router.delete(
  '/:reportDate',
  async (req: Request, res: Response, next: NextFunction) => {
    const paramResult = reportDateParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      res.status(400).json({ error: 'פורמט תאריך שגוי, נדרש yyyy-mm-dd' });
      return;
    }

    try {
      await deleteDayReport(req.user!.userId, paramResult.data.reportDate);
      res.status(204).send();
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

export default router;
