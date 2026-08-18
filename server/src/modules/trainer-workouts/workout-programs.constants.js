const TRAINER_ONLY = ['Trainer'];
const TEMPLATE_VIEW_ROLES = ['Trainer', 'GymOwner', 'SuperAdmin'];
// Update/deactivate/session/exercise management: route-level check is
// broad (Trainer or staff), service enforces "owning Trainer, or GymOwner
// if that Trainer is Inactive" — mirrors trainer-workouts.service.js's
// updateTrainerProfile split.
const TEMPLATE_MANAGE_ROLES = ['Trainer', 'GymOwner', 'SuperAdmin'];
const ASSIGNMENT_VIEW_ROLES = ['GymOwner', 'Receptionist', 'SuperAdmin', 'Trainer', 'Member'];
const COMPLETE_ROLES = ['Trainer', 'GymOwner', 'SuperAdmin'];

module.exports = {
  TRAINER_ONLY,
  TEMPLATE_VIEW_ROLES,
  TEMPLATE_MANAGE_ROLES,
  ASSIGNMENT_VIEW_ROLES,
  COMPLETE_ROLES,
};