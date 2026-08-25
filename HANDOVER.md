# FirstSeat — Project Handover

This document is the single source of truth for continuing work on FirstSeat. It assumes
zero prior context. Read it top to bottom before making changes.

**Last updated:** 25 August 2026
**Course deadline:** 6 September 2026
**Course brief:** `~/Desktop/fullstack project.docx` (RUNI CS 2026, "Become a Full-Stack Engineer")

---

## 0. Start here — state as of this update

| | |
| --- | --- |
| **Current branch** | `feat/watches` — tracks `origin/feat/watches`, not merged to `main`. Check `git log -5 --oneline` rather than trusting a hash here. Last origin commit before this handover: `4eec787` (Terms / Privacy pages). |
| **Working tree** | check `git status -sb`. Catalog autocomplete, `Hi {name}! Your Watches`, landing icon+title row, and new-watch spacing may still be **local uncommitted files** on top of origin — they live in this workspace even if a fresh clone of origin does not have them yet. |
| **What works locally** | designed signed-out landing (Minetta-only Try it demo, feature-card icon+title on one row), designed sign-in/sign-up **with first/last name** and a **By continuing…** Terms/Privacy line, designed My Watches (`/dashboard`, avatar menu, `Hi {name}! Your Watches` on one line when named), designed Restaurants catalog (`/restaurants`, typographic cards, autocomplete combobox), public **Terms** (`/terms`) and **Privacy** (`/privacy`), Settings (`/settings`: one card — name, email, timezone), logout, email confirmation; create / edit / cancel a watch (refusals show next to Create watch); timezone-aware drop-time calculation; 8 real seeded restaurants |
| **What is not designed yet** | the create/edit-watch **screen** (`/watches/new` and `/watches/[id]/edit` still use the earlier form card, not the designed treatment). **This is the immediate next step.** |
| **What does not exist yet** | **actually sending alerts** (top remaining *product* gap after the create/edit screen is styled — Resend + Vercel cron, see §5), the AI parse endpoint (planned after that; wire into create-watch and the Minetta landing demo), most course documents (§8) |
| **Tests** | Vitest, 8 files, **175 tests passing** locally (173 on origin until the uncommitted catalog-search tests are committed). No component or end-to-end tests yet |
| **Live site** | https://firstseat-lemon.vercel.app — returns 200 but still serves the **"coming soon" placeholder**. Verified, not assumed |

### 🔴 The deployment picture, which is easy to misread

Three branches, and none of the real product is deployed:

| Ref | Commit | Contains |
| --- | --- | --- |
| `origin/main` | `7857ff6` | placeholder + first handover. **This is what Vercel serves.** |
| `main` (local) | `498c845` | ⚠️ 1 commit ahead of `origin/main`, **unpushed** — auth was fast-forwarded onto local `main` and never pushed |
| `feat/auth` | `b3d1d71` | fully contained in `feat/watches`; nothing unique left on it |
| `feat/watches` | working branch | everything: auth, watches, seed, tests, design foundation, landing, auth screens, My Watches, catalog, Settings, user names, Terms / Privacy |

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
`feat/watches` (it contains `feat/auth`), not both. Also apply the two newer migrations
(`image_url`, user names) wherever the database is used.

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
| UI | Tailwind CSS v4 | 🟡 design system applied; landing, auth, My Watches, catalog, Settings, and Terms/Privacy designed; create/edit **screen** still needs the visual treatment |
| Linting | ESLint 9 (`eslint-config-next`) | ✅ passing |
| Validation | Zod 4.4.3 | ✅ auth forms, watch forms, Settings, and the seed data |
| Database | Supabase Postgres (free plan, London / eu-west-2) | ✅ tables created, **5 migrations** applied locally |
| ORM | Prisma 7.9.1 + `@prisma/adapter-pg` | ✅ connected and verified |
| Auth | Supabase Auth via `@supabase/ssr` 0.12.4 | ✅ signup, login, logout, `users` row on first sign-in |
| Seeding | `tsx` + `dotenv`, `npm run db:seed` | ✅ 8 real NYC restaurants (with optional `imageUrl` paths) |
| UI design | Fraunces / Newsreader / Manrope + cream/clay/honey/apricot tokens | 🟡 foundation + landing + auth + My Watches + catalog + Settings + Terms/Privacy done; **create/edit watch screen is next for design** |
| Testing | Vitest 4.1.11 | ✅ 175 unit tests passing locally (8 files); ❌ no component or E2E tests |
| Hosting | Vercel, auto-deploys on push to `main` | 🟡 live but serving the placeholder |
| Runtime | Node v24.16.0, npm 11.13.0 | — |
| Alert delivery | `drop_alerts` stored, nothing sent | 🔜 **top remaining product gap after the create/edit screen is styled**, see §5 |
| AI parse endpoint | provider not chosen yet | 🔜 planned after the create/edit screen is styled and after email sending, see §5 |

There is deliberately **no** UI component library, form library, date library or timezone
library. Dates and timezones are handled with the platform's own `Intl` API (§5), which is a
decision to be able to defend rather than an omission.

### Live locations

- **GitHub (private):** https://github.com/AmitNeumann/firstseat
  - `main` — `origin/main` is `7857ff6`, the placeholder. This is what is deployed.
  - `feat/auth` — `b3d1d71`, now entirely contained in `feat/watches`.
  - `feat/watches` — the working branch. After this handover is pushed, origin matches
    that commit; check `git status -sb` for leftover **uncommitted** UX files (catalog
    combobox, My Watches title, landing icon row, new-watch spacing).
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

Five migrations, applied in order:

| Migration | What it did |
| --- | --- |
| `20260819180426_init` | the six `CREATE TABLE` statements |
| `20260820134220_one_release_rule_per_platform` | unique `(restaurant_id, platform)`, so re-running the seed cannot duplicate rules |
| `20260822150245_platform_as_validated_slug` | `platform` from enum to `varchar(40)` + `CHECK`, **hand-written** (see §6) |
| `20260825160345_add_restaurant_image_url` | nullable `restaurants.image_url` for catalog photos |
| `20260825162711_add_user_names` | nullable `users.first_name` / `users.last_name` |

The last two are on `feat/watches` and have been applied to the linked database.

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

**`users`** — application profile for a Supabase Auth user.
`id` (uuid, PK), `email` (unique), `firstName` / `lastName` (nullable), `timezone`
(default `Europe/London`), timestamps.
🔑 **`id` has no default on purpose** — it must be set to the Supabase Auth user's ID so that
`users.id` and `auth.users.id` are the same value.
Empty names store `null`, so the avatar falls back to the email's first letter and My
Watches does not render a broken "Hi !".

**`restaurants`** — `id`, `name`, `city`, optional `imageUrl` (`image_url`), timestamps.
`imageUrl` is still on the model and in the seed (app-relative paths under `public/`). The
catalog cards are **typographic** and do not render it; `public/restaurants/` is `.gitkeep`
only. Unique on `(name, city)`; indexed on `city`.

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
├── public/restaurants/      ← .gitkeep only; seed still has imageUrl paths, but catalog
│                              cards are typographic (no photo slot)
├── content/                 ← source markdown for public legal pages
│   ├── terms.md
│   └── privacy.md
├── prisma/
│   ├── schema.prisma        ← the six models + five enums (platform is NOT an enum)
│   ├── seed.ts              ← the runner: validates, upserts in a transaction, reports gaps
│   ├── seed/
│   │   ├── nyc-restaurants.ts  ← 🖊️ THE DATA FILE — 8 real restaurants, hand-researched
│   │   ├── types.ts            ← the TODO sentinel, Researched<T>, missingFields()
│   │   └── validate.ts         ← Zod schema for hand-entered data (§5)
│   └── migrations/          ← 5 migrations, listed in §3
└── src/
    ├── proxy.ts             ← refreshes the auth session cookie on every request (§6)
    ├── app/
    │   ├── layout.tsx       ← root layout, fonts, metadata
    │   ├── page.tsx         ← designed signed-out landing; signed-in visitors redirect to /dashboard
    │   ├── globals.css      ← Tailwind v4 + @theme tokens (cream/clay/honey/apricot; light only)
    │   ├── (auth)/          ← route group: adds a layout without adding a path segment
    │   │   ├── layout.tsx   ← site header + footer around the auth pages
    │   │   ├── login/page.tsx
    │   │   └── signup/page.tsx
    │   ├── auth/confirm/route.ts   ← where the emailed confirmation link lands
    │   ├── dashboard/page.tsx      ← protected; designed My Watches
    │   ├── restaurants/page.tsx    ← protected; designed catalog ("The list")
    │   ├── settings/page.tsx       ← protected; one card (name, email, timezone)
    │   ├── (legal)/                ← route group: public Terms / Privacy, signed-out chrome
    │   │   ├── layout.tsx
    │   │   ├── terms/page.tsx      ← /terms
    │   │   └── privacy/page.tsx    ← /privacy
    │   └── watches/
    │       ├── new/page.tsx        ← create a watch (functional; not yet the designed screen)
    │       └── [id]/edit/page.tsx  ← edit one; 404s for someone else's watch
    ├── components/
    │   ├── forms/fields.tsx        ← FieldShell / SelectField / TextField / DateField / FormAlert / SubmitButton
    │   ├── site/                   ← logo, sticky header, account-menu, footer (FirstSeat · New York · Terms · Privacy)
    │   ├── landing/                ← Try it card, Minetta preview, feature-icon (speech / clock / bell)
    │   ├── auth/                   ← auth-frame (optional belowForm for the signup agreement), form-fields, login-form, signup-form, sign-out-button
    │   ├── restaurants/            ← catalog, restaurant-card (typographic, no photo)
    │   ├── settings/               ← settings-card, profile-form
    │   ├── legal/                  ← LegalDocument: reads content/*.md, Fraunces title / Newsreader h2
    │   └── watches/
    │       ├── create-watch-form.tsx   ← Client Component, useActionState
    │       ├── edit-watch-form.tsx
    │       ├── watch-fieldset.tsx      ← date + party size + meal, shared by both forms
    │       ├── restaurant-picker.tsx   ← accessible type-ahead combobox
    │       ├── drop-preview.tsx        ← currently shown live while filling in; hide until after submit
    │       ├── watch-form-message.tsx  ← whole-form refusal next to the submit button
    │       ├── drop-times.tsx          ← honey dual-timezone panel (the signature moment)
    │       ├── watch-card.tsx          ← pending card + espresso "window is open" card
    │       ├── watch-list.tsx          ← Client Component: ticking clock, title, empty state
    │       └── use-ticking-now.ts      ← one-second clock via useSyncExternalStore
    ├── generated/prisma/    ← GENERATED, git-ignored, rebuilt by `prisma generate`
    └── lib/
        ├── prisma.ts        ← Prisma client singleton; in dev, recreated after a schema reload (§6)
        ├── site-origin.ts   ← absolute origin for links inside auth emails
        ├── form-data.ts     ← field(): FormData.get null → undefined (§6)
        ├── time.ts          ← pure civil-date/time helpers + IANA timezone checks + listIanaTimezones
        ├── auth/
        │   ├── dal.ts       ← getAuthUser, ensureAppUser, getAppUser, requireAppUser
        │   ├── actions.ts   ← "use server": signup, login, logout, updateSettings
        │   ├── schemas.ts   ← Zod schemas + AuthFormState + SettingsFormState
        │   ├── display.ts   ← avatarInitials, greetingFirstName (pure, tested)
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
            ├── queries.ts     ← server-only reads; user data scoped by userId
            ├── options.ts     ← restaurant search/filter + catalog pills (pure, tested)
            ├── landing-demo.ts ← Minetta-only sentence parser for the signed-out Try it card
            └── format.ts      ← display formatting, incl. dual-timezone phrasing, countdown, open-window

tests/                       ← Vitest, 175 tests locally
├── drop-time.test.ts        ← the big one: DST, calendar arithmetic, invalid input
├── platforms.test.ts        ← slug rules, labels, lookalike-host rejection
├── seed-validation.test.ts  ← the hand-entered-data schema
├── restaurant-search.test.ts ← picker search + catalog pills/filters
├── watch-schema.test.ts
├── landing-demo.test.ts     ← Minetta-only parse + countdown phrasing + isDropOpen
├── timezone.test.ts         ← IANA list + UpdateTimezoneSchema
└── auth-display.test.ts     ← avatar initials, greeting, SignupSchema / UpdateNameSchema names
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

`requireAppUser()` is the gate for `/dashboard`, `/restaurants`, `/settings`,
`/watches/new`, `/watches/[id]/edit`, and every Server Action that writes user data.

### Git history

Entirely linear — no merge commits, so any eventual merge is a fast-forward.

```
* (this file)  Bring the handover up to date for legal pages, catalog search, and next steps
* 4eec787  Add public Terms and Privacy pages with signup and footer links
* 611ceff  Bring the handover up to date after Settings, names, and the catalog restyle
* 1c6abca  Tighten Settings, collect names at signup, and restyle catalog cards
* 96c50bc  Add the restaurant catalog, Settings, and signed-in chrome
* 56da067  Bring the handover up to date for the catalog, Settings, and next steps
* eed433e  Bring the handover up to date after My Watches
* d7b0343  Recreate the Prisma client in development after a schema reload
* 22e964c  Apply the designed My Watches dashboard
* 2ce239d  Bring the handover up to date for the visual design
* ca1c702  Apply the designed sign-in and sign-up screens
* 883bc45  Apply the visual design system and the signed-out landing page
* a42cb41  Bring the handover up to date for the watches feature and the UI work
* e4a89b5  Add researched release rules for seven more New York restaurants
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
- **`requireAppUser()`** is the authorization gate, called by every signed-in page and
  every action that writes user data.

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
| `npx tsc --noEmit`, `npm run lint`, `npm run build` | ✅ all clean as of the catalog / Settings / names work (`1c6abca`); re-run after further UI |

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
  That refusal used to sit at the **top** of a long form, so clicking Create watch looked
  like nothing happened. The message now sits **immediately above the submit button**
  (`watch-form-message.tsx`) and scrolls into view. The drop preview also warns when every
  window for the chosen date is already in the past. **Do not "fix" this by allowing a
  watch on an already-opened date.** Pick a date whose window has not opened yet (for a
  30-day room, more than 30 days out).

### Built: the seed, and why the data is entered this way

`prisma/seed/nyc-restaurants.ts` holds **8 real, hand-researched New York restaurants** —
Minetta Tavern, Or'esh, L'Artusi, The Four Horsemen, Via Carota, Soothr, Don Angie and
Torrisi — across Resy, DoorDash and OpenTable, each with a real booking window, release time
and booking URL, plus a `source` recording where it was read and when. Each row also has an
optional `imageUrl` such as `/restaurants/minetta-tavern.jpg`. The files themselves are
**not in `public/restaurants/`** (only `.gitkeep`), and the catalog no longer has a photo
slot — cards are typographic. The column is kept so photos can come back without another
schema change.

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

### Built: visual design — foundation, landing, auth, My Watches, catalog, Settings

The product now looks like the Claude Design file on the surfaces listed below. Logic was
not rewritten to get there.

**Shared foundation**

- **Fonts** in `src/app/layout.tsx` via `next/font/google` (self-hosted, no Google request
  from the browser): **Fraunces** (logo + landing H1), **Newsreader** (titles, times),
  **Manrope** (UI). Geist is gone.
- **Colour tokens** in `src/app/globals.css`: cream page `#FCFBF7`, clay `#C75C40`, honey
  `#F4E3C1`, apricot `#E8A98C`, espresso `#211C18`. Existing utilities (`bg-accent`,
  `text-muted`, …) are remapped onto this palette.
- **Light theme only.** The `prefers-color-scheme: dark` block was removed. The only dark
  surface in the design is the "window is open" reveal card, which is a one-off, not a
  theme.
- **Shared fields** in `src/components/forms/fields.tsx`: uppercase micro-labels, cream
  inputs, clay primary button and clay focus ring. Auth, Settings, and watch forms all
  render through these.

**Signed-in chrome**

Sticky header: logo, **My Watches** / **Restaurants** tabs, avatar menu. **New watch is
not in the header** — it is a page action on My Watches (title row, far right of the
timezone pill, and still in the empty state).

The avatar (`src/components/site/account-menu.tsx`) opens Settings and Sign out. Sign out
stays a POST form so a prefetch cannot log people out. Initials come from first + last
name (`src/lib/auth/display.ts`); if no name is set, the email's first letter. Never an
empty avatar.

**Landing `/` (signed out) — designed**

Sticky header (logo + Sign in / Sign up, no catalog tab), Fraunces headline, the Minetta
"Try it" card, three feature cards with icons (speech bubble, clock, bell) in
`src/components/landing/feature-icon.tsx`, footer. **This workspace (uncommitted):** icon
and title sit on the same row. **Origin:** icon stacked above the title. Signed-in
visitors hitting `/` are redirected to `/dashboard`.

The catalog is gated. `getLandingDemoRestaurant()` loads **only Minetta Tavern** from the
database — the other seven restaurants never leave the server. The drop times in the demo
come from the real `computeDropMoment`. Typing another restaurant name does not reveal it.

The Try it card uses a small local parser in `src/lib/watches/landing-demo.ts`. **Do not
treat gaps in that parser as a bug to fix.** It is a stand-in until the real AI parse
endpoint exists; at that point the demo will be wired to the real parser (still
Minetta-only for signed-out visitors). See §5.

**Sign in / Sign up — designed**

Two-column layout (pitch left, form right), honey benefits panel, timezone row on signup
showing the browser's IANA zone. Same Server Actions, same Zod, same `requireAppUser`.
Passwords still never touch a Client Component except as a form field.

Signup copy (do not "improve" back to older wording without asking):

- Headline: **Never miss a reservation again.**
- First bullet: **Unlimited watches on the city's most sought-after tables.**

Signup **does** collect first and last name (optional; empty stores `null`). They go into
Supabase `user_metadata` on `signUp`, and `ensureAppUser` copies them onto the `users` row
on first create. Names can still be edited later in Settings. There is still **no "we'll
start watching Minetta" pending banner**; that only makes sense once a pending watch is
actually saved, which belongs with the create-watch screen.

Directly under **Create account**, a small muted line: **By continuing, you agree to our
Terms and Privacy Policy.** Clay links to `/terms` and `/privacy`. It is a `div` passed
as `belowForm` on `AuthFrame`, not a `<p>` inside the form — `globals.css` sets
`text-wrap: pretty` on every `p`, which can collapse a short paragraph in this flex card
so it never paints. Do not put that copy back in a `<p>`. Login has no agreement line.

**My Watches `/dashboard` — designed**

Sticky site header, one Newsreader title. **This workspace (uncommitted):**
**Hi {firstName}! Your Watches** when a first name is set (title-case W, same style, one
line, `leading-[1.1]`, no emoji); tighter `gap-1` to the lede; when no first name, just
**My Watches**. **Origin:** a separate `Hi {firstName}!` line above a `My Watches` heading.
Lede + honey "your time · \<zone\>" pill + clay **New watch** on one tight row (New watch
farthest right). Cards are sorted by soonest drop.

- **Pending card:** restaurant name (Newsreader), Watching / Opens-within-24h pill, clay
  tabular countdown, the existing honey dual-timezone panel in `drop-times.tsx`, footer
  "Opens on Resy · we alert you at …", honey **Edit** and cream **Cancel**. Cancel still
  posts to `cancelWatch`.
- **Open-window card** (espresso, 30 minutes past the drop): "THE WINDOW IS OPEN",
  **OPEN** instead of a countdown, "Book on Resy ↗", Dismiss (same `cancelWatch` action).
- **Empty state:** honey-light panel, "Nothing on the books yet", clay New watch button.

Watch-loading is unchanged: `requireAppUser()` then `listWatchesForUser(user.id)`. The
ticking clock lives in a Client Component (`watch-list.tsx`) using `useSyncExternalStore`,
because the React Compiler forbids `setState` inside an effect.

**Restaurants catalog `/restaurants` — designed**

Gated with `requireAppUser()` (signed-out visitors have no tab; the URL sends them to
sign in). Title **The list**. Lede does **not** mention a restaurant count. Search
placeholder: **Search by name…**

Card grid. Each card is a **typographic** link to `/watches/new?restaurantId=…` (city as
a `NEW YORK` eyebrow, large Newsreader name, clay platform, release rule, clay **Watch
this**). No photo slot. Chips are **All**, each platform actually present in the seed,
and **Drops at midnight** when anyone releases at 00:00. The design file also had Tock
and Downtown — we do **not** invent those: there is no Tock restaurant in the seed, and
the schema stores city, not neighborhood.

Search on **origin** is still a `type="search"` box that live-filters the grid as you
type. **In this workspace (uncommitted):** `catalog.tsx` is an autocomplete-style ARIA
combobox — typing opens matching names. **Intended:** the cards stay on the chip-filtered
set until Enter or a suggestion is picked (`CatalogSelection` + `catalogCards` in
`options.ts`; the typed draft lives in a child so it cannot reach the grid). **Known
minor issue (not a blocker):** that "only filter on Enter" behaviour is not fully working
yet. Revisit later; do not block the create/edit-watch screen on it. Clearing the box is
meant to restore the chip-filtered list.

Restaurants are public reference data, so this list is not scoped by `userId` — there is
nothing personal in it. The page is still behind `requireAppUser()`.

**Settings `/settings` — designed**

One `SettingsCard` with `ProfileForm`: first name, last name, email (read-only), timezone,
one **Save**. `updateSettings` in `src/lib/auth/actions.ts` writes names and timezone in
one go, scoped by `user.id`. Empty names store `null`. Timezone options come from
`listIanaTimezones()` (`Intl.supportedValuesOf("timeZone")`). Success redirects with
`?saved=1`. This timezone is the clock My Watches uses for "your time".

**Terms `/terms` and Privacy `/privacy` — designed, public**

No sign-in. Same signed-out sticky header and footer as landing/auth. Source markdown
lives in `content/terms.md` and `content/privacy.md` and is rendered by
`src/components/legal/legal-document.tsx` (Fraunces page title, Newsreader section
headings, Manrope body, comfortable `max-w-[42rem]` column). Contact email in those
files is a `mailto:` link.

The footer on every `SiteFooter` screen is one line:
**FirstSeat · New York · Terms · Privacy**.

**Create / edit watch — functional, not yet the designed screen**

`/watches/new` and `/watches/[id]/edit` are full pages with the earlier bordered form
card. They still show a live `DropPreview` while filling in. Restaurant search on create
is the existing ARIA combobox in `restaurant-picker.tsx`; coming from the catalog
pre-fills the restaurant via `?restaurantId=`. Edit is scoped by `userId` and 404s for
someone else's watch. **This is the immediate next step** — details in §5.

**Stale Prisma client (fixed).** `/dashboard` 500ed with `Value 'resy' not found in enum
'Platform'` even though the code was already correct: `platform` is a text slug in the
schema, the generated client, and every query. There is **no live `Platform` enum**
anywhere — only historical migration SQL (`CREATE TYPE` / `DROP TYPE`), comments, and
slug tests that normalise `"RESY"` → `"resy"`. The running `next dev` process had cached
the pre-migration client on `globalThis`, so it still expected the old enum. Fix:
`src/lib/prisma.ts` now disconnects and recreates the client in development when the
module reloads (i.e. after `prisma generate`). The same trap appears after adding
`imageUrl` or `firstName`: a long-lived dev server 500s with `Unknown field` until the
module reloads. If this 500 ever returns, it is a stale dev server, not leftover enum
code — restart `next dev` and check `git grep -n "enum Platform"`.

**Design reference.** The Claude Design handoff bundle (README with tokens and per-screen
specs, plus HTML prototypes). It is not in the repo; re-share it in the next chat.

### 🔴 Immediate next (this chat): design the create / edit watch screen

**Do this first.** Restyle `/watches/new` and `/watches/[id]/edit` to match the design.
They are full pages today (form in a bordered card in `src/app/watches/new/page.tsx` and
the matching edit page). Keep that routing. Do **not** rewrite the working logic.

Keep intact: auth via Server Actions + `requireAppUser()`, `computeDropMoment` and its
tests, the ARIA combobox in `restaurant-picker.tsx` (**restyle, do not rewrite**),
validation, the edit flow (scoped by `userId`, 404 for someone else's watch), the
dual-timezone display on My Watches, the catalog, and the 8 real seeded restaurants.
Every Prisma read of user data stays scoped by `userId`.

**Visual constraints for this restyle:**

- The natural-language **"Describe it"** AI input sits on the **same cream background**
  as the rest of the form — not a separate dark box. An **"or enter it yourself"**
  divider sits between that field and the existing manual fields (restaurant combobox,
  date, party size, meal).
- The AI parse backend **is not built**. Design its place as a styled placeholder.
  Do not fake a working parser, and do not "fix" the landing Try it parser as a
  substitute.
- **Do not show the drop-time preview until after submit.**
  `create-watch-form.tsx` and `edit-watch-form.tsx` currently render `DropPreview`
  live while the user fills the form. Hide it. The computed time belongs on the
  resulting My Watches card (`drop-times.tsx`), not on the form.

| Screen | Route | State |
| --- | --- | --- |
| Landing | `/` | ✅ designed (Minetta-only Try it; feature icon+title on one row in this workspace; catalog gated) |
| Signup / login | `/signup`, `/login` | ✅ designed (two-column; first/last name on signup; **By continuing…** Terms/Privacy line on signup only) |
| Terms of Service | `/terms` | ✅ designed, public (`content/terms.md`) |
| Privacy Policy | `/privacy` | ✅ designed, public (`content/privacy.md`) |
| My Watches | `/dashboard` | ✅ designed. **This workspace (uncommitted):** `Hi {name}! Your Watches` (title case W) on one line when named, tighter `gap-1`. **Origin:** still a separate `Hi {name}!` line above `My Watches`. |
| Restaurants catalog | `/restaurants` | ✅ designed cards/chips. **This workspace (uncommitted):** autocomplete combobox; known minor issue — filter-on-Enter is not fully working. **Origin:** live-filters as you type. Click → create watch. |
| Settings | `/settings` | ✅ designed (one card: name, email, timezone; `updateSettings`) |
| Create / edit watch | `/watches/new`, `/watches/[id]/edit` | 🔜 **do this now.** Restyle in place. Cream "Describe it" placeholder + "or enter it yourself" divider + existing manual fields. **No live drop preview.** |

Guidance that still applies:

- **Theme tokens stay in the `@theme` block of `src/app/globals.css`.** Do not scatter
  literal colours through new components.
- **Reuse `src/components/forms/fields.tsx`.** Restyling there restyles every form.
- **The dual-timezone panel is already the designed honey panel** in
  `src/components/watches/drop-times.tsx`. Do not revert it to plain text.
- **Do not break the accessibility already in the combobox** — ARIA combobox with keyboard
  navigation. Restyle it; do not rewrite it casually.
- Empty states still matter for a demo: a dashboard with no watches (done), and a search
  that matches no restaurant (done on the catalog).
- Go one screen at a time. Explain each screen in plain language before building it.

### 🔜 After that: send the alert emails (top remaining product feature)

**This is the top priority among remaining *product* features** — after the create/edit
screen is styled, not instead of it. The largest functional gap, and worth being honest
about in the presentation: **nothing sends anything yet.** `drop_alerts` rows are
computed and stored with the right instants (`alertAt` = drop minus
`DEFAULT_ALERT_LEAD_MINUTES`, which is **5**), and the `(status, alertAt)` index exists
precisely to serve "which alerts are due now?", but no scheduler reads it and the
`notifications` table is never written to.

**Shape to build:** send the alert email about **5 minutes before** the drop, via
**Resend** plus a **Vercel cron** job hitting a protected route handler. Email is the
channel to build first (`NotificationChannel.EMAIL` already exists). Secrets for Resend
are server-only — never `NEXT_PUBLIC_`. Note the honest constraint for the demo: cron on
the Vercel free plan runs at most daily, which is far too coarse for a to-the-minute
alert. Say so rather than implying it works — a clear account of the limitation is worth
more marks than a vague claim.

### 🔜 Then: the AI natural-language parse endpoint

**Planned, not parked.** Build this **after** the create/edit screen is styled and
**after** email sending. Do not start it now, and do not "fix" the landing Try it parser
as a substitute. That parser is a local stand-in. When this endpoint exists, wire it
into **both** the create-watch screen (replacing the styled placeholder) **and** the
landing demo (still Minetta-only for signed-out visitors).

**The idea.** The user types one sentence — *"table for 2 at Via Carota next Friday for
dinner"* — and it is turned into the four structured fields the form needs, which they
then confirm.

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

---

## 6. Key gotchas — read before writing code

**🔴 RLS does NOT protect Prisma queries.** Prisma connects as the Postgres `postgres` role,
which bypasses Row Level Security. Supabase RLS policies will not stop a Prisma query from
reading any row. **Every query must be scoped in server-side code**, e.g.
`prisma.watch.findMany({ where: { userId: user.id } })`. Forgetting the `where` clause is the
most likely way to leak another user's data in this codebase. Enabling RLS anyway is still
worth doing as defense in depth for anything reaching the tables via the Supabase API.
Restaurants and release rules are the exception: they are the same public reference data
for everybody.

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

**🟠 A long-lived `next dev` process can keep a stale Prisma client.** The singleton used to
live on `globalThis` for the life of the process, so after `prisma generate` the old client
could still be answering queries. That is how `/dashboard` 500ed with `Value 'resy' not
found in enum 'Platform'` even though `platform` is a text slug everywhere — there is no
live `Platform` enum left (only historical migration SQL, comments, and slug tests).
`src/lib/prisma.ts` now disconnects and recreates the client in development when the module
reloads. If the 500 returns, restart `next dev`; do not hunt for leftover enum code.

**🟠 `p { text-wrap: pretty }` can hide short copy in a flex card.** `globals.css` sets
that on every `p`/`h1`–`h6`. On the signup card it collapsed the agreement line so the
accessibility tree still had the text but nothing painted. The agreement is a `div` with
`[text-wrap:wrap]` (`belowForm` on `AuthFrame`). Do not put it back in a `<p>`.

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
an hour out. Both are in `src/lib/time.ts`. Settings offers `listIanaTimezones()` (the
runtime's `Intl.supportedValuesOf("timeZone")`) so a value chosen there is one `Intl`
already knows.

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
hydration mismatch — the server never renders the value at all. The same rule forbids
calling `Date.now()` during a Server Component render (it is impure). My Watches therefore
ticks from a Client Component via `useSyncExternalStore` in `use-ticking-now.ts`; the
server snapshot is `0` and the live countdown starts after hydration.

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
the `NEXT_PUBLIC_` prefix — see §6. Sending alerts may add SMTP / Resend-style secrets the
same way: server-only, never `NEXT_PUBLIC_`.

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
| 1 | Link to app on Vercel | 🟡 **Live, but stale** | https://firstseat-lemon.vercel.app still serves the placeholder — everything real is on `feat/watches`. Merging it (after §0) is what makes this deliverable real; finishing the create/edit screen and then sending alerts are the remaining product beats |
| 2 | Link to GitHub repository | ✅ **Done** | https://github.com/AmitNeumann/firstseat (private — make public or add graders before submitting) |
| 3 | Product spec document | ❌ **Outstanding** | Problem, users, customer, business goals, required capabilities, core user flows. §1 here is a first draft to expand |
| 4 | Technical design document | 🟡 **Partly** | Schema, folder structure, auth and watch flows, validation and error handling are captured here; still needs state management and UX |
| 5 | Test spec document | ❌ **Outstanding** | Core features, invalid inputs, business flows, permissions, DB, edge cases, basic UI. The existing tests are raw material — write the spec from what they already assert, then fill the gaps |
| 6 | Test code | 🟡 **Partly** | Vitest installed; **175 unit tests over 8 files locally** (173 on origin until the uncommitted `catalogCards` tests are committed), covering the drop-time calculation (incl. DST), platform slugs, seed validation, watch schemas, restaurant search / catalog filters, the Minetta landing parser, timezone Settings, and name/initials / signup-name display. Missing: component tests (React Testing Library) and E2E (Playwright), especially the authorization paths — that another user's watch 404s is currently verified only by reading the code |
| 7 | Scale document | ❌ **Outstanding** | Good raw material exists: indexes, pooled vs direct connections, `React.cache` in the DAL, static prerendering, pagination plans, and per-user rate limiting once the AI endpoint exists |
| 8 | Security document | ❌ **Outstanding** | Plenty of material now: Supabase Auth, `getUser()` vs `getSession()`, the DAL as the authorization gate, **the RLS/Prisma caveat**, Zod validation, non-enumerable login errors, the open-redirect guard on `/auth/confirm`, the `no-store` headers on session responses, secret handling, the `npm audit` triage |
| 9 | Local run instructions | 🟡 **Partly** | §7 here covers it; `README.md` is still the default create-next-app text and must be rewritten |
| 10 | 10–15 min presentation | ❌ **Outstanding** | Product, problem, users, business value, architecture, DB, flows, tests, scale, security, what you'd improve |

### Also required by the brief, not yet started

- **Architecture document** (§3 of the brief): components, pages, API routes/server actions,
  data flow between frontend/backend/database, roles and permissions, third-party services and why.
- **Working product features.** Authentication, watches, the catalog, Settings, and
  Terms/Privacy are built locally on `feat/watches`. Immediate next is the create/edit
  **visual** treatment. After that, the remaining functional gap that matters for the
  demo is that **no alert is ever actually sent** (§5) — the alerts are computed and
  stored, but nothing delivers them (build with Resend + Vercel cron). The AI
  natural-language parse endpoint (§5) is planned after that, and also covers the brief's
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
npm test                    # Vitest, single run (175 locally / 173 on origin)
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
  Only `.env.example` is tracked; `.env.local` is gitignored.
- **Do not merge or push `main`.** Vercel deploys `main`. Local `main` is one commit ahead
  of `origin/main` and must stay unpushed until the four env vars are on Vercel (§0).
  Work stays on `feat/watches`.
- **Keep working:** auth (`getUser()` / `requireAppUser()`), `computeDropMoment`, the
  create-watch ARIA combobox, and the dual-timezone display.
- **Prefer being able to explain a decision over adding a feature.** That is what the brief grades.
