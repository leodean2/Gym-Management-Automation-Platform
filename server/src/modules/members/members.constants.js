/**
 * Feature 2 — Member Registration & Profile Management
 * Role groups used by members.routes.js, kept here so route definitions
 * read declaratively rather than repeating role arrays inline.
 */

const STAFF_ROLES = ['GymOwner', 'Receptionist'];
const VIEW_ROLES = ['GymOwner', 'Receptionist', 'Trainer', 'Member'];
const SEARCH_ROLES = ['GymOwner', 'Receptionist', 'Trainer'];

// FR-2.4: fields a staff member (Gym Owner / Receptionist) may update.
// membership_number, created_by, and user_id are deliberately excluded -
// they are immutable identity/audit fields, never editable via this
// endpoint.
const UPDATABLE_FIELDS = [
  'phone_number',
  'address',
  'emergency_contact_name',
  'emergency_contact_phone',
  'medical_notes',
  'profile_photo_url',
];

module.exports = { STAFF_ROLES, VIEW_ROLES, SEARCH_ROLES, UPDATABLE_FIELDS };
