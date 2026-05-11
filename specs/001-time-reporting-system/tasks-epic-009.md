# Tasks: EPIC-009 — CI/CD Pipeline

**Sprint**: 3 | **Days**: 1–2 | **Spec Priority**: P8 | **User Story**: DevOps
**Platform**: ⚙️ Both platforms — CI covers `backend/`, `frontend/`, and `frontend-admin/`; CD deploys all three
**Assignees**: Dev 1 (infrastructure)
**Depends on**: EPIC-001 (monorepo structure, Docker Compose, ESLint/Prettier, test setup)
**Blocks**: nothing — can be added at any point after EPIC-001

**Acceptance Criteria**:
- Every PR triggers a CI workflow: lint + type-check + tests must all pass before merge is allowed
- Merging to `main` triggers automatic deployment to the production environment
- A failed CI check blocks the PR merge (branch protection enforced)
- Secrets (DATABASE_URL, JWT secrets, etc.) are stored in GitHub Secrets, not in the repo
- `docker-compose up` in production uses the same images built by CI

---

## Phase 1: GitHub Actions — CI Workflow

- [X] T001 Create `.github/workflows/ci.yml`: trigger on `pull_request` targeting `main` and `dev`; define a single job `ci` running on `ubuntu-latest`; add a `services: postgres:` block (image: `postgres:15`, env: `POSTGRES_PASSWORD`, `POSTGRES_DB`) and pass `DATABASE_URL` as an env var to the test step; steps: checkout repo, setup Node 20 + pnpm via `pnpm/action-setup@v3`, run `pnpm install --frozen-lockfile`, run `pnpm --filter backend lint` and `pnpm --filter frontend lint` in parallel steps, run `pnpm --filter backend tsc --noEmit` and `pnpm --filter frontend tsc --noEmit`, run `pnpm --filter backend test` (Jest) if test script exists; cache pnpm store using `actions/cache` keyed on `pnpm-lock.yaml` hash: `.github/workflows/ci.yml`

- [X] T002 Add a `test` script to `backend/package.json` using Jest: install `jest`, `ts-jest`, `@types/jest` as dev dependencies; create `backend/jest.config.ts` with preset `ts-jest`, testEnvironment `node`, testMatch `**/*.test.ts`; write a smoke test `backend/src/__tests__/health.test.ts` that imports the Express app and asserts `GET /api/v1/health` returns 200 using `supertest`: `backend/package.json`, `backend/jest.config.ts`, `backend/src/__tests__/health.test.ts`

- [ ] T003 Configure GitHub branch protection on `main` (document steps — cannot be done via workflow file): require status check `ci` to pass before merging; require at least 1 approving review; disallow direct pushes to `main`; enable "Require branches to be up to date before merging". Document these settings in `.github/BRANCH_PROTECTION.md` so any repo admin can apply them: `.github/BRANCH_PROTECTION.md`

**Checkpoint**: Open a draft PR → GitHub Actions runs `ci` job → lint, type-check, and health test all pass; intentionally break a lint rule → CI fails and blocks merge

---

## Phase 2: GitHub Actions — CD Workflow (Render)

- [ ] T004 Create `.github/workflows/cd.yml`: trigger via `workflow_run` on the `CI` workflow with `types: [completed]`; add a condition `github.event.workflow_run.conclusion == 'success'` so CD only runs when CI passes; define job `deploy` running on `ubuntu-latest`; steps: checkout repo, call Render deploy hook via `curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}"` (Render generates a deploy hook URL per service): `.github/workflows/cd.yml`

- [ ] T005 Add required GitHub repository secrets (document in `.github/SECRETS.md` — values are set manually in repo Settings → Secrets): `RENDER_DEPLOY_HOOK_URL` (backend service deploy hook from Render dashboard), `DATABASE_URL` (Render PostgreSQL internal URL), `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`; add optional `RENDER_DEPLOY_HOOK_FRONTEND_URL` if frontend is a separate Render service: `.github/SECRETS.md`

- [ ] T006 Create `render.yaml` (Render Blueprint) at repo root defining two services: `backend` (type: web, runtime: docker, dockerfilePath: backend/Dockerfile, plan: free, envVars referencing `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PORT=3000`) and `frontend` (type: web, runtime: docker, dockerfilePath: frontend/Dockerfile, plan: free, envVars `NGINX_BACKEND_URL` pointing to the backend service internal URL — no `VITE_API_URL`; frontend code uses relative `/api` path and nginx proxies it at runtime); add a `databases` section for a free-tier PostgreSQL 15 instance named `suger-db`: `render.yaml`

**Checkpoint**: Merge a passing PR to `main` → CD workflow fires → Render redeploys backend and frontend automatically; confirm `GET <render-backend-url>/api/v1/health` returns 200

---

## Phase 3: Docker Production Hardening

- [ ] T007 Update `frontend/Dockerfile` to use a multi-stage build: stage 1 (`builder`) installs deps and runs `pnpm build`; stage 2 (`runner`) uses `nginx:alpine`, copies `dist/` from builder into `/usr/share/nginx/html`, copies a custom `nginx.conf` that serves `index.html` for all routes (SPA fallback) and proxies `/api` to the backend service URL via env-substituted `NGINX_BACKEND_URL`; expose port 80: `frontend/Dockerfile`, `frontend/nginx.conf`

- [ ] T008 Verify `backend/Dockerfile` uses a multi-stage build: stage 1 compiles TypeScript (`pnpm build`); stage 2 copies only `dist/` and `node_modules` (production only via `pnpm install --prod`), runs `node dist/server.js`; ensure `ENTRYPOINT` runs `pnpm exec prisma migrate deploy` before starting the server so migrations run automatically on each deploy: `backend/Dockerfile`, `backend/entrypoint.sh`

**Checkpoint**: `docker build -f frontend/Dockerfile .` and `docker build -f backend/Dockerfile .` both succeed; production images are smaller than dev images (no devDependencies, no source files)

---

## Clarifications

### Session 2026-05-08

- Q: Should `cd.yml` use `workflow_run` trigger (separate files) or merge CI+CD into one file using `needs:`? → A: `workflow_run` trigger in a separate `cd.yml` file
- Q: How should CI provide a database for backend tests? → A: PostgreSQL service container in `ci.yml` with `DATABASE_URL` env var passed to the test step
- Q: Should the frontend use `VITE_API_URL` (build-time) or relative `/api` path proxied by nginx (runtime)? → A: Remove `VITE_API_URL`; frontend calls relative `/api`; nginx proxies to backend via `NGINX_BACKEND_URL`

---

## Dependencies Within EPIC-009

- Phase 1 (CI): No dependencies within epic — start immediately; T001 ‖ T002 in parallel; T003 after T001
- Phase 2 (CD): Requires Phase 1 CI workflow running; T004 → T005 → T006 sequential
- Phase 3 (Docker): Independent of Phase 2; T007 ‖ T008 in parallel

## Parallel Execution Guide

```
Day 1 AM:
  T001 ‖ T002   (CI workflow + Jest smoke test — parallel)
  → T003        (branch protection docs)

Day 1 PM:
  T007 ‖ T008   (frontend Nginx multi-stage ‖ backend prod Dockerfile — parallel)

Day 2 AM:
  T004          (CD workflow)
  → T005        (secrets documentation)
  → T006        (render.yaml blueprint)
```
