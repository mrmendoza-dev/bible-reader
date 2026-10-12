# Repo modernization

- April 14, 2026 (updated April 18, 2026)

This document describes the **shift in paradigms** for this template: from a Node- and 2020-era JS toolchain to a Bun-first, web-standards stack with React 19. It is not an exhaustive file manifest—use git history for line-by-line diffs.

---

## What we moved away from (legacy)

| Concern | Old pattern |
| --- | --- |
| Runtime & installs | Node as the default runtime; npm-centric config (e.g. npm-only flags in `.npmrc`). |
| Frontend | React 18–style assumptions; older bundler ergonomics; heavier Tailwind v3 + big `tailwind.config` workflows. |
| UI primitives | Radix as the default headless layer behind shadcn-style components. |
| API & data | Express-style Node servers, hand-rolled JS entrypoints, and ad hoc SQL or no migration story. |
| Frontend data | `useEffect` + `fetch` for server state, or ad hoc caching. |
| Quality | Split ESLint + Prettier (and plugins) for lint vs format. |
| Multi-task dev | Shell glue or **concurrently**-style “run two processes” without a real task graph or cache. |

---

## What we standardized on (current)

| Concern | New pattern |
| --- | --- |
| Runtime & installs | **Bun 1.3+** as package manager and runtime: fast startup, native TS/JSX, `packageManager` pinned in `package.json`. |
| Frontend | **React 19** + **Vite 8** (Rolldown-era bundling, fast HMR, `ref` as a normal prop where applicable). |
| Styling | **Tailwind v4** via Vite plugin: CSS-first `@import "tailwindcss"`, `@theme` / variables, optional `tailwindDirectives` in Biome—no mandatory fat Tailwind config file. |
| UI primitives | **Base UI** under the hood for shadcn “base-nova” style components (`@base-ui/react`). |
| API & data | **Elysia** on Bun: composable app (`server/app.ts`), typed `App` export, CORS, routes as modules—**not** Express. **Eden** (`@elysiajs/eden` Treaty client in `src/lib/api-client.ts`) uses that type for end-to-end calls (`VITE_API_URL`). **Drizzle ORM** with **Bun `bun:sqlite`**: schema in `server/db/schema.ts`, migrations in `server/db/migrations/`, `drizzle.config.ts` at repo root; default file DB under `data/dev.db` (override with `DATABASE_PATH`). |
| Frontend data | **TanStack Query** (`@tanstack/react-query`): shared `QueryClient` in `src/lib/query-client.ts`, `QueryClientProvider` in `src/contexts/Providers.tsx`—use for server state, cache, and request lifecycle (Eden/fetch in `queryFn`). |
| Quality | **Biome** single toolchain: `biome check`, `biome ci`, import organize, React rules domain. |
| CI / orchestration | **Turborepo** for `lint` / `test` / `build` (and parallel dev + server): cache, task graph, prefixed logs—**no** leftover concurrently dependency. |

---

## How the repo reflects that (high level)

- **Server:** TypeScript-only tree (`server/*.ts`): factory for the Elysia app, env helpers, typed routes; **Drizzle** client + migrator wired from `server/db`; entry listens with Bun and runs migrations before serving.
- **Client:** Vite + React 19; global styles consolidated through a v4-oriented CSS entry (e.g. `src/styles/index.css`) plus existing base/theme layers where still useful; **TanStack Query** wraps the app for data fetching (see `HomePage` health strip as a minimal example).
- **Components:** Expanded shadcn/ui kit under `src/components/ui/`, aligned with Base UI and Tailwind v4 tokens. Recoverable render errors are caught with **`react-error-boundary`** in `@/components/feedback/ErrorBoundary` (fallback [`ErrorGeneric`](../src/components/feedback/ErrorGeneric.tsx) + [`ErrorScreenShell`](../src/components/feedback/ErrorScreenShell.tsx)); React Router loader/render errors at the shell still use `errorElement` → [`RouteErrorPage`](../src/pages/RouteErrorPage.tsx).
- **Tests:** Vitest + Testing Library; Bun-oriented preloads where needed; server tests under `tests/server/` (Drizzle + SQLite uses **`bun:test`** in `*.bun.test.ts` because Vitest’s bundle does not load `bun:sqlite`; `npm test` / `bun run test` runs Vitest then those Bun tests).
- **Docs:** Changelog and this spec live under `docs/` (root changelog narrative retired in favor of `docs/CHANGELOG.md`).

Legacy editor-only or npm-only artifacts (old ESLint config, npmrc quirks, ad hoc VS Code task files) were dropped in favor of **scripts + Biome + Turbo**.

---

## Client routing and layout

The client uses **React Router** with a clear split between **where the router is mounted**, **where routes are declared**, and **where chrome around pages lives**.

1. **`src/App.tsx`** — Wraps the tree in `Providers` and the root **`ErrorBoundary`** (`react-error-boundary` via `@/components/feedback/ErrorBoundary`), then renders **`RouterProvider`** with **`router`** imported from `@/Router`. The router is not defined inline here; this file only wires the provider.

2. **`src/Router.tsx`** — **Defines the route tree** (`appRoutes`) and exports **`router`** via **`createBrowserRouter`**. It **imports `AppShell`** from `@/layouts/AppShell` and sets it as the **element for the `/` route**; nested routes (home index, lazy pages, dev-only routes in development) are **`children`** of that route. **`errorElement`** (e.g. `RouteErrorPage`) is attached at the shell level as needed. Keeping **`AppShell` in the router** makes the URL map explicit: one place lists paths and which layout wraps them.

3. **`src/layouts/`** — **Route-level shells**: named exports like **`AppShell`** describe a full-app frame (sidebar, nav, providers that only wrap routed content). Shells **compose pieces from `@/components/layout`** (e.g. navbar, sidebar) and **`@/components/ui`** as needed, and render **`<Outlet />`** from `react-router-dom` where **child route components** mount. Add another file in this folder when you need a different shell (marketing, auth-only, minimal).

**Flow in short:** `main.tsx` → **`App`** → **`RouterProvider(router)`** → root route renders **`AppShell`** → **`Outlet`** shows the matched child page.

---

## Repository file trees

**New (modernized) layout** — the structure this template standardizes on after migration: Bun + Elysia `server/`, Vite + React `src/`, Drizzle + SQLite, Turborepo, and Vitest/Bun tests.

**Current layout** — as of April 15, 2026 the checkout matches that layout. The tree below lists **source and repo-tracked config** only. It omits install/build/cache dirs (`node_modules/`, `dist/`, `.turbo/`) and gitignored locals such as `data/*.db` (created when you run the API/migrations with the default `DATABASE_PATH`).

```text
.
├── biome.json
├── bun.lock
├── bunfig.toml
├── components.json
├── docs/
│   ├── CHANGELOG.md
│   └── REPO-MODERNIZATION.md
├── drizzle.config.ts
├── index.html
├── package.json
├── public/
│   ├── _redirects
│   ├── favicon/                    # png, ico, etc.
│   ├── images/
│   └── robots.txt
├── server/
│   ├── app.ts
│   ├── env.ts
│   ├── index.ts
│   ├── db/
│   │   ├── index.ts
│   │   ├── schema.ts
│   │   └── migrations/
│   │       ├── 0000_mature_roulette.sql
│   │       └── meta/               # Drizzle journal + snapshots
│   ├── routes/
│   │   ├── examples.ts
│   │   └── index.ts
│   └── utils/
│       ├── helpers.ts
│       └── index.ts
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── register-sw.ts
│   ├── Router.tsx
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── common/                 # e.g. file-uploader, theme-toggle, eye-dropper
│   │   ├── dev/                    # DevErrorTriggers
│   │   ├── feedback/               # ErrorBoundary (react-error-boundary), ErrorGeneric, ErrorScreenShell, …
│   │   ├── layout/                 # AppSidebar, Navbar, PageTransition
│   │   └── ui/                     # shadcn-style kit (many *.tsx; see repo)
│   ├── contexts/                   # Providers, Theme, Application
│   ├── hooks/
│   ├── layouts/
│   │   └── AppShell.tsx
│   ├── lib/
│   │   ├── api-client.ts           # Eden Treaty client
│   │   ├── query-client.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── ChatPage.tsx
│   │   ├── DetailPage.tsx
│   │   ├── DevErrorBoom.tsx
│   │   ├── HomePage.tsx
│   │   ├── ProfilePage.tsx
│   │   └── RouteErrorPage.tsx
│   ├── styles/
│   │   ├── index.css
│   │   ├── base/
│   │   ├── components/
│   │   └── themes/
│   └── utils/
├── tests/
│   ├── bun-test-preload-dom.ts
│   ├── bun-test-preload-testing-library.ts
│   ├── setup-tests.ts
│   ├── components/
│   │   ├── app-shell.test.tsx
│   │   ├── home-page.test.tsx
│   │   ├── routes.test.tsx
│   │   └── ui-smoke.test.tsx
│   ├── server/
│   │   ├── api.test.ts
│   │   ├── db.bun.test.ts          # bun:test + bun:sqlite
│   │   └── helpers.test.ts
│   └── utils/
│       └── format.test.ts
├── tsconfig.json
├── turbo.json
└── vite.config.ts
```

Root files not shown above: `.env.example` (copy to `.env` locally).

---

## Optional next steps (not required for “modern” baseline)

- **React Compiler:** enable when you want less manual memoization; stack is already on React 19.

---

## Related

- [CHANGELOG.md](./CHANGELOG.md) — release-oriented notes.
