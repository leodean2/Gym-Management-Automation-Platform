/**
 * Feature 10 — Booking & Scheduling
 * Role groups used by booking.routes.js, per the frozen endpoint list.
 * Kept deliberately granular (one constant per action) rather than
 * reused across actions — the frozen design gives nearly every action
 * its own distinct role set (e.g. reschedule is Receptionist-only,
 * complete is Trainer-only, reopen is GymOwner/SuperAdmin-only), unlike
 * Workout Programs/Nutrition where several actions shared one broader
 * "manage" group.
 */

// --- Trainer Availability ---------------------------------------------------

const AVAILABILITY_CREATE_ROLES = ['GymOwner', 'SuperAdmin'];
const AVAILABILITY_VIEW_ROLES = ['GymOwner', 'SuperAdmin', 'Receptionist', 'Trainer'];
const AVAILABILITY_DELETE_ROLES = ['GymOwner', 'SuperAdmin'];

// --- Booking -----------------------------------------------------------

// "Member may only create bookings for themselves" is a per-request rule
// the route-level check can't express — enforced in the service.
const BOOKING_CREATE_ROLES = ['Receptionist', 'Member'];
const BOOKING_VIEW_ROLES = ['GymOwner', 'SuperAdmin', 'Receptionist', 'Trainer', 'Member'];
const BOOKING_RESCHEDULE_ROLES = ['Receptionist'];
const BOOKING_COMPLETE_ROLES = ['Trainer'];
const BOOKING_CANCEL_ROLES = ['Receptionist'];
const BOOKING_NO_SHOW_ROLES = ['Receptionist'];
const BOOKING_REOPEN_ROLES = ['GymOwner', 'SuperAdmin'];

// --- Booking History -------------------------------------------------------

// Member and Trainer are deliberately excluded from both history
// endpoints — the frozen design's role tables for these two are
// narrower than BOOKING_VIEW_ROLES, restricted to staff/admin only.
const RESCHEDULE_HISTORY_VIEW_ROLES = ['GymOwner', 'SuperAdmin', 'Receptionist'];
const REOPEN_HISTORY_VIEW_ROLES = ['GymOwner', 'SuperAdmin'];

module.exports = {
  AVAILABILITY_CREATE_ROLES,
  AVAILABILITY_VIEW_ROLES,
  AVAILABILITY_DELETE_ROLES,
  BOOKING_CREATE_ROLES,
  BOOKING_VIEW_ROLES,
  BOOKING_RESCHEDULE_ROLES,
  BOOKING_COMPLETE_ROLES,
  BOOKING_CANCEL_ROLES,
  BOOKING_NO_SHOW_ROLES,
  BOOKING_REOPEN_ROLES,
  RESCHEDULE_HISTORY_VIEW_ROLES,
  REOPEN_HISTORY_VIEW_ROLES,
};