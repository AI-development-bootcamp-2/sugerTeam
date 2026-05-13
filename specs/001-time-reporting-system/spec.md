# Feature Specification: Time Reporting System

**Feature Branch**: `001-time-reporting-system`
**Created**: 2026-05-06
**Status**: Draft
**Input**: Full product and technical specification — Time Reporting System v1.0

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Employee Submits Daily Work Report (Priority: P1)

An employee logs in and lands on the daily reporting screen. They select the date (default: today),
choose their work location, enter start and end times, select a client/project/task from their
assigned options, write a description, and save the report. The system displays a progress indicator
showing how many hours have been reported against the 9-hour daily standard. The employee can add
multiple reports for the same day to cover different tasks or clients.

**Why this priority**: This is the core daily action every employee performs. All other features
are secondary to making this workflow fast and reliable.

**Independent Test**: A single employee with one assigned task can log in, submit a work report,
and see it reflected in the daily total and monthly view — without any other features being active.

**Acceptance Scenarios**:

1. **Given** an employee with at least one assigned task logs in,
   **When** they complete all required report fields and click Save,
   **Then** the report is saved, a success confirmation is shown, and the daily total updates.

2. **Given** an employee submits a second report for the same day,
   **When** the time range of the new report overlaps with an existing report,
   **Then** the system rejects the save and displays a clear overlap error message.

3. **Given** an employee enters an end time earlier than the start time,
   **When** they attempt to save,
   **Then** the system displays a validation error and does not save the report.

4. **Given** an employee's total reported hours for the day are below 9 hours,
   **When** they view the daily screen,
   **Then** the system displays a warning indicating incomplete daily hours (non-blocking).

5. **Given** an employee has only one assigned task,
   **When** they open the report form,
   **Then** the client, project, and task fields are pre-selected automatically.

6. **Given** the reporting month is locked by an admin,
   **When** the employee attempts to save a report for that month,
   **Then** the system rejects the action and displays a clear locked-month message.

---

### User Story 2 — Employee Reports an Absence (Priority: P2)

An employee reports an absence for a single day or a date range. They select the absence type
(Vacation, Sick Leave, Military Reserve Duty, or Other). The system excludes Fridays and Saturdays
from the calculated absence days. For partial absences (e.g., half-day), the employee is required
to also submit a work report covering the remaining hours. For sick leave and military reserve duty,
the system indicates that a supporting document is required. The employee may upload the document
later (after the report is saved) because certificates are often received after the fact.

**Why this priority**: Absence reporting is a parallel daily obligation alongside work-hour
reporting. Missing absence records creates the same compliance gaps as missing work reports.

**Independent Test**: An employee can submit a single sick-leave absence report for today,
receive a document-required notice, and later upload a medical certificate — independently of any
work-hour reporting.

**Acceptance Scenarios**:

1. **Given** an employee selects "Sick Leave" as the absence type and a date range,
   **When** they submit the report,
   **Then** the report is saved and a notice indicates that a medical certificate is required.

2. **Given** an employee reports absence for a range that includes Friday and Saturday,
   **When** the system calculates absence days,
   **Then** Friday and Saturday are excluded from the count.

3. **Given** an employee marks an absence as partial,
   **When** they submit the absence report,
   **Then** the system prompts them to also submit a work report for the remaining hours of the day.

4. **Given** an absence report exists that requires a document,
   **When** the employee uploads a file to that report,
   **Then** the upload succeeds and the document is attached to the absence record.

5. **Given** the reporting month is locked,
   **When** an employee attempts to edit an absence report from that month,
   **Then** the system rejects the edit and displays a locked-month message.

---

### User Story 3 — Employee Views Monthly Reporting Status (Priority: P3)

An employee opens the monthly view to see their reporting completeness for the current or a past
month. A calendar displays each day with a status indicator: Complete, Missing, or Exceptional.
A list below the calendar shows the detail of each submitted report. The employee can click any
report to edit it, provided the month is still open.

**Why this priority**: Visibility into reporting completeness motivates employees to fill gaps
before the month is locked and creates accountability without requiring manager follow-up.

**Independent Test**: An employee who has submitted at least one report can open the monthly view,
see a calendar with statuses, and view the details of each submitted report — without needing any
admin functionality to be in place.

**Acceptance Scenarios**:

1. **Given** an employee has reports on some days and gaps on others,
   **When** they open the monthly view,
   **Then** completed days show a Complete indicator, days with no report show Missing, and days
   with unusual hours show Exceptional.

2. **Given** the employee clicks a report entry in the monthly list,
   **When** the month is still open,
   **Then** the report opens in an editable form.

3. **Given** the employee clicks a report entry,
   **When** the month is locked,
   **Then** the report opens in read-only mode with a locked-month indicator.

---

### User Story 4 — Timer-Based Workday Start and End (Priority: P4)

An employee can start a workday timer when they begin work. The timer is stored on the server so
it persists across browser refreshes and device changes. When the employee ends their workday, they
click End, review a completion form pre-populated with start/end times, select the task details,
add a description, and save the report. Breaks are included in the reported duration — no automatic
deduction is applied.

**Why this priority**: The timer provides a convenient alternative to manual time entry for
employees who prefer to track time as it happens. It depends on the core time report form (P1)
being in place.

**Independent Test**: An employee clicks Start, closes the browser, reopens the app, confirms the
timer is still active, clicks End, and successfully saves a complete report — independently of the
monthly view or admin features.

**Acceptance Scenarios**:

1. **Given** an employee clicks Start,
   **When** the timer is active and they close and reopen the browser,
   **Then** the timer is still shown as running with the original start time.

2. **Given** an active timer,
   **When** the employee clicks End,
   **Then** a completion form opens pre-populated with the recorded start and end times.

3. **Given** the employee completes the timer form and saves,
   **Then** the report is saved and the active timer is cleared.

---

### User Story 5 — Team Lead Assigns Employees to Tasks (Priority: P5)

A team lead assigns one or more employees to a task. Once assigned, those employees see the task
(and its parent project and client) in their reporting dropdowns. Removing an assignment removes
the task from future report dropdowns but does not affect historical reports.

**Why this priority**: Task assignments are the prerequisite for employees to be able to report
work — without an assignment, an employee has no tasks to report against.

**Independent Test**: A team lead assigns an employee to a task. The employee then logs in and
sees that client/project/task in their report form dropdown.

**Acceptance Scenarios**:

1. **Given** a team lead assigns Employee A to Task T,
   **When** Employee A opens the report form,
   **Then** Task T and its parent project and client appear in the dropdowns.

2. **Given** a team lead removes Employee A's assignment from Task T,
   **When** Employee A opens the report form,
   **Then** Task T no longer appears in the dropdowns, but previous reports referencing Task T remain valid.

---

### User Story 6 — Admin Manages System Entities (Priority: P6)

An admin creates and manages the entity hierarchy: users, clients, projects, tasks, and
assignments. Deactivating any entity soft-deletes it — historical reports linked to it remain
visible and valid, but the entity no longer appears as a selectable option in new reports.
Admin also views and can edit any employee's reports, with every change recorded in an audit log.

**Why this priority**: The entire reporting structure (clients, projects, tasks, assignments) must
be in place before employees can report. Admin management is foundational infrastructure.

**Independent Test**: An admin creates a client, a project linked to that client, a task linked
to that project, a user, and assigns the user to the task. The user then logs in and sees the
task in their report form.

**Acceptance Scenarios**:

1. **Given** an admin creates a user with a role and initial password,
   **When** that user attempts to log in with those credentials,
   **Then** login succeeds and the user sees the interface appropriate to their role.

2. **Given** an admin deactivates a client,
   **When** an employee opens the report form,
   **Then** that client no longer appears in the client dropdown.

3. **Given** an admin deactivates a client that appears in historical reports,
   **When** an employee views those historical reports,
   **Then** the reports remain visible and reference the deactivated client correctly.

4. **Given** an admin edits an employee's report,
   **When** the edit is saved,
   **Then** an audit log entry is created recording the editor, the employee, the timestamp, and
   the before/after values.

5. **Given** an admin attempts to delete a user,
   **When** the deletion is confirmed,
   **Then** the user is deactivated (soft delete) and can no longer log in, but their reports remain.

---

### User Story 7 — Admin Locks and Reopens a Reporting Month (Priority: P7)

An admin locks a specific month to prevent further editing. All time and absence reports for that
month become read-only for all roles. The admin may reopen the month if corrections are needed,
after which editing resumes under normal permissions. All lock and reopen events are recorded.

**Why this priority**: Month closure is the mechanism that produces finalized, auditable records.
It depends on all reporting features being in place.

**Independent Test**: An admin locks the current month. An employee attempts to edit a report from
that month and is rejected with a locked-month message. The admin reopens the month. The employee
can now edit the same report.

**Acceptance Scenarios**:

1. **Given** an admin locks month M,
   **When** any user attempts to edit a report from month M,
   **Then** the edit is rejected and a clear locked-month message is shown.

2. **Given** a locked month M,
   **When** the admin reopens it,
   **Then** employees can edit their reports from month M again.

3. **Given** a month is locked,
   **When** the lock event is recorded,
   **Then** the system stores the locked month, the timestamp, and the admin who performed the action.

---

### Edge Cases

- What happens when an employee's only assigned task is deactivated mid-report? (System blocks
  save, shows error, asks user to select an active task.)
- What happens when a report crosses midnight? (Not supported in v1 — system must reject it with
  a clear message.)
- What happens when an absence date range is entirely on weekends? (System calculates zero
  absence days and should warn the user.)
- What happens when an admin tries to lock a month that has employees with missing reports? (Lock
  proceeds regardless — it is an admin decision, not automatically blocked.)
- What happens when an employee has no assigned tasks? (Report form shows empty dropdowns and
  prompts the user to contact their team lead or admin.)

---

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & Access**

- **FR-001**: The system MUST authenticate users via email and password. Email matching MUST be case-insensitive (normalized to lowercase).
- **FR-002**: User accounts MUST be created exclusively by an admin; self-registration is not permitted.
- **FR-003**: The system MUST enforce role-based access at every data boundary; client-side checks are supplementary only.
- **FR-004**: Inactive users MUST NOT be able to log in.
- **FR-005**: Passwords MUST be stored as hashed values; plain-text storage is prohibited.
- **FR-006**: Sessions MUST use token-based authentication with a 2-hour access token and a 1-month refresh token.

**Daily Time Reporting**

- **FR-007**: The system MUST require all of the following fields to save a time report: date, work location, start time, end time, client, project, task, work description.
- **FR-008**: Work location MUST be one of: Office, Client, Home.
- **FR-009**: The system MUST automatically calculate and display report duration from start and end times.
- **FR-010**: The system MUST reject reports where end time is earlier than start time.
- **FR-011**: Reports crossing midnight are not supported; the system MUST reject them with a clear message.
- **FR-012**: The system MUST reject a new report whose time range overlaps with an existing report for the same user on the same day.
- **FR-013**: Work description MUST NOT exceed 500 characters.
- **FR-014**: The system MUST display a non-blocking warning when daily reported hours are below or above 9 hours.
- **FR-015**: Client, project, and task dropdowns MUST show only entities for which the user has active assignments; a single available option MUST be auto-selected.
- **FR-016**: The system MUST support server-side draft saving so in-progress reports survive browser refresh and device changes.
- **FR-017**: Employees MUST be able to edit their own reports until the relevant month is locked.

**Timer**

- **FR-018**: The system MUST store timer state server-side so it persists across browser sessions and devices.
- **FR-019**: When the employee ends the timer, the system MUST pre-populate the report form with the recorded start and end times.
- **FR-020**: Only one active timer per user is allowed at a time.

**Absence Reporting**

- **FR-021**: The system MUST support the following fixed absence types: Vacation, Sick Leave, Military Reserve Duty, Other.
- **FR-022**: The system MUST exclude Fridays and Saturdays when calculating the number of absence days in a range.
- **FR-023**: The system MUST support partial-day absences; when reported, the employee MUST also submit a work report for the remaining hours.
- **FR-024**: Sick Leave absences MUST require a supporting document; Military Reserve Duty absences MUST require a supporting document.
- **FR-025**: The system MUST allow document upload after an absence report is saved (documents may arrive later).
- **FR-026**: The system MUST support a working-calendar model that defines standard hours and working/non-working status per day to handle holidays and shortened days.

**Monthly View**

- **FR-027**: The monthly view MUST display a calendar with per-day status indicators: Complete, Missing, or Exceptional.
- **FR-028**: The monthly view MUST list all reports for the selected month with full detail.
- **FR-029**: Employees MUST be able to edit a report directly from the monthly view if the month is open.

**Admin — Entity Management**

- **FR-030**: Admins MUST be able to create, edit, and deactivate users with roles: Employee, Team Lead, Admin.
- **FR-031**: Admins MUST be able to create, edit, and deactivate clients, projects, and tasks. Create and edit share a single modal component per entity; edit pre-fills all fields from the selected row. The Projects and Tasks admin tables load all entities on page mount (unfiltered); parent pickers (client, project) narrow the displayed rows but are not required before the table renders.
- **FR-032**: All entity deletions MUST be soft-deletes; no data is physically removed. A confirmation dialog MUST be shown only before the trash-icon deactivation action; other mutations execute immediately.
- **FR-033**: Deactivated entities MUST NOT appear in new-report dropdowns but MUST remain referenced in historical reports.
- **FR-034**: Admins and team leads MUST be able to assign employees to tasks. Assignment controls which tasks appear in the employee's report form.
- **FR-035**: Admins MUST be able to view and edit any employee's reports. Every admin edit MUST be recorded in an audit log with: report ID, editor ID, employee ID, timestamp, previous values, new values.

**Month Closure**

- **FR-036**: Admins MUST be able to lock a specific month, making all reports for that month read-only for non-admin roles.
- **FR-037**: Admins MUST be able to reopen a locked month.
- **FR-038**: The system MUST record: locked month, lock/reopen timestamp, admin who performed the action.

**UI & Accessibility**

- **FR-039**: The UI language MUST be Hebrew with full RTL layout support. Inline form validation error messages are written by the implementer in standard Hebrew (e.g., "שדה חובה"); no centralized string file is required.
- **FR-040**: The application MUST be usable on mobile, tablet, and desktop browsers (Chrome, Edge, Safari) with a mobile-first responsive design.
- **FR-041**: The system MUST provide clear user feedback for: successful save, validation errors, locked-month restrictions, inactive entity selections, authentication errors, and file upload status.

### Key Entities

- **User**: A person who can log in. Has a role (Employee, Team Lead, Admin) and an active/inactive status. Historical data is preserved on deactivation.
- **Client**: An organization for which work is performed. Has active/inactive status; inactive clients are excluded from new-report dropdowns.
- **Project**: Belongs to a client. Has active/inactive status. Contains tasks.
- **Task**: Belongs to a project. Has open/closed status. The unit of work an employee reports time against.
- **TaskAssignment**: Links a user to a task, granting the user the ability to report time against it. Managed by team leads and admins.
- **TimeReport**: A single work-hour record for a user covering a specific date and time range, linked to a task. Supports draft state.
- **AbsenceReport**: A record of one or more absence days for a user. Linked to an absence type. Supports partial-day flag.
- **AbsenceDocument**: A file attached to an absence report (e.g., medical certificate). May be uploaded after the absence report is created.
- **MonthLock**: A record of the locked/unlocked state for a specific year-month, including who performed each action and when.
- **AuditLog**: A record of every admin edit to an employee report, capturing before/after values.
- **WorkCalendarDay**: Defines the working standard (hours, working/non-working, day type) for each calendar date, enabling holiday and partial-day handling.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An employee with at least one assigned task can complete and submit a daily work report in under 2 minutes on a mobile browser.
- **SC-002**: 100% of submitted reports are linked to a valid client, project, and task — free-form or unlinked entries are not possible.
- **SC-003**: The monthly calendar view clearly indicates which days are Complete, Missing, or Exceptional — employees can identify reporting gaps without contacting a manager.
- **SC-004**: Absence reports correctly exclude weekends (Friday and Saturday) from calculated absence day counts in all tested date ranges.
- **SC-005**: Time reports for a locked month cannot be edited by non-admin roles; an attempt to edit one is rejected 100% of the time.
- **SC-006**: Historical reports remain accessible and correctly reference their original client, project, and task after those entities are deactivated.
- **SC-007**: Admin audit logs record every change to an employee report within 1 second of the edit being saved.
- **SC-008**: The application is fully functional on a mobile browser without horizontal scrolling or unusable UI elements.
- **SC-009**: An admin can lock and reopen a month, and the status change is reflected immediately to all active users.
- **SC-010**: The system correctly prevents saving a report when any required field is empty — no partial data reaches persistent storage.

---

## Assumptions

- The work week is Sunday through Thursday; Friday and Saturday are weekend days for absence calculations.
- The daily working standard is 9 hours. Deviations above or below this threshold trigger a warning, not a blocking error.
- All users are internal company employees; there are no external or guest accounts.
- The system operates in Hebrew only; no multi-language support is required in v1.
- Break time during the workday is included in the reported duration — no automatic deduction is applied.
- Reports that cross midnight are not supported; employees must split overnight shifts into two separate daily reports (future consideration).
- Vacation and sick day balance tracking (quotas, accrual) are out of scope for v1.
- There is no self-service password reset; admin performs all password resets.
- The system does not calculate payroll; it is a data collection tool only.
- Document upload for absence records supports standard file types (PDF, images); maximum file size is implementation-defined but should be practical for mobile upload.
- Team leads cannot edit other employees' reports; this is an admin-only capability in v1.
- There is no approval workflow for reports; reports are submitted directly without a manager review step.
- The exact closure date of a reporting month is not automatically enforced; admins manually lock months at their discretion.
- Production deployments MUST run behind HTTPS; the refresh token cookie requires the `secure` flag and must not travel over plain HTTP.

---

## Clarifications

### Session 2026-05-10

- Q: Should user email matching be case-insensitive? → A: Yes — normalize email to lowercase on every login lookup (RFC-compliant; prevents "account not found" errors from casing mismatches).
- Q: Is HTTPS required in production? → A: Yes — production deployments must run behind HTTPS; the refresh token cookie carries the `secure` flag and must not be transmitted over plain HTTP.

### Session 2026-05-12

- Q: Does Stage 2 admin modal support edit as well as create? → A: Yes — the same modal component handles both create (empty fields) and edit (pre-filled from row action); existing `PATCH /:id` endpoints serve edit saves.
- Q: What does the Projects/Tasks table show before a parent filter is selected? → A: Full unfiltered list — all entities load on page mount regardless of whether a client/project picker has a value.
- Q: Which actions require a ConfirmDialog before executing? → A: Trash icon (soft-deactivate) only — all other actions (create, edit, filter) execute immediately without a confirmation step.
- Q: Should new service functions have unit tests or only route integration tests? → A: Route-level integration tests only — `projects.routes.test.ts` and `tasks.routes.test.ts`; no new service-level test files required.
- Q: Are specific Hebrew error message strings provided for RHF validation? → A: No — implementer writes standard Hebrew inline messages (e.g., "שדה חובה", "תאריך סיום חייב להיות אחרי תאריך התחלה"); no centralized string file required.
