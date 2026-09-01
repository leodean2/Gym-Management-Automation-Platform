/**
 * Feature 8 — Progress Tracking (Body Measurements + Personal Records)
 * Role groups used by workout-progress.routes.js, per the frozen API
 * design. PersonalRecord has no create/update/delete roles at all — it's
 * system-maintained (see workout-progress.service.js's
 * updatePersonalRecordsFromSession, invoked from workout-logging on
 * finalize), so only view-role groups exist for it.
 */

// --- Body Measurements ----------------------------------------------------

// GymOwner/SuperAdmin are administrative fallback, not the normal path —
// Trainer is who this is built for. Receptionist and Member are
// deliberately excluded from creation.
const MEASUREMENT_CREATE_ROLES = ['Trainer', 'GymOwner', 'SuperAdmin'];
const MEASUREMENT_LIST_ROLES = ['Trainer', 'Receptionist', 'GymOwner', 'SuperAdmin', 'Member'];
// The service enforces ownership scoping for Member when appropriate.
const MEASUREMENT_VIEW_ROLES = ['Trainer', 'Receptionist', 'GymOwner', 'SuperAdmin', 'Member'];

// --- Personal Records -------------------------------------------------------

// Single-record view remains scoped to the Member's own records.
const PR_LIST_ROLES = ['Trainer', 'Receptionist', 'GymOwner', 'SuperAdmin', 'Member'];
const PR_VIEW_ROLES = ['Trainer', 'Receptionist', 'GymOwner', 'SuperAdmin', 'Member'];

module.exports = {
  MEASUREMENT_CREATE_ROLES,
  MEASUREMENT_LIST_ROLES,
  MEASUREMENT_VIEW_ROLES,
  PR_LIST_ROLES,
  PR_VIEW_ROLES,
};