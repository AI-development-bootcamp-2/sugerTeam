# EPIC-002 — Admin Entity Management
## Incremental Implementation Plan: T001 (UserService) + T002 (Admin User Routes)

---

## 1. Overview

Implement a backend service and HTTP route layer that allows an authenticated ADMIN to create,
list, update, deactivate, and activate users. No `passwordHash` is ever returned from any
endpoint or service method.

**Files involved:**

| File | Action |
|------|--------|
| `backend/src/services/user.service.ts` | Create |
| `backend/src/routes/users.ts` | Create |
| `backend/src/app.ts` | Edit (mount only) |

No migrations or schema changes required. The `User` model, `UserRole` enum (`EMPLOYEE`,
`TEAM_LEAD`, `ADMIN`), and `UserStatus` enum (`ACTIVE`, `INACTIVE`) are already defined in
`backend/prisma/schema.prisma`.

---

## 2. Why We Are Splitting the Work

A single large implementation carries risk: an error in the service layer can hide behind a
routing bug and vice versa. Splitting into focused tasks means:

- Each task has a single responsibility and a clear pass/fail condition.
- The service can be reviewed and verified before any route touches it.
- `app.ts` is only touched in one isolated step, minimising the chance of breaking the
  existing health endpoint or auth routes.
- Git history stays clean and reviewable commit-by-commit.

---

## 3. Execution Order

```
Task A  →  Task B  →  Task C  →  Task D  →  Task E  →  Task F
(service)  (review)   (routes)   (mount)    (manual)   (auto tests)
```

Do not begin a task until the previous one is complete and verified.

---

## 4. Task A — Implement UserService

**Goal:** Create the service layer with all five user operations. No routes, no app changes.

**Files Claude MAY edit:**
- `backend/src/services/user.service.ts` ← create this file

**Files Claude MUST NOT edit:**
- `backend/src/app.ts`
- `backend/src/routes/users.ts`
- Any existing file

**Recommended git commit after this task:**
```
feat: add UserService with create, list, update, deactivate, activate
```

---

### A.1 — File scaffold

- [ ] Create `backend/src/services/user.service.ts`.
- [ ] Import `prisma` from `'../lib/prisma'`.
- [ ] Import `bcrypt` from `'bcrypt'`.
- [ ] Import `{ UserRole, UserStatus, User }` from `'@prisma/client'`.

---

### A.2 — ConflictError class

- [ ] Define and export a `ConflictError` class modelled after `AuthError` in
  `auth.service.ts`:
  ```ts
  export class ConflictError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ConflictError';
    }
  }
  ```

---

### A.3 — SafeUser type

- [ ] Define and export a `SafeUser` type — the `User` model minus `passwordHash`:
  ```ts
  export type SafeUser = Omit<User, 'passwordHash'>;
  ```
  This makes the "never return passwordHash" rule compiler-enforced, not just a convention.

---

### A.4 — `omitHash` private helper

- [ ] Write a module-private (non-exported) helper:
  ```ts
  function omitHash(user: User): SafeUser {
    const { passwordHash: _ph, ...safe } = user;
    return safe;
  }
  ```
  Every service method must pass its Prisma result through `omitHash` before returning.

---

### A.5 — `createUser`

Signature:
```ts
export async function createUser(data: {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<SafeUser>
```

- [ ] Normalise email: `data.email.toLowerCase().trim()`.
- [ ] Hash password: `bcrypt.hash(data.password, 12)`. Cost must be `12`.
- [ ] Call `prisma.user.create(...)` inside try/catch with these fields:
  - `fullName`, `email` (normalised), `passwordHash`, `role`
  - `status: UserStatus.ACTIVE` — explicit even though it is the Prisma default
  - `passwordChangedAt: new Date()` — **must not be `null`**; `null` is the seeded-admin
    sentinel that bypasses the 30-day rotation check in `auth.service.ts` line 70
- [ ] In the catch block: if `(err as { code?: string }).code === 'P2002'`, rethrow as
  `new ConflictError('Email already in use')`. All other errors bubble up.
- [ ] Return `omitHash(createdUser)`.

---

### A.6 — `listUsers`

Signature:
```ts
export async function listUsers(filters: {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}): Promise<SafeUser[]>
```

- [ ] Build a Prisma `where` object incrementally:
  - `filters.role` defined → `where.role = filters.role`
  - `filters.isActive === true` → `where.status = UserStatus.ACTIVE`
  - `filters.isActive === false` → `where.status = UserStatus.INACTIVE`
  - `filters.isActive === undefined` → no status filter (return both ACTIVE and INACTIVE)
  - `filters.search` non-empty → add:
    ```ts
    OR: [
      { fullName: { contains: filters.search, mode: 'insensitive' } },
      { email:    { contains: filters.search, mode: 'insensitive' } },
    ]
    ```
- [ ] Call `prisma.user.findMany({ where })`.
- [ ] Return `users.map(omitHash)`.
- [ ] Do **NOT** filter by `deletedAt` — deactivated users must appear so the admin can
  re-activate them.

---

### A.7 — `updateUser`

Signature:
```ts
export async function updateUser(
  id: string,
  data: { fullName?: string; email?: string; role?: UserRole },
): Promise<SafeUser>
```

- [ ] If `data.email` is present, normalise it: `data.email.toLowerCase().trim()`.
- [ ] Call `prisma.user.update({ where: { id }, data })` inside try/catch.
- [ ] In catch:
  - `P2025` (record not found) → let it bubble; the route converts it to 404.
  - `P2002` (email duplicate) → rethrow as `new ConflictError('Email already in use')`.
- [ ] Return `omitHash(updatedUser)`.

---

### A.8 — `deactivateUser`

Signature:
```ts
export async function deactivateUser(id: string): Promise<SafeUser>
```

- [ ] Call `prisma.user.update` with:
  ```ts
  data: { status: UserStatus.INACTIVE, deletedAt: new Date() }
  ```
- [ ] Let `P2025` bubble for the route to handle as 404.
- [ ] Return `omitHash(updatedUser)`.

---

### A.9 — `activateUser`

Signature:
```ts
export async function activateUser(id: string): Promise<SafeUser>
```

- [ ] Call `prisma.user.update` with:
  ```ts
  data: { status: UserStatus.ACTIVE, deletedAt: null }
  ```
- [ ] Let `P2025` bubble for the route to handle as 404.
- [ ] Return `omitHash(updatedUser)`.

---

### A.10 — Compile check

- [ ] Run `npx tsc --noEmit` inside `backend/`. Must exit 0 before moving to Task B.

---

## 5. Task B — Review UserService Implementation

**Goal:** Verify correctness and security of `user.service.ts` before any routes are built.
This is a read-only review step. No code changes unless a defect is found.

**Files Claude MAY read:**
- `backend/src/services/user.service.ts`

**Files Claude MUST NOT edit** (unless a bug is found and confirmed with the team):
- Any file

**Recommended git commit after this task:**
```
fix: address UserService review findings (if any)
```
If no findings: skip the commit and proceed to Task C.

---

### B.1 — passwordHash leak check

- [ ] Grep every `return` statement in `user.service.ts`.
- [ ] Confirm each one returns the result of `omitHash(...)` and not a raw Prisma object.
- [ ] Confirm `passwordHash` does not appear in any exported type other than as the field
  being omitted in `SafeUser`.

### B.2 — Bcrypt cost check

- [ ] Confirm `bcrypt.hash(...)` is called with exactly `12` as the second argument.
- [ ] Confirm `bcrypt.hash` is only called once (in `createUser`).

### B.3 — Email normalisation check

- [ ] Confirm `toLowerCase().trim()` is applied in both `createUser` and `updateUser`
  before any DB call.

### B.4 — Prisma error handling check

- [ ] In `createUser`: confirm `P2002` → `ConflictError`, all other errors bubble.
- [ ] In `updateUser`: confirm `P2002` → `ConflictError`, `P2025` bubbles.
- [ ] In `deactivateUser` / `activateUser`: confirm `P2025` bubbles.

### B.5 — SafeUser usage check

- [ ] Confirm all five exported functions declare their return type as `Promise<SafeUser>`
  or `Promise<SafeUser[]>`, not `Promise<User>`.

### B.6 — passwordChangedAt check

- [ ] Confirm `createUser` sets `passwordChangedAt: new Date()` and not `null`.

---

## 6. Task C — Implement Users Routes

**Goal:** Create the Express router for all five user endpoints. The service (Task A) must be
complete and reviewed (Task B) before starting this task.

**Files Claude MAY edit:**
- `backend/src/routes/users.ts` ← create this file

**Files Claude MUST NOT edit:**
- `backend/src/app.ts`
- `backend/src/services/user.service.ts`
- Any existing file

**Recommended git commit after this task:**
```
feat: add admin users router (GET, POST, PATCH, deactivate, activate)
```

---

### C.1 — File scaffold

- [ ] Create `backend/src/routes/users.ts`.
- [ ] Import `{ Router, Request, Response, NextFunction }` from `'express'`.
- [ ] Import `{ z }` from `'zod'`.
- [ ] Import `{ authenticateToken }` from `'../middleware/auth'`.
- [ ] Import `{ requireRole }` from `'../middleware/roleGuard'`.
- [ ] Import `{ UserRole }` from `'@prisma/client'`.
- [ ] Import service functions and `ConflictError` from `'../services/user.service'`.
- [ ] `const router = Router()`.

---

### C.2 — Global middleware

- [ ] Apply immediately after `Router()` so every route below inherits both:
  ```ts
  router.use(authenticateToken);
  router.use(requireRole(UserRole.ADMIN));
  ```

---

### C.3 — Zod schemas (module level, not inside handlers)

- [ ] **`createUserSchema`**:
  ```ts
  const createUserSchema = z.object({
    fullName: z.string().min(1),
    email:    z.string().email(),
    password: z.string().min(8),
    role:     z.nativeEnum(UserRole),
  });
  ```

- [ ] **`updateUserSchema`** (partial, at least one field required):
  ```ts
  const updateUserSchema = z.object({
    fullName: z.string().min(1).optional(),
    email:    z.string().email().optional(),
    role:     z.nativeEnum(UserRole).optional(),
  }).refine(
    (d) => Object.keys(d).length > 0,
    { message: 'At least one field must be provided' },
  );
  ```

- [ ] **`listQuerySchema`**:
  ```ts
  const listQuerySchema = z.object({
    role:     z.nativeEnum(UserRole).optional(),
    isActive: z.enum(['true', 'false']).optional(),
    search:   z.string().optional(),
  });
  ```

---

### C.4 — `GET /users`

- [ ] Parse `req.query` with `listQuerySchema.safeParse(...)`.
- [ ] On failure → `400 { error: result.error.format() }`.
- [ ] Convert `isActive`: `'true'` → `true`, `'false'` → `false`, `undefined` → `undefined`.
- [ ] Call `listUsers({ role, isActive, search })`.
- [ ] Respond `200` with the array.

---

### C.5 — `POST /users`

- [ ] Validate `req.body` with `createUserSchema.safeParse(...)`.
- [ ] On failure → `400`.
- [ ] Call `createUser(result.data)`.
- [ ] Respond `201` with the returned user.
- [ ] Catch `ConflictError` → `409 { error: err.message }`.

---

### C.6 — `PATCH /users/:id`

- [ ] `const id = req.params.id`.
- [ ] Validate `req.body` with `updateUserSchema.safeParse(...)`.
- [ ] On failure → `400`.
- [ ] Call `updateUser(id, result.data)`.
- [ ] Respond `200` with the returned user.
- [ ] Catch `ConflictError` → `409`.
- [ ] Catch `P2025` → `404 { error: 'User not found' }`.

---

### C.7 — `PATCH /users/:id/deactivate`

- [ ] `const id = req.params.id`.
- [ ] Call `deactivateUser(id)`.
- [ ] Respond `200` with the returned user.
- [ ] Catch `P2025` → `404 { error: 'User not found' }`.

---

### C.8 — `PATCH /users/:id/activate`

- [ ] `const id = req.params.id`.
- [ ] Call `activateUser(id)`.
- [ ] Respond `200` with the returned user.
- [ ] Catch `P2025` → `404 { error: 'User not found' }`.

---

### C.9 — Error propagation pattern

Follow the existing pattern from `backend/src/routes/auth.ts`:
```ts
} catch (err: unknown) {
  if (err instanceof ConflictError) {
    res.status(409).json({ error: err.message });
    return;
  }
  if ((err as { code?: string }).code === 'P2025') {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  next(err);
}
```

---

### C.10 — Export and compile check

- [ ] `export default router;` at the end of the file.
- [ ] Run `npx tsc --noEmit` inside `backend/`. Must exit 0 before Task D.

---

## 7. Task D — Mount Users Router in app.ts

**Goal:** Wire the new router into the Express app. This is the only change to `app.ts`.

**Files Claude MAY edit:**
- `backend/src/app.ts` — add import and mount line only

**Files Claude MUST NOT edit:**
- `backend/src/services/user.service.ts`
- `backend/src/routes/users.ts`
- Any middleware file
- Any other existing file

**Rules for editing `app.ts`:**
- Do not refactor existing code.
- Do not reorder existing middleware.
- Do not modify or remove the health endpoint.
- Do not touch auth logic.
- Only add the two lines below (import + mount).

**Recommended git commit after this task:**
```
feat: mount /api/v1/users router in app.ts
```

---

### D.1 — Add import

- [ ] Add at the top of `app.ts` with the other imports:
  ```ts
  import usersRouter from './routes/users';
  ```

Do **NOT** import or mount `authRouter` here. Mounting auth routes is a separate task and
must be explicitly requested before touching it.

---

### D.2 — Mount users router only

- [ ] Add after the existing middleware (`express.json`, `cors`, `cookieParser`) and before
  any error handler:
  ```ts
  app.use('/api/v1/users', usersRouter);
  ```

---

### D.3 — Compile and smoke check

- [ ] Run `npx tsc --noEmit`. Must exit 0.
- [ ] Start the server (`npm run dev`) and confirm `GET /api/v1/health` still returns `200`.

---

## 8. Task E — Manual API Verification

**Goal:** Verify all routes end-to-end against the running server.

**Files Claude MUST NOT edit** during this task.

Prerequisite: server running locally, DB seeded (`npx prisma db seed` inside `backend/`).

---

### E.1 — Get admin token
```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "admin@company.com", "password": "Admin1234!" }
```
Expected: `200`. Save `accessToken` as `$TOKEN`.

---

### E.2 — Admin creates a user
```http
POST /api/v1/users
Authorization: Bearer $TOKEN
Content-Type: application/json

{
  "fullName": "Alice Test",
  "email": "alice@example.com",
  "password": "SecurePass1!",
  "role": "EMPLOYEE"
}
```
Expected: `201`. Body contains user fields. **No `passwordHash` field present.**
Save `id` as `$ALICE_ID`.

---

### E.3 — Duplicate email returns 409
```http
POST /api/v1/users
Authorization: Bearer $TOKEN
Content-Type: application/json

{ "fullName": "Alice2", "email": "alice@example.com", "password": "SecurePass1!", "role": "EMPLOYEE" }
```
Expected: `409 { "error": "Email already in use" }`.

---

### E.4 — Created user can log in
```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "alice@example.com", "password": "SecurePass1!" }
```
Expected: `200`, returns `accessToken`.

---

### E.5 — List users
```http
GET /api/v1/users
Authorization: Bearer $TOKEN
```
Expected: `200`, array. Alice is present. No item has `passwordHash`.

---

### E.6 — Filter by role
```http
GET /api/v1/users?role=EMPLOYEE
Authorization: Bearer $TOKEN
```
Expected: `200`, only `EMPLOYEE` users.

---

### E.7 — Filter by active status
```http
GET /api/v1/users?isActive=true
Authorization: Bearer $TOKEN
```
Expected: `200`, only `ACTIVE` users.

---

### E.8 — Search by name or email
```http
GET /api/v1/users?search=alice
Authorization: Bearer $TOKEN
```
Expected: `200`, alice appears (case-insensitive).

---

### E.9 — Update user (partial)
```http
PATCH /api/v1/users/$ALICE_ID
Authorization: Bearer $TOKEN
Content-Type: application/json

{ "fullName": "Alice Updated" }
```
Expected: `200`, `fullName` updated, no `passwordHash`.

---

### E.10 — Deactivate user
```http
PATCH /api/v1/users/$ALICE_ID/deactivate
Authorization: Bearer $TOKEN
```
Expected: `200`, `status: "INACTIVE"`, `deletedAt` is non-null.

---

### E.11 — Deactivated user cannot log in
```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "alice@example.com", "password": "SecurePass1!" }
```
Expected: `401`.

---

### E.12 — Activate user
```http
PATCH /api/v1/users/$ALICE_ID/activate
Authorization: Bearer $TOKEN
```
Expected: `200`, `status: "ACTIVE"`, `deletedAt: null`.

---

### E.13 — Activated user can log in again
Repeat E.4. Expected: `200`.

---

### E.14 — Non-admin receives 403
Log in as an EMPLOYEE (create one via E.2 with a different email, get their token), then:
```http
GET /api/v1/users
Authorization: Bearer $EMPLOYEE_TOKEN
```
Expected: `403`.

---

### E.15 — Missing token receives 401
```http
GET /api/v1/users
```
Expected: `401`.

---

### E.16 — Unknown id returns 404
```http
PATCH /api/v1/users/00000000-0000-0000-0000-000000000000/deactivate
Authorization: Bearer $TOKEN
```
Expected: `404 { "error": "User not found" }`.

---

### E.17 — Invalid body returns 400
```http
POST /api/v1/users
Authorization: Bearer $TOKEN
Content-Type: application/json

{ "fullName": "", "email": "not-an-email", "password": "short", "role": "ALIEN" }
```
Expected: `400`, body contains Zod error details.

---

## 9. Task F — Suggested Automated Tests

**Goal:** Define what to test. Do not implement tests yet — that is a separate task.

**Files Claude MUST NOT edit** during this planning step.

**Recommended git commit when tests are implemented:**
```
test: add unit and integration tests for UserService and users routes
```

---

### F.1 — Unit tests for `user.service.ts`

Mock `prisma` via `jest.mock('../lib/prisma')`.

| Test | Key assertion |
|------|---------------|
| `createUser` happy path | `bcrypt.hash` called with cost `12`; result has no `passwordHash` key |
| `createUser` P2002 | Throws `ConflictError` |
| `createUser` passwordChangedAt | Value passed to Prisma is a `Date`, not `null` |
| `listUsers` no filters | `findMany` called with empty `where` |
| `listUsers` role filter | `where.role` matches input |
| `listUsers` isActive=true | `where.status === 'ACTIVE'` |
| `listUsers` isActive=false | `where.status === 'INACTIVE'` |
| `listUsers` search | `where.OR` contains `mode: 'insensitive'` for both fields |
| `listUsers` result shape | No item in result has `passwordHash` |
| `updateUser` happy path | `prisma.user.update` called with only provided fields; no `passwordHash` in result |
| `updateUser` email normalised | Prisma called with lowercased email |
| `updateUser` P2002 | Throws `ConflictError` |
| `updateUser` P2025 | Error propagates (not swallowed as ConflictError) |
| `deactivateUser` | Prisma called with `status: 'INACTIVE'` and `deletedAt` as a `Date` |
| `activateUser` | Prisma called with `status: 'ACTIVE'` and `deletedAt: null` |

---

### F.2 — Integration / route tests for `users.ts`

Use Supertest against the real Express app. Wrap each test in a transaction rollback or
use a separate test database to keep tests isolated.

| Scenario | Expected status |
|----------|-----------------|
| No token on any route | `401` |
| EMPLOYEE-role token on any route | `403` |
| Invalid body on `POST /users` | `400` |
| Valid `POST /users` | `201`, no `passwordHash` in response |
| Duplicate email on `POST /users` | `409` |
| `GET /users` | `200`, returns array |
| `GET /users?isActive=true` | Only `ACTIVE` records |
| `GET /users?role=ADMIN` | Only `ADMIN` records |
| `GET /users?search=alice` | Alice appears |
| Valid partial `PATCH /users/:id` | `200`, only updated field changed |
| Empty body on `PATCH /users/:id` | `400` |
| Unknown id on `PATCH /users/:id/deactivate` | `404` |
| Valid `PATCH /users/:id/deactivate` | `200`, status `INACTIVE` |
| Login after deactivate | `401` |
| Valid `PATCH /users/:id/activate` | `200`, status `ACTIVE` |
| Login after activate | `200` |

---

## 10. Definition of Done

- [ ] **Task A complete** — `user.service.ts` exists; `tsc --noEmit` passes.
- [ ] **Task B complete** — review passed; no `passwordHash` leak, cost 12, email
  normalised, correct Prisma error codes handled.
- [ ] **Task C complete** — `routes/users.ts` exists; `tsc --noEmit` passes.
- [ ] **Task D complete** — `app.ts` mounts `/api/v1/users`; health endpoint still returns
  `200`; `npm run build` exits 0; `npm run lint` exits 0.
- [ ] **Task E complete** — all 17 manual verification steps pass.
- [ ] No endpoint returns `passwordHash` under any scenario.
- [ ] Deactivated user cannot obtain a JWT via `/api/v1/auth/login`.
- [ ] Non-ADMIN role receives `403` on all `/api/v1/users` routes.
- [ ] **Task F complete** (separate commit) — unit and integration tests pass.
- [ ] PR reviewed and merged to the feature branch.

---

## Recommended Git Commit Breakdown

| # | When | Message |
|---|------|---------|
| 1 | After Task A | `feat: add UserService with create, list, update, deactivate, activate` |
| 2 | After Task B (if fixes needed) | `fix: address UserService review findings` |
| 3 | After Task C | `feat: add admin users router (GET, POST, PATCH, deactivate, activate)` |
| 4 | After Task D | `feat: mount /api/v1/users router in app.ts` |
| 5 | After Task F | `test: add unit and integration tests for UserService and users routes` |
