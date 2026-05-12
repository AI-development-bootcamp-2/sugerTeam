import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { authenticateToken } from '@/middleware/auth';
import { requireRole } from '@/middleware/roleGuard';
import {
  createProject,
  listActiveProjects,
  listProjectsByClient,
  updateProject,
  NotFoundError,
} from '@/services/project.service';

const router = Router();

router.use(authenticateToken);

const activeQuerySchema = z.object({
  clientId: z.string().uuid(),
});

const listQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
});

const createProjectSchema = z.object({
  clientId:    z.string().uuid(),
  name:        z.string().min(1),
  description: z.string().optional(),
  startDate:   z.string().optional(),
  endDate:     z.string().optional(),
});

const updateProjectSchema = z.object({
  name:        z.string().min(1).optional(),
  description: z.string().optional(),
  isActive:    z.boolean().optional(),
  startDate:   z.string().nullable().optional(),
  endDate:     z.string().nullable().optional(),
}).refine(
  (d) => Object.keys(d).length > 0,
  { message: 'At least one field must be provided' },
);

router.get('/active', async (req: Request, res: Response, next: NextFunction) => {
  const result = activeQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.format() });
    return;
  }

  try {
    const projects = await listActiveProjects(result.data.clientId);
    res.status(200).json(projects.map((p) => ({ id: p.id, name: p.name, clientId: p.clientId })));
  } catch (err) {
    next(err);
  }
});

router.get('/', requireRole(UserRole.ADMIN, UserRole.TEAM_LEAD), async (req: Request, res: Response, next: NextFunction) => {
  const result = listQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.format() });
    return;
  }
  try {
    const projects = await listProjectsByClient(result.data.clientId);
    res.status(200).json(projects);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  const result = createProjectSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.format() });
    return;
  }

  try {
    const project = await createProject(result.data);
    res.status(201).json(project);
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

router.patch('/:id', requireRole(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const result = updateProjectSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.format() });
    return;
  }

  try {
    const project = await updateProject(id, result.data);
    res.status(200).json(project);
  } catch (err) {
    if ((err as { code?: string }).code === 'P2025') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    next(err);
  }
});

export default router;
