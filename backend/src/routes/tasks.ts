import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { authenticateToken } from '@/middleware/auth';
import { requireRole } from '@/middleware/roleGuard';
import {
  createTask,
  listActiveTasks,
  updateTask,
  NotFoundError,
} from '@/services/task.service';

const router = Router();

router.use(authenticateToken);

const activeQuerySchema = z.object({
  projectId: z.string().uuid(),
});

const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  name:      z.string().min(1),
});

const updateTaskSchema = z.object({
  name:     z.string().min(1).optional(),
  isActive: z.boolean().optional(),
}).refine(
  (d) => Object.keys(d).length > 0,
  { message: 'At least one field must be provided' },
);

router.get('/active', requireRole(UserRole.ADMIN, UserRole.TEAM_LEAD), async (req: Request, res: Response, next: NextFunction) => {
  const result = activeQuerySchema.safeParse(req.query);
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
});

router.post('/', requireRole(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
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
      res.status(404).json({ error: (err as NotFoundError).message });
      return;
    }
    next(err);
  }
});

router.patch('/:id', requireRole(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
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
});

export default router;
