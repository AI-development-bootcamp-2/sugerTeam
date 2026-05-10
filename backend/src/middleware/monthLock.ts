import { Request, Response, NextFunction, RequestHandler } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '@/prisma/client';

const YEAR_MONTH_RE = /^\d{4}-\d{2}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export function checkMonthLock(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let year: number;
    let month: number;

    const yearMonthParam = req.params.yearMonth;
    if (yearMonthParam) {
      if (!YEAR_MONTH_RE.test(yearMonthParam)) {
        res.status(400).json({ error: 'פורמט חודש שגוי, נדרש yyyy-mm' });
        return;
      }
      const parts = yearMonthParam.split('-').map(Number);
      year = parts[0];
      month = parts[1];
    } else if (req.body?.date) {
      if (typeof req.body.date !== 'string') {
        res.status(400).json({ error: 'שדה date חייב להיות מחרוזת' });
        return;
      }
      if (!ISO_DATE_RE.test(req.body.date)) {
        res.status(400).json({ error: 'פורמט תאריך שגוי, נדרש yyyy-mm-dd' });
        return;
      }
      const parts = req.body.date.split('-').map(Number);
      year = parts[0];
      month = parts[1];
    } else {
      next();
      return;
    }

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      year < MIN_YEAR ||
      year > MAX_YEAR
    ) {
      res.status(400).json({ error: 'ערכי שנה/חודש לא תקינים' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'טוקן חסר או לא תקין' });
      return;
    }

    try {
      const lock = await prisma.monthLock.findUnique({
        where: { year_month: { year, month } },
      });

      if (lock?.isLocked && req.user.role !== UserRole.ADMIN) {
        res.status(423).json({ error: 'החודש נעול, לא ניתן לבצע שינויים' });
        return;
      }
    } catch {
      res.status(500).json({ error: 'שגיאת שרת פנימית' });
      return;
    }

    next();
  };
}
