

# README Changelog
Log of major changes to integrate into previous projects building with this template

## v2.0.0

Stack alignment with [REPO-MODERNIZATION.md](./REPO-MODERNIZATION.md) (April 2026). Summary of what this generation of the template targets versus legacy Node / React 18 / ESLint-era setups:

- **Bun 1.3+** — Runtime and package manager; TypeScript and JSX as first-class paths; scripts and local tooling default to Bun.
- **React 19 and Vite 8** — Current frontend baseline (native `ref` prop, fast HMR and builds on Vite 8 / Rolldown-oriented pipeline).
- **Tailwind CSS v4** — CSS-native theming (`@theme`, variables), Lightning CSS, lighter config surface than v3.
- **ElysiaJS** — Bun-oriented HTTP API layer replacing Express-style stacks; web-standard request/response model.
- **Eden** (`@elysiajs/eden`) — Treaty client wired in `src/lib/api-client.ts` with `import type { App }` from `server/app` and `VITE_API_URL` for the server origin.
- **Base UI** — Component primitive direction aligned with React 19 (replaces Radix-first assumptions in older templates).
- **Turborepo** — Cached, parallel `lint` / `test` / `build` (and dev/server orchestration) instead of ad hoc parallel shell scripts.
- **Biome** — Single lint + format + import assist toolchain; replaces ESLint, `@typescript-eslint/*`, and formatting-only Prettier; Tailwind v4 directives supported in CSS via Biome parser options.
- **Drizzle ORM** — SQL schema and migrations (`server/db/`, `drizzle.config.ts`); default SQLite via `bun:sqlite`, `DATABASE_PATH` for location; scripts `db:generate`, `db:push`, `db:studio`.
- **TanStack Query** — `@tanstack/react-query` with a shared client (`src/lib/query-client.ts`) and provider in `src/contexts/Providers.tsx` for server state and Eden-backed `queryFn`s.

## v2.2.0

- **`react-error-boundary`** — Root and shell error boundaries (`src/App.tsx`, `src/layouts/AppShell.tsx`) use the library’s `ErrorBoundary` with `fallbackRender` and `onError` (ready for Sentry). `ErrorGeneric` and `ErrorScreenShell` under `src/components/feedback/` remain the UI layer; the custom class boundary was replaced by a thin wrapper around the library in `ErrorBoundary.tsx`.

## v2.1.0

Incremental polish on the v2 stack: data layer and client state are exercised end-to-end, and routing follows the React Router data-router layout pattern.

- **Drizzle** — Example `examples` SQLite schema and `/api/examples` wired from `server/`; dev DB path via `DATABASE_PATH` / `data/dev.db` with parent dir creation on first run; migrations run at server start.
- **TanStack Query** — Home (and future pages) use shared `QueryClient` + `useQuery` against Eden (`api.api.health`, `api.api.examples`) for live server-backed UI.
- **Routing** — `createBrowserRouter` / `RouterProvider` with `src/Router.tsx`, `export const appRoutes` for tests, `src/layouts/AppShell.tsx` + `<Outlet />`, route-level `lazy` for secondary pages, and `errorElement` for branch errors; Vite dev proxy for `/api` with `SERVER_PORT` / optional `VITE_API_URL` (no hardcoded API port in the client).


## v1.1.0
- Added README-Changelog.md
- Added boilerplate/
    - In Progress
- Added tests/ for testing with Vitest

## v1.0.0

- Initial release