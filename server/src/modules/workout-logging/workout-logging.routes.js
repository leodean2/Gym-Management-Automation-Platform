const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const workoutLoggingController = require('./workout-logging.controller');
const {
  createWorkoutSessionSchema,
  finalizeWorkoutSessionSchema,
  reopenWorkoutSessionSchema,
  listWorkoutSessionsQuerySchema,
  logExerciseSchema,
  updateExerciseSchema,
} = require('./workout-logging.validation');
const {
  SESSION_CREATE_ROLES,
  SESSION_FINALIZE_ROLES,
  SESSION_REOPEN_ROLES,
  SESSION_VIEW_ROLES,
  EXERCISE_MANAGE_ROLES,
} = require('./workout-logging.constants');

// Feature 7 — Workout Logging (Performed)
//
// Like Workout Programs and Nutrition, this module owns two distinct URL
// prefixes, so it exports two routers — see app.js for how each is mounted.

// --- /api/v1/workout-sessions ------------------------------------------------
const sessionsRouter = express.Router();

sessionsRouter.post(
  '/',
  authenticate,
  authorize(...SESSION_CREATE_ROLES),
  validate(createWorkoutSessionSchema),
  asyncHandler(workoutLoggingController.createSession)
);

sessionsRouter.get(
  '/',
  authenticate,
  authorize(...SESSION_VIEW_ROLES),
  validate(listWorkoutSessionsQuerySchema, 'query'),
  asyncHandler(workoutLoggingController.listSessions)
);

sessionsRouter.get(
  '/:id',
  authenticate,
  authorize(...SESSION_VIEW_ROLES),
  asyncHandler(workoutLoggingController.getSession)
);

// PATCH /api/v1/workout-sessions/:id/finalize
// No admin override — "Member manually Finalizes," Trainer may finalize
// on behalf of their assigned member. GymOwner/SuperAdmin deliberately
// excluded, per the frozen role matrix.
sessionsRouter.patch(
  '/:id/finalize',
  authenticate,
  authorize(...SESSION_FINALIZE_ROLES),
  validate(finalizeWorkoutSessionSchema),
  asyncHandler(workoutLoggingController.finalizeSession)
);

// PATCH /api/v1/workout-sessions/:id/reopen
// Member deliberately excluded — finalized data is Trainer/Admin-
// controlled, same integrity principle as Booking reopening elsewhere.
sessionsRouter.patch(
  '/:id/reopen',
  authenticate,
  authorize(...SESSION_REOPEN_ROLES),
  validate(reopenWorkoutSessionSchema),
  asyncHandler(workoutLoggingController.reopenSession)
);

// POST /api/v1/workout-sessions/:id/exercises
// Route-level check is broad; the service's InProgress gate is what
// actually enforces "Finalized session is read-only," not role alone.
sessionsRouter.post(
  '/:id/exercises',
  authenticate,
  authorize(...EXERCISE_MANAGE_ROLES),
  validate(logExerciseSchema),
  asyncHandler(workoutLoggingController.logExercise)
);

// --- /api/v1/workout-exercises ------------------------------------------------
const exercisesRouter = express.Router();

exercisesRouter.patch(
  '/:id',
  authenticate,
  authorize(...EXERCISE_MANAGE_ROLES),
  validate(updateExerciseSchema),
  asyncHandler(workoutLoggingController.updateExercise)
);

module.exports = { sessionsRouter, exercisesRouter };