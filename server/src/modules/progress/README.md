# Feature 8 — Member Progress Tracking

Reference: SRS Feature 8, and the corresponding section of the frozen
API design (`docs/api-design.md`).

Follow the `auth` module as the structural template:
- `progress.routes.js` — endpoint definitions, auth/authorize middleware, roles
- `progress.controller.js` — thin HTTP layer (validate → call service → respond)
- `progress.service.js` — business logic, Prisma calls, FR-derived rules
- `progress.validation.js` — Zod request-body schemas

Remember to mount this module's router in `src/app.js` once implemented.
