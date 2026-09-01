/**
 * Feature 9 — Exercise Library
 * Role groups used by exercise-library.routes.js, per the frozen
 * Authorization Matrix. Every write action (create, update, deactivate,
 * reactivate) is GymOwner/SuperAdmin only — unlike Nutrition/Workout
 * Programs, there's no Trainer-authored or ownership-scoped path here at
 * all, since created_by points to User generically, not Trainer.
 */

const WRITE_ROLES = ['GymOwner', 'SuperAdmin'];
const VIEW_ROLES = ['GymOwner', 'SuperAdmin', 'Receptionist', 'Trainer', 'Member'];

module.exports = {
  WRITE_ROLES,
  VIEW_ROLES,
};