import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { login, refreshTokens, logout, AuthError } from '../services/auth.service';

const router = Router();

const REFRESH_COOKIE = 'refreshToken';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: THIRTY_DAYS_MS,
};

const clearCookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
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
    const { accessToken, refreshToken, user } = await login(
      result.data.email,
      result.data.password,
      req.headers['user-agent'],
      req.ip,
    );
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.status(200).json({ accessToken, user });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      res.status(err.status).json({ error: err.message });
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
    const { accessToken, refreshToken, user } = await refreshTokens(token);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.status(200).json({ accessToken, user });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      res.clearCookie(REFRESH_COOKIE, clearCookieOptions);
      res.status(err.status).json({ error: err.message });
    } else {
      next(err);
    }
  }
});

router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  const token: string | undefined = req.cookies[REFRESH_COOKIE];
  if (token) {
    try {
      await logout(token);
    } catch (err) {
      next(err);
      return;
    }
  }
  res.clearCookie(REFRESH_COOKIE, clearCookieOptions);
  res.status(204).send();
});

export default router;
