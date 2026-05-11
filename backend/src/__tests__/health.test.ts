import request from 'supertest';
import app from '../app';

// auth.service imports @prisma/client types that require `prisma generate`.
// Mock it here so the health test compiles independently of DB setup.
jest.mock('../services/auth.service', () => ({
  login: jest.fn(),
  refreshTokens: jest.fn(),
  logout: jest.fn(),
  AuthError: class AuthError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

describe('GET /api/v1/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
