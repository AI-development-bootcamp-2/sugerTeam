# Research: Time Reporting System

**Phase**: 0 — Pre-Design Research
**Feature**: Time Reporting System
**Date**: 2026-05-06

---

## Technology Stack Decisions

### Backend Framework

**Decision**: Express.js on Node.js  
**Rationale**: Most familiar REST framework for Node.js; minimal boilerplate; large ecosystem;
well-documented for JWT auth and middleware chains. Suitable for a course project where
team members need to ramp up quickly.  
**Alternatives considered**:
- Fastify — faster performance but smaller community for beginners
- NestJS — structured but high learning curve for a course project

---

### ORM / Database Layer

**Decision**: Prisma  
**Rationale**: Prisma generates TypeScript types from the schema, provides a migration CLI, and
produces readable query syntax. The schema file serves as live documentation of the data model.
`deletedAt` soft-delete fields integrate cleanly with Prisma middleware.  
**Alternatives considered**:
- Sequelize — older API, weaker TypeScript support
- Knex (raw query builder) — too low-level for a course project; more error-prone

---

### Authentication

**Decision**: JWT with access token (2h) stored in memory / Authorization header + refresh token
(30d) stored in an HTTP-only cookie.  
**Rationale**: Matches the spec requirement. HTTP-only cookie for refresh token prevents XSS theft.
Access token in memory (not localStorage) prevents CSRF theft. Standard for SPAs.  
**Alternatives considered**:
- Session-based (server-side sessions) — simpler but requires sticky sessions or Redis for
  multi-instance deployments; overkill for this scale
- Auth libraries (Passport.js) — adds abstraction that obscures learning opportunity

---

### Password Hashing

**Decision**: bcrypt with cost factor 12  
**Rationale**: Industry standard for password hashing. Built-in salt. Node.js `bcrypt` package
is battle-tested. Cost factor 12 is a good balance between security and speed for small teams.  
**Alternatives considered**:
- argon2 — more secure but less familiar; bcrypt is sufficient for this scale

---

### Frontend Framework & Routing

**Decision**: React with Vite build tool + React Router v6  
**Rationale**: React is required by spec. Vite provides fast HMR and modern build pipeline.
React Router v6 has clean nested route syntax that maps well to the role-based navigation model.  
**Alternatives considered**:
- Next.js — SSR not needed; adds complexity without benefit for this SPA

---

### Frontend State Management

**Decision**: React Query (TanStack Query) for server state + Zustand for UI/auth state  
**Rationale**: React Query handles caching, re-fetching, and loading/error states for API data,
eliminating manual useEffect patterns. Zustand is lightweight for auth state (current user,
token). Together they avoid the boilerplate overhead of Redux.  
**Alternatives considered**:
- Redux Toolkit — feature-complete but verbose for a project of this scope
- React Context + useReducer — sufficient but leads to prop-drilling and re-render issues at
  this feature count

---

### RTL and Internationalization

**Decision**: HTML `dir="rtl"` attribute on root + CSS logical properties + Tailwind CSS with
RTL variant or Material UI with RTL theme  
**Rationale**: The system is Hebrew-only. Setting `dir="rtl"` at the root ensures all browser
defaults flip correctly. Tailwind CSS RTL plugin or MUI's `CacheProvider` with `rtlPlugin`
handles component-level RTL automatically.  
**Alternatives considered**:
- Manual CSS mirroring — error-prone and hard to maintain

---

### File Storage (Absence Documents)

**Decision**: Local file system storage with a configured `UPLOADS_DIR` in development;
prepare for S3-compatible storage swap in production via an abstraction layer.  
**Rationale**: Local storage is the simplest approach for a course project running in Docker.
Wrapping uploads in a storage service interface (e.g., `FileStorageService`) means the
implementation can be swapped to S3 or Cloudflare R2 in production without changing API logic.  
**Alternatives considered**:
- AWS S3 directly — requires AWS account, IAM setup, and cost; unnecessary for a course project
- Database BLOBs — poor performance; not recommended for file storage

---

### Testing

**Decision**: Vitest + React Testing Library (frontend); Jest (backend)  
**Rationale**: Vitest integrates with Vite natively and shares the same config. Jest is the
standard for Node.js backend testing. Both support the 60% minimum coverage requirement.  
**Coverage approach**:
- Backend: unit test services and middleware; integration test API routes with an in-memory
  PostgreSQL instance (e.g., `pg-mem` or a Docker test DB)
- Frontend: unit test utility functions (overlap detection, absence day calculation, duration
  calculation); component tests for form validation logic

---

### Docker Compose Setup

**Decision**: Three services — `backend` (Node.js), `frontend` (Vite dev server / Nginx for
prod), `db` (PostgreSQL 15)  
**Rationale**: Matches spec requirement. A `.env` file at root controls all port, database
URL, and JWT secret values. `db` container uses a named volume for data persistence.  

---

### CI/CD

**Decision**: GitHub Actions for CI (lint + test on every PR); Render or Railway for CD  
**Rationale**: GitHub Actions is free for public repos; deep GitHub integration. Render/Railway
both offer free tiers with Docker support and one-click PostgreSQL add-on.  

---

## Key Business Logic Decisions

### Overlap Detection

Time reports for the same user on the same day must not have overlapping `(startTime, endTime)`
intervals. Query: check if any existing report for `(userId, reportDate)` satisfies:
`existingStart < newEnd AND existingEnd > newStart`. Reject if any match found.

### Weekend Exclusion for Absences

Work week: Sunday–Thursday. Exclude day if `dayOfWeek IN (5, 6)` (Friday = 5, Saturday = 6,
using ISO 8601 where Monday = 1). Iterate start–end range and count non-excluded days.

### Day Status Calculation (Monthly View)

For each calendar day in the selected month:
- **Complete**: Total reported hours ≥ 9 (or day is a valid absence)
- **Missing**: Working day with no report and no absence (and month started ≥ 1 day ago)
- **Exceptional**: Working day with total reported hours > 0 but < 9 or > 9 (partial day)
- **Non-working**: Weekend or holiday per WorkCalendarDay

### Month Lock Enforcement

Every write endpoint for `TimeReport` and `AbsenceReport` MUST check `MonthLock` for the
report's year-month before persisting. If `isLocked = true` and the requester is not an Admin,
return HTTP 423 Locked with a clear message.
