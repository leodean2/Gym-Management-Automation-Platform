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

/**
 * @openapi
 * tags:
 *   name: Workout Logging
 *   description: Performed workout sessions and logged exercises
 */

/**
 * @openapi
 * /workout-sessions:
 *   post:
 *     tags: [Workout Logging]
 *     summary: Start a Workout Session against an assigned program
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [workout_program_assignment_id, workout_program_session_id, session_date]
 *             properties:
 *               workout_program_assignment_id: { type: string, format: uuid }
 *               workout_program_session_id: { type: string, format: uuid }
 *               session_date: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       201: { description: WorkoutSession created, status InProgress }
 *       409: { description: Assignment is not Active, or session/template mismatch }
 */
sessionsRouter.post(
  '/',
  authenticate,
  authorize(...SESSION_CREATE_ROLES),
  validate(createWorkoutSessionSchema),
  asyncHandler(workoutLoggingController.createSession)
);

/**
 * @openapi
 * /workout-sessions:
 *   get:
 *     tags: [Workout Logging]
 *     summary: List Workout Sessions
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [InProgress, Finalized] }
 *     responses:
 *       200: { description: Paginated list, scoped to requester's role }
 */
sessionsRouter.get(
  '/',
  authenticate,
  authorize(...SESSION_VIEW_ROLES),
  validate(listWorkoutSessionsQuerySchema, 'query'),
  asyncHandler(workoutLoggingController.listSessions)
);

/**
 * @openapi
 * /workout-sessions/{id}:
 *   get:
 *     tags: [Workout Logging]
 *     summary: Get a Workout Session (with logged exercises)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Session detail }
 */
sessionsRouter.get(
  '/:id',
  authenticate,
  authorize(...SESSION_VIEW_ROLES),
  asyncHandler(workoutLoggingController.getSession)
);

/**
 * @openapi
 * /workout-sessions/{id}/finalize:
 *   patch:
 *     tags: [Workout Logging]
 *     summary: Finalize a Workout Session (becomes read-only)
 *     description: >
 *       Triggers automatic Personal Record recalculation as a side
 *       effect (see Progress module) — best-effort, does not block this
 *       response on success.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Session marked Finalized }
 *       409: { description: Session is not InProgress }
 */
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

/**
 * @openapi
 * /workout-sessions/{id}/reopen:
 *   patch:
 *     tags: [Workout Logging]
 *     summary: Reopen a Finalized session
 *     description: Reuses the same row (completed_at cleared); records a WorkoutSessionReopenHistory entry. Member cannot reopen.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200: { description: Session reopened, status InProgress }
 *       409: { description: Session is not Finalized }
 */
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

/**
 * @openapi
 * /workout-sessions/{id}/exercises:
 *   post:
 *     tags: [Workout Logging]
 *     summary: Log a performed exercise
 *     description: >
 *       template_exercise_id is derived server-side (matched against the
 *       session's prescribed exercises) — never accepted from the
 *       client. Only callable while the session is InProgress.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [exercise_library_entry_id]
 *             properties:
 *               exercise_library_entry_id: { type: string, format: uuid }
 *               performed_sets: { type: integer }
 *               performed_reps: { type: integer }
 *               performed_weight: { type: number }
 *               rest_seconds: { type: integer }
 *               duration_seconds: { type: integer }
 *               distance: { type: number }
 *               perceived_exertion: { type: integer, minimum: 1, maximum: 10 }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Logged exercise, with template_exercise_id auto-derived (null if ad-hoc)
 *       409:
 *         description: Session is not InProgress
 */
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

/**
 * @openapi
 * /workout-exercises/{id}:
 *   patch:
 *     tags: [Workout Logging]
 *     summary: Update a logged exercise's performed values
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Updated logged exercise }
 *       409: { description: The exercise's session is Finalized }
 */
exercisesRouter.patch(
  '/:id',
  authenticate,
  authorize(...EXERCISE_MANAGE_ROLES),
  validate(updateExerciseSchema),
  asyncHandler(workoutLoggingController.updateExercise)
);

module.exports = { sessionsRouter, exercisesRouter };