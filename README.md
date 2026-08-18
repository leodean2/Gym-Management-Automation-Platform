# Gym Rocks Fitness — Gym Management & Automation Platform

## Project structure

```
gymrocks/
├── client/                 # React + Vite frontend (not yet scaffolded)
├── docs/                   # SRS, ERD, API design references
└── server/                 # Node.js + Express + Prisma backend
    ├── prisma/
    │   └── schema.prisma   # Full 13-domain schema, reconciled against the SRS
    ├── src/
    │   ├── config/         # env.js (validated config), db.js (Prisma client)
    │   ├── lib/             # AppError, apiResponse envelope, asyncHandler
    │   ├── middleware/      # authenticate, authorize (RBAC), rateLimiter, errorHandler
    │   ├── modules/         # one folder per SRS feature (14 total)
    │   │   ├── auth/         # ✅ fully implemented — reference module
    │   │   ├── members/      # 🔲 stubbed, follow auth/ as the pattern
    │   │   ├── memberships/  # 🔲 stubbed
    │   │   ├── attendance/   # 🔲 stubbed
    │   │   ├── trainer-workouts/  # 🔲 stubbed
    │   │   ├── nutrition/    # 🔲 stubbed
    │   │   ├── workout-logging/   # 🔲 stubbed
    │   │   ├── progress/     # 🔲 stubbed
    │   │   ├── exercise-library/  # 🔲 stubbed
    │   │   ├── booking/      # 🔲 stubbed
    │   │   ├── payments/     # 🔲 stubbed
    │   │   ├── analytics/    # 🔲 stubbed
    │   │   ├── notifications/# 🔲 stubbed
    │   │   └── inquiries/    # 🔲 stubbed
    │   ├── jobs/             # scheduled/time-driven processes (membership expiry, reminders)
    │   ├── app.js            # Express app, middleware stack, route mounting
    │   └── server.js         # entry point
    └── tests/
```

## Module pattern

Every module follows the same four-file shape (see `modules/auth/` for a
fully worked example):

- **`*.routes.js`** — endpoint definitions; declares which roles
  (`authorize(...)`) can hit each one.
- **`*.controller.js`** — thin HTTP layer: validate input, call the
  service, shape the `{ data, error }` response.
- **`*.service.js`** — actual business logic and Prisma calls. No
  `req`/`res` here — keeps this layer independently testable.
- **`*.validation.js`** — Zod schemas for request bodies.

This mirrors the module boundaries from the ERD's 13 domains and the frozen
API design, so "where does this logic live" should almost always have an
obvious answer.

## Getting started

```bash
cd server
cp .env.example .env      # fill in your real Neon DATABASE_URL and secrets
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

After the first migration is generated, remember to hand-add the two
PostgreSQL features Prisma cannot express directly (both are documented as
comments directly in `schema.prisma`, right next to the relevant model):

1. `Membership` — partial unique index enforcing one Active membership per
   member (FR-3.11).
2. `Booking` — exclusion constraint preventing overlapping Scheduled
   bookings per trainer (FR-10.4).

## Build order

Follow the same dependency order the SRS itself was built in:

1. **Auth** (done) → 2. Members → 3. Memberships → 4. Attendance →
5. Trainer/Workouts → 6. Nutrition → 7. Workout Logging → 8. Progress →
9. Exercise Library → 10. Booking → 11. Payments → 12. Analytics →
13. Notifications → 14. Inquiries

Each module depends on the ones before it being in place, exactly as
documented in the SRS's own "why this order" reasoning.
