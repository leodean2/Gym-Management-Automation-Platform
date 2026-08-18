# Feature 7 — Workout Logging

Reference: SRS Feature 7, and the corresponding section of the frozen
API design (`docs/api-design.md`).

Follow the `auth` module as the structural template:
- `workout-logging.routes.js` — endpoint definitions, auth/authorize middleware, roles
- `workout-logging.controller.js` — thin HTTP layer (validate → call service → respond)
- `workout-logging.service.js` — business logic, Prisma calls, FR-derived rules
- `workout-logging.validation.js` — Zod request-body schemas

Remember to mount this module's router in `src/app.js` once implemented.
