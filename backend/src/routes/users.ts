import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
//import type { UserRole } from '@prisma/client';
import { authenticateToken } from '@/middleware/auth';
import { requireRole } from '@/middleware/roleGuard';
import {
  createUser,
  listUsers,
  updateUser,
  deactivateUser,
  activateUser,
  ConflictError,
} from '@/services/user.service';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('ADMIN'));

const USER_ROLES = ['EMPLOYEE', 'TEAM_LEAD', 'ADMIN'] as const;

const createUserSchema = z.object({
  fullName: z.string().min(1),
  email:    z.string().email(),
  password: z.string().min(8),
  role:     z.enum(USER_ROLES),
});

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  email:    z.string().email().optional(),
  role:     z.enum(USER_ROLES).optional(),
}).refine(
  (d) => Object.keys(d).length > 0,
  { message: 'At least one field must be provided' },
);

const listQuerySchema = z.object({
  role:     z.enum(USER_ROLES).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  search:   z.string().optional(),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const result = listQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.format() });
    return;
  }

  const { role, isActive, search } = result.data;
  const isActiveBool =
    isActive === 'true' ? true : isActive === 'false' ? false : undefined;

  try {
    const users = await listUsers({ role, isActive: isActiveBool, search });
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.format() });
    return;
  }

  try {
    const user = await createUser(result.data);
    res.status(201).json(user);
  } catch (err) {
    if (err instanceof ConflictError) {
      res.status(409).json({ error: err.message });
      return;
    }
    next(err);
  }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const result = updateUserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.format() });
    return;
  }

  try {
    const user = await updateUser(id, result.data);
    res.status(200).json(user);
  } catch (err) {
    if (err instanceof ConflictError) {
      res.status(409).json({ error: err.message });
      return;
    }
    if ((err as { code?: string }).code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    next(err);
  }
});

router.patch('/:id/deactivate', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const user = await deactivateUser(id);
    res.status(200).json(user);
  } catch (err) {
    if ((err as { code?: string }).code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    next(err);
  }
});

router.patch('/:id/activate', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const user = await activateUser(id);
    res.status(200).json(user);
  } catch (err) {
    if ((err as { code?: string }).code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    next(err);
  }
});

export default router;
