# Bible Reader

Web app for reading, searching, bookmarking, and studying the Bible. Built with **React 19**, **Vite 8**, **Tailwind CSS v4**, and **Bun**. Optional **Elysia** API + **Drizzle/SQLite** for server-backed features; the Bible UI can run client-only as integration progresses (see `BIBLE-STANDALONE-PLAN.md`).

## Quick start

```bash
bun install
bun run start   # Vite (port 3000) + API server (default 3030)
```

| Script | Purpose |
| --- | --- |
| `bun run dev` | Frontend only |
| `bun run server` | Bun API only |
| `bun run build` | Production build → `dist/` |
| `bun run test` | Vitest + Bun server tests |
| `bun run lint` | Biome check |

## Layout

- `src/` — App shell, routing, shared UI
- `bible-app/` — Bible feature module (migration in progress)
- `server/` — Elysia API and Drizzle schema
- `public/images/logo.png` — App logo and PWA/OG asset

## Environment

| Variable | Purpose |
| --- | --- |
| `SERVER_PORT` / `PORT` | API listen port (default `3030`) |
| `VITE_API_URL` | Direct API origin; if unset, dev uses `/api` proxy |
| `DATABASE_PATH` | SQLite file (default `data/dev.db`) |
