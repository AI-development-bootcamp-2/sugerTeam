import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { AbsenceType, UserRole } from '@prisma/client';
import { authenticateToken } from '@/middleware/auth';
import { checkMonthLock } from '@/middleware/monthLock';
import {
  uploadAbsenceDocument as uploadMiddleware,
  UnsupportedFileTypeError,
  verifyFileMagicBytes,
} from '@/middleware/upload';
import fs from 'fs/promises';
import {
  createAbsence,
  updateAbsence,
  deleteAbsence,
  listAbsences,
  uploadAbsenceDocument,
  deleteAbsenceDocument,
  ForbiddenError,
  MonthLockedError,
  NotFoundError,
  ValidationError,
} from '@/services/absence.service';

const router = Router();

router.use(authenticateToken);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ABSENCE_TYPES = ['VACATION', 'SICK_LEAVE', 'MILITARY_RESERVE', 'OTHER'] as const;

const createAbsenceSchema = z.object({
  absenceType: z.enum(ABSENCE_TYPES),
  startDate:   z.string().regex(ISO_DATE_RE, 'פורמט startDate שגוי, נדרש yyyy-mm-dd'),
  endDate:     z.string().regex(ISO_DATE_RE, 'פורמט endDate שגוי, נדרש yyyy-mm-dd'),
  isPartial:   z.boolean(),
  partialDurationHours: z.number().positive().max(24).optional(),
}).refine(
  (d) => d.startDate <= d.endDate,
  { path: ['endDate'], message: 'תאריך סיום חייב להיות אחרי תאריך ההתחלה' },
);

const updateAbsenceSchema = z.object({
  absenceType: z.enum(ABSENCE_TYPES).optional(),
  startDate:   z.string().regex(ISO_DATE_RE).optional(),
  endDate:     z.string().regex(ISO_DATE_RE).optional(),
  isPartial:   z.boolean().optional(),
  partialDurationHours: z.number().positive().max(24).nullable().optional(),
}).refine(
  (d) => Object.keys(d).length > 0,
  { message: 'At least one field must be provided' },
).refine(
  (d) => d.startDate === undefined || d.endDate === undefined || d.startDate <= d.endDate,
  { path: ['endDate'], message: 'תאריך סיום חייב להיות אחרי תאריך ההתחלה' },
);

const listQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  year:   z.coerce.number().int().min(2000).max(2100),
  month:  z.coerce.number().int().min(1).max(12),
});

function handleServiceError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof ValidationError)        { res.status(err.status).json({ error: err.message }); return; }
  if (err instanceof ForbiddenError)         { res.status(err.status).json({ error: err.message }); return; }
  if (err instanceof NotFoundError)          { res.status(err.status).json({ error: err.message }); return; }
  if (err instanceof MonthLockedError)       { res.status(err.status).json({ error: err.message }); return; }
  if (err instanceof UnsupportedFileTypeError) { res.status(err.status).json({ error: err.message }); return; }
  next(err);
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.format() });
    return;
  }

  const actor = req.user!;
  const targetUserId = parsed.data.userId ?? actor.userId;

  if (actor.role !== UserRole.ADMIN && targetUserId !== actor.userId) {
    res.status(403).json({ error: 'אין הרשאה לצפות בהיעדרויות של משתמש אחר' });
    return;
  }

  try {
    const records = await listAbsences(targetUserId, parsed.data.year, parsed.data.month);
    res.status(200).json(records);
  } catch (err) {
    next(err);
  }
});

router.post('/', checkMonthLock(), async (req: Request, res: Response, next: NextFunction) => {
  const parsed = createAbsenceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.format() });
    return;
  }

  const actor = req.user!;
  try {
    const record = await createAbsence(
      {
        userId: actor.userId,
        absenceType: parsed.data.absenceType as AbsenceType,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        isPartial: parsed.data.isPartial,
        partialDurationHours: parsed.data.partialDurationHours ?? null,
      },
      actor.role,
    );
    res.status(201).json(record);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

router.patch('/:id', checkMonthLock(), async (req: Request, res: Response, next: NextFunction) => {
  const parsed = updateAbsenceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.format() });
    return;
  }

  const actor = req.user!;
  try {
    const record = await updateAbsence(
      req.params.id,
      {
        absenceType: parsed.data.absenceType as AbsenceType | undefined,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        isPartial: parsed.data.isPartial,
        partialDurationHours: parsed.data.partialDurationHours,
      },
      actor.userId,
      actor.role,
    );
    res.status(200).json(record);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const actor = req.user!;
  try {
    await deleteAbsence(req.params.id, actor.userId, actor.role);
    res.status(204).send();
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

function runUpload(req: Request, res: Response, next: NextFunction): void {
  uploadMiddleware.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'הקובץ גדול מדי (מקסימום 10MB)' });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof UnsupportedFileTypeError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err) {
      next(err as Error);
      return;
    }
    next();
  });
}

router.post('/:id/document', runUpload, async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    res.status(400).json({ error: 'קובץ חסר' });
    return;
  }

  const actor = req.user!;
  try {
    const magicOk = await verifyFileMagicBytes(req.file.path, req.file.mimetype);
    if (!magicOk) {
      await fs.unlink(req.file.path).catch(() => undefined);
      throw new UnsupportedFileTypeError('תוכן הקובץ אינו תואם לסוג שהוצהר');
    }

    const document = await uploadAbsenceDocument(
      req.params.id,
      {
        path: req.file.path,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      },
      actor.userId,
      actor.role,
    );
    res.status(200).json({
      id: document.id,
      fileName: document.fileName,
      mimeType: document.mimeType,
      uploadedAt: document.uploadedAt,
    });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

router.delete('/:id/document', async (req: Request, res: Response, next: NextFunction) => {
  const actor = req.user!;
  try {
    await deleteAbsenceDocument(req.params.id, actor.userId, actor.role);
    res.status(204).send();
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

export default router;
