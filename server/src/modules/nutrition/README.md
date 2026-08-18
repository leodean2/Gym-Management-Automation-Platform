# Feature 6 — Nutrition Plan Templates & Assignment

Reference: SRS Feature 6, and the corresponding section of the frozen
API design (`docs/api-design.md`).

Follow the `auth` module as the structural template:
- `nutrition.routes.js` — endpoint definitions, auth/authorize middleware, roles
- `nutrition.controller.js` — thin HTTP layer (validate → call service → respond)
- `nutrition.service.js` — business logic, Prisma calls, FR-derived rules
- `nutrition.validation.js` — Zod request-body schemas

Remember to mount this module's router in `src/app.js` once implemented.
