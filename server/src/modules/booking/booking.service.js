const prisma = require('../../config/db');
const AppError = require('../../lib/AppError');

// Feature 10 — Booking & Scheduling
// All business rules for this module live here: validation against
// frozen FRs, status transitions, permission checks beyond simple role
// (e.g. "Trainer may only act on their own assigned members"), and any
// database writes. Keep this layer framework-agnostic — no req/res here.

// TODO: implement service functions called by booking.controller.js.

module.exports = {};
