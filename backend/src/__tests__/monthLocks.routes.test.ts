import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma/client';
import { EntityStatus, TaskStatus } from '@prisma/client';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SUFFIX = Date.now();
const EMP_EMAIL = `jest-monthlock-emp-${SUFFIX}@example.com`;
const EMP_PASSWORD = 'Password1!';

const LOCK_CLIENT_ID  = 'f0000001-0000-4000-8000-000000000011';
const LOCK_PROJECT_ID = 'f0000002-0000-4000-8000-000000000011';
const LOCK_TASK_ID    = 'f0000003-0000-4000-8000-000000000011';

const TEST_YEAR  = 2099;
const TEST_MONTH = 11;
const TEST_DATE  = `${TEST_YEAR}-${String(TEST_MONTH).padStart(2, '0')}-15`;

let adminToken: string;
let adminUserId: string;
let empToken: string;
let empUserId: string;

const adminAuth = () => ({ Authorization: `Bearer ${adminToken}` });
const empAuth   = () => ({ Authorization: `Bearer ${empToken}` });

function entryPayload() {
  return {
    workLocation: 'OFFICE',
    clientId:     LOCK_CLIENT_ID,
    projectId:    LOCK_PROJECT_ID,
    taskId:       LOCK_TASK_ID,
    startTime:    '08:00',
    endTime:      '12:00',
  };
}

function dayPayload(date: string) {
  return {
    reportDate: date,
    startTime:  '08:00',
    endTime:    '17:00',
    status:     'DRAFT',
    entries:    [entryPayload()],
  };
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeAll(async () => {
  // Admin login
  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@company.com', password: 'Admin1234!' });
  adminToken  = adminLogin.body.accessToken as string;
  adminUserId = adminLogin.body.user.id as string;

  // Create + login an employee
  const empCreate = await request(app)
    .post('/api/v1/users')
    .set(adminAuth())
    .send({
      fullName: 'MonthLock Test Employee',
      email:    EMP_EMAIL,
      password: EMP_PASSWORD,
      role:     'EMPLOYEE',
    });
  empUserId = empCreate.body.id as string;

  const empLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: EMP_EMAIL, password: EMP_PASSWORD });
  empToken = empLogin.body.accessToken as string;

  // Catalogue rows needed for the 423-middleware test
  await prisma.client.upsert({
    where:  { id: LOCK_CLIENT_ID },
    create: { id: LOCK_CLIENT_ID, name: 'MonthLock Client', status: EntityStatus.ACTIVE },
    update: {},
  });
  await prisma.project.upsert({
    where:  { id: LOCK_PROJECT_ID },
    create: { id: LOCK_PROJECT_ID, clientId: LOCK_CLIENT_ID, name: 'MonthLock Project', status: EntityStatus.ACTIVE },
    update: {},
  });
  await prisma.task.upsert({
    where:  { id: LOCK_TASK_ID },
    create: { id: LOCK_TASK_ID, projectId: LOCK_PROJECT_ID, name: 'MonthLock Task', status: TaskStatus.OPEN },
    update: {},
  });

  // Make sure we start from a clean slate
  await prisma.monthLock.deleteMany({
    where: { year: TEST_YEAR, month: TEST_MONTH },
  }).catch(() => {});
});

afterAll(async () => {
  // Clean up any reports the employee/admin made during the 423 test
  const userIds = [adminUserId, empUserId].filter(Boolean);
  if (userIds.length > 0) {
    const reports = await prisma.dailyReport.findMany({
      where:  { userId: { in: userIds }, reportDate: new Date(`${TEST_DATE}T00:00:00Z`) },
      select: { id: true },
    });
    const ids = reports.map((r) => r.id);
    if (ids.length > 0) {
      await prisma.timeReportEntry.deleteMany({ where: { dailyReportId: { in: ids } } });
      await prisma.dailyReport.deleteMany({ where: { id: { in: ids } } });
    }
  }

  await prisma.monthLock.deleteMany({
    where: { year: TEST_YEAR, month: TEST_MONTH },
  }).catch(() => {});

  await prisma.task.deleteMany({ where: { id: LOCK_TASK_ID } }).catch(() => {});
  await prisma.project.deleteMany({ where: { id: LOCK_PROJECT_ID } }).catch(() => {});
  await prisma.client.deleteMany({ where: { id: LOCK_CLIENT_ID } }).catch(() => {});

  if (empUserId) {
    await prisma.refreshToken.deleteMany({ where: { userId: empUserId } }).catch(() => {});
    await prisma.user.delete({ where: { id: empUserId } }).catch(() => {});
  }

  await prisma.$disconnect();
});

// ─── Auth / role gates ────────────────────────────────────────────────────────

describe('Auth + role gates', () => {
  it('401 without token on POST /lock', async () => {
    const r = await request(app)
      .post(`/api/v1/month-locks/${TEST_YEAR}/${TEST_MONTH}/lock`);
    expect(r.status).toBe(401);
  });

  it('401 without token on POST /unlock', async () => {
    const r = await request(app)
      .post(`/api/v1/month-locks/${TEST_YEAR}/${TEST_MONTH}/unlock`);
    expect(r.status).toBe(401);
  });

  it('401 without token on GET /', async () => {
    const r = await request(app).get('/api/v1/month-locks');
    expect(r.status).toBe(401);
  });

  it('403 with EMPLOYEE token on POST /lock', async () => {
    const r = await request(app)
      .post(`/api/v1/month-locks/${TEST_YEAR}/${TEST_MONTH}/lock`)
      .set(empAuth());
    expect(r.status).toBe(403);
  });

  it('403 with EMPLOYEE token on POST /unlock', async () => {
    const r = await request(app)
      .post(`/api/v1/month-locks/${TEST_YEAR}/${TEST_MONTH}/unlock`)
      .set(empAuth());
    expect(r.status).toBe(403);
  });

  it('403 with EMPLOYEE token on GET / (no query — list mode)', async () => {
    const r = await request(app).get('/api/v1/month-locks').set(empAuth());
    expect(r.status).toBe(403);
  });
});

// ─── GET single-status (legacy, with year+month query) ────────────────────────

describe('GET /api/v1/month-locks?year=&month= (single status)', () => {
  it('200 returns { isLocked: false } when no row exists', async () => {
    await prisma.monthLock.deleteMany({
      where: { year: TEST_YEAR, month: TEST_MONTH },
    });

    const r = await request(app)
      .get('/api/v1/month-locks')
      .query({ year: TEST_YEAR, month: TEST_MONTH })
      .set(empAuth());

    expect(r.status).toBe(200);
    expect(r.body).toEqual({ year: TEST_YEAR, month: TEST_MONTH, isLocked: false });
  });

  it('400 on out-of-range month', async () => {
    const r = await request(app)
      .get('/api/v1/month-locks')
      .query({ year: TEST_YEAR, month: 13 })
      .set(adminAuth());
    expect(r.status).toBe(400);
  });
});

// ─── POST /:year/:month/lock + /unlock (admin happy path) ─────────────────────

describe('POST /:year/:month/lock + /unlock (admin)', () => {
  beforeEach(async () => {
    await prisma.monthLock.deleteMany({
      where: { year: TEST_YEAR, month: TEST_MONTH },
    });
  });

  it('400 on invalid month param', async () => {
    const r = await request(app)
      .post(`/api/v1/month-locks/${TEST_YEAR}/13/lock`)
      .set(adminAuth());
    expect(r.status).toBe(400);
  });

  it('200 locks an un-recorded month and persists lockedBy + lockedAt', async () => {
    const r = await request(app)
      .post(`/api/v1/month-locks/${TEST_YEAR}/${TEST_MONTH}/lock`)
      .set(adminAuth());

    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      year:     TEST_YEAR,
      month:    TEST_MONTH,
      isLocked: true,
      lockedBy: { id: adminUserId },
    });
    expect(r.body.lockedAt).toBeTruthy();

    const row = await prisma.monthLock.findUnique({
      where: { year_month: { year: TEST_YEAR, month: TEST_MONTH } },
    });
    expect(row?.isLocked).toBe(true);
    expect(row?.lockedBy).toBe(adminUserId);
  });

  it('200 unlocks a locked month and clears reopenedBy/reopenedAt', async () => {
    // First lock it
    await request(app)
      .post(`/api/v1/month-locks/${TEST_YEAR}/${TEST_MONTH}/lock`)
      .set(adminAuth());

    const r = await request(app)
      .post(`/api/v1/month-locks/${TEST_YEAR}/${TEST_MONTH}/unlock`)
      .set(adminAuth());

    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      year:       TEST_YEAR,
      month:      TEST_MONTH,
      isLocked:   false,
      reopenedBy: { id: adminUserId },
    });
    expect(r.body.reopenedAt).toBeTruthy();

    const row = await prisma.monthLock.findUnique({
      where: { year_month: { year: TEST_YEAR, month: TEST_MONTH } },
    });
    expect(row?.isLocked).toBe(false);
    expect(row?.reopenedBy).toBe(adminUserId);
  });

  it('re-locking an already-locked month overwrites lockedAt + clears reopen fields', async () => {
    await request(app)
      .post(`/api/v1/month-locks/${TEST_YEAR}/${TEST_MONTH}/lock`)
      .set(adminAuth());
    await request(app)
      .post(`/api/v1/month-locks/${TEST_YEAR}/${TEST_MONTH}/unlock`)
      .set(adminAuth());

    const r = await request(app)
      .post(`/api/v1/month-locks/${TEST_YEAR}/${TEST_MONTH}/lock`)
      .set(adminAuth());

    expect(r.status).toBe(200);
    expect(r.body.isLocked).toBe(true);

    const row = await prisma.monthLock.findUnique({
      where: { year_month: { year: TEST_YEAR, month: TEST_MONTH } },
    });
    expect(row?.isLocked).toBe(true);
    expect(row?.reopenedBy).toBeNull();
    expect(row?.reopenedAt).toBeNull();
  });
});

// ─── GET / list mode (admin) ─────────────────────────────────────────────────

describe('GET /api/v1/month-locks (list, admin)', () => {
  it('200 returns array including the test month after a lock', async () => {
    await request(app)
      .post(`/api/v1/month-locks/${TEST_YEAR}/${TEST_MONTH}/lock`)
      .set(adminAuth());

    const r = await request(app)
      .get('/api/v1/month-locks')
      .set(adminAuth());

    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    const ours = r.body.find(
      (m: { year: number; month: number }) =>
        m.year === TEST_YEAR && m.month === TEST_MONTH,
    );
    expect(ours).toBeDefined();
    expect(ours.isLocked).toBe(true);
    expect(ours.lockedByUser).toMatchObject({ id: adminUserId });
  });

  it('returns months sorted by year desc, month desc', async () => {
    const r = await request(app)
      .get('/api/v1/month-locks')
      .set(adminAuth());

    expect(r.status).toBe(200);
    for (let i = 1; i < r.body.length; i++) {
      const prev = r.body[i - 1];
      const curr = r.body[i];
      const prevKey = prev.year * 12 + prev.month;
      const currKey = curr.year * 12 + curr.month;
      expect(prevKey).toBeGreaterThanOrEqual(currKey);
    }
  });
});

// ─── Middleware integration (423 + admin bypass) ──────────────────────────────

describe('checkMonthLock middleware via POST /time-entries', () => {
  beforeEach(async () => {
    // Make sure prior runs don't leave a daily report in the way
    const reports = await prisma.dailyReport.findMany({
      where:  { userId: { in: [adminUserId, empUserId] }, reportDate: new Date(`${TEST_DATE}T00:00:00Z`) },
      select: { id: true },
    });
    const ids = reports.map((r) => r.id);
    if (ids.length > 0) {
      await prisma.timeReportEntry.deleteMany({ where: { dailyReportId: { in: ids } } });
      await prisma.dailyReport.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.monthLock.deleteMany({
      where: { year: TEST_YEAR, month: TEST_MONTH },
    });
  });

  it('423 when employee posts a report into a locked month', async () => {
    await request(app)
      .post(`/api/v1/month-locks/${TEST_YEAR}/${TEST_MONTH}/lock`)
      .set(adminAuth());

    const r = await request(app)
      .post('/api/v1/time-entries')
      .set(empAuth())
      .send(dayPayload(TEST_DATE));

    expect(r.status).toBe(423);
    expect(r.body).toHaveProperty('error');
  });

  it('admin can still post a report into a locked month (role bypass)', async () => {
    await request(app)
      .post(`/api/v1/month-locks/${TEST_YEAR}/${TEST_MONTH}/lock`)
      .set(adminAuth());

    const r = await request(app)
      .post('/api/v1/time-entries')
      .set(adminAuth())
      .send(dayPayload(TEST_DATE));

    expect(r.status).toBe(201);
  });

  it('after unlock, employee post succeeds again', async () => {
    await request(app)
      .post(`/api/v1/month-locks/${TEST_YEAR}/${TEST_MONTH}/lock`)
      .set(adminAuth());
    await request(app)
      .post(`/api/v1/month-locks/${TEST_YEAR}/${TEST_MONTH}/unlock`)
      .set(adminAuth());

    const r = await request(app)
      .post('/api/v1/time-entries')
      .set(empAuth())
      .send(dayPayload(TEST_DATE));

    expect(r.status).toBe(201);
  });
});
