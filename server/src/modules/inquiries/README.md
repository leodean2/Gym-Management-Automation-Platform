# Feature 14 — Contact & Inquiry Management

Reference: SRS Feature 14, and the corresponding section of the frozen
API design (`docs/api-design.md`).

Follow the `auth` module as the structural template:
- `inquiries.routes.js` — endpoint definitions, auth/authorize middleware, roles
- `inquiries.controller.js` — thin HTTP layer (validate → call service → respond)
- `inquiries.service.js` — business logic, Prisma calls, FR-derived rules
- `inquiries.validation.js` — Zod request-body schemas

Remember to mount this module's router in `src/app.js` once implemented.
