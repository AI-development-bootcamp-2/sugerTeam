import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';

const router = Router();
const authService = new AuthService();

const REFRESH_COOKIE = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid request body' });
    return;
  }

  try {
    const result = await authService.login(
      parsed.data.email,
      parsed.data.password,
      req.headers['user-agent'],
      req.ip,
    );
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    res.status(200).json({ accessToken: result.accessToken, user: result.user });
  } catch (err: unknown) {
    const authErr = err as { code?: string; message?: string };
    if (authErr.code === 'PASSWORD_EXPIRED') {
      res.status(401).json({ code: 'PASSWORD_EXPIRED', message: authErr.message });
    } else if (
      authErr.code === 'INVALID_CREDENTIALS' ||
      authErr.code === 'INACTIVE_USER'
    ) {
      res.status(401).json({ message: 'Invalid credentials' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  const token: string | undefined = req.cookies[REFRESH_COOKIE];
  if (!token) {
    res.status(401).json({ message: 'Missing refresh token' });
    return;
  }

  try {
    const result = await authService.refreshTokens(token);
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    res.status(200).json({ accessToken: result.accessToken, user: result.user });
  } catch {
    res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'strict' });
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  const token: string | undefined = req.cookies[REFRESH_COOKIE];
  if (token) {
    await authService.logout(token).catch(() => {});
  }
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'strict' });
  res.status(204).send();
});

export default router;
