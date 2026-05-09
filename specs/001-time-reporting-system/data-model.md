# Data Model: Time Reporting System

**Phase**: 1 — Design
**Date**: 2026-05-06
**Updated**: 2026-05-07 — split TimeReport into DailyReport (day container) + TimeReportEntry (per-task row)

---

## Entity Relationship Overview

```
User ──────────────────────────────────────────┐
  │                                             │
  ├──< DailyReport ──< TimeReportEntry >── Task ──< TaskAssignment >── User
  │                           │
  │                           └── Client, Project (denormalized for query performance)
  │
  ├──< AbsenceReport >──< AbsenceDocument
  │
  └── (lockedBy / reopenedBy) MonthLock

Client ──< Project ──< Task ──< TaskAssignment
MonthLock (standalone, keyed by year+month)
AuditLog (standalone, polymorphic)
WorkCalendarDay (standalone, keyed by date)
```

---

## Core Reporting Concept

A user reports work at the **day level**. One `DailyReport` exists per user per calendar date. Inside that day report the user adds one or more `TimeReportEntry` rows — each row targets a specific client / project / task and carries its own time range and duration.

- The **day** is the unit of submission (`DailyReport.status`).
- Each **entry** is a single project/task block within that day.
- Multiple entries on the same day are always allowed, including overlapping time ranges (a user may have worked on two projects during the same window).
- The system MUST NOT enforce "no overlapping time ranges" for entries under the same `DailyReport`.
- Validation that matters: the sum of `durationMinutes` across all entries for a day is compared against `WorkCalendarDay.standardHours` (UI feedback only; hard rejection is not required unless specified).

---

## Entities

### User

The system account of an employee, team lead, or admin.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Auto-generated |
| fullName | String | NOT NULL | Display name |
| email | String | UNIQUE, NOT NULL | Login credential |
| passwordHash | String | NOT NULL | bcrypt hash; never returned in API responses |
| role | Enum | NOT NULL | Values: `EMPLOYEE`, `TEAM_LEAD`, `ADMIN` |
| status | Enum | NOT NULL, default ACTIVE | Values: `ACTIVE`, `INACTIVE` |
| createdAt | DateTime | NOT NULL, default now() | |
| updatedAt | DateTime | NOT NULL | Auto-updated |
| deletedAt | DateTime | nullable | Set on soft-delete; non-null means deactivated |

**State transitions**: `ACTIVE` → `INACTIVE` (deactivate). Reverse allowed by admin.
**Rules**: `INACTIVE` users cannot authenticate. `deletedAt` is set to `updatedAt` timestamp on
deactivation for consistency; null means active.

---

### Client

An organization or company for which employees report work.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| name | String | NOT NULL | Display name |
| status | Enum | NOT NULL, default ACTIVE | Values: `ACTIVE`, `INACTIVE` |
| createdAt | DateTime | NOT NULL | |
| updatedAt | DateTime | NOT NULL | |
| deletedAt | DateTime | nullable | Soft delete |

**Rules**: `INACTIVE` clients MUST NOT appear in report form dropdowns. Historical reports
referencing an inactive client remain valid and readable.

---

### Project

A named initiative under a client.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| clientId | UUID | FK → Client, NOT NULL | |
| name | String | NOT NULL | |
| status | Enum | NOT NULL, default ACTIVE | Values: `ACTIVE`, `INACTIVE` |
| createdAt | DateTime | NOT NULL | |
| updatedAt | DateTime | NOT NULL | |
| deletedAt | DateTime | nullable | |

**Rules**: A project is accessible in new reports only if both the project and its client are active.

---

### Task

A specific unit of work within a project that employees can report time against.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| projectId | UUID | FK → Project, NOT NULL | |
| name | String | NOT NULL | Task name or description |
| status | Enum | NOT NULL, default OPEN | Values: `OPEN`, `CLOSED` |
| createdAt | DateTime | NOT NULL | |
| updatedAt | DateTime | NOT NULL | |
| closedAt | DateTime | nullable | Set when status → CLOSED |

**Rules**: Only `OPEN` tasks that are assigned to the user appear in report form dropdowns.

---

### TaskAssignment

The link between a user and a task, granting reporting rights.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| taskId | UUID | FK → Task, NOT NULL | |
| userId | UUID | FK → User, NOT NULL | The employee being assigned |
| assignedBy | UUID | FK → User, NOT NULL | The admin or team lead who created the assignment |
| createdAt | DateTime | NOT NULL | |

**Constraints**: UNIQUE on `(taskId, userId)`.
**Rules**: Removing an assignment does not affect historical reports.

---

### DailyReport

The day-level container for a user's work on a single calendar date. One row per user per date.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| userId | UUID | FK → User, NOT NULL | Report owner |
| reportDate | Date | NOT NULL | The calendar date of work |
| startTime | Time | NOT NULL | HH:MM — start of the work day |
| endTime | Time | NOT NULL | HH:MM — end of the work day; must be > startTime |
| status | Enum | NOT NULL, default DRAFT | Values: `DRAFT`, `SUBMITTED` |
| createdAt | DateTime | NOT NULL | |
| updatedAt | DateTime | NOT NULL | |
| deletedAt | DateTime | nullable | Soft delete |

**Constraints**: UNIQUE on `(userId, reportDate)` WHERE `deletedAt IS NULL`.
**State transitions**: `DRAFT` → `SUBMITTED` (employee submits the day). `SUBMITTED` → `DRAFT` (employee reopens before month lock). `SUBMITTED` → soft-deleted (cancel).
**Rules**:
- `endTime > startTime` (server-enforced); no midnight crossing.
- All `TimeReportEntry` times must fall within `[startTime, endTime]`.
- A `DailyReport` cannot be created or modified if its `reportDate` month is locked (unless editor is Admin).
- A day report can only be submitted once all its entries pass entry-level validation.

---

### TimeReportEntry

A single project/task work block within a `DailyReport`. A day report may contain any number of entries.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| dailyReportId | UUID | FK → DailyReport, NOT NULL | Parent day container |
| workLocation | Enum | NOT NULL | Values: `OFFICE`, `CLIENT`, `HOME` |
| clientId | UUID | FK → Client, NOT NULL | Denormalized for query performance |
| projectId | UUID | FK → Project, NOT NULL | Denormalized |
| taskId | UUID | FK → Task, NOT NULL | The assigned task reported against |
| startTime | Time | NOT NULL | HH:MM (no seconds needed) |
| endTime | Time | NOT NULL | Must be > startTime; no midnight crossing |
| durationMinutes | Integer | NOT NULL | Calculated: (endTime − startTime) in minutes |
| description | String | nullable, max 500 chars | Optional work description |
| createdAt | DateTime | NOT NULL | |
| updatedAt | DateTime | NOT NULL | |
| deletedAt | DateTime | nullable | Soft delete |

**Validation rules**:
- `endTime > startTime` (server-enforced).
- `startTime` and `endTime` on the same calendar day (no midnight crossing).
- `startTime >= DailyReport.startTime` and `endTime <= DailyReport.endTime` — entry must be contained within the parent day's time window (server-enforced).
- Overlapping time ranges with other entries in the same `DailyReport` are **explicitly allowed**.
- `task` must be actively assigned to the `DailyReport.userId` at save time.
- Month lock is checked via the parent `DailyReport.reportDate`.

**Daily total rule**: `SUM(durationMinutes)` across all non-deleted entries for a `DailyReport` is compared against `WorkCalendarDay.standardHours × 60`. This comparison drives UI feedback (e.g., a progress bar) and does not hard-block submission.

---

### AbsenceReport

An absence record covering one or more consecutive calendar days.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| userId | UUID | FK → User, NOT NULL | |
| absenceType | Enum | NOT NULL | Values: `VACATION`, `SICK_LEAVE`, `MILITARY_RESERVE`, `OTHER` |
| startDate | Date | NOT NULL | Inclusive |
| endDate | Date | NOT NULL | Inclusive; must be ≥ startDate |
| isPartial | Boolean | NOT NULL, default false | True if absence covers part of the day only |
| partialDurationHours | Decimal | nullable | Hours absent for partial absences |
| calculatedAbsenceDays | Integer | NOT NULL | Server-calculated; excludes Fri/Sat |
| status | Enum | NOT NULL, default SUBMITTED | Values: `SUBMITTED`, `DOCUMENT_PENDING` |
| createdAt | DateTime | NOT NULL | |
| updatedAt | DateTime | NOT NULL | |

**Document rules**:
- `SICK_LEAVE` and `MILITARY_RESERVE` set status → `DOCUMENT_PENDING` until document uploaded.
- Document upload moves status → `SUBMITTED`.
- Document can be uploaded after `startDate` month is locked (documents arrive late).

---

### AbsenceDocument

A file uploaded to support an absence report.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| absenceReportId | UUID | FK → AbsenceReport, NOT NULL | |
| fileName | String | NOT NULL | Original file name |
| storagePath | String | NOT NULL | Server-side file path or object key |
| mimeType | String | NOT NULL | e.g., `application/pdf`, `image/jpeg` |
| uploadedBy | UUID | FK → User, NOT NULL | Usually the employee; may be admin |
| uploadedAt | DateTime | NOT NULL | |

---

### MonthLock

Records the lock state of a specific year-month.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| year | Integer | NOT NULL | e.g., 2026 |
| month | Integer | NOT NULL | 1–12 |
| isLocked | Boolean | NOT NULL, default false | |
| lockedBy | UUID | FK → User, nullable | Admin who locked |
| lockedAt | DateTime | nullable | |
| reopenedBy | UUID | FK → User, nullable | Admin who last reopened |
| reopenedAt | DateTime | nullable | |

**Constraints**: UNIQUE on `(year, month)`. Row is upserted when admin locks/unlocks.
**Query pattern**: Check `SELECT isLocked FROM MonthLock WHERE year=? AND month=?` on every
write to `DailyReport` / `AbsenceReport`. If no row exists, month is implicitly unlocked.

---

### AuditLog

An immutable log of every admin edit to a DailyReport, TimeReportEntry, or AbsenceReport.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| entityType | Enum | NOT NULL | Values: `DAILY_REPORT`, `TIME_ENTRY`, `ABSENCE_REPORT` |
| entityId | UUID | NOT NULL | ID of the edited record |
| action | Enum | NOT NULL | Values: `UPDATE`, `DELETE` |
| performedBy | UUID | FK → User, NOT NULL | Admin who made the change |
| targetUserId | UUID | FK → User, NOT NULL | Employee whose record was changed |
| oldValue | JSON | NOT NULL | Snapshot of the record before change |
| newValue | JSON | NOT NULL | Snapshot of the record after change |
| createdAt | DateTime | NOT NULL | Write timestamp |

**Rules**: AuditLog records are insert-only; they are never updated or deleted.

---

### WorkCalendarDay

Defines the working standard for each calendar date (holidays, shortened days, etc.).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | |
| date | Date | UNIQUE, NOT NULL | The specific calendar date |
| dayType | Enum | NOT NULL | Values: `REGULAR`, `WEEKEND`, `HOLIDAY`, `SPECIAL` |
| isWorkingDay | Boolean | NOT NULL | False for weekends and holidays |
| standardHours | Decimal | NOT NULL, default 9.0 | Expected work hours (may be 0 for holidays) |
| description | String | nullable | e.g., "Rosh Hashana", "Election Day" |

**Seeding**: Application seeds all Fridays and Saturdays for the current and upcoming year as
`WEEKEND` / `isWorkingDay=false`. Admin can add holidays manually.

---

## Indexes

```sql
-- All day reports for a user in a month (most common query)
CREATE INDEX idx_daily_report_user_month ON DailyReport (userId, reportDate);

-- All entries for a given day report
CREATE INDEX idx_time_entry_daily_report ON TimeReportEntry (dailyReportId) WHERE deletedAt IS NULL;

-- Cross-user query: all entries for a task (admin views)
CREATE INDEX idx_time_entry_task ON TimeReportEntry (taskId);

-- Assigned tasks lookup for dropdown population
CREATE INDEX idx_task_assignment_user ON TaskAssignment (userId, taskId);

-- Month lock lookup
CREATE UNIQUE INDEX idx_month_lock_year_month ON MonthLock (year, month);
```

> The former "overlap detection" index on `(userId, reportDate)` for `TimeReport` is intentionally
> omitted — overlapping entries within a day are a supported product behavior.
