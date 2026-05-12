import request from 'supertest';
import app from '../app';
import { prisma } from '../prisma/client';
import { EntityStatus, TaskStatus } from '@prisma/client';

// ─── Test fixtures ─────────────────────────────────────────────────────────────

const TEST_CLIENT_ID  = 'e0000001-0000-4000-8000-000000000001';
const TEST_PROJECT_ID = 'e0000002-0000-4000-8000-000000000001';
const TEST_TASK_ID    = 'e0000003-0000-4000-8000-000000000001';

const TEST_DATE_MAIN      = '2025-06-10';
const TEST_DATE_UPDATE    = '2025-06-11';
const TEST_DATE_SUBMITTED = '2025-07-10';
const TEST_LOCK_YEAR      = 2025;
const TEST_LOCK_MONTH     = 8; // August — unlikely to be locked in dev

let adminToken: string;
let adminUserId: string;

const auth = () => ({ Authorization: `Bearer ${adminToken}` });

function validEntry() {
  return {
    workLocation: 'OFFICE',
    clientId:     TEST_CLIENT_ID,
    projectId:    TEST_PROJECT_ID,
    taskId:       TEST_TASK_ID,
    startTime:    '08:00',
    endTime:      '12:00',
  };
}

function validPayload(date: string, status = 'DRAFT') {
  return {
    reportDate: date,
    startTime:  '08:00',
    endTime:    '17:00',
    status,
    entries:    [validEntry()],
  };
}

// ─── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@company.com', password: 'Admin1234!' });

  adminToken  = loginRes.body.accessToken as string;
  adminUserId = loginRes.body.user.id      as string;

  await prisma.client.upsert({
    where:  { id: TEST_CLIENT_ID },
    create: { id: TEST_CLIENT_ID, name: 'Test Client TR-017', status: EntityStatus.ACTIVE },
    update: {},
  });
  await prisma.project.upsert({
    where:  { id: TEST_PROJECT_ID },
    create: { id: TEST_PROJECT_ID, clientId: TEST_CLIENT_ID, name: 'Test Project TR-017', status: EntityStatus.ACTIVE },
    update: {},
  });
  await prisma.task.upsert({
    where:  { id: TEST_TASK_ID },
    create: { id: TEST_TASK_ID, projectId: TEST_PROJECT_ID, name: 'Test Task TR-017', status: TaskStatus.OPEN },
    update: {},
  });
});

afterAll(async () => {
  if (!adminUserId) {
    await prisma.$disconnect();
    return;
  }

  // Hard-delete any daily reports + their entries created during tests
  const testDates = [
    TEST_DATE_MAIN,
    TEST_DATE_UPDATE,
    TEST_DATE_SUBMITTED,
    `${TEST_LOCK_YEAR}-${String(TEST_LOCK_MONTH).padStart(2, '0')}-15`,
  ].map((d) => new Date(`${d}T00:00:00Z`));

  const reports = await prisma.dailyReport.findMany({
    where: { userId: adminUserId, reportDate: { in: testDates } },
  });
  const ids = reports.map((r) => r.id);

  if (ids.length > 0) {
    await prisma.timeReportEntry.deleteMany({ where: { dailyReportId: { in: ids } } });
    await prisma.dailyReport.deleteMany({ where: { id: { in: ids } } });
  }

  // Remove test task → project → client (order matters for FK constraints)
  await prisma.task.deleteMany({ where: { id: TEST_TASK_ID } }).catch(() => {});
  await prisma.project.deleteMany({ where: { id: TEST_PROJECT_ID } }).catch(() => {});
  await prisma.client.deleteMany({ where: { id: TEST_CLIENT_ID } }).catch(() => {});

  // Remove any lingering month lock (in case a test failed before cleanup)
  await prisma.monthLock.deleteMany({
    where: { year: TEST_LOCK_YEAR, month: TEST_LOCK_MONTH },
  }).catch(() => {});

  await prisma.$disconnect();
});

// ─── GET /api/v1/time-entries ─────────────────────────────────────────────────

describe('GET /api/v1/time-entries', () => {
  it('200 returns a days array covering every day of the requested month', async () => {
    const res = await request(app)
      .get('/api/v1/time-entries')
      .set(auth())
      .query({ year: 2026, month: 1 });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.days)).toBe(true);
    expect(res.body.days).toHaveLength(31); // January has 31 days
    expect(res.body.days[0]).toMatchObject({
      reportDate:    '2026-01-01',
      isWorkingDay:  expect.any(Boolean),
      entries:       expect.any(Array),
    });
  });

  it('400 when year/month query params are missing', async () => {
    const res = await request(app)
      .get('/api/v1/time-entries')
      .set(auth());

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 when month is out of range', async () => {
    const res = await request(app)
      .get('/api/v1/time-entries')
      .set(auth())
      .query({ year: 2026, month: 13 });

    expect(res.status).toBe(400);
  });

  it('401 without Authorization header', async () => {
    const res = await request(app)
      .get('/api/v1/time-entries')
      .query({ year: 2026, month: 1 });

    expect(res.status).toBe(401);
  });
});

// ─── POST /api/v1/time-entries ────────────────────────────────────────────────

describe('POST /api/v1/time-entries', () => {
  it('201 creates a report with entries', async () => {
    const res = await request(app)
      .post('/api/v1/time-entries')
      .set(auth())
      .send(validPayload(TEST_DATE_MAIN));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      reportDate:    TEST_DATE_MAIN,
      status:        'DRAFT',
      startTime:     '08:00',
      endTime:       '17:00',
    });
    expect(res.body.entries).toHaveLength(1);
    expect(res.body.entries[0]).toMatchObject({
      workLocation: 'OFFICE',
      clientId:     TEST_CLIENT_ID,
      taskId:       TEST_TASK_ID,
      startTime:    '08:00',
      endTime:      '12:00',
      durationMinutes: 240,
    });
  });

  it('400 on invalid body — missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/time-entries')
      .set(auth())
      .send({ reportDate: TEST_DATE_MAIN });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('400 when entry IDs are not valid UUIDs', async () => {
    const res = await request(app)
      .post('/api/v1/time-entries')
      .set(auth())
      .send({
        ...validPayload(TEST_DATE_MAIN),
        entries: [{ ...validEntry(), clientId: 'not-a-uuid' }],
      });

    expect(res.status).toBe(400);
  });

  it('400 when entries array is empty', async () => {
    const res = await request(app)
      .post('/api/v1/time-entries')
      .set(auth())
      .send({ ...validPayload(TEST_DATE_MAIN), entries: [] });

    expect(res.status).toBe(400);
  });

  it('423 when the target month is locked', async () => {
    const lockDate = `${TEST_LOCK_YEAR}-${String(TEST_LOCK_MONTH).padStart(2, '0')}-15`;

    await prisma.monthLock.upsert({
      where:  { year_month: { year: TEST_LOCK_YEAR, month: TEST_LOCK_MONTH } },
      create: { year: TEST_LOCK_YEAR, month: TEST_LOCK_MONTH, isLocked: true },
      update: { isLocked: true },
    });

    try {
      const res = await request(app)
        .post('/api/v1/time-entries')
        .set(auth())
        .send(validPayload(lockDate));

      expect(res.status).toBe(423);
      expect(res.body).toHaveProperty('error');
    } finally {
      await prisma.monthLock.delete({
        where: { year_month: { year: TEST_LOCK_YEAR, month: TEST_LOCK_MONTH } },
      }).catch(() => {});
    }
  });
});

// ─── PUT /api/v1/time-entries/:reportDate ─────────────────────────────────────

describe('PUT /api/v1/time-entries/:reportDate', () => {
  it('200 updates the existing report and replaces entries', async () => {
    // Ensure a report exists for TEST_DATE_UPDATE
    await request(app)
      .post('/api/v1/time-entries')
      .set(auth())
      .send(validPayload(TEST_DATE_UPDATE));

    // PUT — change the entry time range
    const res = await request(app)
      .put(`/api/v1/time-entries/${TEST_DATE_UPDATE}`)
      .set(auth())
      .send({
        ...validPayload(TEST_DATE_UPDATE),
        entries: [{ ...validEntry(), startTime: '09:00', endTime: '13:00' }],
      });

    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(1);
    expect(res.body.entries[0]).toMatchObject({
      startTime:       '09:00',
      endTime:         '13:00',
      durationMinutes: 240,
    });
  });

  it('400 on malformed date param', async () => {
    const res = await request(app)
      .put('/api/v1/time-entries/not-a-date')
      .set(auth())
      .send(validPayload(TEST_DATE_UPDATE));

    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/v1/time-entries/:reportDate ──────────────────────────────────

describe('DELETE /api/v1/time-entries/:reportDate', () => {
  it('204 soft-deletes a DRAFT report', async () => {
    // Create a fresh report for deletion
    await request(app)
      .post('/api/v1/time-entries')
      .set(auth())
      .send(validPayload(TEST_DATE_MAIN));

    const res = await request(app)
      .delete(`/api/v1/time-entries/${TEST_DATE_MAIN}`)
      .set(auth());

    expect(res.status).toBe(204);

    // The report should no longer appear in the day list (soft-deleted)
    const getRes = await request(app)
      .get('/api/v1/time-entries')
      .set(auth())
      .query({ year: 2025, month: 6 });

    const deletedDay = getRes.body.days.find(
      (d: { reportDate: string }) => d.reportDate === TEST_DATE_MAIN,
    );
    expect(deletedDay?.dailyReportId).toBeNull();
  });

  it('409 when attempting to delete a SUBMITTED report', async () => {
    // Create a submitted report
    await request(app)
      .post('/api/v1/time-entries')
      .set(auth())
      .send(validPayload(TEST_DATE_SUBMITTED, 'SUBMITTED'));

    const res = await request(app)
      .delete(`/api/v1/time-entries/${TEST_DATE_SUBMITTED}`)
      .set(auth());

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  it('404 when the report does not exist', async () => {
    const res = await request(app)
      .delete('/api/v1/time-entries/2020-01-01')
      .set(auth());

    expect(res.status).toBe(404);
  });
});

// ─── GET /api/v1/time-entries/dropdown-data ───────────────────────────────────

describe('GET /api/v1/time-entries/dropdown-data', () => {
  it('200 returns nested client → project → task hierarchy', async () => {
    const res = await request(app)
      .get('/api/v1/time-entries/dropdown-data')
      .set(auth());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.clients)).toBe(true);

    const testClient = res.body.clients.find(
      (c: { id: string }) => c.id === TEST_CLIENT_ID,
    );
    expect(testClient).toBeDefined();
    expect(testClient.projects).toHaveLength(1);
    expect(testClient.projects[0].tasks).toHaveLength(1);
    expect(testClient.projects[0].tasks[0].id).toBe(TEST_TASK_ID);
  });

  it('401 without Authorization header', async () => {
    const res = await request(app).get('/api/v1/time-entries/dropdown-data');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/v1/time-entries/monthly-summary ─────────────────────────────────

describe('GET /api/v1/time-entries/monthly-summary', () => {
  it('200 returns correct aggregate counts for the requested month', async () => {
    const res = await request(app)
      .get('/api/v1/time-entries/monthly-summary')
      .set(auth())
      .query({ year: 2026, month: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      totalReportedMinutes:    expect.any(Number),
      expectedWorkingMinutes:  expect.any(Number),
      submittedDays:           expect.any(Number),
      draftDays:               expect.any(Number),
      missingDays:             expect.any(Number),
      absenceDays:             expect.any(Number),
    });
  });

  it('reflects a newly submitted report in submittedDays', async () => {
    // TEST_DATE_SUBMITTED report was created as SUBMITTED in the DELETE test above.
    // If the DELETE test ran first the report still exists (DELETE returned 409).
    const res = await request(app)
      .get('/api/v1/time-entries/monthly-summary')
      .set(auth())
      .query({ year: 2025, month: 7 });

    expect(res.status).toBe(200);
    expect(res.body.submittedDays).toBeGreaterThanOrEqual(1);
  });

  it('400 when query params are missing', async () => {
    const res = await request(app)
      .get('/api/v1/time-entries/monthly-summary')
      .set(auth());

    expect(res.status).toBe(400);
  });
});
