# Quickstart: Time Reporting System

**Date**: 2026-05-06 | **Plan**: [plan.md](plan.md)

---

## Prerequisites

- Node.js 20+
- PostgreSQL 16
- pnpm (or npm/yarn)

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd time-reporting-system

# Install backend dependencies
cd backend && pnpm install && cd ..

# Install frontend dependencies
cd frontend && pnpm install && cd ..
```

---

## 2. Configure Environment

### Backend (`backend/.env`)

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/time_reporting"
JWT_ACCESS_SECRET="change-me-access-secret"
JWT_REFRESH_SECRET="change-me-refresh-secret"
JWT_ACCESS_EXPIRES_IN="2h"
JWT_REFRESH_EXPIRES_IN="30d"
UPLOAD_DIR="./uploads/absence-docs"
PORT=3000
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3000
```

---

## 3. Database Setup

```bash
cd backend

# Run migrations
pnpm prisma migrate dev --name init

# Seed admin user (email: admin@company.com, password: Admin1234!)
pnpm prisma db seed
```

---

## 4. Start Development Servers

```bash
# Terminal 1 — Backend (port 3000)
cd backend && pnpm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend && pnpm run dev
```

Open http://localhost:5173 — login with `admin@company.com` / `Admin1234!`

---

## 5. First-Time Setup Flow

1. **Admin logs in** → creates employees and team leads
2. **Admin creates clients → projects → tasks**
3. **Team lead or admin assigns employees to tasks**
4. **Employees can now log in and submit daily work reports**

---

## 6. Running Tests

```bash
# Backend unit + e2e tests
cd backend && pnpm test && pnpm test:e2e

# Frontend component tests
cd frontend && pnpm test
```

---

## 7. Key API Endpoints (summary)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login — returns access + refresh tokens |
| POST | `/auth/refresh` | Rotate tokens |
| GET | `/tasks/assigned` | Tasks available to current user for reporting |
| POST | `/reports` | Submit time report |
| GET | `/reports/monthly-status` | Monthly calendar status |
| POST | `/absences` | Submit absence report |
| POST | `/absences/:id/document` | Upload supporting document |
| POST | `/timer/start` | Start workday timer |
| POST | `/timer/stop` | Stop timer + get pre-fill data |
| POST | `/months/:year/:month/lock` | Admin: lock reporting month |

Full API reference: [contracts/api.md](contracts/api.md)
