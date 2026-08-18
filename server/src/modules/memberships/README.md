# Feature 3 — Membership Plans & Renewals

Reference: SRS Feature 3, and the corresponding section of the frozen
API design (`docs/api-design.md`).

Follow the `auth` module as the structural template:
- `memberships.routes.js` — endpoint definitions, auth/authorize middleware, roles
- `memberships.controller.js` — thin HTTP layer (validate → call service → respond)
- `memberships.service.js` — business logic, Prisma calls, FR-derived rules
- `memberships.validation.js` — Zod request-body schemas

Remember to mount this module's router in `src/app.js` once implemented.
