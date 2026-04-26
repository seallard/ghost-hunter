# CLAUDE.md

## Project Summary

**ghost-hunter** is a web app which tracks job application stages and timelines, storing the specific resume, cover letter, and job description used for every submission.

## Project Structure

```
.
├── app/                          # App Router
│   ├── sign-in/[[...sign-in]]/   # Clerk hosted sign-in
│   ├── sign-up/[[...sign-up]]/   # Clerk hosted sign-up
│   ├── layout.tsx                # wraps tree in <ClerkProvider>
│   ├── page.tsx                  # protected dashboard
│   └── globals.css               # Tailwind v4 + shadcn theme tokens
├── components/ui/                # shadcn/ui components (owned in-repo)
├── lib/
│   ├── db/
│   │   ├── schema/               # applications, application_events, applicationStatus enum
│   │   ├── index.ts              # Drizzle client (cached on globalThis in dev)
│   │   └── migrate.ts            # release-step migrator (runs drizzle/ migrations)
│   └── utils.ts
├── tests/setup/                  # Vitest globalSetup + per-test truncate
├── drizzle/                      # generated SQL migrations + meta (committed)
├── .husky/                       # git hooks (pre-commit runs lint-staged)
├── proxy.ts                      # auth gate — Next 16's renamed middleware.ts
├── drizzle.config.ts             # drizzle-kit config
├── vitest.config.ts              # tests run against a *_test database (safety net in tests/setup/global.ts)
├── docker-compose.yml            # local Postgres
├── railway.toml                  # Railway deploy config (preDeployCommand runs migrations)
├── components.json               # shadcn config
└── AGENTS.md                     # Next 16 breaking-changes warning (auto-generated)
```

## Tech Stack

- Next.js 16, Tailwind v4, PostgreSQL, Drizzle ORM, shadcn/ui
- Auth: Clerk (users live in Clerk, not in our DB)
- Charts: Recharts; reach for Nivo only if a sankey/funnel view is added
- Hosting: Railway (Next.js service + Postgres plugin)

## Conventions and Invariants

- **Authorization**: every query is filtered by `user_id`. No shared data between users.
- **File storage**: resume PDFs live in Railway buckets. Postgres stores object keys + metadata, not file bytes. Uploads use signed URLs.
- **Migrations**: `drizzle-kit generate` locally, commit the SQL. Railway runs `drizzle-kit migrate` as a release step before `next start`. Forward-only — no down migrations.

## Development

Prereqs: Node 20+, pnpm, Docker.

```bash
cp .env.example .env.local      # then paste Clerk keys from dashboard.clerk.com
pnpm install                     # also installs the husky pre-commit hook
docker compose up -d             # Postgres on localhost:5432
pnpm db:migrate                  # apply migrations to local db
pnpm dev                         # http://localhost:3000
```

`pnpm build` produces a production build; `pnpm start` serves it. `pnpm lint` for ESLint. `pnpm test` runs the Vitest suite (requires the local Postgres container).

### Database

- `pnpm db:generate` — create a new migration from schema changes (commit the generated SQL).
- `pnpm db:migrate` — apply pending migrations to whatever `DATABASE_URL` points at.
- `pnpm db:studio` — browse the DB at https://local.drizzle.studio.

In Railway, the Postgres plugin injects `DATABASE_URL` into the Next.js service via a reference variable (`${{ Postgres.DATABASE_URL }}`). The `preDeployCommand` in `railway.toml` runs `pnpm db:migrate` before traffic switches.

### Formatting

Prettier runs automatically on staged files via the husky pre-commit hook (configured in `package.json` under `lint-staged`). To format everything manually: `pnpm format`. To check without writing: `pnpm format:check`.

## Commit and PR Conventions

- Use **conventional commits** for all commit messages (e.g., `feat:`, `fix:`, `refactor:`, `docs:`, `test:`)

## Releasing

Pushes to main automatically trigger a Railway deploy.

## Important Notes

- When the project structure changes (new files, directories, or significant reorganization), update this CLAUDE.md file to reflect the changes.
