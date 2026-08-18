# Feature 10 — Booking & Scheduling

Reference: SRS Feature 10, and the corresponding section of the frozen
API design (`docs/api-design.md`).

Follow the `auth` module as the structural template:
- `booking.routes.js` — endpoint definitions, auth/authorize middleware, roles
- `booking.controller.js` — thin HTTP layer (validate → call service → respond)
- `booking.service.js` — business logic, Prisma calls, FR-derived rules
- `booking.validation.js` — Zod request-body schemas

Remember to mount this module's router in `src/app.js` once implemented.
