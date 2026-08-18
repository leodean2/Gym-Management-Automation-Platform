const ADMIN_ROLES = ['GymOwner', 'SuperAdmin'];
const STAFF_ROLES = ['GymOwner', 'Receptionist', 'SuperAdmin'];
const PROFILE_VIEW_ROLES = ['GymOwner', 'Receptionist', 'SuperAdmin', 'Trainer'];
const HISTORY_ROLES = ['GymOwner', 'Receptionist', 'SuperAdmin', 'Member'];

// FR-5.2: administrative fields, staff-only.
const STAFF_UPDATABLE_FIELDS = ['specialization'];
// FR-5.2: contact fields, self-editable by the Trainer.
const SELF_UPDATABLE_FIELDS = ['phone_number', 'profile_photo_url'];

module.exports = {
  ADMIN_ROLES,
  STAFF_ROLES,
  PROFILE_VIEW_ROLES,
  HISTORY_ROLES,
  STAFF_UPDATABLE_FIELDS,
  SELF_UPDATABLE_FIELDS,
};