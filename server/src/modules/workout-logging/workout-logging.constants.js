/**
 * Feature 7 — Workout Logging (Performed)
 * Role groups used by workout-logging.routes.js, per the frozen role
 * matrix (section 6 of the Feature 7 handoff).
 */

// --- Sessions -------------------------------------------------------------

const SESSION_CREATE_ROLES = ['Member', 'Trainer', 'GymOwner', 'SuperAdmin'];
const SESSION_FINALIZE_ROLES = ['Member', 'Trainer'];
const SESSION_REOPEN_ROLES = ['Trainer', 'GymOwner', 'SuperAdmin'];
// "Member (own), Trainer (assigned members)" are per-request scoping
// rules the route-level check can't express — authorize() only confirms
// the role is one of these five; the service enforces the "own"/
// "assigned to them" narrowing per requester.
const SESSION_VIEW_ROLES = ['Member', 'Trainer', 'Receptionist', 'GymOwner', 'SuperAdmin'];

// --- Exercises ------------------------------------------------------------

// Not separately listed in the frozen role matrix (section 6 only covers
// session-level actions) — logging exercises is part of the same
// InProgress-session workflow as creating it, so this mirrors
// SESSION_CREATE_ROLES rather than introducing a new role set. The
// service's immutability check (session must be InProgress) is what
// actually gates writes here, not role alone.
const EXERCISE_MANAGE_ROLES = ['Member', 'Trainer', 'GymOwner', 'SuperAdmin'];

module.exports = {
  SESSION_CREATE_ROLES,
  SESSION_FINALIZE_ROLES,
  SESSION_REOPEN_ROLES,
  SESSION_VIEW_ROLES,
  EXERCISE_MANAGE_ROLES,
};