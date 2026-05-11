# Project Standards: SugerTeam

## TypeScript & Logic
- **Imports:** Must use `import type` for types. Frontend enforces this via `verbatimModuleSyntax`; apply the same discipline in the backend.
- **Naming:**
  - Files: `camelCase` for utilities/logic/services, `PascalCase` for React components.
  - No interface prefix — use descriptive names (e.g., `AuthState`, not `IAuthState`).
- **Error Handling:** Never use `any`. Use `unknown` and type guards for errors. Use custom error classes with a `status` property; handle them in centralized error middleware in the backend.
- **Validation:** Use `zod` schemas in backend routes for request validation.
- **Verification:** Always mentally run `pnpm --filter backend exec tsc --noEmit` and `pnpm --filter frontend exec tsc --noEmit` before providing code solutions.

## Architecture
- **Backend:** Node.js + Express (TypeScript). Use Prisma for all database operations. Routes stay thin; business logic belongs in Services (`src/services/`).
- **Frontend:** React + Vite (TypeScript).
  - **Routing:** `react-router-dom` v6 for client-side routing.
  - **State:** `zustand` for global state with explicit interface definitions.
  - **Server State:** `@tanstack/react-query` for data fetching, caching, and server state.
  - **Forms:** `react-hook-form` for form handling.
  - **HTTP:** `axios` for API requests.
  - **Styling:** TailwindCSS for all styling. Use consistent spacing and responsive design.
- **API:** Use `/api/v1` prefix for all routes. Follow RESTful conventions.

## Workflow
- **Monorepo:** Respect workspace boundaries. Never import from `backend` to `frontend` directly.
- **Git:** Use descriptive commit messages. Atomic commits preferred.
- **Testing:** New backend features MUST include a Jest test in `src/__tests__`.
