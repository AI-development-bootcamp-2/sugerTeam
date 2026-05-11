# Frontend Setup — T003 & T005 Task Breakdown

**Epic**: EPIC-001 — Foundation & Authentication  
**Phase**: 1 — Project Setup  
**Branch**: `frontend-setup`  
**Prepared**: 2026-05-07

---

## Overview

This document breaks down two tasks from Phase 1 into small, manually executable steps.

| Task | Title | Depends on |
|------|-------|------------|
| T003 | Scaffold frontend (React 18 + Vite + TypeScript) | T001 (monorepo root) |
| T005 | Configure frontend ESLint, Prettier, Tailwind CSS 3, `@` alias | T003 |

> **Prerequisites**: T001 must be complete — `pnpm-workspace.yaml` and root `.gitignore` must already exist before starting T003.

---

## T003 — Scaffold Frontend (React 18 + Vite + TypeScript)

**Goal**: Create the `frontend/` package using Vite's official `react-ts` template and verify the generated files are correct.

---

### T003-1 · Run the Vite scaffold command

**Location**: project root (next to `backend/`, `pnpm-workspace.yaml`)

**Command**:
```bash
pnpm create vite@latest frontend -- --template react-ts
```

**What it does**: Creates the `frontend/` directory with a pre-wired React 18 + TypeScript + Vite project.

**Expected files created**:
```
frontend/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── index.html
├── public/
│   └── vite.svg
└── src/
    ├── App.tsx
    ├── App.css
    ├── index.css
    ├── main.tsx
    ├── vite-env.d.ts
    └── assets/
        └── react.svg
```

**Validation**:
- `frontend/package.json` exists and contains `"name": "frontend"` (or similar)
- `frontend/vite.config.ts` exists
- `frontend/tsconfig.json` exists
- `frontend/tsconfig.node.json` exists
- `frontend/index.html` exists

---

### T003-2 · Verify `package.json` contents

**File**: `frontend/package.json`

Confirm these fields are present after scaffolding:

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  }
}
```

> The Vite template ships with a basic ESLint config and scripts. T005 will extend them. No manual edits needed here.

**Validation**: Open `frontend/package.json` and confirm the `"scripts"` block has `dev`, `build`, `lint`, `preview`.

---

### T003-3 · Verify `vite.config.ts` baseline

**File**: `frontend/vite.config.ts`

The generated file should look like:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

> No changes needed at this step. T005 will add the `@` path alias here.

**Validation**: File exists and imports `@vitejs/plugin-react`.

---

### T003-4 · Verify TypeScript config

**File**: `frontend/tsconfig.json`

Confirm `"strict": true` is present under `compilerOptions`. The Vite template sets this by default, but verify it explicitly.

**Validation**: `tsconfig.json` contains `"strict": true`.

---

### T003-5 · Install frontend dependencies

**Location**: `frontend/` directory

**Command** (from project root):
```bash
pnpm --filter frontend install
```

**Expected result**: `frontend/node_modules/` is created. No errors in output.

**Validation**:
- `frontend/node_modules/` exists
- `pnpm --filter frontend run dev` starts without errors (Ctrl+C to stop after confirming)

---

### T003 Checkpoint

| Check | Expected |
|-------|----------|
| `frontend/package.json` exists | ✅ |
| `frontend/vite.config.ts` exists | ✅ |
| `frontend/tsconfig.json` exists | ✅ |
| `pnpm --filter frontend run dev` starts without error | ✅ |
| Browser shows Vite + React default page at `http://localhost:5173` | ✅ |

**Suggested commit boundary**:
```
feat: scaffold frontend with Vite react-ts template (T003)
```
Files to stage: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/tsconfig.node.json`, `frontend/vite.config.ts`, `frontend/index.html`, `frontend/src/**`

---

## T005 — Configure ESLint, Prettier, Tailwind CSS 3, `@` Alias

**Goal**: Extend the scaffolded frontend with linting, formatting, Tailwind CSS, and a `@` path alias pointing to `src/`.

**Depends on**: T003 complete — `frontend/` exists and dependencies are installed.

---

### T005-1 · Install ESLint and Prettier dev dependencies

**Location**: project root

**Command**:
```bash
pnpm --filter frontend add -D \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint-config-prettier \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  prettier
```

> The Vite `react-ts` template already installs `eslint` and `@vitejs/eslint-plugin-react` but does not configure Prettier or `@typescript-eslint`. These packages extend linting with TypeScript-aware rules and disable ESLint rules that conflict with Prettier.

**Expected result**: All packages appear under `devDependencies` in `frontend/package.json` with no install errors.

**Validation**:
```bash
pnpm --filter frontend list | grep -E "typescript-eslint|prettier"
```
Should show the installed packages.

---

### T005-2 · Create `frontend/.eslintrc.json`

**File to create**: `frontend/.eslintrc.json`

```json
{
  "root": true,
  "env": {
    "browser": true,
    "es2022": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint", "react", "react-hooks"],
  "rules": {
    "react/react-in-jsx-scope": "off"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

> `"react/react-in-jsx-scope": "off"` is required for React 17+ JSX transform (Vite uses it by default).  
> `"prettier"` at the end of `extends` disables formatting rules that would conflict with Prettier.

**Validation**: File exists at `frontend/.eslintrc.json` and is valid JSON.

---

### T005-3 · Create `frontend/.prettierrc`

**File to create**: `frontend/.prettierrc`

```json
{
  "singleQuote": true,
  "semi": true,
  "printWidth": 100,
  "trailingComma": "es5",
  "tabWidth": 2
}
```

> Must match the backend `.prettierrc` settings for `singleQuote`, `semi`, and `printWidth` (configured in T004). `trailingComma: "es5"` is safe in all modern environments.

**Validation**: File exists at `frontend/.prettierrc` and is valid JSON.

---

### T005-4 · Update lint and format scripts in `frontend/package.json`

**File to update**: `frontend/package.json`

Locate the `"scripts"` section and ensure these entries are present (update the existing `"lint"` entry if it differs):

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
  "format": "prettier --write \"src/**/*.{ts,tsx,css}\""
}
```

> The Vite template may already have a `lint` entry — update it to include `--max-warnings 0` so CI fails on warnings. Add `format` if it does not exist.

**Validation**:
```bash
pnpm --filter frontend run lint
```
Should complete with no errors on the freshly scaffolded code.

---

### T005-5 · Install Tailwind CSS 3 and PostCSS dependencies

**Location**: project root

**Command**:
```bash
pnpm --filter frontend add -D tailwindcss@3 postcss autoprefixer
```

> Pinning `tailwindcss@3` is intentional — Tailwind v4 uses a different config format. The spec targets v3.

**Expected result**: `tailwindcss`, `postcss`, and `autoprefixer` appear in `devDependencies` of `frontend/package.json`.

**Validation**:
```bash
pnpm --filter frontend list | grep tailwindcss
```
Should show `tailwindcss 3.x.x`.

---

### T005-6 · Initialize Tailwind config

**Location**: `frontend/` directory

**Command**:
```bash
cd frontend && npx tailwindcss init -p --ts
```

Or from the project root:
```bash
pnpm --filter frontend exec tailwindcss init -p --ts
```

> The `-p` flag generates `postcss.config.js`. The `--ts` flag generates `tailwind.config.ts` (TypeScript) instead of `.js`.

**Expected files created**:
- `frontend/tailwind.config.ts`
- `frontend/postcss.config.js`

**Validation**: Both files exist.

Expected `postcss.config.js` content:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

---

### T005-7 · Configure Tailwind content paths in `tailwind.config.ts`

**File to update**: `frontend/tailwind.config.ts`

Replace the generated file content with:

```ts
import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
```

> The `content` array tells Tailwind which files to scan for class names. Without it, Tailwind generates no utility classes in production builds.

**Validation**: File contains `'./src/**/*.{ts,tsx}'` in the `content` array.

---

### T005-8 · Replace `frontend/src/index.css` with Tailwind directives

**File to update**: `frontend/src/index.css`

Replace the entire contents of `index.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

> Remove all existing boilerplate CSS from the Vite template (`:root` variables, `body` styles, etc.). This file becomes the Tailwind entry point only.

**Validation**: File contains only the three `@tailwind` directives and nothing else.

---

### T005-9 · Configure `@` path alias in `vite.config.ts`

**File to update**: `frontend/vite.config.ts`

Replace the file content with:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

> `path` is a Node.js built-in. `__dirname` is available here because `vite.config.ts` runs in a Node.js context, not the browser. Vite resolves this alias at build time.

**Validation**: File contains `alias: { '@': path.resolve(__dirname, './src') }`.

---

### T005-10 · Configure `@` alias in `tsconfig.json`

**File to update**: `frontend/tsconfig.json`

Add `baseUrl` and `paths` inside `compilerOptions` (merge with existing fields — do not replace the whole file):

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

> This must match the Vite alias exactly. Without it, TypeScript reports `Cannot find module '@/...'` errors even though Vite resolves the import correctly at runtime.

**Validation**: `tsconfig.json` contains both `"baseUrl": "."` and `"paths": { "@/*": ["src/*"] }`.

---

### T005 Checkpoint

Run all of the following and confirm each passes:

| Check | Command | Expected |
|-------|---------|----------|
| ESLint passes | `pnpm --filter frontend run lint` | No errors, no warnings |
| Prettier dry-run | `pnpm --filter frontend exec prettier --check "src/**/*.{ts,tsx}"` | All files match |
| Dev server starts | `pnpm --filter frontend run dev` | No errors; page loads at `http://localhost:5173` |
| Tailwind renders | Add `className="text-red-500"` to `App.tsx` temporarily, open browser | Text turns red |
| `@` alias resolves | Add `import type {} from '@/vite-env'` to `App.tsx` temporarily | No TypeScript error |

> Remove the temporary test changes to `App.tsx` after validating.

**Suggested commit boundary**:
```
feat: configure ESLint, Prettier, Tailwind CSS 3, and @ alias (T005)
```
Files to stage: `frontend/.eslintrc.json`, `frontend/.prettierrc`, `frontend/package.json`, `frontend/tailwind.config.ts`, `frontend/postcss.config.js`, `frontend/src/index.css`, `frontend/vite.config.ts`, `frontend/tsconfig.json`

---

## Full Dependency Map

```
T001 (monorepo root — pnpm-workspace.yaml)
  └─► T003 (scaffold frontend via pnpm create vite)
        ├── T003-1  run scaffold command
        ├── T003-2  verify package.json
        ├── T003-3  verify vite.config.ts
        ├── T003-4  verify tsconfig.json strict mode
        └── T003-5  install dependencies
              └─► T005 (ESLint + Prettier + Tailwind + @ alias)
                    ├── T005-1   install ESLint/Prettier dev deps
                    ├── T005-2   create .eslintrc.json
                    ├── T005-3   create .prettierrc
                    ├── T005-4   update lint/format scripts in package.json
                    ├── T005-5   install Tailwind CSS 3 deps
                    ├── T005-6   init tailwind config (generates files)
                    ├── T005-7   configure content paths in tailwind.config.ts
                    ├── T005-8   replace index.css with @tailwind directives
                    ├── T005-9   add @ alias in vite.config.ts
                    └── T005-10  add @ alias in tsconfig.json
```

---

## Files Summary

| File | Created by | Modified by |
|------|-----------|-------------|
| `frontend/package.json` | T003-1 (scaffold) | T005-1 (deps), T005-4 (scripts) |
| `frontend/vite.config.ts` | T003-1 (scaffold) | T005-9 (@ alias) |
| `frontend/tsconfig.json` | T003-1 (scaffold) | T005-10 (paths) |
| `frontend/tsconfig.node.json` | T003-1 (scaffold) | — |
| `frontend/index.html` | T003-1 (scaffold) | — |
| `frontend/src/index.css` | T003-1 (scaffold) | T005-8 (replace with Tailwind directives) |
| `frontend/.eslintrc.json` | T005-2 (new) | — |
| `frontend/.prettierrc` | T005-3 (new) | — |
| `frontend/tailwind.config.ts` | T005-6 (init) | T005-7 (content paths) |
| `frontend/postcss.config.js` | T005-6 (init) | — |
