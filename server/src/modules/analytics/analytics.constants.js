/**
 * Feature 12 — Admin Analytics Dashboard
 * Role groups used by analytics.routes.js, per the frozen Role Summary
 * table. Trainer and Member have zero access anywhere in this module —
 * FR-12.7 is explicit that Analytics is management/front-desk only,
 * unlike Notifications or Bookings where individual users see their own
 * slice of data.
 */

// Endpoints 1–6 and 8 (dashboard, memberships, attendance, financial,
// trainers, bookings, export) share this same role set.
const MANAGEMENT_ROLES = ['GymOwner', 'SuperAdmin'];

// Endpoint 7 only — the narrower, front-desk-facing operational view.
// Receptionist's ONLY Analytics access; GymOwner/SuperAdmin may also
// call it (e.g. to see what front-desk sees).
const OPERATIONAL_ROLES = ['GymOwner', 'Receptionist', 'SuperAdmin'];

module.exports = {
  MANAGEMENT_ROLES,
  OPERATIONAL_ROLES,
};