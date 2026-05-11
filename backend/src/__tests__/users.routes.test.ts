import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma/client';

const SUFFIX = Date.now();
const TEST_EMAIL = `jest-test-${SUFFIX}@example.com`;
const EMP_EMAIL = `jest-emp-${SUFFIX}@example.com`;

let adminToken: string;
let empToken: string;
let testUserId: string;

beforeAll(async () => {
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@company.com', password: 'Admin1234!' });
  adminToken = loginRes.body.accessToken;

  const empCreate = await request(app)
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ fullName: 'Jest Employee', email: EMP_EMAIL, password: 'Password1!', role: 'EMPLOYEE' });

  const empLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: EMP_EMAIL, password: 'Password1!' });
  empToken = empLogin.body.accessToken;

  void empCreate; // created; login token captured above
});

afterAll(async () => {
  const users = await prisma.user.findMany({
    where: { email: { in: [TEST_EMAIL, EMP_EMAIL] } },
  });
  for (const u of users) {
    await prisma.refreshToken.deleteMany({ where: { userId: u.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
  }
  await prisma.$disconnect();
});

describe('Authentication / authorisation', () => {
  it('GET /users without token returns 401', async () => {
    const r = await request(app).get('/api/v1/users');
    expect(r.status).toBe(401);
  });

  it('GET /users with EMPLOYEE token returns 403', async () => {
    const r = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${empToken}`);
    expect(r.status).toBe(403);
  });
});

describe('POST /users', () => {
  it('invalid body returns 400', async () => {
    const r = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: '', email: 'not-an-email', password: 'short', role: 'ALIEN' });
    expect(r.status).toBe(400);
  });

  it('valid body returns 201 without passwordHash', async () => {
    const r = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Jest Test', email: TEST_EMAIL, password: 'Password1!', role: 'EMPLOYEE' });
    expect(r.status).toBe(201);
    expect(r.body).not.toHaveProperty('passwordHash');
    expect(r.body.email).toBe(TEST_EMAIL);
    testUserId = r.body.id;
  });

  it('duplicate email returns 409', async () => {
    const r = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Jest Test 2', email: TEST_EMAIL, password: 'Password1!', role: 'EMPLOYEE' });
    expect(r.status).toBe(409);
  });
});

describe('GET /users', () => {
  it('returns 200 with an array', async () => {
    const r = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it('?isActive=true returns only ACTIVE users', async () => {
    const r = await request(app)
      .get('/api/v1/users?isActive=true')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(r.body.every((u: { status: string }) => u.status === 'ACTIVE')).toBe(true);
  });

  it('?role=ADMIN returns only ADMIN users', async () => {
    const r = await request(app)
      .get('/api/v1/users?role=ADMIN')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(r.body.every((u: { role: string }) => u.role === 'ADMIN')).toBe(true);
  });

  it('?search= returns matching users', async () => {
    const r = await request(app)
      .get(`/api/v1/users?search=jest-test-${SUFFIX}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(r.body.some((u: { email: string }) => u.email === TEST_EMAIL)).toBe(true);
  });
});

describe('PATCH /users/:id', () => {
  it('empty body returns 400', async () => {
    const r = await request(app)
      .patch(`/api/v1/users/${testUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(r.status).toBe(400);
  });

  it('partial update returns 200 with only the changed field updated', async () => {
    const r = await request(app)
      .patch(`/api/v1/users/${testUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Jest Updated' });
    expect(r.status).toBe(200);
    expect(r.body.fullName).toBe('Jest Updated');
    expect(r.body.email).toBe(TEST_EMAIL);
    expect(r.body).not.toHaveProperty('passwordHash');
  });
});

describe('PATCH /users/:id/deactivate + activate', () => {
  it('unknown id returns 404 with "User not found"', async () => {
    const r = await request(app)
      .patch('/api/v1/users/00000000-0000-0000-0000-000000000000/deactivate')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(404);
    expect(r.body.error).toBe('User not found');
  });

  it('deactivate returns 200 with status INACTIVE', async () => {
    const r = await request(app)
      .patch(`/api/v1/users/${testUserId}/deactivate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('INACTIVE');
  });

  it('login after deactivation returns 401', async () => {
    const r = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: 'Password1!' });
    expect(r.status).toBe(401);
  });

  it('activate returns 200 with status ACTIVE and deletedAt null', async () => {
    const r = await request(app)
      .patch(`/api/v1/users/${testUserId}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('ACTIVE');
    expect(r.body.deletedAt).toBeNull();
  });

  it('login after activation returns 200', async () => {
    const r = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: 'Password1!' });
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty('accessToken');
  });
});
