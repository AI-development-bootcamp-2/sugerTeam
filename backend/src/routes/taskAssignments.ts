import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { authenticateToken } from '@/middleware/auth';
import { requireRole } from '@/middleware/roleGuard';
import {
  listTasksWithAssignments,
  syncTaskAssignments,
  removeAllTaskAssignments,
  listActiveUsers,
} from '@/services/taskAssignment.service';

const router = Router();

router.use(authenticateToken);

const optionalProjectIdSchema = z.object({
  projectId: z.string().uuid().optional(),
});

const syncSchema = z.object({
  userIds: z.array(z.string().uuid()),
});

router.get(
  '/employees',
  requireRole(UserRole.ADMIN, UserRole.TEAM_LEAD),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await listActiveUsers();
      res.status(200).json(users);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/',
  requireRole(UserRole.ADMIN, UserRole.TEAM_LEAD),
  async (req: Request, res: Response, next: NextFunction) => {
    const result = optionalProjectIdSchema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ error: result.error.format() });
      return;
    }
    try {
      const tasks = await listTasksWithAssignments(result.data.projectId);
      res.status(200).json(tasks);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/tasks/:taskId',
  requireRole(UserRole.ADMIN, UserRole.TEAM_LEAD),
  async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const result = syncSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.format() });
      return;
    }
    try {
      await syncTaskAssignments(taskId, result.data.userIds, req.user!.userId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/tasks/:taskId',
  requireRole(UserRole.ADMIN, UserRole.TEAM_LEAD),
  async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    try {
      await removeAllTaskAssignments(taskId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);

export default router;
