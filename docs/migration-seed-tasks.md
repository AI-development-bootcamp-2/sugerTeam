# Migration & Seed Tasks — T010

**Epic**: EPIC-001 — Foundation & Authentication
**Phase**: 2 — Foundational
**Task**: T010
**Branch**: `frontend-setup`
**Prepared**: 2026-05-07
**Depends on**: T009 complete — `backend/prisma/schema.prisma` exists and is valid

---

## Overview

T010 has three responsibilities:

| Step | What | Output |
|------|------|--------|
| T010-1–2 | Prerequisite: ensure `ts-node` + seed config wired | `backend/package.json` |
| T010-3–5 | Generate migration SQL, patch partial unique index, apply | `backend/prisma/migrations/<ts>_init/` |
| T010-6–8 | Write and validate seed script | `backend/prisma/seed.ts` |

**Prerequisites**:
- T009 complete — `backend/prisma/schema.prisma` is valid
- T007 complete — `prisma` dev dep installed in `backend/`
- PostgreSQL is running and `DATABASE_URL` is set in `.env`

---

## Subtask Breakdown

### T010-1 · Ensure `ts-node` is available

The seed command uses `ts-node prisma/seed.ts`. T002 installs `ts-node-dev` (not `ts-node`
directly). Verify and install if missing:

```bash
pnpm --filter backend list | grep ts-node
```

If `ts-node` does **not** appear as a direct dependency (only `ts-node-dev`):

```bash
pnpm --filter backend add -D ts-node
```

> `ts-node-dev` may include `ts-node` transitively, but explicit installation avoids resolution
> surprises when running `prisma db seed`.

**Validation**: `pnpm --filter backend list | grep ts-node` shows `ts-node` (not just `ts-node-dev`).

---

### T010-2 · Add `prisma.seed` config to `backend/package.json`

Open `backend/package.json` and add a top-level `"prisma"` key alongside `"scripts"`:

```json
{
  "name": "backend",
  "scripts": { ... },
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  },
  "dependencies": { ... },
  "devDependencies": { ... }
}
```

> This tells `prisma db seed` which command to run. It must be a top-level key, not inside
> `"scripts"`.

**Validation**: `cat backend/package.json | grep -A2 '"prisma"'` shows the seed entry.

---

### T010-3 · Generate migration SQL without applying (`--create-only`)

Run from the project root:

```bash
pnpm --filter backend exec prisma migrate dev --name init --create-only
```

> `--create-only` writes the SQL file but does **not** run it against the database. This lets you
> edit the SQL (T010-4) before it is applied.

**Expected output**:
```
Prisma Migrate created the following migration(s) without applying them:
  migrations/20260507xxxxxx_init/migration.sql
```

**Expected file created**:
```
backend/prisma/migrations/
└── 20260507xxxxxx_init/
    └── migration.sql
```

**Validation**: The file `backend/prisma/migrations/<timestamp>_init/migration.sql` exists.

---

### T010-4 · Patch migration SQL — partial unique index on `DailyReport`

Open the generated `migration.sql` file. Locate the `CREATE TABLE "DailyReport"` block.

**Case A — schema.prisma used `@@index` (no unique constraint generated)**:
Append the following at the **end** of the file, after all `CREATE TABLE` and `CREATE INDEX`
statements:

```sql
-- Partial unique: one active DailyReport per user per date (soft-delete aware)
CREATE UNIQUE INDEX "DailyReport_userId_reportDate_active_key"
  ON "DailyReport" ("userId", "reportDate")
  WHERE "deletedAt" IS NULL;
```

**Case B — schema.prisma used `@@unique` (Prisma generated a plain unique constraint)**:
Find and **remove** (or replace) the generated plain unique constraint on `(userId, reportDate)`.
It will look like one of:

```sql
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_userId_reportDate_key"
  UNIQUE ("userId", "reportDate");
-- OR
CREATE UNIQUE INDEX "DailyReport_userId_reportDate_key"
  ON "DailyReport"("userId", "reportDate");
```

Replace it with:

```sql
-- Partial unique: one active DailyReport per user per date (soft-delete aware)
CREATE UNIQUE INDEX "DailyReport_userId_reportDate_active_key"
  ON "DailyReport" ("userId", "reportDate")
  WHERE "deletedAt" IS NULL;
```

> A plain unique constraint would prevent re-creating a day report after soft-deleting it.
> The partial index (`WHERE deletedAt IS NULL`) allows that use case.

**Validation**: The final `migration.sql` contains `WHERE "deletedAt" IS NULL` and does **not**
contain a plain `UNIQUE` constraint on `(userId, reportDate)`.

---

### T010-5 · Apply the migration

```bash
pnpm --filter backend exec prisma migrate dev
```

> Running `migrate dev` after `--create-only` applies all pending migrations (the one you just
> edited).

**Expected output**:
```
The following migration(s) have been applied:
  migrations/20260507xxxxxx_init/migration.sql

Your database is now in sync with your schema.
```

**Validation**:
- No errors in output
- `pnpm --filter backend exec prisma migrate status` shows `1 migration found in prisma/migrations` and `Database schema is up to date!`

---

### T010-6 · Write seed script — file skeleton + admin user

Create `backend/prisma/seed.ts` with the following content:

```typescript
import { PrismaClient, DayType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedAdmin(): Promise<void> {
  const passwordHash = await bcrypt.hash('Admin1234!', 12);

  await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      fullName: 'מנהל מערכת',
      email: 'admin@company.com',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('✓ Admin user seeded: admin@company.com');
}

async function main(): Promise<void> {
  await seedAdmin();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

> `upsert` with `update: {}` is idempotent — safe to re-run without duplicating the admin user.
> bcrypt cost factor `12` is intentional per spec; it is slow by design (security).

**Validation**: File exists at `backend/prisma/seed.ts` and compiles:
```bash
pnpm --filter backend exec tsc --noEmit --project tsconfig.json
```

---

### T010-7 · Add WorkCalendarDay weekend seeding to `backend/prisma/seed.ts`

Add the `seedWeekends` function and call it from `main`. Replace `main` with the updated version:

```typescript
async function seedWeekends(year: number): Promise<void> {
  const records: { date: Date; dayType: DayType; isWorkingDay: boolean; standardHours: number }[] = [];

  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day === 5 || day === 6) {
      records.push({
        date: new Date(d),
        dayType: DayType.WEEKEND,
        isWorkingDay: false,
        standardHours: 0,
      });
    }
  }

  for (const record of records) {
    await prisma.workCalendarDay.upsert({
      where: { date: record.date },
      update: {},
      create: record,
    });
  }

  console.log(`✓ Seeded ${records.length} weekend days for ${year}`);
}

async function main(): Promise<void> {
  await seedAdmin();
  await seedWeekends(2026);
  await seedWeekends(2027);
}
```

> `getDay()` returns `5` for Friday and `6` for Saturday — the Israeli weekend.
> Looping with `d.setDate(d.getDate() + 1)` mutates `d` in place; the `new Date(d)` in the
> push captures the value at that iteration.
> `upsert` is idempotent — re-running the seed does not create duplicates.
> Expected record counts: ~105 weekend days per year (53 Fridays or Saturdays in years starting on
> those days), so approximately 208–210 rows total across 2026–2027.

**Validation**: TypeScript compiles cleanly:
```bash
pnpm --filter backend exec tsc --noEmit --project tsconfig.json
```

---

### T010-8 · Run and validate the seed

Ensure `.env` at the project root has `DATABASE_URL` pointing to a running PostgreSQL instance,
then run:

```bash
pnpm --filter backend exec prisma db seed
```

**Expected console output**:
```
✓ Admin user seeded: admin@company.com
✓ Seeded 105 weekend days for 2026
✓ Seeded 105 weekend days for 2027
```

**Validation queries** (run in `psql` or Prisma Studio):

```sql
-- Admin user exists
SELECT email, "fullName", role, status FROM "User" WHERE email = 'admin@company.com';
-- Expected: 1 row, role = ADMIN, status = ACTIVE

-- Weekend days seeded
SELECT COUNT(*), "dayType", "isWorkingDay" FROM "WorkCalendarDay" GROUP BY "dayType", "isWorkingDay";
-- Expected: ~210 rows with dayType = WEEKEND, isWorkingDay = false

-- Spot-check: Jan 2 2026 is a Friday
SELECT date, "dayType", "isWorkingDay" FROM "WorkCalendarDay" WHERE date = '2026-01-02';
-- Expected: 1 row, WEEKEND, false
```

Open Prisma Studio as an alternative:
```bash
pnpm --filter backend exec prisma studio
```

---

## T010 Checkpoint

| Check | Command | Expected |
|-------|---------|----------|
| `ts-node` available | `pnpm --filter backend list \| grep ts-node` | `ts-node` listed |
| Seed config in package.json | `grep -A2 '"prisma"' backend/package.json` | `"seed": "ts-node prisma/seed.ts"` |
| Migration applied | `pnpm --filter backend exec prisma migrate status` | `Database schema is up to date!` |
| Partial unique index present | `grep "deletedAt" backend/prisma/migrations/**/migration.sql` | Match found |
| Seed runs without error | `pnpm --filter backend exec prisma db seed` | All 3 `✓` lines logged |
| Admin user in DB | psql or Studio | 1 row, `admin@company.com`, `ADMIN`, `ACTIVE` |
| Weekend rows in DB | psql or Studio | ~210 rows, `WEEKEND`, `isWorkingDay = false` |

**Suggested commit boundary**:
```
feat: add initial migration and seed script (T010)
```
Files to stage:
- `backend/package.json`
- `backend/prisma/migrations/<timestamp>_init/migration.sql`
- `backend/prisma/seed.ts`

---

## Complete `backend/prisma/seed.ts`

For reference, the full file after T010-6 + T010-7:

```typescript
import { PrismaClient, DayType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedAdmin(): Promise<void> {
  const passwordHash = await bcrypt.hash('Admin1234!', 12);

  await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      fullName: 'מנהל מערכת',
      email: 'admin@company.com',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('✓ Admin user seeded: admin@company.com');
}

async function seedWeekends(year: number): Promise<void> {
  const records: { date: Date; dayType: DayType; isWorkingDay: boolean; standardHours: number }[] = [];

  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day === 5 || day === 6) {
      records.push({
        date: new Date(d),
        dayType: DayType.WEEKEND,
        isWorkingDay: false,
        standardHours: 0,
      });
    }
  }

  for (const record of records) {
    await prisma.workCalendarDay.upsert({
      where: { date: record.date },
      update: {},
      create: record,
    });
  }

  console.log(`✓ Seeded ${records.length} weekend days for ${year}`);
}

async function main(): Promise<void> {
  await seedAdmin();
  await seedWeekends(2026);
  await seedWeekends(2027);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

---

## Dependency Chain

```
T009 (schema.prisma valid)
  └─► T010-1  ensure ts-node installed
        └─► T010-2  add prisma.seed to package.json
              └─► T010-3  prisma migrate dev --create-only --name init
                    └─► T010-4  patch migration.sql (partial unique index)
                          └─► T010-5  prisma migrate dev (apply)
                                └─► T010-6  write seed.ts — admin user
                                      └─► T010-7  add seedWeekends to seed.ts
                                            └─► T010-8  prisma db seed (validate)
                                                  └─► T011 (Prisma client singleton)
```
