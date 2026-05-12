import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { authenticateToken } from '@/middleware/auth';
import { requireRole } from '@/middleware/roleGuard';
import {
  createTask,
  listActiveTasks,
  listTasksByProject,
  updateTask,
  NotFoundError,
  type TaskWithProject,
} from '@/services/task.service';

const router = Router();

router.use(authenticateToken);

const projectIdQuerySchema = z.object({
  projectId: z.string().uuid(),
});

const optionalProjectIdSchema = z.object({
  projectId: z.string().uuid().optional(),
});

const createTaskSchema = z.object({
  projectId:   z.string().uuid(),
  name:        z.string().min(1),
  description: z.string().optional(),
  startDate:   z.string().optional(),
  endDate:     z.string().optional(),
});

const updateTaskSchema = z
  .object({
    name:        z.string().min(1).optional(),
    description: z.string().optional(),
    isActive:    z.boolean().optional(),
    startDate:   z.string().nullable().optional(),
    endDate:     z.string().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field must be provided',
  });

router.get(
  '/active',
  async (req: Request, res: Response, next: NextFunction) => {
    const result = projectIdQuerySchema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ error: result.error.format() });
      return;
    }
    try {
      const tasks = await listActiveTasks(result.data.projectId);
      res.status(200).json(tasks.map((t) => ({ id: t.id, name: t.name, projectId: t.projectId })));
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
      const tasks: TaskWithProject[] = await listTasksByProject(result.data.projectId);
      res.status(200).json(tasks);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/',
  requireRole(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    const result = createTaskSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.format() });
      return;
    }
    try {
      const task = await createTask(result.data);
      res.status(201).json(task);
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      next(err);
    }
  },
);

router.patch(
  '/:id',
  requireRole(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const result = updateTaskSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.format() });
      return;
    }
    try {
      const task = await updateTask(id, result.data);
      res.status(200).json(task);
    } catch (err) {
      if ((err as { code?: string }).code === 'P2025') {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      next(err);
    }
  },
);

export default router;
