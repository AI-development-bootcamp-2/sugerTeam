import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';

const router = Router();
const authService = new AuthService();

const REFRESH_COOKIE = 'refreshToken';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: THIRTY_DAYS_MS,
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.format() });
    return;
  }

  try {
    const { accessToken, refreshToken, user } = await authService.login(
      result.data.email,
      result.data.password,
      req.headers['user-agent'],
      req.ip,
    );
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.status(200).json({ accessToken, user });
  } catch (err: unknown) {
    const authErr = err as { code?: string; message?: string };
    if (authErr.code === 'PASSWORD_EXPIRED') {
      res.status(401).json({ code: 'PASSWORD_EXPIRED', message: authErr.message });
    } else if (authErr.code === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: 'Invalid credentials' });
    } else {
      next(err);
    }
  }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  const token: string | undefined = req.cookies[REFRESH_COOKIE];
  if (!token) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  try {
    const { accessToken, refreshToken, user } = await authService.refreshTokens(token);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.status(200).json({ accessToken, user });
  } catch (err: unknown) {
    const authErr = err as { code?: string };
    if (authErr.code === 'INVALID_TOKEN') {
      res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'strict' });
      res.status(401).json({ error: 'Invalid or expired refresh token' });
    } else {
      next(err);
    }
  }
});

router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  const token: string | undefined = req.cookies[REFRESH_COOKIE];
  if (token) {
    await authService.logout(token).catch(next);
  }
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: 'strict' });
  res.status(204).send();
});

export default router;
