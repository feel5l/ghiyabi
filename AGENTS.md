# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Ghiyabi (غيابي) is a school attendance tracking system — a pnpm workspace monorepo with a React/Vite frontend (`artifacts/ghiyabi`) that talks directly to Supabase (PostgreSQL + Auth + RLS). The `api-server` and `mockup-sandbox` are scaffolded/optional and not required to run the main product.

### Prerequisites

- **Node.js 22+** and **pnpm 10+** are required.
- The repo enforces pnpm via a `preinstall` script — `npm install` and `yarn install` will fail.

### Environment Variables

The frontend requires a `.env` file at `artifacts/ghiyabi/.env` with:
```
VITE_SUPABASE_URL=<supabase project url>
VITE_SUPABASE_ANON_KEY=<supabase anon key>
```
See `artifacts/ghiyabi/.env.example` for the template. These can be obtained from the Supabase MCP tools (`get_project_url` and `get_publishable_keys` with project ID `mbkwjmbjfcgqscecnlrv`).

### Key Commands

| Task | Command |
|---|---|
| Install deps | `pnpm install` |
| Typecheck | `pnpm run typecheck` |
| Build (ghiyabi only) | `pnpm --filter @workspace/ghiyabi build` |
| Dev server (ghiyabi) | `pnpm --filter @workspace/ghiyabi dev` |
| Full build (may fail for mockup-sandbox without PORT env) | `pnpm run build` |

### Gotchas

- **`pnpm run build` (root)** will fail if `PORT` env var is not set, because `mockup-sandbox` requires it. Use `pnpm --filter @workspace/ghiyabi build` to build only the main app.
- The `pnpm-workspace.yaml` has `onlyBuiltDependencies` configured for `@swc/core`, `esbuild`, `msw`, and `unrs-resolver`. Do not run `pnpm approve-builds` (interactive) — the allowlist is already configured.
- The database schema is at `artifacts/ghiyabi/supabase/schema.sql` and seed data at `supabase/seed.sql`. These are applied directly via the Supabase SQL Editor or MCP `execute_sql` tool, not via Drizzle migrations.
- The `lib/db` (Drizzle ORM) package has an empty schema — the app uses the Supabase JS client directly, not Drizzle.
- No lint command is configured in `package.json` scripts. Prettier is available (`npx prettier --check .`).
