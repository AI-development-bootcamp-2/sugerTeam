import { Router } from 'express';
import { z } from 'zod';
import * as AuthService from '../services/auth.service';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const REFRESH_COOKIE = 'refreshToken';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: THIRTY_DAYS_MS,
};

router.post('/login', async (req, res, next) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.format() });
  }

  try {
    const { accessToken, refreshToken, user } = await AuthService.login(
      result.data.email,
      result.data.password
    );
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    return res.status(200).json({ accessToken, user });
  } catch (err) {
    if (err instanceof AuthService.AuthError && err.status === 401) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    return next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  const token = req.cookies[REFRESH_COOKIE] as string | undefined;
  if (!token) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    const { accessToken, refreshToken, user } = await AuthService.refreshTokens(token);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    return res.status(200).json({ accessToken, user });
  } catch (err) {
    if (err instanceof AuthService.AuthError) {
      return res.status(err.status).json({ error: 'Invalid refresh token' });
    }
    return next(err);
  }
});

router.post('/logout', (_req, res) => {
  AuthService.logout();
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  return res.status(204).send();
});

export default router;
