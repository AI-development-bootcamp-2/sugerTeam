# Time Reporting System

A full-stack time and absence reporting platform for teams. Employees log daily work hours against clients, projects, and tasks; team leads and admins manage assignments, lock months, and audit activity.

Built as a TypeScript monorepo with a React + Vite frontend and a Node.js + Express + Prisma backend on PostgreSQL.

> Built as part of [**Abra's AI-First Software Development BootCamp**](https://abrait.co.il/ai-bootcamp/), following a **spec-driven development** workflow with [**GitHub Spec Kit**](https://github.com/github/spec-kit) — every feature starts as a written spec, plan, and task list before any code is written. Sprint planning, ticketing, and team workflow were managed in [**JIRA (SCRUM board)**](https://guy3102.atlassian.net/jira/software/projects/SCRUM/summary).

---

## Features

- **Daily time reporting** — log hours per client / project / task with overlap detection and a 9-hour daily target indicator.
- **Live timer** — start/stop a working timer and convert elapsed time into a report entry.
- **Absence management** — vacation, sick leave, military reserve, and other absences with partial-day support, weekend exclusion, and supporting-document uploads.
- **Monthly view** — calendar of completeness status (Complete / Missing / Exceptional) per day.
- **Admin console** — manage users, clients, projects, tasks, and task assignments.
- **Month locking** — admins lock past months to freeze reporting; reopening is auditable.
- **Audit log** — tracks updates and deletions on reports, time entries, and absences.
- **Role-based access** — `EMPLOYEE`, `TEAM_LEAD`, `ADMIN` roles enforced server-side.
- **JWT auth** — short-lived access tokens + rotating refresh tokens stored in httpOnly cookies.

---

## Tech Stack

**Backend**
- Node.js 20, Express 4, TypeScript
- Prisma 5 ORM on PostgreSQL 15
- Zod request validation
- JWT auth (access + refresh) with bcrypt password hashing
- Multer for file uploads
- Jest + Supertest for unit and E2E tests

**Frontend**
- React 19 + Vite + TypeScript
- React Router v6
- Zustand (global state) + TanStack React Query (server state)
- React Hook Form + Zod
- Axios
- TailwindCSS

**Tooling**
- pnpm workspaces (monorepo)
- ESLint + Prettier
- GitHub Actions CI (lint, type-check, tests against a Postgres service)
- Docker Compose for local orchestration

---

## Project Structure

```
sugerTeam/
├── backend/                    # Express API
│   ├── prisma/                 # Schema, migrations, seeds
│   ├── src/
│   │   ├── routes/             # Thin route handlers (auth, users, clients, projects, tasks, timeEntries, timers, absences, monthLocks, taskAssignments)
│   │   ├── services/           # Business logic
│   │   ├── middleware/         # Auth, error handling, validation
│   │   ├── lib/                # Shared helpers
│   │   ├── app.ts              # Express app + routing
│   │   └── server.ts           # Entry point
│   └── Dockerfile
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── pages/              # Login, dashboard, time-report, absences, reports, admin
│   │   ├── components/         # Shared UI (Modal, ConfirmDialog, ProtectedRoute, …)
│   │   ├── services/           # API clients
│   │   ├── store/              # Zustand stores
│   │   └── router.tsx
│   └── Dockerfile
├── docs/                       # Feature specs and task breakdowns
├── specs/                      # Spec-kit artifacts (spec.md, plan.md, tasks.md, data-model.md, contracts, …)
├── .specify/                   # Spec Kit configuration, templates, and workflows
├── docker-compose.yml
└── pnpm-workspace.yaml
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **pnpm** 10.33.4 (`corepack enable && corepack prepare pnpm@10.33.4 --activate`)
- **PostgreSQL** 15+ (or use the Docker Compose setup below)

### 1. Clone and install

```bash
git clone https://github.com/AI-development-bootcamp-2/sugerTeam.git
cd sugerTeam
pnpm install
```

### 2. Configure environment

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Required keys:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Long random strings, **must differ** |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | e.g. `2h` and `30d` |
| `CLIENT_URL` | Frontend origin for CORS (e.g. `http://localhost:5173`) |
| `VITE_API_URL` | Backend base URL the frontend hits |
| `UPLOAD_DIR` | Where absence-document uploads land |
| `PORT` | Backend port (default `3000`) |

### 3. Initialize the database

```bash
pnpm --filter backend exec prisma migrate deploy
pnpm --filter backend exec prisma db seed
```

### 4. Run in development

In two terminals:

```bash
pnpm dev:backend     # http://localhost:3000
pnpm dev:frontend    # http://localhost:5173
```

Health check: `GET http://localhost:3000/api/v1/health`

---

## Running with Docker

The repo ships with a `docker-compose.yml` that boots Postgres, the backend, and the frontend together — no local Node or Postgres install required.

### Start everything

```bash
docker compose up --build
```

This will:

1. Spin up **PostgreSQL 15** on host port `5434` (mapped from container `5432`) with a named `pgdata` volume.
2. Build and start the **backend** on `http://localhost:3000`, automatically running `prisma migrate deploy` and `prisma db seed` via `backend/entrypoint.sh`.
3. Build and start the **frontend** on `http://localhost:5173`.

The backend waits for the database health check to pass before booting, so `up` is safe to run from cold.

### Common commands

```bash
docker compose up -d --build       # detached
docker compose logs -f backend     # tail backend logs
docker compose exec backend sh     # shell into the API container
docker compose down                # stop containers (keeps volumes)
docker compose down -v             # stop and wipe the database volume
```

### Environment in Docker

Docker Compose reads variables from your local `.env` and falls back to sensible defaults (`DB_USER=postgres`, `DB_PASSWORD=postgres`, `DB_NAME=time_reporting`, dev JWT secrets). **Override the JWT secrets in any non-local environment.**

### Volumes

- `pgdata` — Postgres data, survives container restarts.
- `backend_uploads` — absence-document uploads (`/app/backend/uploads`).
- Source folders (`backend/src`, `backend/prisma`, `frontend/src`, `frontend/index.html`) are bind-mounted for live reload during development.

---

## Deployment

The project ships with a GitHub Actions workflow (`.github/workflows/deploy.yml`) that deploys on every push to `main`:

- **Frontend → Vercel** (project linked under `.vercel/project.json`)
- **Backend → Render** (triggered via a deploy hook)

### Frontend (Vercel)

The frontend is a standard Vite SPA and deploys cleanly to Vercel.

1. Import the repo at <https://vercel.com/new> with the `frontend/` directory as the project root, **or** use the Vercel CLI:
   ```bash
   npm i -g vercel
   vercel link
   vercel pull --environment=production
   vercel build --prod
   vercel deploy --prebuilt --prod
   ```
2. Set environment variables in the Vercel project:
   - `VITE_API_URL` — public URL of the deployed backend (e.g. `https://api.your-domain.com`).
3. The CI workflow consumes these repo secrets:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`

### Backend (Render or any Node host)

The backend is a plain Node + Express app and runs anywhere Node 20 runs (Render, Fly, Railway, a VPS, etc.).

**Build command**

```bash
pnpm install --frozen-lockfile
pnpm --filter backend build      # prisma generate && tsc && tsc-alias
```

**Start command**

```bash
pnpm --filter backend exec prisma migrate deploy
pnpm --filter backend start
```

**Required env vars in production**

```
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=<32+ random bytes>
JWT_REFRESH_SECRET=<32+ random bytes, different from access>
JWT_ACCESS_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=30d
CLIENT_URL=https://your-frontend-domain
UPLOAD_DIR=./uploads/absence-docs
PORT=3000
```

The CI workflow re-deploys the backend by curling a `RENDER_DEPLOY_HOOK` secret. Swap that step for your host's equivalent (Fly `flyctl deploy`, Railway `railway up`, etc.) if you're not on Render.

### Database

Provision any managed PostgreSQL 15+ instance (Neon, Supabase, Render Postgres, RDS, …) and point `DATABASE_URL` at it. Migrations run on every backend start via `prisma migrate deploy`.

### Production deployment with Docker

If you'd rather host the whole stack yourself, the included `Dockerfile`s build production-ready images. The bundled `docker-compose.yml` is tuned for development (bind mounts, `pnpm dev`); for production deploys, build the images and run them behind a managed Postgres without the source-code bind mounts.

---

## API Overview

All routes are prefixed with `/api/v1`.

| Resource | Path | Notes |
| --- | --- | --- |
| Auth | `/auth` | Login, refresh, logout, password change |
| Users | `/users` | Admin user management |
| Clients | `/clients` | Admin-managed |
| Projects | `/projects` | Belong to a client |
| Tasks | `/tasks` | Belong to a project |
| Task Assignments | `/task-assignments` | Map users to tasks |
| Time Entries | `/time-entries` | Daily report entries |
| Timers | `/timers` | Live start/stop timer per user |
| Absences | `/absences` | Vacation, sick leave, etc., with document upload |
| Month Locks | `/month-locks` | Admin month-locking |
| Health | `/health` | Liveness probe |

---

## Scripts

From the repo root:

```bash
pnpm dev:backend                       # ts-node-dev with hot reload
pnpm dev:frontend                      # Vite dev server
pnpm build                             # Build backend (prisma generate + tsc)
pnpm start                             # Run compiled backend
```

Per workspace:

```bash
pnpm --filter backend test             # Jest unit tests
pnpm --filter backend test:e2e         # Jest E2E suite
pnpm --filter backend lint
pnpm --filter frontend test            # Vitest
pnpm --filter frontend lint
pnpm --filter frontend build           # Type-check + Vite build
```

---

## Testing

- **Backend** — Jest + Supertest, located in `backend/src/__tests__`. New backend features must include a Jest test.
- **Frontend** — Vitest + React Testing Library, located in `frontend/src/__tests__`.
- **CI** — `.github/workflows/ci.yml` runs lint, type-check, and tests in parallel against a Postgres service container on every PR to `main` or `dev`.

---

## Coding Conventions

See [`CLAUDE.md`](./CLAUDE.md) for the full set. Highlights:

- `import type` for type-only imports (frontend enforces this via `verbatimModuleSyntax`).
- No `any` — use `unknown` + type guards. Custom error classes carry a `status`.
- `camelCase` for utility/service files, `PascalCase` for React components.
- Zod validates every backend request body.
- Backend keeps routes thin — business logic lives in `src/services/`.
- All API routes under `/api/v1`.
- Tailwind for all styling; no ad-hoc CSS modules.

---

## Methodology

This project was developed using **spec-driven development** with [**GitHub Spec Kit**](https://github.com/github/spec-kit). Each feature was scoped through a written specification before implementation: a `spec.md` describing the *what* and the *why*, a `plan.md` describing the *how*, and a `tasks.md` breaking the work into dependency-ordered units. The resulting artifacts live in [`specs/`](./specs/) and [`.specify/`](./.specify/), and they served as the source of truth for every implementation decision — AI-assisted or otherwise.

## Acknowledgments

- **[Abra's AI-First Software Development BootCamp](https://abrait.co.il/ai-bootcamp/)** — the program this project was built under, exploring how AI tooling reshapes the full software delivery lifecycle.
- **[GitHub Spec Kit](https://github.com/github/spec-kit)** — the spec-driven development toolkit that structured every feature from idea → spec → plan → tasks → code.
- **[JIRA — SCRUM board](https://guy3102.atlassian.net/jira/software/projects/SCRUM/summary)** — sprint planning, backlog grooming, and ticket tracking throughout the build.

---

## License

Private project. All rights reserved.
