/**
 * Feature 11 — Notifications
 * Role groups used by notifications.routes.js, per the frozen endpoint
 * list. No CREATE_ROLES constant exists at all — BR-11.1 is explicit
 * that notifications are system-generated only; there is no
 * POST /notifications endpoint and never will be one.
 */

// GET /notifications and GET /notifications/:id share the same role set
// — the distinction between "see only your own" (Member/Trainer) and
// "may filter any user's" (staff) is per-request scoping the route-level
// check can't express, enforced in the service instead.
const VIEW_ROLES = ['GymOwner', 'SuperAdmin', 'Receptionist', 'Trainer', 'Member'];

// PATCH /:id/read — every role that can view a notification can also
// mark it read, since marking read only ever applies to your own
// notification (or, for staff, any notification) and is idempotent.
const MARK_READ_ROLES = ['GymOwner', 'SuperAdmin', 'Receptionist', 'Trainer', 'Member'];

// POST /:id/resend and GET /:id/attempts — both staff-only, per the
// frozen role tables.
const RESEND_ROLES = ['GymOwner', 'SuperAdmin'];
const ATTEMPTS_VIEW_ROLES = ['GymOwner', 'SuperAdmin'];

module.exports = {
  VIEW_ROLES,
  MARK_READ_ROLES,
  RESEND_ROLES,
  ATTEMPTS_VIEW_ROLES,
};