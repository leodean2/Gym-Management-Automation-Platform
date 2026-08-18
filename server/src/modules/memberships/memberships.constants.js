/**
 * Feature 3 — Membership Plans & Renewals
 *
 * Role groups. SuperAdmin is included everywhere GymOwner is, matching the
 * frozen role definitions ("Super Admin shall have access to all
 * information available to Gym Owner") — several role lists in earlier
 * planning had dropped SuperAdmin; restored here.
 */

const ADMIN_ROLES = ['GymOwner', 'SuperAdmin']; // plan create/update, suspend
const STAFF_ROLES = ['GymOwner', 'Receptionist', 'SuperAdmin']; // create/renew membership, list plans
const VIEW_MEMBERSHIP_ROLES = ['GymOwner', 'Receptionist', 'Trainer', 'Member', 'SuperAdmin'];
const HISTORY_ROLES = ['GymOwner', 'Receptionist', 'Member', 'SuperAdmin']; // no Trainer, per frozen API design

const PLAN_UPDATABLE_FIELDS = ['description', 'duration_days', 'price', 'is_active'];

module.exports = {
  ADMIN_ROLES,
  STAFF_ROLES,
  VIEW_MEMBERSHIP_ROLES,
  HISTORY_ROLES,
  PLAN_UPDATABLE_FIELDS,
};
