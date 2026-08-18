# Feature 13 — Notifications & Reminders

Reference: SRS Feature 13, and the corresponding section of the frozen
API design (`docs/api-design.md`).

Follow the `auth` module as the structural template:
- `notifications.routes.js` — endpoint definitions, auth/authorize middleware, roles
- `notifications.controller.js` — thin HTTP layer (validate → call service → respond)
- `notifications.service.js` — business logic, Prisma calls, FR-derived rules
- `notifications.validation.js` — Zod request-body schemas

Remember to mount this module's router in `src/app.js` once implemented.
