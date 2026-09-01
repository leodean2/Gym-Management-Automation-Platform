# Gym Rocks Fitness — Gym Management & Automation Platform

[![CI](https://github.com/leodean2/Gym-Management-Automation-Platform/actions/workflows/ci.yml/badge.svg)](https://github.com/leodean2/Gym-Management-Automation-Platform/actions/workflows/ci.yml)

A full-featured gym management backend covering all 14 SRS features:
authentication, member/trainer management, memberships & billing,
attendance, workout programs & logging, nutrition, progress tracking,
exercise library, booking & scheduling, payments & invoicing, analytics,
notifications, and inquiries.

**Status: all 14 modules implemented and covered by an automated
integration test suite.** See [Known issues](#known-issues) below for
the one outstanding tracked bug.

## Project structure

```
gymrocks/
├── client/                 # React + Vite frontend (not yet scaffolded)
├── docs/                   # SRS, ERD, API design references
└── server/                 # Node.js + Express + Prisma backend
    ├── prisma/
    │   ├── schema.prisma   # Full schema, all 14 SRS domains
    │   ├── migrations/     # Prisma migration history
    │   └── seed.js         # Demo/dev data — see "Seeding" below
    ├── scripts/            # One-off bootstrap scripts (see "Bootstrapping")
    ├── src/
    │   ├── config/         # env.js (validated config), db.js (Prisma client)
    │   ├── lib/            # AppError, apiResponse envelope, asyncHandler
    │   ├── middleware/     # authenticate, authorize (RBAC), rateLimiter, validate, errorHandler
    │   ├── modules/        # one folder per SRS feature (14 total, all complete)
    │   │   ├── auth/
    │   │   ├── members/
    │   │   ├── memberships/
    │   │   ├── attendance/
    │   │   ├── trainer-workouts/   # Feature 5: Trainer Mgmt + Workout Programs
    │   │   ├── nutrition/
    │   │   ├── workout-logging/
    │   │   ├── progress/           # Feature 8: Body Measurements + Personal Records
    │   │   ├── exercise-library/
    │   │   ├── booking/
    │   │   ├── payments/
    │   │   ├── analytics/
    │   │   ├── notifications/
    │   │   └── inquiries/
    │   ├── app.js          # Express app, middleware stack, route mounting
    │   └── server.js       # entry point
    └── tests/
        ├── helpers/        # testApp, testDb, auth, seed (test-only)
        ├── integration/    # one file per feature slice + regression tests
        ├── globalSetup.js  # truncates the TEST database once, before the suite runs
        └── jest.setup.js
```

## Module pattern

Every module follows the same layered shape:

- **`*.routes.js`** — endpoint definitions; declares which roles
  (`authorize(...)`) can hit each one, and which Zod schema (`validate(...)`)
  guards the request body/query.
- **`*.controller.js`** — thin HTTP layer: pull validated input off `req`,
  call the service, shape the `{ data, error }` response. No business logic.
- **`*.service.js`** — actual business logic. No `req`/`res` here — keeps
  this layer independently testable and framework-agnostic.
- **`*.repository.js`** — Prisma calls only. No authorization, no business
  rules.
- **`*.validation.js`** — Zod schemas for request bodies/queries.
- **`*.constants.js`** — role groups used by the routes file.

Modules that own more than one URL prefix (e.g. Booking owns both
`/trainer-availability` and `/bookings`) export multiple routers instead of
one; see `app.js` for how each is mounted.

## Getting started (development)

```bash
cd server
cp .env.example .env      # fill in your real Neon DATABASE_URL, DIRECT_URL, and secrets
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Bootstrapping the first user

Every write endpoint in this API requires an authenticated staff user —
including the endpoints that create *other* staff users. On a brand-new
database there is no user at all, so the very first account has to be
created directly, bypassing the API. Two options:

**Option A — run the seed script (recommended for local dev):**

```bash
npx prisma db seed
```

Populates a full demo dataset — see [Seeding](#seeding) below. Fastest way
to get a usable, logged-in-ready database.

**Option B — bootstrap a single account by hand:**

```bash
node scripts/seed-user.js <email> <password> <role>
# e.g. node scripts/seed-user.js admin@example.com ChangeMe123! SuperAdmin
```

Valid roles: `SuperAdmin`, `GymOwner`, `Receptionist`. Once one staff
account exists, every other account (Trainer, Member, additional staff)
can be created through the normal API.

## Seeding

`npx prisma db seed` runs `prisma/seed.js`, which populates:

- 3 staff accounts (SuperAdmin, GymOwner, Receptionist)
- 1 Trainer (assigned to Member #1)
- 2 Members (one assigned to the Trainer, one deliberately unassigned)
- 3 Membership Plans (Basic, Gold, Platinum)
- 7 Exercise Library entries (Weighted, Bodyweight, and Cardio types)
- 1 Workout Program Template with a Session and 3 TemplateExercises
- 1 Nutrition Plan Template

All seeded accounts use the password `Password123!` — **development/demo
data only, never run this against a production database.**

The script is idempotent — checks for `superadmin@gymrocksfitness.com` and
exits cleanly if seed data already exists, rather than creating duplicates.
It generates membership/employee numbers dynamically (via a query-based
"next sequence" lookup, not hardcoded), so it's safe to run against a
database that already has some real data in it too — it just won't
re-seed if the marker account already exists.

## Manual schema additions

Two PostgreSQL features Prisma cannot express directly. Both must be
applied by hand to any fresh database, immediately after the first
`prisma migrate dev` — they are documented as comments in `schema.prisma`
next to the relevant model, but are **not** captured in a runnable Prisma
migration automatically:

1. **`Membership`** — partial unique index enforcing one Active membership
   per member (FR-3.11).
2. **`Booking`** — exclusion constraint preventing overlapping `Scheduled`
   bookings per trainer (FR-10.4):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    trainer_id WITH =,
    tsrange(booking_date + start_time, booking_date + end_time) WITH &&
  ) WHERE (status = 'Scheduled');
```

If you create a new database (including a fresh test database, or a Neon
branch), both of these need to be re-applied manually — `prisma migrate
deploy` alone will not add them unless they exist as real migration SQL in
your `prisma/migrations/` history.

## Testing

Integration tests run against a **separate, dedicated test database** —
never your dev database. This matters: tests fully truncate every table
before running.

### One-time test database setup

1. Create a separate Neon database or branch for testing.
2. Add its connection string to `.env` as `TEST_DATABASE_URL` (alongside
   your existing `DATABASE_URL`/`DIRECT_URL` — all three coexist in the
   same file).
3. Apply the schema to it. Easiest approach: temporarily point
   `DATABASE_URL`/`DIRECT_URL` at the test database, run
   `npx prisma migrate deploy`, then apply the manual SQL from
   [Manual schema additions](#manual-schema-additions) above (via Neon's
   SQL Editor), then revert `DATABASE_URL`/`DIRECT_URL` back to dev.
4. **If using a Neon branch created from dev**, it will already contain a
   copy of your dev data — truncate it once via Neon's SQL Editor before
   running tests the first time (see `tests/globalSetup.js`'s table list
   for the exact statement).
5. **Disable branch/compute expiry** if your Neon plan applies one by
   default — an expiring test branch will silently break `npm test` after
   however many hours the expiry is set to, and needs re-creating +
   re-migrating from scratch each time.

### Running tests

```bash
npm test
```

Runs Jest with `--runInBand` (serial execution — tests share one live
database, so parallel runs would cause data races) against
`TEST_DATABASE_URL`. `tests/globalSetup.js` truncates every table once,
before any test file runs — not per-file — to avoid a real race condition
we hit during development (a per-file truncate that outlived Jest's hook
timeout deleted rows out from under a different, still-running test file).

Test structure:
- `tests/integration/memberships.test.js` — Slice 1: full membership
  activation (plan → member → membership → invoice → payment → activation
  → history → receipt), plus a regression test for plan-change renewals.
- `tests/integration/trainer-workflow.test.js` — Slice 2: Trainer →
  Workout Program Template → assignment → Member logs a workout →
  finalizes → Personal Record created automatically.
- `tests/integration/bookings.test.js` — Slice 3: availability → booking
  → overlap rejection (both member-side and trainer-side, isolated from
  each other).
- `tests/integration/inquiries.test.js` — Slice 4: the full status/outcome
  conditional logic, including closing, correcting outcome after closure,
  and rejecting reopening.
- `tests/integration/notifications.test.js` — Slice 5: recipient scoping,
  mark-read idempotency, resend + attempt numbering.
- `tests/integration/_regressions.test.js` — standalone regression tests
  for bugs that don't map to one feature slice.

Because every module's repository imports `src/config/db.js` directly,
tests use `jest.mock('../../src/config/db', () => require('./testDb'))`
in `tests/helpers/testApp.js` to redirect every Prisma call to the test
database — this **must** use `jest.mock`, not a manual `require.cache`
override; Jest maintains its own internal module registry that a direct
`require.cache` mutation does not affect.

## Known issues

- **`combineDateAndTime` (booking.service.js) is timezone-dependent.**
  Uses `Date.setHours()` (host-machine-local-timezone interpretation)
  instead of `setUTCHours()`/`Date.UTC()`. Identical
  `booking_date`/`start_time` input produces different stored UTC values
  depending on the server process's system timezone. Not currently
  causing incorrect behavior (all comparisons happen consistently within
  one machine), but will silently shift stored booking times if deployed
  to a server with a different timezone than whatever machine created the
  data. **Fix before any production deployment.** Tracked as a skipped
  test in `tests/integration/_regressions.test.js` with a note on why it
  needs a unit test, not an integration test, once fixed.

## Build order (historical)

All 14 features were built in this dependency order, matching the SRS's
own reasoning for why each module depends on the ones before it:

1. Auth → 2. Members → 3. Memberships → 4. Attendance → 5. Trainer
Management & Workout Programs → 6. Nutrition → 7. Workout Logging →
8. Progress → 9. Exercise Library → 10. Booking → 11. Payments →
12. Analytics → 13. Notifications → 14. Inquiries
