import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { authenticateToken } from '@/middleware/auth';
import { requireRole } from '@/middleware/roleGuard';
import {
  createClient,
  listActiveClients,
  listAllClients,
  updateClient,
} from '@/services/client.service';

const router = Router();

router.use(authenticateToken);

const createClientSchema = z.object({
  name:        z.string().min(1),
  description: z.string().optional(),
});

const updateClientSchema = z.object({
  name:        z.string().min(1).optional(),
  description: z.string().optional(),
  isActive:    z.boolean().optional(),
}).refine(
  (d) => Object.keys(d).length > 0,
  { message: 'At least one field must be provided' },
);

router.get('/active', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const clients = await listActiveClients();
    res.status(200).json(clients.map((c) => ({ id: c.id, name: c.name })));
  } catch (err) {
    next(err);
  }
});

router.get('/', requireRole(UserRole.ADMIN, UserRole.TEAM_LEAD), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const clients = await listAllClients();
    res.status(200).json(clients);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  const result = createClientSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.format() });
    return;
  }

  try {
    const client = await createClient(result.data);
    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireRole(UserRole.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const result = updateClientSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.format() });
    return;
  }

  try {
    const client = await updateClient(id, result.data);
    res.status(200).json(client);
  } catch (err) {
    if ((err as { code?: string }).code === 'P2025') {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    next(err);
  }
});

export default router;
