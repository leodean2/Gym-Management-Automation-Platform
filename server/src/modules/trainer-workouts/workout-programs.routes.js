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

templatesRouter.get(
  '/:id',
  authenticate,
  authorize(...TEMPLATE_VIEW_ROLES),
  asyncHandler(workoutProgramsController.getTemplate)
);

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

// POST /api/v1/workout-program-templates/:templateId/sessions
templatesRouter.post(
  '/:templateId/sessions',
  authenticate,
  authorize(...TEMPLATE_MANAGE_ROLES),
  validate(createSessionSchema),
  asyncHandler(workoutProgramsController.createSession)
);

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

sessionsRouter.patch(
  '/:id',
  authenticate,
  authorize(...TEMPLATE_MANAGE_ROLES),
  validate(updateSessionSchema),
  asyncHandler(workoutProgramsController.updateSession)
);

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

exercisesRouter.patch(
  '/:id',
  authenticate,
  authorize(...TEMPLATE_MANAGE_ROLES),
  validate(updateExerciseSchema),
  asyncHandler(workoutProgramsController.updateExercise)
);

// --- /api/v1/workout-program-assignments ----------------------------------------
const assignmentsRouter = express.Router();

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

historyRouter.get(
  '/:memberId/workout-program-assignments',
  authenticate,
  authorize(...ASSIGNMENT_VIEW_ROLES),
  asyncHandler(workoutProgramsController.getMemberAssignments)
);

module.exports = { templatesRouter, sessionsRouter, exercisesRouter, assignmentsRouter, historyRouter };