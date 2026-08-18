# Feature 12 — Admin Analytics Dashboard

Reference: SRS Feature 12, and the corresponding section of the frozen
API design (`docs/api-design.md`).

Follow the `auth` module as the structural template:
- `analytics.routes.js` — endpoint definitions, auth/authorize middleware, roles
- `analytics.controller.js` — thin HTTP layer (validate → call service → respond)
- `analytics.service.js` — business logic, Prisma calls, FR-derived rules
- `analytics.validation.js` — Zod request-body schemas

Remember to mount this module's router in `src/app.js` once implemented.
