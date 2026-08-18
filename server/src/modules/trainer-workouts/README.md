# Feature 5 — Trainer Management & Workout Programs

Reference: SRS Feature 5, and the corresponding section of the frozen
API design (`docs/api-design.md`).

Follow the `auth` module as the structural template:
- `trainer-workouts.routes.js` — endpoint definitions, auth/authorize middleware, roles
- `trainer-workouts.controller.js` — thin HTTP layer (validate → call service → respond)
- `trainer-workouts.service.js` — business logic, Prisma calls, FR-derived rules
- `trainer-workouts.validation.js` — Zod request-body schemas

Remember to mount this module's router in `src/app.js` once implemented.
