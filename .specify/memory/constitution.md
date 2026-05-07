<!--
SYNC IMPACT REPORT
==================
Version change: [TEMPLATE] → 1.0.0 (initial ratification — all placeholders resolved)

Principles added (template extended from 5 to 7 to match user-defined principles):
  - [PRINCIPLE_1_NAME] → I. Simple Daily Reporting
  - [PRINCIPLE_2_NAME] → II. Clear Work Structure
  - [PRINCIPLE_3_NAME] → III. Reliable and Organized Data
  - [PRINCIPLE_4_NAME] → IV. Role-Based Access
  - [PRINCIPLE_5_NAME] → V. Monthly Closure
  - [PRINCIPLE_6_NAME] → VI. Absence Reporting  (template slot added)
  - [PRINCIPLE_7_NAME] → VII. Transparency       (template slot added)

Sections resolved:
  - [SECTION_2_NAME] → User Role Definitions
  - [SECTION_3_NAME] → Success Criteria

Added: Governance section fully defined.
Removed: None.

Templates checked:
  - .specify/templates/plan-template.md  ✅ aligned (Constitution Check block present; gates derive from principles)
  - .specify/templates/spec-template.md  ✅ aligned (role-based user stories and acceptance scenarios supported)
  - .specify/templates/tasks-template.md ✅ aligned (phase structure supports role separation + monthly closure)

Deferred TODOs: None — all placeholders resolved.
-->

# Time Reporting System Constitution

## Core Principles

### I. Simple Daily Reporting

The reporting experience MUST be fast and require minimal steps. An employee MUST be able to open
the system, select the required fields, and submit a daily work report in a single focused flow.
The reporting screen MUST surface completion status clearly: what has been submitted, what is still
missing, and whether the current day's report is complete or still open.

**Rationale**: If daily reporting is cumbersome, employees revert to informal methods, which
defeats the system's core purpose of replacing unstructured reporting with a single consistent
workflow.

### II. Clear Work Structure

Every work-hour report entry MUST be linked to a three-level hierarchy: **Client → Project → Task**.
Submitting a report without a valid task reference MUST NOT be permitted. This structure MUST be
enforced consistently across all views, exports, and any integrations.

**Rationale**: Granular attribution to client, project, and task is the foundation for
organizational visibility into how working time is allocated. Flat or free-form entries cannot
produce reliable aggregations for management reporting or client billing.

### III. Reliable and Organized Data

Historical data MUST be preserved even when the entities it references (users, clients, projects,
tasks) are deactivated or removed from active use. Deactivating an entity MUST NOT delete or
invalidate reports that reference it. Deactivated entities MUST remain visible in historical
context but MUST NOT appear as selectable options for new reports.

**Rationale**: Time reporting records underpin billing, payroll, and audit processes. Silent data
loss or invalidation of historical records is unacceptable. The system must be a trustworthy
long-term archive, not just a current-state view.

### IV. Role-Based Access

The system MUST enforce three roles with strictly bounded, non-overlapping write permissions:

- **Employee**: MUST manage only their own daily work reports and absence reports.
- **Team Lead**: MUST be able to do everything an Employee can, plus assign employees to tasks.
- **Admin**: MUST have full system management rights — users, clients, projects, tasks,
  assignments, employee report viewing and editing, and monthly period control.

Role enforcement MUST occur server-side at every API boundary. Client-side checks are additive
only. Users MUST NOT be able to self-assign or escalate their own role.

**Rationale**: Mixing role capabilities creates compliance and data integrity risks. Clear
boundaries also reduce cognitive load: each role sees only what is relevant to their work.

### V. Monthly Closure

The system MUST support explicit monthly reporting periods with a defined open/closed lifecycle.
An Admin MUST be able to close a month, making all reports for that period read-only for all
non-admin roles. An Admin MUST also be able to reopen a closed month if corrections are required.
The system MUST communicate the open/closed status of the current period clearly to all users.

**Rationale**: Monthly closure creates a definitive, auditable record. Without it, reports remain
perpetually editable, making it impossible to finalize payroll or client billing figures with
confidence.

### VI. Absence Reporting

Absence reporting MUST be a first-class feature, available alongside work-hour reporting in the
same daily workflow. The system MUST support at minimum the following absence types: Vacation,
Sick Leave, Military Reserve Duty, and Other. The system MUST support marking specific absence
types as requiring supporting documents. Absence entries MUST be subject to the same monthly
closure rules as work-hour reports.

**Rationale**: Absence tracking is a core HR and compliance function. Handling it outside the
system or treating it as secondary reintroduces the manual-process problem this project is
designed to eliminate.

### VII. Transparency

Employees MUST be able to view their own complete reporting history and current-month status at
any time. Admins MUST be able to view all employee reports and identify employees with missing
or exceptional entries. The system MUST surface reporting gaps — working days within an open
month that have no report — in a visible, actionable format.

**Rationale**: Visibility is what motivates timely and complete reporting. A system that hides
status forces managers to chase employees manually, which is exactly the behavior this project
replaces.

## User Role Definitions

The system recognizes three roles. Permissions are cumulative: Team Lead inherits all Employee
capabilities; Admin has unrestricted access.

| Role | Own Reports | Assign Employees | System Administration |
|------|-------------|------------------|-----------------------|
| **Employee** | Submit, view, edit (open months only) | — | — |
| **Team Lead** | Submit, view, edit (open months only) | Assign to tasks | — |
| **Admin** | View and edit all employee reports | Assign users to tasks | Users, clients, projects, tasks, month close/reopen |

Role assignment MUST be performed exclusively by an Admin. No self-assignment of elevated roles
is permitted at any time.

## Success Criteria

The project is considered successful when all of the following are true:

- Employees can submit daily work-hour reports linked to a client, project, and task.
- Employees can submit absence reports using defined, admin-managed absence types.
- Multiple work-hour entries for the same day are supported (e.g., time split across tasks).
- Employees can view and edit their own reports while the reporting month is open.
- Team leads can assign employees to tasks.
- Admins can create and manage users, clients, projects, tasks, and assignments.
- Admins can close and reopen monthly reporting periods.
- Historical reports remain accessible and intact after entities are deactivated.
- Each user sees only the data and actions permitted by their role.
- The application is fully functional on mobile devices as the primary interaction surface.
- The daily reporting workflow is simple enough for regular use without requiring training.

## Governance

This constitution supersedes all other development conventions, practices, and informal agreements
for the Time Reporting System project. In cases of conflict, the constitution governs.

**Amendment Procedure**:
1. Propose the amendment in writing, identifying the principle or section affected and the reason.
2. Obtain review and acknowledgement from at least one other project stakeholder.
3. Increment `CONSTITUTION_VERSION` per the versioning policy below.
4. Set `LAST_AMENDED_DATE` to the date the amendment is ratified.
5. Propagate changes to all affected templates (plan-template.md, spec-template.md,
   tasks-template.md) and update the Sync Impact Report comment at the top of this file.

**Versioning Policy**:
- **MAJOR**: A principle is removed, fundamentally redefined, or a non-backward-compatible
  governance rule is introduced.
- **MINOR**: A new principle or mandatory section is added, or existing guidance is materially
  expanded.
- **PATCH**: Clarifications, wording improvements, or typo fixes with no semantic change.

**Compliance Review**: Every feature specification (spec.md) and implementation plan (plan.md)
MUST include a Constitution Check section confirming alignment with all Core Principles before
implementation begins. Any deviation from a principle MUST be documented and justified in the
plan's Complexity Tracking table. All pull requests MUST be reviewed for constitutional compliance.

**Version**: 1.0.0 | **Ratified**: 2026-05-06 | **Last Amended**: 2026-05-06
