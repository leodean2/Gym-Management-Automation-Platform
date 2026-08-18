# Feature 2 — Member Registration & Profile Management

Reference: SRS Feature 2, and the corresponding section of the frozen
API design (`docs/api-design.md`).

Follow the `auth` module as the structural template:
- `members.routes.js` — endpoint definitions, auth/authorize middleware, roles
- `members.controller.js` — thin HTTP layer (validate → call service → respond)
- `members.service.js` — business logic, Prisma calls, FR-derived rules
- `members.validation.js` — Zod request-body schemas

Remember to mount this module's router in `src/app.js` once implemented.
