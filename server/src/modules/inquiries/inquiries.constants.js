/**
 * Feature 14 — Contact & Inquiry Management
 * Role groups used by inquiries.routes.js, per the frozen Role Summary
 * table. Submission has no role constant at all — it's the system's one
 * fully public, unauthenticated endpoint, so there's nothing to
 * authorize() against.
 */

const STAFF_ROLES = ['GymOwner', 'Receptionist', 'SuperAdmin'];

module.exports = {
  STAFF_ROLES,
};