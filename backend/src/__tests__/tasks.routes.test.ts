import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma/client';

const SUFFIX = Date.now();

let adminToken: string;
let testClientId: string;
let testProjectId: string;
let testTaskId: string;

beforeAll(async () => {
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@company.com', password: 'Admin1234!' });
  adminToken = loginRes.body.accessToken;

  const client = await prisma.client.create({
    data: { name: `Jest Tasks Client ${SUFFIX}` },
  });
  testClientId = client.id;

  const project = await prisma.project.create({
    data: { clientId: testClientId, name: `Jest Tasks Project ${SUFFIX}` },
  });
  testProjectId = project.id;
});

afterAll(async () => {
  await prisma.task.deleteMany({ where: { projectId: testProjectId } }).catch(() => {});
  await prisma.project.delete({ where: { id: testProjectId } }).catch(() => {});
  await prisma.client.delete({ where: { id: testClientId } }).catch(() => {});
  await prisma.$disconnect();
});

describe('Authentication / authorisation', () => {
  it('GET /tasks/active without token returns 401', async () => {
    const r = await request(app).get('/api/v1/tasks/active').query({ projectId: testProjectId });
    expect(r.status).toBe(401);
  });

  it('GET /tasks without projectId returns 400', async () => {
    const r = await request(app)
      .get('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(400);
  });
});

describe('POST /tasks', () => {
  it('invalid body returns 400', async () => {
    const r = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ projectId: 'not-a-uuid', name: '' });
    expect(r.status).toBe(400);
  });

  it('nonexistent projectId returns 404', async () => {
    const r = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ projectId: '00000000-0000-0000-0000-000000000000', name: 'Test Task' });
    expect(r.status).toBe(404);
  });

  it('valid body returns 201 with OPEN task', async () => {
    const r = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ projectId: testProjectId, name: `Jest Task ${SUFFIX}` });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('OPEN');
    expect(r.body.projectId).toBe(testProjectId);
    testTaskId = r.body.id;
  });
});

describe('GET /tasks/active', () => {
  it('returns 200 with active tasks for project', async () => {
    const r = await request(app)
      .get('/api/v1/tasks/active')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ projectId: testProjectId });
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body.some((t: { id: string }) => t.id === testTaskId)).toBe(true);
  });

  it('missing projectId returns 400', async () => {
    const r = await request(app)
      .get('/api/v1/tasks/active')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(400);
  });
});

describe('GET /tasks', () => {
  it('returns 200 with all tasks for project including closed', async () => {
    const r = await request(app)
      .get('/api/v1/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ projectId: testProjectId });
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body.some((t: { id: string }) => t.id === testTaskId)).toBe(true);
  });
});

describe('PATCH /tasks/:id', () => {
  it('empty body returns 400', async () => {
    const r = await request(app)
      .patch(`/api/v1/tasks/${testTaskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(r.status).toBe(400);
  });

  it('closing task returns 200 with CLOSED status', async () => {
    const r = await request(app)
      .patch(`/api/v1/tasks/${testTaskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('CLOSED');
    expect(r.body.closedAt).not.toBeNull();
  });

  it('reopening task returns 200 with OPEN status', async () => {
    const r = await request(app)
      .patch(`/api/v1/tasks/${testTaskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: true });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('OPEN');
    expect(r.body.closedAt).toBeNull();
  });

  it('unknown id returns 404', async () => {
    const r = await request(app)
      .patch('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X' });
    expect(r.status).toBe(404);
  });
});
