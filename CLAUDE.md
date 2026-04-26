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
├── lib/                          # utils; will hold DB client once Drizzle lands
├── proxy.ts                      # auth gate — Next 16's renamed middleware.ts
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

Prereqs: Node 20+, pnpm.

```bash
cp .env.example .env.local      # then paste Clerk keys from dashboard.clerk.com
pnpm install
pnpm dev                         # http://localhost:3000
```

`pnpm build` produces a production build; `pnpm start` serves it. `pnpm lint` for ESLint.

## Commit and PR Conventions

- Use **conventional commits** for all commit messages (e.g., `feat:`, `fix:`, `refactor:`, `docs:`, `test:`)


## Releasing

Pushes to main automatically trigger a Railway deploy.


## Important Notes

- When the project structure changes (new files, directories, or significant reorganization), update this CLAUDE.md file to reflect the changes.
