import request from 'supertest';
import app from '../app';
import * as AuthService from '../services/auth.service';

// Mock the entire auth service so tests have no DB or JWT dependency.
// AuthError is re-declared inside the factory so that instanceof checks in the
// route (which also imports from this mock) resolve against the same class.
jest.mock('../services/auth.service', () => {
  class AuthError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = 'AuthError';
      this.status = status;
    }
  }
  return {
    login: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    AuthError,
  };
});

const mockLogin = AuthService.login as jest.MockedFunction<typeof AuthService.login>;
const mockRefreshTokens = AuthService.refreshTokens as jest.MockedFunction<typeof AuthService.refreshTokens>;
const mockLogout = AuthService.logout as jest.MockedFunction<typeof AuthService.logout>;

const fakeUser = { id: 'uuid-1', fullName: 'מנהל מערכת', role: 'ADMIN' as const };

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// POST /api/v1/auth/login
// ---------------------------------------------------------------------------

describe('POST /api/v1/auth/login', () => {
  it('200 + accessToken + httpOnly cookie on valid credentials', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockLogin.mockResolvedValue({ accessToken: 'acc', refreshToken: 'ref', user: fakeUser } as any);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@company.com', password: 'Admin1234!' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ accessToken: 'acc', user: { role: 'ADMIN' } });
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('401 on wrong password', async () => {
    mockLogin.mockRejectedValue(new AuthService.AuthError(401, 'Invalid credentials'));

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@company.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('401 on inactive user', async () => {
    mockLogin.mockRejectedValue(new AuthService.AuthError(401, 'Inactive'));

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'inactive@company.com', password: 'Admin1234!' });

    expect(res.status).toBe(401);
  });

  it('400 on invalid body (missing password)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@company.com' });

    expect(res.status).toBe(400);
  });

  it('400 on invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'Admin1234!' });

    expect(res.status).toBe(400);
  });

  it('500 on unexpected service error', async () => {
    mockLogin.mockRejectedValue(new Error('Database connection failed'));

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@company.com', password: 'Admin1234!' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/refresh
// ---------------------------------------------------------------------------

describe('POST /api/v1/auth/refresh', () => {
  it('200 + new tokens + new cookie when valid refresh cookie present', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockRefreshTokens.mockResolvedValue({ accessToken: 'new-acc', refreshToken: 'new-ref', user: fakeUser } as any);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refreshToken=valid-token');

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe('new-acc');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('401 when no refresh cookie', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
    expect(mockRefreshTokens).not.toHaveBeenCalled();
  });

  it('401 on expired or invalid refresh token', async () => {
    mockRefreshTokens.mockRejectedValue(new AuthService.AuthError(401, 'Expired'));

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refreshToken=expired-token');

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/logout
// ---------------------------------------------------------------------------

describe('POST /api/v1/auth/logout', () => {
  it('204 and clears the refresh token cookie', async () => {
    mockLogout.mockReturnValue(undefined);

    const res = await request(app).post('/api/v1/auth/logout');

    expect(res.status).toBe(204);
    const cookies = (res.headers['set-cookie'] as unknown) as string[] | undefined;
    expect(cookies?.some((c: string) => c.startsWith('refreshToken=;'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------

describe('404 handler', () => {
  it('returns 404 JSON for an unknown route', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('returns 404 JSON for an unknown POST route', async () => {
    const res = await request(app).post('/api/v1/does-not-exist').send({});
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });
});
