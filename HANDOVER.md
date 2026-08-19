# FirstSeat — Project Handover

This document is the single source of truth for continuing work on FirstSeat. It assumes
zero prior context. Read it top to bottom before making changes.

**Last updated:** 19 August 2026
**Course deadline:** 6 September 2026
**Course brief:** `~/Desktop/fullstack project.docx` (RUNI CS 2026, "Become a Full-Stack Engineer")

---

## 1. What FirstSeat is

**The problem.** Tables at popular restaurants are released on a fixed schedule — for example,
a restaurant might open bookings on Resy exactly 30 days in advance at 09:00 local time. The
tables are gone within seconds. Anyone who does not know the exact release moment, or who is
not sitting at their screen when it happens, has effectively no chance of booking.

**The product.** FirstSeat lets a diner register a "watch": *this restaurant, this date, this
party size, this meal*. FirstSeat knows each restaurant's release rule, calculates the precise
moment the table will become bookable, and alerts the user just before it happens with a direct
booking link.

**The user.** A diner trying to book a hard-to-get restaurant.
**The customer.** Initially the same person (a consumer product); a concierge service or hotel
could be a later B2B customer.

**The business value.** It converts "I got lucky" into a repeatable process, and saves the user
from manually tracking release schedules across several booking platforms.

> ⚠️ This description is derived from the data model we built. The formal **product spec
> document** is still outstanding (see §8). Confirm and expand this before writing it.

---

## 2. Stack and what is already set up

| Layer | Technology | Status |
| --- | --- | --- |
| Framework | Next.js 16.3.1 (App Router, Turbopack) | ✅ working |
| Language | TypeScript 5 (strict) | ✅ |
| UI | Tailwind CSS v4 | ✅ (no custom UI built yet) |
| Linting | ESLint 9 (`eslint-config-next`) | ✅ passing |
| Database | Supabase Postgres (free plan, London / eu-west-2) | ✅ tables created |
| ORM | Prisma 7.9.1 + `@prisma/adapter-pg` | ✅ connected and verified |
| Auth | Supabase Auth via `@supabase/ssr` 0.12.4 | ⚠️ clients written, **no login UI yet** |
| Hosting | Vercel, auto-deploys on push to `main` | ✅ live |
| Runtime | Node v24.16.0, npm 11.13.0 | — |

### Live locations

- **GitHub (private):** https://github.com/AmitNeumann/firstseat
- **Live site:** https://firstseat-lemon.vercel.app — currently shows only "FirstSeat — coming soon"
- **Supabase:** project on the free plan, London region. Connection strings are in `.env.local`
  (never committed). The Postgres host is the Supabase connection pooler.

### Deployment pipeline

`git push` to `main` → GitHub webhook → Vercel builds (`prisma generate && next build`) → live.
Vercel builds from **GitHub**, never from your local machine, so unpushed work is never deployed.
Pushing to any other branch produces a preview deployment with its own URL.

---

## 3. The data model

Six tables, defined in `prisma/schema.prisma` and created by migration
`20260819180426_init`. Field names are camelCase in TypeScript and snake_case in Postgres
(via `@map`); table names are snake_case plural (via `@@map`).

### Relationships

```
User ──< Watch >── Restaurant ──< ReleaseRule
             │                        │
             └──────< DropAlert >─────┘
                          │
                          └──< Notification
```

- A **User** has many Watches.
- A **Restaurant** has many ReleaseRules (one per platform/meal schedule) and many Watches.
- A **Watch** (one user wanting one table) has many DropAlerts.
- A **DropAlert** is produced by combining a Watch with a ReleaseRule, and has many Notifications.
- A **Notification** is one delivery attempt of one DropAlert.

### Tables

**`users`** (5 columns) — application profile for a Supabase Auth user.
`id` (uuid, PK), `email` (unique), `timezone` (default `Europe/London`), `createdAt`, `updatedAt`.
🔑 **`id` has no default on purpose** — it must be set to the Supabase Auth user's ID so that
`users.id` and `auth.users.id` are the same value.

**`restaurants`** (5 columns) — `id`, `name`, `city`, timestamps.
Unique on `(name, city)`; indexed on `city`.

**`release_rules`** (10 columns) — when a restaurant releases tables.
`id`, `restaurantId` (FK → restaurants, cascade), `platform` (enum), `daysInAdvance` (int),
`releaseTime` (`time`), `timezone` (string), `bookingUrl`, `verified` (bool), timestamps.
Example row: *Resy, 30 days ahead, 09:00, Europe/London*.

**`watches`** (9 columns) — a user asking to be told when a table opens.
`id`, `userId` (FK → users, cascade), `restaurantId` (FK → restaurants, cascade),
`targetDate` (`date`), `partySize` (int), `meal` (enum), `status` (enum, default `ACTIVE`), timestamps.
Unique on `(userId, restaurantId, targetDate, partySize, meal)` — the database itself prevents
duplicate watches. Indexed on `(userId, status)` and `(restaurantId, targetDate)`.

**`drop_alerts`** (10 columns) — a scheduled moment a table is expected to be released.
`id`, `watchId` (FK → watches, cascade), `releaseRuleId` (FK → release_rules, **restrict**),
`platform`, `dropDatetime` (timestamptz), `alertAt` (timestamptz), `bookingUrl`,
`status` (enum, default `SCHEDULED`), timestamps.
Indexed on `(watchId)` and `(status, alertAt)` — the second index serves the scheduler's core
query, "which alerts are due now?".

**`notifications`** (6 columns) — one delivery attempt.
`id`, `dropAlertId` (FK → drop_alerts, cascade), `channel` (enum), `sentAt` (nullable),
`status` (enum, default `PENDING`), `createdAt`.

### Enums (real Postgres types)

| Enum | Values |
| --- | --- |
| `Platform` | `OPENTABLE`, `RESY`, `TOCK`, `SEVENROOMS`, `DIRECT`, `OTHER` |
| `Meal` | `BREAKFAST`, `BRUNCH`, `LUNCH`, `DINNER` |
| `WatchStatus` | `ACTIVE`, `PAUSED`, `FULFILLED`, `EXPIRED`, `CANCELLED` |
| `DropAlertStatus` | `SCHEDULED`, `SENT`, `MISSED`, `CANCELLED` |
| `NotificationChannel` | `EMAIL`, `PUSH`, `SMS` |
| `NotificationStatus` | `PENDING`, `SENT`, `FAILED` |

### Design decisions worth being able to defend

- **Enums over free-text strings** so Postgres rejects invalid values outright.
- **`timestamptz` for instants, `date` for `targetDate`, `time` for `releaseTime`.** A release
  time is a wall-clock time in the restaurant's timezone; the moment it occurs is an absolute
  instant. Conflating them breaks across daylight-saving transitions — critical for this product.
- **Cascade deletes**, except `DropAlert.releaseRule` which is `Restrict`: you cannot delete a
  release rule that alerts still depend on, preserving why an alert was scheduled.
- **Indexes chosen for real queries**, not added blindly — see the scale document (§8).

---

## 4. Current code state

Only tracked files are listed. `node_modules/`, `.next/`, `src/generated/`, and `.env*`
(except `.env.example`) are git-ignored.

```
firstseat/
├── HANDOVER.md              ← this file
├── README.md                ← still the default create-next-app readme (TODO: rewrite)
├── AGENTS.md / CLAUDE.md    ← auto-generated AI tool instructions, re-added by `next dev`
├── .env.example             ← documents the 4 required env vars (placeholders only, committed)
├── .env.local               ← REAL SECRETS, git-ignored, never commit
├── .gitignore               ← ignores .env* but re-includes !.env.example
├── package.json             ← build script is `prisma generate && next build`
├── next.config.ts           ← empty default config
├── tsconfig.json            ← strict; path alias `@/*` → `./src/*`
├── eslint.config.mjs
├── postcss.config.mjs       ← wires Tailwind v4
├── prisma.config.ts         ← Prisma 7 config: loads .env.local, points CLI at DIRECT_URL
├── prisma/
│   ├── schema.prisma        ← the six models + six enums
│   └── migrations/
│       ├── migration_lock.toml
│       └── 20260819180426_init/migration.sql   ← the CREATE TABLE statements
└── src/
    ├── app/
    │   ├── layout.tsx       ← root layout, fonts, metadata (title "FirstSeat")
    │   ├── page.tsx         ← placeholder homepage: "FirstSeat — coming soon"
    │   ├── globals.css      ← Tailwind v4 import + @theme config (no tailwind.config.js in v4)
    │   └── favicon.ico
    ├── generated/prisma/    ← GENERATED, git-ignored, rebuilt by `prisma generate`
    └── lib/
        ├── prisma.ts        ← Prisma client singleton (see §6)
        └── supabase/
            ├── client.ts    ← Supabase client for Client Components (browser)
            └── server.ts    ← per-request server client + getCurrentUser()
```

### Git history

```
2a92e42  Add Prisma singleton and Supabase Auth clients
499a477  Add Prisma schema, first migration, and Supabase database config
0b89c4c  Replace default homepage with FirstSeat placeholder
69b6e76  Initial commit from Create Next App
```

---

## 5. What was just completed, and the immediate next step

### Just completed

Full infrastructure. The database schema is migrated and verified in Supabase (verified by
introspecting the live database with `prisma db pull --print`, not by trusting command output).
Prisma and Supabase Auth clients are written and were confirmed working against the real
database via a temporary endpoint that returned:

```json
{"prisma":{"ok":true,"counts":{"users":0,"restaurants":0,"watches":0}},
 "supabaseAuth":{"ok":true,"signedIn":false,"userId":null}}
```

That endpoint was deleted after verification. **No application features exist yet** — the
homepage is still a placeholder.

### Immediate next step: authentication

Build Supabase Auth signup/login, and create a `users` row on first sign-in.

1. Signup and login UI (Client Components) using `createSupabaseBrowserClient()`.
2. Add `src/middleware.ts` to refresh the auth session cookie on each request. This is required
   by `@supabase/ssr`: Server Components cannot write cookies, so without middleware sessions
   go stale. Its `setAll` receives a second `headers` argument that must also be applied to the
   response, or a CDN could cache one user's session cookie and serve it to another.
3. **On first sign-in, create the `users` row with `id` set to the Supabase Auth user ID.**
   `users.id` has no default precisely so this link is explicit. Use an idempotent
   `prisma.user.upsert({ where: { id: authUser.id }, ... })` so repeat sign-ins are harmless.
4. Protect routes by calling `getCurrentUser()` (from `src/lib/supabase/server.ts`) and
   redirecting when it returns `null`.

After auth, the natural order is: create/list Watches → seed Restaurants and ReleaseRules →
compute DropAlerts → send Notifications.

---

## 6. Key gotchas — read before writing code

**🔴 RLS does NOT protect Prisma queries.** Prisma connects as the Postgres `postgres` role,
which bypasses Row Level Security. Supabase RLS policies will not stop a Prisma query from
reading any row. **Every query must be scoped in server-side code**, e.g.
`prisma.watch.findMany({ where: { userId: user.id } })`. Forgetting the `where` clause is the
most likely way to leak another user's data in this codebase. Enabling RLS anyway is still
worth doing as defense in depth for anything reaching the tables via the Supabase API.

**🔴 The four env vars are not on Vercel yet.** Nothing is broken today because no page queries
the database, but the first deployed page that does will fail in production. Add them under
**Vercel → Project Settings → Environment Variables** before deploying any DB-backed feature.
`DIRECT_URL` is only needed there if migrations are run from CI.

**🔴 Prisma 7 requires a driver adapter.** `new PrismaClient()` with no arguments — as shown in
every Prisma 5/6 tutorial — will fail. v7 removed the bundled Rust query engine. You must pass
`adapter: new PrismaPg({ connectionString })`. Already handled in `src/lib/prisma.ts`.

**🔴 Use `getUser()`, never `getSession()`, for authorization.** `getSession()` reads the cookie
and trusts it; cookies can be forged. `getUser()` verifies the JWT with Supabase's servers.

**🟠 Prisma 7 does not auto-load `.env` files.** Env loading happens in `prisma.config.ts`, which
explicitly loads `.env.local` via `dotenv`. If you add a new variable used by the Prisma CLI, it
must be in `.env.local`.

**🟠 Two connection strings, on purpose.** `DATABASE_URL` is the pooled connection (port 6543,
`pgbouncer=true`) used by the app at runtime, because serverless functions open many short-lived
connections. `DIRECT_URL` (port 5432) bypasses the pooler and is used **only** by the Prisma CLI
for migrations, whose DDL statements are unreliable through a transaction pooler.

**🟠 Duplicate keys in `.env.local` are silent.** This already happened once: values were pasted
below existing placeholders, giving two `DATABASE_URL` lines. Each variable must appear exactly
once.

**🟠 `NEXT_PUBLIC_*` vars must be accessed as literals** — `process.env.NEXT_PUBLIC_SUPABASE_URL`,
never `process.env[name]`. Next.js inlines them at build time and cannot resolve dynamic lookups
in browser code.

**🟠 The generated Prisma client is git-ignored.** It lives in `src/generated/prisma`. After
cloning, or after any schema change, run `npx prisma generate`. Vercel handles this via the
build script.

**🟠 Tailwind v4 has no `tailwind.config.js`.** Theme configuration lives in `src/app/globals.css`
inside the `@theme` block.

**🟠 `npm audit` reports 3 high-severity issues** in `deepmerge-ts`, a transitive dependency of
the Prisma CLI (a dev dependency, never shipped to production, and it only parses config files we
write). `npm audit fix --force` would **downgrade to Prisma 6 and break this setup**. Leave it;
document the triage in the security doc.

**🟢 Run the dev server with `npm run dev`** (http://localhost:3000).

---

## 7. Running the project locally

```bash
git clone https://github.com/AmitNeumann/firstseat.git
cd firstseat
npm install
cp .env.example .env.local   # then fill in the real values (see below)
npx prisma generate          # build the client into src/generated/prisma
npm run dev                  # http://localhost:3000
```

### Required environment variables

All four live in `.env.local`, which is git-ignored. `.env.example` documents them with
placeholders. **Never commit real values; never paste them into a chat.**

| Variable | Where to get it | Used by |
| --- | --- | --- |
| `DATABASE_URL` | Supabase → Connect → ORMs → Prisma (pooled, port **6543**) | App at runtime |
| `DIRECT_URL` | Same panel (non-pooled, port **5432**) | Prisma CLI migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Supabase Auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page (anon / publishable key) | Supabase Auth |

The anon/publishable key is safe to expose to the browser by design. The **`service_role`
key must never** be used in a `NEXT_PUBLIC_` variable — it bypasses RLS. It is not needed today.

If the database password contains characters like `@`, `#`, or `/`, they must be percent-encoded
in the connection string, or reset the password to something alphanumeric.

---

## 8. Deliverables checklist (from the course brief)

Final submission: **6 September 2026**. The brief grades *quality of thinking* over feature
count: "better a small, clear, useful, secure, well-built product than a large, messy, unstable one."

| # | Deliverable | Status | Notes |
| --- | --- | --- | --- |
| 1 | Link to app on Vercel | ✅ **Done** | https://firstseat-lemon.vercel.app (placeholder only) |
| 2 | Link to GitHub repository | ✅ **Done** | https://github.com/AmitNeumann/firstseat (private — make public or add graders) |
| 3 | Product spec document | ❌ **Outstanding** | Problem, users, customer, business goals, required capabilities, core user flows |
| 4 | Technical design document | 🟡 **Partly** | Schema, folder structure and decisions are captured here; still needs component structure, API design, state management, error handling, validation, UX |
| 5 | Test spec document | ❌ **Outstanding** | Core features, invalid inputs, business flows, permissions, DB, edge cases, basic UI |
| 6 | Test code | ❌ **Outstanding** | No test framework installed yet. Suggested: Vitest + React Testing Library for units, Playwright for E2E |
| 7 | Scale document | ❌ **Outstanding** | Good raw material exists: indexes, pooled vs direct connections, static prerendering, pagination plans |
| 8 | Security document | ❌ **Outstanding** | Must cover: Supabase Auth, authorization in server code, **the RLS/Prisma caveat**, input validation, API protection, secret handling, remaining risks |
| 9 | Local run instructions | 🟡 **Partly** | §7 here covers it; `README.md` is still the default create-next-app text and must be rewritten |
| 10 | 10–15 min presentation | ❌ **Outstanding** | Product, problem, users, business value, architecture, DB, flows, tests, scale, security, what you'd improve |

### Also required by the brief, not yet started

- **Architecture document** (§3 of the brief): components, pages, API routes/server actions,
  data flow between frontend/backend/database, roles and permissions, third-party services and why.
- **Working product features.** Currently zero user-facing functionality — this is the biggest gap.
- The brief expects you to **understand and be able to explain every technical decision**, since
  AI assistance is permitted but responsibility for the code is yours. This document exists partly
  to support that.

---

## 9. Commands you will commonly need

```bash
# Development
npm run dev                 # dev server at http://localhost:3000
npm run build               # production build (runs prisma generate first)
npm run lint                # ESLint
npx tsc --noEmit            # typecheck without emitting

# Prisma / database
npx prisma migrate dev --name describe_the_change   # create + apply a migration
npx prisma migrate status                            # is the DB in sync?
npx prisma generate                                  # rebuild the client after schema edits
npx prisma studio                                    # browse/edit data in a local GUI
npx prisma db pull --print                           # print the LIVE db structure (verification)
npx prisma migrate deploy                            # apply migrations in CI/production

# Git
git add -A && git commit -m "message" && git push    # main tracks origin/main

# Verification habits worth keeping
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
git ls-files | grep -E "\.env"        # should only ever return .env.example
git check-ignore -v .env.local        # confirm secrets stay ignored
```

### Working principles established so far

- **Verify, don't trust.** Confirm the database with introspection, deployments with HTTP
  requests, and pushes by comparing local and remote commit hashes.
- **Never put secrets in chat or in git.** Check `git diff --cached` before every commit.
- **Prefer being able to explain a decision over adding a feature.** That is what the brief grades.
