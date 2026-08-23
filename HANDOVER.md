# FirstSeat — Project Handover

This document is the single source of truth for continuing work on FirstSeat. It assumes
zero prior context. Read it top to bottom before making changes.

**Last updated:** 23 August 2026
**Course deadline:** 6 September 2026
**Course brief:** `~/Desktop/fullstack project.docx` (RUNI CS 2026, "Become a Full-Stack Engineer")

---

## 0. Start here — state as of this update

| | |
| --- | --- |
| **Current branch** | `feat/watches` at `e4a89b5` — **2 commits ahead of `origin/feat/watches`**, not merged to `main` |
| **Working tree** | clean at the time of writing; check `git status -sb` |
| **What works locally** | landing page, signup, login, logout, email confirmation, protected `/dashboard`; create / edit / cancel a watch; timezone-aware drop-time calculation; 8 real seeded restaurants |
| **What does not exist yet** | any considered visual design (**this is the next task**), the AI parse endpoint, the scheduler that actually sends notifications, most course documents (§8) |
| **Tests** | Vitest, 5 files, **136 tests passing**. No component or end-to-end tests yet |
| **Live site** | https://firstseat-lemon.vercel.app — returns 200 but still serves the **"coming soon" placeholder**. Verified, not assumed |

### 🔴 The deployment picture, which is easy to misread

Three branches, and none of the real product is deployed:

| Ref | Commit | Contains |
| --- | --- | --- |
| `origin/main` | `7857ff6` | placeholder + first handover. **This is what Vercel serves.** |
| `main` (local) | `498c845` | ⚠️ 1 commit ahead of `origin/main`, **unpushed** — auth was fast-forwarded onto local `main` and never pushed |
| `feat/auth` | `b3d1d71` | fully contained in `feat/watches`; nothing unique left on it |
| `feat/watches` | `e4a89b5` | everything: auth, watches, seed, tests |

That local-`main` commit is a loose end. It is harmless while unpushed, but pushing `main`
by reflex would deploy auth **without** the Vercel environment variables, which is the one
change that takes the whole site down rather than just one page.

### 🔴 Two things must happen before anything is merged to `main`

1. **Add the four environment variables to Vercel** (§7 lists them). `src/proxy.ts` runs on
   nearly every request and throws if the two `NEXT_PUBLIC_SUPABASE_*` vars are missing, so
   merging without them returns 500 for **the entire site**, not just database-backed pages.
   Whether this has been done has **not been verified** — check the Vercel dashboard first.
2. **Add the redirect allow-list entries in Supabase** (§6), or confirmation emails will send
   people to the wrong URL.

Merging is a deliberate act: `main` auto-deploys. Work was pushed to branches precisely so
the placeholder stayed up while the product was unfinished. When you do merge, merge
`feat/watches` (it contains `feat/auth`), not both.

### Still unverified

- **The Vercel environment variables** (above) — the single blocker on a real deployment.
- **The real email round trip** was never formally recorded. In practice signing in is
  required to create a watch, and watches have been created against the live database, so
  it almost certainly works; confirm it once and note it here rather than leaving it implied.
- **Nothing is deployed**, so none of the watch feature has run anywhere but localhost.

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
| UI | Tailwind CSS v4 | 🟡 all screens built and functional, but **undesigned** |
| Linting | ESLint 9 (`eslint-config-next`) | ✅ passing |
| Validation | Zod 4.4.3 | ✅ auth forms, watch forms, and the seed data |
| Database | Supabase Postgres (free plan, London / eu-west-2) | ✅ tables created, 3 migrations applied |
| ORM | Prisma 7.9.1 + `@prisma/adapter-pg` | ✅ connected and verified |
| Auth | Supabase Auth via `@supabase/ssr` 0.12.4 | ✅ signup, login, logout, `users` row on first sign-in |
| Seeding | `tsx` + `dotenv`, `npm run db:seed` | ✅ 8 real NYC restaurants |
| Testing | Vitest 4.1.11 | ✅ 136 unit tests passing; ❌ no component or E2E tests |
| Hosting | Vercel, auto-deploys on push to `main` | 🟡 live but serving the placeholder |
| Runtime | Node v24.16.0, npm 11.13.0 | — |
| UI design | none — Tailwind defaults, no design system | 🔜 **the next task** |
| AI parse endpoint | provider not chosen yet | 🔜 planned, see §5 |

There is deliberately **no** UI component library, form library, date library or timezone
library. Dates and timezones are handled with the platform's own `Intl` API (§5), which is a
decision to be able to defend rather than an omission.

### Live locations

- **GitHub (private):** https://github.com/AmitNeumann/firstseat
  - `main` — `origin/main` is `7857ff6`, the placeholder. This is what is deployed.
  - `feat/auth` — `b3d1d71`, now entirely contained in `feat/watches`.
  - `feat/watches` — the working branch; `e4a89b5` locally, 2 commits not yet pushed.
  - Open a PR at https://github.com/AmitNeumann/firstseat/pull/new/feat/watches
- **Live site:** https://firstseat-lemon.vercel.app — ⚠️ still serving the placeholder,
  because everything real is on a branch. Vercel also builds a **preview URL** for
  `feat/watches`; that preview will 500 until the environment variables are added, which is
  the safe place to find that out (see §0).
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

Six tables, defined in `prisma/schema.prisma`. Field names are camelCase in TypeScript and
snake_case in Postgres (via `@map`); table names are snake_case plural (via `@@map`).

Three migrations, applied in order:

| Migration | What it did |
| --- | --- |
| `20260819180426_init` | the six `CREATE TABLE` statements |
| `20260820134220_one_release_rule_per_platform` | unique `(restaurant_id, platform)`, so re-running the seed cannot duplicate rules |
| `20260822150245_platform_as_validated_slug` | `platform` from enum to `varchar(40)` + `CHECK`, **hand-written** (see §6) |

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
`id`, `restaurantId` (FK → restaurants, cascade), `platform` (`varchar(40)`, slug),
`daysInAdvance` (int), `releaseTime` (`time`), `timezone` (string), `bookingUrl`,
`verified` (bool), timestamps.
Unique on `(restaurantId, platform)` — at most one rule per platform per restaurant.
Example row: *resy, 30 days ahead, 09:00, Europe/London*.

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
| `Meal` | `BREAKFAST`, `BRUNCH`, `LUNCH`, `DINNER` |
| `WatchStatus` | `ACTIVE`, `PAUSED`, `FULFILLED`, `EXPIRED`, `CANCELLED` |
| `DropAlertStatus` | `SCHEDULED`, `SENT`, `MISSED`, `CANCELLED` |
| `NotificationChannel` | `EMAIL`, `PUSH`, `SMS` |
| `NotificationStatus` | `PENDING`, `SENT`, `FAILED` |

`platform` is deliberately **not** an enum. The set of booking platforms is open-ended
editorial data that no code branches on, so an enum charged a schema migration for what is
really a data edit. It is a `varchar(40)` holding a lowercase slug (`resy`, `sevenrooms`,
`table-check`), guarded by a `CHECK` constraint of the same shape on both `release_rules`
and `drop_alerts`. Labels and the booking-URL cross-check live in
`src/lib/watches/platforms.ts`. Prisma cannot express `CHECK` constraints, so it exists only
in the migration SQL — keep it in step with `PLATFORM_SLUG_PATTERN`.

### Design decisions worth being able to defend

- **Enums where the set is closed, validated text where it is open.** `WatchStatus` genuinely
  has five values and code branches on each, so an enum is right. `platform` is a label next
  to a link that nothing branches on, and every new restaurant might use a booking site we
  have never seen — so an enum charged a schema migration for what is really a data edit. It
  is text with a `CHECK` constraint instead: still enforced by the database, but open-ended.
  Being able to explain *why the two differ* is the point.
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
├── prisma.config.ts         ← Prisma 7 config: loads .env.local, points CLI at DIRECT_URL, seed cmd
├── vitest.config.mts        ← mirrors the @/* path alias so tests resolve like the app
├── prisma/
│   ├── schema.prisma        ← the six models + five enums (platform is NOT an enum)
│   ├── seed.ts              ← the runner: validates, upserts in a transaction, reports gaps
│   ├── seed/
│   │   ├── nyc-restaurants.ts  ← 🖊️ THE DATA FILE — 8 real restaurants, hand-researched
│   │   ├── types.ts            ← the TODO sentinel, Researched<T>, missingFields()
│   │   └── validate.ts         ← Zod schema for hand-entered data (§5)
│   └── migrations/          ← 3 migrations, listed in §3
└── src/
    ├── proxy.ts             ← refreshes the auth session cookie on every request (§6)
    ├── app/
    │   ├── layout.tsx       ← root layout, fonts, metadata
    │   ├── page.tsx         ← landing page; CTA depends on whether you are signed in
    │   ├── globals.css      ← Tailwind v4 import + @theme tokens (no tailwind.config.js in v4)
    │   ├── (auth)/          ← route group: adds a layout without adding a path segment
    │   │   ├── layout.tsx   ← centred card frame
    │   │   ├── login/page.tsx
    │   │   └── signup/page.tsx
    │   ├── auth/confirm/route.ts   ← where the emailed confirmation link lands
    │   ├── dashboard/page.tsx      ← protected; lists this user's watches
    │   └── watches/
    │       ├── new/page.tsx        ← create a watch
    │       └── [id]/edit/page.tsx  ← edit one; 404s for someone else's watch
    ├── components/
    │   ├── forms/fields.tsx        ← FieldShell / SelectField / DateField / FormAlert / SubmitButton
    │   ├── auth/                   ← form-fields, login-form, signup-form, sign-out-button
    │   └── watches/
    │       ├── create-watch-form.tsx   ← Client Component, useActionState
    │       ├── edit-watch-form.tsx
    │       ├── watch-fieldset.tsx      ← date + party size + meal, shared by both forms
    │       ├── restaurant-picker.tsx   ← accessible type-ahead combobox
    │       ├── drop-preview.tsx        ← live "when will this open" preview while filling the form
    │       ├── drop-times.tsx          ← the dual-timezone display
    │       └── watch-card.tsx          ← one watch on the dashboard
    ├── generated/prisma/    ← GENERATED, git-ignored, rebuilt by `prisma generate`
    └── lib/
        ├── prisma.ts        ← Prisma client singleton (see §6)
        ├── site-origin.ts   ← absolute origin for links inside auth emails
        ├── form-data.ts     ← field(): FormData.get null → undefined (§6)
        ├── time.ts          ← pure civil-date/time helpers + IANA timezone checks
        ├── auth/
        │   ├── dal.ts       ← getAuthUser, ensureAppUser, getAppUser, requireAppUser
        │   ├── actions.ts   ← "use server": signup, login, logout
        │   ├── schemas.ts   ← Zod schemas + AuthFormState
        │   └── confirm-errors.ts  ← fixed set of confirmation-failure messages
        ├── supabase/
        │   ├── env.ts       ← the two NEXT_PUBLIC_ vars, read and checked in one place
        │   ├── client.ts    ← Supabase client for Client Components (browser)
        │   └── server.ts    ← per-request server client
        └── watches/
            ├── drop-time.ts   ← ⭐ computeDropMoment — the pure heart of the product
            ├── platforms.ts   ← platform registry: labels, hostnames, slug rules
            ├── schemas.ts     ← Create/Update/CancelWatchSchema, WatchFormState
            ├── actions.ts     ← "use server": createWatch, updateWatch, cancelWatch
            ├── queries.ts     ← server-only reads, every one scoped by userId
            ├── options.ts     ← restaurant search/filter (pure, tested)
            └── format.ts      ← display formatting, incl. dual-timezone phrasing

tests/                       ← Vitest, 136 tests
├── drop-time.test.ts        ← the big one: DST, calendar arithmetic, invalid input
├── platforms.test.ts        ← slug rules, labels, lookalike-host rejection
├── seed-validation.test.ts  ← the hand-entered-data schema
├── restaurant-search.test.ts
└── watch-schema.test.ts
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

Entirely linear — no merge commits, so any eventual merge is a fast-forward.

```
* e4a89b5  Add researched release rules for seven more New York restaurants   ← feat/watches
* 64f259a  Record any booking platform as a validated slug instead of an enum
* 792c4e8  Show drop times in both timezones, add restaurant search and watch editing
* f678a7e  Add the researched release rule for Minetta Tavern
* a335825  Add watch creation with timezone-aware drop-time calculation
* f75ba58  Add a seed structure for hand-researched restaurant release rules
* b3d1d71  Stop the handover quoting a commit hash that goes stale            ← feat/auth
* 03d3a41  Bring handover up to date for the auth feature and next steps
* 498c845  Add Supabase Auth signup, login, and users row on first sign-in    ← local main
* 7857ff6  Add project handover document                                      ← origin/main
* 2a92e42  Add Prisma singleton and Supabase Auth clients
* 499a477  Add Prisma schema, first migration, and Supabase database config
* 0b89c4c  Replace default homepage with FirstSeat placeholder
* 69b6e76  Initial commit from Create Next App
```

The two labels near the bottom are the trap described in §0: **local `main` sits one commit
above `origin/main`**, and Vercel deploys `origin/main`.

Commit messages in this repo are long on purpose — subject line, then the reasoning behind
the change. They are a large part of the "explain every decision" requirement in §8, so
`git log` is worth reading before writing new ones. Keep the style.

---

## 5. What is built, and what comes next

### Built: authentication

Signup, login, logout, and the `users` row on first sign-in. Specifically:

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

### Built: watches — the actual product

A watch is *this restaurant, this date, this party, this meal*. Creating one computes a
`DropAlert` per release rule: the exact instant the booking window opens, and when to warn
the user. Create, edit and cancel all work, and the dashboard lists a user's own watches.

**The heart of it is `src/lib/watches/drop-time.ts`.** `computeDropMoment` is a pure
function — no clock, no database, no network, no dependencies — so it can be tested
exhaustively, and it is, because "wrong by one hour" produces perfectly healthy-looking data
and a missed reservation. A release time is a wall-clock time in the restaurant's own city,
so midnight in New York is 04:00 UTC in August and 05:00 UTC in January; the offset is
resolved against the IANA database through `Intl` rather than assumed. An hour that occurs
twice resolves to its first occurrence, erring early rather than late. Because the function
is pure it also runs in the browser to power the live preview, so what the form shows cannot
drift from what the server saves.

The alert fires **5 minutes** before the drop (`DEFAULT_ALERT_LEAD_MINUTES`). A test pins the
figure, and the UI reads it from the constant rather than restating it.

Other things worth knowing before you touch this code:

- **Times are always shown in both zones** — the restaurant's and the user's — with the full
  date on each, because when the zones straddle midnight the *date* differs too and showing
  only the time points the user at the wrong day. The second line disappears when the zones
  match.
- **The restaurant picker is a type-ahead combobox**, and typing is deliberately not
  choosing: the submitted id lives in a hidden input set only by picking from the list, and
  typing clears it. That is an honesty measure, not a control — the server re-checks the id.
- **Editing keeps the restaurant fixed** (changing it would make it a different watch) and
  rebuilds alerts only when the date moves. Superseded alerts are *cancelled*, not deleted,
  because an alert already sent is history rather than scratch data.
- **Authorization is uniform:** every read is a `findFirst` scoped by `userId`, so another
  account's watch 404s exactly like an id that never existed, and every write keeps `userId`
  in its `where` clause. See the RLS warning in §6 for why this is not optional.
- **Two failure paths are product behaviour, not errors:** a duplicate watch is caught from
  the database's own unique constraint and explained, and a date whose window has already
  opened is refused with a direct booking link, since an alert would arrive too late to help.

### Built: the seed, and why the data is entered this way

`prisma/seed/nyc-restaurants.ts` holds **8 real, hand-researched New York restaurants** —
Minetta Tavern, Or'esh, L'Artusi, The Four Horsemen, Via Carota, Soothr, Don Angie and
Torrisi — across Resy, DoorDash and OpenTable, each with a real booking window, release time
and booking URL, plus a `source` recording where it was read and when.

This is a seed file rather than an admin form on purpose: the data is version-controlled,
type-checked, reviewable in a diff, and needs no authorization model for a dataset only we
edit. Two rules make it safe:

- **Nothing is guessed.** Unresearched values hold a `TODO` sentinel; the runner skips those
  rows and prints exactly which fields each one still needs, so a half-finished file is safe
  to run as often as you like. Restaurant *names* were pre-filled, but everything that
  decides *when an alert fires* was left blank until looked up.
- **It is validated like any untrusted input**, by Zod in `prisma/seed/validate.ts`: https
  URLs only, `HH:MM` times, a place-based IANA timezone (a fixed-offset name like `EST` is
  rejected, because it never observes DST and would put half the year's drops an hour out),
  and a booking URL cross-checked against the platform's own host.

Release times are usefully varied — 07:00, 09:00, 10:00 and midnight, with windows from 7 to
30 days — which is what makes the timezone conversion visibly do something in a demo.

> ⚠️ Don Angie's booking URL is an OpenTable availability link carrying a `correlationId`
> query parameter from the session it was copied out of. It works and passes validation, but
> it is session-scoped rather than a stable venue page and should be replaced.

### 🔜 Immediate next step: UI and visual design

**This is the next task, and the reason this handover was written.** Every screen currently
uses unstyled-to-lightly-styled Tailwind defaults. The functionality is there; the product
does not yet look like a product.

What exists to design against — no new features are needed for this work:

| Screen | Route | State |
| --- | --- | --- |
| Landing | `/` | placeholder copy, CTA varies by sign-in state |
| Signup / login | `/signup`, `/login` | centred card, working validation and error states |
| Dashboard | `/dashboard` | lists this user's watches as cards |
| Create watch | `/watches/new` | combobox, fieldset, live drop preview |
| Edit watch | `/watches/[id]/edit` | same fieldset, restaurant fixed |

Guidance for whoever picks this up:

- **Theme tokens go in the `@theme` block of `src/app/globals.css`.** Tailwind v4 has no
  `tailwind.config.js` (§6). Some tokens already exist — extend them rather than scattering
  literal colours through components.
- **Reuse the shared field components** in `src/components/forms/fields.tsx`. Auth and watch
  forms both render through them, so restyling there restyles everything consistently. That
  sharing is the main reason a redesign is tractable at all.
- **The dual-timezone display is the product's signature moment.** It is currently plain
  text; it is the thing most worth designing well, and the thing a demo audience will look at.
- **Do not break the accessibility already in the combobox** — it implements the ARIA
  combobox pattern with keyboard navigation. Restyle it; do not rewrite it casually.
- **Empty states are missing** and matter for a demo: a dashboard with no watches, and a
  search that matches no restaurant.
- Loading and pending states exist via `useActionState`'s pending flag but are visually
  minimal.

### 🔜 After that: the AI natural-language parse endpoint

**The idea.** The user types one sentence — *"table for 2 at Via Carota next Friday for
dinner"* — and it is turned into the four structured fields the form needs, which they then
confirm.

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

One thing is easier than it was when this was first written: **restaurant resolution is
already solved**. `matchesQuery` and `filterRestaurants` in `src/lib/watches/options.ts` are
pure, tested, accent-insensitive and word-order-insensitive. The model returns a name; feed
it through those rather than inventing new matching.

### 🔜 Then: actually sending the alerts

The largest remaining gap in the product, and worth being honest about in the presentation:
**nothing sends anything yet.** `drop_alerts` rows are computed and stored with the right
instants, and the `(status, alertAt)` index exists precisely to serve "which alerts are due
now?", but no scheduler reads it and the `notifications` table is never written to.

A Vercel Cron job hitting a protected route handler is the obvious shape. Note the honest
constraint for the demo: cron on the free plan runs at most daily, which is far too coarse
for a to-the-minute alert. Say so rather than implying it works — a clear account of the
limitation is worth more marks than a vague claim.

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

**🔴 The env vars may still not be on Vercel, and this blocks merging `feat/watches`.**
Whether they were ever added has not been verified — check the dashboard. It used to be
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
field would therefore fail validation instead of taking its default. The `field()` helper —
now in **`src/lib/form-data.ts`**, shared by auth and watches — normalises `null` to
`undefined`; use it for every form read.

**🔴 `prisma migrate diff` will happily generate a destructive migration.** Changing
`platform` from an enum to text produced `DROP COLUMN` + `ADD COLUMN`, which would have
discarded every stored value. The applied migration
(`20260822150245_platform_as_validated_slug`) is **hand-written** to convert in place with
`USING lower(platform::text)`. Always read generated migration SQL before applying it, and
check for `DROP COLUMN` on a column that holds data.

**🟠 Prisma cannot express `CHECK` constraints, so it cannot see them either.** The slug
constraint on both `platform` columns lives only in the migration SQL. `prisma migrate diff`
reports no drift because the constraint is invisible to it — which is fine, but it means
nothing will warn you if `PLATFORM_SLUG_PATTERN` in `src/lib/watches/platforms.ts` drifts
away from the SQL. Change them together.

**🟠 A Postgres enum cannot be extended inside the transaction that extends it.**
`ALTER TYPE … ADD VALUE` cannot be used in the same transaction that adds the value, which
fights the way Prisma wraps migrations. This is part of why `platform` is text (§3).

**🟠 Timezone validation has two different jobs.** `isKnownTimezone` accepts anything `Intl`
recognises and is right for a *user's* timezone. `isRegionTimezone` additionally requires a
place-based name containing `/`, and is what release rules must use: `EST` is a valid
timezone name but a fixed offset that never observes DST, so half the year's drops would be
an hour out. Both are in `src/lib/time.ts`.

**🟠 The seed runner must use the transaction client.** Inside `prisma.$transaction(async
(tx) => …)`, use `tx`, not the outer `prisma`. Using `prisma` compiles, runs, and silently
executes outside the transaction — a bug that was caught and fixed once already here.

**🟠 Tests and the seed run through `tsx`, not `tsc`.** `moduleResolution: "bundler"` plus
the generated client's extensionless imports do not agree with plain `tsc` execution.
`npm test` (Vitest) and `npm run db:seed` (`tsx`) both handle it; `vitest.config.mts` mirrors
the `@/*` alias so tests resolve modules the same way the app does.

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
| 1 | Link to app on Vercel | 🟡 **Live, but stale** | https://firstseat-lemon.vercel.app still serves the placeholder — everything real is on `feat/watches`. Merging it (after §0) is what makes this deliverable real, and it is the highest-value unblocked task after the UI work |
| 2 | Link to GitHub repository | ✅ **Done** | https://github.com/AmitNeumann/firstseat (private — make public or add graders before submitting) |
| 3 | Product spec document | ❌ **Outstanding** | Problem, users, customer, business goals, required capabilities, core user flows. §1 here is a first draft to expand |
| 4 | Technical design document | 🟡 **Partly** | Schema, folder structure, auth and watch flows, validation and error handling are captured here; still needs state management and UX |
| 5 | Test spec document | ❌ **Outstanding** | Core features, invalid inputs, business flows, permissions, DB, edge cases, basic UI. The 136 existing tests are raw material — write the spec from what they already assert, then fill the gaps |
| 6 | Test code | 🟡 **Partly** | Vitest installed; **136 unit tests over 5 files**, covering the drop-time calculation (incl. DST), platform slugs, seed validation, watch schemas and restaurant search. Missing: component tests (React Testing Library) and E2E (Playwright), especially the authorization paths — that another user's watch 404s is currently verified only by reading the code |
| 7 | Scale document | ❌ **Outstanding** | Good raw material exists: indexes, pooled vs direct connections, `React.cache` in the DAL, static prerendering, pagination plans, and per-user rate limiting once the AI endpoint exists |
| 8 | Security document | ❌ **Outstanding** | Plenty of material now: Supabase Auth, `getUser()` vs `getSession()`, the DAL as the authorization gate, **the RLS/Prisma caveat**, Zod validation, non-enumerable login errors, the open-redirect guard on `/auth/confirm`, the `no-store` headers on session responses, secret handling, the `npm audit` triage |
| 9 | Local run instructions | 🟡 **Partly** | §7 here covers it; `README.md` is still the default create-next-app text and must be rewritten |
| 10 | 10–15 min presentation | ❌ **Outstanding** | Product, problem, users, business value, architecture, DB, flows, tests, scale, security, what you'd improve |

### Also required by the brief, not yet started

- **Architecture document** (§3 of the brief): components, pages, API routes/server actions,
  data flow between frontend/backend/database, roles and permissions, third-party services and why.
- **Working product features.** Authentication and watches are both built on `feat/watches`.
  The remaining functional gap is that **no alert is ever actually sent** (§5) — the alerts
  are computed and stored, but nothing delivers them. The AI natural-language parse endpoint
  (§5) is planned on top of watches, and also covers the brief's "which external libraries or
  services did you integrate, and why".
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
npm test                    # Vitest, single run (136 tests)
npm run test:watch          # Vitest in watch mode

# Prisma / database
npm run db:seed                                      # validate + upsert the restaurant seed
npx prisma migrate dev --name describe_the_change    # create + apply a migration
npx prisma migrate status                            # is the DB in sync?
npx prisma generate                                  # rebuild the client after schema edits
npx prisma studio                                    # browse/edit data in a local GUI
npx prisma db pull --print                           # print the LIVE db structure (verification)
npx prisma migrate deploy                            # apply migrations in CI/production

# Read a generated migration BEFORE applying it (see §6 — diff can be destructive)
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script

# Git — currently on feat/watches, which tracks origin/feat/watches
git status -sb                                       # branch + tracking + dirty files
git add -A && git commit -m "message" && git push
git log --oneline --graph --all -14                  # see how the branches sit

# Merging to main — ONLY after the two steps in §0. This deploys.
# Merge feat/watches; it already contains feat/auth.
git checkout main && git merge --ff-only feat/watches && git push

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
