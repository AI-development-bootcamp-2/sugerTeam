# Tasks: EPIC-001 — Foundation & Authentication

**Sprint**: 1 | **Days**: 1–2 | **Spec Priority**: P0 (prerequisite) | **User Story**: US6
**Platform**: 🔵 Shared Foundation — backend + auth UI delivered to both `frontend-time_management/` and `frontend-admin`
**Assignees**: Dev 1 (backend) + Dev 3 (frontend)
**Depends on**: nothing — start immediately
**Blocks**: ALL other epics

**Acceptance Criteria**:
- `docker-compose up` boots backend, frontend-time_management, and PostgreSQL 15 without errors
- `GET /api/v1/health` returns 200
- `pnpm prisma migrate dev` runs clean; `pnpm prisma db seed` creates admin@company.com
- POST /auth/login with valid credentials → 200 + accessToken; invalid → 401; inactive → 401
- POST /auth/refresh rotates tokens; POST /auth/logout clears cookie
- Employee logs in → lands on /dashboard; page reload survives via silent token refresh
- Hebrew RTL login page renders without horizontal scroll on mobile Chrome

---

## Phase 1: Project Setup

- [X] T001 Initialize monorepo root: create .gitignore (node_modules, dist, .env, uploads/), .env.example (DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_EXPIRES_IN=2h, JWT_REFRESH_EXPIRES_IN=30d, UPLOAD_DIR=./uploads/absence-docs, PORT=3000, VITE_API_URL=http://localhost:3000), and pnpm-workspace.yaml listing packages: [backend, frontend-time_management]: .gitignore, .env.example, pnpm-workspace.yaml
- [X] T002 [P] Scaffold backend as Node.js 20 + TypeScript project: create backend/package.json with name, scripts (dev: ts-node-dev src/server.ts, build: tsc, start: node dist/server.js), install typescript@5, ts-node-dev, @types/node; create backend/tsconfig.json (target ES2022, module CommonJS, strict true, outDir dist, rootDir src, paths alias @/ → src/): backend/package.json, backend/tsconfig.json
- [X] T003 [P] Scaffold frontend as React 18 + Vite + TypeScript project using `pnpm create vite@latest frontend-time_management -- --template react-ts`; verify frontend-time_management/package.json, frontend-time_management/vite.config.ts, frontend-time_management/tsconfig.json exist: frontend-time_management/package.json, frontend-time_management/tsconfig.json, frontend-time_management/vite.config.ts
- [X] T004 Configure backend ESLint (@typescript-eslint/eslint-plugin, eslint-config-prettier) and Prettier; .eslintrc.json: parser `@typescript-eslint/parser`, extends `["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"]`; .prettierrc: singleQuote true, semi true, printWidth 100, trailingComma "es5", tabWidth 2; add `"lint": "eslint src --ext .ts"` and `"format": "prettier --write src"` scripts to package.json (no eslint-plugin-prettier): backend/.eslintrc.json, backend/.prettierrc, backend/package.json
- [X] T005 [P] Configure frontend ESLint and Prettier (same .prettierrc); install and init Tailwind CSS 3 (tailwindcss, postcss, autoprefixer); configure content paths in tailwind.config.ts; add @tailwind base/components/utilities directives; configure vite.config.ts to alias @ → src: frontend-time_management/.eslintrc.json, frontend-time_management/.prettierrc, frontend-time_management/tailwind.config.ts, frontend-time_management/postcss.config.js, frontend-time_management/src/index.css, frontend-time_management/vite.config.ts
- [X] T006 Create Docker Compose with three named services: backend (build: ./backend, port 3000:3000, depends_on db), frontend-time_management (build: ./frontend, port 5173:5173, depends_on backend), db (image: postgres:15-alpine, port 5432:5432, env POSTGRES_DB/USER/PASSWORD, named volume pgdata); add env_file: .env to backend service: docker-compose.yml

**Checkpoint**: `docker-compose up` starts all three services without errors; no port conflicts

---

## Phase 2: Foundational (Blocking — must complete before all other epics)

- [X] T007 Install all backend runtime dependencies (express, @prisma/client, jsonwebtoken, bcrypt, zod, cors, cookie-parser, multer, uuid) and dev dependencies (@types/express, @types/jsonwebtoken, @types/bcrypt, @types/cors, @types/cookie-parser, @types/multer, @types/uuid, prisma); create backend/src/app.ts exporting configured Express app with JSON body parser, cors (origin `process.env.VITE_API_URL`, credentials true), cookie-parser; create backend/src/server.ts that imports app and calls `app.listen(process.env.PORT || 3000)`; `GET /api/v1/health → 200 { status: "ok" }` is registered on app in app.ts (not server.ts): backend/package.json, backend/src/app.ts, backend/src/server.ts
- [x] T008 [P] Install all frontend runtime dependencies (axios, react-router-dom@6, @tanstack/react-query@5, zustand, react-hook-form, @hookform/resolvers, zod); set `dir="rtl"` and `lang="he"` on `<html>` element in index.html; wrap React app root in QueryClientProvider with default retry 1: frontend-time_management/package.json, frontend-time_management/index.html, frontend-time_management/src/main.tsx
- [x] T009 Write complete Prisma schema covering all 12 entities with fields, enums, relations, and indexes as specified in data-model.md: User (role enum EMPLOYEE/TEAM_LEAD/ADMIN, status ACTIVE/INACTIVE), Client, Project, Task (status OPEN/CLOSED), TaskAssignment (unique taskId+userId), TimeReport (status DRAFT/SUBMITTED, workLocation OFFICE/CLIENT/HOME, durationMinutes computed), AbsenceReport (absenceType VACATION/SICK_LEAVE/MILITARY_RESERVE/OTHER, status SUBMITTED/DOCUMENT_PENDING), AbsenceDocument, MonthLock (unique year+month), AuditLog (entityType TIME_REPORT/ABSENCE_REPORT, action UPDATE/DELETE, insert-only), WorkCalendarDay (dayType REGULAR/WEEKEND/HOLIDAY/SPECIAL, unique date), ActiveTimer (unique userId); add indexes: idx_time_report_user_month (userId, reportDate), idx_time_report_user_date (userId, reportDate, where deletedAt IS NULL), idx_task_assignment_user (userId, taskId), idx_month_lock_year_month UNIQUE (year, month): backend/prisma/schema.prisma
- [x] T010 Run `pnpm prisma migrate dev --name init` to generate migration SQL; write seed script that: creates admin@company.com (fullName "מנהל מערכת", role ADMIN, status ACTIVE, bcrypt cost 12 hash of "Admin1234!"); seeds all Fri/Sat dates for current year and next year as WorkCalendarDay (dayType WEEKEND, isWorkingDay false, standardHours 0); add `"prisma": { "seed": "ts-node prisma/seed.ts" }` to backend/package.json: backend/prisma/migrations/init/, backend/prisma/seed.ts, backend/package.json
- [X] T011 Create Prisma client singleton that instantiates PrismaClient once and re-exports it, preventing multiple client instances in hot-reload; cache the instance on `globalThis.prisma` only when `process.env.NODE_ENV !== 'production'` (in production, instantiate a fresh module-scoped client); pass `log: ['query', 'error', 'warn']` when `NODE_ENV !== 'production'`, otherwise `log: ['error']`; expose as a named export `prisma` (no default export); register `SIGINT` and `SIGTERM` handlers in the same module that `await prisma.$disconnect()` and let Node exit naturally (do not call `process.exit`); guard the registration behind a `globalThis.prismaShutdownRegistered` flag so hot-reloads do not stack duplicate listeners: backend/src/prisma/client.ts

**Checkpoint**: `pnpm prisma migrate dev` succeeds; `pnpm prisma db seed` creates admin@company.com; `pnpm run dev` starts backend; `GET /api/v1/health` returns 200

---

## Phase 3: Auth API (User Story: US6)

- [X] T012 [US6] Implement AuthService: login(email, password) — find active user by email (401 if not found or status INACTIVE), bcrypt.compare password (401 if mismatch), sign JWT access token (HS256, 2h, payload {sub: userId, role}), sign refresh token (HS256, 30d), return { accessToken, user: {id, fullName, role} }; refreshTokens(refreshToken) — verify refresh JWT, return new token pair; logout() — no server state needed (cookie cleared by route): backend/src/services/auth.service.ts
- [X] T013 [US6] Implement POST /auth/login (body: {email, password} Zod-validated, sets refreshToken httpOnly sameSite=strict cookie, returns accessToken + user), POST /auth/refresh (reads refreshToken cookie, returns new accessToken + user, sets new cookie), POST /auth/logout (clears refreshToken cookie, returns 204) routes: backend/src/routes/auth.ts
- [X] T014 [US6] Implement authenticateToken middleware: extract Bearer token from Authorization header, verify JWT, attach decoded {userId, role} to req.user; return 401 `{ error: "טוקן חסר או לא תקין" }` if missing or expired; implement requireRole(...roles: UserRole[]) factory returning middleware that checks req.user.role and returns 403 `{ error: "אין לך הרשאה לבצע פעולה זו" }` if not in allowed list; define global Express Request type augmentation `declare namespace Express { interface Request { user: { userId: string; role: UserRole } } }` in a standalone declaration file so all middleware files can read req.user without importing auth.ts: backend/src/middleware/auth.ts, backend/src/middleware/roleGuard.ts, backend/src/types/express.d.ts
- [X] T015 [US6] Implement checkMonthLock middleware factory: read `:yearMonth` route param first (format `"yyyy-mm"`); if absent, parse year+month from `req.body.date` (ISO `"yyyy-mm-dd"` string); query MonthLock table with prisma client; if no row found treat month as implicitly unlocked and allow request; if `isLocked` is true and `req.user.role !== ADMIN`, return 423 `{ error: "החודש נעול, לא ניתן לבצע שינויים" }`; must be applied after authenticateToken (depends on req.user): backend/src/middleware/monthLock.ts
- [X] T016 [US6] Register all route files on Express app under /api/v1 prefix (app.use('/api/v1/auth', authRouter)); fix CORS origin from `process.env.CLIENT_URL` to `process.env.VITE_API_URL` (per T007 clarification — both services share the same .env); add 404 handler (unknown route → 404 JSON) and global error handler middleware (logs error, returns 500 JSON); export app from app.ts: backend/src/app.ts (extend)

**Checkpoint**: POST /api/v1/auth/login valid → 200 + accessToken + httpOnly cookie; invalid password → 401; inactive user → 401; POST /api/v1/auth/refresh → 200 new token pair + new cookie; POST /api/v1/auth/logout → 204 cookie cleared; GET /api/v1/nonexistent → 404 JSON; unhandled error → 500 JSON

---

## Phase 4: Auth UI (User Story: US6)

- [X] T017 [US6] Implement Zustand auth store: state { user: User | null, accessToken: string | null }; actions setAuth(user, token), clearAuth(); store does NOT persist to localStorage (token in memory only for XSS protection): frontend-time_management/src/store/authStore.ts
- [x] T018 [US6] Implement Axios API client singleton: baseURL from import.meta.env.VITE_API_URL, withCredentials true; request interceptor skips Authorization header when accessToken is null, otherwise attaches Authorization: Bearer <accessToken> from auth store; response interceptor on 401 checks if failing request is POST /auth/refresh — if so, calls clearAuth() and router.navigate('/login') immediately (no retry); otherwise calls POST /auth/refresh once (using a refresh-in-progress flag to queue concurrent failures), updates auth store with new token, retries original request; on refresh failure calls clearAuth() and router.navigate('/login'); import router from frontend-time_management/src/router.ts for soft SPA navigation: frontend-time_management/src/services/api.ts
- [X] T019 [US6] Implement React Router v6 app using createBrowserRouter (not BrowserRouter); export the router instance as default from frontend-time_management/src/router.tsx so api.ts can import it for programmatic navigation; mount via RouterProvider in frontend-time_management/src/main.tsx; define routes: /login → LoginPage (public), / → redirect to /dashboard, /dashboard → DashboardPage (protected), /reports → stub (protected), /absences → stub (protected), /admin/* → stub (protected, requires ADMIN or TEAM_LEAD role); ProtectedRoute component reads auth store — if no accessToken redirects to /login; stub DashboardPage renders a Hebrew "ברוך הבא" heading: frontend-time_management/src/router.tsx, frontend-time_management/src/main.tsx, frontend-time_management/src/components/ProtectedRoute.tsx, frontend-time_management/src/pages/dashboard/DashboardPage.tsx
- [X] T020 [US6] Implement Hebrew RTL login page: React Hook Form with Zod schema (email: required string().email(), password: required string()); on submit calls POST /auth/login via API client, stores result in auth store (setAuth), navigates to /dashboard; shows Hebrew inline validation errors ("כתובת דוא״ל נדרשת", "סיסמה נדרשת", "דוא״ל לא תקין"); shows Hebrew auth error on 401 ("פרטי התחברות שגויים"); layout uses Tailwind logical properties (ps-, pe-) for RTL, mobile-first (full-height screen, centered card): frontend-time_management/src/pages/login/LoginPage.tsx

**Checkpoint**: Open /login → Hebrew RTL form centered on screen; valid admin credentials → redirects to /dashboard; wrong password → Hebrew error inline; page reload on /dashboard → token refreshed silently via cookie; layout correct on mobile Chrome (no horizontal scroll)

---

## Clarifications

### Session 2026-05-10

- Q: Should T016 also fix the CORS origin from `CLIENT_URL` to `VITE_API_URL` while extending app.ts? → A: Yes — T016 is the right fix point since it already extends app.ts; the correct origin is `process.env.VITE_API_URL` per the T007 clarification (both services share the same .env file
  - Q: Where should the `User` TypeScript type be defined for T017? → A: Shared `frontend-time_management/src/types/auth.ts` file — exports `UserRole` enum (mirroring Prisma) and `User` interface `{ id: string; fullName: string; role: UserRole }`; created as part of T017 so T018–T020 import from there without coupling to the store module
- Q: Should the Zustand auth store expose an `isAuthenticated` derived boolean selector? → A: No — consumers check `accessToken !== null` directly; store stays minimal (pure state + two actions only)
- Q: Should T017's store include bootstrap/initialization logic (e.g., auto-trigger silent refresh on page reload)? → A: No — store is pure data + actions only; T019's ProtectedRoute owns the "refresh in-flight" loading state on first mount; T018's 401 interceptor calls `setAuth()` after a successful refresh; keeping init logic out of the store avoids a circular dependency (T018 reads the store's token; if the store called T018, they'd be mutually dependent)
- Q: Where should the TypeScript `req.user` type augmentation be defined for T014? → A: Separate `backend/src/types/express.d.ts` global declaration file — available to all middleware files automatically without circular imports
- Q: For T015, how should year+month be extracted from `req.params`? → A: Single `:yearMonth` param in `"yyyy-mm"` format; fall back to parsing `req.body.date` ISO string when no param is present
- Q: For T018, what should the request interceptor do when `accessToken` is `null`? → A: Skip the `Authorization` header entirely — public endpoints (e.g. `/auth/login`) don't require it, and protected endpoints will return 401 which the response interceptor handles correctly via the refresh flow
- Q: For T018, how should the 401 response interceptor prevent an infinite retry loop when `POST /auth/refresh` itself returns 401? → A: Check `originalRequest.url` — if it matches `/auth/refresh`, skip the retry entirely and call `clearAuth()` + redirect to `/login` immediately; the in-progress flag alone does not prevent re-entry on the refresh response itself
- Q: For T018, what mechanism should `api.ts` use to redirect to `/login` on refresh failure (non-React context)? → A: Import the exported `router` instance from `frontend-time_management/src/router.tsx` and call `router.navigate('/login')` for soft SPA navigation; T019 must use `createBrowserRouter` (not `<BrowserRouter>`) and export the router instance as default
- Q: For T018, should `api.ts` preserve the user's current URL and redirect back to it after login (post-login redirect)? → A: No — always navigate to `/dashboard` after successful login; no location state needed
- Q: For T018, should `api.ts` export the raw Axios instance or typed wrapper functions? → A: Export the raw instance as a named `export const apiClient = axios.create(...)` — callers type their own responses; no wrapper layer needed
- Q: For T014, what should the 401 and 403 error response bodies look like? → A: Hebrew `{ error: "..." }` shape — `{ error: "טוקן חסר או לא תקין" }` for 401, `{ error: "אין לך הרשאה לבצע פעולה זו" }` for 403 — consistent with T015 and FR-039
- Q: For T014, what algorithm should jwt.verify enforce? → A: Pin to `{ algorithms: ['HS256'] }` — prevents algorithm-confusion attacks (e.g., alg:none). Required even though not stated in the task.
- Q: For T014, what if JWT_ACCESS_SECRET is missing from env? → A: Return 500 `{ error: "שגיאת שרת פנימית" }` — a missing secret is a deployment error, not an auth failure.
- Q: For T014, what if the JWT payload has a valid signature but an empty sub or unrecognized role? → A: Return 401 `{ error: "טוקן חסר או לא תקין" }` — treat tampered/malformed payloads the same as invalid tokens.
- Q: For T014, what if requireRole() is called with zero arguments? → A: Throw at construction time — a zero-role guard would silently deny everyone; fail loudly instead.
- Q: For T014, what if requireRole runs before authenticateToken (req.user missing)? → A: Return 401 — defensive guard against middleware misconfiguration; not a normal runtime case.
- Q: For T015, what if req.body.date is not strict ISO yyyy-mm-dd? → A: Validate with `/^\d{4}-\d{2}-\d{2}$/` regex before parsing and return 400 — the original regex lacked the `$` anchor and was never applied to body.date.
- Q: For T015, what year range is valid? → A: 2000–2100 — an integer-only check on year passes nonsensical values like year=0; business dates fall within this window.
- Q: For T015, how should the ADMIN role be compared in the lock check? → A: Use `UserRole.ADMIN` (Prisma enum import) not the string literal `'ADMIN'` — enum reference is refactor-safe.
- Q: For T015, what if neither :yearMonth param nor req.body.date is present? → A: Call next() and treat the month as implicitly unlocked — the middleware is optional context; routes that always require a date should validate it separately.

### Session 2026-05-09

- Q: For T011, what hot-reload caching pattern should the Prisma client singleton use? → A: Cache on `globalThis.prisma` only when `NODE_ENV !== 'production'`; production uses a plain module-scoped instance
- Q: For T011, what `log` option should be passed to `new PrismaClient()`? → A: Env-aware — `['query', 'error', 'warn']` in non-production, `['error']` in production
- Q: For T011, what export style should the Prisma client singleton use? → A: Named export only — `export const prisma` (no default export)
- Q: For T011, how should the singleton handle graceful shutdown? → A: Register `SIGINT` + `SIGTERM` handlers in `client.ts` that `await prisma.$disconnect()` and let Node exit on its own — do **not** call `process.exit(0)`. Reason: an explicit `process.exit` terminates the event loop immediately and pre-empts any other SIGINT/SIGTERM handlers (HTTP server `close()`, queue drain, log flush, etc.) that may still be running async cleanup. Once Prisma has disconnected and no handles are pending, Node will exit naturally with code 0; if something else is still running, it correctly gets to finish first. Also guard the `process.on(...)` registrations with a `globalThis.prismaShutdownRegistered` flag so `ts-node-dev` hot-reloads don't stack duplicate listeners.
- Q: For T011, should soft-delete (`deletedAt: null`) filtering be wired globally in the singleton via `$extends`? → A: No — keep `client.ts` plain; each service applies `where: { deletedAt: null }` explicitly so historical/admin reads can still include soft-deleted rows

### Session 2026-05-07

- Q: What should `.eslintrc.json` extend from? → A: `["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"]`
- Q: What `trailingComma` value for `.prettierrc`? → A: `"es5"`
- Q: Should `eslint-plugin-prettier` be installed? → A: No — separate lint and format scripts only
- Q: What `tabWidth` for `.prettierrc`? → A: `2`
- Q: Should backend CORS origin read `process.env.VITE_API_URL` or a dedicated `CORS_ORIGIN` env var? → A: Read `process.env.VITE_API_URL` directly — both services share the same `.env` file so no separate var is needed
- Q: How should server.ts handle a missing PORT env var? → A: Soft default — `const PORT = process.env.PORT || 3000`
- Q: Should `GET /api/v1/health` be defined in app.ts or server.ts? → A: Define it in `app.ts` alongside all other routes for testability; `server.ts` only calls `app.listen()`

---

## Dependencies Within EPIC-001

- Phase 1 (Setup): No dependencies — start immediately; T002 ‖ T003 in parallel
- Phase 2 (Foundational): Requires Phase 1; T007 ‖ T008 in parallel; T009 → T010 → T011 sequential
- Phase 3 (Auth API): Requires T009 (schema) and T010 (migration run); T012 → T013 sequential; T014 ‖ T015 in parallel; T016 after T013
- Phase 4 (Auth UI): Requires T013 (auth endpoints running); T017 ‖ T018 in parallel; T019 → T020 sequential

## Parallel Execution Guide

```
Day 1 AM:
  T001 (root init)
  → T002 ‖ T003  (scaffold backend ‖ scaffold frontend)
  → T004 ‖ T005  (ESLint/Prettier backend ‖ Tailwind frontend)
  → T006         (Docker Compose)

Day 1 PM:
  T007 ‖ T008    (install backend deps + Express ‖ install frontend deps + RTL root)
  T009           (Prisma schema — Dev 1)

Day 2 AM:
  T010 → T011    (migration + seed → client singleton)
  T012 → T013    (AuthService → auth routes)
  T014 ‖ T015    (auth middleware ‖ monthLock middleware — parallel)
  T016           (register routes + error handlers)

Day 2 PM:
  T017 ‖ T018    (Zustand auth store ‖ Axios API client — parallel, Dev 3)
  T019 → T020    (React Router setup → Login page)
```
