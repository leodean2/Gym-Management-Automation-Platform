# Feature 4 — Attendance Management

Reference: SRS Feature 4, and the corresponding section of the frozen
API design (`docs/api-design.md`).

Follow the `auth` module as the structural template:
- `attendance.routes.js` — endpoint definitions, auth/authorize middleware, roles
- `attendance.controller.js` — thin HTTP layer (validate → call service → respond)
- `attendance.service.js` — business logic, Prisma calls, FR-derived rules
- `attendance.validation.js` — Zod request-body schemas

Remember to mount this module's router in `src/app.js` once implemented.
