const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const workoutProgramsController = require('./workout-programs.controller');
const {
  createTemplateSchema,
  updateTemplateSchema,
  createSessionSchema,
  updateSessionSchema,
  createExerciseSchema,
  updateExerciseSchema,
  assignTemplateSchema,
} = require('./workout-programs.validation');
const {
  TRAINER_ONLY,
  TEMPLATE_VIEW_ROLES,
  TEMPLATE_MANAGE_ROLES,
  ASSIGNMENT_VIEW_ROLES,
  COMPLETE_ROLES,
} = require('./workout-programs.constants');

// Feature 5 — Trainer Management & Workout Programs (Pass 2)
//
// Like memberships/attendance, this module owns more than one URL prefix,
// so it exports multiple routers — see app.js for how each is mounted.

// --- /api/v1/workout-program-templates --------------------------------------
const templatesRouter = express.Router();

/**
 * @openapi
 * tags:
 *   name: Workout Programs
 *   description: Workout Program Templates, Sessions, TemplateExercises, and Assignments
 */

/**
 * @openapi
 * /workout-program-templates:
 *   post:
 *     tags: [Workout Programs]
 *     summary: Create a Workout Program Template
 *     description: Trainer-only — ownership is always the requester themself.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category, difficulty_level, estimated_duration_weeks]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               category: { type: string, enum: [Strength, Hypertrophy, Cardio, Rehabilitation] }
 *               difficulty_level: { type: string, enum: [Beginner, Intermediate, Advanced] }
 *               estimated_duration_weeks: { type: integer }
 *     responses:
 *       201: { description: Template created }
 *       403: { description: Trainer-only endpoint }
 */
// POST /api/v1/workout-program-templates
// Trainer-only at the route level — the service derives ownership from
// the requester, so there's no "on behalf of" case to allow for here,
// unlike update/manage below.
templatesRouter.post(
  '/',
  authenticate,
  authorize(...TRAINER_ONLY),
  validate(createTemplateSchema),
  asyncHandler(workoutProgramsController.createTemplate)
);

/**
 * @openapi
 * /workout-program-templates:
 *   get:
 *     tags: [Workout Programs]
 *     summary: List Workout Program Templates
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Active, Inactive] }
 *       - in: query
 *         name: mine
 *         schema: { type: string, enum: ['true', 'false'] }
 *     responses:
 *       200: { description: List of templates }
 */
// GET /api/v1/workout-program-templates
// No Zod query schema for this one — workout-programs.validation.js
// doesn't define one, so ?mine=/?status= pass straight through to the
// service as-is.
templatesRouter.get(
  '/',
  authenticate,
  authorize(...TEMPLATE_VIEW_ROLES),
  asyncHandler(workoutProgramsController.listTemplates)
);

/**
 * @openapi
 * /workout-program-templates/{id}:
 *   get:
 *     tags: [Workout Programs]
 *     summary: Get a Workout Program Template (with Sessions and TemplateExercises)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Template detail }
 */
templatesRouter.get(
  '/:id',
  authenticate,
  authorize(...TEMPLATE_VIEW_ROLES),
  asyncHandler(workoutProgramsController.getTemplate)
);

/**
 * @openapi
 * /workout-program-templates/{id}:
 *   patch:
 *     tags: [Workout Programs]
 *     summary: Update a Template (including deactivation via status)
 *     description: Owning Trainer, or GymOwner if that Trainer is Inactive.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               status: { type: string, enum: [Active, Inactive] }
 *     responses:
 *       200: { description: Updated template }
 *       403: { description: Not the owning Trainer (and Trainer is Active) }
 */
// PATCH /api/v1/workout-program-templates/:id
// Route-level check is broad (Trainer or staff); the service enforces
// "owning Trainer, or GymOwner if that Trainer is Inactive."
templatesRouter.patch(
  '/:id',
  authenticate,
  authorize(...TEMPLATE_MANAGE_ROLES),
  validate(updateTemplateSchema),
  asyncHandler(workoutProgramsController.updateTemplate)
);

/**
 * @openapi
 * /workout-program-templates/{templateId}/sessions:
 *   post:
 *     tags: [Workout Programs]
 *     summary: Add a Session to a Template
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [session_name, session_order]
 *             properties:
 *               session_name: { type: string }
 *               description: { type: string }
 *               session_order: { type: integer }
 *     responses:
 *       201: { description: Session created }
 */
// POST /api/v1/workout-program-templates/:templateId/sessions
templatesRouter.post(
  '/:templateId/sessions',
  authenticate,
  authorize(...TEMPLATE_MANAGE_ROLES),
  validate(createSessionSchema),
  asyncHandler(workoutProgramsController.createSession)
);

/**
 * @openapi
 * /workout-program-templates/{templateId}/assign:
 *   post:
 *     tags: [Workout Programs]
 *     summary: Assign a Template to a Member
 *     description: Trainer-only — only for own templates and own currently-assigned members.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [member_id]
 *             properties:
 *               member_id: { type: string, format: uuid }
 *               start_date: { type: string, format: date }
 *               assignment_notes: { type: string }
 *     responses:
 *       201: { description: WorkoutProgramAssignment created, status Active }
 *       403: { description: Not the template's owning Trainer, or member not currently assigned to this trainer }
 *       409: { description: Template is deactivated }
 */
// POST /api/v1/workout-program-templates/:templateId/assign
// Trainer-only, same reasoning as template creation — FR-5.8 doesn't
// hand assignment off to the Gym Owner, unlike managing an existing
// template's structure.
templatesRouter.post(
  '/:templateId/assign',
  authenticate,
  authorize(...TRAINER_ONLY),
  validate(assignTemplateSchema),
  asyncHandler(workoutProgramsController.assignTemplate)
);

// --- /api/v1/workout-program-sessions ----------------------------------------
const sessionsRouter = express.Router();

/**
 * @openapi
 * /workout-program-sessions/{id}:
 *   patch:
 *     tags: [Workout Programs]
 *     summary: Update a Session
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Updated session }
 */
sessionsRouter.patch(
  '/:id',
  authenticate,
  authorize(...TEMPLATE_MANAGE_ROLES),
  validate(updateSessionSchema),
  asyncHandler(workoutProgramsController.updateSession)
);

/**
 * @openapi
 * /workout-program-sessions/{sessionId}/exercises:
 *   post:
 *     tags: [Workout Programs]
 *     summary: Add an exercise to a Session (TemplateExercise)
 *     description: exercise_library_entry_id must reference an Active Exercise Library entry.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [exercise_library_entry_id, exercise_order, target_sets, target_reps]
 *             properties:
 *               exercise_library_entry_id: { type: string, format: uuid }
 *               exercise_order: { type: integer }
 *               target_sets: { type: integer }
 *               target_reps: { type: string, example: 8-10 }
 *               target_weight: { type: number }
 *               rest_seconds: { type: integer }
 *     responses:
 *       201: { description: TemplateExercise created }
 *       409: { description: Exercise is Inactive }
 */
// POST /api/v1/workout-program-sessions/:sessionId/exercises
sessionsRouter.post(
  '/:sessionId/exercises',
  authenticate,
  authorize(...TEMPLATE_MANAGE_ROLES),
  validate(createExerciseSchema),
  asyncHandler(workoutProgramsController.createExercise)
);

// --- /api/v1/template-exercises ------------------------------------------------
const exercisesRouter = express.Router();

/**
 * @openapi
 * /template-exercises/{id}:
 *   patch:
 *     tags: [Workout Programs]
 *     summary: Update a TemplateExercise
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Updated TemplateExercise }
 */
exercisesRouter.patch(
  '/:id',
  authenticate,
  authorize(...TEMPLATE_MANAGE_ROLES),
  validate(updateExerciseSchema),
  asyncHandler(workoutProgramsController.updateExercise)
);

// --- /api/v1/workout-program-assignments ----------------------------------------
const assignmentsRouter = express.Router();

/**
 * @openapi
 * /workout-program-assignments/{id}/complete:
 *   post:
 *     tags: [Workout Programs]
 *     summary: Mark a WorkoutProgramAssignment Completed
 *     description: The assigning Trainer, or GymOwner if that Trainer is Inactive.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Assignment marked Completed }
 *       409: { description: Assignment is not Active }
 */
assignmentsRouter.post(
  '/:id/complete',
  authenticate,
  authorize(...COMPLETE_ROLES),
  asyncHandler(workoutProgramsController.completeAssignment)
);

// --- /api/v1/members/:memberId/workout-program-assignments -----------------------
// Nested under the Members prefix, same convention as memberships'
// historyRouter and attendance's historyRouter.
const historyRouter = express.Router();

/**
 * @openapi
 * /members/{memberId}/workout-program-assignments:
 *   get:
 *     tags: [Workout Programs]
 *     summary: Get a Member's Workout Program Assignments
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Array of WorkoutProgramAssignments }
 */
historyRouter.get(
  '/:memberId/workout-program-assignments',
  authenticate,
  authorize(...ASSIGNMENT_VIEW_ROLES),
  asyncHandler(workoutProgramsController.getMemberAssignments)
);

module.exports = { templatesRouter, sessionsRouter, exercisesRouter, assignmentsRouter, historyRouter };