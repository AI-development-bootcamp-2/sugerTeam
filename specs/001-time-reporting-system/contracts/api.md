# REST API Contracts: Time Reporting System

**Phase**: 1 | **Date**: 2026-05-06 | **Plan**: [../plan.md](../plan.md)

Base URL: `/api/v1`
Auth header: `Authorization: Bearer <access_token>`
Content-Type: `application/json` (unless noted as multipart)

HTTP status conventions:
- `200` OK | `201` Created | `204` No Content
- `400` Bad Request (validation) | `401` Unauthenticated | `403` Forbidden (role)
- `404` Not Found | `409` Conflict | `422` Unprocessable (business rule violation)
- `423` Locked (month is closed) | `500` Server Error

---

## Authentication — `/auth`

### POST /auth/login
Login with email and password.

**Request**
```json
{ "email": "user@company.com", "password": "Secret123!" }
```

**Response 200**
```json
{
  "accessToken": "<jwt>",
  "user": { "id": "uuid", "fullName": "Alice Cohen", "role": "EMPLOYEE" }
}
```
Refresh token set as `refreshToken` httpOnly cookie (30d TTL).

**Errors**: `401` invalid credentials | `401` inactive user

---

### POST /auth/refresh
Exchange refresh cookie for new token pair. Returns `200` same shape as login. New httpOnly cookie set.

**Errors**: `401` missing/invalid/expired cookie

---

### POST /auth/logout
Clear refresh token cookie. `204` No Content.

---

## Users — `/users` *(Admin only for writes)*

### GET /users
List all users. **Query params**: `role`, `isActive` (boolean), `search` (name/email substring).

**Response 200**
```json
[{ "id": "uuid", "fullName": "Alice", "email": "alice@co.com", "role": "EMPLOYEE", "isActive": true }]
```

### POST /users *(Admin)*
```json
{ "fullName": "Bob Levi", "email": "bob@co.com", "password": "Init1234!", "role": "EMPLOYEE" }
```
**Response 201** — user object (no passwordHash). **Errors**: `409` email exists.

### PATCH /users/:id *(Admin)*
Partial update of name, email, or role. **Response 200** updated user.

### PATCH /users/:id/deactivate *(Admin)*
Soft-deactivate. Sets `isActive = false`. **Response 200**.

### PATCH /users/:id/activate *(Admin)*
Re-activate user. **Response 200**.

### GET /users/managers *(Admin)*
Active users eligible as primary project manager (role TEAM_LEAD or ADMIN, status ACTIVE).

**Response 200**
```json
[{ "id": "uuid", "fullName": "Dana Levi", "role": "TEAM_LEAD" }]
```

---

## Clients — `/clients`

### GET /clients/active
Active clients for report dropdowns.
```json
[{ "id": "uuid", "name": "Acme Corp" }]
```

### GET /clients *(Admin)*
All clients including inactive.

### POST /clients *(Admin)*
```json
{ "name": "New Client", "description": "Optional notes" }
```
`description` is optional, max 500 chars. **Response 201** — full client object.

### PATCH /clients/:id *(Admin)*
```json
{ "name": "Renamed", "description": "Updated notes", "isActive": false }
```
All fields optional. **Response 200** — updated client object.

---

## Projects — `/projects`

### GET /projects/active?clientId=
Active projects for a client (cascading dropdown).

### GET /projects *(Admin)*
All projects including inactive.

### POST /projects *(Admin)*
```json
{
  "clientId": "uuid",
  "name": "Website Redesign",
  "description": "Optional project notes",
  "primaryManagerId": "uuid",
  "startDate": "2026-06-01",
  "endDate": "2026-12-31"
}
```
`description`, `primaryManagerId`, `startDate`, `endDate` are all optional. `endDate` must be ≥ `startDate` if both provided (FR-044). **Response 201** — full project object including `primaryManager: { id, fullName, role }`.

### PATCH /projects/:id *(Admin)*
```json
{
  "name": "Updated",
  "description": "Updated notes",
  "primaryManagerId": "uuid",
  "startDate": "2026-06-01",
  "endDate": "2026-12-31",
  "isActive": false
}
```
All fields optional. **Errors**: `400` endDate < startDate | `404` primaryManagerId not found or not a manager.

---

## Tasks — `/tasks`

### GET /tasks/my-assigned
Tasks actively assigned to the current user, with parent project + client.
```json
[{
  "id": "uuid", "name": "Frontend Dev",
  "project": { "id": "uuid", "name": "Website", "client": { "id": "uuid", "name": "Acme" } }
}]
```

### GET /tasks/active?projectId= *(Admin + TeamLead)*
Active tasks for a project.

### POST /tasks *(Admin)*
```json
{
  "projectId": "uuid",
  "name": "Backend API",
  "description": "Optional task notes",
  "startDate": "2026-06-01",
  "endDate": "2026-09-30"
}
```
`description`, `startDate`, `endDate` are optional. `endDate` must be ≥ `startDate` if both provided (FR-044). **Response 201** — full task object.

### PATCH /tasks/:id *(Admin)*
```json
{
  "name": "Updated",
  "description": "Updated notes",
  "startDate": "2026-06-01",
  "endDate": "2026-09-30",
  "isActive": false
}
```
All fields optional. **Errors**: `400` endDate < startDate.

---

## Task Assignments — `/assignments` *(Admin + TeamLead)*

### POST /assignments
```json
{ "userId": "uuid", "taskId": "uuid" }
```
**Response 201** | **Errors**: `409` already assigned

### DELETE /assignments/:id
Remove assignment. Historical reports unaffected. **Response 204**

### GET /assignments?taskId=
List all assignments for a task.

---

## Time Reports — `/reports`

### POST /reports
Submit a time report (or save as draft).

**Request**
```json
{
  "date": "2026-05-06",
  "workLocation": "OFFICE",
  "startTime": "08:00",
  "endTime": "17:00",
  "taskId": "uuid",
  "description": "Implemented login feature",
  "isDraft": false
}
```
`clientId` and `projectId` resolved server-side from `taskId`.

**Response 201**
```json
{
  "id": "uuid", "userId": "uuid", "date": "2026-05-06",
  "workLocation": "OFFICE", "startTime": "08:00", "endTime": "17:00",
  "durationMinutes": 540, "taskId": "uuid", "clientId": "uuid", "projectId": "uuid",
  "description": "Implemented login feature", "isDraft": false
}
```

**Errors**:
- `400` missing required field
- `422` endTime ≤ startTime
- `422` midnight crossing
- `422` time overlap with existing report for same user + date
- `422` task not assigned to user or task inactive
- `423` month is locked

---

### PUT /reports/draft
Upsert draft for current user + date. Cleared on final submit. **Response 200/201**.

### GET /reports?userId=&date=
All non-draft reports for a user on a date.

### GET /reports/:id
Single report.

### PATCH /reports/:id
Edit report. Same validation as POST. **Errors**: `423` month locked (non-admin) | `403` editing another user's report.

### DELETE /reports/:id
Soft-delete. **Response 204** | **Errors**: `423` month locked (non-admin)

---

### GET /reports/monthly-status?userId=&year=&month=
Per-day status for the monthly calendar view.

**Response 200**
```json
{
  "year": 2026, "month": 5, "isLocked": false,
  "days": [
    { "date": "2026-05-01", "status": "COMPLETE", "totalMinutes": 540, "isWorkingDay": true },
    { "date": "2026-05-02", "status": "MISSING", "totalMinutes": 0, "isWorkingDay": true },
    { "date": "2026-05-03", "status": "NON_WORKING", "totalMinutes": 0, "isWorkingDay": false },
    { "date": "2026-05-04", "status": "EXCEPTIONAL", "totalMinutes": 300, "isWorkingDay": true }
  ]
}
```

Status rules:
- `NON_WORKING` — Friday, Saturday, or `WorkCalendarDay.isWorkingDay = false`
- `COMPLETE` — total minutes ≥ `standardHours × 60`, or valid absence covers the day
- `EXCEPTIONAL` — working day with reports but total ≠ standard
- `MISSING` — working day in the past with no report and no absence

---

## Absences — `/absences`

### POST /absences
```json
{
  "absenceType": "SICK_LEAVE",
  "startDate": "2026-05-10",
  "endDate": "2026-05-12",
  "isPartial": false
}
```

**Response 201**
```json
{
  "id": "uuid", "absenceType": "SICK_LEAVE",
  "startDate": "2026-05-10", "endDate": "2026-05-12",
  "calculatedAbsenceDays": 3,
  "documentRequired": true, "isPartial": false
}
```
**Errors**: `422` startDate > endDate | `423` month locked

### PATCH /absences/:id
Edit absence. **Errors**: `423` month locked

### DELETE /absences/:id
Soft-delete. **Response 204**

### GET /absences?userId=&year=&month=
List absences for a user in a month.

---

### POST /absences/:id/document
Upload supporting document. `Content-Type: multipart/form-data`, field name: `file`.

**Response 200**
```json
{ "id": "uuid", "fileName": "cert.pdf", "mimeType": "application/pdf", "uploadedAt": "2026-05-13T10:00:00Z" }
```
*Upload is allowed even when the month is locked (FR-025).*

### DELETE /absences/:id/document
Remove document. **Response 204**

---

## Timer — `/timer`

### POST /timer/start
Start workday timer for current user.
**Response 201** `{ "startedAt": "2026-05-06T08:00:00Z" }`
**Errors**: `409` timer already active

### GET /timer/status
**Response 200** `{ "isActive": true, "startedAt": "...", "elapsedSeconds": 3600 }`

### POST /timer/stop
Stop active timer. Returns pre-fill data for report form:
```json
{ "date": "2026-05-06", "startTime": "08:00", "endTime": "17:00", "durationMinutes": 540 }
```
**Errors**: `404` no active timer

---

## Month Closure — `/months` *(Admin only)*

### GET /months
```json
[{ "year": 2026, "month": 4, "isLocked": true, "lockedAt": "2026-05-01T09:00:00Z", "lockedBy": "uuid" }]
```

### POST /months/:year/:month/lock
**Response 200** `{ "year": 2026, "month": 5, "isLocked": true, "lockedAt": "..." }`

### POST /months/:year/:month/unlock
**Response 200** `{ "year": 2026, "month": 5, "isLocked": false, "unlockedAt": "..." }`

---

## Audit Log — `/audit-logs` *(Admin only)*

### GET /audit-logs?employeeId=&year=&month=
```json
[{
  "id": "uuid", "entityType": "TIME_REPORT", "entityId": "uuid", "action": "UPDATE",
  "performedBy": { "id": "uuid", "fullName": "Admin Name" },
  "targetUserId": "uuid",
  "oldValue": { "description": "old" }, "newValue": { "description": "new" },
  "createdAt": "2026-05-06T13:00:00Z"
}]
```
