# Motor Testing Pipeline — Phase 1

Config-driven motor testing workflow: employee login (technician/engineer/admin),
client status-only portal (Project ID + access code, no password), motor
nameplate captured once with auto-fill and full history across every visit.

## What's included in this drop

- **Employee auth** — `POST /api/auth/login`, `/api/auth/logout` (employee ID + password, signed session cookie)
- **Client status portal** — `POST /api/client/status` (Project ID + access code → status only, no test data)
- **Login page** — `/login`, two tabs: Employee Login / Client — Check Status
- **Motor + Job model** — nameplate lives on `Motor`, captured once; `Job` = one visit, links back to `Motor`
- **Job creation** — `POST /api/jobs`, auto-detects an existing motor by serial number and reuses it (auto-fill), or creates a new `Motor` on first-ever visit
- **Motor lookup** — `GET /api/motors?serialNumber=...` — used by the intake form to check "have we seen this motor before?"
- **Motor history** — `GET /api/motors/:id/history` + `/motors/:id` page — every past job for that motor: faults found, repairs performed, lead engineer, per-test pass/fail
- **Prisma schema** — `Organization`, `User`, `Motor`, `Job`, `TestRecord`, `Equipment`

## Not yet built (next up)

- The actual D.C. test pipeline config + dynamic test-entry forms (from `lib/pipelines/types.ts`, which is scaffolded but the D.C. test definitions themselves aren't filled in yet)
- Gate enforcement (blocking stage advancement until all tests in the current stage pass)
- Report PDF generation
- Dashboard page
- Seed script (creating your first Organization + Admin user)

## Running it locally

1. Get a free Postgres instance — [Supabase](https://supabase.com) or [Neon](https://neon.tech) both work.
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL` (and a random `SESSION_SECRET`).
3. Install and generate the Prisma client:
   ```
   npm install
   npx prisma db push
   ```
4. Run it:
   ```
   npm run dev
   ```
5. Visit `http://localhost:3000/login`.

There's no seed data yet, so you'll need to create your first `Organization` and `User` (with a bcrypt-hashed password) directly via Prisma Studio (`npx prisma studio`) or a quick seed script — flag it and I'll add one next.

## Note on this build

Everything here has been type-checked and build-verified (`tsc --noEmit` clean, `next build` compiles successfully) — the only step that couldn't run in this sandbox is `prisma generate`, because it needs to download its query engine from `binaries.prisma.sh`, which isn't on this environment's allowed network list. That's a sandbox restriction, not a bug — it'll run normally the moment you do `npm install` on your own machine or in a real deploy (Vercel, etc.).
