# FirstSeat — Project Handover

This document is the single source of truth for continuing work on FirstSeat. It assumes
zero prior context. Read it top to bottom before making changes.

**Last updated:** 20 August 2026
**Course deadline:** 6 September 2026
**Course brief:** `~/Desktop/fullstack project.docx` (RUNI CS 2026, "Become a Full-Stack Engineer")

---

## 0. Start here — state as of this update

| | |
| --- | --- |
| **Current branch** | `feat/auth` — pushed to GitHub, **not merged to `main`** |
| **Latest commit** | `498c845` "Add Supabase Auth signup, login, and users row on first sign-in" |
| **Working tree** | clean |
| **What works** | landing page, signup, login, logout, email confirmation, protected `/dashboard`, `users` row created on first sign-in |
| **What does not exist yet** | watches (the actual product), restaurants/release-rules UI, drop alerts, notifications, any tests |
| **Live site** | https://firstseat-lemon.vercel.app — still the **old placeholder** from `main`; the auth work is not deployed |

### 🔴 Two things must happen before `feat/auth` is merged to `main`

1. **Add the four environment variables to Vercel** (§7 lists them). `src/proxy.ts` runs on
   nearly every request and throws if the two `NEXT_PUBLIC_SUPABASE_*` vars are missing, so
   merging without them returns 500 for **the entire site**, not just database-backed pages.
2. **Add the redirect allow-list entries in Supabase** (§6), or confirmation emails will send
   people to the wrong URL.

Merging is a deliberate act: `main` auto-deploys. The branch was pushed separately precisely
so the live placeholder stayed up while this was unfinished.

### Still unverified

The **real email round trip** has never been run: no one has actually signed up with a live
inbox, opened the confirmation link, and landed on `/dashboard`. Everything around it is
verified (§5), but do this first — it is the one gap in the auth work.

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
| UI | Tailwind CSS v4 | ✅ landing, signup, login, dashboard |
| Linting | ESLint 9 (`eslint-config-next`) | ✅ passing |
| Validation | Zod 4.4.3 | ✅ used by the auth forms |
| Database | Supabase Postgres (free plan, London / eu-west-2) | ✅ tables created |
| ORM | Prisma 7.9.1 + `@prisma/adapter-pg` | ✅ connected and verified |
| Auth | Supabase Auth via `@supabase/ssr` 0.12.4 | ✅ signup, login, logout, `users` row on first sign-in |
| Hosting | Vercel, auto-deploys on push to `main` | ✅ live (serving `main`, i.e. the placeholder) |
| Runtime | Node v24.16.0, npm 11.13.0 | — |
| AI parse endpoint | provider not chosen yet | 🔜 planned, see §5 |
| Testing | none installed | ❌ Vitest + Playwright suggested |

### Live locations

- **GitHub (private):** https://github.com/AmitNeumann/firstseat
  - `main` — last commit `7857ff6`, the placeholder site. This is what is deployed.
  - `feat/auth` — last commit `498c845`, all the authentication work. Pushed, not merged.
  - Open a PR at https://github.com/AmitNeumann/firstseat/pull/new/feat/auth
- **Live site:** https://firstseat-lemon.vercel.app — ⚠️ still serving the old placeholder,
  because the auth work is on a branch. Vercel also builds a **preview URL** for `feat/auth`;
  that preview will 500 until the environment variables are added, which is the safe place to
  find that out (see §0).
- **Supabase:** project on the free plan, London region. Connection strings are in `.env.local`
  (never committed). The Postgres host is the Supabase connection pooler.

### Supabase Auth settings that shape the code

Read back from `GET /auth/v1/settings` on the live project, not assumed:

| Setting | Value | Consequence |
| --- | --- | --- |
| `mailer_autoconfirm` | `false` | **Email confirmation is required.** `signUp` returns no session; the user must open the emailed link, which lands on `/auth/confirm`. |
| `external.email` | `true` | Email + password is the only enabled sign-in method. |
| `disable_signup` | `false` | Public signup is open. |

If you switch confirmation off in the dashboard, signup starts returning a session directly
and `signup()` will redirect straight to `/dashboard`. Both paths are already handled.

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
    ├── proxy.ts             ← refreshes the auth session cookie on every request (§6)
    ├── app/
    │   ├── layout.tsx       ← root layout, fonts, metadata
    │   ├── page.tsx         ← landing page; CTA depends on whether you are signed in
    │   ├── globals.css      ← Tailwind v4 import + @theme tokens (no tailwind.config.js in v4)
    │   ├── favicon.ico
    │   ├── (auth)/          ← route group: adds a layout without adding a path segment
    │   │   ├── layout.tsx   ← centred card frame
    │   │   ├── login/page.tsx
    │   │   └── signup/page.tsx
    │   ├── auth/confirm/route.ts   ← where the emailed confirmation link lands
    │   └── dashboard/page.tsx      ← protected; calls requireAppUser()
    ├── components/auth/
    │   ├── form-fields.tsx  ← Field / FormAlert / SubmitButton (presentational)
    │   ├── login-form.tsx   ← Client Component, useActionState
    │   ├── signup-form.tsx  ← Client Component, useActionState
    │   └── sign-out-button.tsx
    ├── generated/prisma/    ← GENERATED, git-ignored, rebuilt by `prisma generate`
    └── lib/
        ├── prisma.ts        ← Prisma client singleton (see §6)
        ├── site-origin.ts   ← absolute origin for links inside auth emails
        ├── auth/
        │   ├── dal.ts       ← getAuthUser, ensureAppUser, getAppUser, requireAppUser
        │   ├── actions.ts   ← "use server": signup, login, logout
        │   ├── schemas.ts    ← Zod schemas + AuthFormState
        │   └── confirm-errors.ts  ← fixed set of confirmation-failure messages
        └── supabase/
            ├── env.ts       ← the two NEXT_PUBLIC_ vars, read and checked in one place
            ├── client.ts    ← Supabase client for Client Components (browser)
            └── server.ts    ← per-request server client
```

### How a sign-in actually flows

```
/signup  ──signup() action──▶ supabase.auth.signUp
                                    │ (confirmation required)
                                    ▼
                            "check your email"
                                    │  user opens link
                                    ▼
       /auth/confirm ──exchangeCodeForSession──▶ session cookies written
                                    │
                                    ▼
                          ensureAppUser(authUser)
                        prisma users row, id = auth.users.id
                                    │
                                    ▼
                              /dashboard
```

`/login` takes the same last three steps via `signInWithPassword`.

### Git history

```
* 498c845  Add Supabase Auth signup, login, and users row on first sign-in   ← feat/auth HEAD
|          (this commit is the whole auth feature; 25 files, +1266)
* 7857ff6  Add project handover document                                     ← main HEAD
* 2a92e42  Add Prisma singleton and Supabase Auth clients
* 499a477  Add Prisma schema, first migration, and Supabase database config
* 0b89c4c  Replace default homepage with FirstSeat placeholder
* 69b6e76  Initial commit from Create Next App
```

`feat/auth` is one commit ahead of `main` and tracks `origin/feat/auth`. Nothing has diverged,
so the eventual merge is a fast-forward. See §0 before merging.

---

## 5. What was just completed, and the immediate next step

### Just completed: authentication

Signup, login, logout, and the `users` row on first sign-in — the first real feature in the
product. Specifically:

- **`src/proxy.ts`** refreshes the session cookie on every matched request. Its `setAll`
  applies both the cookies *and* the second `headers` argument, which carries Supabase's
  `no-store` directives; without those a CDN could cache one user's session cookie and hand
  it to the next visitor.
- **Signup and login** are Server Actions (`src/lib/auth/actions.ts`) driven by
  `useActionState`, with every input re-validated server-side by Zod. Credentials never
  reach a Client Component.
- **`ensureAppUser()`** in `src/lib/auth/dal.ts` is the single place `users.id` is set to
  `auth.users.id`. It is called from `/auth/confirm` and from `login()`.
- **`requireAppUser()`** is the authorization gate, called by `/dashboard`.

One decision worth being ready to defend: the forms submit to **Server Actions** rather than
calling `createSupabaseBrowserClient()` from the browser, which is what most tutorials do.
Passwords are then only ever handled on the server, validation cannot be bypassed by editing
client code, and the `users` row is created in the same trusted step as the sign-in. The
browser client is still exported from `src/lib/supabase/client.ts` but is currently unused —
it becomes useful for realtime subscriptions or optimistic UI later.

What was verified, rather than assumed:

| Check | Result |
| --- | --- |
| `users` row created with `id` === Supabase auth id | ✅ against the live database |
| Repeat sign-in writes nothing (`updated_at` unchanged) | ✅ idempotent |
| Changed Supabase email propagates to `users.email` | ✅ |
| Junk `user_metadata.timezone` falls back to `Europe/London` | ✅ never reaches the DB |
| `/dashboard` while signed out | ✅ 307 → `/login` |
| Every `/auth/confirm` failure mode | ✅ 307 → `/login?error=<key>` |
| `next=//evil.example.com` on a confirmation link | ✅ clamped to `/dashboard` |
| Wrong password vs. unknown email | ✅ Supabase returns `invalid_credentials` for both, so the UI cannot be used to discover who has an account |
| Signup with a 3-character password | ✅ rejected server-side, email preserved in the form |
| `npx tsc --noEmit`, `npm run lint`, `npm run build` | ✅ all clean |

The temporary endpoint used for the database checks was deleted afterwards.

**Not yet verified end to end:** the real email round trip. That needs a live inbox — sign
up with your own address, open the link, and confirm you land on `/dashboard` with one row
in `users` whose `id` matches the row in `auth.users`.

Known limitations, worth mentioning before someone finds them for you:

- **A stale email can collide.** `users.email` is `@unique`, and `ensureAppUser` copies the
  address down from Supabase on sign-in. If user A changes their Supabase address and never
  signs in again, our row keeps the old value; if user B later takes that address, B's
  sign-in hits a unique-constraint violation (Prisma `P2002`) and 500s. Rare, but the fix is
  to catch `P2002` there and fall back to the existing row. Not done yet because it is
  untested code on a path we cannot easily reproduce.
- **No password reset or email-change flow.** Supabase supports both, and `/auth/confirm`
  already handles the `recovery` and `email_change` link types, but there is no UI.
- **No rate limiting of our own.** Signup and login lean on Supabase's built-in limits.

### Immediate next step: watch creation, then an AI natural-language parse endpoint

Two pieces, deliberately in this order. The watch form is the product; the AI endpoint is a
faster way to fill it in. **Build the form first and make it work on its own** — if the AI
layer comes first, there is nothing for it to submit to, and a demo where the only path to
creating a watch runs through a model API is a demo that breaks when that API is slow, down,
rate-limited or out of credit.

#### Part 1 — Watch creation (the deterministic path)

The data model's centre of gravity, and the first thing a user actually gets value from.

1. A form to create a Watch: restaurant, target date, party size, meal.
2. List that user's watches on `/dashboard`, and let them cancel one.
3. **Every query must be scoped by `userId` taken from `requireAppUser()`** — see the RLS
   warning in §6. `prisma.watch.findMany({ where: { userId: user.id } })`, never just
   `findMany()`.
4. The `@@unique([userId, restaurantId, targetDate, partySize, meal])` constraint will
   reject duplicates at the database level; catch Prisma's `P2002` and turn it into a
   readable form error rather than a 500.

Restaurants and ReleaseRules have no UI yet, so seed a handful by hand first — a Watch
cannot be created without a Restaurant to point at.

Follow the shape the auth code already established, so the codebase stays consistent:
a Zod schema in `src/lib/watches/schemas.ts`, Server Actions in `src/lib/watches/actions.ts`
that begin with `await requireAppUser()`, and a `FormState` returned to `useActionState`.

#### Part 2 — AI natural-language parse endpoint

**The idea.** The user types one sentence — *"table for 2 at Gymkhana next Friday for dinner"*
— and it is turned into the four structured fields the form needs, which they then confirm.

**The flow, and the rule that matters most:**

```
free text ──▶ model ──▶ raw JSON ──▶ Zod parse ──▶ resolve restaurant name to a
                                          │         restaurants row
                                          │
                                    (reject if invalid)
                                          ▼
                              pre-filled form the user CONFIRMS
                                          ▼
                                  existing createWatch action
```

**The model output is untrusted input.** It is a string from a remote service that can
hallucinate a restaurant that does not exist, a 400-person party, or a date in 1987. It must
go through Zod exactly like a form submission, and it must never reach Prisma directly. The
parse endpoint's job ends at *proposing* values; the existing, already-validated
`createWatch` action is still the only thing that writes a Watch.

**Design constraints to respect:**

- **The parse result is a suggestion, not a submission.** Show the user the parsed fields and
  make them confirm. This is both a correctness safeguard and a much better demo — you can
  show it getting something slightly wrong and the user fixing it.
- **Require a signed-in user.** `await requireAppUser()` as the first line. Every call costs
  real money, so an unauthenticated endpoint is someone else's free model access.
- **Rate-limit per user.** There is none anywhere in the app today (§5 limitations). This is
  the first endpoint where its absence costs money rather than just capacity.
- **Relative dates need the user's timezone.** "Next Friday" is only meaningful in a zone —
  this is exactly why `users.timezone` is captured at signup. Pass it into the prompt and
  resolve the date server-side; do not let the model guess today's date.
- **Restaurant resolution is a database problem, not a model problem.** The model returns a
  name; our code matches it against `restaurants`. Decide explicitly what happens on no match
  or an ambiguous match — probably "we don't track that restaurant yet", not silently creating
  a row.
- **The API key is server-only.** A plain `OPENAI_API_KEY`-style variable, never
  `NEXT_PUBLIC_*` (§6 explains why that prefix ships to the browser). Add it to `.env.example`
  as a placeholder and to Vercel.

**Decisions still to make** — these were not settled, so choose and record them here:

| Decision | Notes |
| --- | --- |
| Which provider and model | Cheapest capable model is plenty; this is short-string extraction, not reasoning |
| Route Handler or Server Action | A Route Handler under `src/app/api/` is easier to test with `curl` and to rate-limit; a Server Action needs less wiring |
| Structured output method | Prefer the provider's JSON/structured-output mode over parsing prose, then still validate with Zod |
| Failure behaviour | On timeout or a bad response, fall back to the plain form rather than blocking the user |
| Cost ceiling | Free-tier friendly: cap input length and calls per user per day |

This is also a strong presentation beat: the brief encourages using AI tools, and "I used a
model for the fuzzy part and kept the deterministic parts deterministic" is a defensible
architectural decision rather than a gimmick.

#### After that

Seed Restaurants and ReleaseRules → compute DropAlerts from Watch × ReleaseRule → send
Notifications. Also still outstanding: the first tests (§8, deliverables 5 and 6), which have
no framework installed yet.

---

## 6. Key gotchas — read before writing code

**🔴 RLS does NOT protect Prisma queries.** Prisma connects as the Postgres `postgres` role,
which bypasses Row Level Security. Supabase RLS policies will not stop a Prisma query from
reading any row. **Every query must be scoped in server-side code**, e.g.
`prisma.watch.findMany({ where: { userId: user.id } })`. Forgetting the `where` clause is the
most likely way to leak another user's data in this codebase. Enabling RLS anyway is still
worth doing as defense in depth for anything reaching the tables via the Supabase API.

**🔴 There is no `middleware.ts` in Next.js 16 — it is `proxy.ts`.** The file convention was
renamed in v16 (`export function proxy`, not `middleware`), and the old name is deprecated.
Every Supabase + Next.js tutorial you will find still says `middleware.ts`. The session
refresh lives in `src/proxy.ts`; a build lists it as `ƒ Proxy (Middleware)`. There is a
codemod (`npx @next/codemod@canary middleware-to-proxy .`) if you ever paste in old code.

**🔴 The env vars are not on Vercel yet, and this blocks merging `feat/auth`.** It used to be
harmless because nothing touched Supabase. It no longer is: `src/proxy.ts` runs on nearly
every request and throws if the two `NEXT_PUBLIC_SUPABASE_*` vars are missing, so deploying
without them returns 500 for **the whole site**, not just the pages that use the database. Add
all four under **Vercel → Project Settings → Environment Variables** *before* merging to
`main`. `DIRECT_URL` is only needed there if migrations are run from CI.

**🟠 Set the Supabase redirect allow-list too.** Supabase only redirects to URLs on its own
allow-list. Add `https://firstseat-lemon.vercel.app/**` and `http://localhost:3000/**` under
**Supabase → Authentication → URL Configuration**, or confirmation links will bounce to the
Site URL instead of `/auth/confirm`.

**🔴 Prisma 7 requires a driver adapter.** `new PrismaClient()` with no arguments — as shown in
every Prisma 5/6 tutorial — will fail. v7 removed the bundled Rust query engine. You must pass
`adapter: new PrismaPg({ connectionString })`. Already handled in `src/lib/prisma.ts`.

**🔴 Use `getUser()`, never `getSession()`, for authorization.** `getSession()` reads the cookie
and trusts it; cookies can be forged. `getUser()` verifies the JWT with Supabase's servers.
In this codebase that call lives in exactly one place — `getAuthUser()` in
`src/lib/auth/dal.ts`, wrapped in React `cache` so repeat asks within one render are free.
Ask through the DAL rather than calling `supabase.auth` in a page.

**🔴 Proxy is not a security boundary.** Server Functions are POST requests to the route that
defines them, so editing the proxy `matcher` — or moving an action to another route — can
silently remove them from proxy coverage. `src/proxy.ts` therefore only refreshes the
session; authorization is re-checked inside every protected page and action via
`requireAppUser()`. Keep it that way.

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

**🔴 `NEXT_PUBLIC_` means "public".** The prefix is what tells Next.js to inline the value into
the JavaScript sent to the browser, where anyone can read it. That is fine for the Supabase
anon key, which is designed for it. It is **not** fine for anything billable or privileged —
when the AI parse endpoint arrives, its API key must be a plain server-only variable, and the
Supabase `service_role` key must never appear in one either.

**🟠 The generated Prisma client is git-ignored.** It lives in `src/generated/prisma`. After
cloning, or after any schema change, run `npx prisma generate`. Vercel handles this via the
build script.

**🟠 Tailwind v4 has no `tailwind.config.js`.** Theme configuration lives in `src/app/globals.css`
inside the `@theme` block.

**🟠 `npm audit` reports 3 high-severity issues** in `deepmerge-ts`, a transitive dependency of
the Prisma CLI (a dev dependency, never shipped to production, and it only parses config files we
write). `npm audit fix --force` would **downgrade to Prisma 6 and break this setup**. Leave it;
document the triage in the security doc.

**🟠 Zod 4, not Zod 3.** Errors are flattened with `z.flattenError(result.error)`; the v3
`result.error.flatten()` still exists but is deprecated. Email is the top-level `z.email()`,
not `z.string().email()`. Custom messages use `{ error: "…" }`, not `{ message: "…" }`.

**🟠 `.default()` only fires for `undefined`, but `FormData.get` returns `null`.** A missing
field would therefore fail validation instead of taking its default. The `field()` helper in
`src/lib/auth/actions.ts` normalises `null` to `undefined`; use it for every form read.

**🟠 The React Compiler lint rule forbids `setState` inside an effect.** This rules out the
usual "read something browser-only after mount" pattern. The signup form gets the browser
timezone by attaching it to `FormData` at submit time instead, which also removes any
hydration mismatch — the server never renders the value at all.

**🟢 App Router folders starting with `_` are private and are not routed.** `app/api/_x/route.ts`
returns 404 with no warning. Use a normal name for temporary verification endpoints.

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

`.env.example` also documents one optional variable, `NEXT_PUBLIC_SITE_URL`, commented out.
It is normally unnecessary: the signup action reads the request's `Origin` header, which is
already correct on localhost, previews and production alike.

The AI parse endpoint in §5 will add a fifth variable for its API key. It must **not** carry
the `NEXT_PUBLIC_` prefix — see §6.

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
| 1 | Link to app on Vercel | 🟡 **Live, but stale** | https://firstseat-lemon.vercel.app still serves the placeholder — auth is on `feat/auth`. Merging it (after §0) is what makes this deliverable real |
| 2 | Link to GitHub repository | ✅ **Done** | https://github.com/AmitNeumann/firstseat (private — make public or add graders before submitting) |
| 3 | Product spec document | ❌ **Outstanding** | Problem, users, customer, business goals, required capabilities, core user flows. §1 here is a first draft to expand |
| 4 | Technical design document | 🟡 **Partly** | Schema, folder structure, the auth flow, validation and error handling are captured here; still needs the same for watches, plus state management and UX |
| 5 | Test spec document | ❌ **Outstanding** | Core features, invalid inputs, business flows, permissions, DB, edge cases, basic UI |
| 6 | Test code | ❌ **Outstanding** | No test framework installed yet. Suggested: Vitest + React Testing Library for units, Playwright for E2E. Best first targets are pure and already written: the Zod schemas, `safeNextPath`, `confirmErrorMessage`, `readTimezone` |
| 7 | Scale document | ❌ **Outstanding** | Good raw material exists: indexes, pooled vs direct connections, `React.cache` in the DAL, static prerendering, pagination plans, and per-user rate limiting once the AI endpoint exists |
| 8 | Security document | ❌ **Outstanding** | Plenty of material now: Supabase Auth, `getUser()` vs `getSession()`, the DAL as the authorization gate, **the RLS/Prisma caveat**, Zod validation, non-enumerable login errors, the open-redirect guard on `/auth/confirm`, the `no-store` headers on session responses, secret handling, the `npm audit` triage |
| 9 | Local run instructions | 🟡 **Partly** | §7 here covers it; `README.md` is still the default create-next-app text and must be rewritten |
| 10 | 10–15 min presentation | ❌ **Outstanding** | Product, problem, users, business value, architecture, DB, flows, tests, scale, security, what you'd improve |

### Also required by the brief, not yet started

- **Architecture document** (§3 of the brief): components, pages, API routes/server actions,
  data flow between frontend/backend/database, roles and permissions, third-party services and why.
- **Working product features.** Authentication is built (on `feat/auth`). Watches — the thing
  the product is actually for — are still missing, and remain the biggest gap. The AI
  natural-language parse endpoint (§5) is planned on top of them, and also covers the brief's
  "which external libraries or services did you integrate, and why".
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

# Git — currently on feat/auth, which tracks origin/feat/auth
git status -sb                                       # branch + tracking + dirty files
git add -A && git commit -m "message" && git push
git log --oneline --graph --all -8                   # see how feat/auth sits against main

# Merging feat/auth to main — ONLY after the two steps in §0. This deploys.
git checkout main && git merge --ff-only feat/auth && git push

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
