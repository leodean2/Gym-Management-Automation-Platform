# Feature 9 — Exercise Library Management

Reference: SRS Feature 9, and the corresponding section of the frozen
API design (`docs/api-design.md`).

Follow the `auth` module as the structural template:
- `exercise-library.routes.js` — endpoint definitions, auth/authorize middleware, roles
- `exercise-library.controller.js` — thin HTTP layer (validate → call service → respond)
- `exercise-library.service.js` — business logic, Prisma calls, FR-derived rules
- `exercise-library.validation.js` — Zod request-body schemas

Remember to mount this module's router in `src/app.js` once implemented.
