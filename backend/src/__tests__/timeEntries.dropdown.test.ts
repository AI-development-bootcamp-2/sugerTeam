import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma/client';
import { EntityStatus, TaskStatus } from '@prisma/client';

const SUFFIX = Date.now();
const EMP_EMAIL = `jest-dropdown-emp-${SUFFIX}@example.com`;

const ASSIGNED_CLIENT_ID    = 'd1000001-0000-4000-8000-000000000001';
const ASSIGNED_PROJECT_ID   = 'd1000002-0000-4000-8000-000000000001';
const ASSIGNED_TASK_ID      = 'd1000003-0000-4000-8000-000000000001';

const UNASSIGNED_CLIENT_ID  = 'd2000001-0000-4000-8000-000000000001';
const UNASSIGNED_PROJECT_ID = 'd2000002-0000-4000-8000-000000000001';
const UNASSIGNED_TASK_ID    = 'd2000003-0000-4000-8000-000000000001';

let adminToken: string;
let adminUserId: string;
let empToken: string;
let empUserId: string;
let assignmentId: string;

beforeAll(async () => {
  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@company.com', password: 'Admin1234!' });
  adminToken  = adminLogin.body.accessToken;
  adminUserId = adminLogin.body.user.id;

  const empCreate = await request(app)
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ fullName: 'Dropdown Emp', email: EMP_EMAIL, password: 'Password1!', role: 'EMPLOYEE' });
  empUserId = empCreate.body.id;

  const empLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: EMP_EMAIL, password: 'Password1!' });
  empToken = empLogin.body.accessToken;

  await prisma.client.upsert({
    where:  { id: ASSIGNED_CLIENT_ID },
    create: { id: ASSIGNED_CLIENT_ID, name: 'Dropdown Assigned Client', status: EntityStatus.ACTIVE },
    update: {},
  });
  await prisma.project.upsert({
    where:  { id: ASSIGNED_PROJECT_ID },
    create: { id: ASSIGNED_PROJECT_ID, clientId: ASSIGNED_CLIENT_ID, name: 'Dropdown Assigned Project', status: EntityStatus.ACTIVE },
    update: {},
  });
  await prisma.task.upsert({
    where:  { id: ASSIGNED_TASK_ID },
    create: { id: ASSIGNED_TASK_ID, projectId: ASSIGNED_PROJECT_ID, name: 'Dropdown Assigned Task', status: TaskStatus.OPEN },
    update: {},
  });

  await prisma.client.upsert({
    where:  { id: UNASSIGNED_CLIENT_ID },
    create: { id: UNASSIGNED_CLIENT_ID, name: 'Dropdown Unassigned Client', status: EntityStatus.ACTIVE },
    update: {},
  });
  await prisma.project.upsert({
    where:  { id: UNASSIGNED_PROJECT_ID },
    create: { id: UNASSIGNED_PROJECT_ID, clientId: UNASSIGNED_CLIENT_ID, name: 'Dropdown Unassigned Project', status: EntityStatus.ACTIVE },
    update: {},
  });
  await prisma.task.upsert({
    where:  { id: UNASSIGNED_TASK_ID },
    create: { id: UNASSIGNED_TASK_ID, projectId: UNASSIGNED_PROJECT_ID, name: 'Dropdown Unassigned Task', status: TaskStatus.OPEN },
    update: {},
  });

  const assignment = await prisma.taskAssignment.upsert({
    where:  { taskId_userId: { taskId: ASSIGNED_TASK_ID, userId: empUserId } },
    create: { taskId: ASSIGNED_TASK_ID, userId: empUserId, assignedBy: adminUserId },
    update: {},
  });
  assignmentId = assignment.id;
});

afterAll(async () => {
  await prisma.taskAssignment.deleteMany({ where: { id: assignmentId } }).catch(() => {});
  await prisma.task.deleteMany({
    where: { id: { in: [ASSIGNED_TASK_ID, UNASSIGNED_TASK_ID] } },
  }).catch(() => {});
  await prisma.project.deleteMany({
    where: { id: { in: [ASSIGNED_PROJECT_ID, UNASSIGNED_PROJECT_ID] } },
  }).catch(() => {});
  await prisma.client.deleteMany({
    where: { id: { in: [ASSIGNED_CLIENT_ID, UNASSIGNED_CLIENT_ID] } },
  }).catch(() => {});

  if (empUserId) {
    await prisma.refreshToken.deleteMany({ where: { userId: empUserId } }).catch(() => {});
    await prisma.user.delete({ where: { id: empUserId } }).catch(() => {});
  }

  await prisma.$disconnect();
});

describe('GET /api/v1/time-entries/dropdown-data — role-based filtering', () => {
  it('EMPLOYEE sees only clients with tasks assigned to them', async () => {
    const res = await request(app)
      .get('/api/v1/time-entries/dropdown-data')
      .set('Authorization', `Bearer ${empToken}`);

    expect(res.status).toBe(200);

    const ids = res.body.clients.map((c: { id: string }) => c.id);
    expect(ids).toContain(ASSIGNED_CLIENT_ID);
    expect(ids).not.toContain(UNASSIGNED_CLIENT_ID);

    const assignedClient = res.body.clients.find(
      (c: { id: string }) => c.id === ASSIGNED_CLIENT_ID,
    );
    expect(assignedClient.projects).toHaveLength(1);
    expect(assignedClient.projects[0].tasks.map((t: { id: string }) => t.id))
      .toEqual([ASSIGNED_TASK_ID]);
  });

  it('ADMIN still sees both assigned and unassigned clients', async () => {
    const res = await request(app)
      .get('/api/v1/time-entries/dropdown-data')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    const ids = res.body.clients.map((c: { id: string }) => c.id);
    expect(ids).toContain(ASSIGNED_CLIENT_ID);
    expect(ids).toContain(UNASSIGNED_CLIENT_ID);
  });
});
