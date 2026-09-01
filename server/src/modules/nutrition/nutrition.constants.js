const TRAINER_ONLY = ['Trainer'];
const TEMPLATE_VIEW_ROLES = ['Trainer', 'GymOwner', 'SuperAdmin'];
const TEMPLATE_CREATOR_ROLES = TRAINER_ONLY;
// Route-level check is broad; service enforces "owning Trainer, or
// GymOwner if that Trainer is Inactive" — same pattern as
// workout-programs.service.js's assertCanManageTemplate.
const TEMPLATE_MANAGE_ROLES = ['Trainer', 'GymOwner', 'SuperAdmin'];
const TEMPLATE_UPDATE_ROLES = TEMPLATE_MANAGE_ROLES;
const TEMPLATE_DEACTIVATE_ROLES = ['GymOwner', 'SuperAdmin'];
const COMPLETE_ROLES = ['Trainer', 'GymOwner', 'SuperAdmin'];
const ASSIGNMENT_VIEW_ROLES = ['GymOwner', 'Receptionist', 'SuperAdmin', 'Trainer', 'Member'];
const ASSIGNMENT_CREATE_ROLES = TRAINER_ONLY;
const ASSIGNMENT_LIST_ROLES = ['GymOwner', 'Receptionist', 'SuperAdmin', 'Trainer'];
const MEMBER_PLAN_VIEW_ROLES = ASSIGNMENT_VIEW_ROLES;
const ASSIGNMENT_REPLACE_ROLES = TEMPLATE_MANAGE_ROLES;
const ASSIGNMENT_COMPLETE_ROLES = COMPLETE_ROLES;
const ASSIGNMENT_UPDATE_ROLES = TEMPLATE_MANAGE_ROLES;

module.exports = {
  TRAINER_ONLY,
  TEMPLATE_VIEW_ROLES,
  TEMPLATE_CREATOR_ROLES,
  TEMPLATE_MANAGE_ROLES,
  TEMPLATE_UPDATE_ROLES,
  TEMPLATE_DEACTIVATE_ROLES,
  COMPLETE_ROLES,
  ASSIGNMENT_VIEW_ROLES,
  ASSIGNMENT_CREATE_ROLES,
  ASSIGNMENT_LIST_ROLES,
  MEMBER_PLAN_VIEW_ROLES,
  ASSIGNMENT_REPLACE_ROLES,
  ASSIGNMENT_COMPLETE_ROLES,
  ASSIGNMENT_UPDATE_ROLES,
};