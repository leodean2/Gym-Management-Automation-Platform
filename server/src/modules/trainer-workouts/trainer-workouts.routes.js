const express = require('express');
const trainerWorkoutsController = require('./trainer-workouts.controller');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { registerTrainerSchema, updateTrainerSchema, assignTrainerSchema } = require('./trainer-workouts.validation');
const { ADMIN_ROLES, PROFILE_VIEW_ROLES, HISTORY_ROLES } = require('./trainers.constants');

// Feature 5 — Trainer Management & Workout Programs (Pass 1)

// --- /api/v1/trainers --------------------------------------------------------
const trainersRouter = express.Router();

trainersRouter.post(
  '/',
  authenticate,
  authorize(...ADMIN_ROLES),
  validate(registerTrainerSchema),
  asyncHandler(trainerWorkoutsController.register)
);

trainersRouter.get(
  '/:id',
  authenticate,
  authorize(...PROFILE_VIEW_ROLES),
  asyncHandler(trainerWorkoutsController.getProfile)
);

trainersRouter.patch(
  '/:id',
  authenticate,
  authorize(...PROFILE_VIEW_ROLES), // service enforces the staff-vs-self field split
  validate(updateTrainerSchema),
  asyncHandler(trainerWorkoutsController.update)
);

// --- /api/v1/members/:memberId/assign-trainer & /trainer-history -----------
// FR-5.3: assignment is Gym Owner only (Receptionist is not listed) — ADMIN_ROLES, not STAFF_ROLES.
const memberTrainerRouter = express.Router();

memberTrainerRouter.post(
  '/:memberId/assign-trainer',
  authenticate,
  authorize(...ADMIN_ROLES),
  validate(assignTrainerSchema),
  asyncHandler(trainerWorkoutsController.assign)
);

memberTrainerRouter.get(
  '/:memberId/trainer-history',
  authenticate,
  authorize(...HISTORY_ROLES),
  asyncHandler(trainerWorkoutsController.getAssignmentHistory)
);

module.exports = { trainersRouter, memberTrainerRouter };