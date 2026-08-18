# Feature 11 — Payment & Invoice Management

Reference: SRS Feature 11, and the corresponding section of the frozen
API design (`docs/api-design.md`).

Follow the `auth` module as the structural template:
- `payments.routes.js` — endpoint definitions, auth/authorize middleware, roles
- `payments.controller.js` — thin HTTP layer (validate → call service → respond)
- `payments.service.js` — business logic, Prisma calls, FR-derived rules
- `payments.validation.js` — Zod request-body schemas

Remember to mount this module's router in `src/app.js` once implemented.
