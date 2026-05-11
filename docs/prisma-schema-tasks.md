# Prisma Schema Tasks — T009

**Epic**: EPIC-001 — Foundation & Authentication
**Phase**: 2 — Foundational
**Task**: T009
**Branch**: `frontend-setup`
**Prepared**: 2026-05-07
**Source of truth**: `specs/001-time-reporting-system/data-model.md`

---

## Overview

T009 writes the complete Prisma schema at `backend/prisma/schema.prisma` covering all 12 entities,
all enums, all relations, and all indexes as defined in the current `data-model.md`.

**Prerequisites**:
- T007 complete — `prisma` dev dependency installed in `backend/`
- `backend/` directory exists with `package.json`

**Output file**: `backend/prisma/schema.prisma`

**Validation command** (run after each subtask to catch syntax errors early):
```bash
pnpm --filter backend exec prisma validate
```

---

## Subtask Breakdown

### T009-1 · Create the file — datasource + generator blocks

Create `backend/prisma/schema.prisma` with the following content (replace if it exists from a
previous `prisma init`):

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

**Validation**: File exists at `backend/prisma/schema.prisma`; `pnpm --filter backend exec prisma validate` passes.

---

### T009-2 · Define all enums

Append the following enum block after the generator. All 11 enums must be defined before any model
references them.

```prisma
// ─── Enums ───────────────────────────────────────────────────────────────────

enum UserRole {
  EMPLOYEE
  TEAM_LEAD
  ADMIN
}

enum UserStatus {
  ACTIVE
  INACTIVE
}

enum EntityStatus {
  ACTIVE
  INACTIVE
}

enum TaskStatus {
  OPEN
  CLOSED
}

enum DailyReportStatus {
  DRAFT
  SUBMITTED
}

enum WorkLocation {
  OFFICE
  CLIENT
  HOME
}

enum AbsenceType {
  VACATION
  SICK_LEAVE
  MILITARY_RESERVE
  OTHER
}

enum AbsenceStatus {
  SUBMITTED
  DOCUMENT_PENDING
}

enum AuditEntityType {
  DAILY_REPORT
  TIME_ENTRY
  ABSENCE_REPORT
}

enum AuditAction {
  UPDATE
  DELETE
}

enum DayType {
  REGULAR
  WEEKEND
  HOLIDAY
  SPECIAL
}
```

> `EntityStatus` is shared by both `Client` and `Project` — one enum, two models.
> `AuditEntityType` uses `DAILY_REPORT` / `TIME_ENTRY` (not the old `TIME_REPORT`) to match the
> updated data model.

**Validation**: `prisma validate` passes with 0 errors.

---

### T009-3 · Define `User` model

```prisma
// ─── Models ──────────────────────────────────────────────────────────────────

model User {
  id           String     @id @default(uuid())
  fullName     String
  email        String     @unique
  passwordHash String
  role         UserRole
  status       UserStatus @default(ACTIVE)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  deletedAt    DateTime?

  dailyReports     DailyReport[]
  absenceReports   AbsenceReport[]
  taskAssignments  TaskAssignment[]  @relation("AssignedUser")
  assignedByMe     TaskAssignment[]  @relation("AssignedBy")
  lockedMonths     MonthLock[]       @relation("LockedBy")
  reopenedMonths   MonthLock[]       @relation("ReopenedBy")
  auditPerformed   AuditLog[]        @relation("PerformedBy")
  auditTargeted    AuditLog[]        @relation("TargetUser")
  absenceDocuments AbsenceDocument[]
}
```

> `TaskAssignment` has two FK → `User` (`userId` and `assignedBy`), so both need named relations.
> `MonthLock` and `AuditLog` each reference `User` twice for the same reason.

**Validation**: `prisma validate` passes.

---

### T009-4 · Define `Client` and `Project` models

```prisma
model Client {
  id        String       @id @default(uuid())
  name      String
  status    EntityStatus @default(ACTIVE)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
  deletedAt DateTime?

  projects    Project[]
  timeEntries TimeReportEntry[]
}

model Project {
  id        String       @id @default(uuid())
  clientId  String
  name      String
  status    EntityStatus @default(ACTIVE)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
  deletedAt DateTime?

  client      Client            @relation(fields: [clientId], references: [id])
  tasks       Task[]
  timeEntries TimeReportEntry[]
}
```

> `Client` has no `contactDetails` field — removed from the data model.
> Both `Client` and `Project` back-relate to `TimeReportEntry` because `clientId` / `projectId`
> are denormalized on the entry for query performance.

**Validation**: `prisma validate` passes.

---

### T009-5 · Define `Task` and `TaskAssignment` models

```prisma
model Task {
  id        String     @id @default(uuid())
  projectId String
  name      String
  status    TaskStatus @default(OPEN)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  closedAt  DateTime?

  project     Project           @relation(fields: [projectId], references: [id])
  assignments TaskAssignment[]
  timeEntries TimeReportEntry[]
}

model TaskAssignment {
  id         String   @id @default(uuid())
  taskId     String
  userId     String
  assignedBy String
  createdAt  DateTime @default(now())

  task           Task @relation(fields: [taskId], references: [id])
  user           User @relation("AssignedUser", fields: [userId], references: [id])
  assignedByUser User @relation("AssignedBy", fields: [assignedBy], references: [id])

  @@unique([taskId, userId])
}
```

> `@@unique([taskId, userId])` enforces one assignment per user-task pair.
> `assignedBy` uses a named relation `"AssignedBy"` to disambiguate from the `"AssignedUser"`
> relation on the same `User` model.

**Validation**: `prisma validate` passes.

---

### T009-6 · Define `DailyReport` model

```prisma
model DailyReport {
  id         String            @id @default(uuid())
  userId     String
  reportDate DateTime          @db.Date
  startTime  DateTime          @db.Time(0)
  endTime    DateTime          @db.Time(0)
  status     DailyReportStatus @default(DRAFT)
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt
  deletedAt  DateTime?

  user    User              @relation(fields: [userId], references: [id])
  entries TimeReportEntry[]

  @@index([userId, reportDate])
}
```

> `@db.Date` stores only the date portion (no time zone). `@db.Time(0)` stores HH:MM:SS with 0
> fractional seconds (minutes precision is sufficient per spec).
>
> The data model specifies `UNIQUE (userId, reportDate) WHERE deletedAt IS NULL` — a **partial**
> unique index. Prisma's `@@unique` cannot express the `WHERE` clause. Add the index as raw SQL in
> the migration after T010 runs (see T009-12).

**Validation**: `prisma validate` passes.

---

### T009-7 · Define `TimeReportEntry` model

```prisma
model TimeReportEntry {
  id              String       @id @default(uuid())
  dailyReportId   String
  workLocation    WorkLocation
  clientId        String
  projectId       String
  taskId          String
  startTime       DateTime     @db.Time(0)
  endTime         DateTime     @db.Time(0)
  durationMinutes Int
  description     String?      @db.VarChar(500)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  deletedAt       DateTime?

  dailyReport DailyReport @relation(fields: [dailyReportId], references: [id])
  client      Client      @relation(fields: [clientId], references: [id])
  project     Project     @relation(fields: [projectId], references: [id])
  task        Task        @relation(fields: [taskId], references: [id])

  @@index([dailyReportId])
  @@index([taskId])
}
```

> `description` is `String?` (nullable) — intentionally different from the old `TimeReport` where
> it was NOT NULL.
> No `@@unique` on time ranges — overlapping entries within the same day are **explicitly allowed**
> by product design.
> `workLocation` lives on the entry, not on `DailyReport`.

**Validation**: `prisma validate` passes.

---

### T009-8 · Define `AbsenceReport` and `AbsenceDocument` models

```prisma
model AbsenceReport {
  id                   String        @id @default(uuid())
  userId               String
  absenceType          AbsenceType
  startDate            DateTime      @db.Date
  endDate              DateTime      @db.Date
  isPartial            Boolean       @default(false)
  partialDurationHours Decimal?      @db.Decimal(5, 2)
  calculatedAbsenceDays Int
  status               AbsenceStatus @default(SUBMITTED)
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt

  user      User              @relation(fields: [userId], references: [id])
  documents AbsenceDocument[]
}

model AbsenceDocument {
  id              String   @id @default(uuid())
  absenceReportId String
  fileName        String
  storagePath     String
  mimeType        String
  uploadedBy      String
  uploadedAt      DateTime @default(now())

  absenceReport AbsenceReport @relation(fields: [absenceReportId], references: [id])
  uploader      User          @relation(fields: [uploadedBy], references: [id])
}
```

> `partialDurationHours` uses `Decimal(5,2)` for e.g. `4.50` hours.
> `AbsenceReport` has no `deletedAt` — the spec defines no soft-delete for absence records.

**Validation**: `prisma validate` passes.

---

### T009-9 · Define `MonthLock` model

```prisma
model MonthLock {
  id         String    @id @default(uuid())
  year       Int
  month      Int
  isLocked   Boolean   @default(false)
  lockedBy   String?
  lockedAt   DateTime?
  reopenedBy String?
  reopenedAt DateTime?

  lockedByUser   User? @relation("LockedBy", fields: [lockedBy], references: [id])
  reopenedByUser User? @relation("ReopenedBy", fields: [reopenedBy], references: [id])

  @@unique([year, month])
}
```

> `@@unique([year, month])` enforces one lock row per calendar month.
> Both `lockedBy` and `reopenedBy` are nullable FKs with named relations to resolve the ambiguity
> on `User`.

**Validation**: `prisma validate` passes.

---

### T009-10 · Define `AuditLog` model

```prisma
model AuditLog {
  id           String          @id @default(uuid())
  entityType   AuditEntityType
  entityId     String
  action       AuditAction
  performedBy  String
  targetUserId String
  oldValue     Json
  newValue     Json
  createdAt    DateTime        @default(now())

  performer  User @relation("PerformedBy", fields: [performedBy], references: [id])
  targetUser User @relation("TargetUser", fields: [targetUserId], references: [id])
}
```

> `AuditLog` is **insert-only** — no `updatedAt`, no `deletedAt`.
> `Json` type maps to `jsonb` in PostgreSQL, storing full record snapshots.

**Validation**: `prisma validate` passes.

---

### T009-11 · Define `WorkCalendarDay` model

```prisma
model WorkCalendarDay {
  id            String   @id @default(uuid())
  date          DateTime @unique @db.Date
  dayType       DayType
  isWorkingDay  Boolean
  standardHours Decimal  @default(9.0) @db.Decimal(4, 2)
  description   String?
}
```

> `@unique` on `date` enforces one row per calendar date.
> `standardHours` defaults to `9.0`; holidays have `0.0`.

**Validation**: `prisma validate` passes.

---

### T009-12 · Final validation and partial-unique index note

Run the full schema validation:

```bash
pnpm --filter backend exec prisma validate
```

Expected output:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
The schema at prisma/schema.prisma is valid 🚀
```

**Partial unique index — action required after T010 (migration)**:

Prisma's `@@unique` cannot express `WHERE deletedAt IS NULL`. After T010 generates the initial
migration SQL, open `backend/prisma/migrations/<timestamp>_init/migration.sql` and add:

```sql
-- Partial unique: one active DailyReport per user per date
CREATE UNIQUE INDEX "DailyReport_userId_reportDate_key"
  ON "DailyReport" ("userId", "reportDate")
  WHERE "deletedAt" IS NULL;
```

Remove the plain `@@unique([userId, reportDate])` annotation from the Prisma schema (or replace it
with `@@index`) before running `prisma migrate dev`, otherwise Prisma will generate a conflicting
standard unique constraint.

> This step belongs to T010, not T009. It is documented here so it is not forgotten when writing
> the migration.

---

## T009 Checkpoint

| Check | Command | Expected |
|-------|---------|----------|
| Schema syntax valid | `pnpm --filter backend exec prisma validate` | `The schema ... is valid 🚀` |
| All 12 models present | Search schema file for `model ` | 12 hits: User, Client, Project, Task, TaskAssignment, DailyReport, TimeReportEntry, AbsenceReport, AbsenceDocument, MonthLock, AuditLog, WorkCalendarDay |
| All 11 enums present | Search schema file for `enum ` | 11 hits |
| No `TimeReport` entity | Search for `model TimeReport` | No match |
| No `ActiveTimer` entity | Search for `model ActiveTimer` | No match |
| No `contactDetails` on Client | Search for `contactDetails` | No match |
| `description` nullable on TimeReportEntry | Check field definition | `description String?` |
| `workLocation` on TimeReportEntry | Check field location | In `TimeReportEntry`, not `DailyReport` |

**Suggested commit boundary**:
```
feat: write complete Prisma schema — 12 entities, 11 enums (T009)
```
File to stage: `backend/prisma/schema.prisma`

---

## Entity → Subtask Map

| Entity | Subtask |
|--------|---------|
| datasource + generator | T009-1 |
| All 11 enums | T009-2 |
| User | T009-3 |
| Client, Project | T009-4 |
| Task, TaskAssignment | T009-5 |
| DailyReport | T009-6 |
| TimeReportEntry | T009-7 |
| AbsenceReport, AbsenceDocument | T009-8 |
| MonthLock | T009-9 |
| AuditLog | T009-10 |
| WorkCalendarDay | T009-11 |
| Final validation + partial-unique note | T009-12 |

---

## Key Decisions

| Decision | Reason |
|----------|--------|
| `DailyReport` + `TimeReportEntry` instead of `TimeReport` | Product requires multiple task entries per day; day is the submission unit |
| `workLocation` on `TimeReportEntry` | A user can work from different locations on different tasks within the same day |
| `description` nullable on `TimeReportEntry` | Spec updated; description is optional per task entry |
| No `@@unique` overlap constraint on `TimeReportEntry` time ranges | Overlapping entries within a day are explicitly allowed by product design |
| Partial unique index for `DailyReport(userId, reportDate)` deferred to T010 | Prisma schema DSL cannot express `WHERE deletedAt IS NULL`; handled in migration SQL |
| `@db.Time(0)` for time fields | HH:MM precision is sufficient; no sub-minute granularity needed |
| `AuditEntityType`: `DAILY_REPORT` / `TIME_ENTRY` | Matches updated data model; old `TIME_REPORT` value removed |
| No `ActiveTimer` entity | Not present in current `data-model.md`; belongs to EPIC-007 |
